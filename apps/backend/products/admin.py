from django.contrib import admin
from .models import Product, StockLedger


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'merchant', 'price', 'stock', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active', 'merchant')


@admin.register(StockLedger)
class StockLedgerAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'change_quantity', 'stock_before', 'stock_after', 'reason', 'operator', 'order', 'operated_at')
    search_fields = ('product__name',)
    list_filter = ('reason', 'product__merchant')
    readonly_fields = ('operated_at',)
