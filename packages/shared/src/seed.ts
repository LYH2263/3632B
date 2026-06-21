import type {
  Announcement,
  Cart,
  CouponTemplate,
  DeliverySlot,
  Merchant,
  Product,
  ProductReview,
  Promotion,
  Ticket,
  User,
  UserCoupon
} from './types';

export const seedUsers: User[] = [
  {
    id: 1,
    username: 'buyer',
    password: 'buyer123',
    role: 'buyer',
    nickname: '社区住户',
    phone: '13800138000'
  },
  {
    id: 2,
    username: 'merchant_fruit',
    password: 'merchant123',
    role: 'merchant',
    merchant_id: 1,
    nickname: '鲜果超市店主',
    phone: '13900001111'
  },
  {
    id: 3,
    username: 'merchant_market',
    password: 'merchant123',
    role: 'merchant',
    merchant_id: 2,
    nickname: '便民小超店主',
    phone: '13900002222'
  },
  {
    id: 4,
    username: 'merchant_bakery',
    password: 'merchant123',
    role: 'merchant',
    merchant_id: 3,
    nickname: '晨光面包坊店主',
    phone: '13900003333'
  }
];

function getSeedDateRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 7);
  const to = new Date(now);
  to.setDate(now.getDate() + 30);
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

const seedDateRange = getSeedDateRange();

export const seedCouponTemplates: CouponTemplate[] = [
  {
    id: 1,
    name: '新人专享满30减10',
    type: 'full_reduction',
    threshold_amount: 30,
    discount_amount: 10,
    valid_from: seedDateRange.from,
    valid_to: seedDateRange.to,
    total_quantity: 100,
    claimed_quantity: 0,
    per_user_limit: 1,
    include_delivery_fee: false,
    description: '新用户专享，满30元减10元，不含配送费'
  },
  {
    id: 2,
    name: '满50减15',
    type: 'full_reduction',
    threshold_amount: 50,
    discount_amount: 15,
    valid_from: seedDateRange.from,
    valid_to: seedDateRange.to,
    total_quantity: 200,
    claimed_quantity: 0,
    per_user_limit: 2,
    include_delivery_fee: true,
    description: '满50元减15元，含配送费'
  },
  {
    id: 3,
    name: '满100减30',
    type: 'full_reduction',
    threshold_amount: 100,
    discount_amount: 30,
    valid_from: seedDateRange.from,
    valid_to: seedDateRange.to,
    total_quantity: 50,
    claimed_quantity: 0,
    per_user_limit: 1,
    include_delivery_fee: true,
    description: '满100元减30元，含配送费'
  }
];

export const seedMerchants: Merchant[] = [
  {
    id: 1,
    name: '鲜果超市',
    phone: '020-11110001',
    address: '幸福社区 1 号楼底商',
    delivery_note: '2 公里内 30 分钟配送',
    min_order_amount: 25,
    delivery_fee: 3,
    is_open: true,
    supports_pickup: true,
    pickup_fee: 0
  },
  {
    id: 2,
    name: '便民小超',
    phone: '020-22220002',
    address: '幸福社区 3 号楼底商',
    delivery_note: '晚 10 点前配送',
    min_order_amount: 18,
    delivery_fee: 2,
    is_open: true,
    supports_pickup: false,
    pickup_fee: 0
  },
  {
    id: 3,
    name: '晨光面包坊',
    phone: '020-33330003',
    address: '幸福社区 5 号楼底商',
    delivery_note: '当日现烤，11 点前下单下午送达',
    min_order_amount: 20,
    delivery_fee: 4,
    is_open: true,
    supports_pickup: true,
    pickup_fee: 0
  }
];

