from rest_framework import serializers

from .models import ProductReview


class ProductReviewSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image_url = serializers.CharField(source='product.image_url', read_only=True)
    buyer_nickname = serializers.CharField(source='buyer.nickname', read_only=True)
    order_no = serializers.CharField(source='order.order_no', read_only=True)

    class Meta:
        model = ProductReview
        fields = [
            'id',
            'order_id',
            'product_id',
            'buyer_id',
            'merchant_id',
            'rating',
            'content',
            'reply',
            'reply_at',
            'created_at',
            'product_name',
            'product_image_url',
            'buyer_nickname',
            'order_no'
        ]


class CreateReviewSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    content = serializers.CharField(max_length=500, allow_blank=True, default='')


class ReplyReviewSerializer(serializers.Serializer):
    review_id = serializers.IntegerField()
    reply = serializers.CharField(max_length=500)
