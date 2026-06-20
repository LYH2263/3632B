import {
  canTransitionStatus,
  createOrderFromCart,
  emptyCart,
  filterAvailableCoupons,
  validateUserCoupon,
  type Cart,
  type CheckoutPayload,
  type CouponRedeemRecord,
  type CouponTemplate,
  type CouponValidationResult,
  type CreateReviewPayload,
  type DataSource,
  type LoginPayload,
  type LoginResult,
  type Merchant,
  type Order,
  type OrderStatus,
  type Product,
  type ProductReview,
  type ProductReviewSummary,
  type ReplyReviewPayload,
  type UserCoupon,
  type CouponStatus
} from '@community-store/shared';
import {
  ensureMockDB,
  readCart,
  readCouponRedeemRecords,
  readCouponTemplates,
  readMerchants,
  readOrders,
  readProducts,
  readReviews,
  readUserCoupons,
  readUsers,
  writeCart,
  writeCouponRedeemRecords,
  writeCouponTemplates,
  writeMerchants,
  writeOrders,
  writeReviews,
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
    return readProducts().filter((product) => {
      if (product.merchant_id !== merchantId) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      return product.name.toLowerCase().includes(normalizedKeyword);
    });
  }

  async getProduct(productId: number): Promise<Product | null> {
    return readProducts().find((item) => item.id === productId) ?? null;
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
}
