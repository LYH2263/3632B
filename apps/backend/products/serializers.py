from rest_framework import serializers
from django.utils import timezone

from .models import Product
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
