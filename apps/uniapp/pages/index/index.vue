<template>
	<view class="ble-shell index-shell">
		<app-navbar
			kicker="BLE TOOLKIT+"
			title="扫描"
			:status-text="bleStatusText"
			:status-tone="bleStatusTone"
		/>

		<view class="ble-content page-content">
			<scan-summary
				id="scan-summary"
				:scanning="isScanning"
				:scanned="hasScanned"
				:shown-count="filteredDevices.length"
				:error="scanError"
				@toggle="toggleScan"
				@retry="startScan"
			/>

			<view class="sec-t">
				<view class="t">
					<app-icon name="chip" :size="30" color="#1B6DFF" />
					<text class="sec-title">附近设备</text>
					<text v-if="filteredDevices.length" class="count-chip">{{ filteredDevices.length }}</text>
				</view>
				<text class="filter-toggle" @click="showFilters = !showFilters">{{ showFilters ? '收起筛选' : '筛选' }}</text>
			</view>
			<filter-panel v-if="showFilters" v-model="filterSettings" class="inline-filter" />

			<view class="tab-content">
				<scroll-view scroll-y class="device-scroll">
					<empty-state
						v-if="filteredDevices.length === 0"
						:ill="devices.length > 0 ? 'link' : 'radar'"
						:title="devices.length > 0 ? '当前没有匹配设备' : '还没有扫描结果'"
						:description="devices.length > 0 ? '调整筛选条件试试' : '点上方按钮开始扫描附近 BLE 设备'"
						:action-label="hasScanned || devices.length > 0 ? '' : '开始扫描'"
						action-icon="scan"
						@action="startScan"
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
import AppIcon from '../../components/common/app-icon.vue';
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

const { filterSettings, devices, filteredDevices, hasScanned, isScanning, scanError, bleState, start: startScan, toggle: toggleScan, prepareConnect } = useBleScan();
// 蓝牙状态三态词（正典 p001 btWord）：on 就绪 / off 未开启 / 其余 平台不支持
const bleStatusText = computed(() => {
	if (bleState.value === 'on') return '蓝牙就绪';
	if (bleState.value === 'unsupported') return '平台不支持';
	return '蓝牙未开启';
});
const bleStatusTone = computed(() => {
	if (bleState.value === 'on') return 'on';
	if (bleState.value === 'unsupported') return '';
	return 'off';
});

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

.sec-t {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
}

.sec-t .t {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.sec-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.count-chip {
	padding: 2rpx 16rpx;
	border-radius: 999rpx;
	background: #F1F5FB;
	color: #42536A;
	font-size: 22rpx;
}

.filter-toggle { flex-shrink: 0; font-size: 24rpx; font-weight: 500; color: var(--ble-brand); }
.inline-filter { margin-top: 18rpx; }

.tab-content {
	flex: 1;
	min-height: 0;
	margin-top: 18rpx;
}

.device-scroll {
	height: 100%;
}

</style>
