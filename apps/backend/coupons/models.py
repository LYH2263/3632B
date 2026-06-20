from django.db import models


class CouponTemplate(models.Model):
    TYPE_CHOICES = (
        ('full_reduction', '满减券'),
    )

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='full_reduction')
    threshold_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    total_quantity = models.IntegerField(default=0)
    claimed_quantity = models.IntegerField(default=0)
    per_user_limit = models.IntegerField(default=1)
    include_delivery_fee = models.BooleanField(default=False)
    description = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coupon_template'

    def __str__(self):
        return self.name


class UserCoupon(models.Model):
    STATUS_CHOICES = (
        ('available', '可使用'),
        ('used', '已使用'),
        ('expired', '已过期'),
    )

    user = models.ForeignKey('users.StoreUser', on_delete=models.PROTECT, related_name='coupons')
    template = models.ForeignKey(CouponTemplate, on_delete=models.PROTECT, related_name='user_coupons')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    order = models.ForeignKey(
        'orders.Order',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='used_coupons'
    )
    claimed_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_coupon'

    def __str__(self):
        return f"{self.user.username} - {self.template.name}"


class CouponRedeemRecord(models.Model):
    user_coupon = models.ForeignKey(UserCoupon, on_delete=models.PROTECT, related_name='redeem_records')
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='coupon_redeem_records')
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.PROTECT, related_name='coupon_redeem_records')
    buyer = models.ForeignKey('users.StoreUser', on_delete=models.PROTECT, related_name='coupon_redeem_records')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    items_amount = models.DecimalField(max_digits=10, decimal_places=2)
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coupon_redeem_record'

    def __str__(self):
        return f"核销记录 - 订单 {self.order.order_no}"
