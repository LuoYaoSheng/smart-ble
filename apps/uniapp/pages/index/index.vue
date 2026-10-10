<template>
	<view class="ble-shell index-shell">
		<AppNavbar
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
					<AppIcon name="chip" :size="30" tone="primary" />
					<text class="sec-title">附近设备</text>
					<AppChip v-if="filteredDevices.length" :text="filteredDevices.length" tone="neutral" />
				</view>
				<text class="filter-toggle" @click="showFilters = !showFilters">{{ showFilters ? '收起筛选' : '筛选' }}</text>
			</view>
			<filter-panel v-if="showFilters" v-model="filterSettings" class="inline-filter" />

			<view class="tab-content">
				<scroll-view scroll-y class="device-scroll">
					<AppEmpty
						v-if="filteredDevices.length === 0"
						:ill="devices.length > 0 ? 'link' : 'radar'"
						:title="devices.length > 0 ? '当前没有匹配设备' : '还没有扫描结果'"
						:description="devices.length > 0 ? '调整筛选条件试试' : '点上方按钮开始扫描附近 BLE 设备'"
						:action-label="hasScanned || devices.length > 0 ? '' : '开始扫描'"
						action-icon="scan"
						@action="startScan"
					/>
					<template v-else>
						<DeviceCard
							v-for="device in filteredDevices"
							:key="device.deviceId"
							:device="device"
							@tap="showAdvertisingData"
							@connect="connectDevice"
							@configure="openProfileDevice"
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
// UI-PARITY-G0：P001 改挂正典组件层 components/ui/（COMPONENT_CONTRACT）
import DeviceCard from '../../components/ui/DeviceCard.vue';
import AppNavbar from '../../components/ui/AppNavbar.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
import AppChip from '../../components/ui/AppChip.vue';
import AppEmpty from '../../components/ui/AppEmpty.vue';
import FilterPanel from '../../components/filter-panel/filter-panel.vue';
import ScanSummary from '../../components/scan/scan-summary.vue';
import AdvertisementDialog from '../../components/scan/advertisement-dialog.vue';
import { useHidStore } from '../../store/hid';
import { useBleScan } from '../../composables/use-ble-scan.js';
import { buildGenericDeviceDetailUrl, buildProfileActionUrl } from '../../services/provisioning/profile-navigation.js';
// #ifdef H5
// H5 假数据通道：暴露页面本地态给 window.__MOCK__（?mock=1 时才有消费者）
import { registerPageTargets } from '../../services/mock/mock-registry.js';
// #endif

const hidStore = useHidStore();

const showAdvDataModal = ref(false);
const selectedAdvertisementDevice = ref(null);
const showFilters = ref(false);

const { filterSettings, devices, filteredDevices, hasScanned, isScanning, scanError, bleState, start: startScan, toggle: toggleScan, prepareConnect } = useBleScan();

// #ifdef H5
registerPageTargets('p001', { hasScanned, showFilters, filterSettings, showAdvDataModal, selectedAdvertisementDevice });
// #endif
// 蓝牙状态词（正典 p001 btWord + 桌面壳瞬态）：on 就绪 / off 未开启 / unsupported 平台不支持 / initializing 初始化中…
const bleStatusText = computed(() => {
	if (bleState.value === 'on') return '蓝牙就绪';
	if (bleState.value === 'unsupported') return '平台不支持';
	if (bleState.value === 'initializing') return '初始化中…';
	return '蓝牙未开启';
});
const bleStatusTone = computed(() => {
	if (bleState.value === 'on') return 'on';
	if (bleState.value === 'unsupported') return '';
	if (bleState.value === 'initializing') return '';
	return 'off';
});

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
	font-size: var(--fs-h1);
	font-weight: var(--fw-bold);
	color: var(--c-text);
}

.filter-toggle { flex-shrink: 0; font-size: var(--fs-cap); font-weight: var(--fw-med); color: var(--c-primary); }
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
