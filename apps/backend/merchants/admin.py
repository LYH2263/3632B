from django.contrib import admin
from .models import Merchant, DeliverySlot


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'name',
        'phone',
        'min_order_amount',
        'delivery_fee',
        'is_open'
    )
    search_fields = ('name', 'phone', 'address')
    list_filter = ('is_open',)


@admin.register(DeliverySlot)
class DeliverySlotAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'merchant',
        'start_time',
        'end_time',
        'capacity',
        'is_active'
    )
    search_fields = ('merchant__name',)
    list_filter = ('is_active', 'merchant')
    ordering = ('merchant', 'start_time')
