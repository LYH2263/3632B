from django.db import transaction
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.views import require_merchant_permission
from orders.models import Order

from .models import AfterSaleOrder
from .serializers import AfterSaleCreateSerializer, AfterSaleReviewSerializer, AfterSaleSerializer


ELIGIBLE_ORDER_STATUSES = {'completed', 'delivering'}


class AfterSaleCreateView(APIView):
    @transaction.atomic
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'buyer':
            return error_response('仅买家可申请售后', status_code=403)

        serializer = AfterSaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order = Order.objects.select_for_update().filter(id=data['order_id']).first()
        if order is None:
            return error_response('订单不存在', status_code=404)

        if order.buyer_id != user.id:
            return error_response('无权对该订单申请售后', status_code=403)

        if order.status not in ELIGIBLE_ORDER_STATUSES:
            return error_response('仅已完成或配送中的订单可申请售后', status_code=400)

        existing = AfterSaleOrder.objects.filter(
            order_id=order.id,
            status='pending'
        ).first()
        if existing is not None:
            return error_response('该订单已有进行中的售后申请', status_code=400)

        aftersale = AfterSaleOrder.objects.create(
            order=order,
            buyer=user,
            merchant_id=order.merchant_id,
            reason=data['reason'],
            description=data.get('description', '')
        )

        return success_response(AfterSaleSerializer(aftersale).data, status_code=201)


class AfterSaleListView(APIView):
    def get(self, request):
        buyer_id_str = request.query_params.get('buyer_id')
        merchant_id_str = request.query_params.get('merchant_id')

        queryset = AfterSaleOrder.objects.select_related('order', 'buyer', 'merchant').all()

        if buyer_id_str:
            try:
                buyer_id = int(buyer_id_str)
            except (TypeError, ValueError):
                return error_response('buyer_id 非法', status_code=400)
            user = get_request_user(request)
            if user is None:
                return error_response('请先登录', status_code=403)
            if user.role == 'buyer' and user.id != buyer_id:
                return error_response('无权查看他人售后单', status_code=403)
            queryset = queryset.filter(buyer_id=buyer_id)

        if merchant_id_str:
            try:
                merchant_id = int(merchant_id_str)
            except (TypeError, ValueError):
                return error_response('merchant_id 非法', status_code=400)
            permission_error = require_merchant_permission(request, merchant_id)
            if permission_error is not None:
                return permission_error
            queryset = queryset.filter(merchant_id=merchant_id)

        serializer = AfterSaleSerializer(queryset, many=True)
        return success_response(serializer.data)


class AfterSaleReviewView(APIView):
    @transaction.atomic
    def patch(self, request, aftersale_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role != 'merchant':
            return error_response('仅商家可审核售后', status_code=403)

        aftersale = AfterSaleOrder.objects.select_for_update().select_related('order').filter(
            id=aftersale_id
        ).first()
        if aftersale is None:
            return error_response('售后单不存在', status_code=404)

        if aftersale.merchant_id != user.merchant_id:
            return error_response('无权审核该售后单', status_code=403)

        if aftersale.status != 'pending':
            return error_response('该售后单已处理', status_code=400)

        serializer = AfterSaleReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data['action'] == 'approve':
            aftersale.status = 'approved'
            aftersale.save(update_fields=['status', 'updated_at'])

            order = aftersale.order
            order.status = 'refunded'
            order.save(update_fields=['status', 'updated_at'])
        else:
            reject_reason = data.get('reject_reason', '')
            reject_remark = data.get('reject_remark', '')
            if not reject_reason:
                return error_response('拒绝时需填写或选择原因', status_code=400)
            aftersale.status = 'rejected'
            aftersale.reject_reason = reject_reason
            aftersale.reject_remark = reject_remark
            aftersale.save(update_fields=['status', 'reject_reason', 'reject_remark', 'updated_at'])

        return success_response(AfterSaleSerializer(aftersale).data)
