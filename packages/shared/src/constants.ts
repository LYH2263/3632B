import type { AfterSaleReason, AfterSaleRejectReason, AfterSaleStatus, CouponStatus, OrderStatus } from './types';

export const STORAGE_KEYS = {
  merchants: 'community_store_merchants',
  products: 'community_store_products',
  orders: 'community_store_orders',
  cart: 'community_store_cart',
  users: 'community_store_users',
  auth: 'community_store_auth',
  coupon_templates: 'community_store_coupon_templates',
  user_coupons: 'community_store_user_coupons',
  coupon_redeem_records: 'community_store_coupon_redeem_records',
  reviews: 'community_store_reviews',
  aftersales: 'community_store_aftersales'
} as const;

export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = {
  available: '可使用',
  used: '已使用',
  expired: '已过期'
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待确认',
  confirmed: '待配送',
  delivering: '配送中',
  completed: '已完成',
  canceled: '已取消',
  refunded: '已退款'
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'canceled'],
  confirmed: ['delivering'],
  delivering: ['completed'],
  completed: [],
  canceled: [],
  refunded: []
};

export const OFFLINE_PAYMENT_TEXT = '线下支付（货到付款或到店支付）';

export const AFTERSALE_REASON_LABELS: Record<AfterSaleReason, string> = {
  quality: '商品质量问题',
  wrong: '发错商品',
  damaged: '商品破损',
  not_received: '未收到货',
  other: '其他原因'
};

export const AFTERSALE_STATUS_LABELS: Record<AfterSaleStatus, string> = {
  pending: '待审核',
  approved: '已同意',
  rejected: '已拒绝'
};

export const AFTERSALE_REJECT_REASON_LABELS: Record<AfterSaleRejectReason, string> = {
  evidence_insufficient: '证据不足',
  wrong_procedure: '流程不符',
  timeout: '超出申请时限',
  other: '其他原因'
};
