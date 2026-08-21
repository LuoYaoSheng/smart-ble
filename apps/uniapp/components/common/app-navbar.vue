<template>
	<view class="custom-navbar">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-content" :style="{ height: navBarHeight + 'px' }">
			<view class="nav-copy">
				<text class="nav-kicker">{{ kicker }}</text>
				<text class="nav-title">{{ title }}</text>
			</view>
			<slot name="action">
				<view v-if="statusText" class="status-indicator" :class="{ active: statusActive }">
					<view class="status-dot" :class="statusActive ? 'active' : ''"></view>
					<text class="status-text">{{ statusText }}</text>
				</view>
			</slot>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
	kicker: { type: String, default: '' },
	title: { type: String, required: true },
	statusText: { type: String, default: '' },
	statusActive: { type: Boolean, default: false }
});

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight || 20);
const navBarHeight = ref(44);
// #ifdef MP-WEIXIN
const menu = uni.getMenuButtonBoundingClientRect();
navBarHeight.value = (menu.top - statusBarHeight.value) * 2 + menu.height;
// #endif
</script>

<style scoped>
.custom-navbar { background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(246,250,255,.92)); border-bottom: 1rpx solid rgba(20,76,136,.08); }
.nav-content { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 0 28rpx; }
.nav-copy { min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.nav-kicker { font-size: 18rpx; letter-spacing: 3rpx; color: var(--ble-text-muted); text-transform: uppercase; }
.nav-title { font-size: 34rpx; font-weight: 700; color: var(--ble-text); }
.status-indicator { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 18rpx; border-radius: 999rpx; background: rgba(96,117,141,.08); }
.status-indicator.active { background: rgba(23,199,168,.12); }
.status-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #9aa8b6; }
.status-dot.active { background: var(--ble-mint); box-shadow: 0 0 18rpx rgba(23,199,168,.48); }
.status-text { font-size: 22rpx; font-weight: 600; color: var(--ble-text-subtle); }
</style>
