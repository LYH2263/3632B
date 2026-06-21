from decimal import Decimal
from django.db import models, transaction

from users.models import StoreUser


class Wallet(models.Model):
    user = models.OneToOneField(
        StoreUser,
        on_delete=models.PROTECT,
        related_name='wallet'
    )
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'wallet'

    def __str__(self):
        return f'Wallet({self.user_id}, {self.balance})'

    @classmethod
    def get_or_create_for_user(cls, user_id: int) -> 'Wallet':
        wallet, _ = cls.objects.get_or_create(user_id=user_id)
        return wallet

    @classmethod
    def topup(cls, user_id: int, amount: Decimal, operator_id: int, remark: str = '') -> 'WalletTransaction':
        with transaction.atomic():
            wallet = cls.objects.select_for_update().get(user_id=user_id)
            wallet.balance += amount
            wallet.save(update_fields=['balance', 'updated_at'])
            txn = WalletTransaction.objects.create(
                wallet=wallet,
                type='topup',
                amount=amount,
                balance_after=wallet.balance,
                operator_id=operator_id,
                remark=remark or '线下充值'
            )
            return txn

    @classmethod
    def deduct(cls, user_id: int, amount: Decimal, order_id: int, remark: str = '') -> 'WalletTransaction':
        with transaction.atomic():
            wallet = cls.objects.select_for_update().get(user_id=user_id)
            if wallet.balance < amount:
                raise InsufficientBalanceError('余额不足')
            wallet.balance -= amount
            wallet.save(update_fields=['balance', 'updated_at'])
            txn = WalletTransaction.objects.create(
                wallet=wallet,
                type='payment',
                amount=amount,
                balance_after=wallet.balance,
                order_id=order_id,
                remark=remark or '订单支付'
            )
            return txn

    @classmethod
    def refund(cls, user_id: int, amount: Decimal, order_id: int, remark: str = '') -> 'WalletTransaction':
        with transaction.atomic():
            wallet = cls.objects.select_for_update().get(user_id=user_id)
            wallet.balance += amount
            wallet.save(update_fields=['balance', 'updated_at'])
            txn = WalletTransaction.objects.create(
                wallet=wallet,
                type='refund',
                amount=amount,
                balance_after=wallet.balance,
                order_id=order_id,
                remark=remark or '订单取消退款'
            )
            return txn


class InsufficientBalanceError(Exception):
    pass


class WalletTransaction(models.Model):
    TYPE_CHOICES = (
        ('topup', 'topup'),
        ('payment', 'payment'),
        ('refund', 'refund')
    )

    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    order_id = models.IntegerField(null=True, blank=True)
    operator_id = models.IntegerField(null=True, blank=True)
    remark = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wallet_transaction'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.type} {self.amount}'
