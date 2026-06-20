from rest_framework import serializers

from .models import AfterSaleOrder


class AfterSaleCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    reason = serializers.ChoiceField(choices=['quality', 'wrong', 'damaged', 'not_received', 'other'])
    description = serializers.CharField(max_length=500, allow_blank=True, default='')


class AfterSaleReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    reject_reason = serializers.ChoiceField(
        choices=['evidence_insufficient', 'wrong_procedure', 'timeout', 'other'],
        required=False,
        allow_blank=True,
        default=''
    )
    reject_remark = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')


class AfterSaleSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    order_no = serializers.CharField(source='order.order_no', read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)

    class Meta:
        model = AfterSaleOrder
        fields = [
            'id',
            'order_id',
            'buyer_id',
            'merchant_id',
            'order_no',
            'order_status',
            'reason',
            'description',
            'status',
            'reject_reason',
            'reject_remark',
            'created_at',
            'updated_at'
        ]
