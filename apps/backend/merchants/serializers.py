from rest_framework import serializers

from .models import Merchant, DeliverySlot


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = [
            'id',
            'name',
            'phone',
            'address',
            'delivery_note',
            'min_order_amount',
            'delivery_fee',
            'is_open',
            'supports_pickup',
            'pickup_fee'
        ]


class DeliverySlotSerializer(serializers.ModelSerializer):
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)

    class Meta:
        model = DeliverySlot
        fields = [
            'id',
            'merchant_id',
            'start_time',
            'end_time',
            'capacity',
            'is_active',
            'created_at',
            'updated_at'
        ]


class DeliverySlotWithAvailabilitySerializer(serializers.ModelSerializer):
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    scheduled_date = serializers.DateField()
    used_count = serializers.IntegerField()
    available = serializers.BooleanField()

    class Meta:
        model = DeliverySlot
        fields = [
            'id',
            'merchant_id',
            'start_time',
            'end_time',
            'capacity',
            'is_active',
            'scheduled_date',
            'used_count',
            'available',
            'created_at',
            'updated_at'
        ]
