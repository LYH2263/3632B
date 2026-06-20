<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section v-if="merchant" data-testid="checkout-page">
        <article class="card" data-testid="checkout-header-card">
          <h2 data-testid="checkout-merchant-name">购物车结算 - {{ merchant.name }}</h2>
          <p class="muted" data-testid="checkout-payment-method">支付方式：线下支付（货到付款/到店支付）</p>
        </article>

        <article class="card" v-if="cartItems.length" data-testid="checkout-cart-card">
          <div class="table-wrap">
            <view class="table" data-testid="checkout-cart-table">
              <view class="table-head">
                <view class="table-th table-cell-name">商品</view>
                <view class="table-th table-cell-price">单价</view>
                <view class="table-th table-cell-qty">数量</view>
                <view class="table-th table-cell-subtotal">小计</view>
              </view>
              <view
                v-for="item in cartItems"
                :key="item.product.id"
                class="table-row"
                :data-testid="`checkout-item-row-${item.product.id}`"
              >
                <view class="table-td table-cell-name">{{ item.product.name }}</view>
                <view class="table-td table-cell-price">{{ formatMoney(item.product.price) }}</view>
                <view class="table-td table-cell-qty">
                  <div class="counter">
                    <button :data-testid="`checkout-item-minus-${item.product.id}`" @click="adjust(item.product, -1)">
                      -
                    </button>
                    <span class="counter-value" :data-testid="`checkout-item-quantity-${item.product.id}`">{{ item.quantity }}</span>
                    <button :data-testid="`checkout-item-plus-${item.product.id}`" @click="adjust(item.product, 1)">
                      +
                    </button>
                  </div>
                </view>
                <view class="table-td table-cell-subtotal">{{ formatMoney(item.subtotal) }}</view>
              </view>
            </view>
          </div>

          <p data-testid="checkout-items-amount">商品合计：<strong class="price">{{ formatMoney(itemsAmount) }}</strong></p>
          <p data-testid="checkout-delivery-fee">配送费：<strong class="price">{{ formatMoney(merchant.delivery_fee) }}</strong></p>
          <p v-if="discountAmount > 0" data-testid="checkout-discount">优惠券抵扣：<strong class="price discount">-{{ formatMoney(discountAmount) }}</strong></p>
          <p data-testid="checkout-total-amount">总金额：<strong class="price">{{ formatMoney(totalAmount) }}</strong></p>
          <p v-if="itemsAmount < merchant.min_order_amount" class="muted" data-testid="checkout-min-order-tip">
            当前未达到起送价：{{ formatMoney(merchant.min_order_amount) }}
          </p>
        </article>

        <article class="card coupon-card" data-testid="checkout-coupon-card" @click="openCouponPicker" @tap="openCouponPicker">
          <view class="coupon-card-header">
            <span class="coupon-icon">🎫</span>
            <span class="coupon-label">优惠券</span>
          </view>
          <view class="coupon-card-content">
            <template v-if="selectedCoupon">
              <span class="coupon-name">{{ selectedCoupon.template.name }}</span>
              <span class="coupon-discount">-¥{{ selectedCoupon.template.discount_amount.toFixed(2) }}</span>
            </template>
            <template v-else>
              <span class="coupon-placeholder">
                {{ availableCoupons.length > 0 ? `${availableCoupons.length} 张可用` : '暂无可用优惠券' }}
              </span>
            </template>
            <span class="coupon-arrow">›</span>
          </view>
        </article>

        <p v-else class="muted" data-testid="checkout-cart-empty">购物车为空。</p>

        <article class="card" data-testid="checkout-form-card">
          <h3>收货信息</h3>
          <div class="field">
            <label for="checkout-receiver-name">姓名 *</label>
            <input
              id="checkout-receiver-name"
              v-model="form.receiver_name"
              data-testid="checkout-receiver-name"
              placeholder="请输入收货人"
            />
          </div>
          <div class="field">
            <label for="checkout-receiver-phone">手机号 *</label>
            <input
              id="checkout-receiver-phone"
              v-model="form.receiver_phone"
              data-testid="checkout-receiver-phone"
              placeholder="请输入手机号"
            />
          </div>
          <div class="field">
            <label for="checkout-receiver-address">地址 *</label>
            <input
              id="checkout-receiver-address"
              v-model="form.receiver_address"
              data-testid="checkout-receiver-address"
              placeholder="请输入收货地址"
            />
          </div>
          <div class="field">
            <label for="checkout-remark">备注</label>
            <textarea
              id="checkout-remark"
              v-model="form.remark"
              data-testid="checkout-remark"
              placeholder="如：请放门卫室"
            ></textarea>
          </div>
          <button
            class="primary"
            data-testid="checkout-submit"
            :disabled="submitting"
            @click="submitOrder"
            @tap="submitOrder"
          >
            {{ submitting ? '提交中...' : '提交订单' }}
          </button>
          <view v-if="submitFeedback" class="checkout-submit-feedback" data-testid="checkout-submit-feedback">
            {{ submitFeedback }}
          </view>
        </article>
      </section>

      <view v-if="couponPickerVisible" class="coupon-picker-mask" @click="closeCouponPicker" @tap="closeCouponPicker">
        <view class="coupon-picker-panel" @click.stop @tap.stop>
          <view class="coupon-picker-header">
            <text class="coupon-picker-title">选择优惠券</text>
            <text class="coupon-picker-close" @click="closeCouponPicker" @tap="closeCouponPicker">✕</text>
          </view>
          <scroll-view class="coupon-picker-list" scroll-y>
            <view
              class="coupon-item"
              :class="{ selected: selectedCouponId === null }"
              @click="selectCoupon(null)"
              @tap="selectCoupon(null)"
              data-testid="coupon-item-none"
            >
              <view class="coupon-item-main">
                <text class="coupon-item-name">不使用优惠券</text>
              </view>
            </view>
            <view
              v-for="coupon in availableCoupons"
              :key="coupon.id"
              class="coupon-item"
              :class="{ selected: selectedCouponId === coupon.id }"
              @click="selectCoupon(coupon)"
              @tap="selectCoupon(coupon)"
              :data-testid="`coupon-item-${coupon.id}`"
            >
              <view class="coupon-item-main">
                <text class="coupon-item-name">{{ coupon.template.name }}</text>
                <text class="coupon-item-desc">{{ coupon.template.description }}</text>
              </view>
              <view class="coupon-item-amount">
                <text class="coupon-item-value">-¥{{ coupon.template.discount_amount.toFixed(2) }}</text>
                <text class="coupon-item-threshold">满{{ coupon.template.threshold_amount }}可用</text>
              </view>
            </view>
            <view v-if="!availableCoupons.length && !loadingCoupons" class="coupon-empty">
              <text>暂无可用优惠券</text>
              <button class="primary small" @click="goToCouponCenter" @tap="goToCouponCenter">去领券中心</button>
            </view>
          </scroll-view>
        </view>
      </view>

      <p v-else class="muted" data-testid="checkout-merchant-missing">请先从商家页添加商品。</p>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  validateCartForCheckout,
  validateCheckoutPayload,
  type CheckoutPayload,
  type Merchant,
  type Product,
  type UserCoupon
} from '@community-store/shared';
import { computed, reactive, ref, watch } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { useCartStore } from '../../stores/cart';
import { useSessionStore } from '../../stores/session';
import { showMessage } from '../../utils/ui';
import { numberOption, redirectTo, navigateTo } from '../../utils/navigation';

