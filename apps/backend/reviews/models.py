from django.db import models


class ProductReview(models.Model):
    order = models.ForeignKey('orders.Order', on_delete=models.PROTECT, related_name='reviews')
    product = models.ForeignKey('products.Product', on_delete=models.PROTECT, related_name='reviews')
    buyer = models.ForeignKey('users.StoreUser', on_delete=models.PROTECT, related_name='reviews')
    merchant = models.ForeignKey('merchants.Merchant', on_delete=models.PROTECT, related_name='reviews')
    rating = models.IntegerField()
    content = models.CharField(max_length=500, blank=True, default='')
    reply = models.CharField(max_length=500, blank=True, default='', null=True)
    reply_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_review'
        unique_together = [['order', 'product']]

    def __str__(self):
        return f"Review #{self.id} - Order {self.order_id} Product {self.product_id} ({self.rating}★)"
