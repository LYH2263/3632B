from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('merchants', '0002_merchant_supports_pickup_merchant_pickup_fee'),
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Promotion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('description', models.CharField(blank=True, default='', max_length=255)),
                ('start_at', models.DateTimeField()),
                ('end_at', models.DateTimeField()),
                ('status', models.CharField(choices=[('draft', '草稿'), ('active', '进行中'), ('ended', '已结束')], default='draft', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('merchant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='promotions', to='merchants.merchant')),
            ],
            options={
                'db_table': 'promotion',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PromotionItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('promo_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('promo_stock', models.IntegerField(default=-1)),
                ('sold_quantity', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='promotion_items', to='products.product')),
                ('promotion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='promotions.promotion')),
            ],
            options={
                'db_table': 'promotion_item',
                'constraints': [
                    models.UniqueConstraint(fields=['promotion', 'product'], name='unique_promotion_product'),
                ],
            },
        ),
    ]
