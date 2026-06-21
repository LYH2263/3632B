import {
  canTransitionStatus,
  createOrderFromCart,
  emptyCart,
  filterAvailableCoupons,
  validateUserCoupon,
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
  type CouponStatus
} from '@community-store/shared';
import {
  ensureMockDB,
  getActivePromotionForProduct,
  mergeProductWithPromotion,
  readAfterSales,
  readAnnouncements,
  readCart,
  readCouponRedeemRecords,
  readCouponTemplates,
  readDeliverySlots,
  readMerchants,
  readOrders,
  readProducts,
  readPromotions,
  readReviews,
  readTickets,
  readUserCoupons,
  readUsers,
  writeAfterSales,
  writeCart,
  writeCouponRedeemRecords,
  writeCouponTemplates,
  writeDeliverySlots,
  writeMerchants,
  writeOrders,
  writePromotions,
  writeReviews,
  writeTickets,
  writeUserCoupons,
  writeProducts
} from '../data/mock-db';

function nextId(items: Array<{ id: number }>): number {
  if (!items.length) {
    return 1;
  }
  return Math.max(...items.map((item) => item.id)) + 1;
}

export class MockDataSource implements DataSource {
  constructor() {
    ensureMockDB();
  }

  async listMerchants(): Promise<Merchant[]> {
    return readMerchants();
  }

  async getMerchant(merchantId: number): Promise<Merchant | null> {
    return readMerchants().find((item) => item.id === merchantId) ?? null;
  }

  async updateMerchant(
    merchantId: number,
    payload: Partial<Merchant>
  ): Promise<Merchant> {
    const merchants = readMerchants();
    const target = merchants.find((item) => item.id === merchantId);
    if (!target) {
      throw new Error('商家不存在');
    }
    Object.assign(target, payload);
    writeMerchants(merchants);
    return target;
  }

  async listProducts(merchantId: number, keyword?: string): Promise<Product[]> {
    const normalizedKeyword = keyword?.trim().toLowerCase() ?? '';
    const products = readProducts().filter((product) => {
      if (product.merchant_id !== merchantId) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      return product.name.toLowerCase().includes(normalizedKeyword);
    });
    return products.map(mergeProductWithPromotion);
  }

  async getProduct(productId: number): Promise<Product | null> {
    const product = readProducts().find((item) => item.id === productId) ?? null;
    if (!product) return null;
    return mergeProductWithPromotion(product);
  }

  async createProduct(payload: Omit<Product, 'id'>): Promise<Product> {
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
    const products = readProducts();
    const target = products.find((item) => item.id === productId);
    if (!target) {
      throw new Error('商品不存在');
    }
    Object.assign(target, payload);
    writeProducts(products);
    return target;
  }

