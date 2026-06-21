from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('merchants', '0004_deliveryslot'),
        ('orders', '0003_order_fulfillment_type_pickup_ready'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='scheduled_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='scheduled_slot',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='orders',
                to='merchants.deliveryslot'
            ),
        ),
    ]
