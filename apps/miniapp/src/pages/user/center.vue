<template>
  <view class="app-shell" data-testid="user-center-page">
    <AppTopBar />

    <view class="page-body">
      <view v-if="loading" class="profile-loading">加载中...</view>

      <template v-else-if="profile">
        <view class="profile-hero">
          <view class="profile-avatar">
            <text class="avatar-text">{{ profile.nickname.charAt(0) }}</text>
          </view>
          <view class="profile-info">
            <text class="profile-name">{{ profile.nickname }}</text>
            <view class="level-badge" :class="`level-${profile.level.toLowerCase()}`">
              <text class="level-icon">{{ levelIcon }}</text>
              <text class="level-text">{{ levelLabel }}</text>
            </view>
          </view>
        </view>

        <view class="points-card">
          <view class="points-row">
            <view class="points-block">
              <text class="points-number">{{ profile.points }}</text>
              <text class="points-label">当前积分</text>
            </view>
            <view class="points-divider"></view>
            <view class="points-block">
              <text class="points-number secondary">{{ profile.total_earned }}</text>
              <text class="points-label">累计积分</text>
            </view>
          </view>
          <view class="points-progress">
            <view class="progress-track">
              <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
            </view>
            <view class="progress-labels">
              <text class="progress-mark" v-for="cfg in levelConfig" :key="cfg.name"
                :class="{ active: profile.level === cfg.name }">
                {{ cfg.label }}
              </text>
            </view>
          </view>
          <view class="points-hint">
            <text class="hint-text">{{ progressHint }}</text>
          </view>
        </view>

        <view class="section-header">
          <text class="section-title">积分明细</text>
        </view>

        <view v-if="loadingLogs" class="profile-loading">加载中...</view>
        <view v-else-if="!pointLogs.length" class="log-empty">
          <text>暂无积分记录</text>
        </view>
        <view v-else class="log-list">
          <view v-for="log in pointLogs" :key="log.id" class="log-item" :data-testid="`point-log-${log.id}`">
            <view class="log-main">
              <text class="log-source">{{ sourceLabel(log.source) }}</text>
              <text class="log-time">{{ formatTime(log.created_at) }}</text>
            </view>
            <view class="log-amount">
              <text class="log-change" :class="{ positive: log.change > 0 }">
                {{ log.change > 0 ? '+' : '' }}{{ log.change }}
              </text>
              <text class="log-balance">余额 {{ log.balance_after }}</text>
            </view>
          </view>
        </view>

        <view class="section-header">
          <text class="section-title">我的钱包</text>
        </view>

        <view class="service-cards">
          <view class="service-card" @click="goToWallet" @tap="goToWallet">
            <view class="service-icon" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0);">👛</view>
            <view class="service-content">
              <text class="service-title">钱包</text>
              <text class="service-desc">余额 · 充值 · 流水</text>
            </view>
            <view class="service-arrow">›</view>
          </view>
        </view>

        <view class="section-header">
          <text class="section-title">客服中心</text>
        </view>

        <view class="service-cards">
          <view class="service-card" @click="goToTickets">
            <view class="service-icon">💬</view>
            <view class="service-content">
              <text class="service-title">联系客服</text>
              <text class="service-desc">工单咨询 · 纠纷处理</text>
            </view>
            <view class="service-arrow">›</view>
          </view>
        </view>
      </template>

      <view v-else class="log-empty">
        <text>请先登录查看会员信息</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  MEMBER_LEVEL_CONFIG,
  MEMBER_LEVEL_LABELS,
  POINT_SOURCE_LABELS,
  type BuyerProfile,
  type PointLog
} from '@community-store/shared';
import { ref, computed, onMounted } from 'vue';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';
import { showMessage } from '../../utils/ui';

const dataSource = getDataSource();

const profile = ref<BuyerProfile | null>(null);
const pointLogs = ref<PointLog[]>([]);
const loading = ref(false);
const loadingLogs = ref(false);

const levelConfig = MEMBER_LEVEL_CONFIG;
const levelLabel = computed(() => {
  if (!profile.value) return '';
  return MEMBER_LEVEL_LABELS[profile.value.level];
});

