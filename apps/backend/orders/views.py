from datetime import date
from decimal import Decimal
from random import randint
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from coupons.models import CouponRedeemRecord, UserCoupon
from coupons.utils import validate_coupon_usage
from membership.models import BuyerProfile
from merchants.models import Merchant, DeliverySlot
from products.models import Product
from promotions.models import PromotionItem
from promotions.utils import increment_sold_quantity
from users.models import StoreUser
from .models import Order
from .serializers import (
    CartValidateSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusSerializer
)

STATUS_TRANSITIONS = {
    'pending': ['confirmed', 'canceled'],
    'confirmed': ['delivering', 'pickup_ready'],
    'delivering': ['completed'],
    'pickup_ready': ['completed'],
    'completed': [],
    'canceled': [],
    'refunded': []
}


def generate_order_no() -> str:
    now = timezone.now()
    return f"CS{now.strftime('%Y%m%d%H%M%S')}{randint(1000, 9999)}"


def get_active_promotion_item(product_id: int, at_time=None) -> PromotionItem | None:
    at_time = at_time or timezone.now()
    return PromotionItem.objects.select_related('promotion', 'product').filter(
        product_id=product_id,
        promotion__start_at__lte=at_time,
        promotion__end_at__gte=at_time,
        promotion__status='active'
    ).order_by('-promotion__created_at').first()


def validate_cart(merchant: Merchant, cart_items: list[dict]) -> tuple[list[str], list[dict], Decimal, dict[int, PromotionItem]]:
    errors: list[str] = []
    snapshots: list[dict] = []
    items_amount = Decimal('0')
    promotion_items_map: dict[int, PromotionItem] = {}

    if not cart_items:
        errors.append('购物车为空')
        return errors, snapshots, items_amount, promotion_items_map

    for item in cart_items:
        product = Product.objects.filter(id=item['product_id'], merchant=merchant).first()
        if product is None:
            errors.append(f"商品 {item['product_id']} 不存在")
            continue

        quantity = int(item['quantity'])
        if quantity <= 0:
            errors.append(f"{product.name} 数量必须是正整数")
            continue

        if product.stock != -1 and quantity > product.stock:
            errors.append(f"{product.name} 超过库存限制")
            continue

        if not product.is_active:
            errors.append(f"{product.name} 已下架")
            continue

        unit_price = product.price
        promotion_id = None
        promo_price = None
        original_price = float(product.price)

        promo_item = get_active_promotion_item(product.id)
        if promo_item is not None:
            if promo_item.promo_stock != -1:
                remaining_promo_stock = promo_item.promo_stock - promo_item.sold_quantity
                if quantity > remaining_promo_stock:
                    errors.append(f"{product.name} 活动库存不足，剩余 {remaining_promo_stock} 件")
                    continue
            unit_price = promo_item.promo_price
            promotion_id = promo_item.promotion_id
            promo_price = float(promo_item.promo_price)
            promotion_items_map[product.id] = promo_item

        subtotal = unit_price * Decimal(quantity)
        items_amount += subtotal

        snapshots.append(
            {
                'product_id': product.id,
                'name': product.name,
                'unit': product.unit,
                'price': float(unit_price),
                'quantity': quantity,
                'subtotal': float(subtotal),
                'promotion_id': promotion_id,
                'promo_price': promo_price,
                'original_price': original_price
            }
        )

    if items_amount < merchant.min_order_amount:
        errors.append(f"未达到起送价：¥{merchant.min_order_amount:.2f}")

    return errors, snapshots, items_amount, promotion_items_map


def require_merchant_permission(request, merchant_id: int):
    user = get_request_user(request)
    if user is None:
        return error_response('请先登录', status_code=403)
    if user.role != 'merchant':
        return error_response('仅商家可操作', status_code=403)
    if user.merchant_id != merchant_id:
        return error_response('无权操作该商家订单', status_code=403)
    return None


