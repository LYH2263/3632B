<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <section v-if="pendingItems.length > 0" data-testid="review-create-page">
        <view
          v-for="(item, index) in formItems"
          :key="item.product_id"
          class="card review-item-card"
          :data-testid="`review-item-${item.product_id}`"
        >
          <view class="review-product-row">
            <image
              class="review-product-image"
              :src="item.image_url || defaultProductImage"
              mode="aspectFill"
            />
            <view class="review-product-info">
              <h3 class="review-product-name">{{ item.name }}</h3>
              <p class="muted review-product-meta">
                {{ formatMoney(item.price) }}/{{ item.unit }} × {{ item.quantity }}
              </p>
            </view>
          </view>

          <view class="rating-section">
            <text class="rating-label">评分</text>
            <view class="star-row" :data-testid="`review-stars-${item.product_id}`">
              <view
                v-for="s in 5"
                :key="s"
                class="star"
                :class="{ active: s <= ratings[index] }"
                @click="setRating(index, s)"
              >★</view>
            </view>
            <text class="rating-text muted">{{ ratingText(ratings[index]) }}</text>
          </view>

          <textarea
            class="review-textarea"
            v-model="contents[index]"
            placeholder="分享您的使用体验（500字内）"
            maxlength="500"
            :data-testid="`review-content-${item.product_id}`"
          />
          <view class="textarea-count muted">{{ contents[index].length }}/500</view>
        </view>

        <view class="review-action-bar">
          <button
            class="primary review-submit-btn"
            :disabled="!canSubmit || submitting"
            :data-testid="review-submit-btn"
            @click="submitReviews"
          >
            {{ submitting ? '提交中...' : '提交评价' }}
          </button>
        </view>
      </section>

      <view v-else class="empty-state">
        <p class="muted" data-testid="review-empty-text">该订单没有待评价的商品。</p>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ProductReview } from '@community-store/shared';
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { formatMoney } from '../../services/format';
import { showMessage } from '../../utils/ui';
import { navigateBack, numberOption } from '../../utils/navigation';

const dataSource = getDataSource();
const defaultProductImage = '/static/images/products/default.jpg';

interface PendingItem {
  product_id: number;
  name: string;
  image_url: string;
  unit: string;
  price: number;
  quantity: number;
}

const orderId = ref(0);
const pendingItems = ref<PendingItem[]>([]);
const formItems = ref<PendingItem[]>([]);
const ratings = ref<number[]>([]);
const contents = ref<string[]>([]);
const submitting = ref(false);

const canSubmit = computed(() => {
  if (!formItems.value.length) return false;
  return ratings.value.every((r) => r >= 1 && r <= 5);
});

function ratingText(rating: number): string {
  const map: Record<number, string> = {
    1: '非常差',
    2: '较差',
    3: '一般',
    4: '满意',
    5: '非常满意'
  };
  return map[rating] || '';
}

function setRating(index: number, star: number): void {
  ratings.value[index] = star;
}

async function loadPending(): Promise<void> {
  if (!orderId.value) return;
  try {
    pendingItems.value = await dataSource.getPendingReviewsByOrder(orderId.value);
    formItems.value = [...pendingItems.value];
    ratings.value = formItems.value.map(() => 5);
    contents.value = formItems.value.map(() => '');
  } catch (error) {
    showMessage((error as Error).message);
  }
}

async function submitReviews(): Promise<void> {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;

  try {
    const results: ProductReview[] = [];
    for (let i = 0; i < formItems.value.length; i++) {
      const result = await dataSource.createReview({
        order_id: orderId.value,
        product_id: formItems.value[i].product_id,
        rating: ratings.value[i],
        content: contents.value[i]
      });
      results.push(result);
    }
    showMessage(`已成功提交 ${results.length} 条评价`);
    setTimeout(() => navigateBack(), 800);
  } catch (error) {
    showMessage((error as Error).message);
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  orderId.value = numberOption(options, 'orderId', 0);
});

onShow(loadPending);
</script>
