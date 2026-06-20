from django.db import models


class AfterSaleOrder(models.Model):
    REASON_CHOICES = (
        ('quality', '商品质量问题'),
        ('wrong', '发错商品'),
        ('damaged', '商品破损'),
        ('not_received', '未收到货'),
        ('other', '其他原因')
    )

    STATUS_CHOICES = (
        ('pending', 'pending'),
        ('approved', 'approved'),
        ('rejected', 'rejected')
    )

    REJECT_REASON_CHOICES = (
        ('evidence_insufficient', '证据不足'),
        ('wrong_procedure', '流程不符'),
        ('timeout', '超出申请时限'),
        ('other', '其他原因')
    )

    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='aftersales')
    buyer = models.ForeignKey('users.StoreUser', on_delete=models.PROTECT, related_name='aftersales')
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.PROTECT, related_name='aftersales')
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.CharField(max_length=500, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reject_reason = models.CharField(max_length=30, choices=REJECT_REASON_CHOICES, blank=True, default='')
    reject_remark = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'aftersale_order'
        ordering = ['-created_at']

    def __str__(self):
        return f"AfterSale #{self.id} - Order {self.order_id} ({self.status})"