export const seedProducts: Product[] = [
  {
    id: 1001,
    merchant_id: 1,
    name: '红富士苹果',
    price: 6.8,
    unit: '斤',
    stock: 100,
    is_active: true,
    image_url: '/static/images/products/apple.jpg',
    description: '当日新鲜到货，清甜爽口。'
  },
  {
    id: 1002,
    merchant_id: 1,
    name: '进口香蕉',
    price: 5.2,
    unit: '斤',
    stock: 88,
    is_active: true,
    image_url: '/static/images/products/banana.jpg',
    description: '口感软糯，适合家庭早餐。'
  },
  {
    id: 2001,
    merchant_id: 2,
    name: '纯牛奶',
    price: 12.9,
    unit: '瓶',
    stock: 50,
    is_active: true,
    image_url: '/static/images/products/milk.jpg',
    description: '1L 装，冷藏保存。'
  },
  {
    id: 2002,
    merchant_id: 2,
    name: '鸡蛋',
    price: 9.8,
    unit: '盒',
    stock: -1,
    is_active: true,
    image_url: '/static/images/products/egg.jpg',
    description: '10 枚/盒，新鲜农场蛋。'
  },
  {
    id: 1003,
    merchant_id: 1,
    name: '砂糖橘',
    price: 8.5,
    unit: '斤',
    stock: 60,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/ffa500/333333&text=砂糖橘',
    description: '皮薄多汁，当季优选。'
  },
  {
    id: 1004,
    merchant_id: 1,
    name: '阳光玫瑰葡萄',
    price: 22.8,
    unit: '斤',
    stock: 35,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/d4edda/333333&text=葡萄',
    description: '脆甜无籽，适合家庭分享。'
  },
  {
    id: 1005,
    merchant_id: 1,
    name: '鲜榨橙汁',
    price: 15.0,
    unit: '瓶',
    stock: 40,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/ff8c00/333333&text=橙汁',
    description: '500ml 装，无添加。'
  },
  {
    id: 2003,
    merchant_id: 2,
    name: '五常大米',
    price: 39.9,
    unit: '袋',
    stock: 30,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/f5f5dc/333333&text=大米',
    description: '5kg 装，东北优质大米。'
  },
  {
    id: 2004,
    merchant_id: 2,
    name: '抽纸',
    price: 12.5,
    unit: '提',
    stock: 80,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/e8e8e8/333333&text=抽纸',
    description: '3 层 120 抽 × 6 包。'
  },
  {
    id: 2005,
    merchant_id: 2,
    name: '矿泉水',
    price: 2.0,
    unit: '瓶',
    stock: 200,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/b0e0e6/333333&text=矿泉水',
    description: '550ml 装，整箱更优惠。'
  },
  {
    id: 3001,
    merchant_id: 3,
    name: '全麦吐司',
    price: 12.0,
    unit: '袋',
    stock: 25,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/deb887/333333&text=吐司',
    description: '当日现烤，低糖配方。'
  },
  {
    id: 3002,
    merchant_id: 3,
    name: '法式可颂',
    price: 6.5,
    unit: '个',
    stock: 40,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/f4a460/333333&text=可颂',
    description: '黄油层次分明，外酥内软。'
  },
  {
    id: 3003,
    merchant_id: 3,
    name: '鲜奶油蛋糕',
    price: 68.0,
    unit: '盒',
    stock: 8,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/ffb6c1/333333&text=蛋糕',
    description: '6 寸生日蛋糕，需提前 1 天预订。'
  },
  {
    id: 3004,
    merchant_id: 3,
    name: '牛肉三明治',
    price: 15.0,
    unit: '个',
    stock: 20,
    is_active: true,
    image_url: 'https://dummyimage.com/240x240/d2b48c/333333&text=三明治',
    description: '现做现卖，适合早餐或午餐。'
  }
];

export const emptyCart: Cart = {
  merchant_id: null,
  items: [],
  updated_at: new Date(0).toISOString()
};

