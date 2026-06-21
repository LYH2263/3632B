from django.db import models


class Merchant(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255)
    delivery_note = models.CharField(max_length=255)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_open = models.BooleanField(default=True)
    supports_pickup = models.BooleanField(default=True)
    pickup_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'merchant'

    def __str__(self):
        return self.name


class DeliverySlot(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='delivery_slots')
    start_time = models.TimeField()
    end_time = models.TimeField()
    capacity = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'delivery_slot'
        ordering = ['start_time']

    def __str__(self):
        return f"{self.merchant.name} {self.start_time}-{self.end_time}"
