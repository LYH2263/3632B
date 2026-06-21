from rest_framework import serializers

from .models import Order


class CartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField()


class CartValidateSerializer(serializers.Serializer):
    merchant_id = serializers.IntegerField()
    cart_items = CartItemSerializer(many=True)
    coupon_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    fulfillment_type = serializers.ChoiceField(choices=['delivery', 'pickup'], default='delivery')
    scheduled_date = serializers.DateField(required=False, allow_null=True, default=None)
    scheduled_slot_id = serializers.IntegerField(required=False, allow_null=True, default=None)


class OrderCreateSerializer(CartValidateSerializer):
    buyer_id = serializers.IntegerField()
    receiver_name = serializers.CharField(max_length=50)
    receiver_phone = serializers.CharField(max_length=20)
    receiver_address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    remark = serializers.CharField(max_length=255, required=False, allow_blank=True)


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['pending', 'confirmed', 'delivering', 'pickup_ready', 'completed', 'canceled', 'refunded'])


class OrderSnapshotItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    name = serializers.CharField()
    unit = serializers.CharField()
    price = serializers.FloatField()
    quantity = serializers.IntegerField()
    subtotal = serializers.FloatField()
    promotion_id = serializers.IntegerField(allow_null=True, required=False)
    promo_price = serializers.FloatField(allow_null=True, required=False)
    original_price = serializers.FloatField(allow_null=True, required=False)


class ScheduledSlotSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()


class OrderSerializer(serializers.ModelSerializer):
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    coupon_id = serializers.IntegerField(source='coupon.id', read_only=True, allow_null=True)
    items_snapshot = OrderSnapshotItemSerializer(many=True, read_only=True)
    scheduled_slot = ScheduledSlotSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'order_no',
            'buyer_id',
            'merchant_id',
            'status',
            'pay_method',
            'fulfillment_type',
            'receiver_name',
            'receiver_phone',
            'receiver_address',
            'remark',
            'scheduled_date',
            'scheduled_slot',
            'items_amount',
            'delivery_fee',
            'discount_amount',
            'coupon_id',
            'total_amount',
            'items_snapshot',
            'created_at',
            'updated_at'
        ]
