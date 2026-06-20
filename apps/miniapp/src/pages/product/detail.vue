<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section v-if="product && merchant" data-testid="product-detail-page">
        <article class="card product-detail-card" data-testid="product-detail-card">
          <image
            class="product-hero-image"
            :src="product.image_url || defaultProductImage"
            mode="aspectFill"
            data-testid="product-image"
          />
          <div class="product-detail-body">
            <h2 class="product-detail-title" data-testid="product-name">
              {{ product.name }}
              <text v-if="product.promotion" class="promotion-tag">限时特价</text>
            </h2>
            <div class="product-detail-price-row">
              <div>
                <text v-if="product.promotion" class="price promotion-price" data-testid="product-price">
                  {{ formatMoney(product.promotion.promo_price) }}<span class="unit">/{{ product.unit }}</span>
                </text>
                <text v-else class="price" data-testid="product-price">
                  {{ formatMoney(product.price) }}<span class="unit">/{{ product.unit }}</span>
                </text>
                <text v-if="product.promotion" class="original-price">
                  ¥{{ formatMoney(product.promotion.original_price) }}
                </text>
              </div>
              <p class="muted stock-label" data-testid="product-stock">
                库存：{{ product.promotion?.promo_stock === -1 ? '不限' : (product.promotion?.promo_stock ?? (product.stock === -1 ? '不限' : product.stock)) }}
              </p>
            </div>

            <view v-if="product.promotion" class="promotion-info-box">
              <text class="promotion-info-title">{{ product.promotion.promotion_name }}</text>
              <text class="promotion-info-time">⏰ {{ formatPromotionTimeRange(product.promotion.start_at, product.promotion.end_at) }}</text>
            </view>

            <p class="muted product-detail-desc" data-testid="product-description">{{ product.description || '暂无描述' }}</p>

            <div class="product-detail-quantity">
              <span class="muted">购买数量</span>
              <div class="counter">
                <button data-testid="product-minus" @click="changeQuantity(-1)">-</button>
                <span class="counter-value" data-testid="product-quantity">{{ quantity }}</span>
                <button class="primary" data-testid="product-plus" @click="changeQuantity(1)">+</button>
              </div>
            </div>

            <div class="flex-row mt-md">
              <button class="secondary" data-testid="product-back" @click="goBack">返回商品列表</button>
              <button class="primary" data-testid="product-add-cart" @click="addToCart">加入购物车</button>
            </div>
          </div>
        </article>

        <article class="card review-summary-card" data-testid="product-review-summary-card">
          <view class="review-summary-header">
            <view class="review-summary-score">
              <text class="score-number">{{ reviewSummary.average_rating.toFixed(1) }}</text>
              <view class="score-stars">
                <view
                  v-for="s in 5"
                  :key="s"
                  class="score-star"
                  :class="{ active: s <= Math.round(reviewSummary.average_rating) }"
                >★</view>
              </view>
              <text class="score-count muted">共 {{ reviewSummary.review_count }} 条评价</text>
            </view>
          </view>

          <view class="review-summary-bars" v-if="reviewSummary.review_count > 0">
            <view class="bar-row">
              <text class="bar-label">5星</text>
              <view class="bar-bg">
                <view class="bar-fill" :style="{ width: barWidth(5) }"></view>
              </view>
              <text class="bar-count">{{ reviewSummary.five_star_count }}</text>
            </view>
            <view class="bar-row">
              <text class="bar-label">4星</text>
              <view class="bar-bg">
                <view class="bar-fill" :style="{ width: barWidth(4) }"></view>
              </view>
              <text class="bar-count">{{ reviewSummary.four_star_count }}</text>
            </view>
            <view class="bar-row">
              <text class="bar-label">3星</text>
              <view class="bar-bg">
                <view class="bar-fill" :style="{ width: barWidth(3) }"></view>
              </view>
              <text class="bar-count">{{ reviewSummary.three_star_count }}</text>
            </view>
            <view class="bar-row">
              <text class="bar-label">2星</text>
              <view class="bar-bg">
                <view class="bar-fill" :style="{ width: barWidth(2) }"></view>
              </view>
              <text class="bar-count">{{ reviewSummary.two_star_count }}</text>
            </view>
            <view class="bar-row">
              <text class="bar-label">1星</text>
              <view class="bar-bg">
                <view class="bar-fill" :style="{ width: barWidth(1) }"></view>
              </view>
              <text class="bar-count">{{ reviewSummary.one_star_count }}</text>
            </view>
          </view>
        </article>

        <article class="card review-list-card" data-testid="product-review-list-card">
          <view class="review-list-header">
            <text class="review-list-title">最近评价</text>
          </view>

          <view v-if="recentReviews.length === 0" class="review-empty muted" data-testid="product-review-empty">
            暂无评价，快来成为第一个评价的人吧！
          </view>

          <view
            v-for="review in recentReviews"
            :key="review.id"
            class="review-item"
            :data-testid="`product-review-item-${review.id}`"
          >
            <view class="review-item-header">
              <view class="review-user">
                <view class="review-avatar">{{ (review.buyer_nickname || '用户').charAt(0) }}</view>
                <text class="review-user-name">{{ review.buyer_nickname || '匿名用户' }}</text>
              </view>
              <view class="review-stars">
                <view
                  v-for="s in 5"
                  :key="s"
                  class="review-star"
                  :class="{ active: s <= review.rating }"
                >★</view>
              </view>
            </view>
            <view class="review-item-body">
              <text v-if="review.content" class="review-content">{{ review.content }}</text>
              <text v-else class="review-content muted">该用户未填写文字评价</text>
            </view>
            <view class="review-item-footer">
              <text class="review-time muted">{{ formatDate(review.created_at) }}</text>
            </view>
            <view v-if="review.reply" class="review-reply" data-testid="`product-review-reply-${review.id}`">
              <text class="review-reply-label">商家回复：</text>
              <text class="review-reply-content">{{ review.reply }}</text>
            </view>
          </view>
        </article>
      </section>
      <p v-else class="muted" data-testid="product-not-found">商品不存在。</p>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  type Merchant,
  type Product,
  type ProductReview,
  type ProductReviewSummary,
  formatPromotionTimeRange
} from '@community-store/shared';
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { useCartStore } from '../../stores/cart';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { confirmAction, showMessage } from '../../utils/ui';
import { numberOption, redirectTo } from '../../utils/navigation';

