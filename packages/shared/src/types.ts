export type UserRole = 'buyer' | 'merchant';

export type FulfillmentType = 'delivery' | 'pickup';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'delivering'
  | 'pickup_ready'
  | 'completed'
  | 'canceled'
  | 'refunded';

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
  supports_pickup: boolean;
  pickup_fee: number;
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

export interface DeliverySlot {
  id: number;
  merchant_id: number;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliverySlotWithAvailability extends DeliverySlot {
  scheduled_date: string;
  used_count: number;
  available: boolean;
}

export interface Order {
  id: number;
  order_no: string;
  buyer_id: number;
  merchant_id: number;
  status: OrderStatus;
  pay_method: 'offline';
  fulfillment_type: FulfillmentType;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  remark: string;
  scheduled_date?: string | null;
  scheduled_slot?: string | null;
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
  fulfillment_type: FulfillmentType;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  remark?: string;
  coupon_id?: number;
  scheduled_date?: string | null;
  scheduled_slot_id?: number | null;
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

export interface ProductReview {
  id: number;
  order_id: number;
  product_id: number;
  buyer_id: number;
  merchant_id: number;
  rating: number;
  content: string;
  reply?: string | null;
  reply_at?: string | null;
  created_at: string;
  product_name?: string;
  product_image_url?: string;
  buyer_nickname?: string;
  order_no?: string;
}

export interface ProductReviewSummary {
  product_id: number;
  average_rating: number;
  review_count: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}

export interface CreateReviewPayload {
  order_id: number;
  product_id: number;
  rating: number;
  content: string;
}

export interface ReplyReviewPayload {
  review_id: number;
  reply: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: Omit<User, 'password'>;
}

export type AfterSaleReason = 'quality' | 'wrong' | 'damaged' | 'not_received' | 'other';

export type AfterSaleStatus = 'pending' | 'approved' | 'rejected';

export type AfterSaleRejectReason = 'evidence_insufficient' | 'wrong_procedure' | 'timeout' | 'other';

export interface AfterSale {
  id: number;
  order_id: number;
  buyer_id: number;
  merchant_id: number;
  order_no: string;
  order_status: OrderStatus;
  reason: AfterSaleReason;
  description: string;
  status: AfterSaleStatus;
  reject_reason: string;
  reject_remark: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAfterSalePayload {
  order_id: number;
  reason: AfterSaleReason;
  description?: string;
}

export interface ReviewAfterSalePayload {
  aftersale_id: number;
  action: 'approve' | 'reject';
  reject_reason?: AfterSaleRejectReason;
  reject_remark?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  valid_from: string;
  valid_to: string;
  is_pinned: boolean;
  created_at: string;
}

export type MemberLevel = 'L1' | 'L2' | 'L3';

export type PointSource = 'order_complete' | 'admin_adjust' | 'deduct';

export interface BuyerProfile {
  id: number;
  buyer_id: number;
  nickname: string;
  points: number;
  total_earned: number;
  deductible_points: number;
  level: MemberLevel;
  created_at: string;
  updated_at: string;
}

export interface PointLog {
  id: number;
  buyer_id: number;
  change: number;
  balance_after: number;
  source: PointSource;
  source_id: number;
  created_at: string;
}

export type PromotionStatus = 'draft' | 'active' | 'ended';

export interface PromotionItem {
  id: number;
  product_id: number;
  product_name: string;
  original_price: number;
  promo_price: number;
  promo_stock: number;
  sold_quantity: number;
}

export interface Promotion {
  id: number;
  merchant_id: number;
  name: string;
  description: string;
  start_at: string;
  end_at: string;
  status: PromotionStatus;
  items: PromotionItem[];
  created_at: string;
  updated_at: string;
}

export interface ProductPromotion {
  promotion_id: number;
  promotion_name: string;
  promo_price: number;
  original_price: number;
  promo_stock: number;
  start_at: string;
  end_at: string;
}

export interface ProductWithPromotion extends Product {
  promotion?: ProductPromotion | null;
}

export interface OrderSnapshotItem {
  product_id: number;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  subtotal: number;
  promotion_id?: number | null;
  promo_price?: number | null;
  original_price?: number | null;
}

export interface CreatePromotionPayload {
  merchant_id: number;
  name: string;
  description?: string;
  start_at: string;
  end_at: string;
  items: Array<{
    product_id: number;
    promo_price: number;
    promo_stock?: number;
  }>;
}

export interface UpdatePromotionPayload {
  name?: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  items?: Array<{
    product_id: number;
    promo_price: number;
    promo_stock?: number;
  }>;
}

export interface DataSource {
  listMerchants(): Promise<Merchant[]>;
  getMerchant(merchantId: number): Promise<Merchant | null>;
  updateMerchant(merchantId: number, payload: Partial<Merchant>): Promise<Merchant>;
  listProducts(merchantId: number, keyword?: string): Promise<ProductWithPromotion[]>;
  getProduct(productId: number): Promise<ProductWithPromotion | null>;
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

