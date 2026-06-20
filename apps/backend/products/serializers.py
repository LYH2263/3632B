from rest_framework import serializers
from django.utils import timezone

from .models import Product, StockLedger
from promotions.models import PromotionItem
from promotions.serializers import ProductPromotionSerializer


class ProductSerializer(serializers.ModelSerializer):
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    promotion = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'merchant_id',
            'merchant',
            'name',
            'price',
            'unit',
            'stock',
            'is_active',
            'image_url',
            'description',
            'promotion'
        ]
        extra_kwargs = {
            'merchant': {'write_only': True}
        }

    def get_promotion(self, obj):
        now = timezone.now()
        promo_item = PromotionItem.objects.select_related('promotion', 'product').filter(
            product_id=obj.id,
            promotion__start_at__lte=now,
            promotion__end_at__gte=now,
            promotion__status='active'
        ).order_by('-promotion__created_at').first()

        if promo_item is None:
            return None

        return ProductPromotionSerializer({
            'promotion_id': promo_item.promotion_id,
            'promotion_name': promo_item.promotion.name,
            'promo_price': promo_item.promo_price,
            'original_price': promo_item.product.price,
            'promo_stock': promo_item.promo_stock,
            'start_at': promo_item.promotion.start_at,
            'end_at': promo_item.promotion.end_at
        }).data


class StockLedgerSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    operator_id = serializers.IntegerField(source='operator.id', read_only=True)
    operator_name = serializers.CharField(source='operator.nickname', read_only=True)
    order_no = serializers.CharField(source='order.order_no', read_only=True, default=None)

    class Meta:
        model = StockLedger
        fields = [
            'id',
            'product_id',
            'product_name',
            'change_quantity',
            'stock_before',
            'stock_after',
            'reason',
            'reason_display',
            'operator_id',
            'operator_name',
            'order_id',
            'order_no',
            'operated_at',
        ]
