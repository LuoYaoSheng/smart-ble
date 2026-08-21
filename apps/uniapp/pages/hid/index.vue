<template>
	<view class="ble-shell">
		<app-navbar kicker="Smart HID" title="蓝牙配网与维护" :status-active="bleState === 'on'" :status-text="bleState === 'on' ? '蓝牙就绪' : '蓝牙未开启'" />

		<view class="ble-content">
			<discovery-panel :devices="nearbyDevices" :scanning="scanning" :error="discoveryError" @scan="scan" @select="continueWith" />

			<view v-if="hasConfiguredDevice" class="history-panel ble-card">
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

				<button class="ble-button-secondary history-button" @click="scan">
					<text>重新搜索设备</text>
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
import DiscoveryPanel from '../../components/hid/discovery-panel.vue';
import { useSmartHidDiscovery } from '../../composables/use-smart-hid-discovery.js';

const bleStore = useBleStore();
const hidStore = useHidStore();

const bleState = computed(() => bleStore.bleState);
const knownDevices = computed(() => hidStore.knownDevices);
const hasConfiguredDevice = computed(() => knownDevices.value.length > 0);
const { devices: nearbyDevices, scanning, error: discoveryError, scan, continueWith } = useSmartHidDiscovery();

const goDetail = (device) => {
	hidStore.setCurrentDevice(device);
	uni.navigateTo({ url: `/pages/hid/detail?deviceId=${encodeURIComponent(device.deviceId)}` });
};
</script>

<style scoped>
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
