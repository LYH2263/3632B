from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('merchants', '0003_alter_merchant_min_order_amount'),
    ]

    operations = [
        migrations.CreateModel(
            name='DeliverySlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('capacity', models.IntegerField(default=10)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('merchant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_slots', to='merchants.merchant')),
            ],
            options={
                'db_table': 'delivery_slot',
                'ordering': ['start_time'],
            },
        ),
    ]
