<template>
	<view class="custom-navbar">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-content" :style="navContentStyle">
			<view class="nav-copy">
				<text class="nav-kicker">{{ kicker }}</text>
				<text class="nav-title">{{ title }}</text>
			</view>
			<slot v-if="!showStatusBelow" name="action">
				<view v-if="statusText" class="status-indicator" :class="{ active: statusActive }">
					<view class="status-dot" :class="statusActive ? 'active' : ''"></view>
					<text class="status-text">{{ statusText }}</text>
				</view>
			</slot>
		</view>
		<view v-if="showStatusBelow" class="nav-status-row" :style="navStatusStyle">
			<view class="status-indicator" :class="{ active: statusActive }">
				<view class="status-dot" :class="statusActive ? 'active' : ''"></view>
				<text class="status-text">{{ statusText }}</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
	kicker: { type: String, default: '' },
	title: { type: String, required: true },
	statusText: { type: String, default: '' },
	statusActive: { type: Boolean, default: false }
});

const windowInfo = uni.getWindowInfo?.() || {};
const statusBarHeight = ref(windowInfo.statusBarHeight || 20);
const navBarHeight = ref(44);
const trailingSafeWidth = ref(28);
const isWeixinMiniProgram = ref(false);
const showStatusBelow = computed(() => isWeixinMiniProgram.value && Boolean(props.statusText));

const navContentStyle = computed(() => ({
	height: `${navBarHeight.value}px`,
	paddingRight: `${trailingSafeWidth.value}px`
}));

const navStatusStyle = computed(() => ({
	paddingRight: `${trailingSafeWidth.value}px`
}));

// #ifdef MP-WEIXIN
isWeixinMiniProgram.value = true;
const menu = uni.getMenuButtonBoundingClientRect();
navBarHeight.value = (menu.top - statusBarHeight.value) * 2 + menu.height;
trailingSafeWidth.value = Math.max((windowInfo.windowWidth || 0) - menu.left + 12, 28);
// #endif
</script>

<style scoped>
.custom-navbar { background: var(--ble-gradient-surface); border-bottom: 1rpx solid var(--ble-line-soft); }
.nav-content { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding-left: 28rpx; }
.nav-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.nav-kicker { font-size: 18rpx; letter-spacing: 3rpx; color: var(--ble-text-muted); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-title { font-size: 34rpx; font-weight: 700; color: var(--ble-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-status-row { display: flex; padding-left: 28rpx; padding-bottom: 18rpx; }
.status-indicator { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 18rpx; border-radius: 999rpx; background: rgba(96,117,141,.08); }
.status-indicator.active { background: rgba(23,199,168,.12); }
.status-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #9aa8b6; }
.status-dot.active { background: var(--ble-mint); box-shadow: 0 0 18rpx rgba(23,199,168,.48); }
.status-text { font-size: 22rpx; font-weight: 600; color: var(--ble-text-subtle); white-space: nowrap; }
</style>
