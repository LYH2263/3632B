import type { Announcement, Cart, CouponTemplate, Merchant, Product, User } from './types';

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
