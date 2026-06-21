<template>
  <view class="app-shell" data-testid="ticket-detail-page">
    <AppTopBar />

    <view class="page-body">
      <view v-if="loading" class="loading">加载中...</view>

      <template v-else-if="ticket">
        <view class="ticket-header-card">
          <view class="ticket-header-top">
            <view class="ticket-type" :class="`type-${ticket.type}`">
              <text class="type-text">{{ typeLabel(ticket.type) }}</text>
            </view>
            <view class="ticket-status" :class="`status-${ticket.status}`">
              <text class="status-text">{{ statusLabel(ticket.status) }}</text>
            </view>
          </view>
          <text class="ticket-title" data-testid="ticket-detail-title">{{ ticket.title }}</text>
          <view class="ticket-meta">
            <text class="meta-item">商家：{{ ticket.merchant_name }}</text>
            <text v-if="ticket.order_no" class="meta-item">订单：{{ ticket.order_no }}</text>
            <text class="meta-item">创建时间：{{ formatTime(ticket.created_at) }}</text>
          </view>
        </view>

        <view class="section-header">
          <text class="section-title">沟通记录</text>
          <view v-if="ticket.status !== 'closed'" class="status-actions">
            <button
              v-if="ticket.status !== 'resolved'"
              class="action-btn resolved"
              @click="markResolved"
              data-testid="ticket-mark-resolved"
            >
              标记已解决
            </button>
            <button
              class="action-btn close"
              @click="closeTicket"
              data-testid="ticket-close"
            >
              关闭工单
            </button>
          </view>
        </view>

        <view class="message-list" ref="messageListRef">
          <view
            v-for="msg in ticket.messages"
            :key="msg.id"
            class="message-item"
            :class="{ 'is-self': isSelf(msg) }"
            :data-testid="`ticket-message-${msg.id}`"
          >
            <view class="message-avatar" :class="`role-${msg.sender_role}`">
              <text class="avatar-text">{{ msg.sender_nickname.charAt(0) }}</text>
            </view>
            <view class="message-content-wrap">
              <view class="message-header">
                <text class="sender-name">{{ msg.sender_nickname }}</text>
                <text class="sender-role">{{ msg.sender_role === 'buyer' ? '买家' : '商家' }}</text>
                <text class="message-time">{{ formatTime(msg.created_at) }}</text>
              </view>
              <view class="message-bubble">
                <text class="message-text">{{ msg.content }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="ticket.status === 'closed'" class="closed-notice">
          <text class="closed-text">工单已关闭，无法继续回复</text>
        </view>

        <view v-else class="reply-area">
          <textarea
            v-model="replyContent"
            class="reply-input"
            placeholder="请输入您的回复..."
            maxlength="1000"
            :data-testid="ticket-reply-input"
          />
          <button
            class="send-btn"
            :disabled="!replyContent.trim() || sending"
            @click="sendReply"
            :data-testid="ticket-send-btn"
          >
            <text class="send-text">{{ sending ? '发送中...' : '发送' }}</text>
          </button>
        </view>
      </template>

      <view v-else class="empty">
        <text class="empty-text">工单不存在</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  type Ticket,
  type TicketMessage,
  type TicketStatus,
  type TicketType
} from '@community-store/shared';
import { ref, onMounted } from 'vue';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { sessionStore } from '../../stores/session';
import { showMessage } from '../../utils/ui';

const dataSource = getDataSource();

const ticket = ref<Ticket | null>(null);
const loading = ref(false);
const sending = ref(false);
const replyContent = ref('');
const messageListRef = ref<{ $el: HTMLElement } | null>(null);

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

function isSelf(msg: TicketMessage): boolean {
  return msg.sender_role === 'buyer';
}

async function loadTicket(): Promise<void> {
  try {
    loading.value = true;
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const ticketId = Number((currentPage as { options?: { id?: string } }).options?.id);
    
    if (!ticketId) {
      showMessage('工单ID无效');
      return;
    }

    const result = await dataSource.getTicket(ticketId);
    ticket.value = result;
  } catch (error) {
    showMessage((error as Error).message || '加载工单失败');
  } finally {
    loading.value = false;
  }
}

async function sendReply(): Promise<void> {
  const content = replyContent.value.trim();
  if (!content || !ticket.value) return;

  try {
    sending.value = true;
    await dataSource.createTicketMessage({
      ticket_id: ticket.value.id,
      content
    });
    replyContent.value = '';
    await loadTicket();
    setTimeout(() => {
      if (messageListRef.value?.$el) {
        messageListRef.value.$el.scrollTop = messageListRef.value.$el.scrollHeight;
      }
    }, 100);
  } catch (error) {
    showMessage((error as Error).message || '发送失败');
  } finally {
    sending.value = false;
  }
}

async function updateStatus(status: TicketStatus, successMsg: string): Promise<void> {
  if (!ticket.value) return;

  try {
    await dataSource.updateTicketStatus(ticket.value.id, status);
    showMessage(successMsg);
    await loadTicket();
  } catch (error) {
    showMessage((error as Error).message || '操作失败');
  }
}

function markResolved(): void {
  updateStatus('resolved', '工单已标记为已解决');
}

function closeTicket(): void {
  updateStatus('closed', '工单已关闭');
}

onMounted(() => {
  loadTicket();
});
</script>

<style scoped>
.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
  font-size: 14px;
}

.empty-text {
  font-size: 14px;
}

.ticket-header-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.ticket-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ticket-type {
  padding: 6px 12px;
  border-radius: var(--radius-full);
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
  padding: 6px 12px;
  border-radius: var(--radius-full);
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
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
}

.ticket-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  font-size: 13px;
  color: var(--text-secondary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.status-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  border: none;
}

.action-btn.resolved {
  background: #dcfce7;
  color: #15803d;
}

.action-btn.close {
  background: #f1f5f9;
  color: #64748b;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-item.is-self {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-avatar.role-buyer {
  background: #3b82f6;
}

.message-avatar.role-merchant {
  background: #f59e0b;
}

.avatar-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.message-content-wrap {
  flex: 1;
  max-width: 75%;
}

.message-item.is-self .message-content-wrap {
  align-items: flex-end;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-item.is-self .message-header {
  justify-content: flex-end;
}

.sender-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.sender-role {
  font-size: 11px;
  color: var(--muted);
  background: var(--bg);
  padding: 2px 6px;
  border-radius: 4px;
}

.message-time {
  font-size: 11px;
  color: var(--muted);
}

.message-bubble {
  background: var(--bg);
  border-radius: var(--radius);
  padding: 12px 16px;
}

.message-item.is-self .message-bubble {
  background: #dbeafe;
}

.message-text {
  font-size: 14px;
  color: var(--text);
  line-height: 1.6;
}

.closed-notice {
  text-align: center;
  padding: 20px;
  background: #fef3c7;
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.closed-text {
  font-size: 13px;
  color: #b45309;
}

.reply-area {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.reply-input {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  font-size: 14px;
  color: var(--text);
  min-height: 80px;
}

.send-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
}

.send-btn:disabled {
  background: var(--muted);
}

.send-text {
  color: #fff;
}
</style>
