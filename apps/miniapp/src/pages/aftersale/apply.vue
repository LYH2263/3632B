<template>
  <view class="app-shell" data-testid="miniapp-shell">
    <AppTopBar />

    <view class="page-body">
      <view v-if="canApply" class="aftersale-apply-form" data-testid="aftersale-apply-page">
        <view class="card">
          <h3 class="section-title">申请售后</h3>
          <p class="muted order-no-text" data-testid="aftersale-order-no">订单号：{{ order?.order_no }}</p>

          <view class="form-group">
            <text class="form-label">退款原因</text>
            <picker
              :range="reasonLabels"
              :value="reasonIndex"
              data-testid="aftersale-reason-picker"
              @change="onReasonChange"
            >
              <view class="picker-value" data-testid="aftersale-reason-display">
                {{ reasonLabels[reasonIndex] || '请选择原因' }}
              </view>
            </picker>
          </view>

          <view class="form-group">
            <text class="form-label">说明（选填）</text>
            <textarea
              v-model="description"
              class="form-textarea"
              placeholder="请输入补充说明"
              maxlength="500"
              data-testid="aftersale-description"
            />
          </view>

          <button
            class="primary"
            :disabled="submitting"
            data-testid="aftersale-submit-btn"
            @click="submitApply"
          >
            {{ submitting ? '提交中...' : '提交申请' }}
          </button>
        </view>
      </view>
      <view v-else class="aftersale-apply-form">
        <view class="card">
          <p class="muted" data-testid="aftersale-not-eligible">该订单无法申请售后</p>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  AFTERSALE_REASON_LABELS,
  type AfterSaleReason,
  type Order
} from '@community-store/shared';
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { showMessage } from '../../utils/ui';
import { numberOption } from '../../utils/navigation';

const dataSource = getDataSource();

const orderId = ref(0);
const order = ref<Order | null>(null);
const reasonIndex = ref(0);
const description = ref('');
const submitting = ref(false);

const reasonKeys = Object.keys(AFTERSALE_REASON_LABELS) as AfterSaleReason[];
const reasonLabels = Object.values(AFTERSALE_REASON_LABELS);

const canApply = computed(() => {
  if (!order.value) return false;
  return order.value.status === 'completed' || order.value.status === 'delivering';
});

function onReasonChange(e: { detail: { value: number } }): void {
  reasonIndex.value = e.detail.value;
}

async function loadOrder(): Promise<void> {
  if (!orderId.value) return;
  order.value = await dataSource.getOrder(orderId.value);
}

async function submitApply(): Promise<void> {
  if (!order.value || submitting.value) return;

  submitting.value = true;
  try {
    await dataSource.createAfterSale({
      order_id: order.value.id,
      reason: reasonKeys[reasonIndex.value],
      description: description.value.trim() || undefined
    });
    showMessage('售后申请已提交');
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error) {
    showMessage((error as Error).message);
  } finally {
    submitting.value = false;
  }
}

onLoad((options) => {
  orderId.value = numberOption(options, 'orderId', 0);
  loadOrder();
});
</script>