const dataSource = getDataSource();
const cartStore = useCartStore();
const sessionStore = useSessionStore();

const merchant = ref<Merchant | null>(null);
const products = ref<Product[]>([]);
const submitting = ref(false);
const submitFeedback = ref('');
const availableCoupons = ref<UserCoupon[]>([]);
const selectedCouponId = ref<number | null>(null);
const couponPickerVisible = ref(false);
const loadingCoupons = ref(false);
const form = reactive({
  receiver_name: '',
  receiver_phone: '',
  receiver_address: '',
  remark: ''
});

const routeMerchantId = ref(0);

const merchantId = computed(() => {
  const fromRoute = routeMerchantId.value;
  if (fromRoute > 0) {
    return fromRoute;
  }
  return cartStore.state.cart.merchant_id ?? 0;
});

const cartItems = computed(() => {
  const productMap = new Map(products.value.map((item) => [item.id, item]));
  return cartStore.state.cart.items
    .map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        return null;
      }
      return {
        product,
        quantity: item.quantity,
        subtotal: product.price * item.quantity
      };
    })
    .filter((item): item is { product: Product; quantity: number; subtotal: number } =>
      item !== null
    );
});

const itemsAmount = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item.subtotal, 0)
);

const selectedCoupon = computed(() => {
  return availableCoupons.value.find((c) => c.id === selectedCouponId.value) ?? null;
});