def validate_delivery_slot(
    merchant: Merchant,
    fulfillment_type: str,
    scheduled_date: date | None,
    scheduled_slot_id: int | None,
    check_capacity: bool = False
) -> tuple[list[str], DeliverySlot | None]:
    """
    校验预约配送时段。

    并发控制方案说明（下单时 count 方案）：
    - 本方案在下单事务中实时统计该时段的有效订单数（非取消/退款状态），
      与时段 capacity 比较判断是否可用。
    - 取舍：
      * 优点：1) 无需额外维护计数字段，数据一致性由数据库保证；
              2) 实现简单，易于理解和维护；
              3) 对于社区团购低并发场景性能足够。
      * 缺点：1) 高并发下存在极小概率超卖（两个事务同时 count 都通过，
              然后都提交），概率约等于同一毫秒内的并发下单数 / capacity；
              2) 每次下单都需要 count 查询，超高峰时段有一定性能开销。
    - 替代方案对比：
      * 行锁方案（select_for_update + 实时 counter 字段）：
        并发控制更严格，但需要在 DeliverySlot 上维护 used_count 字段，
        每次下单/取消都要更新该字段，写操作热点可能成为瓶颈。
      * Redis 分布式锁：跨进程互斥，复杂度高，引入外部依赖。
    - 本项目选择「下单时 count」方案，因为社区团购场景并发量低，
      且已有外层事务保证，实际超卖风险可接受。若后续需要更高并发，
      可平滑迁移至行锁方案。
    """
    errors: list[str] = []
    slot: DeliverySlot | None = None

    if fulfillment_type != 'delivery':
        return errors, slot

    if scheduled_date is None and scheduled_slot_id is None:
        return errors, slot

    if scheduled_date is None or scheduled_slot_id is None:
        errors.append('预约日期和时段必须同时提供')
        return errors, slot

    today = date.today()
    if scheduled_date < today:
        errors.append('不能选择过去的日期')
        return errors, slot

    slot = DeliverySlot.objects.filter(
        id=scheduled_slot_id,
        merchant=merchant,
        is_active=True
    ).first()
    if slot is None:
        errors.append('所选时段不存在或已停用')
        return errors, slot

    if check_capacity:
        used_count = Order.objects.filter(
            merchant=merchant,
            scheduled_date=scheduled_date,
            scheduled_slot=slot,
            status__in=['pending', 'confirmed', 'delivering', 'pickup_ready', 'completed']
        ).count()
        if used_count >= slot.capacity:
            errors.append(f"所选时段 {slot.start_time}-{slot.end_time} 已满员")

    return errors, slot


class CartValidateView(APIView):
    def post(self, request):
        serializer = CartValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        merchant = Merchant.objects.filter(id=serializer.validated_data['merchant_id']).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        fulfillment_type = serializer.validated_data.get('fulfillment_type', 'delivery')
        if fulfillment_type == 'pickup' and not merchant.supports_pickup:
            return error_response('该商家不支持到店自提', status_code=400)

        scheduled_date = serializer.validated_data.get('scheduled_date')
        scheduled_slot_id = serializer.validated_data.get('scheduled_slot_id')

        slot_errors, _ = validate_delivery_slot(
            merchant,
            fulfillment_type,
            scheduled_date,
            scheduled_slot_id,
            check_capacity=True
        )
        if slot_errors:
            return error_response('预约时段校验失败', errors=slot_errors)

        delivery_fee = merchant.pickup_fee if fulfillment_type == 'pickup' else merchant.delivery_fee

        errors, snapshots, items_amount, _ = validate_cart(
            merchant,
            serializer.validated_data['cart_items']
        )
        if errors:
            return error_response('购物车校验失败', errors=errors)

        coupon_id = serializer.validated_data.get('coupon_id')
        discount_amount = Decimal('0')
        coupon_data = None

        if coupon_id:
            user = get_request_user(request)
            user_coupon = UserCoupon.objects.select_related('template').filter(
                id=coupon_id
            ).first()
            if user_coupon is None:
                return error_response('优惠券不存在', status_code=404)
            if user and user_coupon.user_id != user.id:
                return error_response('无权使用该优惠券', status_code=403)

            valid, coupon_errors, discount = validate_coupon_usage(
                user_coupon,
                items_amount,
                delivery_fee
            )
            if not valid:
                return error_response('优惠券不可用', errors=coupon_errors)

            discount_amount = discount
            from coupons.serializers import UserCouponSerializer
            coupon_data = UserCouponSerializer(user_coupon).data

        total_amount = items_amount + delivery_fee - discount_amount
        if total_amount < 0:
            total_amount = Decimal('0')

        return success_response(
            {
                'valid': True,
                'items_snapshot': snapshots,
                'items_amount': float(items_amount),
                'delivery_fee': float(delivery_fee),
                'discount_amount': float(discount_amount),
                'total_amount': float(total_amount),
                'coupon': coupon_data
            }
        )


