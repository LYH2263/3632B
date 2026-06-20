from django.db import models
from django.db import transaction
from django.utils import timezone


class StockLedger(models.Model):
    REASON_CHOICES = (
        ('order_deduct', '下单扣减'),
        ('merchant_adjust', '商家改库存'),
        ('batch_online', '批量上架'),
        ('batch_offline', '批量下架'),
        ('order_cancel', '订单取消回补'),
    )

    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='stock_ledgers')
    change_quantity = models.IntegerField()
    stock_before = models.IntegerField()
    stock_after = models.IntegerField()
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    operator = models.ForeignKey('users.StoreUser', on_delete=models.PROTECT, related_name='stock_ledgers')
    order = models.ForeignKey(
        'orders.Order',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='stock_ledgers'
    )
    operated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'stock_ledger'
        ordering = ['-operated_at']
        indexes = [
            models.Index(fields=['product_id', '-operated_at']),
            models.Index(fields=['reason']),
        ]

    def __str__(self):
        return f'{self.product_id} {self.get_reason_display()} {self.change_quantity:+d}'


class Product(models.Model):
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=120)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20)
    stock = models.IntegerField(default=-1)
    is_active = models.BooleanField(default=True)
    image_url = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product'

    def __str__(self):
        return self.name

    @transaction.atomic
    def adjust_stock(self, change_quantity: int, reason: str, operator, order=None) -> 'StockLedger':
        from django.db.models import F

        stock_before = self.stock
        if stock_before == -1:
            stock_after = -1
        else:
            stock_after = stock_before + change_quantity
            if stock_after < 0:
                raise ValueError(f'库存不足：{self.name} 剩余 {stock_before}，需要 {abs(change_quantity)}')

        if stock_before != -1:
            Product.objects.filter(pk=self.pk).update(stock=F('stock') + change_quantity)
            self.stock = stock_after

        ledger = StockLedger.objects.create(
            product=self,
            change_quantity=change_quantity,
            stock_before=stock_before,
            stock_after=stock_after,
            reason=reason,
            operator=operator,
            order=order,
        )
        return ledger
