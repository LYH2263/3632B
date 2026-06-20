from django.contrib import admin
from .models import Promotion, PromotionItem


class PromotionItemInline(admin.TabularInline):
    model = PromotionItem
    extra = 1
    raw_id_fields = ('product',)


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'merchant', 'status', 'start_at', 'end_at', 'created_at')
    list_filter = ('status', 'merchant')
    search_fields = ('name', 'merchant__name')
    inlines = [PromotionItemInline]
    raw_id_fields = ('merchant',)


@admin.register(PromotionItem)
class PromotionItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'promotion', 'product', 'promo_price', 'promo_stock', 'sold_quantity')
    list_filter = ('promotion__merchant',)
    search_fields = ('promotion__name', 'product__name')
    raw_id_fields = ('promotion', 'product')
