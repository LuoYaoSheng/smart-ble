<template>
	<view class="custom-navbar">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-content" :style="navContentStyle">
			<view class="nav-copy">
				<text class="nav-kicker">{{ kicker }}</text>
				<text class="nav-title">{{ title }}</text>
			</view>
			<slot v-if="!showStatusBelow" name="action">
				<view v-if="statusText" class="bt-chip">
					<view class="bt-dot" :class="statusToneClass"></view>
					<text class="bt-word">{{ statusText }}</text>
				</view>
			</slot>
		</view>
		<view v-if="showStatusBelow" class="nav-status-row" :style="navStatusStyle">
			<view class="bt-chip">
				<view class="bt-dot" :class="statusToneClass"></view>
				<text class="bt-word">{{ statusText }}</text>
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
	statusActive: { type: Boolean, default: false },
	// 蓝牙状态三态（正典 p001 bt-chip）：'on' 就绪绿 / 'off' 未开启红 / '' 默认灰
	statusTone: { type: String, default: '' }
});

const statusToneClass = computed(() => {
	const tone = props.statusTone || (props.statusActive ? 'on' : '');
	return tone === 'on' ? 'on' : tone === 'off' ? 'off' : '';
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
.custom-navbar { background: linear-gradient(180deg, #FFFFFF, #F8FBFF); border-bottom: 1rpx solid var(--ble-line-soft); }
.nav-content { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding-left: 28rpx; }
.nav-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.nav-kicker { font-size: 20rpx; letter-spacing: 4rpx; color: var(--ble-brand); font-weight: 800; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-title { font-size: 40rpx; font-weight: 800; color: var(--ble-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-status-row { display: flex; padding-left: 28rpx; padding-bottom: 18rpx; }
.bt-chip { display: flex; align-items: center; gap: 12rpx; }
.bt-word { font-size: 22rpx; font-weight: 500; color: var(--ble-text-muted); white-space: nowrap; }
.bt-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #9aa8b6; }
.bt-dot.on { background: #17C7A8; box-shadow: 0 0 16rpx rgba(23, 199, 168, 0.55); }
.bt-dot.off { background: #F2555F; }
</style>