const discountAmount = computed(() => {
  if (!selectedCoupon.value) {
    return 0;
  }
  return selectedCoupon.value.template.discount_amount;
});

const totalAmount = computed(() => {
  if (!merchant.value) {
    return itemsAmount.value;
  }
  const total = itemsAmount.value + merchant.value.delivery_fee - discountAmount.value;
  return Math.max(0, total);
});

async function loadData(): Promise<void> {
  await cartStore.ensureLoaded();
  if (!merchantId.value) {
    return;
  }

  merchant.value = await dataSource.getMerchant(merchantId.value);
  if (!merchant.value) {
    return;
  }

  products.value = await dataSource.listProducts(merchant.value.id);
  await loadAvailableCoupons();
}

async function loadAvailableCoupons(): Promise<void> {
  if (!merchant.value || !sessionStore.state.user?.id) {
    return;
  }
  if (!itemsAmount.value) {
    availableCoupons.value = [];
    return;
  }
  try {
    loadingCoupons.value = true;
    availableCoupons.value = await dataSource.listAvailableCouponsForCart(
      sessionStore.state.user.id,
      merchant.value.id,
      itemsAmount.value,
      merchant.value.delivery_fee
    );
    if (selectedCouponId.value) {
      const stillAvailable = availableCoupons.value.some(
        (c) => c.id === selectedCouponId.value
      );
      if (!stillAvailable) {
        selectedCouponId.value = null;
      }
    }
  } catch (error) {
    console.error('加载可用优惠券失败', error);
  } finally {
    loadingCoupons.value = false;
  }
}

function openCouponPicker(): void {
  couponPickerVisible.value = true;
}

function closeCouponPicker(): void {
  couponPickerVisible.value = false;
}

function selectCoupon(coupon: UserCoupon | null): void {
  selectedCouponId.value = coupon?.id ?? null;
  couponPickerVisible.value = false;
}

function goToCouponCenter(): void {
  navigateTo('pages/coupon/center');
}

async function adjust(product: Product, step: number): Promise<void> {
  if (!merchant.value) {
    return;
  }
  try {
    await cartStore.addItem(product, merchant.value.id, step);
  } catch (error) {
    showMessage((error as Error).message);
  }
}

async function submitOrder(): Promise<void> {
  if (submitting.value) {
    return;
  }
  submitFeedback.value = '正在提交，请稍候...';
  if (typeof uni !== 'undefined' && typeof uni.hideKeyboard === 'function') {
    uni.hideKeyboard();
  }

  if (!merchant.value) {
    const message = '请选择商家';
    submitFeedback.value = message;
    showMessage(message);
    return;
  }

  try {
    const payload: CheckoutPayload & { coupon_id?: number } = {
      buyer_id: sessionStore.state.user.id,
      merchant_id: merchant.value.id,
      receiver_name: form.receiver_name,
      receiver_phone: form.receiver_phone,
      receiver_address: form.receiver_address,
      remark: form.remark,
      coupon_id: selectedCouponId.value ?? undefined
    };

    const payloadErrors = validateCheckoutPayload(payload);
    const cartValidation = validateCartForCheckout(
      cartStore.state.cart,
      merchant.value,
      products.value
    );

    const errors = [...payloadErrors, ...cartValidation.errors];
    if (errors.length) {
      submitFeedback.value = errors[0];
      showMessage(errors[0]);
      return;
    }

    submitting.value = true;
    const order = await dataSource.createOrder(payload);
    await cartStore.clearCart();
    submitFeedback.value = '下单成功，正在跳转...';
    showMessage('下单成功');
    redirectTo('pages/order/detail', {
      orderId: order.id
    });
  } catch (error) {
    const message = (error as Error).message || '提交订单失败';
    submitFeedback.value = message;
    showMessage(message);
  } finally {
    submitting.value = false;
  }
}

watch(
  () => itemsAmount.value,
  () => {
    if (merchant.value) {
      loadAvailableCoupons();
    }
  }
);

onLoad((options) => {
  routeMerchantId.value = numberOption(options, 'merchantId', 0);
});

onShow(loadData);
</script>
