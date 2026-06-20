from rest_framework import serializers
from .models import BuyerProfile, PointLog


class BuyerProfileSerializer(serializers.ModelSerializer):
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    nickname = serializers.CharField(source='buyer.nickname', read_only=True)

    class Meta:
        model = BuyerProfile
        fields = [
            'id',
            'buyer_id',
            'nickname',
            'points',
            'total_earned',
            'deductible_points',
            'level',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields


class PointLogSerializer(serializers.ModelSerializer):
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)

    class Meta:
        model = PointLog
        fields = [
            'id',
            'buyer_id',
            'change',
            'balance_after',
            'source',
            'source_id',
            'created_at'
        ]
        read_only_fields = fields
