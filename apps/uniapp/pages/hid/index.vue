<template>
	<view class="ble-shell">
		<app-navbar kicker="Smart HID" title="蓝牙配网与维护" :status-active="bleState === 'on'" :status-text="bleState === 'on' ? '蓝牙就绪' : '蓝牙未开启'" />

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

			<empty-state v-if="!hasConfiguredDevice" image="/static/placeholders/empty_scan.png" title="还没有已配置的 Smart HID 设备" description="首次配网会通过附近 BLE 搜索识别设备；完成后会把最近一次配置记录留在这里。" />

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
import { computed } from 'vue';
import { useBleStore } from '../../store/ble';
import { useHidStore } from '../../store/hid';
import AppNavbar from '../../components/common/app-navbar.vue';
import EmptyState from '../../components/common/empty-state.vue';

const bleStore = useBleStore();
const hidStore = useHidStore();

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
