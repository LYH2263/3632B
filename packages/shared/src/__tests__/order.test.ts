import { describe, expect, it } from 'vitest';
import {
  canTransitionStatus,
  createOrderFromCart,
  emptyCart,
  seedMerchants,
  seedProducts,
  validateCartForCheckout
} from '../index';

describe('订单状态机', () => {
  it('支持 pending -> confirmed，不支持 completed -> pending', () => {
    expect(canTransitionStatus('pending', 'confirmed')).toBe(true);
    expect(canTransitionStatus('completed', 'pending')).toBe(false);
  });

  it('confirmed 状态可转向 delivering 或 pickup_ready', () => {
    expect(canTransitionStatus('confirmed', 'delivering')).toBe(true);
    expect(canTransitionStatus('confirmed', 'pickup_ready')).toBe(true);
  });

  it('pickup_ready 状态可转向 completed', () => {
    expect(canTransitionStatus('pickup_ready', 'completed')).toBe(true);
  });
});

describe('购物车校验', () => {
  it('库存不足时阻止提交', () => {
    const merchant = seedMerchants[0];
    const cart = {
      merchant_id: merchant.id,
      updated_at: new Date().toISOString(),
      items: [{ product_id: 1001, quantity: 999 }]
    };

    const validation = validateCartForCheckout(
      cart,
      merchant,
      seedProducts.filter((item) => item.merchant_id === merchant.id)
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors.join('')).toContain('超过库存限制');
  });

  it('空购物车应返回错误', () => {
    const merchant = seedMerchants[0];
    const cart = {
      ...emptyCart,
      merchant_id: merchant.id
    };
    const validation = validateCartForCheckout(
      cart,
      merchant,
      seedProducts.filter((item) => item.merchant_id === merchant.id)
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('购物车为空');
  });
});

describe('下单创建', () => {
  it('起送价满足后可创建 pending 订单且支付方式为 offline', () => {
    const merchant = seedMerchants[0];
    const cart = {
      merchant_id: merchant.id,
      updated_at: new Date().toISOString(),
      items: [
        { product_id: 1001, quantity: 5 },
        { product_id: 1002, quantity: 3 }
      ]
    };

    const order = createOrderFromCart({
      orderId: 1,
      buyerId: 1,
      payload: {
        buyer_id: 1,
        merchant_id: merchant.id,
        fulfillment_type: 'delivery',
        receiver_name: '测试用户',
        receiver_phone: '13800138000',
        receiver_address: '幸福社区 8 栋',
        remark: '请尽快配送'
      },
      merchant,
      cart,
      products: seedProducts.filter((item) => item.merchant_id === merchant.id)
    });

    expect(order.status).toBe('pending');
    expect(order.pay_method).toBe('offline');
    expect(order.fulfillment_type).toBe('delivery');
    expect(order.items_snapshot.length).toBe(2);
    expect(order.delivery_fee).toBe(merchant.delivery_fee);
    expect(order.total_amount).toBeGreaterThan(order.items_amount);
  });

  it('自提订单免配送费且地址可选填', () => {
    const merchant = seedMerchants[0];
    const cart = {
      merchant_id: merchant.id,
      updated_at: new Date().toISOString(),
      items: [
        { product_id: 1001, quantity: 5 }
      ]
    };

    const order = createOrderFromCart({
      orderId: 2,
      buyerId: 1,
      payload: {
        buyer_id: 1,
        merchant_id: merchant.id,
        fulfillment_type: 'pickup',
        receiver_name: '测试用户',
        receiver_phone: '13800138000',
        receiver_address: '',
        remark: '下午来取'
      },
      merchant,
      cart,
      products: seedProducts.filter((item) => item.merchant_id === merchant.id)
    });

    expect(order.fulfillment_type).toBe('pickup');
    expect(order.delivery_fee).toBe(merchant.pickup_fee);
    expect(order.receiver_address).toBe(merchant.address);
    expect(order.items_snapshot.length).toBe(1);
  });
});
