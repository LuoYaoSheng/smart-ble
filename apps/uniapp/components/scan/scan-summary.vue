<template>
	<view class="scan-toolbar ble-card">
		<view class="scan-head">
			<view class="scan-title-group">
				<text class="scan-label">扫描</text>
				<text class="scan-state" :class="{ scanning, warning: !!error }">{{ stateText }}</text>
			</view>
			<text class="scan-secondary">{{ deviceCount }} 台设备 · {{ connectedCount }} 台已连接</text>
		</view>
		<button class="ble-btn ble-btn--lg ble-btn--block" :class="scanning ? 'ble-btn--danger' : 'ble-btn--primary'" @click="$emit('toggle')">
			{{ scanning ? '停止扫描' : '开始扫描' }}
		</button>
		<error-banner v-if="error" class="scan-error" :title="`扫描失败（${error.code}）`" :message="`${error.message}。请确认蓝牙/定位权限后重试。`" action-label="重试" @action="$emit('retry')" />
	</view>
</template>

<script setup>
import { computed } from 'vue';
import ErrorBanner from '../common/error-banner.vue';
const props = defineProps({
	filteredCount: { type: Number, default: 0 }, deviceCount: { type: Number, default: 0 }, connectedCount: { type: Number, default: 0 },
	scanning: { type: Boolean, default: false }, error: { type: Object, default: null }
});
defineEmits(['toggle', 'retry']);

const stateText = computed(() => {
	if (props.scanning) return '扫描中';
	if (props.error) return '需重试';
	return props.deviceCount > 0 ? '已完成' : '待开始';
});
</script>

<style scoped>
.scan-toolbar {
	padding: 24rpx;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.scan-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.scan-title-group {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
}

.scan-label {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.scan-secondary {
	font-size: 22rpx;
	font-weight: 600;
	color: var(--ble-text-muted);
}

.scan-state {
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(96, 117, 141, 0.1);
	font-size: 20rpx;
	font-weight: 700;
	color: var(--ble-text-subtle);
}
.scan-state.scanning {
	background: rgba(23, 199, 168, 0.14);
	color: #0e9c82;
}
.scan-state.warning {
	background: rgba(242, 85, 95, 0.14);
	color: #d14550;
}

.scan-error {
	margin-top: 4rpx;
}
</style>
