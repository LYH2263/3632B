<template>
  <view class="app-shell" data-testid="ticket-list-page">
    <AppTopBar />

    <view class="page-body">
      <view class="page-header">
        <text class="page-title">我的客服</text>
        <button class="create-btn" @click="goCreate" data-testid="ticket-create-btn">
          <text class="create-btn-text">+ 新建工单</text>
        </button>
      </view>

      <view class="status-tabs">
        <view
          v-for="tab in statusTabs"
          :key="tab.value"
          class="status-tab"
          :class="{ active: activeStatus === tab.value }"
          @click="switchStatus(tab.value)"
          :data-testid="`ticket-status-tab-${tab.value}`"
        >
          <text class="tab-text">{{ tab.label }}</text>
        </view>
      </view>

      <view v-if="loading" class="loading">加载中...</view>

      <view v-else-if="!tickets.length" class="empty">
        <text class="empty-text">暂无工单</text>
        <button class="empty-btn" @click="goCreate">创建第一个工单</button>
      </view>

      <view v-else class="ticket-list">
        <view
          v-for="ticket in tickets"
          :key="ticket.id"
          class="ticket-card"
          @click="goDetail(ticket.id)"
          :data-testid="`ticket-item-${ticket.id}`"
        >
          <view class="ticket-header">
            <view class="ticket-type" :class="`type-${ticket.type}`">
              <text class="type-text">{{ typeLabel(ticket.type) }}</text>
            </view>
            <view class="ticket-status" :class="`status-${ticket.status}`">
              <text class="status-text">{{ statusLabel(ticket.status) }}</text>
            </view>
          </view>
          <text class="ticket-title">{{ ticket.title }}</text>
          <view class="ticket-meta">
            <text class="meta-text">{{ ticket.merchant_name }}</text>
            <text v-if="ticket.order_no" class="meta-text">订单：{{ ticket.order_no }}</text>
          </view>
          <text class="ticket-time">{{ formatTime(ticket.last_message_at) }}</text>
        </view>
      </view>

      <view v-if="hasMore" class="load-more">
        <button v-if="!loadingMore" class="load-more-btn" @click="loadMore" data-testid="ticket-load-more">
          加载更多
        </button>
        <text v-else class="loading-text">加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type TicketListItem,
  type TicketStatus,
  type TicketType
} from '@community-store/shared';
import { ref, computed, onMounted } from 'vue';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { sessionStore } from '../../stores/session';
import { showMessage } from '../../utils/ui';
import { navigateTo } from '../../utils/navigation';

const dataSource = getDataSource();

const tickets = ref<TicketListItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const activeStatus = ref<TicketStatus | 'all'>('all');
const page = ref(1);
const pageSize = ref(10);
const totalPages = ref(1);

const statusTabs = [
  { value: 'all' as const, label: '全部' },
  { value: 'open' as const, label: '待处理' },
  { value: 'processing' as const, label: '处理中' },
  { value: 'resolved' as const, label: '已解决' },
  { value: 'closed' as const, label: '已关闭' }
];

const hasMore = computed(() => page.value < totalPages.value);

function typeLabel(type: TicketType): string {
  return TICKET_TYPE_LABELS[type] ?? type;
}

function statusLabel(status: TicketStatus): string {
  return TICKET_STATUS_LABELS[status] ?? status;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function switchStatus(status: TicketStatus | 'all'): void {
  activeStatus.value = status;
  page.value = 1;
  tickets.value = [];
  loadTickets();
}

async function loadTickets(): Promise<void> {
  try {
    if (page.value === 1) {
      loading.value = true;
    } else {
      loadingMore.value = true;
    }

    const buyer = sessionStore.user;
    if (!buyer) {
      showMessage('请先登录');
      return;
    }

    const result = await dataSource.listTicketsByBuyer(buyer.id, page.value, pageSize.value);
    
    let filtered = result.results;
    if (activeStatus.value !== 'all') {
      filtered = result.results.filter((t) => t.status === activeStatus.value);
    }

    if (page.value === 1) {
      tickets.value = filtered;
    } else {
      tickets.value = [...tickets.value, ...filtered];
    }
    totalPages.value = result.total_pages;
  } catch (error) {
    showMessage((error as Error).message || '加载工单失败');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

async function loadMore(): Promise<void> {
  if (loadingMore.value || !hasMore.value) return;
  page.value += 1;
  await loadTickets();
}

function goCreate(): void {
  navigateTo('/pages/ticket/create');
}

function goDetail(ticketId: number): void {
  navigateTo(`/pages/ticket/detail?id=${ticketId}`);
}

onMounted(() => {
  loadTickets();
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.create-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
}

.create-btn-text {
  color: #fff;
}

.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.status-tab {
  flex-shrink: 0;
  padding: 8px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  transition: all var(--transition);
}

.status-tab.active {
  background: var(--primary);
  border-color: var(--primary);
}

.status-tab.active .tab-text {
  color: #fff;
}

.tab-text {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
  font-size: 14px;
}

.empty-text {
  display: block;
  margin-bottom: 16px;
}

.empty-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: 10px 24px;
  font-size: 14px;
}

.ticket-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ticket-type {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
}

.ticket-type.type-delivery {
  background: #dbeafe;
  color: #1d4ed8;
}

.ticket-type.type-product {
  background: #dcfce7;
  color: #15803d;
}

.ticket-type.type-other {
  background: #f3e8ff;
  color: #7c3aed;
}

.type-text {
  font-size: 12px;
}

.ticket-status {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
}

.ticket-status.status-open {
  background: #fef3c7;
  color: #b45309;
}

.ticket-status.status-processing {
  background: #dbeafe;
  color: #1d4ed8;
}

.ticket-status.status-resolved {
  background: #dcfce7;
  color: #15803d;
}

.ticket-status.status-closed {
  background: #f1f5f9;
  color: #64748b;
}

.status-text {
  font-size: 12px;
}

.ticket-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ticket-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.meta-text {
  font-size: 12px;
  color: var(--muted);
}

.ticket-time {
  font-size: 11px;
  color: var(--muted);
}

.load-more {
  text-align: center;
  padding: 20px 0;
}

.load-more-btn {
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 32px;
  font-size: 14px;
}

.loading-text {
  font-size: 13px;
  color: var(--muted);
}
</style>
