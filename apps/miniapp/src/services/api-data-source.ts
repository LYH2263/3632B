import {
  emptyCart,
  type AfterSale,
  type Announcement,
  type BuyerProfile,
  type Cart,
  type CheckoutPayload,
  type CouponRedeemRecord,
  type CouponTemplate,
  type CouponValidationResult,
  type CreateAfterSalePayload,
  type CreatePromotionPayload,
  type CreateReviewPayload,
  type CreateTicketPayload,
  type CreateTicketMessagePayload,
  type DataSource,
  type DeliverySlot,
  type DeliverySlotWithAvailability,
  type LoginPayload,
  type LoginResult,
  type Merchant,
  type Order,
  type OrderStatus,
  type PayMethod,
  type PointLog,
  type Product,
  type ProductPromotion,
  type ProductReview,
  type ProductReviewSummary,
  type Promotion,
  type PromotionStatus,
  type ReplyReviewPayload,
  type Ticket,
  type TicketListResult,
  type TicketStatus,
  type UpdatePromotionPayload,
  type UserCoupon,
  type CouponStatus,
  type WalletInfo,
  type WalletTransaction
} from '@community-store/shared';
import { readJSON, writeJSON } from '../data/storage';
import { request } from './http';

const API_CART_KEY = 'community_store_api_cart';

function readApiCart(): Cart {
  return readJSON<Cart>(API_CART_KEY, {
    ...emptyCart,
    updated_at: new Date().toISOString()
  });
}

function writeApiCart(cart: Cart): void {
  writeJSON(API_CART_KEY, cart);
}

export class ApiDataSource implements DataSource {
  async listMerchants(): Promise<Merchant[]> {
    return request<Merchant[]>('/merchants');
  }

  async getMerchant(merchantId: number): Promise<Merchant | null> {
    const merchants = await this.listMerchants();
    return merchants.find((item) => item.id === merchantId) ?? null;
  }

