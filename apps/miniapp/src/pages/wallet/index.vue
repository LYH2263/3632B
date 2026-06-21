<template>
  <view class="app-shell" data-testid="wallet-page">
    <AppTopBar />

    <view class="page-body">
      <view v-if="loading" class="wallet-loading">加载中...</view>

      <template v-else-if="wallet">
        <view class="balance-card">
          <text class="balance-label">账户余额</text>
          <view class="balance-row">
            <text class="balance-symbol">¥</text>
            <text class="balance-amount">{{ wallet.balance.toFixed(2) }}</text>
          </view>
          <text class="balance-hint">线下充值 · 余额消费</text>
        </view>

        <view class="section-header">
          <text class="section-title">交易记录</text>
        </view>

        <view v-if="loadingTxns" class="wallet-loading">加载中...</view>
        <view v-else-if="!transactions.length" class="txn-empty">
          <text>暂无交易记录</text>
        </view>
        <view v-else class="txn-list">
          <view
            v-for="txn in transactions"
            :key="txn.id"
            class="txn-item"
            :data-testid="`wallet-txn-${txn.id}`"
          >
            <view class="txn-main">
              <text class="txn-type">{{ typeLabel(txn.type) }}</text>
              <text class="txn-remark" v-if="txn.remark">{{ txn.remark }}</text>
              <text class="txn-time">{{ formatTime(txn.created_at) }}</text>
            </view>
            <view class="txn-amount-col">
              <text
                class="txn-amount"
                :class="{ positive: txn.type === 'topup' || txn.type === 'refund', negative: txn.type === 'payment' }"
              >
                {{ txn.type === 'payment' ? '-' : '+' }}{{ txn.amount.toFixed(2) }}
              </text>
              <text class="txn-balance">余额 ¥{{ txn.balance_after.toFixed(2) }}</text>
            </view>
          </view>
        </view>
      </template>

      <view v-else class="txn-empty">
        <text>请先登录查看钱包</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { WALLET_TRANSACTION_TYPE_LABELS, type WalletInfo, type WalletTransaction } from '@community-store/shared';
import { ref, onMounted } from 'vue';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { showMessage } from '../../utils/ui';

const dataSource = getDataSource();

const wallet = ref<WalletInfo | null>(null);
const transactions = ref<WalletTransaction[]>([]);
const loading = ref(false);
const loadingTxns = ref(false);

function typeLabel(type: string): string {
  return (WALLET_TRANSACTION_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadWallet(): Promise<void> {
  try {
    loading.value = true;
    wallet.value = await dataSource.getWallet();
  } catch (error) {
    showMessage((error as Error).message || '加载钱包信息失败');
  } finally {
    loading.value = false;
  }
}

async function loadTransactions(): Promise<void> {
  try {
    loadingTxns.value = true;
    transactions.value = await dataSource.listWalletTransactions();
  } catch (error) {
    showMessage((error as Error).message || '加载交易记录失败');
  } finally {
    loadingTxns.value = false;
  }
}

onMounted(() => {
  loadWallet();
  loadTransactions();
});
</script>

<style scoped>
.wallet-loading {
  text-align: center;
  padding: 60px 0;
  color: var(--muted);
  font-size: 14px;
}

.balance-card {
  background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
  border-radius: var(--radius);
  padding: 24px 20px;
  margin-bottom: 16px;
  color: #fff;
}

.balance-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 8px;
  display: block;
}

.balance-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 12px;
}

.balance-symbol {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.balance-amount {
  font-size: 40px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.balance-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.txn-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
  font-size: 14px;
}

.txn-list {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.txn-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
}

.txn-item:last-child {
  border-bottom: none;
}

.txn-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.txn-type {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.txn-remark {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.txn-time {
  font-size: 12px;
  color: var(--muted);
}

.txn-amount-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 12px;
}

.txn-amount {
  font-size: 16px;
  font-weight: 600;
}

.txn-amount.positive {
  color: var(--success);
}

.txn-amount.negative {
  color: var(--text);
}

.txn-balance {
  font-size: 11px;
  color: var(--muted);
}
</style>
