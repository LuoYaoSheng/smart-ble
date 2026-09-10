<template>
	<view class="app-card" hover-class="app-card-hover" @click="$emit('select')">
		<view class="app-chip" :style="chipStyle"><text>{{ app.abbr || app.name.slice(0, 1) }}</text></view>
		<view class="app-copy">
			<view class="app-heading"><text class="app-name">{{ app.name }}</text><text class="app-tag">小程序</text></view>
			<text class="app-desc">{{ app.description }}</text>
		</view>
		<app-icon name="chev-r" :size="28" tone="ph" /> <!-- #93A2B4 → 正典 ph #9AA8B6 UI-CONV 2026-09-10 -->
	</view>
</template>

<script setup>
import { computed } from 'vue';
import AppIcon from '../ui/AppIcon.vue';

const props = defineProps({ app: { type: Object, required: true } });
defineEmits(['select']);

// p009 正典 .promo .ic：42px 缩写块（底色/字色来自数据），替代位图图标
const chipStyle = computed(() => ({
	background: props.app.bg || 'rgba(27, 109, 255, 0.08)',
	color: props.app.color || '#1B6DFF'
}));
</script>

<style scoped>
.app-card { display: grid; grid-template-columns: 84rpx 1fr auto; align-items: center; gap: 20rpx; padding: 22rpx 0; border-bottom: 1rpx solid var(--ble-line-soft); }
.app-card:last-child { border-bottom: none; }
.app-card-hover { opacity: 0.92; }
.app-chip { display: flex; align-items: center; justify-content: center; width: 84rpx; height: 84rpx; border-radius: 20rpx; font-size: 30rpx; font-weight: 800; }
.app-copy { min-width: 0; }
.app-heading { display: flex; align-items: center; gap: 10rpx; }
.app-name { color: var(--ble-text); font-size: 30rpx; font-weight: 800; }
.app-tag { padding: 4rpx 10rpx; border-radius: 999rpx; color: var(--ble-brand); background: rgba(27, 109, 255, 0.09); font-size: 19rpx; font-weight: 700; }
.app-desc { display: -webkit-box; margin-top: 6rpx; overflow: hidden; color: var(--ble-text-muted); font-size: 22rpx; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
</style>
