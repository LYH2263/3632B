import {
  canTransitionStatus,
  seedMerchants,
  seedProducts,
  seedPromotions,
  seedUsers,
  STORAGE_KEYS,
  type AfterSale,
  type CouponRedeemRecord,
  type CreatePromotionPayload,
  type CreateTicketMessagePayload,
  type LoginPayload,
  type Merchant,
  type Order,
  type OrderStatus,
  type Product,
  type ProductPromotion,
  type Promotion,
  type PromotionStatus,
  type ReplyReviewPayload,
  type Ticket,
  type TicketListResult,
  type TicketStatus,
  type UpdatePromotionPayload,
  type User
} from '@community-store/shared';
import { request } from './http';
import { getRuntimeConfig } from './runtime-env';
import { readJSON, removeValue, writeJSON } from './storage';

const AUTH_KEY = `${STORAGE_KEYS.auth}_merchant_web`;

interface AuthSession {
  token: string;
  user: Omit<User, 'password'>;
}

export interface RegisterMerchantPayload {
  username: string;
  password: string;
  nickname: string;
  phone: string;
  merchant_name: string;
  address: string;
  delivery_note?: string;
  min_order_amount?: number;
  delivery_fee?: number;
  is_open?: boolean;
  supports_pickup?: boolean;
  pickup_fee?: number;
}

function normalizeAuthSession(raw: unknown): AuthSession | null {
  if (raw && typeof raw === 'object' && 'user' in raw && 'token' in raw) {
    const session = raw as Partial<AuthSession>;
    if (
      session.user &&
      typeof session.token === 'string' &&
      session.token.trim()
    ) {
      return session as AuthSession;
    }
  }

  if (raw && typeof raw === 'object' && 'id' in raw) {
    const user = raw as Omit<User, 'password'>;
    return {
      token: `django-token-${user.id}`,
      user
    };
  }

  return null;
}

function readAuthSession(): AuthSession | null {
  const raw = readJSON<unknown>(AUTH_KEY, null);
  return normalizeAuthSession(raw);
}

function writeAuthSession(session: AuthSession): void {
  writeJSON(AUTH_KEY, session);
}

const MOCK_DB_VERSION = 3;
const VERSION_KEY = 'community_store_mock_db_version';

function ensureMockStorage(): void {
  const storedVersion = readJSON<number>(VERSION_KEY, 0);
  if (storedVersion < MOCK_DB_VERSION) {
    writeJSON(STORAGE_KEYS.merchants, seedMerchants);
    writeJSON(STORAGE_KEYS.products, seedProducts);
    writeJSON(STORAGE_KEYS.users, seedUsers);
    writeJSON(STORAGE_KEYS.promotions, seedPromotions);
    writeJSON(VERSION_KEY, MOCK_DB_VERSION);
  }

  const merchants = readJSON<Merchant[] | null>(STORAGE_KEYS.merchants, null);
  if (!merchants) {
    writeJSON(STORAGE_KEYS.merchants, seedMerchants);
  }

  const products = readJSON<Product[] | null>(STORAGE_KEYS.products, null);
  if (!products) {
    writeJSON(STORAGE_KEYS.products, seedProducts);
  }

  const users = readJSON<User[] | null>(STORAGE_KEYS.users, null);
  if (!users) {
    writeJSON(STORAGE_KEYS.users, seedUsers);
  }

  const orders = readJSON<Order[] | null>(STORAGE_KEYS.orders, null);
  if (!orders) {
    writeJSON(STORAGE_KEYS.orders, [] as Order[]);
  }

  const promotions = readJSON<Promotion[] | null>(STORAGE_KEYS.promotions, null);
  if (!promotions) {
    writeJSON(STORAGE_KEYS.promotions, seedPromotions);
  }
}

function readMerchants(): Merchant[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.merchants, seedMerchants);
}

function writeMerchants(value: Merchant[]): void {
  writeJSON(STORAGE_KEYS.merchants, value);
}

function readProducts(): Product[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.products, seedProducts);
}

function writeProducts(value: Product[]): void {
  writeJSON(STORAGE_KEYS.products, value);
}

function readOrders(): Order[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.orders, [] as Order[]);
}

function writeOrders(value: Order[]): void {
  writeJSON(STORAGE_KEYS.orders, value);
}

function readPromotions(): Promotion[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.promotions, seedPromotions);
}

