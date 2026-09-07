<template>
	<view class="ble-shell index-shell">
		<app-navbar kicker="SmartBLE Mini" title="BLE Toolkit+" :status-active="bleState === 'on'" :status-text="bleStatusText" />

		<view class="ble-content page-content">
			<scan-summary
				id="scan-summary"
				:filtered-count="filteredDevices.length"
				:device-count="devices.length"
				:connected-count="connectedCount"
				:scanning="isScanning"
				:error="scanError"
				@toggle="toggleScan"
				@retry="startScan"
			/>

			<view class="results-panel ble-card">
				<view class="results-header">
					<text class="ble-section-title">附近设备</text>
					<text class="filter-toggle" @click="showFilters = !showFilters">{{ showFilters ? '收起筛选' : '筛选' }}</text>
				</view>
				<filter-panel v-if="showFilters" v-model="filterSettings" class="inline-filter" />

				<view class="tab-content">
					<scroll-view scroll-y class="device-scroll">
						<empty-state
							v-if="filteredDevices.length === 0"
							image="/static/placeholders/empty_scan.png"
							:title="devices.length > 0 ? '当前没有匹配设备' : '还没有扫描结果'"
							:description="devices.length > 0 ? '调整筛选试试。' : '点上方按钮开始扫描。'"
						/>
						<template v-else>
							<device-card
								v-for="device in filteredDevices"
								:key="device.deviceId"
								:device="device"
								@click="showAdvertisingData"
								@generic="connectDevice"
								@profile="openProfileDevice"
							/>
						</template>
					</scroll-view>
				</view>
			</view>

			<advertisement-dialog :visible="showAdvDataModal" :device="selectedAdvertisementDevice" @close="closeAdvDataModal" @copy="copyAdvData" />
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import DeviceCard from '../../components/device-card/device-card.vue';
import FilterPanel from '../../components/filter-panel/filter-panel.vue';
import AppNavbar from '../../components/common/app-navbar.vue';
import EmptyState from '../../components/common/empty-state.vue';
import ScanSummary from '../../components/scan/scan-summary.vue';
import AdvertisementDialog from '../../components/scan/advertisement-dialog.vue';
import { useHidStore } from '../../store/hid';
import { useBleScan } from '../../composables/use-ble-scan.js';
import { buildGenericDeviceDetailUrl, buildProfileActionUrl } from '../../services/provisioning/profile-navigation.js';

const hidStore = useHidStore();

const showAdvDataModal = ref(false);
const selectedAdvertisementDevice = ref(null);
const showFilters = ref(false);

const { filterSettings, devices, filteredDevices, connectedDevices: connectedDevicesList, isScanning, scanError, bleState, start: startScan, toggle: toggleScan, prepareConnect } = useBleScan();
const bleStatusText = computed(() => {
	if (bleState.value === 'on') return '蓝牙就绪';
	if (bleState.value === 'unsupported') return '当前平台不支持 BLE';
	return '蓝牙未开启';
});

// 已连接计数纳入 Smart HID 配网会话，避免“配网中却显示已连接 0”的口径漂移（P001-I04）
const connectedCount = computed(() => connectedDevicesList.value.length + (hidStore.sessionOnline ? 1 : 0));

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: '分享一个好用的 BLE 工具: BLE Toolkit+',
	path: '/pages/index/index'
}));
// #endif

const connectDevice = async (device) => {
	await prepareConnect();
	uni.navigateTo({
		url: buildGenericDeviceDetailUrl(device)
	});
};

const openProfileDevice = async (device) => {
	await prepareConnect();
	if (device.profileId === 'smart-hid') {
		hidStore.setCurrentDevice(device);
	}
	uni.navigateTo({ url: buildProfileActionUrl(device.profileId, device) });
};

const showAdvertisingData = (device) => {
	selectedAdvertisementDevice.value = device;
	showAdvDataModal.value = true;
};

const closeAdvDataModal = () => {
	showAdvDataModal.value = false;
	selectedAdvertisementDevice.value = null;
};

const copyAdvData = (content) => {
	uni.setClipboardData({
		data: content,
		success: () => uni.showToast({ title: '已复制', icon: 'success' })
	});
};
</script>

<style scoped>
.page-content {
	height: calc(100vh - 2rpx);
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

.filter-toggle { flex-shrink: 0; font-size: 23rpx; font-weight: 700; color: var(--ble-brand); }
.inline-filter { margin-bottom: 18rpx; }

.tab-content {
	flex: 1;
	min-height: 0;
}

.device-scroll {
	height: 100%;
}

</style>
