<template>
	<view class="ble-shell">
		<view class="custom-navbar">
			<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
			<view class="nav-content" :style="{ height: navBarHeight + 'px' }">
				<view class="nav-copy">
					<text class="nav-kicker">Smart HID</text>
					<text class="nav-title">蓝牙配网与维护</text>
				</view>
				<view class="ble-status-indicator" :class="bleState === 'on' ? 'active' : ''">
					<view class="status-dot" :class="bleState === 'on' ? 'green' : 'grey'"></view>
					<text class="status-text">{{ bleState === 'on' ? '蓝牙就绪' : '蓝牙未开启' }}</text>
				</view>
			</view>
		</view>

		<view class="ble-content">
			<view class="hero-card ble-card-hero">
				<view class="ble-section-meta">
					<text class="ble-kicker">Provisioning Flow</text>
					<text class="ble-title">让 Smart HID 的配网流程看起来更像产品，而不是工具脚本</text>
					<text class="ble-subtitle">从搜索设备、扫码绑定到 Wi-Fi 下发，入口先统一收敛到一个轻量向导里。</text>
				</view>

				<view class="ble-stat-grid">
					<view class="ble-stat-card">
						<text class="ble-stat-value">{{ knownDevices.length }}</text>
						<text class="ble-stat-label">历史设备</text>
					</view>
					<view class="ble-stat-card">
						<text class="ble-stat-value">{{ hasConfiguredDevice ? '已启用' : '未配置' }}</text>
						<text class="ble-stat-label">当前状态</text>
					</view>
					<view class="ble-stat-card">
						<text class="ble-stat-value">{{ bleState === 'on' ? 'Ready' : 'Off' }}</text>
						<text class="ble-stat-label">蓝牙环境</text>
					</view>
				</view>

				<button class="ble-button-primary hero-button" @click="goAdd">
					<text>开始配置 Smart HID</text>
				</button>
			</view>

			<view v-if="!hasConfiguredDevice" class="ble-empty-card">
				<image src="/static/placeholders/empty_scan.png" class="ble-empty-image" mode="aspectFit"></image>
				<text class="ble-empty-title">还没有已配置的 Smart HID 设备</text>
				<text class="ble-empty-copy">首次配网会通过附近 BLE 搜索识别设备，不需要二维码；完成后会把最近一次配置记录留在这里。</text>
			</view>

			<view v-else class="history-panel ble-card">
				<view class="panel-header">
					<view class="ble-section-meta">
						<text class="ble-section-title">最近配置</text>
						<text class="ble-section-caption">这里只保留本地历史记录，不代表设备实时在线状态。</text>
					</view>
					<view class="ble-chip ble-chip-soft">
						<text>{{ knownDevices.length }} 台设备</text>
					</view>
				</view>

				<view class="history-list">
					<view class="device-item" v-for="device in knownDevices" :key="device.deviceId" @click="goDetail(device)">
						<view class="device-info">
							<text class="device-name">{{ device.name || 'Smart HID 设备' }}</text>
							<text class="device-id ble-mono">{{ device.deviceId }}</text>
						</view>
						<text class="device-arrow">›</text>
					</view>
				</view>

				<button class="ble-button-secondary history-button" @click="goAdd">
					<text>配置新设备</text>
				</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useBleStore } from '../../store/ble';
import { useHidStore } from '../../store/hid';

const bleStore = useBleStore();
const hidStore = useHidStore();

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight || 20);
const navBarHeight = ref(44);

const bleState = computed(() => bleStore.bleState);
const knownDevices = computed(() => hidStore.knownDevices);
const hasConfiguredDevice = computed(() => knownDevices.value.length > 0);

const goAdd = () => {
	uni.navigateTo({ url: '/pages/hid/add' });
};

const goDetail = (device) => {
	hidStore.setCurrentDevice(device);
	uni.navigateTo({ url: `/pages/hid/detail?deviceId=${encodeURIComponent(device.deviceId)}` });
};
</script>

<style scoped>
.custom-navbar {
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(246, 250, 255, 0.92) 100%);
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.08);
}

.nav-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 28rpx;
}

.nav-copy {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.nav-kicker {
	font-size: 18rpx;
	letter-spacing: 3rpx;
	color: var(--ble-text-muted);
	text-transform: uppercase;
}

.nav-title {
	font-size: 34rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.ble-status-indicator {
	display: flex;
	align-items: center;
	gap: 10rpx;
	padding: 12rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(96, 117, 141, 0.08);
}

.ble-status-indicator.active {
	background: rgba(23, 199, 168, 0.12);
}

.status-dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
}

.status-dot.green {
	background: var(--ble-mint);
	box-shadow: 0 0 18rpx rgba(23, 199, 168, 0.48);
}

.status-dot.grey {
	background: #9aa8b6;
}

.status-text {
	font-size: 22rpx;
	font-weight: 600;
	color: var(--ble-text-subtle);
}

.hero-card {
	padding: 34rpx;
	display: flex;
	flex-direction: column;
	gap: 28rpx;
}

.hero-button {
	margin-top: 4rpx;
}

.history-panel {
	padding: 26rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.panel-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.history-list {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.device-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.78);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
}

.device-info {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.device-name {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.device-id {
	font-size: 22rpx;
	color: var(--ble-text-muted);
}

.device-arrow {
	font-size: 42rpx;
	line-height: 1;
	color: var(--ble-text-muted);
}

.history-button {
	margin-top: 4rpx;
}
</style>