function writePromotions(value: Promotion[]): void {
  writeJSON(STORAGE_KEYS.promotions, value);
}

function getPromotionStatus(startAt: string, endAt: string, now: Date = new Date()): PromotionStatus {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (now < start) return 'draft';
  if (now >= start && now <= end) return 'active';
  return 'ended';
}

function getActivePromotionForProduct(productId: number, now: Date = new Date()): ProductPromotion | null {
  const promotions = readPromotions();
  for (const promotion of promotions) {
    if (getPromotionStatus(promotion.start_at, promotion.end_at, now) !== 'active') continue;
    const item = promotion.items.find((i) => i.product_id === productId);
    if (item) {
      const product = readProducts().find((p) => p.id === productId);
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

function readUsers(): User[] {
  ensureMockStorage();
  return readJSON(STORAGE_KEYS.users, seedUsers);
}

function nextId(items: Array<{ id: number }>): number {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

class MerchantService {
  private readonly config = getRuntimeConfig();

  getAuthUser(): Omit<User, 'password'> | null {
    return readAuthSession()?.user ?? null;
  }

  getAuthToken(): string | null {
    return readAuthSession()?.token ?? null;
  }

  logout(): void {
    removeValue(AUTH_KEY);
  }

  async login(payload: LoginPayload): Promise<Omit<User, 'password'>> {
    if (this.config.dataMode === 'api') {
      const result = await request<{ token: string; user: Omit<User, 'password'> }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
      writeAuthSession({
        token: result.token,
        user: result.user
      });
      return result.user;
    }

    const user = readUsers().find(
      (item) =>
        item.username === payload.username &&
        item.password === payload.password &&
        item.role === 'merchant'
    );

    if (!user) {
      throw new Error('账号或密码错误');
    }

    const authUser: Omit<User, 'password'> = {
      id: user.id,
      username: user.username,
      role: user.role,
      merchant_id: user.merchant_id,
      nickname: user.nickname,
      phone: user.phone
    };
    writeAuthSession({
      token: `mock-token-${authUser.id}`,
      user: authUser
    });
    return authUser;
  }

  async registerMerchant(
    payload: RegisterMerchantPayload
  ): Promise<Omit<User, 'password'>> {
    if (this.config.dataMode === 'api') {
      const result = await request<{ token: string; user: Omit<User, 'password'> }>(
        '/auth/register-merchant',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
      writeAuthSession({
        token: result.token,
        user: result.user
      });
      return result.user;
    }

    const merchants = readMerchants();
    const users = readUsers();

    if (users.some((item) => item.username === payload.username)) {
      throw new Error('用户名已存在');
    }

    const merchant: Merchant = {
      id: nextId(merchants),
      name: payload.merchant_name,
      phone: payload.phone,
      address: payload.address,
      delivery_note: payload.delivery_note?.trim() || '请联系商家协商配送',
      min_order_amount: Number(payload.min_order_amount ?? 0),
      delivery_fee: Number(payload.delivery_fee ?? 0),
      is_open: payload.is_open ?? true,
      supports_pickup: payload.supports_pickup ?? true,
      pickup_fee: Number(payload.pickup_fee ?? 0)
    };
    merchants.push(merchant);
    writeMerchants(merchants);

    const createdUser: User = {
      id: nextId(users),
      username: payload.username,
      password: payload.password,
      role: 'merchant',
      merchant_id: merchant.id,
      nickname: payload.nickname,
      phone: payload.phone
    };
    users.push(createdUser);
    writeJSON(STORAGE_KEYS.users, users);

    const authUser: Omit<User, 'password'> = {
      id: createdUser.id,
      username: createdUser.username,
      role: createdUser.role,
      merchant_id: createdUser.merchant_id,
      nickname: createdUser.nickname,
      phone: createdUser.phone
    };

    writeAuthSession({
      token: `mock-token-${authUser.id}`,
      user: authUser
    });
    return authUser;
  }

  async getMerchant(merchantId: number): Promise<Merchant | null> {
    if (this.config.dataMode === 'api') {
      const merchants = await request<Merchant[]>('/merchants');
      return merchants.find((item) => item.id === merchantId) ?? null;
    }
    return readMerchants().find((item) => item.id === merchantId) ?? null;
  }

  async updateMerchant(
    merchantId: number,
    payload: Partial<Merchant>
  ): Promise<Merchant> {
    if (this.config.dataMode === 'api') {
      return request<Merchant>(`/merchants/${merchantId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    const merchants = readMerchants();
    const target = merchants.find((item) => item.id === merchantId);
    if (!target) {
      throw new Error('商家不存在');
    }

    Object.assign(target, payload);
    writeMerchants(merchants);
    return target;
  }

  async listProducts(merchantId: number): Promise<Product[]> {
    if (this.config.dataMode === 'api') {
      return request<Product[]>(`/products?merchant_id=${merchantId}`);
    }

    return readProducts().filter((item) => item.merchant_id === merchantId);
  }

  async createProduct(payload: Omit<Product, 'id'>): Promise<Product> {
    if (this.config.dataMode === 'api') {
      return request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    const products = readProducts();
    const created: Product = {
      ...payload,
      id: nextId(products)
    };
    products.push(created);
    writeProducts(products);
    return created;
  }

  async updateProduct(
    productId: number,
    payload: Partial<Product>
  ): Promise<Product> {
    if (this.config.dataMode === 'api') {
      return request<Product>(`/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    const products = readProducts();
    const target = products.find((item) => item.id === productId);
    if (!target) {
      throw new Error('商品不存在');
    }

    Object.assign(target, payload);
    writeProducts(products);
    return target;
  }

  async listOrdersByMerchant(merchantId: number): Promise<Order[]> {
    if (this.config.dataMode === 'api') {
      return request<Order[]>(`/orders?merchant_id=${merchantId}`);
    }

    return readOrders()
      .filter((item) => item.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    if (this.config.dataMode === 'api') {
      return request<Order>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    }

    const orders = readOrders();
    const target = orders.find((item) => item.id === orderId);
    if (!target) {
      throw new Error('订单不存在');
    }

    if (!canTransitionStatus(target.status, status)) {
      throw new Error('状态不可逆或非法迁移');
    }

    target.status = status;
    target.updated_at = new Date().toISOString();
    writeOrders(orders);
    return target;
  }

  async listCouponRedeemRecords(merchantId: number): Promise<CouponRedeemRecord[]> {
    if (this.config.dataMode === 'api') {
      return request<CouponRedeemRecord[]>(
        `/coupon/redeem-records?merchant_id=${merchantId}`
      );
    }

    const records = readJSON<CouponRedeemRecord[]>(
      STORAGE_KEYS.coupon_redeem_records,
      []
    );
    return records
      .filter((r) => r.merchant_id === merchantId)
      .sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at));
  }

  async listReviews(merchantId: number): Promise<ProductReview[]> {
    if (this.config.dataMode === 'api') {
      return request<ProductReview[]>(`/reviews?merchant_id=${merchantId}`);
    }

    const reviews = readJSON<ProductReview[]>(STORAGE_KEYS.reviews, []);
    return reviews
      .filter((r) => r.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async replyReview(payload: ReplyReviewPayload): Promise<ProductReview> {
    if (this.config.dataMode === 'api') {
      return request<ProductReview>('/reviews/reply', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    const reviews = readJSON<ProductReview[]>(STORAGE_KEYS.reviews, []);
    const idx = reviews.findIndex((r) => r.id === payload.review_id);
    if (idx === -1) {
      throw new Error('评价不存在');
    }
    if (reviews[idx].reply && reviews[idx].reply!.trim()) {
      throw new Error('已回复过，不可重复回复');
    }
    reviews[idx] = {
      ...reviews[idx],
      reply: payload.reply.trim(),
      reply_at: new Date().toISOString()
    };
    writeJSON(STORAGE_KEYS.reviews, reviews);
    return reviews[idx];
  }

  async listAfterSales(merchantId: number): Promise<AfterSale[]> {
    if (this.config.dataMode === 'api') {
      return request<AfterSale[]>(`/aftersales?merchant_id=${merchantId}`);
    }

    const aftersales = readJSON<AfterSale[]>(STORAGE_KEYS.aftersales, []);
    return aftersales
      .filter((a) => a.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async reviewAfterSale(
    aftersaleId: number,
    action: 'approve' | 'reject',
    rejectReason?: string,
    rejectRemark?: string
  ): Promise<AfterSale> {
    if (this.config.dataMode === 'api') {
      return request<AfterSale>(`/aftersales/${aftersaleId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          reject_reason: rejectReason ?? '',
          reject_remark: rejectRemark ?? ''
        })
      });
    }

    const aftersales = readJSON<AfterSale[]>(STORAGE_KEYS.aftersales, []);
    const idx = aftersales.findIndex((a) => a.id === aftersaleId);
    if (idx === -1) {
      throw new Error('售后单不存在');
    }
    if (aftersales[idx].status !== 'pending') {
      throw new Error('该售后单已处理');
    }

    if (action === 'approve') {
      aftersales[idx] = {
        ...aftersales[idx],
        status: 'approved',
        updated_at: new Date().toISOString()
      };

      const orders = readJSON<Order[]>(STORAGE_KEYS.orders, []);
      const orderIdx = orders.findIndex((o) => o.id === aftersales[idx].order_id);
      if (orderIdx !== -1) {
        orders[orderIdx] = {
          ...orders[orderIdx],
          status: 'refunded',
          updated_at: new Date().toISOString()
        };
        writeJSON(STORAGE_KEYS.orders, orders);
      }
    } else {
      if (!rejectReason) {
        throw new Error('拒绝时需填写或选择原因');
      }
      aftersales[idx] = {
        ...aftersales[idx],
        status: 'rejected',
        reject_reason: rejectReason,
        reject_remark: rejectRemark ?? '',
        updated_at: new Date().toISOString()
      };
    }

    writeJSON(STORAGE_KEYS.aftersales, aftersales);
    return aftersales[idx];
  }

  async listPromotions(merchantId: number, status?: PromotionStatus): Promise<Promotion[]> {
    if (this.config.dataMode === 'api') {
      const url = status
        ? `/promotions?merchant_id=${merchantId}&status=${status}`
        : `/promotions?merchant_id=${merchantId}`;
      return request<Promotion[]>(url);
    }

    const now = new Date();
    let promotions = readPromotions().filter((p) => p.merchant_id === merchantId);
    promotions = promotions.map((p) => ({
      ...p,
      status: getPromotionStatus(p.start_at, p.end_at, now)
    }));
    if (status) {
      promotions = promotions.filter((p) => p.status === status);
    }
    return promotions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getPromotion(promotionId: number): Promise<Promotion | null> {
    if (this.config.dataMode === 'api') {
      return request<Promotion | null>(`/promotions/${promotionId}`);
    }

    const promotion = readPromotions().find((p) => p.id === promotionId) ?? null;
    if (promotion) {
      return {
        ...promotion,
        status: getPromotionStatus(promotion.start_at, promotion.end_at)
      };
    }
    return null;
  }

  async createPromotion(payload: CreatePromotionPayload): Promise<Promotion> {
    if (this.config.dataMode === 'api') {
      return request<Promotion>('/promotions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    const promotions = readPromotions();
    const products = readProducts();
    const now = new Date();

    const newItems = payload.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      return {
        id: nextId(promotions.flatMap((p) => p.items)),
        product_id: item.product_id,
        product_name: product?.name ?? '',
        original_price: product?.price ?? 0,
        promo_price: item.promo_price,
        promo_stock: item.promo_stock ?? -1,
        sold_quantity: 0
      };
    });

    const created: Promotion = {
      id: nextId(promotions),
      merchant_id: payload.merchant_id,
      name: payload.name,
      description: payload.description ?? '',
      start_at: payload.start_at,
      end_at: payload.end_at,
      status: getPromotionStatus(payload.start_at, payload.end_at, now),
      items: newItems,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    promotions.push(created);
    writePromotions(promotions);
    return created;
  }

  async updatePromotion(promotionId: number, payload: UpdatePromotionPayload): Promise<Promotion> {
    if (this.config.dataMode === 'api') {
      return request<Promotion>(`/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    const promotions = readPromotions();
    const products = readProducts();
    const idx = promotions.findIndex((p) => p.id === promotionId);
    if (idx === -1) {
      throw new Error('活动不存在');
    }

    const now = new Date();
    const updated = { ...promotions[idx], updated_at: now.toISOString() };

    if (payload.name !== undefined) updated.name = payload.name;
    if (payload.description !== undefined) updated.description = payload.description;
    if (payload.start_at !== undefined) updated.start_at = payload.start_at;
    if (payload.end_at !== undefined) updated.end_at = payload.end_at;
    if (payload.items !== undefined) {
      updated.items = payload.items.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        return {
          id: nextId(promotions.flatMap((p) => p.items)),
          product_id: item.product_id,
          product_name: product?.name ?? '',
          original_price: product?.price ?? 0,
          promo_price: item.promo_price,
          promo_stock: item.promo_stock ?? -1,
          sold_quantity: 0
        };
      });
    }

    updated.status = getPromotionStatus(updated.start_at, updated.end_at, now);
    promotions[idx] = updated;
    writePromotions(promotions);
    return updated;
  }

  async deletePromotion(promotionId: number): Promise<void> {
    if (this.config.dataMode === 'api') {
      await request(`/promotions/${promotionId}`, {
        method: 'DELETE'
      });
      return;
    }

    const promotions = readPromotions();
    const filtered = promotions.filter((p) => p.id !== promotionId);
    writePromotions(filtered);
  }

  async getProductPromotion(productId: number): Promise<ProductPromotion | null> {
    if (this.config.dataMode === 'api') {
      return request<ProductPromotion | null>(`/products/${productId}/promotion`);
    }

    return getActivePromotionForProduct(productId);
  }

  async listTickets(merchantId: number, page = 1, pageSize = 10): Promise<TicketListResult> {
    if (this.config.dataMode === 'api') {
      const params = new URLSearchParams();
      params.set('merchant_id', String(merchantId));
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      return request<TicketListResult>(`/tickets?${params.toString()}`);
    }

    const tickets = readJSON<Ticket[]>(STORAGE_KEYS.tickets, []);
    const filtered = tickets.filter((t) => t.merchant_id === merchantId).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const results = filtered.slice(start, end).map((t) => ({
      id: t.id,
      buyer_id: t.buyer_id,
      buyer_nickname: t.buyer_nickname,
      merchant_id: t.merchant_id,
      merchant_name: t.merchant_name,
      order_id: t.order_id,
      order_no: t.order_no,
      type: t.type,
      title: t.title,
      status: t.status,
      last_message_at: t.messages.length ? t.messages[t.messages.length - 1].created_at : t.created_at,
      created_at: t.created_at,
      updated_at: t.updated_at
    }));

    return {
      results,
      count: filtered.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(filtered.length / pageSize)
    };
  }

  async getTicket(ticketId: number): Promise<Ticket | null> {
    if (this.config.dataMode === 'api') {
      return request<Ticket | null>(`/tickets/${ticketId}`);
    }

    const tickets = readJSON<Ticket[]>(STORAGE_KEYS.tickets, []);
    return tickets.find((t) => t.id === ticketId) ?? null;
  }

  async updateTicketStatus(ticketId: number, status: TicketStatus): Promise<Ticket> {
    if (this.config.dataMode === 'api') {
      return request<Ticket>(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    }

    const tickets = readJSON<Ticket[]>(STORAGE_KEYS.tickets, []);
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) {
      throw new Error('工单不存在');
    }

    tickets[idx] = {
      ...tickets[idx],
      status,
      updated_at: new Date().toISOString()
    };
    writeJSON(STORAGE_KEYS.tickets, tickets);
    return tickets[idx];
  }

  async createTicketMessage(payload: CreateTicketMessagePayload): Promise<Ticket['messages'][0]> {
    if (this.config.dataMode === 'api') {
      return request<Ticket['messages'][0]>('/tickets/messages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    const tickets = readJSON<Ticket[]>(STORAGE_KEYS.tickets, []);
    const idx = tickets.findIndex((t) => t.id === payload.ticket_id);
    if (idx === -1) {
      throw new Error('工单不存在');
    }

    const ticket = tickets[idx];
    if (ticket.status === 'closed') {
      throw new Error('工单已关闭，无法回复');
    }

    const users = readJSON<User[]>(STORAGE_KEYS.users, seedUsers);
    const sender = users.find((u) => u.merchant_id === ticket.merchant_id);
    if (!sender) {
      throw new Error('发送者不存在');
    }

    if (ticket.status === 'open') {
      ticket.status = 'processing';
    }

    const now = new Date().toISOString();
    const message: Ticket['messages'][0] = {
      id: ticket.messages.length + 1,
      ticket_id: ticket.id,
      sender_id: sender.id,
      sender_nickname: sender.nickname,
      sender_role: sender.role,
      content: payload.content,
      created_at: now
    };

    ticket.messages.push(message);
    ticket.updated_at = now;
    tickets[idx] = ticket;
    writeJSON(STORAGE_KEYS.tickets, tickets);
    return message;
  }
}

export const merchantService = new MerchantService();
