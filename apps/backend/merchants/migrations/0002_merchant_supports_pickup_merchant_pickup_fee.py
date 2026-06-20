from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('merchants', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='merchant',
            name='supports_pickup',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='merchant',
            name='pickup_fee',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
