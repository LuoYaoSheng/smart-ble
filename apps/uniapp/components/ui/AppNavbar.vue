<template>
	<view class="app-navbar">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="navbar-inner" :style="{ paddingRight: trailingSafe + 'px' }">
			<view class="kicker">{{ kicker }}</view>
			<view class="row">
				<view class="title">{{ title }}</view>
				<view class="bt-chip">
					<slot name="status">
						<view class="bt-dot" :class="statusTone"></view>
						<text>{{ statusText }}</text>
					</slot>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
// 正典 tab 页导航栏（COMPONENT_CONTRACT A1 · prototype pages.css .navbar）
// statusTone: on=就绪(success 点微光) / off=未开启(danger 点) / 空=平台不支持(ph 点)
// #status 槽位：P007 会话 chip / P008 平台 chip + 状态 badge / P009 版本 chip（正典各页右区差异）
// 平台安全区：MP-WEIXIN 顶部状态栏占位 + 右侧胶囊避让（APP 端 webview 默认在状态栏之下，不占位）
import { ref } from 'vue';

defineProps({
	kicker: { type: String, default: 'BLE TOOLKIT+' },
	title: { type: String, required: true },
	statusText: { type: String, default: '' },
	statusTone: { type: String, default: '' }
});

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
</script>

<style scoped>
.app-navbar {
	padding: 16rpx 4rpx 24rpx;
	background: linear-gradient(180deg, var(--c-card), var(--c-bg));
	border-bottom: 2rpx solid var(--c-line-soft);
	position: sticky;
	top: 0;
	z-index: var(--z-nav);
}
.kicker { font-size: var(--fs-micro); letter-spacing: 4rpx; color: var(--c-primary); font-weight: var(--fw-xbold); }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-top: 4rpx; }
.title { font-size: var(--fs-title); font-weight: var(--fw-xbold); color: var(--c-text); }
.bt-chip { display: flex; align-items: center; gap: 12rpx; font-size: var(--fs-mini); color: var(--c-mut); font-weight: var(--fw-med); flex-shrink: 0; }
.bt-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: var(--c-ph); }
.bt-dot.on { background: var(--c-success); box-shadow: 0 0 16rpx rgba(23, 199, 168, 0.55); }
.bt-dot.off { background: var(--c-danger); }
</style>