export const seedAnnouncements: Announcement[] = [
  {
    id: 1,
    title: '社区停水通知',
    content: '各位居民：\n因市政管道维修，本社区将于明日（6月21日）上午9:00-12:00暂停供水，请提前做好储水准备。\n\n如有疑问请联系物业：020-12345678',
    valid_from: new Date(Date.now() - 86400000).toISOString(),
    valid_to: new Date(Date.now() + 86400000 * 2).toISOString(),
    is_pinned: true,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 2,
    title: '端午节促销活动',
    content: '端午佳节来临之际，社区商店全场满100减20！\n\n活动时间：6月22日-6月24日\n参与商家：鲜果超市、便民小超\n\n欢迎大家前来选购！',
    valid_from: new Date(Date.now() - 86400000).toISOString(),
    valid_to: new Date(Date.now() + 86400000 * 7).toISOString(),
    is_pinned: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 3,
    title: '快递驿站营业时间调整',
    content: '自7月1日起，社区快递驿站营业时间调整为：\n工作日：8:00-20:00\n周末：9:00-18:00\n\n请合理安排取件时间。',
    valid_from: new Date(Date.now() + 86400000 * 3).toISOString(),
    valid_to: new Date(Date.now() + 86400000 * 30).toISOString(),
    is_pinned: false,
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

function getPromotionDateRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 1);
  const to = new Date(now);
  to.setDate(now.getDate() + 6);
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

const promotionDateRange = getPromotionDateRange();

export const seedPromotions: Promotion[] = [
  {
    id: 1,
    merchant_id: 1,
    name: '限时特惠-鲜果尝鲜',
    description: '新鲜水果限时特价，红富士苹果4.8元/斤，进口香蕉3.8元/斤，限时一周！',
    start_at: promotionDateRange.from,
    end_at: promotionDateRange.to,
    status: 'active',
    items: [
      {
        id: 1,
        product_id: 1001,
        product_name: '红富士苹果',
        original_price: 6.8,
        promo_price: 4.8,
        promo_stock: 50,
        sold_quantity: 0
      },
      {
        id: 2,
        product_id: 1002,
        product_name: '进口香蕉',
        original_price: 5.2,
        promo_price: 3.8,
        promo_stock: -1,
        sold_quantity: 0
      }
    ],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 2,
    merchant_id: 2,
    name: '乳品特惠-周末狂欢',
    description: '纯牛奶 10.9 元/瓶，限时三天！',
    start_at: promotionDateRange.from,
    end_at: promotionDateRange.to,
    status: 'active',
    items: [
      {
        id: 3,
        product_id: 2001,
        product_name: '纯牛奶',
        original_price: 12.9,
        promo_price: 10.9,
        promo_stock: 30,
        sold_quantity: 5
      }
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 3,
    merchant_id: 3,
    name: '烘焙新品-第二件半价',
    description: '法式可颂、牛肉三明治参与第二件半价活动。',
    start_at: promotionDateRange.from,
    end_at: promotionDateRange.to,
    status: 'active',
    items: [
      {
        id: 4,
        product_id: 3002,
        product_name: '法式可颂',
        original_price: 6.5,
        promo_price: 4.9,
        promo_stock: -1,
        sold_quantity: 12
      },
      {
        id: 5,
        product_id: 3004,
        product_name: '牛肉三明治',
        original_price: 15.0,
        promo_price: 12.0,
        promo_stock: 15,
        sold_quantity: 3
      }
    ],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const now = new Date().toISOString();

export const seedDeliverySlots: DeliverySlot[] = [
  {
    id: 1,
    merchant_id: 1,
    start_time: '09:00',
    end_time: '11:00',
    capacity: 10,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 2,
    merchant_id: 1,
    start_time: '11:00',
    end_time: '13:00',
    capacity: 8,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 3,
    merchant_id: 1,
    start_time: '14:00',
    end_time: '16:00',
    capacity: 12,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 4,
    merchant_id: 1,
    start_time: '16:00',
    end_time: '18:00',
    capacity: 15,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 5,
    merchant_id: 1,
    start_time: '18:00',
    end_time: '20:00',
    capacity: 10,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 6,
    merchant_id: 2,
    start_time: '10:00',
    end_time: '12:00',
    capacity: 6,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 7,
    merchant_id: 2,
    start_time: '15:00',
    end_time: '17:00',
    capacity: 6,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 8,
    merchant_id: 2,
    start_time: '17:00',
    end_time: '19:00',
    capacity: 8,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 9,
    merchant_id: 3,
    start_time: '08:00',
    end_time: '10:00',
    capacity: 5,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 10,
    merchant_id: 3,
    start_time: '11:00',
    end_time: '13:00',
    capacity: 8,
    is_active: true,
    created_at: now,
    updated_at: now
  },
  {
    id: 11,
    merchant_id: 3,
    start_time: '15:00',
    end_time: '17:00',
    capacity: 6,
    is_active: true,
    created_at: now,
    updated_at: now
  }
];

export const seedUserCoupons: UserCoupon[] = [
  {
    id: 1,
    user_id: 1,
    template_id: 1,
    status: 'available',
    claimed_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    template: seedCouponTemplates[0]
  },
  {
    id: 2,
    user_id: 1,
    template_id: 2,
    status: 'available',
    claimed_at: new Date(Date.now() - 86400000).toISOString(),
    template: seedCouponTemplates[1]
  }
];

export const seedReviews: ProductReview[] = [
  {
    id: 1,
    order_id: 10001,
    product_id: 1001,
    buyer_id: 1,
    merchant_id: 1,
    rating: 5,
    content: '苹果很新鲜，甜度刚好，会继续回购。',
    reply: '感谢支持，欢迎常来！',
    reply_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    product_name: '红富士苹果',
    product_image_url: '/static/images/products/apple.jpg',
    buyer_nickname: '社区住户',
    order_no: 'ORD202506150001'
  },
  {
    id: 2,
    order_id: 10002,
    product_id: 2001,
    buyer_id: 1,
    merchant_id: 2,
    rating: 4,
    content: '牛奶日期新鲜，配送也快。',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    product_name: '纯牛奶',
    product_image_url: '/static/images/products/milk.jpg',
    buyer_nickname: '社区住户',
    order_no: 'ORD202506160002'
  },
  {
    id: 3,
    order_id: 10003,
    product_id: 3002,
    buyer_id: 1,
    merchant_id: 3,
    rating: 5,
    content: '可颂外酥内软，早餐首选！',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    product_name: '法式可颂',
    product_image_url: 'https://dummyimage.com/240x240/f4a460/333333&text=可颂',
    buyer_nickname: '社区住户',
    order_no: 'ORD202506180003'
  }
];

const ticketCreatedAt = new Date(Date.now() - 86400000 * 2).toISOString();
const ticketUpdatedAt = new Date(Date.now() - 86400000).toISOString();

export const seedTickets: Ticket[] = [
  {
    id: 1,
    buyer_id: 1,
    buyer_nickname: '社区住户',
    merchant_id: 1,
    merchant_name: '鲜果超市',
    order_id: 10001,
    order_no: 'ORD202506150001',
    type: 'delivery',
    title: '配送超时咨询',
    description: '订单比预计时间晚了约 20 分钟，想确认原因。',
    status: 'resolved',
    messages: [
      {
        id: 1,
        ticket_id: 1,
        sender_id: 1,
        sender_nickname: '社区住户',
        sender_role: 'buyer',
        content: '订单比预计时间晚了约 20 分钟，想确认原因。',
        created_at: ticketCreatedAt
      },
      {
        id: 2,
        ticket_id: 1,
        sender_id: 2,
        sender_nickname: '鲜果超市店主',
        sender_role: 'merchant',
        content: '抱歉给您带来不便，当日订单量较大导致延迟，已为您备注优先配送。',
        created_at: ticketUpdatedAt
      }
    ],
    created_at: ticketCreatedAt,
    updated_at: ticketUpdatedAt
  },
  {
    id: 2,
    buyer_id: 1,
    buyer_nickname: '社区住户',
    merchant_id: 2,
    merchant_name: '便民小超',
    order_id: null,
    order_no: null,
    type: 'product',
    title: '咨询鸡蛋库存',
    description: '请问农场鸡蛋还有货吗？能否预留一盒？',
    status: 'open',
    messages: [
      {
        id: 3,
        ticket_id: 2,
        sender_id: 1,
        sender_nickname: '社区住户',
        sender_role: 'buyer',
        content: '请问农场鸡蛋还有货吗？能否预留一盒？',
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  }
];
