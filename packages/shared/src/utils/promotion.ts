import type { Product, ProductPromotion } from '../types';

export function isPromotionActive(promotion: { start_at: string; end_at: string }, now: Date = new Date()): boolean {
  const startAt = new Date(promotion.start_at);
  const endAt = new Date(promotion.end_at);
  return now >= startAt && now <= endAt;
}

export function getEffectivePrice(
  product: Product,
  promotion: ProductPromotion | null | undefined,
  now: Date = new Date()
): number {
  if (promotion && isPromotionActive(promotion, now)) {
    return promotion.promo_price;
  }
  return product.price;
}

export function getDisplayPrice(
  product: Product,
  promotion: ProductPromotion | null | undefined
): { price: number; originalPrice?: number; hasPromotion: boolean } {
  if (promotion && promotion.promo_price < product.price) {
    return {
      price: promotion.promo_price,
      originalPrice: product.price,
      hasPromotion: true
    };
  }
  return {
    price: product.price,
    hasPromotion: false
  };
}

export function calculatePromoDiscount(promotion: ProductPromotion): number {
  return Math.max(0, promotion.original_price - promotion.promo_price);
}

export function formatPromotionTimeRange(promotion: { start_at: string; end_at: string }): string {
  const start = new Date(promotion.start_at);
  const end = new Date(promotion.end_at);
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${formatDate(start)} 至 ${formatDate(end)}`;
}

export function getPromotionStatusText(status: 'draft' | 'active' | 'ended'): string {
  const map: Record<string, string> = {
    draft: '未开始',
    active: '进行中',
    ended: '已结束'
  };
  return map[status] || status;
}

export function getRemainingPromoStock(promotion: ProductPromotion): number {
  if (promotion.promo_stock === -1) {
    return -1;
  }
  return promotion.promo_stock;
}

export function mergeProductWithPromotion(
  product: Product,
  promotion: ProductPromotion | null
): Product & { promotion?: ProductPromotion | null } {
  if (promotion && isPromotionActive(promotion)) {
    return { ...product, promotion };
  }
  return { ...product, promotion: null };
}
