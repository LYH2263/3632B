from rest_framework import serializers
from django.db import transaction
from django.utils import timezone

from .models import Promotion, PromotionItem
from products.models import Product


class PromotionItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    original_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = PromotionItem
        fields = [
            'id',
            'product_id',
            'product_name',
            'original_price',
            'promo_price',
            'promo_stock',
            'sold_quantity'
        ]


class PromotionItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    promo_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    promo_stock = serializers.IntegerField(default=-1, min_value=-1)

    def validate_product_id(self, value):
        product = Product.objects.filter(id=value).first()
        if product is None:
            raise serializers.ValidationError('商品不存在')
        return value


class PromotionSerializer(serializers.ModelSerializer):
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    items = PromotionItemSerializer(many=True, read_only=True)

    class Meta:
        model = Promotion
        fields = [
            'id',
            'merchant_id',
            'name',
            'description',
            'start_at',
            'end_at',
            'status',
            'items',
            'created_at',
            'updated_at'
        ]


class PromotionCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
    items = PromotionItemCreateSerializer(many=True)

    def validate(self, attrs):
        if attrs['start_at'] >= attrs['end_at']:
            raise serializers.ValidationError('开始时间必须早于结束时间')
        return attrs

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('至少选择一个商品')

        product_ids = [item['product_id'] for item in value]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError('同一商品不能重复添加')

        return value


class PromotionUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    start_at = serializers.DateTimeField(required=False)
    end_at = serializers.DateTimeField(required=False)
    items = PromotionItemCreateSerializer(many=True, required=False)

    def validate(self, attrs):
        start_at = attrs.get('start_at')
        end_at = attrs.get('end_at')
        if start_at and end_at and start_at >= end_at:
            raise serializers.ValidationError('开始时间必须早于结束时间')
        return attrs

    def validate_items(self, value):
        if value is not None:
            if not value:
                raise serializers.ValidationError('至少选择一个商品')

            product_ids = [item['product_id'] for item in value]
            if len(product_ids) != len(set(product_ids)):
                raise serializers.ValidationError('同一商品不能重复添加')

        return value


class ProductPromotionSerializer(serializers.Serializer):
    promotion_id = serializers.IntegerField()
    promotion_name = serializers.CharField()
    promo_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    promo_stock = serializers.IntegerField()
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
