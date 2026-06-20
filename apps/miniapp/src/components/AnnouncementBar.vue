<template>
	<view v-if="announcements.length" class="announcement-bar" data-testid="announcement-bar" @click="goList">
		<view class="announcement-icon">📢</view>
		<view class="announcement-content">
			<view class="announcement-scroll" :style="scrollStyle">
				<text v-for="(item, index) in displayTexts" :key="index" class="announcement-text">
					<text v-if="item.is_pinned" class="pinned-tag">置顶</text>
					{{ item.title }}
				</text>
			</view>
		</view>
		<view class="announcement-arrow">›</view>
	</view>
</template>

<script setup lang="ts">
import type { Announcement } from '@community-store/shared';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getDataSource } from '../services/data-source';

const dataSource = getDataSource();
const announcements = ref<Announcement[]>([]);
const scrollOffset = ref(0);
let animationTimer: number | null = null;

const displayTexts = computed(() => {
	if (announcements.value.length <= 2) {
		return announcements.value;
	}
	return [...announcements.value, ...announcements.value];
});

const scrollStyle = computed(() => {
	return {
		transform: `translateX(-${scrollOffset.value}px)`
	};
});

function startScroll(): void {
	const speed = 0.5;
	function animate(): void {
		scrollOffset.value += speed;
		const containerWidth = 300;
		const singleLength = announcements.value.length * 200;
		if (scrollOffset.value >= singleLength) {
			scrollOffset.value = 0;
		}
		animationTimer = window.setTimeout(animate, 30);
	}
	animate();
}

function stopScroll(): void {
	if (animationTimer !== null) {
		clearTimeout(animationTimer);
		animationTimer = null;
	}
}

function goList(): void {
	uni.navigateTo({
		url: '/pages/announcement/list'
	});
}

async function loadAnnouncements(): Promise<void> {
	try {
		announcements.value = await dataSource.listAnnouncements();
		if (announcements.value.length > 1) {
			startScroll();
		}
	} catch {
		announcements.value = [];
	}
}

onMounted(() => {
	loadAnnouncements();
});

onUnmounted(() => {
	stopScroll();
});
</script>

<style scoped>
.announcement-bar {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 12px;
	background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
	border-radius: var(--radius-sm);
	margin-bottom: 12px;
	border: 1px solid #fcd34d;
	cursor: pointer;
	transition: background var(--transition);
}

.announcement-bar:active {
	background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
}

.announcement-icon {
	font-size: 18px;
	flex-shrink: 0;
}

.announcement-content {
	flex: 1;
	overflow: hidden;
	white-space: nowrap;
}

.announcement-scroll {
	display: inline-flex;
	gap: 40px;
	animation: none;
}

.announcement-text {
	font-size: 14px;
	color: #92400e;
	white-space: nowrap;
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.pinned-tag {
	display: inline-block;
	padding: 1px 6px;
	background: var(--danger);
	color: #fff;
	font-size: 11px;
	border-radius: 4px;
	font-weight: 600;
}

.announcement-arrow {
	font-size: 20px;
	color: #92400e;
	flex-shrink: 0;
	font-weight: 300;
}
</style>
