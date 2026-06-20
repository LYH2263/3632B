from django.db import models


class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'pending'),
        ('confirmed', 'confirmed'),
        ('delivering', 'delivering'),
        ('pickup_ready', 'pickup_ready'),
        ('completed', 'completed'),
        ('canceled', 'canceled'),
        ('refunded', 'refunded')
    )

    FULFILLMENT_TYPE_CHOICES = (
        ('delivery', 'delivery'),
        ('pickup', 'pickup')
    )

    buyer = models.ForeignKey('users.StoreUser', on_delete=models.PROTECT, related_name='orders')
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.PROTECT, related_name='orders')
    order_no = models.CharField(max_length=40, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    pay_method = models.CharField(max_length=20, default='offline')
    fulfillment_type = models.CharField(max_length=20, choices=FULFILLMENT_TYPE_CHOICES, default='delivery')
    receiver_name = models.CharField(max_length=50)
    receiver_phone = models.CharField(max_length=20)
    receiver_address = models.CharField(max_length=255)
    remark = models.CharField(max_length=255, blank=True, default='')
    items_amount = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    coupon = models.ForeignKey(
        'coupons.UserCoupon',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='orders'
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    items_snapshot = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'order_info'

    def __str__(self):
        return self.order_no
