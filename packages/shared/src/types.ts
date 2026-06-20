export type UserRole = 'buyer' | 'merchant';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'delivering'
  | 'completed'
  | 'canceled';

export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  merchant_id?: number;
  nickname: string;
  phone?: string;
}

export interface Merchant {
  id: number;
  name: string;
  phone: string;
  address: string;
  delivery_note: string;
  min_order_amount: number;
  delivery_fee: number;
  is_open: boolean;
}

export interface Product {
  id: number;
  merchant_id: number;
  name: string;
  price: number;
  unit: string;
  stock: number;
  is_active: boolean;
  image_url: string;
  description?: string;
}

export interface CartItem {
  product_id: number;
  quantity: number;
}

export interface Cart {
  merchant_id: number | null;
  items: CartItem[];
  updated_at: string;
}

export interface OrderSnapshotItem {
  product_id: number;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_no: string;
  buyer_id: number;
  merchant_id: number;
  status: OrderStatus;
  pay_method: 'offline';
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  remark: string;
  items_amount: number;
  delivery_fee: number;
  discount_amount: number;
  coupon_id?: number;
  total_amount: number;
  items_snapshot: OrderSnapshotItem[];
  created_at: string;
  updated_at: string;
}

export interface CheckoutPayload {
  buyer_id: number;
  merchant_id: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  remark?: string;
  coupon_id?: number;
}

export interface CartValidationResult {
  valid: boolean;
  errors: string[];
  items_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  coupon?: UserCoupon | null;
}

export type CouponType = 'full_reduction';

export type CouponStatus = 'available' | 'used' | 'expired';

export interface CouponTemplate {
  id: number;
  name: string;
  type: CouponType;
  threshold_amount: number;
  discount_amount: number;
  valid_from: string;
  valid_to: string;
  total_quantity: number;
  claimed_quantity: number;
  per_user_limit: number;
  include_delivery_fee: boolean;
  description: string;
}

export interface UserCoupon {
  id: number;
  user_id: number;
  template_id: number;
  status: CouponStatus;
  order_id?: number;
  claimed_at: string;
  used_at?: string;
  template: CouponTemplate;
}

export interface CouponValidationResult {
  valid: boolean;
  errors: string[];
  discount_amount: number;
  final_amount: number;
}

export interface CouponRedeemRecord {
  id: number;
  user_coupon_id: number;
  order_id: number;
  merchant_id: number;
  buyer_id: number;
  discount_amount: number;
  items_amount: number;
  redeemed_at: string;
  template_name: string;
  order_no: string;
  buyer_nickname: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: Omit<User, 'password'>;
}

export interface DataSource {
  listMerchants(): Promise<Merchant[]>;
  getMerchant(merchantId: number): Promise<Merchant | null>;
  updateMerchant(merchantId: number, payload: Partial<Merchant>): Promise<Merchant>;
  listProducts(merchantId: number, keyword?: string): Promise<Product[]>;
  getProduct(productId: number): Promise<Product | null>;
  createProduct(payload: Omit<Product, 'id'>): Promise<Product>;
  updateProduct(productId: number, payload: Partial<Product>): Promise<Product>;
  listOrdersByBuyer(buyerId: number): Promise<Order[]>;
  listOrdersByMerchant(merchantId: number): Promise<Order[]>;
  getOrder(orderId: number): Promise<Order | null>;
  createOrder(payload: CheckoutPayload & { coupon_id?: number }): Promise<Order>;
  updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order>;
  getCart(): Promise<Cart>;
  setCart(cart: Cart): Promise<Cart>;
  clearCart(): Promise<Cart>;
  login(payload: LoginPayload): Promise<LoginResult>;

  listCouponTemplates(): Promise<CouponTemplate[]>;
  claimCoupon(templateId: number): Promise<UserCoupon>;
  listUserCoupons(userId: number, status?: CouponStatus): Promise<UserCoupon[]>;
  validateCoupon(
    couponId: number,
    merchantId: number,
    itemsAmount: number,
    deliveryFee: number
  ): Promise<CouponValidationResult>;
  listAvailableCouponsForCart(
    userId: number,
    merchantId: number,
    itemsAmount: number,
    deliveryFee: number
  ): Promise<UserCoupon[]>;
  listCouponRedeemRecords(merchantId: number): Promise<CouponRedeemRecord[]>;
}
