import {
  STORAGE_KEYS,
  emptyCart,
  seedAnnouncements,
  seedCouponTemplates,
  seedDeliverySlots,
  seedMerchants,
  seedProducts,
  seedPromotions,
  seedUsers,
  type AfterSale,
  type Announcement,
  type Cart,
  type CouponRedeemRecord,
  type CouponTemplate,
  type DeliverySlot,
  type Merchant,
  type Order,
  type Product,
  type ProductPromotion,
  type ProductReview,
  type Promotion,
  type Ticket,
  type User,
  type UserCoupon
} from '@community-store/shared';
import { readJSON, writeJSON } from './storage';

const MOCK_DB_VERSION = 10;
const VERSION_KEY = 'community_store_mock_db_version';

function ensureSeed<T>(key: string, seed: T): T {
  const current = readJSON<T | null>(key, null);
  if (current === null) {
    writeJSON(key, seed);
    return seed;
  }
  return current;
}

export function ensureMockDB(): void {
  const storedVersion = readJSON<number>(VERSION_KEY, 0);
  if (storedVersion < MOCK_DB_VERSION) {
    writeJSON(STORAGE_KEYS.merchants, seedMerchants);
    writeJSON(STORAGE_KEYS.products, seedProducts);
    writeJSON(STORAGE_KEYS.users, seedUsers);
    writeJSON(STORAGE_KEYS.coupon_templates, seedCouponTemplates);
    writeJSON(STORAGE_KEYS.user_coupons, []);
    writeJSON(STORAGE_KEYS.coupon_redeem_records, []);
    writeJSON(STORAGE_KEYS.reviews, []);
    writeJSON(STORAGE_KEYS.aftersales, []);
    writeJSON(STORAGE_KEYS.announcements, seedAnnouncements);
    writeJSON(STORAGE_KEYS.promotions, seedPromotions);
    writeJSON(STORAGE_KEYS.tickets, []);
    writeJSON(STORAGE_KEYS.delivery_slots, seedDeliverySlots);
    writeJSON(VERSION_KEY, MOCK_DB_VERSION);
  }

  ensureSeed<Merchant[]>(STORAGE_KEYS.merchants, seedMerchants);
  ensureSeed<Product[]>(STORAGE_KEYS.products, seedProducts);
  ensureSeed<Order[]>(STORAGE_KEYS.orders, []);
  ensureSeed<Cart>(STORAGE_KEYS.cart, {
    ...emptyCart,
    updated_at: new Date().toISOString()
  });
  ensureSeed<User[]>(STORAGE_KEYS.users, seedUsers);
  ensureSeed<CouponTemplate[]>(STORAGE_KEYS.coupon_templates, seedCouponTemplates);
  ensureSeed<UserCoupon[]>(STORAGE_KEYS.user_coupons, []);
  ensureSeed<CouponRedeemRecord[]>(STORAGE_KEYS.coupon_redeem_records, []);
  ensureSeed<ProductReview[]>(STORAGE_KEYS.reviews, []);
  ensureSeed<AfterSale[]>(STORAGE_KEYS.aftersales, []);
  ensureSeed<Announcement[]>(STORAGE_KEYS.announcements, seedAnnouncements);
  ensureSeed<Promotion[]>(STORAGE_KEYS.promotions, seedPromotions);
  ensureSeed<Ticket[]>(STORAGE_KEYS.tickets, []);
  ensureSeed<DeliverySlot[]>(STORAGE_KEYS.delivery_slots, seedDeliverySlots);
}

export function readDeliverySlots(): DeliverySlot[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.delivery_slots, seedDeliverySlots);
}

export function writeDeliverySlots(value: DeliverySlot[]): void {
  writeJSON(STORAGE_KEYS.delivery_slots, value);
}

export function readMerchants(): Merchant[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.merchants, seedMerchants);
}

export function writeMerchants(value: Merchant[]): void {
  writeJSON(STORAGE_KEYS.merchants, value);
}

export function readProducts(): Product[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.products, seedProducts);
}

export function writeProducts(value: Product[]): void {
  writeJSON(STORAGE_KEYS.products, value);
}

export function readOrders(): Order[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.orders, []);
}

export function writeOrders(value: Order[]): void {
  writeJSON(STORAGE_KEYS.orders, value);
}

export function readCart(): Cart {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.cart, {
    ...emptyCart,
    updated_at: new Date().toISOString()
  });
}

export function writeCart(value: Cart): void {
  writeJSON(STORAGE_KEYS.cart, value);
}

export function readUsers(): User[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.users, seedUsers);
}

export function readCouponTemplates(): CouponTemplate[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.coupon_templates, seedCouponTemplates);
}

export function writeCouponTemplates(value: CouponTemplate[]): void {
  writeJSON(STORAGE_KEYS.coupon_templates, value);
}

export function readUserCoupons(): UserCoupon[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.user_coupons, []);
}

export function writeUserCoupons(value: UserCoupon[]): void {
  writeJSON(STORAGE_KEYS.user_coupons, value);
}

export function readCouponRedeemRecords(): CouponRedeemRecord[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.coupon_redeem_records, []);
}

export function writeCouponRedeemRecords(value: CouponRedeemRecord[]): void {
  writeJSON(STORAGE_KEYS.coupon_redeem_records, value);
}

export function readReviews(): ProductReview[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.reviews, []);
}

export function writeReviews(value: ProductReview[]): void {
  writeJSON(STORAGE_KEYS.reviews, value);
}

export function readAfterSales(): AfterSale[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.aftersales, []);
}

export function writeAfterSales(value: AfterSale[]): void {
  writeJSON(STORAGE_KEYS.aftersales, value);
}

export function readAnnouncements(): Announcement[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.announcements, seedAnnouncements);
}

export function writeAnnouncements(value: Announcement[]): void {
  writeJSON(STORAGE_KEYS.announcements, value);
}

export function readPromotions(): Promotion[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.promotions, seedPromotions);
}

export function writePromotions(value: Promotion[]): void {
  writeJSON(STORAGE_KEYS.promotions, value);
}

export function readTickets(): Ticket[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.tickets, []);
}

export function writeTickets(value: Ticket[]): void {
  writeJSON(STORAGE_KEYS.tickets, value);
}

export function getActivePromotionForProduct(productId: number, now: Date = new Date()): ProductPromotion | null {
  const promotions = readPromotions();
  for (const promotion of promotions) {
    const startAt = new Date(promotion.start_at);
    const endAt = new Date(promotion.end_at);
    if (now < startAt || now > endAt) continue;

    const item = promotion.items.find((i) => i.product_id === productId);
    if (item) {
      const products = readProducts();
      const product = products.find((p) => p.id === productId);
      return {
        promotion_id: promotion.id,
        promotion_name: promotion.name,
        promo_price: item.promo_price,
        original_price: product?.price ?? item.original_price,
        promo_stock: item.promo_stock,
        start_at: promotion.start_at,
        end_at: promotion.end_at
      };
    }
  }
  return null;
}

export function mergeProductWithPromotion<T extends Product>(product: T): T & { promotion?: ProductPromotion | null } {
  const promotion = getActivePromotionForProduct(product.id);
  return { ...product, promotion };
}
