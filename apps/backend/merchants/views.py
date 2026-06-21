from datetime import date
from django.core.cache import cache
from django.db import transaction
from django.db.models import Count
from rest_framework.views import APIView

from common.auth import get_request_user
from common.response import error_response, success_response
from .models import Merchant, DeliverySlot
from .serializers import (
    MerchantSerializer,
    DeliverySlotSerializer,
    DeliverySlotWithAvailabilitySerializer
)
from orders.models import Order

MERCHANT_LIST_CACHE_KEY = 'merchant:list'


def require_merchant_permission(request, merchant_id: int):
    user = get_request_user(request)
    if user is None:
        return error_response('请先登录', status_code=403)
    if user.role != 'merchant':
        return error_response('仅商家可操作', status_code=403)
    if user.merchant_id != merchant_id:
        return error_response('无权操作该商家数据', status_code=403)
    return None


class MerchantListView(APIView):
    def get(self, request):
        cached = cache.get(MERCHANT_LIST_CACHE_KEY)
        if cached is not None:
            return success_response(cached)

        merchants = Merchant.objects.all().order_by('id')
        serializer = MerchantSerializer(merchants, many=True)
        cache.set(MERCHANT_LIST_CACHE_KEY, serializer.data, 60)
        return success_response(serializer.data)


class MerchantDetailView(APIView):
    def patch(self, request, merchant_id: int):
        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        permission_error = require_merchant_permission(request, merchant_id)
        if permission_error is not None:
            return permission_error

        serializer = MerchantSerializer(merchant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        cache.delete(MERCHANT_LIST_CACHE_KEY)

        return success_response(serializer.data)


class DeliverySlotListView(APIView):
    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        if not merchant_id:
            return error_response('merchant_id 必填', status_code=400)
        try:
            merchant_id = int(merchant_id)
        except (TypeError, ValueError):
            return error_response('merchant_id 非法', status_code=400)

        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        slots = DeliverySlot.objects.filter(merchant_id=merchant_id, is_active=True).order_by('start_time')
        serializer = DeliverySlotSerializer(slots, many=True)
        return success_response(serializer.data)

    @transaction.atomic
    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        if not merchant_id:
            return error_response('merchant_id 必填', status_code=400)
        try:
            merchant_id = int(merchant_id)
        except (TypeError, ValueError):
            return error_response('merchant_id 非法', status_code=400)

        permission_error = require_merchant_permission(request, merchant_id)
        if permission_error is not None:
            return permission_error

        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        serializer = DeliverySlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(merchant=merchant)
        return success_response(serializer.data, status_code=201)


class DeliverySlotDetailView(APIView):
    @transaction.atomic
    def patch(self, request, slot_id: int):
        slot = DeliverySlot.objects.filter(id=slot_id).select_related('merchant').first()
        if slot is None:
            return error_response('时段不存在', status_code=404)

        permission_error = require_merchant_permission(request, slot.merchant_id)
        if permission_error is not None:
            return permission_error

        serializer = DeliverySlotSerializer(slot, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data)

    @transaction.atomic
    def delete(self, request, slot_id: int):
        slot = DeliverySlot.objects.filter(id=slot_id).select_related('merchant').first()
        if slot is None:
            return error_response('时段不存在', status_code=404)

        permission_error = require_merchant_permission(request, slot.merchant_id)
        if permission_error is not None:
            return permission_error

        slot.delete()
        return success_response(None)


class DeliverySlotAvailabilityView(APIView):
    def get(self, request):
        merchant_id = request.query_params.get('merchant_id')
        date_str = request.query_params.get('date')

        if not merchant_id or not date_str:
            return error_response('merchant_id 和 date 必填', status_code=400)

        try:
            merchant_id = int(merchant_id)
        except (TypeError, ValueError):
            return error_response('merchant_id 非法', status_code=400)

        try:
            scheduled_date = date.fromisoformat(date_str)
        except ValueError:
            return error_response('date 格式错误，应为 YYYY-MM-DD', status_code=400)

        merchant = Merchant.objects.filter(id=merchant_id).first()
        if merchant is None:
            return error_response('商家不存在', status_code=404)

        today = date.today()
        if scheduled_date < today:
            return error_response('不能选择过去的日期', status_code=400)

        slots = DeliverySlot.objects.filter(
            merchant_id=merchant_id,
            is_active=True
        ).order_by('start_time')

        used_counts = Order.objects.filter(
            merchant_id=merchant_id,
            scheduled_date=scheduled_date,
            scheduled_slot__isnull=False,
            status__in=['pending', 'confirmed', 'delivering', 'pickup_ready', 'completed']
        ).values('scheduled_slot_id').annotate(
            used=Count('id')
        )

        used_count_map = {item['scheduled_slot_id']: item['used'] for item in used_counts}

        slots_with_availability = []
        for slot in slots:
            used_count = used_count_map.get(slot.id, 0)
            slots_with_availability.append({
                **DeliverySlotSerializer(slot).data,
                'scheduled_date': scheduled_date.isoformat(),
                'used_count': used_count,
                'available': used_count < slot.capacity
            })

        return success_response(slots_with_availability)
