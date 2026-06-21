from django.contrib import admin

from .models import Ticket, TicketMessage


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'type', 'status', 'buyer', 'merchant', 'order_id', 'created_at')
    list_filter = ('type', 'status', 'created_at')
    search_fields = ('title', 'description', 'buyer__nickname', 'merchant__name')
    raw_id_fields = ('buyer', 'merchant', 'order')


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket', 'sender', 'content', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('content', 'sender__nickname')
    raw_id_fields = ('ticket', 'sender')
