from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.models import Merchant
from products.models import Product
from .models import Promotion, PromotionItem
from .serializers import (
    PromotionCreateSerializer,
    PromotionSerializer,
    PromotionUpdateSerializer,
)
from .utils import get_active_promotion_for_product


def require_merchant_permission(request, merchant_id: int):
    user = get_request_user(request)
    if user is None:
        return error_response('请先登录', status_code=403)
    if user.role != 'merchant':
        return error_response('仅商家可操作', status_code=403)
    if user.merchant_id != merchant_id:
        return error_response('无权操作该商家数据', status_code=403)
    return None


def check_overlapping_promotions(merchant_id: int, product_ids: list[int], start_at, end_at, exclude_promotion_id: int = None):
    errors = []
    for product_id in product_ids:
        overlapping = PromotionItem.objects.select_related('promotion').filter(
            product_id=product_id,
            promotion__merchant_id=merchant_id,
            promotion__start_at__lte=end_at,
            promotion__end_at__gte=start_at,
            promotion__status__in=['draft', 'active']
        )
        if exclude_promotion_id:
            overlapping = overlapping.exclude(promotion_id=exclude_promotion_id)

        if overlapping.exists():
            product = Product.objects.filter(id=product_id).first()
            product_name = product.name if product else str(product_id)
            errors.append(f"商品 {product_name} 在同一时间段已有活动")
    return errors


def update_promotion_status(promotion: Promotion):
    now = timezone.now()
    if now < promotion.start_at:
        new_status = 'draft'
    elif promotion.start_at <= now <= promotion.end_at:
        new_status = 'active'
    else:
        new_status = 'ended'

    if promotion.status != new_status:
        promotion.status = new_status
        promotion.save(update_fields=['status', 'updated_at'])


class PromotionListView(APIView):
    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        status = request.query_params.get('status')

        if merchant_id:
            try:
                target_merchant_id = int(merchant_id)
            except (TypeError, ValueError):
                return error_response('merchant_id 非法', status_code=400)

            permission_error = require_merchant_permission(request, target_merchant_id)
            if permission_error is not None:
                return permission_error

        queryset = Promotion.objects.all().order_by('-created_at')
        if merchant_id:
            queryset = queryset.filter(merchant_id=merchant_id)
        if status:
            queryset = queryset.filter(status=status)

        for promotion in queryset:
            update_promotion_status(promotion)

        serializer = PromotionSerializer(queryset, many=True)
        return success_response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = PromotionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        merchant_id = request.data.get('merchant_id')
        if merchant_id is None:
            return error_response('merchant_id 必填', status_code=400)

        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        permission_error = require_merchant_permission(request, merchant.id)
        if permission_error is not None:
            return permission_error

        product_ids = [item['product_id'] for item in payload['items']]
        products = Product.objects.filter(id__in=product_ids, merchant=merchant)
        if products.count() != len(product_ids):
            return error_response('部分商品不属于该商家或不存在', status_code=400)

        overlap_errors = check_overlapping_promotions(
            merchant.id,
            product_ids,
            payload['start_at'],
            payload['end_at']
        )
        if overlap_errors:
            return error_response('活动时间冲突', errors=overlap_errors, status_code=400)

        now = timezone.now()
        status = 'active' if payload['start_at'] <= now <= payload['end_at'] else 'draft'
        if now > payload['end_at']:
            status = 'ended'

        promotion = Promotion.objects.create(
            merchant=merchant,
            name=payload['name'],
            description=payload.get('description', ''),
            start_at=payload['start_at'],
            end_at=payload['end_at'],
            status=status
        )

        for item_data in payload['items']:
            product = Product.objects.filter(id=item_data['product_id']).first()
            PromotionItem.objects.create(
                promotion=promotion,
                product=product,
                promo_price=item_data['promo_price'],
                promo_stock=item_data.get('promo_stock', -1)
            )

        return success_response(PromotionSerializer(promotion).data, status_code=201)


class PromotionDetailView(APIView):
    def get(self, request, promotion_id: int):
        promotion = Promotion.objects.filter(id=promotion_id).first()
        if promotion is None:
            return success_response(None)

        update_promotion_status(promotion)

        user = get_request_user(request)
        if user is not None:
            if user.role == 'merchant' and user.merchant_id != promotion.merchant_id:
                return error_response('无权查看该活动', status_code=403)

        serializer = PromotionSerializer(promotion)
        return success_response(serializer.data)

    @transaction.atomic
    def patch(self, request, promotion_id: int):
        promotion = Promotion.objects.filter(id=promotion_id).first()
        if promotion is None:
            return error_response('活动不存在', status_code=404)

        permission_error = require_merchant_permission(request, promotion.merchant_id)
        if permission_error is not None:
            return permission_error

        serializer = PromotionUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        start_at = payload.get('start_at', promotion.start_at)
        end_at = payload.get('end_at', promotion.end_at)
        items = payload.get('items')

        if items is not None:
            product_ids = [item['product_id'] for item in items]
            products = Product.objects.filter(id__in=product_ids, merchant_id=promotion.merchant_id)
            if products.count() != len(product_ids):
                return error_response('部分商品不属于该商家或不存在', status_code=400)

            overlap_errors = check_overlapping_promotions(
                promotion.merchant_id,
                product_ids,
                start_at,
                end_at,
                exclude_promotion_id=promotion.id
            )
            if overlap_errors:
                return error_response('活动时间冲突', errors=overlap_errors, status_code=400)

        if 'name' in payload:
            promotion.name = payload['name']
        if 'description' in payload:
            promotion.description = payload['description']
        if 'start_at' in payload:
            promotion.start_at = payload['start_at']
        if 'end_at' in payload:
            promotion.end_at = payload['end_at']

        update_promotion_status(promotion)
        promotion.save()

        if items is not None:
            PromotionItem.objects.filter(promotion=promotion).delete()
            for item_data in items:
                product = Product.objects.filter(id=item_data['product_id']).first()
                PromotionItem.objects.create(
                    promotion=promotion,
                    product=product,
                    promo_price=item_data['promo_price'],
                    promo_stock=item_data.get('promo_stock', -1)
                )

        return success_response(PromotionSerializer(promotion).data)

    @transaction.atomic
    def delete(self, request, promotion_id: int):
        promotion = Promotion.objects.filter(id=promotion_id).first()
        if promotion is None:
            return error_response('活动不存在', status_code=404)

        permission_error = require_merchant_permission(request, promotion.merchant_id)
        if permission_error is not None:
            return permission_error

        promotion.delete()
        return success_response({'message': '删除成功'})


class ProductPromotionView(APIView):
    def get(self, request, product_id: int):
        promotion = get_active_promotion_for_product(product_id)
        return success_response(promotion)