const levelIcon = computed(() => {
  if (!profile.value) return '';
  const map: Record<string, string> = { L1: '☆', L2: '★', L3: '♛' };
  return map[profile.value.level] ?? '☆';
});

const progressPercent = computed(() => {
  if (!profile.value) return 0;
  const pts = profile.value.points;
  const thresholds = levelConfig.map((c) => c.threshold);
  const maxT = thresholds[thresholds.length - 1];
  return Math.min(100, Math.round((pts / maxT) * 100));
});

const progressHint = computed(() => {
  if (!profile.value) return '';
  const pts = profile.value.points;
  const currentIdx = levelConfig.findIndex((c) => c.name === profile.value!.level);
  if (currentIdx >= levelConfig.length - 1) return '已达最高等级';
  const nextThreshold = levelConfig[currentIdx + 1].threshold;
  const remaining = nextThreshold - pts;
  return `再获得 ${remaining} 积分即可升级为${levelConfig[currentIdx + 1].label}`;
});

function sourceLabel(source: string): string {
  return (POINT_SOURCE_LABELS as Record<string, string>)[source] ?? source;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadProfile(): Promise<void> {
  try {
    loading.value = true;
    profile.value = await dataSource.getBuyerProfile();
  } catch (error) {
    showMessage((error as Error).message || '加载会员信息失败');
  } finally {
    loading.value = false;
  }
}

async function loadLogs(): Promise<void> {
  try {
    loadingLogs.value = true;
    pointLogs.value = await dataSource.listPointLogs();
  } catch (error) {
    showMessage((error as Error).message || '加载积分记录失败');
  } finally {
    loadingLogs.value = false;
  }
}

function goToTickets(): void {
  uni.navigateTo({ url: '/pages/ticket/list' });
}

function goToWallet(): void {
  uni.navigateTo({ url: '/pages/wallet/index' });
}

onMounted(() => {
  loadProfile();
  loadLogs();
});
</script>

<style scoped>
.profile-loading {
  text-align: center;
  padding: 60px 0;
  color: var(--muted);
  font-size: 14px;
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
  border-radius: var(--radius);
  margin-bottom: 16px;
  color: #fff;
}

.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-name {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
}

.level-badge.level-l1 {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.level-badge.level-l2 {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  color: #334155;
}

.level-badge.level-l3 {
  background: linear-gradient(135deg, #fde68a, #fbbf24);
  color: #78350f;
}

.level-icon {
  font-size: 14px;
}

.level-text {
  font-size: 12px;
}

.points-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.points-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
}

.points-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.points-number {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary);
  line-height: 1;
}

.points-number.secondary {
  color: var(--text-secondary);
  font-size: 24px;
}

.points-label {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

.points-divider {
  width: 1px;
  height: 40px;
  background: var(--border);
}

.points-progress {
  margin-bottom: 8px;
}

.progress-track {
  height: 6px;
  background: var(--bg);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #6366f1);
  border-radius: 999px;
  transition: width 0.6s ease;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
}

.progress-mark {
  font-size: 11px;
  color: var(--muted);
  transition: color var(--transition);
}

.progress-mark.active {
  color: var(--primary);
  font-weight: 600;
}

.points-hint {
  text-align: center;
}

.hint-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.log-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
  font-size: 14px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
}

.log-item:last-child {
  border-bottom: none;
}

.log-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-source {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.log-time {
  font-size: 12px;
  color: var(--muted);
}

.log-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.log-change {
  font-size: 16px;
  font-weight: 600;
  color: var(--muted);
}

.log-change.positive {
  color: var(--success);
}

.log-balance {
  font-size: 11px;
  color: var(--muted);
}

.service-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: all var(--transition);
}

.service-card:active {
  transform: scale(0.98);
  background: var(--bg-hover);
}

.service-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  border-radius: var(--radius);
  font-size: 22px;
}

.service-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.service-desc {
  font-size: 12px;
  color: var(--muted);
}

.service-arrow {
  font-size: 20px;
  color: var(--muted);
  font-weight: 300;
}
</style>
