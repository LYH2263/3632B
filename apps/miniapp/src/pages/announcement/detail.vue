<template>
	<view class="app-shell" data-testid="announcement-detail-page">
		<AppTopBar />

		<view class="page-body">
			<section v-if="loading" class="empty-box">
				<p class="empty-icon">⏳</p>
				<p class="muted">加载中...</p>
			</section>

			<section v-else-if="!announcement" class="empty-box" data-testid="announcement-not-found">
				<p class="empty-icon">📭</p>
				<p class="muted">公告不存在或已过期</p>
			</section>

			<article v-else class="card announcement-detail" data-testid="announcement-detail-content">
				<view class="detail-header">
					<view class="detail-title-row">
						<text v-if="announcement.is_pinned" class="pinned-badge">置顶</text>
						<h2 class="detail-title">{{ announcement.title }}</h2>
					</view>
					<view class="detail-meta">
						<text class="meta-item">发布时间：{{ formatDate(announcement.created_at) }}</text>
					</view>
					<view class="detail-validity">
						<text class="validity-icon">📅</text>
						<text class="validity-text">
							有效期：{{ formatDate(announcement.valid_from) }} 至 {{ formatDate(announcement.valid_to) }}
						</text>
					</view>
				</view>

				<view class="detail-content">
					<text
						v-for="(line, index) in contentLines"
						:key="index"
						class="content-line"
					>
						{{ line || '\u00A0' }}
					</text>
				</view>
			</article>
		</view>
	</view>
</template>

<script setup lang="ts">
import type { Announcement } from '@community-store/shared';
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';

const dataSource = getDataSource();
const announcement = ref<Announcement | null>(null);
const loading = ref(true);

const contentLines = computed(() => {
	if (!announcement.value) return [];
	return announcement.value.content.split('\n');
});

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	const hh = String(date.getHours()).padStart(2, '0');
	const mm = String(date.getMinutes()).padStart(2, '0');
	return `${y}-${m}-${d} ${hh}:${mm}`;
}

async function loadData(id: number): Promise<void> {
	loading.value = true;
	try {
		announcement.value = await dataSource.getAnnouncement(id);
	} catch {
		announcement.value = null;
	} finally {
		loading.value = false;
	}
}

onLoad((options) => {
	const id = Number(options?.id);
	if (id) {
		loadData(id);
	}
});
</script>

<style scoped>
.announcement-detail {
	padding: 20px;
}

.detail-header {
	padding-bottom: 16px;
	margin-bottom: 16px;
	border-bottom: 1px solid var(--border);
}

.detail-title-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 12px;
}

.pinned-badge {
	display: inline-block;
	padding: 3px 10px;
	background: var(--danger);
	color: #fff;
	font-size: 12px;
	border-radius: 4px;
	font-weight: 600;
	flex-shrink: 0;
}

.detail-title {
	font-size: 20px;
	font-weight: 700;
	color: var(--text);
	margin: 0;
	line-height: 1.4;
	flex: 1;
}

.detail-meta {
	margin-bottom: 10px;
}

.meta-item {
	font-size: 13px;
	color: var(--muted);
}

.detail-validity {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 10px 12px;
	background: var(--primary-light);
	border-radius: var(--radius-sm);
}

.validity-icon {
	font-size: 16px;
}

.validity-text {
	font-size: 13px;
	color: var(--primary);
	font-weight: 500;
}

.detail-content {
	font-size: 15px;
	line-height: 1.8;
	color: var(--text);
}

.content-line {
	display: block;
	margin-bottom: 8px;
	word-break: break-word;
}

.empty-box {
	text-align: center;
	padding: 60px 20px;
}

.empty-icon {
	font-size: 48px;
	margin: 0 0 12px;
}
</style>
