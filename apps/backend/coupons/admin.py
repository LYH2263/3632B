from django.contrib import admin

from .models import CouponRedeemRecord, CouponTemplate, UserCoupon


@admin.register(CouponTemplate)
class CouponTemplateAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'type', 'threshold_amount', 'discount_amount',
                    'valid_from', 'valid_to', 'total_quantity', 'claimed_quantity',
                    'include_delivery_fee']
    list_filter = ['type', 'include_delivery_fee']
    search_fields = ['name', 'description']
    ordering = ['-id']


@admin.register(UserCoupon)
class UserCouponAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'template', 'status', 'claimed_at', 'used_at', 'order']
    list_filter = ['status']
    search_fields = ['user__username', 'template__name']
    ordering = ['-id']


@admin.register(CouponRedeemRecord)
class CouponRedeemRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'merchant', 'buyer', 'discount_amount', 'redeemed_at']
    list_filter = ['merchant']
    search_fields = ['order__order_no', 'buyer__username']
    ordering = ['-redeemed_at']
