<template>
	<view class="app-shell" data-testid="announcement-list-page">
		<AppTopBar />

		<view class="page-body">
			<section>
				<view v-if="loading" class="empty-box">
					<p class="empty-icon">⏳</p>
					<p class="muted">加载中...</p>
				</view>

				<view v-else-if="!announcements.length" class="empty-box" data-testid="announcement-empty">
					<p class="empty-icon">📭</p>
					<p class="muted">暂无公告</p>
				</view>

				<view v-else>
					<article
						v-for="item in announcements"
						:key="item.id"
						class="card announcement-card"
						:data-testid="`announcement-item-${item.id}`"
						@click="goDetail(item.id)"
					>
						<view class="announcement-card-header">
							<view class="announcement-title-row">
								<text v-if="item.is_pinned" class="pinned-badge">置顶</text>
								<h3 class="announcement-title">{{ item.title }}</h3>
							</view>
							<text class="announcement-date">{{ formatDate(item.created_at) }}</text>
						</view>
						<view class="announcement-preview">
							{{ item.content.split('\n')[0] }}
							<text v-if="item.content.includes('\n')" class="more-text">... 查看详情</text>
						</view>
						<view class="announcement-validity">
							<text class="validity-label">有效期：</text>
							<text class="validity-text">{{ formatDate(item.valid_from) }} 至 {{ formatDate(item.valid_to) }}</text>
						</view>
					</article>
				</view>
			</section>
		</view>
	</view>
</template>

<script setup lang="ts">
import type { Announcement } from '@community-store/shared';
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AppTopBar from '../../components/AppTopBar.vue';
import { getDataSource } from '../../services/data-source';

const dataSource = getDataSource();
const announcements = ref<Announcement[]>([]);
const loading = ref(true);

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function goDetail(id: number): void {
	uni.navigateTo({
		url: `/pages/announcement/detail?id=${id}`
	});
}

async function loadData(): Promise<void> {
	loading.value = true;
	try {
		announcements.value = await dataSource.listAnnouncements();
	} catch {
		announcements.value = [];
	} finally {
		loading.value = false;
	}
}

onShow(loadData);
</script>

<style scoped>
.announcement-card {
	cursor: pointer;
	transition: all var(--transition);
}

.announcement-card:active {
	background: var(--bg);
	transform: scale(0.98);
}

.announcement-card-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 12px;
	margin-bottom: 10px;
}

.announcement-title-row {
	display: flex;
	align-items: center;
	gap: 8px;
	flex: 1;
	min-width: 0;
}

.pinned-badge {
	display: inline-block;
	padding: 2px 8px;
	background: var(--danger);
	color: #fff;
	font-size: 11px;
	border-radius: 4px;
	font-weight: 600;
	flex-shrink: 0;
}

.announcement-title {
	font-size: 16px;
	font-weight: 600;
	color: var(--text);
	margin: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.announcement-date {
	font-size: 12px;
	color: var(--muted);
	flex-shrink: 0;
}

.announcement-preview {
	font-size: 14px;
	color: var(--text-secondary);
	line-height: 1.6;
	margin-bottom: 10px;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.more-text {
	color: var(--primary);
	font-size: 13px;
}

.announcement-validity {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	padding-top: 10px;
	border-top: 1px solid var(--border-light);
}

.validity-label {
	color: var(--muted);
}

.validity-text {
	color: var(--text-secondary);
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
