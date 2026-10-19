<template>
	<view class="app-card">
		<view v-if="title || $slots.header" class="card-t">
			<slot name="header"></slot>
			<text v-if="title">{{ title }}</text>
		</view>
		<view v-if="desc" class="card-d">{{ desc }}</view>
		<slot></slot>
	</view>
</template>

<script setup>
// 正典卡片容器（COMPONENT_CONTRACT · prototype components.css .card）
defineProps({
	title: { type: String, default: '' },
	desc: { type: String, default: '' }
});
</script>

<style scoped>
.app-card {
	background: var(--c-card);
	border: 2rpx solid var(--c-line);
	border-radius: var(--r-lg);
	padding: var(--sp-4);
	box-shadow: var(--shadow-1);
	margin-bottom: var(--sp-3);
}
.card-t { font-size: var(--fs-h1); font-weight: var(--fw-bold); display: flex; align-items: center; gap: 16rpx; margin-bottom: 8rpx; color: var(--c-text); }
.card-d { font-size: var(--fs-cap); color: var(--c-mut); margin-bottom: 20rpx; line-height: 1.5; }
</style>
