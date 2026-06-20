from decimal import Decimal
from django.utils import timezone
from .models import Promotion, PromotionItem


def get_active_promotion_for_product(product_id: int, at_time=None):
    at_time = at_time or timezone.now()
    item = PromotionItem.objects.select_related('promotion', 'product').filter(
        product_id=product_id,
        promotion__start_at__lte=at_time,
        promotion__end_at__gte=at_time,
        promotion__status='active'
    ).order_by('-promotion__created_at').first()

    if item is None:
        return None

    return {
        'promotion_id': item.promotion_id,
        'promotion_name': item.promotion.name,
        'promo_price': float(item.promo_price),
        'original_price': float(item.product.price),
        'promo_stock': item.promo_stock,
        'start_at': item.promotion.start_at,
        'end_at': item.promotion.end_at
    }


def calculate_effective_price(product_id: int, original_price: Decimal, at_time=None) -> tuple[Decimal, dict | None]:
    promotion = get_active_promotion_for_product(product_id, at_time)
    if promotion:
        return Decimal(str(promotion['promo_price'])), promotion
    return original_price, None


def check_promotion_stock(promotion_item_id: int, quantity: int) -> tuple[bool, str]:
    item = PromotionItem.objects.filter(id=promotion_item_id).first()
    if item is None:
        return False, '活动商品不存在'

    if item.promo_stock != -1:
        remaining = item.promo_stock - item.sold_quantity
        if quantity > remaining:
            return False, f'活动库存不足，剩余 {remaining} 件'

    return True, ''


def increment_sold_quantity(promotion_item_id: int, quantity: int):
    item = PromotionItem.objects.select_for_update().filter(id=promotion_item_id).first()
    if item:
        item.sold_quantity += quantity
        item.save(update_fields=['sold_quantity'])