  async updateMerchant(
    merchantId: number,
    payload: Partial<Merchant>
  ): Promise<Merchant> {
    return request<Merchant>(`/merchants/${merchantId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async listProducts(merchantId: number, keyword?: string): Promise<Product[]> {
    const search = new URLSearchParams();
    search.set('merchant_id', String(merchantId));
    if (keyword) {
      search.set('keyword', keyword);
    }
    return request<Product[]>(`/products?${search.toString()}`);
  }

  async getProduct(productId: number): Promise<Product | null> {
    return request<Product | null>(`/products/${productId}`);
  }

  async createProduct(payload: Omit<Product, 'id'>): Promise<Product> {
    return request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateProduct(
    productId: number,
    payload: Partial<Product>
  ): Promise<Product> {
    return request<Product>(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async listOrdersByBuyer(buyerId: number): Promise<Order[]> {
    return request<Order[]>(`/orders?buyer_id=${buyerId}`);
  }

  async listOrdersByMerchant(merchantId: number): Promise<Order[]> {
    return request<Order[]>(`/orders?merchant_id=${merchantId}`);
  }

  async getOrder(orderId: number): Promise<Order | null> {
    return request<Order | null>(`/orders/${orderId}`);
  }

  async createOrder(payload: CheckoutPayload & { coupon_id?: number }): Promise<Order> {
    const cart = readApiCart();
    const order = await request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        cart_items: cart.items,
        coupon_id: payload.coupon_id,
        pay_method: payload.pay_method
      })
    });
    await this.clearCart();
    return order;
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    return request<Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async getCart(): Promise<Cart> {
    return readApiCart();
  }

  async setCart(cart: Cart): Promise<Cart> {
    const normalized: Cart = {
      ...cart,
      updated_at: new Date().toISOString()
    };
    writeApiCart(normalized);
    return normalized;
  }

  async clearCart(): Promise<Cart> {
    const normalized: Cart = {
      ...emptyCart,
      updated_at: new Date().toISOString()
    };
    writeApiCart(normalized);
    return normalized;
  }

  async login(payload: LoginPayload): Promise<LoginResult> {
    return request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async listCouponTemplates(): Promise<CouponTemplate[]> {
    return request<CouponTemplate[]>('/coupon/templates');
  }

  async claimCoupon(templateId: number): Promise<UserCoupon> {
    return request<UserCoupon>('/coupon/claim', {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId })
    });
  }

  async listUserCoupons(userId: number, status?: CouponStatus): Promise<UserCoupon[]> {
    const params = new URLSearchParams();
    if (status) {
      params.set('status', status);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<UserCoupon[]>(`/coupon/my${query}`);
  }

  async validateCoupon(
    couponId: number,
    merchantId: number,
    itemsAmount: number,
    deliveryFee: number
  ): Promise<CouponValidationResult> {
    return request<CouponValidationResult>('/coupon/validate', {
      method: 'POST',
      body: JSON.stringify({
        coupon_id: couponId,
        merchant_id: merchantId,
        items_amount: itemsAmount,
        delivery_fee: deliveryFee
      })
    });
  }

  async listAvailableCouponsForCart(
    userId: number,
    merchantId: number,
    itemsAmount: number,
    deliveryFee: number
  ): Promise<UserCoupon[]> {
    const params = new URLSearchParams();
    params.set('merchant_id', String(merchantId));
    params.set('items_amount', String(itemsAmount));
    params.set('delivery_fee', String(deliveryFee));
    return request<UserCoupon[]>(`/coupon/available?${params.toString()}`);
  }

  async listCouponRedeemRecords(merchantId: number): Promise<CouponRedeemRecord[]> {
    return request<CouponRedeemRecord[]>(`/coupon/redeem-records?merchant_id=${merchantId}`);
  }

  async createReview(payload: CreateReviewPayload): Promise<ProductReview> {
    return request<ProductReview>('/reviews/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async listReviewsByProduct(
    productId: number
  ): Promise<{ reviews: ProductReview[]; summary: ProductReviewSummary }> {
    return request<{ reviews: ProductReview[]; summary: ProductReviewSummary }>(
      `/reviews?product_id=${productId}`
    );
  }

  async listReviewsByMerchant(merchantId: number): Promise<ProductReview[]> {
    return request<ProductReview[]>(`/reviews?merchant_id=${merchantId}`);
  }

  async replyReview(payload: ReplyReviewPayload): Promise<ProductReview> {
    return request<ProductReview>('/reviews/reply', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getPendingReviewsByOrder(
    orderId: number
  ): Promise<
    { product_id: number; name: string; image_url: string; unit: string; price: number; quantity: number }[]
  > {
    return request<
      { product_id: number; name: string; image_url: string; unit: string; price: number; quantity: number }[]
    >(`/reviews/pending?order_id=${orderId}`);
  }

  async createAfterSale(payload: CreateAfterSalePayload): Promise<AfterSale> {
    return request<AfterSale>('/aftersales/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async listAfterSalesByBuyer(buyerId: number): Promise<AfterSale[]> {
    return request<AfterSale[]>(`/aftersales?buyer_id=${buyerId}`);
  }

  async listAfterSalesByMerchant(merchantId: number): Promise<AfterSale[]> {
    return request<AfterSale[]>(`/aftersales?merchant_id=${merchantId}`);
  }

  async listAnnouncements(): Promise<Announcement[]> {
    return request<Announcement[]>('/announcements');
  }

  async getAnnouncement(announcementId: number): Promise<Announcement | null> {
    return request<Announcement | null>(`/announcements/${announcementId}`);
  }

  async getBuyerProfile(): Promise<BuyerProfile> {
    return request<BuyerProfile>('/membership/profile');
  }

  async listPointLogs(): Promise<PointLog[]> {
    return request<PointLog[]>('/membership/point-logs');
  }

  async listPromotions(merchantId: number, status?: PromotionStatus): Promise<Promotion[]> {
    const params = new URLSearchParams();
    params.set('merchant_id', String(merchantId));
    if (status) params.set('status', status);
    return request<Promotion[]>(`/promotions?${params.toString()}`);
  }

  async getPromotion(promotionId: number): Promise<Promotion | null> {
    return request<Promotion | null>(`/promotions/${promotionId}`);
  }

  async createPromotion(payload: CreatePromotionPayload): Promise<Promotion> {
    return request<Promotion>('/promotions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updatePromotion(promotionId: number, payload: UpdatePromotionPayload): Promise<Promotion> {
    return request<Promotion>(`/promotions/${promotionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deletePromotion(promotionId: number): Promise<void> {
    await request<void>(`/promotions/${promotionId}`, {
      method: 'DELETE'
    });
  }

  async getProductPromotion(productId: number): Promise<ProductPromotion | null> {
    return request<ProductPromotion | null>(`/products/${productId}/promotion`);
  }

  async createTicket(payload: CreateTicketPayload): Promise<Ticket> {
    return request<Ticket>('/tickets/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async listTicketsByBuyer(buyerId: number, page = 1, pageSize = 10): Promise<TicketListResult> {
    const params = new URLSearchParams();
    params.set('buyer_id', String(buyerId));
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return request<TicketListResult>(`/tickets?${params.toString()}`);
  }

  async listTicketsByMerchant(merchantId: number, page = 1, pageSize = 10): Promise<TicketListResult> {
    const params = new URLSearchParams();
    params.set('merchant_id', String(merchantId));
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return request<TicketListResult>(`/tickets?${params.toString()}`);
  }

  async getTicket(ticketId: number): Promise<Ticket | null> {
    return request<Ticket | null>(`/tickets/${ticketId}`);
  }

  async updateTicketStatus(ticketId: number, status: TicketStatus): Promise<Ticket> {
    return request<Ticket>(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async createTicketMessage(payload: CreateTicketMessagePayload): Promise<Ticket['messages'][0]> {
    return request<Ticket['messages'][0]>('/tickets/messages', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async listDeliverySlots(merchantId: number): Promise<DeliverySlot[]> {
    return request<DeliverySlot[]>(`/delivery-slots?merchant_id=${merchantId}`);
  }

  async createDeliverySlot(
    merchantId: number,
    payload: Omit<DeliverySlot, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>
  ): Promise<DeliverySlot> {
    return request<DeliverySlot>('/delivery-slots', {
      method: 'POST',
      body: JSON.stringify({ ...payload, merchant_id: merchantId })
    });
  }

  async updateDeliverySlot(
    slotId: number,
    payload: Partial<Omit<DeliverySlot, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>>
  ): Promise<DeliverySlot> {
    return request<DeliverySlot>(`/delivery-slots/${slotId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteDeliverySlot(slotId: number): Promise<void> {
    await request<void>(`/delivery-slots/${slotId}`, {
      method: 'DELETE'
    });
  }

  async listAvailableDeliverySlots(merchantId: number, date: string): Promise<DeliverySlotWithAvailability[]> {
    const params = new URLSearchParams();
    params.set('merchant_id', String(merchantId));
    params.set('date', date);
    return request<DeliverySlotWithAvailability[]>(`/delivery-slots/availability?${params.toString()}`);
  }

  async getWallet(): Promise<WalletInfo> {
    return request<WalletInfo>('/wallet');
  }

  async listWalletTransactions(): Promise<WalletTransaction[]> {
    return request<WalletTransaction[]>('/wallet/transactions');
  }
}
