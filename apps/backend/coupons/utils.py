from decimal import Decimal
from django.utils import timezone

from .models import UserCoupon


def validate_coupon_usage(
    user_coupon: UserCoupon,
    items_amount: Decimal,
    delivery_fee: Decimal,
    now=None
) -> tuple[bool, list[str], Decimal]:
    if now is None:
        now = timezone.now()

    errors: list[str] = []
    template = user_coupon.template

    if user_coupon.status != 'available':
        errors.append('优惠券不可用')
        return False, errors, Decimal('0')

    if template.valid_from > now:
        errors.append('优惠券尚未生效')
        return False, errors, Decimal('0')

    if template.valid_to < now:
        errors.append('优惠券已过期')
        return False, errors, Decimal('0')

    threshold_amount = Decimal(str(template.threshold_amount))
    if template.include_delivery_fee:
        total_for_threshold = items_amount + delivery_fee
    else:
        total_for_threshold = items_amount

    if total_for_threshold < threshold_amount:
        threshold_label = '含配送费' if template.include_delivery_fee else '不含配送费'
        errors.append(
            f'满{threshold_amount}元可用({threshold_label})，'
            f'当前{total_for_threshold}元'
        )
        return False, errors, Decimal('0')

    discount_amount = Decimal(str(template.discount_amount))
    if discount_amount > items_amount:
        discount_amount = items_amount

    return True, [], discount_amount
