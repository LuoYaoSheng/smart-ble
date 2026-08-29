<template>
	<view class="ble-shell connected-shell">
		<app-navbar kicker="SmartBLE Mini" title="已连接设备" />

		<view class="ble-content page-content">
			<view v-if="connectedDevicesList.length > 1" class="summary-card ble-card">
				<text class="ble-section-caption">{{ connectedDevicesList.length }} 台设备保持连接</text>
				<button class="ble-btn ble-btn--ghost ble-btn--md" @click="disconnectAllDevices">全部断开</button>
			</view>

			<view class="results-panel ble-card">
				<view class="results-header">
					<text class="ble-section-title">设备列表</text>
				</view>

				<view class="tab-content">
					<scroll-view scroll-y class="device-scroll">
						<empty-state
							v-if="connectedDevicesList.length === 0"
							image="/static/placeholders/empty_connected.png"
							title="还没有连接中的设备"
							:description="hidStore.sessionOnline ? 'Smart HID 配网连接进行中，这里列出通用调试连接。' : '先在“扫描”页找到设备并连接，这里会保留会话入口。'"
							action-label="去扫描"
							@action="goScan"
						/>
						<template v-else>
							<device-card
								v-for="device in connectedDevicesList"
								:key="device.deviceId"
								:device="device"
								:isConnectionTab="true"
								@click="openConnectedDevice"
								@action="disconnectDeviceFromList"
							/>
						</template>
					</scroll-view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import AppNavbar from '../../components/common/app-navbar.vue';
import DeviceCard from '../../components/device-card/device-card.vue';
import EmptyState from '../../components/common/empty-state.vue';
import { useBleStore } from '../../store/ble';
import { useHidStore } from '../../store/hid';
import { summarizeDisconnectAllResults } from '../../services/connected-disconnect.js';
import { buildConnectedDeviceOpenUrl } from '../../services/provisioning/profile-navigation.js';
import { smartHidService } from '../../services/smart-hid/index.js';

const bleStore = useBleStore();
const hidStore = useHidStore();

const connectedDevicesList = computed(() => bleStore.connectedDevicesList);

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: '分享一个好用的 BLE 工具: BLE Toolkit+',
	path: '/pages/connected/index'
}));
// #endif

const goScan = () => {
	uni.switchTab({ url: '/pages/index/index' });
};

const openConnectedDevice = (device) => {
	uni.navigateTo({
		url: buildConnectedDeviceOpenUrl(device)
	});
};

const disconnectDeviceFromList = async (device) => {
	try {
		if (device.profileId === 'smart-hid' && smartHidService.getSessionState().connected) {
			await smartHidService.disconnect();
		}
		await bleStore.disconnectConnectedDevice(device.deviceId, { remove: true });
		uni.showToast({ title: '已断开', icon: 'success' });
	} catch (error) {
		uni.showToast({ title: error?.message || '断开失败', icon: 'none' });
	}
};

const disconnectAllDevices = async () => {
	const devices = [...connectedDevicesList.value];
	if (devices.length === 0) return;

	const results = await Promise.allSettled(
		devices.map((device) => bleStore.disconnectConnectedDevice(device.deviceId, { remove: true }))
	);
	const summary = summarizeDisconnectAllResults(devices, results);

	if (summary.allSucceeded) {
		uni.showToast({ title: summary.title, icon: 'success' });
		return;
	}

	uni.showModal({
		title: summary.title,
		content: summary.failureSummary
			? `失败设备：${summary.failureSummary}`
			: '部分设备未能断开，请稍后重试。',
		showCancel: false
	});
};
</script>

<style scoped>
.page-content {
	height: calc(100vh - 2rpx);
}

.summary-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	padding: 20rpx 24rpx;
}

.results-panel {
	flex: 1;
	display: flex;
	flex-direction: column;
	padding: 26rpx;
	min-height: 0;
}

.results-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
	margin-bottom: 20rpx;
}

.tab-content {
	flex: 1;
	min-height: 0;
}

.device-scroll {
	height: 100%;
}
</style>
