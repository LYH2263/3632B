from django.db import models


class Ticket(models.Model):
    TYPE_CHOICES = (
        ('delivery', '配送问题'),
        ('product', '商品问题'),
        ('other', '其他问题')
    )

    STATUS_CHOICES = (
        ('open', '待处理'),
        ('processing', '处理中'),
        ('resolved', '已解决'),
        ('closed', '已关闭')
    )

    buyer = models.ForeignKey('users.StoreUser', on_delete=models.PROTECT, related_name='tickets')
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.PROTECT, related_name='tickets')
    order = models.ForeignKey(
        'orders.Order',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tickets'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=1000)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ticket'
        ordering = ['-created_at']

    def __str__(self):
        return f"Ticket #{self.id} - {self.title} ({self.status})"


class TicketMessage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('users.StoreUser', on_delete=models.PROTECT, related_name='ticket_messages')
    content = models.CharField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_message'
        ordering = ['created_at']

    def __str__(self):
        return f"Message #{self.id} - Ticket {self.ticket_id}"
