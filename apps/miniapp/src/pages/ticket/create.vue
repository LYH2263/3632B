<template>
  <view class="app-shell" data-testid="ticket-create-page">
    <AppTopBar />

    <view class="page-body">
      <text class="page-title">创建工单</text>
      <text class="page-desc">请详细描述您遇到的问题，我们会尽快处理</text>

      <view class="form-section">
        <view class="form-item">
          <text class="form-label">问题类型 <text class="required">*</text></text>
          <view class="type-options">
            <view
              v-for="type in typeOptions"
              :key="type.value"
              class="type-option"
              :class="{ active: formData.type === type.value }"
              @click="formData.type = type.value"
              :data-testid="`ticket-type-${type.value}`"
            >
              <text class="option-text">{{ type.label }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">关联商家 <text class="required">*</text></text>
          <picker
            mode="selector"
            :range="merchantOptions"
            range-key="name"
            @change="onMerchantChange"
            :data-testid="ticket-merchant-picker"
          >
            <view class="picker-view">
              <text v-if="selectedMerchant" class="picker-text">{{ selectedMerchant.name }}</text>
              <text v-else class="picker-placeholder">请选择商家</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">关联订单（可选）</text>
          <picker
            mode="selector"
            :range="orderOptions"
            range-key="label"
            :disabled="!formData.merchant_id"
            @change="onOrderChange"
            :data-testid="ticket-order-picker"
          >
            <view class="picker-view" :class="{ disabled: !formData.merchant_id }">
              <text v-if="selectedOrder" class="picker-text">{{ selectedOrder.label }}</text>
              <text v-else class="picker-placeholder">
                {{ formData.merchant_id ? '请选择订单（可选）' : '请先选择商家' }}
              </text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">问题标题 <text class="required">*</text></text>
          <input
            v-model="formData.title"
            class="form-input"
            placeholder="请简要描述问题"
            maxlength="100"
            :data-testid="ticket-title-input"
          />
        </view>

        <view class="form-item">
          <text class="form-label">详细描述 <text class="required">*</text></text>
          <textarea
            v-model="formData.description"
            class="form-textarea"
            placeholder="请详细描述您遇到的问题，包括时间、地点、具体情况等..."
            maxlength="1000"
            :data-testid="ticket-description-input"
          />
          <text class="char-count">{{ formData.description.length }}/1000</text>
        </view>
      </view>

      <button
        class="submit-btn"
        :disabled="!isValid || submitting"
        @click="submitTicket"
        :data-testid="ticket-submit-btn"
      >
        <text class="submit-text">{{ submitting ? '提交中...' : '提交工单' }}</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  TICKET_TYPE_LABELS,
  type CreateTicketPayload,
  type Merchant,
  type Order,
  type TicketType
} from '@community-store/shared';
import { ref, computed, onMounted } from 'vue';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { useSessionStore } from '../../stores/session';
import { showMessage } from '../../utils/ui';
import { navigateBack } from '../../utils/navigation';

const dataSource = getDataSource();
const sessionStore = useSessionStore();

const formData = ref<CreateTicketPayload>({
  merchant_id: 0,
  order_id: null,
  type: 'delivery',
  title: '',
  description: ''
});

const merchants = ref<Merchant[]>([]);
const orders = ref<Order[]>([]);
const submitting = ref(false);

const typeOptions = Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => ({
  value: value as TicketType,
  label
}));

const merchantOptions = computed(() => merchants.value);
const selectedMerchant = computed(() =>
  merchants.value.find((m) => m.id === formData.value.merchant_id)
);

const orderOptions = computed(() => {
  const filtered = orders.value.filter((o) => o.merchant_id === formData.value.merchant_id);
  return [
    { id: 0, order_no: '', label: '不关联订单' },
    ...filtered.map((o) => ({
      id: o.id,
      order_no: o.order_no,
      label: `${o.order_no} - ¥${o.total_amount.toFixed(2)}`
    }))
  ];
});

const selectedOrder = computed(() =>
  formData.value.order_id
    ? orderOptions.value.find((o) => o.id === formData.value.order_id)
    : null
);

const isValid = computed(() => {
  return (
    formData.value.merchant_id > 0 &&
    formData.value.title.trim().length > 0 &&
    formData.value.description.trim().length > 0
  );
});

function onMerchantChange(e: { detail: { value: number } }): void {
  const index = e.detail.value;
  formData.value.merchant_id = merchants.value[index]?.id ?? 0;
  formData.value.order_id = null;
}

function onOrderChange(e: { detail: { value: number } }): void {
  const index = e.detail.value;
  formData.value.order_id = orderOptions.value[index]?.id ?? null;
  if (formData.value.order_id === 0) {
    formData.value.order_id = null;
  }
}

async function loadData(): Promise<void> {
  try {
    const [merchantList, orderList] = await Promise.all([
      dataSource.listMerchants(),
      sessionStore.state.user
        ? dataSource.listOrdersByBuyer(sessionStore.state.user.id)
        : Promise.resolve([])
    ]);
    merchants.value = merchantList;
    orders.value = orderList;
  } catch (error) {
    showMessage((error as Error).message || '加载数据失败');
  }
}

async function submitTicket(): Promise<void> {
  if (!isValid.value) return;

  try {
    submitting.value = true;
    const ticket = await dataSource.createTicket({
      merchant_id: formData.value.merchant_id,
      order_id: formData.value.order_id,
      type: formData.value.type,
      title: formData.value.title.trim(),
      description: formData.value.description.trim()
    });
    showMessage('工单创建成功');
    setTimeout(() => {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        navigateBack();
      } else {
        uni.redirectTo({
          url: `/pages/ticket/detail?id=${ticket.id}`
        });
      }
    }, 500);
  } catch (error) {
    showMessage((error as Error).message || '提交失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.required {
  color: #ef4444;
}

.type-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.type-option {
  padding: 10px 20px;
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  transition: all var(--transition);
}

.type-option.active {
  border-color: var(--primary);
  background: #eff6ff;
}

.type-option.active .option-text {
  color: var(--primary);
}

.option-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.picker-view {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
}

.picker-view.disabled {
  background: var(--bg);
  opacity: 0.6;
}

.picker-text {
  font-size: 14px;
  color: var(--text);
}

.picker-placeholder {
  font-size: 14px;
  color: var(--muted);
}

.picker-arrow {
  font-size: 20px;
  color: var(--muted);
}

.form-input {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text);
}

.form-textarea {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text);
  min-height: 120px;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

.submit-btn {
  width: 100%;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
}

.submit-btn:disabled {
  background: var(--muted);
}

.submit-text {
  color: #fff;
}
</style>
