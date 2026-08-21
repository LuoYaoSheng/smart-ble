<template>
	<view class="scan-toolbar ble-card">
		<view class="scan-data">
			<view class="scan-primary"><text class="scan-count">{{ filteredCount }}</text><text class="scan-label">附近设备</text></view>
			<text class="scan-secondary">扫描到 {{ deviceCount }} 台 · 已连接 {{ connectedCount }} 台</text>
		</view>
		<view class="scan-actions">
			<button :class="['ble-button-primary', 'scan-btn', scanning ? 'scanning' : '']" @click="$emit('toggle')">
				<text class="scan-icon">{{ scanning ? '■' : '◉' }}</text><text>{{ scanning ? '停止扫描' : '开始扫描' }}</text>
			</button>
		</view>
		<error-banner v-if="error" class="scan-error" :title="`扫描失败（${error.code}）`" :message="`${error.message}。请确认蓝牙/定位权限后重试。`" action-label="重试" @action="$emit('retry')" />
	</view>
</template>

<script setup>
import ErrorBanner from '../common/error-banner.vue';
defineProps({
	filteredCount: { type: Number, default: 0 }, deviceCount: { type: Number, default: 0 }, connectedCount: { type: Number, default: 0 },
	scanning: { type: Boolean, default: false }, error: { type: Object, default: null }
});
defineEmits(['toggle', 'retry']);
</script>

<style scoped>
.scan-toolbar { padding: 22rpx 24rpx; display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 18rpx; }
.scan-data { min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.scan-primary { display: flex; align-items: baseline; gap: 10rpx; }
.scan-count { font-size: 46rpx; line-height: 1; font-weight: 800; color: var(--ble-text); }
.scan-label { font-size: 25rpx; font-weight: 700; color: var(--ble-text); }
.scan-secondary { font-size: 21rpx; color: var(--ble-text-muted); }
.scan-actions { display: flex; align-items: center; }
.scan-btn { min-width: 210rpx; }
.scan-btn.scanning { background: linear-gradient(135deg, #ff5e62, #ff9f43); box-shadow: 0 18rpx 42rpx rgba(242,85,95,.22); }
.scan-icon { font-size: 32rpx; line-height: 1; }
.scan-error { grid-column: 1 / -1; }
</style>
