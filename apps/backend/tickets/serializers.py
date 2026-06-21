from rest_framework import serializers

from .models import Ticket, TicketMessage


class TicketCreateSerializer(serializers.Serializer):
    merchant_id = serializers.IntegerField()
    order_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    type = serializers.ChoiceField(choices=['delivery', 'product', 'other'])
    title = serializers.CharField(max_length=100)
    description = serializers.CharField(max_length=1000)


class TicketMessageCreateSerializer(serializers.Serializer):
    ticket_id = serializers.IntegerField()
    content = serializers.CharField(max_length=1000)


class TicketStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['open', 'processing', 'resolved', 'closed'])


class TicketMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_nickname = serializers.CharField(source='sender.nickname', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)

    class Meta:
        model = TicketMessage
        fields = [
            'id',
            'ticket_id',
            'sender_id',
            'sender_nickname',
            'sender_role',
            'content',
            'created_at'
        ]


class TicketSerializer(serializers.ModelSerializer):
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    buyer_nickname = serializers.CharField(source='buyer.nickname', read_only=True)
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    merchant_name = serializers.CharField(source='merchant.name', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True, allow_null=True)
    order_no = serializers.CharField(source='order.order_no', read_only=True, allow_null=True)
    messages = TicketMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id',
            'buyer_id',
            'buyer_nickname',
            'merchant_id',
            'merchant_name',
            'order_id',
            'order_no',
            'type',
            'title',
            'description',
            'status',
            'messages',
            'created_at',
            'updated_at'
        ]


class TicketListSerializer(serializers.ModelSerializer):
    buyer_id = serializers.IntegerField(source='buyer.id', read_only=True)
    buyer_nickname = serializers.CharField(source='buyer.nickname', read_only=True)
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    merchant_name = serializers.CharField(source='merchant.name', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True, allow_null=True)
    order_no = serializers.CharField(source='order.order_no', read_only=True, allow_null=True)
    last_message_at = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id',
            'buyer_id',
            'buyer_nickname',
            'merchant_id',
            'merchant_name',
            'order_id',
            'order_no',
            'type',
            'title',
            'status',
            'last_message_at',
            'created_at',
            'updated_at'
        ]

    def get_last_message_at(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return last_msg.created_at
        return obj.created_at
