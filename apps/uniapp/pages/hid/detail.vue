<template>
	<view class="ble-shell">
		<view class="page-content">
			<view class="card ble-card">
				<view class="device-title-row">
					<text class="device-title">{{ device?.name || 'Smart HID 设备' }}</text>
					<view class="ble-chip ble-chip-success"><text>{{ device?.protocol || '协议未记录' }}</text></view>
				</view>
				<view class="card-row">
					<text class="card-label">Device ID</text>
					<text class="card-value mono">{{ device?.deviceId || '—' }}</text>
				</view>
				<view class="card-row">
					<text class="card-label">固件版本</text>
					<text class="card-value">{{ device?.firmware || '—' }}</text>
				</view>
			</view>

			<view class="card ble-card">
				<view class="card-title-row">
					<text class="card-title">最近配置</text>
				</view>
				<view class="card-row">
					<text class="card-label">Wi-Fi</text>
					<text class="card-value">{{ device?.lastWifi || '—' }}</text>
				</view>
				<view class="card-row">
					<text class="card-label">ControlHub</text>
					<text class="card-value">{{ device?.lastHub || '—' }}</text>
				</view>
			</view>

			<view class="actions">
				<button class="ble-btn ble-btn--primary ble-btn--lg ble-btn--block" @click="reconfigure">重新配置</button>
				<view class="secondary-actions">
					<button class="ble-btn ble-btn--secondary ble-btn--md ble-btn--block" @click="goDiagnostics">运行诊断</button>
					<button class="ble-btn ble-btn--ghost ble-btn--md ble-btn--block" @click="goAdvancedBle">高级 BLE 调试</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useHidStore } from '../../store/hid';
import {
	buildGenericDeviceDetailUrl,
	buildHidDiagnosticsUrl,
	buildHidProvisionUrl
} from '../../services/hid-navigation.js';

const hidStore = useHidStore();
const deviceId = ref('');

const device = computed(() => {
	const allDevices = [hidStore.currentDevice, ...hidStore.knownDevices].filter(Boolean);
	return allDevices.find((item) => item.deviceId === deviceId.value) || null;
});

onLoad((opts) => {
	deviceId.value = opts.deviceId ? decodeURIComponent(opts.deviceId) : '';
	if (!deviceId.value || !device.value) {
		uni.showModal({ title: '设备记录不存在', content: '该历史设备记录已不存在，请返回设备列表。', showCancel: false, success: () => uni.navigateBack() });
	}
});

const reconfigure = () => {
	if (!device.value) return;
	hidStore.setCurrentDevice(device.value);
	uni.navigateTo({ url: buildHidProvisionUrl(device.value.deviceId) });
};

const goDiagnostics = () => {
	if (!device.value) return;
	uni.navigateTo({ url: buildHidDiagnosticsUrl(device.value.deviceId) });
};

const goAdvancedBle = () => {
	if (!device.value) return;
	uni.navigateTo({ url: buildGenericDeviceDetailUrl(device.value) });
};
</script>

<style scoped>
.page-content {
	padding: 20rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.card {
	padding: 22rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.device-title-row,
.card-title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14rpx;
	padding-bottom: 12rpx;
	border-bottom: 1rpx solid var(--ble-line-soft);
}

.device-title { min-width: 0; color: var(--ble-text); font-size: 32rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-title {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.card-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.card-label {
	font-size: 24rpx;
	color: var(--ble-text-muted);
}

.card-value {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--ble-text);
	text-align: right;
}

.card-value.mono {
	font-family: "SF Mono", "Roboto Mono", Menlo, monospace;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.secondary-actions { display: flex; gap: 12rpx; }
.secondary-actions .ble-btn { flex: 1; min-width: 0; padding: 0 16rpx; }
</style>
