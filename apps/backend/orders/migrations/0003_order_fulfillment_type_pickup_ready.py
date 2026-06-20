from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_order_coupon_order_discount_amount_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='fulfillment_type',
            field=models.CharField(choices=[('delivery', 'delivery'), ('pickup', 'pickup')], default='delivery', max_length=20),
        ),
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(choices=[('pending', 'pending'), ('confirmed', 'confirmed'), ('delivering', 'delivering'), ('pickup_ready', 'pickup_ready'), ('completed', 'completed'), ('canceled', 'canceled'), ('refunded', 'refunded')], default='pending', max_length=20),
        ),
    ]
