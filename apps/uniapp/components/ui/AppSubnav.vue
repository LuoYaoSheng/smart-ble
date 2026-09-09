<template>
	<view class="app-subnav">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="subnav-row" :style="{ paddingRight: trailingSafe + 'px' }">
			<view class="back-btn" hover-class="back-btn-hover" :hover-stay-time="80" @click="onBack">
				<AppIcon name="chev-r" :size="34" tone="text" :rotate="180" />
			</view>
			<view class="t">{{ title }}</view>
			<view class="action">
				<slot name="action"></slot>
			</view>
		</view>
	</view>
</template>

<script setup>
// 正典二级页导航栏（COMPONENT_CONTRACT A2 · prototype pages.css .subnav）
// 右槽：可选副按钮（如 P006「固件更新」ghost sm dangerText）
// 返回拦截：页面绑定 @back 时完全交由页面处理（P002 离开确认 U-01），未绑定走默认返回
import { ref, getCurrentInstance } from 'vue';
import AppIcon from './AppIcon.vue';

defineProps({ title: { type: String, required: true } });
const emit = defineEmits(['back']);

const instance = getCurrentInstance();
const windowInfo = uni.getWindowInfo?.() || {};
const statusBarHeight = ref(0);
const trailingSafe = ref(4);

// #ifdef MP-WEIXIN
statusBarHeight.value = windowInfo.statusBarHeight || 20;
const menu = uni.getMenuButtonBoundingClientRect?.();
if (menu && menu.top != null) {
	trailingSafe.value = Math.max((windowInfo.windowWidth || 375) - menu.left + 12, 4);
}
// #endif

const onBack = () => {
	emit('back');
	// 页面监听了 back（如 P002 离开确认）则不执行默认返回
	if (!instance?.vnode?.props?.onBack) {
		uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) });
	}
};
</script>

<style scoped>
.app-subnav {
	background: var(--c-card);
	border-bottom: 2rpx solid var(--c-line-soft);
	position: sticky;
	top: 0;
	z-index: var(--z-nav);
}
.subnav-row {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 16rpx 4rpx 20rpx;
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
.action { display: flex; align-items: center; flex-shrink: 0; }
</style>
