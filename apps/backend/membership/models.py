import math
from django.db import models
from django.db.models import F


LEVEL_THRESHOLDS = [
    (0, 'L1'),
    (100, 'L2'),
    (500, 'L3'),
]


def compute_level(points: int) -> str:
    level = 'L1'
    for threshold, name in LEVEL_THRESHOLDS:
        if points >= threshold:
            level = name
    return level


class BuyerProfile(models.Model):
    buyer = models.OneToOneField(
        'users.StoreUser',
        on_delete=models.CASCADE,
        related_name='buyer_profile'
    )
    points = models.PositiveIntegerField(default=0)
    total_earned = models.PositiveIntegerField(default=0)
    deductible_points = models.PositiveIntegerField(default=0)
    level = models.CharField(max_length=10, default='L1')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'buyer_profile'

    def __str__(self):
        return f'{self.buyer.username} - {self.level} ({self.points})'

    @classmethod
    def add_points(cls, buyer_id: int, points: int, source: str, source_id: int) -> 'BuyerProfile':
        profile, _ = cls.objects.select_for_update().get_or_create(
            buyer_id=buyer_id,
            defaults={'points': 0, 'total_earned': 0, 'deductible_points': 0, 'level': 'L1'}
        )
        cls.objects.filter(pk=profile.pk).update(
            points=F('points') + points,
            total_earned=F('total_earned') + points
        )
        profile.refresh_from_db()
        new_level = compute_level(profile.points)
        if new_level != profile.level:
            cls.objects.filter(pk=profile.pk).update(level=new_level)
            profile.level = new_level

        PointLog.objects.create(
            buyer_id=buyer_id,
            change=points,
            balance_after=profile.points,
            source=source,
            source_id=source_id
        )
        return profile


class PointLog(models.Model):
    SOURCE_CHOICES = (
        ('order_complete', 'order_complete'),
        ('admin_adjust', 'admin_adjust'),
        ('deduct', 'deduct'),
    )

    buyer = models.ForeignKey(
        'users.StoreUser',
        on_delete=models.CASCADE,
        related_name='point_logs'
    )
    change = models.IntegerField()
    balance_after = models.PositiveIntegerField()
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES)
    source_id = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'point_log'
        ordering = ['-created_at']