class OrderListView(APIView):
    def get(self, request):
        buyer_id = request.query_params.get('buyer_id')
        merchant_id = request.query_params.get('merchant_id')

        if merchant_id:
            try:
                target_merchant_id = int(merchant_id)
            except (TypeError, ValueError):
                return error_response('merchant_id 非法', status_code=400)

            permission_error = require_merchant_permission(request, target_merchant_id)
            if permission_error is not None:
                return permission_error

        queryset = Order.objects.all().order_by('-created_at')
        if buyer_id:
            queryset = queryset.filter(buyer_id=buyer_id)
        if merchant_id:
            queryset = queryset.filter(merchant_id=merchant_id)

        serializer = OrderSerializer(queryset, many=True)
        return success_response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        current_user = get_request_user(request)
        if current_user is not None:
            if current_user.role != 'buyer':
                return error_response('仅买家可下单', status_code=403)
            if current_user.id != payload['buyer_id']:
                return error_response('无权为其他买家下单', status_code=403)

        buyer = StoreUser.objects.filter(id=payload['buyer_id']).first()
        if buyer is None:
            return error_response('买家不存在', status_code=404)

        merchant = Merchant.objects.filter(id=payload['merchant_id']).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        fulfillment_type = payload.get('fulfillment_type', 'delivery')
        if fulfillment_type == 'pickup' and not merchant.supports_pickup:
            return error_response('该商家不支持到店自提', status_code=400)

        scheduled_date = payload.get('scheduled_date')
        scheduled_slot_id = payload.get('scheduled_slot_id')

        slot_errors, scheduled_slot = validate_delivery_slot(
            merchant,
            fulfillment_type,
            scheduled_date,
            scheduled_slot_id,
            check_capacity=True
        )
        if slot_errors:
            return error_response('预约时段校验失败', errors=slot_errors)

        delivery_fee = merchant.pickup_fee if fulfillment_type == 'pickup' else merchant.delivery_fee

        receiver_address = payload.get('receiver_address', '')
        if fulfillment_type == 'pickup' and not receiver_address:
            receiver_address = merchant.address

        if fulfillment_type == 'delivery' and not receiver_address:
            return error_response('配送订单收货地址必填', status_code=400)

        errors, snapshots, items_amount, promotion_items_map = validate_cart(merchant, payload['cart_items'])
        if errors:
            return error_response('下单失败', errors=errors)

        coupon_id = payload.get('coupon_id')
        user_coupon = None
        discount_amount = Decimal('0')

        if coupon_id:
            user_coupon = UserCoupon.objects.select_for_update().select_related('template').filter(
                id=coupon_id
            ).first()
            if user_coupon is None:
                return error_response('优惠券不存在', status_code=404)
            if user_coupon.user_id != buyer.id:
                return error_response('无权使用该优惠券', status_code=403)

            valid, coupon_errors, discount = validate_coupon_usage(
                user_coupon,
                items_amount,
                delivery_fee
            )
            if not valid:
                return error_response('优惠券不可用', errors=coupon_errors)

            discount_amount = discount

            user_coupon.status = 'used'
            user_coupon.used_at = timezone.now()
            user_coupon.save(update_fields=['status', 'used_at'])

        total_amount = items_amount + delivery_fee - discount_amount
        if total_amount < 0:
            total_amount = Decimal('0')

        order = Order.objects.create(
            buyer=buyer,
            merchant=merchant,
            order_no=generate_order_no(),
            status='pending',
            pay_method='offline',
            fulfillment_type=fulfillment_type,
            receiver_name=payload['receiver_name'],
            receiver_phone=payload['receiver_phone'],
            receiver_address=receiver_address,
            remark=payload.get('remark', ''),
            scheduled_date=scheduled_date,
            scheduled_slot=scheduled_slot,
            items_amount=items_amount,
            delivery_fee=delivery_fee,
            discount_amount=discount_amount,
            coupon=user_coupon,
            total_amount=total_amount,
            items_snapshot=snapshots
        )

        if user_coupon:
            user_coupon.order = order
            user_coupon.save(update_fields=['order'])

            CouponRedeemRecord.objects.create(
                user_coupon=user_coupon,
                order=order,
                merchant=merchant,
                buyer=buyer,
                discount_amount=discount_amount,
                items_amount=items_amount
            )

        for item in payload['cart_items']:
            product = Product.objects.select_for_update().filter(id=item['product_id'], merchant=merchant).first()
            if product:
                quantity = int(item['quantity'])
                product.adjust_stock(
                    change_quantity=-quantity,
                    reason='order_deduct',
                    operator=buyer,
                    order=order
                )

            promo_item = promotion_items_map.get(item['product_id'])
            if promo_item is not None:
                increment_sold_quantity(promo_item.id, int(item['quantity']))

        return success_response(OrderSerializer(order).data, status_code=201)