const cartStore = useCartStore();
const dataSource = getDataSource();

const product = ref<(Product & { promotion?: any }) | null>(null);
const merchant = ref<Merchant | null>(null);
const quantity = ref(1);
const defaultProductImage = '/static/images/products/default.jpg';

const productId = ref(0);
const merchantId = ref(0);

const reviews = ref<ProductReview[]>([]);
const reviewSummary = ref<ProductReviewSummary>({
  product_id: 0,
  average_rating: 0,
  review_count: 0,
  five_star_count: 0,
  four_star_count: 0,
  three_star_count: 0,
  two_star_count: 0,
  one_star_count: 0
});

const recentReviews = computed(() => reviews.value.slice(0, 10));

function changeQuantity(step: number): void {
  const next = quantity.value + step;
  if (next <= 0) {
    return;
  }
  if (product.value) {
    const promoStock = product.value.promotion?.promo_stock;
    const stock = promoStock === -1 ? product.value.stock : (promoStock ?? product.value.stock);
    if (stock !== -1 && next > stock) {
      showMessage('超过库存上限');
      return;
    }
  }
  quantity.value = next;
}

async function addToCart(): Promise<void> {
  if (!product.value || !merchant.value) {
    return;
  }
  const result = await cartStore.addItem(
    product.value,
    merchant.value.id,
    quantity.value
  );
  if (result.conflict) {
    const shouldSwitch = await confirmAction(
      '订单仅支持单商家。是否清空当前购物车并切换到当前商家？'
    );
    if (!shouldSwitch) {
      return;
    }
    await cartStore.addItem(product.value, merchant.value.id, quantity.value, true);
  }
  showMessage('已加入购物车');
}

function goBack(): void {
  redirectTo('pages/shop/detail', {
    merchantId: merchantId.value
  });
}

function barWidth(star: number): string {
  const total = reviewSummary.value.review_count;
  if (total === 0) return '0%';
  const key = `${['one', 'two', 'three', 'four', 'five'][star - 1]}_star_count` as keyof ProductReviewSummary;
  const count = reviewSummary.value[key] as number;
  return `${(count / total) * 100}%`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadReviews(): Promise<void> {
  if (!productId.value) return;
  try {
    const result = await dataSource.listReviewsByProduct(productId.value);
    reviews.value = result.reviews;
    reviewSummary.value = result.summary;
  } catch (error) {
    // 评价加载失败不影响主流程
  }
}

onLoad((options) => {
  productId.value = numberOption(options, 'productId', 0);
  merchantId.value = numberOption(options, 'merchantId', 0);
});

onShow(async () => {
  await cartStore.ensureLoaded();
  quantity.value = 1;
  product.value = await dataSource.getProduct(productId.value);
  merchant.value = await dataSource.getMerchant(merchantId.value);
  await loadReviews();
});
</script>

<style scoped>
.promotion-tag {
  display: inline-block;
  background: #ff4d4f;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  vertical-align: middle;
}

.promotion-price {
  color: #ff4d4f;
}

.original-price {
  color: #999;
  text-decoration: line-through;
  margin-left: 8px;
  font-size: 12px;
}

.promotion-info-box {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.promotion-info-title {
  color: #d46b08;
  font-weight: 600;
  font-size: 14px;
}

.promotion-info-time {
  color: #d46b08;
  font-size: 12px;
}
</style>
