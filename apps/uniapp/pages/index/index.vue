<template>
	<view class="ble-shell index-shell">
		<app-navbar kicker="SmartBLE Mini" title="BLE Toolkit+" :status-active="bleState === 'on'" :status-text="bleState === 'on' ? '蓝牙就绪' : '蓝牙未开启'" />

		<view class="ble-content page-content">
			<scan-summary :filtered-count="filteredDevices.length" :device-count="devices.length" :connected-count="connectedDevicesList.length" :scanning="isScanning" :error="scanError" @toggle="toggleScan" @retry="startScan" />

			<view v-if="hidStore.knownDevices.length > 0" class="hid-history-entry ble-card" @click="goHidHistory">
				<view class="ble-section-meta">
					<text class="ble-section-title">Smart HID 已配置设备</text>
					<text class="ble-section-caption">{{ hidStore.knownDevices.length }} 台设备完成过配网，点击查看历史配置</text>
				</view>
				<text class="entry-arrow">›</text>
			</view>

			<view class="ble-pill-tabs">
				<view
					v-for="(item, index) in tabItems"
					:key="item"
					:class="['ble-pill-tab', currentTab === index ? 'active' : '']"
					@click="currentTab = index"
				>
					{{ item }}
				</view>
			</view>

			<view class="results-panel ble-card">
				<view class="results-header">
					<view class="ble-section-meta">
						<text class="ble-section-title">{{ currentTab === 0 ? '附近设备' : '连接会话' }}</text>
						<text class="ble-section-caption">
							{{ currentTab === 0 ? '点开卡片查看广播原始数据，按按钮进入设备详情。' : '保留最近连接入口，继续调试服务与通信日志。' }}
						</text>
					</view>
					<text v-if="currentTab === 0" class="filter-toggle" @click="showFilters = !showFilters">{{ showFilters ? '收起筛选' : '筛选' }}</text>
				</view>
				<filter-panel v-if="currentTab === 0 && showFilters" v-model="filterSettings" class="inline-filter" />

				<view v-show="currentTab === 0" class="tab-content">
					<scroll-view scroll-y class="device-scroll">
						<empty-state v-if="filteredDevices.length === 0" image="/static/placeholders/empty_scan.png" :title="devices.length > 0 ? '当前没有匹配设备' : '还没有扫描结果'" :description="devices.length > 0 ? '试试放宽过滤条件，或者关闭“隐藏无名设备”。' : '先启动扫描，附近设备会实时出现在这里。'" />
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

				<view v-show="currentTab === 1" class="tab-content">
					<scroll-view scroll-y class="device-scroll">
						<empty-state v-if="connectedDevicesList.length === 0" image="/static/placeholders/empty_connected.png" title="还没有连接中的设备" description="从“附近设备”里进入详情页并建立连接，这里会保留调试入口。" />
						<template v-else>
							<device-card
								v-for="device in connectedDevicesList"
								:key="device.deviceId"
								:device="device"
								:isConnectionTab="true"
								@click="connectDevice"
								@action="disconnectDeviceFromList"
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
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import DeviceCard from '../../components/device-card/device-card.vue';
import FilterPanel from '../../components/filter-panel/filter-panel.vue';
import AppNavbar from '../../components/common/app-navbar.vue';
import EmptyState from '../../components/common/empty-state.vue';
import ScanSummary from '../../components/scan/scan-summary.vue';
import AdvertisementDialog from '../../components/scan/advertisement-dialog.vue';
import { useBleStore } from '../../store/ble';
import { useHidStore } from '../../store/hid';
import { closeDevice } from '../../services/ble-runtime/index.js';
import { useBleScan } from '../../composables/use-ble-scan.js';

const bleStore = useBleStore();
const hidStore = useHidStore();

const showAdvDataModal = ref(false);
const selectedAdvertisementDevice = ref(null);
const showFilters = ref(false);

const currentTab = ref(0);
const tabItems = ['扫描设备', '已连接'];


const { filterSettings, devices, filteredDevices, connectedDevices: connectedDevicesList, isScanning, scanError, bleState, start: startScan, toggle: toggleScan, prepareConnect } = useBleScan();

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: '分享一个好用的 BLE 工具: BLE Toolkit+',
	path: '/pages/index/index'
}));
// #endif

const connectDevice = async (device) => {
	await prepareConnect();
	uni.navigateTo({
		url: `/pages/device/detail?deviceId=${encodeURIComponent(device.deviceId)}`
	});
};

const openProfileDevice = async (device) => {
	await prepareConnect();
	hidStore.setCurrentDevice(device);
	uni.navigateTo({ url: `/pages/hid/add?deviceId=${encodeURIComponent(device.deviceId)}` });
};

const goHidHistory = () => {
	uni.navigateTo({ url: '/pages/hid/history' });
};

const disconnectDeviceFromList = (device) => {
	closeDevice(device.deviceId)
		.then(() => {
			bleStore.removeConnectedDevice(device.deviceId);
			uni.showToast({ title: '已断开', icon: 'success' });
		})
		.catch((error) => uni.showToast({ title: error?.message || '断开失败', icon: 'none' }));
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

	.hid-history-entry {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		padding: 24rpx;
	}

	.entry-arrow {
		flex-shrink: 0;
		font-size: 44rpx;
		line-height: 1;
		color: var(--ble-text-muted);
	}

.tab-content {
	flex: 1;
	min-height: 0;
}

.device-scroll {
	height: 100%;
}

</style>