class OrderDetailView(APIView):
    def get(self, request, order_id: int):
        order = Order.objects.filter(id=order_id).first()
        if order is None:
            return success_response(None)

        user = get_request_user(request)
        if user is not None:
            if user.role == 'buyer' and order.buyer_id != user.id:
                return error_response('无权查看该订单', status_code=403)
            if user.role == 'merchant' and order.merchant_id != user.merchant_id:
                return error_response('无权查看该订单', status_code=403)

        return success_response(OrderSerializer(order).data)


class OrderStatusUpdateView(APIView):
    @transaction.atomic
    def patch(self, request, order_id: int):
        order = Order.objects.filter(id=order_id).select_related('coupon').first()
        if order is None:
            return error_response('订单不存在', status_code=404)

        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        next_status = serializer.validated_data['status']

        if next_status == order.status:
            return success_response(OrderSerializer(order).data)

        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        if next_status == 'canceled':
            if user.role == 'buyer':
                if order.buyer_id != user.id:
                    return error_response('无权操作该订单', status_code=403)
            else:
                permission_error = require_merchant_permission(request, order.merchant_id)
                if permission_error is not None:
                    return permission_error
        else:
            permission_error = require_merchant_permission(request, order.merchant_id)
            if permission_error is not None:
                return permission_error

        allowed = STATUS_TRANSITIONS.get(order.status, [])
        if next_status not in allowed:
            return error_response('状态不可逆或非法迁移', status_code=400)

        if next_status == 'canceled' and order.status == 'pending' and order.coupon_id:
            user_coupon = UserCoupon.objects.select_for_update().filter(
                id=order.coupon_id
            ).first()
            if user_coupon and user_coupon.status == 'used':
                user_coupon.status = 'available'
                user_coupon.used_at = None
                user_coupon.order = None
                user_coupon.save(update_fields=['status', 'used_at', 'order_id'])

                CouponRedeemRecord.objects.filter(
                    order=order,
                    user_coupon=user_coupon
                ).delete()

        order.status = next_status
        order.save(update_fields=['status', 'updated_at'])

        if next_status == 'completed':
            points_to_add = int(order.total_amount.to_integral_value())
            if points_to_add > 0:
                BuyerProfile.add_points(
                    buyer_id=order.buyer_id,
                    points=points_to_add,
                    source='order_complete',
                    source_id=order.id
                )

        return success_response(OrderSerializer(order).data)
