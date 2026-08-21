<template>
	<view class="ble-shell">
		<view class="page-content">
			<view class="hero-card ble-card-hero">
				<view class="ble-section-meta">
					<text class="ble-kicker">Smart HID Device</text>
					<text class="ble-title">{{ device?.name || 'Smart HID 设备' }}</text>
					<text class="ble-subtitle">查看最近一次配网信息、进入诊断，或者重新开始这一台设备的配置流程。</text>
				</view>

				<view class="hero-tags">
					<view class="ble-chip ble-chip-soft">
						<text class="ble-mono">{{ device?.deviceId || '—' }}</text>
					</view>
					<view class="ble-chip ble-chip-success">
						<text>{{ device?.protocol || '协议未记录' }}</text>
					</view>
				</view>
			</view>

			<view class="card ble-card">
				<view class="card-title-row">
					<text class="card-title">设备资料</text>
				</view>
				<view class="card-row">
					<text class="card-label">Device ID</text>
					<text class="card-value mono">{{ device?.deviceId || '—' }}</text>
				</view>
				<view class="card-row">
					<text class="card-label">固件版本</text>
					<text class="card-value">{{ device?.firmware || '—' }}</text>
				</view>
				<view class="card-row">
					<text class="card-label">协议</text>
					<text class="card-value">{{ device?.protocol || '—' }}</text>
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
				<button class="ble-button-primary" @click="reconfigure">重新配置</button>
				<button class="ble-button-secondary" @click="goDiagnostics">运行诊断</button>
				<button class="ble-button-ghost" @click="goAdvancedBle">高级 BLE 调试</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useHidStore } from '../../store/hid';

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
	uni.navigateTo({ url: '/pages/hid/add' });
};

const goDiagnostics = () => {
	uni.navigateTo({ url: `/pages/hid/diagnostics?deviceId=${encodeURIComponent(deviceId.value)}` });
};

const goAdvancedBle = () => {
	uni.switchTab({ url: '/pages/index/index' });
};
</script>

<style scoped>
.page-content {
	padding: 28rpx;
	display: flex;
	flex-direction: column;
	gap: 22rpx;
}

.hero-card {
	padding: 34rpx;
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.hero-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.card {
	padding: 26rpx;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.card-title-row {
	padding-bottom: 8rpx;
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.08);
}

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
	gap: 14rpx;
}
</style>
