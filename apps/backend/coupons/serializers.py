from rest_framework import serializers

from .models import CouponRedeemRecord, CouponTemplate, UserCoupon


class CouponTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CouponTemplate
        fields = [
            'id',
            'name',
            'type',
            'threshold_amount',
            'discount_amount',
            'valid_from',
            'valid_to',
            'total_quantity',
            'claimed_quantity',
            'per_user_limit',
            'include_delivery_fee',
            'description'
        ]


class UserCouponSerializer(serializers.ModelSerializer):
    template = CouponTemplateSerializer(read_only=True)
    template_id = serializers.IntegerField(source='template.id', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True, allow_null=True)

    class Meta:
        model = UserCoupon
        fields = [
            'id',
            'user_id',
            'template_id',
            'template',
            'status',
            'order_id',
            'claimed_at',
            'used_at'
        ]


class CouponClaimSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()


class CouponValidateSerializer(serializers.Serializer):
    coupon_id = serializers.IntegerField()
    merchant_id = serializers.IntegerField()
    items_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2)


class CouponRedeemRecordSerializer(serializers.ModelSerializer):
    order_no = serializers.CharField(source='order.order_no', read_only=True)
    template_name = serializers.CharField(source='user_coupon.template.name', read_only=True)
    buyer_nickname = serializers.CharField(source='buyer.nickname', read_only=True)
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    user_coupon_id = serializers.IntegerField(source='user_coupon.id', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True)

    class Meta:
        model = CouponRedeemRecord
        fields = [
            'id',
            'user_coupon_id',
            'order_id',
            'merchant_id',
            'buyer_id',
            'discount_amount',
            'items_amount',
            'redeemed_at',
            'template_name',
            'order_no',
            'buyer_nickname'
        ]
