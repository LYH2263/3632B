from django.db import models
from django.db.models import Q
from django.utils import timezone


class Promotion(models.Model):
    STATUS_CHOICES = (
        ('draft', '草稿'),
        ('active', '进行中'),
        ('ended', '已结束'),
    )

    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.CASCADE, related_name='promotions')
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True, default='')
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'promotion'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def update_status(self):
        now = timezone.now()
        if now < self.start_at:
            self.status = 'draft'
        elif self.start_at <= now <= self.end_at:
            self.status = 'active'
        else:
            self.status = 'ended'
        self.save(update_fields=['status', 'updated_at'])

    @staticmethod
    def get_active_promotion_for_product(product_id: int, at_time=None):
        at_time = at_time or timezone.now()
        return PromotionItem.objects.select_related('promotion').filter(
            product_id=product_id,
            promotion__start_at__lte=at_time,
            promotion__end_at__gte=at_time,
            promotion__status='active'
        ).order_by('-promotion__created_at').first()


class PromotionItem(models.Model):
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='promotion_items')
    promo_price = models.DecimalField(max_digits=10, decimal_places=2)
    promo_stock = models.IntegerField(default=-1)
    sold_quantity = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'promotion_item'
        constraints = [
            models.UniqueConstraint(
                fields=['promotion', 'product'],
                name='unique_promotion_product'
            )
        ]

    def __str__(self):
        return f"{self.promotion.name} - {self.product.name}"

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.promo_price <= 0:
            raise ValidationError('活动价必须大于0')

        if self.promo_stock < -1:
            raise ValidationError('活动库存不能小于-1')

        overlapping = PromotionItem.objects.select_related('promotion').filter(
            product_id=self.product_id,
            promotion__start_at__lte=self.promotion.end_at,
            promotion__end_at__gte=self.promotion.start_at,
            promotion__status__in=['draft', 'active']
        ).exclude(promotion_id=self.promotion_id)

        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)

        if overlapping.exists():
            raise ValidationError(f"商品 {self.product.name} 在同一时间段已有活动")
