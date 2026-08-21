<template>
	<view class="hero-card ble-card-hero">
		<view class="ble-section-meta">
			<text class="ble-kicker">Scan Console</text>
			<text class="ble-title hero-title">更顺手的 BLE 扫描与接入面板</text>
			<text class="ble-subtitle">把扫描、过滤、广播数据查看和连接入口收进一条清晰路径里，适合现场调试和快速排障。</text>
		</view>
		<view class="ble-stat-grid">
			<view class="ble-stat-card"><text class="ble-stat-value">{{ filteredCount }}</text><text class="ble-stat-label">当前结果</text></view>
			<view class="ble-stat-card"><text class="ble-stat-value">{{ deviceCount }}</text><text class="ble-stat-label">已发现设备</text></view>
			<view class="ble-stat-card"><text class="ble-stat-value">{{ connectedCount }}</text><text class="ble-stat-label">已连接</text></view>
		</view>
		<view class="hero-actions">
			<button :class="['ble-button-primary', 'scan-btn', scanning ? 'scanning' : '']" @click="$emit('toggle')">
				<text class="scan-icon">{{ scanning ? '■' : '◉' }}</text><text>{{ scanning ? '停止扫描' : '开始扫描' }}</text>
			</button>
			<view class="hero-tags">
				<view class="ble-chip ble-chip-soft"><text>筛选前缀 {{ prefix || '全部' }}</text></view>
				<view class="ble-chip" :class="hideNoName ? 'ble-chip-success' : 'ble-chip-muted'"><text>{{ hideNoName ? '隐藏无名设备' : '显示全部设备' }}</text></view>
			</view>
			<error-banner v-if="error" :title="`扫描失败（${error.code}）`" :message="`${error.message}。请确认蓝牙/定位权限后重试。`" action-label="重试" @action="$emit('retry')" />
		</view>
	</view>
</template>

<script setup>
import ErrorBanner from '../common/error-banner.vue';
defineProps({
	filteredCount: { type: Number, default: 0 }, deviceCount: { type: Number, default: 0 }, connectedCount: { type: Number, default: 0 },
	scanning: { type: Boolean, default: false }, prefix: { type: String, default: '' }, hideNoName: { type: Boolean, default: false }, error: { type: Object, default: null }
});
defineEmits(['toggle', 'retry']);
</script>

<style scoped>
.hero-card { padding: 34rpx; display: flex; flex-direction: column; gap: 28rpx; }
.hero-actions { display: flex; flex-direction: column; gap: 16rpx; }
.hero-tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.scan-btn { width: 100%; }
.scan-btn.scanning { background: linear-gradient(135deg, #ff5e62, #ff9f43); box-shadow: 0 18rpx 42rpx rgba(242,85,95,.22); }
.scan-icon { font-size: 32rpx; line-height: 1; }
</style>
