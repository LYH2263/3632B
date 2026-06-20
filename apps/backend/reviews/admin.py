from django.contrib import admin

from .models import ProductReview


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'order_id', 'product_id', 'buyer_id', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['content', 'reply']
    readonly_fields = ['created_at']
