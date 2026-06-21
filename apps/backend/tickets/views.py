from django.db import transaction
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from common.auth import get_request_user
from common.response import error_response, success_response
from merchants.views import require_merchant_permission
from merchants.models import Merchant
from orders.models import Order

from .models import Ticket, TicketMessage
from .serializers import (
    TicketCreateSerializer,
    TicketMessageCreateSerializer,
    TicketStatusUpdateSerializer,
    TicketSerializer,
    TicketListSerializer
)


class StandardTicketPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class TicketCreateView(APIView):
    @transaction.atomic
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)
        if user.role not in ['buyer', 'merchant']:
            return error_response('无权创建工单', status_code=403)

        serializer = TicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        merchant = Merchant.objects.filter(id=data['merchant_id']).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        order = None
        if data.get('order_id'):
            order = Order.objects.filter(id=data['order_id']).first()
            if order is None:
                return error_response('订单不存在', status_code=404)
            if order.merchant_id != merchant.id:
                return error_response('订单不属于该商家', status_code=400)
            if user.role == 'buyer' and order.buyer_id != user.id:
                return error_response('无权对该订单创建工单', status_code=403)
            if user.role == 'merchant' and order.merchant_id != user.merchant_id:
                return error_response('无权对该订单创建工单', status_code=403)

        buyer = None
        ticket_merchant = merchant

        if user.role == 'buyer':
            buyer = user
        else:
            if not data.get('order_id'):
                return error_response('商家创建工单必须关联订单', status_code=400)
            buyer = order.buyer
            ticket_merchant = Merchant.objects.filter(id=user.merchant_id).first()
            if ticket_merchant is None:
                return error_response('商家信息不存在', status_code=404)

        ticket = Ticket.objects.create(
            buyer=buyer,
            merchant=ticket_merchant,
            order=order,
            type=data['type'],
            title=data['title'],
            description=data['description'],
            status='open'
        )

        TicketMessage.objects.create(
            ticket=ticket,
            sender=user,
            content=data['description']
        )

        return success_response(TicketSerializer(ticket).data, status_code=201)


class TicketListView(APIView):
    def get(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        buyer_id_str = request.query_params.get('buyer_id')
        merchant_id_str = request.query_params.get('merchant_id')

        queryset = Ticket.objects.select_related(
            'buyer', 'merchant', 'order'
        ).prefetch_related('messages').all()

        if buyer_id_str:
            try:
                buyer_id = int(buyer_id_str)
            except (TypeError, ValueError):
                return error_response('buyer_id 非法', status_code=400)
            if user.role == 'buyer' and user.id != buyer_id:
                return error_response('无权查看他人工单', status_code=403)
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

        if not buyer_id_str and not merchant_id_str:
            if user.role == 'buyer':
                queryset = queryset.filter(buyer_id=user.id)
            elif user.role == 'merchant' and user.merchant_id:
                queryset = queryset.filter(merchant_id=user.merchant_id)

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        paginator = StandardTicketPagination()
        result_page = paginator.paginate_queryset(queryset, request)
        serializer = TicketListSerializer(result_page, many=True)
        return success_response({
            'results': serializer.data,
            'count': paginator.page.paginator.count,
            'page': paginator.page.number,
            'page_size': paginator.page_size,
            'total_pages': paginator.page.paginator.num_pages
        })


class TicketDetailView(APIView):
    def get(self, request, ticket_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        ticket = Ticket.objects.select_related(
            'buyer', 'merchant', 'order'
        ).prefetch_related('messages', 'messages__sender').filter(
            id=ticket_id
        ).first()

        if ticket is None:
            return error_response('工单不存在', status_code=404)

        if user.role == 'buyer' and ticket.buyer_id != user.id:
            return error_response('无权查看该工单', status_code=403)
        if user.role == 'merchant' and ticket.merchant_id != user.merchant_id:
            return error_response('无权查看该工单', status_code=403)

        return success_response(TicketSerializer(ticket).data)


class TicketStatusUpdateView(APIView):
    @transaction.atomic
    def patch(self, request, ticket_id: int):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        ticket = Ticket.objects.select_for_update().filter(id=ticket_id).first()
        if ticket is None:
            return error_response('工单不存在', status_code=404)

        if user.role == 'buyer' and ticket.buyer_id != user.id:
            return error_response('无权操作该工单', status_code=403)
        if user.role == 'merchant' and ticket.merchant_id != user.merchant_id:
            return error_response('无权操作该工单', status_code=403)

        serializer = TicketStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        ticket.status = data['status']
        ticket.save(update_fields=['status', 'updated_at'])

        return success_response(TicketSerializer(ticket).data)


class TicketMessageCreateView(APIView):
    @transaction.atomic
    def post(self, request):
        user = get_request_user(request)
        if user is None:
            return error_response('请先登录', status_code=403)

        serializer = TicketMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        ticket = Ticket.objects.select_for_update().filter(
            id=data['ticket_id']
        ).select_related('buyer', 'merchant').first()

        if ticket is None:
            return error_response('工单不存在', status_code=404)

        if user.role == 'buyer' and ticket.buyer_id != user.id:
            return error_response('无权回复该工单', status_code=403)
        if user.role == 'merchant' and ticket.merchant_id != user.merchant_id:
            return error_response('无权回复该工单', status_code=403)

        if ticket.status == 'closed':
            return error_response('工单已关闭，无法回复', status_code=400)

        if ticket.status == 'open' and user.role == 'merchant':
            ticket.status = 'processing'
            ticket.save(update_fields=['status', 'updated_at'])

        message = TicketMessage.objects.create(
            ticket=ticket,
            sender=user,
            content=data['content']
        )

        return success_response(TicketMessageSerializer(message).data, status_code=201)