  async listOrdersByBuyer(buyerId: number): Promise<Order[]> {
    return readOrders()
      .filter((item) => item.buyer_id === buyerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listOrdersByMerchant(merchantId: number): Promise<Order[]> {
    return readOrders()
      .filter((item) => item.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getOrder(orderId: number): Promise<Order | null> {
    return readOrders().find((item) => item.id === orderId) ?? null;
  }

  async createOrder(payload: CheckoutPayload): Promise<Order> {
    const merchants = readMerchants();
    const merchant = merchants.find((item) => item.id === payload.merchant_id);
    if (!merchant) {
      throw new Error('商家不存在');
    }

    const fulfillmentType = payload.fulfillment_type ?? 'delivery';
    if (fulfillmentType === 'pickup' && !merchant.supports_pickup) {
      throw new Error('该商家不支持到店自提');
    }

    const cart = readCart();
    const products = readProducts().filter(
      (item) => item.merchant_id === payload.merchant_id
    );

    let discountAmount = 0;
    let couponId: number | undefined = undefined;
    let userCoupon: UserCoupon | undefined = undefined;

    if (payload.coupon_id) {
      const userCoupons = readUserCoupons();
      userCoupon = userCoupons.find((c) => c.id === payload.coupon_id);
      if (!userCoupon) {
        throw new Error('优惠券不存在');
      }
      if (userCoupon.user_id !== payload.buyer_id) {
        throw new Error('无权使用该优惠券');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));
      const itemsAmount = cart.items.reduce((sum, item) => {
        const product = productMap.get(item.product_id);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0);

      const validation = validateUserCoupon(userCoupon, itemsAmount, merchant.delivery_fee);
      if (!validation.valid) {
        throw new Error(validation.errors.join('；'));
      }

      discountAmount = validation.discount_amount;
      couponId = payload.coupon_id;
    }

    const orders = readOrders();
    const order = createOrderFromCart({
      orderId: nextId(orders),
      buyerId: payload.buyer_id,
      payload,
      merchant,
      cart,
      products,
      discount_amount: discountAmount,
      coupon_id: couponId
    });

    if (userCoupon && couponId) {
      const userCoupons = readUserCoupons();
      const couponIndex = userCoupons.findIndex((c) => c.id === couponId);
      if (couponIndex !== -1) {
        userCoupons[couponIndex] = {
          ...userCoupons[couponIndex],
          status: 'used' as const,
          used_at: new Date().toISOString(),
          order_id: order.id
        };
        writeUserCoupons(userCoupons);
      }

      const redeemRecords = readCouponRedeemRecords();
      const productMap = new Map(products.map((p) => [p.id, p]));
      const itemsAmount = cart.items.reduce((sum, item) => {
        const product = productMap.get(item.product_id);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0);

      const newRecord: CouponRedeemRecord = {
        id: nextId(redeemRecords),
        user_coupon_id: couponId,
        order_id: order.id,
        merchant_id: payload.merchant_id,
        buyer_id: payload.buyer_id,
        discount_amount: discountAmount,
        items_amount: itemsAmount,
        redeemed_at: new Date().toISOString(),
        template_name: userCoupon.template.name,
        order_no: order.order_no,
        buyer_nickname: ''
      };
      redeemRecords.push(newRecord);
      writeCouponRedeemRecords(redeemRecords);
    }

    orders.push(order);
    writeOrders(orders);
    writeCart({
      ...emptyCart,
      updated_at: new Date().toISOString()
    });

    return order;
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const orders = readOrders();
    const target = orders.find((item) => item.id === orderId);
    if (!target) {
      throw new Error('订单不存在');
    }

    if (target.status === status) {
      return target;
    }

    if (!canTransitionStatus(target.status, status)) {
      throw new Error(`状态不可从 ${target.status} 变更为 ${status}`);
    }

    const isCancelPending = target.status === 'pending' && status === 'canceled';
    if (isCancelPending && target.coupon_id) {
      const userCoupons = readUserCoupons();
      const couponIndex = userCoupons.findIndex((c) => c.id === target.coupon_id);
      if (couponIndex !== -1) {
        userCoupons[couponIndex] = {
          ...userCoupons[couponIndex],
          status: 'available' as const,
          used_at: undefined,
          order_id: undefined
        };
        writeUserCoupons(userCoupons);
      }

      const redeemRecords = readCouponRedeemRecords();
      const filteredRecords = redeemRecords.filter((r) => r.order_id !== orderId);
      writeCouponRedeemRecords(filteredRecords);
    }

    target.status = status;
    target.updated_at = new Date().toISOString();
    writeOrders(orders);
    return target;
  }

  async getCart(): Promise<Cart> {
    return readCart();
  }

  async setCart(cart: Cart): Promise<Cart> {
    const normalized: Cart = {
      ...cart,
      updated_at: new Date().toISOString()
    };
    writeCart(normalized);
    return normalized;
  }

  async clearCart(): Promise<Cart> {
    const nextCart: Cart = {
      ...emptyCart,
      updated_at: new Date().toISOString()
    };
    writeCart(nextCart);
    return nextCart;
  }

  async login(payload: LoginPayload): Promise<LoginResult> {
    const user = readUsers().find(
      (item) =>
        item.username === payload.username && item.password === payload.password
    );
    if (!user) {
      throw new Error('账号或密码错误');
    }

    return {
      token: `mock-token-${user.id}`,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nickname: user.nickname,
        phone: user.phone,
        merchant_id: user.merchant_id
      }
    };
  }

  async listCouponTemplates(): Promise<CouponTemplate[]> {
    const now = new Date();
    return readCouponTemplates().filter(
      (t) => new Date(t.valid_from) <= now && new Date(t.valid_to) >= now
    );
  }

  async claimCoupon(templateId: number): Promise<UserCoupon> {
    const templates = readCouponTemplates();
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      throw new Error('优惠券模板不存在');
    }

    const now = new Date();
    if (now < new Date(template.valid_from)) {
      throw new Error('优惠券尚未开始领取');
    }
    if (now > new Date(template.valid_to)) {
      throw new Error('优惠券已过期，无法领取');
    }

    if (template.claimed_quantity >= template.total_quantity) {
      throw new Error('优惠券已被领完');
    }

    const userCoupons = readUserCoupons();
    const userCount = userCoupons.filter(
      (c) => c.template_id === templateId && c.user_id === 1
    ).length;
    if (userCount >= template.per_user_limit) {
      throw new Error(`每人限领 ${template.per_user_limit} 张，您已达上限`);
    }

    const newCoupon: UserCoupon = {
      id: nextId(userCoupons),
      user_id: 1,
      template_id: templateId,
      status: 'available',
      claimed_at: new Date().toISOString(),
      template: template
    };

    userCoupons.push(newCoupon);
    writeUserCoupons(userCoupons);

    template.claimed_quantity += 1;
    writeCouponTemplates(templates);

    return newCoupon;
  }

  async listUserCoupons(userId: number, status?: CouponStatus): Promise<UserCoupon[]> {
    let coupons = readUserCoupons().filter((c) => c.user_id === userId);
    if (status) {
      coupons = coupons.filter((c) => c.status === status);
    }
    return coupons.sort((a, b) => b.claimed_at.localeCompare(a.claimed_at));
  }

  async validateCoupon(
    couponId: number,
    merchantId: number,
    itemsAmount: number,
    deliveryFee: number
  ): Promise<CouponValidationResult> {
    const userCoupon = readUserCoupons().find((c) => c.id === couponId);
    if (!userCoupon) {
      throw new Error('优惠券不存在');
    }
    return validateUserCoupon(userCoupon, itemsAmount, deliveryFee);
  }

  async listAvailableCouponsForCart(
    userId: number,
    merchantId: number,
    itemsAmount: number,
    deliveryFee: number
  ): Promise<UserCoupon[]> {
    const userCoupons = readUserCoupons().filter(
      (c) => c.user_id === userId && c.status === 'available'
    );
    const available = filterAvailableCoupons(userCoupons, itemsAmount, deliveryFee);
    return available.sort(
      (a, b) => b.template.discount_amount - a.template.discount_amount
    );
  }

  async listCouponRedeemRecords(merchantId: number): Promise<CouponRedeemRecord[]> {
    return readCouponRedeemRecords()
      .filter((r) => r.merchant_id === merchantId)
      .sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at));
  }

  async createReview(payload: CreateReviewPayload): Promise<ProductReview> {
    const orders = readOrders();
    const order = orders.find((o) => o.id === payload.order_id);
    if (!order) {
      throw new Error('订单不存在');
    }
    if (order.status !== 'completed') {
      throw new Error('仅已完成订单可评价');
    }

    const orderProductIds = order.items_snapshot.map((item) => item.product_id);
    if (!orderProductIds.includes(payload.product_id)) {
      throw new Error('该商品不在订单中');
    }

    const reviews = readReviews();
    const existing = reviews.find(
      (r) => r.order_id === payload.order_id && r.product_id === payload.product_id
    );
    if (existing) {
      throw new Error('该商品已评价，不可重复评价');
    }

    const products = readProducts();
    const product = products.find((p) => p.id === payload.product_id);
    if (!product) {
      throw new Error('商品不存在');
    }

    const users = readUsers();
    const buyer = users.find((u) => u.id === order.buyer_id);

    const newReview: ProductReview = {
      id: nextId(reviews),
      order_id: payload.order_id,
      product_id: payload.product_id,
      buyer_id: order.buyer_id,
      merchant_id: product.merchant_id,
      rating: Math.min(5, Math.max(1, payload.rating)),
      content: payload.content.trim(),
      reply: null,
      reply_at: null,
      created_at: new Date().toISOString(),
      product_name: product.name,
      product_image_url: product.image_url,
      buyer_nickname: buyer?.nickname ?? '',
      order_no: order.order_no
    };

    reviews.push(newReview);
    writeReviews(reviews);
    return newReview;
  }

  async listReviewsByProduct(
    productId: number
  ): Promise<{ reviews: ProductReview[]; summary: ProductReviewSummary }> {
    const allReviews = readReviews();
    const reviews = allReviews
      .filter((r) => r.product_id === productId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const count = reviews.length;
    const avg = count
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

    const summary: ProductReviewSummary = {
      product_id: productId,
      average_rating: Math.round(avg * 10) / 10,
      review_count: count,
      five_star_count: reviews.filter((r) => r.rating === 5).length,
      four_star_count: reviews.filter((r) => r.rating === 4).length,
      three_star_count: reviews.filter((r) => r.rating === 3).length,
      two_star_count: reviews.filter((r) => r.rating === 2).length,
      one_star_count: reviews.filter((r) => r.rating === 1).length
    };

    return { reviews, summary };
  }

  async listReviewsByMerchant(merchantId: number): Promise<ProductReview[]> {
    return readReviews()
      .filter((r) => r.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async replyReview(payload: ReplyReviewPayload): Promise<ProductReview> {
    const reviews = readReviews();
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
    writeReviews(reviews);
    return reviews[idx];
  }

  async getPendingReviewsByOrder(
    orderId: number
  ): Promise<
    { product_id: number; name: string; image_url: string; unit: string; price: number; quantity: number }[]
  > {
    const orders = readOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      throw new Error('订单不存在');
    }
    if (order.status !== 'completed') {
      throw new Error('仅已完成订单可评价');
    }

    const reviews = readReviews();
    const reviewedIds = new Set(
      reviews
        .filter((r) => r.order_id === orderId)
        .map((r) => r.product_id)
    );

    const products = readProducts();
    const productMap = new Map(products.map((p) => [p.id, p]));

    return order.items_snapshot
      .filter((item) => !reviewedIds.has(item.product_id))
      .map((item) => {
        const p = productMap.get(item.product_id);
        return {
          product_id: item.product_id,
          name: p?.name ?? item.name,
          image_url: p?.image_url ?? '',
          unit: p?.unit ?? item.unit,
          price: p?.price ?? item.price,
          quantity: item.quantity
        };
      });
  }

  async createAfterSale(payload: CreateAfterSalePayload): Promise<AfterSale> {
    const orders = readOrders();
    const order = orders.find((o) => o.id === payload.order_id);
    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== 'completed' && order.status !== 'delivering') {
      throw new Error('仅已完成或配送中的订单可申请售后');
    }

    const aftersales = readAfterSales();
    const existing = aftersales.find(
      (a) => a.order_id === payload.order_id && a.status === 'pending'
    );
    if (existing) {
      throw new Error('该订单已有进行中的售后申请');
    }

    const now = new Date().toISOString();
    const newAfterSale: AfterSale = {
      id: nextId(aftersales),
      order_id: payload.order_id,
      buyer_id: order.buyer_id,
      merchant_id: order.merchant_id,
      order_no: order.order_no,
      order_status: order.status,
      reason: payload.reason,
      description: payload.description ?? '',
      status: 'pending',
      reject_reason: '',
      reject_remark: '',
      created_at: now,
      updated_at: now
    };

    aftersales.push(newAfterSale);
    writeAfterSales(aftersales);
    return newAfterSale;
  }

  async listAfterSalesByBuyer(buyerId: number): Promise<AfterSale[]> {
    return readAfterSales()
      .filter((a) => a.buyer_id === buyerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listAfterSalesByMerchant(merchantId: number): Promise<AfterSale[]> {
    return readAfterSales()
      .filter((a) => a.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listAnnouncements(): Promise<Announcement[]> {
    const now = new Date();
    return readAnnouncements()
      .filter((a) => new Date(a.valid_from) <= now && new Date(a.valid_to) >= now)
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return a.is_pinned ? -1 : 1;
        }
        return b.created_at.localeCompare(a.created_at);
      });
  }

  async getAnnouncement(announcementId: number): Promise<Announcement | null> {
    const now = new Date();
    return readAnnouncements().find(
      (a) => a.id === announcementId && new Date(a.valid_from) <= now && new Date(a.valid_to) >= now
    ) ?? null;
  }

  async getBuyerProfile(): Promise<BuyerProfile> {
    const users = readUsers();
    const buyer = users.find((u) => u.role === 'buyer');
    const completedOrders = readOrders().filter(
      (o) => o.buyer_id === (buyer?.id ?? 1) && o.status === 'completed'
    );
    const totalEarned = completedOrders.reduce(
      (sum, o) => sum + Math.floor(o.total_amount),
      0
    );
    const level = totalEarned >= 500 ? 'L3' : totalEarned >= 100 ? 'L2' : 'L1';
    return {
      id: 1,
      buyer_id: buyer?.id ?? 1,
      nickname: buyer?.nickname ?? '买家',
      points: totalEarned,
      total_earned: totalEarned,
      deductible_points: 0,
      level: level as BuyerProfile['level'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async listPointLogs(): Promise<PointLog[]> {
    const completedOrders = readOrders().filter((o) => o.status === 'completed');
    return completedOrders.map((o, idx) => ({
      id: idx + 1,
      buyer_id: o.buyer_id,
      change: Math.floor(o.total_amount),
      balance_after: completedOrders
        .slice(0, idx + 1)
        .reduce((s, ord) => s + Math.floor(ord.total_amount), 0),
      source: 'order_complete' as const,
      source_id: o.id,
      created_at: o.updated_at
    }));
  }

  async listPromotions(merchantId: number, status?: PromotionStatus): Promise<Promotion[]> {
    const now = new Date();
    let promotions = readPromotions().filter((p) => p.merchant_id === merchantId);
    promotions = promotions.map((p) => {
      const startAt = new Date(p.start_at);
      const endAt = new Date(p.end_at);
      let s: PromotionStatus = 'draft';
      if (now >= startAt && now <= endAt) s = 'active';
      else if (now > endAt) s = 'ended';
      return { ...p, status: s };
    });
    if (status) {
      promotions = promotions.filter((p) => p.status === status);
    }
    return promotions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getPromotion(promotionId: number): Promise<Promotion | null> {
    const promotion = readPromotions().find((p) => p.id === promotionId) ?? null;
    if (!promotion) return null;
    const now = new Date();
    const startAt = new Date(promotion.start_at);
    const endAt = new Date(promotion.end_at);
    let status: PromotionStatus = 'draft';
    if (now >= startAt && now <= endAt) status = 'active';
    else if (now > endAt) status = 'ended';
    return { ...promotion, status };
  }

  async createPromotion(payload: CreatePromotionPayload): Promise<Promotion> {
    const promotions = readPromotions();
    const products = readProducts();
    const now = new Date();
    const startAt = new Date(payload.start_at);
    const endAt = new Date(payload.end_at);
    let status: PromotionStatus = 'draft';
    if (now >= startAt && now <= endAt) status = 'active';
    else if (now > endAt) status = 'ended';

    const newItems = payload.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      return {
        id: promotions.flatMap((p) => p.items).length + 1,
        product_id: item.product_id,
        product_name: product?.name ?? '',
        original_price: product?.price ?? 0,
        promo_price: item.promo_price,
        promo_stock: item.promo_stock ?? -1,
        sold_quantity: 0
      };
    });

    const created: Promotion = {
      id: promotions.length ? Math.max(...promotions.map((p) => p.id)) + 1 : 1,
      merchant_id: payload.merchant_id,
      name: payload.name,
      description: payload.description ?? '',
      start_at: payload.start_at,
      end_at: payload.end_at,
      status,
      items: newItems,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    promotions.push(created);
    writePromotions(promotions);
    return created;
  }

  async updatePromotion(promotionId: number, payload: UpdatePromotionPayload): Promise<Promotion> {
    const promotions = readPromotions();
    const products = readProducts();
    const idx = promotions.findIndex((p) => p.id === promotionId);
    if (idx === -1) throw new Error('活动不存在');

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
          id: promotions.flatMap((p) => p.items).length + 1,
          product_id: item.product_id,
          product_name: product?.name ?? '',
          original_price: product?.price ?? 0,
          promo_price: item.promo_price,
          promo_stock: item.promo_stock ?? -1,
          sold_quantity: 0
        };
      });
    }

    const startAt = new Date(updated.start_at);
    const endAt = new Date(updated.end_at);
    let status: PromotionStatus = 'draft';
    if (now >= startAt && now <= endAt) status = 'active';
    else if (now > endAt) status = 'ended';
    updated.status = status;

    promotions[idx] = updated;
    writePromotions(promotions);
    return updated;
  }

  async deletePromotion(promotionId: number): Promise<void> {
    const promotions = readPromotions();
    const filtered = promotions.filter((p) => p.id !== promotionId);
    writePromotions(filtered);
  }

  async getProductPromotion(productId: number): Promise<ProductPromotion | null> {
    return getActivePromotionForProduct(productId);
  }

  async createTicket(payload: CreateTicketPayload): Promise<Ticket> {
    const merchants = readMerchants();
    const merchant = merchants.find((m) => m.id === payload.merchant_id);
    if (!merchant) {
      throw new Error('商家不存在');
    }

    const orders = readOrders();
    let order: Order | null = null;
    if (payload.order_id) {
      order = orders.find((o) => o.id === payload.order_id) ?? null;
      if (!order) {
        throw new Error('订单不存在');
      }
      if (order.merchant_id !== merchant.id) {
        throw new Error('订单不属于该商家');
      }
    }

    const users = readUsers();
    const buyer = users.find((u) => u.role === 'buyer');
    if (!buyer) {
      throw new Error('买家不存在');
    }

    const tickets = readTickets();
    const now = new Date().toISOString();

    const newTicket: Ticket = {
      id: nextId(tickets),
      buyer_id: buyer.id,
      buyer_nickname: buyer.nickname,
      merchant_id: merchant.id,
      merchant_name: merchant.name,
      order_id: order?.id ?? null,
      order_no: order?.order_no ?? null,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      status: 'open',
      messages: [
        {
          id: 1,
          ticket_id: 0,
          sender_id: buyer.id,
          sender_nickname: buyer.nickname,
          sender_role: 'buyer',
          content: payload.description,
          created_at: now
        }
      ],
      created_at: now,
      updated_at: now
    };

    newTicket.messages[0].ticket_id = newTicket.id;
    tickets.push(newTicket);
    writeTickets(tickets);
    return newTicket;
  }

  async listTicketsByBuyer(buyerId: number, page = 1, pageSize = 10): Promise<TicketListResult> {
    const tickets = readTickets()
      .filter((t) => t.buyer_id === buyerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const results = tickets.slice(start, end).map((t) => ({
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
      count: tickets.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(tickets.length / pageSize)
    };
  }

  async listTicketsByMerchant(merchantId: number, page = 1, pageSize = 10): Promise<TicketListResult> {
    const tickets = readTickets()
      .filter((t) => t.merchant_id === merchantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const results = tickets.slice(start, end).map((t) => ({
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
      count: tickets.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(tickets.length / pageSize)
    };
  }

  async getTicket(ticketId: number): Promise<Ticket | null> {
    return readTickets().find((t) => t.id === ticketId) ?? null;
  }

  async updateTicketStatus(ticketId: number, status: TicketStatus): Promise<Ticket> {
    const tickets = readTickets();
    const idx = tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) {
      throw new Error('工单不存在');
    }

    tickets[idx] = {
      ...tickets[idx],
      status,
      updated_at: new Date().toISOString()
    };
    writeTickets(tickets);
    return tickets[idx];
  }

  async createTicketMessage(payload: CreateTicketMessagePayload): Promise<Ticket['messages'][0]> {
    const tickets = readTickets();
    const idx = tickets.findIndex((t) => t.id === payload.ticket_id);
    if (idx === -1) {
      throw new Error('工单不存在');
    }

    const ticket = tickets[idx];
    if (ticket.status === 'closed') {
      throw new Error('工单已关闭，无法回复');
    }

    const users = readUsers();
    const merchant = users.find((u) => u.role === 'merchant' && u.merchant_id === ticket.merchant_id);
    const sender = merchant ?? users.find((u) => u.role === 'buyer');
    if (!sender) {
      throw new Error('发送者不存在');
    }

    if (ticket.status === 'open' && sender.role === 'merchant') {
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
    writeTickets(tickets);
    return message;
  }

  async listDeliverySlots(merchantId: number): Promise<DeliverySlot[]> {
    return readDeliverySlots()
      .filter((s) => s.merchant_id === merchantId && s.is_active)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  async createDeliverySlot(
    merchantId: number,
    payload: Omit<DeliverySlot, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>
  ): Promise<DeliverySlot> {
    const slots = readDeliverySlots();
    const now = new Date().toISOString();
    const newSlot: DeliverySlot = {
      id: nextId(slots),
      merchant_id: merchantId,
      start_time: payload.start_time,
      end_time: payload.end_time,
      capacity: payload.capacity,
      is_active: payload.is_active,
      created_at: now,
      updated_at: now
    };
    slots.push(newSlot);
    writeDeliverySlots(slots);
    return newSlot;
  }

  async updateDeliverySlot(
    slotId: number,
    payload: Partial<Omit<DeliverySlot, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>>
  ): Promise<DeliverySlot> {
    const slots = readDeliverySlots();
    const idx = slots.findIndex((s) => s.id === slotId);
    if (idx === -1) {
      throw new Error('时段不存在');
    }
    slots[idx] = {
      ...slots[idx],
      ...payload,
      updated_at: new Date().toISOString()
    };
    writeDeliverySlots(slots);
    return slots[idx];
  }

  async deleteDeliverySlot(slotId: number): Promise<void> {
    const slots = readDeliverySlots();
    const filtered = slots.filter((s) => s.id !== slotId);
    writeDeliverySlots(filtered);
  }

  async listAvailableDeliverySlots(merchantId: number, dateStr: string): Promise<DeliverySlotWithAvailability[]> {
    const slots = await this.listDeliverySlots(merchantId);
    const orders = readOrders();
    const today = new Date().toISOString().split('T')[0];

    if (dateStr < today) {
      throw new Error('不能选择过去的日期');
    }

    const usedCounts = new Map<number, number>();
    for (const order of orders) {
      if (
        order.merchant_id === merchantId &&
        order.scheduled_date === dateStr &&
        order.scheduled_slot &&
        ['pending', 'confirmed', 'delivering', 'pickup_ready', 'completed'].includes(order.status)
      ) {
        const slotId = typeof order.scheduled_slot === 'object' ? order.scheduled_slot.id : order.scheduled_slot;
        usedCounts.set(slotId, (usedCounts.get(slotId) || 0) + 1);
      }
    }

    return slots.map((slot) => {
      const usedCount = usedCounts.get(slot.id) || 0;
      return {
        ...slot,
        scheduled_date: dateStr,
        used_count: usedCount,
        available: usedCount < slot.capacity
      };
    });
  }
}
