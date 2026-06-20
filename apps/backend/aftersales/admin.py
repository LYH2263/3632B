from django.contrib import admin
from .models import AfterSaleOrder


@admin.register(AfterSaleOrder)
class AfterSaleOrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'order',
        'buyer',
        'merchant',
        'reason',
        'status',
        'reject_reason',
        'created_at'
    )
    list_filter = ('status', 'reason', 'reject_reason')
    search_fields = ('order__order_no',)
