import {
  STORAGE_KEYS,
  emptyCart,
  seedCouponTemplates,
  seedMerchants,
  seedProducts,
  seedUsers,
  type Cart,
  type CouponRedeemRecord,
  type CouponTemplate,
  type Merchant,
  type Order,
  type Product,
  type ProductReview,
  type User,
  type UserCoupon
} from '@community-store/shared';
import { readJSON, writeJSON } from './storage';

const MOCK_DB_VERSION = 4;
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
