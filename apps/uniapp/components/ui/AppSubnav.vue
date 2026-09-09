<template>
	<view class="app-subnav">
		<view class="back-btn" hover-class="back-btn-hover" :hover-stay-time="80" @click="onBack">
			<AppIcon name="chev-r" :size="34" tone="text" :rotate="180" />
		</view>
		<view class="t">{{ title }}</view>
		<view class="action">
			<slot name="action"></slot>
		</view>
	</view>
</template>

<script setup>
// 正典二级页导航栏（COMPONENT_CONTRACT A2 · prototype pages.css .subnav）
// 右槽：可选副按钮（如 P006「固件更新」ghost sm dangerText）
import AppIcon from './AppIcon.vue';

defineProps({ title: { type: String, required: true } });
const emit = defineEmits(['back']);

const onBack = () => {
	emit('back');
	uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) });
};
</script>

<style scoped>
.app-subnav {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 16rpx 4rpx 20rpx;
	background: var(--c-card);
	border-bottom: 2rpx solid var(--c-line-soft);
	position: sticky;
	top: 0;
	z-index: var(--z-nav);
}
.back-btn {
	width: 60rpx;
	height: 60rpx;
	border-radius: 18rpx;
	background: var(--c-fill);
	color: var(--c-text);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.back-btn-hover { opacity: 0.8; }
.t { font-size: var(--fs-h1); font-weight: var(--fw-bold); flex: 1; color: var(--c-text); }
.action { display: flex; align-items: center; }
</style>
