from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.models import Merchant
from merchants.views import require_merchant_permission
from .models import CouponRedeemRecord, CouponTemplate, UserCoupon
from .serializers import (
    CouponClaimSerializer,
    CouponRedeemRecordSerializer,
    CouponTemplateSerializer,
    CouponValidateSerializer,
    UserCouponSerializer
)
from .utils import validate_coupon_usage


class CouponTemplateListView(APIView):
    def get(self, request):
        now = timezone.now()
        templates = CouponTemplate.objects.filter(
            valid_from__lte=now,
            valid_to__gte=now
        ).order_by('-created_at')
        serializer = CouponTemplateSerializer(templates, many=True)
        return success_response(serializer.data)


class CouponClaimView(APIView):
    @transaction.atomic
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可领取优惠券', status_code=403)

        serializer = CouponClaimSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        template_id = serializer.validated_data['template_id']

        template = CouponTemplate.objects.select_for_update().filter(id=template_id).first()
        if template is None:
            return error_response('优惠券模板不存在', status_code=404)

        now = timezone.now()
        if now < template.valid_from:
            return error_response('优惠券尚未开始领取')
        if now > template.valid_to:
            return error_response('优惠券已过期，无法领取')

        if template.claimed_quantity >= template.total_quantity:
            return error_response('优惠券已被领完')

        user_coupon_count = UserCoupon.objects.filter(
            user=user,
            template=template
        ).count()
        if user_coupon_count >= template.per_user_limit:
            return error_response(f'每人限领 {template.per_user_limit} 张，您已达上限')

        user_coupon = UserCoupon.objects.create(
            user=user,
            template=template,
            status='available'
        )

        template.claimed_quantity += 1
        template.save(update_fields=['claimed_quantity'])

        return success_response(
            UserCouponSerializer(user_coupon).data,
            status_code=201
        )


class UserCouponListView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可查看优惠券', status_code=403)

        status = request.query_params.get('status')

        queryset = UserCoupon.objects.filter(user=user).select_related('template')
        if status:
            queryset = queryset.filter(status=status)

        queryset = queryset.order_by('-claimed_at')
        serializer = UserCouponSerializer(queryset, many=True)
        return success_response(serializer.data)


class CouponValidateView(APIView):
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        serializer = CouponValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user_coupon = UserCoupon.objects.select_related('template').filter(
            id=data['coupon_id']
        ).first()
        if user_coupon is None:
            return error_response('优惠券不存在', status_code=404)

        if user_coupon.user_id != user.id:
            return error_response('无权使用该优惠券', status_code=403)

        merchant = Merchant.objects.filter(id=data['merchant_id']).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        valid, errors, discount_amount = validate_coupon_usage(
            user_coupon,
            data['items_amount'],
            data['delivery_fee']
        )

        total_before = data['items_amount'] + data['delivery_fee']
        final_amount = max(Decimal('0'), total_before - discount_amount)

        return success_response({
            'valid': valid,
            'errors': errors,
            'discount_amount': float(discount_amount),
            'final_amount': float(final_amount)
        })


class AvailableCouponsView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可查看', status_code=403)

        try:
            merchant_id = int(request.query_params.get('merchant_id', 0))
            items_amount = Decimal(request.query_params.get('items_amount', '0'))
            delivery_fee = Decimal(request.query_params.get('delivery_fee', '0'))
        except (TypeError, ValueError):
            return error_response('参数非法', status_code=400)

        if merchant_id <= 0:
            return error_response('merchant_id 非法', status_code=400)

        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        user_coupons = UserCoupon.objects.filter(
            user=user,
            status='available'
        ).select_related('template')

        now = timezone.now()
        available: list[UserCoupon] = []
        for coupon in user_coupons:
            valid, _, _ = validate_coupon_usage(coupon, items_amount, delivery_fee, now)
            if valid:
                available.append(coupon)

        available.sort(key=lambda c: c.template.discount_amount, reverse=True)
        serializer = UserCouponSerializer(available, many=True)
        return success_response(serializer.data)


class CouponRedeemRecordListView(APIView):
    def get(self, request):
        merchant_id_str = request.query_params.get('merchant_id')
        if not merchant_id_str:
            return error_response('merchant_id 必填', status_code=400)

        try:
            merchant_id = int(merchant_id_str)
        except (TypeError, ValueError):
            return error_response('merchant_id 非法', status_code=400)

        permission_error = require_merchant_permission(request, merchant_id)
        if permission_error is not None:
            return permission_error

        records = CouponRedeemRecord.objects.filter(
            merchant_id=merchant_id
        ).select_related(
            'order',
            'user_coupon',
            'user_coupon__template',
            'buyer'
        ).order_by('-redeemed_at')

        serializer = CouponRedeemRecordSerializer(records, many=True)
        return success_response(serializer.data)