  createReview(payload: CreateReviewPayload): Promise<ProductReview>;
  listReviewsByProduct(productId: number): Promise<{ reviews: ProductReview[]; summary: ProductReviewSummary }>;
  listReviewsByMerchant(merchantId: number): Promise<ProductReview[]>;
  replyReview(payload: ReplyReviewPayload): Promise<ProductReview>;
  getPendingReviewsByOrder(orderId: number): Promise<{ product_id: number; name: string; image_url: string; unit: string; price: number; quantity: number }[]>;

  createAfterSale(payload: CreateAfterSalePayload): Promise<AfterSale>;
  listAfterSalesByBuyer(buyerId: number): Promise<AfterSale[]>;
  listAfterSalesByMerchant(merchantId: number): Promise<AfterSale[]>;

  listAnnouncements(): Promise<Announcement[]>;
  getAnnouncement(announcementId: number): Promise<Announcement | null>;

  getBuyerProfile(): Promise<BuyerProfile>;
  listPointLogs(): Promise<PointLog[]>;

  listPromotions(merchantId: number, status?: PromotionStatus): Promise<Promotion[]>;
  getPromotion(promotionId: number): Promise<Promotion | null>;
  createPromotion(payload: CreatePromotionPayload): Promise<Promotion>;
  updatePromotion(promotionId: number, payload: UpdatePromotionPayload): Promise<Promotion>;
  deletePromotion(promotionId: number): Promise<void>;
  getProductPromotion(productId: number): Promise<ProductPromotion | null>;

  createTicket(payload: CreateTicketPayload): Promise<Ticket>;
  listTicketsByBuyer(buyerId: number, page?: number, pageSize?: number): Promise<TicketListResult>;
  listTicketsByMerchant(merchantId: number, page?: number, pageSize?: number): Promise<TicketListResult>;
  getTicket(ticketId: number): Promise<Ticket | null>;
  updateTicketStatus(ticketId: number, status: TicketStatus): Promise<Ticket>;
  createTicketMessage(payload: CreateTicketMessagePayload): Promise<TicketMessage>;

  listDeliverySlots(merchantId: number): Promise<DeliverySlot[]>;
  createDeliverySlot(merchantId: number, payload: Omit<DeliverySlot, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>): Promise<DeliverySlot>;
  updateDeliverySlot(slotId: number, payload: Partial<Omit<DeliverySlot, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>>): Promise<DeliverySlot>;
  deleteDeliverySlot(slotId: number): Promise<void>;
  listAvailableDeliverySlots(merchantId: number, date: string): Promise<DeliverySlotWithAvailability[]>;
}

export type TicketType = 'delivery' | 'product' | 'other';

export type TicketStatus = 'open' | 'processing' | 'resolved' | 'closed';

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_nickname: string;
  sender_role: 'buyer' | 'merchant';
  content: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  buyer_id: number;
  buyer_nickname: string;
  merchant_id: number;
  merchant_name: string;
  order_id?: number | null;
  order_no?: string | null;
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  messages: TicketMessage[];
  created_at: string;
  updated_at: string;
}

export interface TicketListItem {
  id: number;
  buyer_id: number;
  buyer_nickname: string;
  merchant_id: number;
  merchant_name: string;
  order_id?: number | null;
  order_no?: string | null;
  type: TicketType;
  title: string;
  status: TicketStatus;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface TicketListResult {
  results: TicketListItem[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateTicketPayload {
  merchant_id: number;
  order_id?: number | null;
  type: TicketType;
  title: string;
  description: string;
}

export interface CreateTicketMessagePayload {
  ticket_id: number;
  content: string;
}
