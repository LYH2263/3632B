<template>
  <view class="app-shell" data-testid="coupon-center-page">
    <AppTopBar />

    <view class="page-body">
      <view class="coupon-tabs">
        <view
          class="coupon-tab"
          :class="{ active: activeTab === 'available' }"
          @click="activeTab = 'available'"
          @tap="activeTab = 'available'"
          data-testid="coupon-tab-available"
        >
          可领取
        </view>
        <view
          class="coupon-tab"
          :class="{ active: activeTab === 'mine' }"
          @click="activeTab = 'mine'"
          @tap="activeTab = 'mine'"
          data-testid="coupon-tab-mine"
        >
          我的优惠券
        </view>
      </view>

      <view v-if="activeTab === 'available'" class="coupon-list">
        <view v-if="loadingTemplates" class="coupon-loading">加载中...</view>
        <view v-else-if="!templates.length" class="coupon-empty">
          <text>暂无可领取的优惠券</text>
        </view>
        <view
          v-for="template in templates"
          :key="template.id"
          class="coupon-item coupon-template"
          :data-testid="`coupon-template-${template.id}`"
        >
          <view class="coupon-item-main">
            <text class="coupon-item-name">{{ template.name }}</text>
            <text class="coupon-item-desc">{{ template.description }}</text>
            <text class="coupon-item-meta">
              有效期：{{ formatDate(template.valid_from) }} - {{ formatDate(template.valid_to) }}
            </text>
            <text class="coupon-item-meta">
              剩余：{{ template.total_quantity - template.claimed_quantity }} / {{ template.total_quantity }} 张
            </text>
          </view>
          <view class="coupon-item-amount">
            <text class="coupon-item-value">-¥{{ template.discount_amount.toFixed(2) }}</text>
            <text class="coupon-item-threshold">满{{ template.threshold_amount }}可用</text>
            <button
              class="primary small"
              :disabled="claimingId === template.id"
              @click="claimCoupon(template.id)"
              @tap="claimCoupon(template.id)"
              :data-testid="`coupon-claim-${template.id}`"
            >
              {{ claimingId === template.id ? '领取中...' : '立即领取' }}
            </button>
          </view>
        </view>
      </view>

      <view v-if="activeTab === 'mine'" class="coupon-list">
        <view v-if="loadingMyCoupons" class="coupon-loading">加载中...</view>
        <view v-else-if="!myCoupons.length" class="coupon-empty">
          <text>暂无优惠券，快去领取吧~</text>
        </view>
        <view
          v-for="coupon in myCoupons"
          :key="coupon.id"
          class="coupon-item"
          :class="{ disabled: coupon.status !== 'available' }"
          :data-testid="`my-coupon-${coupon.id}`"
        >
          <view class="coupon-item-main">
            <text class="coupon-item-name">{{ coupon.template.name }}</text>
            <text class="coupon-item-desc">{{ coupon.template.description }}</text>
            <text class="coupon-item-meta">
              有效期：{{ formatDate(coupon.template.valid_from) }} - {{ formatDate(coupon.template.valid_to) }}
            </text>
          </view>
          <view class="coupon-item-amount">
            <text class="coupon-item-value">-¥{{ coupon.template.discount_amount.toFixed(2) }}</text>
            <text class="coupon-item-threshold">满{{ coupon.template.threshold_amount }}可用</text>
            <text class="coupon-status">
              {{ statusText(coupon.status) }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  COUPON_STATUS_LABELS,
  type CouponTemplate,
  type UserCoupon,
  type CouponStatus
} from '@community-store/shared';
import { ref, onMounted } from 'vue';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { useSessionStore } from '../../stores/session';
import { showMessage } from '../../utils/ui';

const dataSource = getDataSource();
const sessionStore = useSessionStore();

const activeTab = ref<'available' | 'mine'>('available');
const templates = ref<CouponTemplate[]>([]);
const myCoupons = ref<UserCoupon[]>([]);
const loadingTemplates = ref(false);
const loadingMyCoupons = ref(false);
const claimingId = ref<number | null>(null);

async function loadTemplates(): Promise<void> {
  try {
    loadingTemplates.value = true;
    templates.value = await dataSource.listCouponTemplates();
  } catch (error) {
    showMessage((error as Error).message || '加载优惠券失败');
  } finally {
    loadingTemplates.value = false;
  }
}

async function loadMyCoupons(): Promise<void> {
  if (!sessionStore.state.user?.id) {
    return;
  }
  try {
    loadingMyCoupons.value = true;
    myCoupons.value = await dataSource.listUserCoupons(sessionStore.state.user.id);
  } catch (error) {
    showMessage((error as Error).message || '加载我的优惠券失败');
  } finally {
    loadingMyCoupons.value = false;
  }
}

async function claimCoupon(templateId: number): Promise<void> {
  if (claimingId.value !== null) {
    return;
  }
  try {
    claimingId.value = templateId;
    await dataSource.claimCoupon(templateId);
    showMessage('领取成功');
    await Promise.all([loadTemplates(), loadMyCoupons()]);
  } catch (error) {
    showMessage((error as Error).message || '领取失败');
  } finally {
    claimingId.value = null;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}.${month}.${day}`;
}

function statusText(status: CouponStatus): string {
  return COUPON_STATUS_LABELS[status];
}

onMounted(() => {
  loadTemplates();
  loadMyCoupons();
});
</script>

<style scoped>
.coupon-tabs {
  display: flex;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  padding: 4px;
}

.coupon-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 14px;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
}

.coupon-tab.active {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
}

.coupon-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coupon-loading {
  text-align: center;
  padding: 40px 0;
  color: var(--muted);
  font-size: 14px;
}

.coupon-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
  font-size: 14px;
}

.coupon-item {
  display: flex;
  align-items: stretch;
  background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%);
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: all var(--transition);
}

.coupon-item.disabled {
  opacity: 0.6;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-color: var(--border);
}

.coupon-template {
  cursor: pointer;
}

.coupon-item-main {
  flex: 1;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  border-right: 1px dashed #fecaca;
}

.coupon-item.disabled .coupon-item-main {
  border-right-color: var(--border);
}

.coupon-item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.coupon-item-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.coupon-item-meta {
  font-size: 11px;
  color: var(--muted);
}

.coupon-item-amount {
  width: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 10px;
  gap: 4px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.coupon-item.disabled .coupon-item-amount {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

.coupon-item-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--danger);
}

.coupon-item.disabled .coupon-item-value {
  color: var(--muted);
}

.coupon-item-threshold {
  font-size: 11px;
  color: var(--muted);
}

.coupon-status {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 4px;
}
</style>
