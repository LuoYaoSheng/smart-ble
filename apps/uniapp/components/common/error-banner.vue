<template>
	<view v-if="message" class="ebanner" role="alert">
		<view class="eb-t">
			<app-icon name="warn" :size="30" color="#F2555F" />
			<text class="eb-title">扫描失败</text>
			<text v-if="code" class="eb-code ble-mono">{{ code }}</text>
		</view>
		<text class="eb-d">{{ message }}</text>
		<button class="ble-btn ble-btn--sm eb-retry" @click="$emit('action')">
			<app-icon name="refresh" :size="26" color="#F2555F" />
			<text>{{ actionLabel }}</text>
		</button>
	</view>
</template>

<script setup>
import AppIcon from './app-icon.vue';

// 正典 B8 ebanner：danger-weak 底 + 左侧 3px danger 边；标题固定「扫描失败」+ code chip；
// message 正文 + ghost danger-t 重试按钮。code 为应用层错误码（ERROR_CODE.md BLE_00x）。
defineProps({
	code: { type: String, default: '' },
	message: { type: String, default: '' },
	actionLabel: { type: String, default: '重试' }
});
defineEmits(['action']);
</script>

<style scoped>
.ebanner {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 10rpx;
	padding: 22rpx 24rpx;
	border-radius: 26rpx;
	background: var(--c-danger-weak);
	border-left: 6rpx solid var(--c-danger);
}

.eb-t { display: flex; align-items: center; gap: 12rpx; }

.eb-title { font-size: 32rpx; font-weight: 700; color: var(--c-danger); }

.eb-code {
	padding: 2rpx 14rpx;
	border-radius: 12rpx;
	background: var(--c-card);
	font-size: 22rpx;
	color: var(--c-danger);
}

.eb-d { font-size: 26rpx; line-height: 1.5; color: var(--c-sub); }

.eb-retry {
	color: var(--c-danger);
	background: transparent;
	box-shadow: inset 0 0 0 3rpx var(--c-danger);
}
</style>
