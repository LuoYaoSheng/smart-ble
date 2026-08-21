<template>
	<view class="ble-shell index-shell">
		<view class="custom-navbar">
			<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
			<view class="nav-content" :style="{ height: navBarHeight + 'px' }">
				<view class="nav-copy">
					<text class="nav-kicker">SmartBLE Mini</text>
					<text class="nav-title">BLE Toolkit+</text>
				</view>
				<view class="ble-status-indicator" :class="bleState === 'on' ? 'active' : ''">
					<view class="status-dot" :class="bleState === 'on' ? 'green' : 'grey'"></view>
					<text class="status-text">{{ bleState === 'on' ? '蓝牙就绪' : '蓝牙未开启' }}</text>
				</view>
			</view>
		</view>

		<view class="ble-content page-content">
			<view class="hero-card ble-card-hero">
				<view class="ble-section-meta">
					<text class="ble-kicker">Scan Console</text>
					<text class="ble-title hero-title">更顺手的 BLE 扫描与接入面板</text>
					<text class="ble-subtitle">把扫描、过滤、广播数据查看和连接入口收进一条清晰路径里，适合现场调试和快速排障。</text>
				</view>

				<view class="ble-stat-grid">
					<view class="ble-stat-card">
						<text class="ble-stat-value">{{ filteredDevices.length }}</text>
						<text class="ble-stat-label">当前结果</text>
					</view>
					<view class="ble-stat-card">
						<text class="ble-stat-value">{{ devices.length }}</text>
						<text class="ble-stat-label">已发现设备</text>
					</view>
					<view class="ble-stat-card">
						<text class="ble-stat-value">{{ connectedDevicesList.length }}</text>
						<text class="ble-stat-label">已连接</text>
					</view>
				</view>

				<view class="hero-actions">
					<button :class="['ble-button-primary', 'scan-btn', isScanning ? 'scanning' : '']" @click="toggleScan">
						<text class="scan-icon">{{ isScanning ? '■' : '◉' }}</text>
						<text>{{ isScanning ? '停止扫描' : '开始扫描' }}</text>
					</button>
					<view class="hero-tags">
						<view class="ble-chip ble-chip-soft">
							<text>筛选前缀 {{ filterSettings.prefix || '全部' }}</text>
						</view>
						<view class="ble-chip" :class="filterSettings.hideNoName ? 'ble-chip-success' : 'ble-chip-muted'">
							<text>{{ filterSettings.hideNoName ? '隐藏无名设备' : '显示全部设备' }}</text>
						</view>
					</view>
					<text v-if="scanError" class="scan-error">扫描失败（{{ scanError.code }}）：{{ scanError.message }}。请确认蓝牙/定位权限后重试。</text>
				</view>
			</view>

			<filter-panel v-model="filterSettings" />

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
					<view class="ble-chip ble-chip-soft">
						<text v-if="currentTab === 0">
							{{ filteredDevices.length === devices.length ? `发现 ${filteredDevices.length} 台` : `显示 ${filteredDevices.length} / ${devices.length}` }}
						</text>
						<text v-else>{{ connectedDevicesList.length }} 台已连接</text>
					</view>
				</view>

				<view v-show="currentTab === 0" class="tab-content">
					<scroll-view scroll-y class="device-scroll">
						<view v-if="filteredDevices.length === 0" class="ble-empty-card">
							<image src="/static/placeholders/empty_scan.png" class="ble-empty-image" mode="aspectFit"></image>
							<text class="ble-empty-title">{{ devices.length > 0 ? '当前没有匹配设备' : '还没有扫描结果' }}</text>
							<text class="ble-empty-copy">{{ devices.length > 0 ? '试试放宽过滤条件，或者关闭“隐藏无名设备”。' : '先启动扫描，附近设备会实时出现在这里。' }}</text>
						</view>
						<template v-else>
							<device-card
								v-for="device in filteredDevices"
								:key="device.deviceId"
								:device="device"
								@click="showAdvertisingData"
								@action="connectDevice"
							/>
						</template>
					</scroll-view>
				</view>

				<view v-show="currentTab === 1" class="tab-content">
					<scroll-view scroll-y class="device-scroll">
						<view v-if="connectedDevicesList.length === 0" class="ble-empty-card">
							<image src="/static/placeholders/empty_connected.png" class="ble-empty-image" mode="aspectFit"></image>
							<text class="ble-empty-title">还没有连接中的设备</text>
							<text class="ble-empty-copy">从“附近设备”里进入详情页并建立连接，这里会保留调试入口。</text>
						</view>
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

			<view class="modal-overlay" v-if="showAdvDataModal" @click.stop="closeAdvDataModal">
				<view class="modal-content" @click.stop>
					<view class="modal-header">
						<view class="ble-section-meta">
							<text class="ble-section-title">广播原始数据</text>
							<text class="ble-section-caption">用于快速复制到日志、文档或排查脚本里。</text>
						</view>
						<text class="modal-close" @click="closeAdvDataModal">×</text>
					</view>
					<scroll-view scroll-y class="modal-scroll">
						<textarea class="modal-textarea ble-mono" :value="advDataModalContent" disabled selectable></textarea>
					</scroll-view>
					<view class="modal-actions">
						<button class="ble-button-primary modal-button" @click="copyAdvData">复制代码</button>
						<button class="ble-button-secondary modal-button" @click="closeAdvDataModal">关闭</button>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onHide, onShareAppMessage, onUnload } from '@dcloudio/uni-app';
import DeviceCard from '../../components/device-card/device-card.vue';
import FilterPanel from '../../components/filter-panel/filter-panel.vue';
import { useBleStore } from '../../store/ble';
import { closeDevice } from '../../services/ble-runtime/index.js';

const bleStore = useBleStore();

const filterSettings = ref({
	rssi: -100,
	prefix: '',
	hideNoName: false
});

const showAdvDataModal = ref(false);
const advDataModalContent = ref('');
const modalDeviceId = ref(null);

const currentTab = ref(0);
const tabItems = ['扫描发现', '已连接'];

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight || 20);
const navBarHeight = ref(44);

const isScanning = computed(() => bleStore.isScanning);
const scanError = computed(() => bleStore.scanError);
const bleState = computed(() => bleStore.bleState);
const devices = computed(() => bleStore.scannedDevices);
const connectedDevicesList = computed(() => bleStore.connectedDevicesList);

const filteredDevices = computed(() =>
	devices.value.filter((device) => {
		if (device.RSSI < filterSettings.value.rssi) return false;
		if (filterSettings.value.hideNoName && !device.name) return false;
		if (filterSettings.value.prefix && device.name) {
			return device.name.toLowerCase().startsWith(filterSettings.value.prefix.toLowerCase());
		}
		return true;
	})
);

onLoad(() => {
	// #ifdef MP-WEIXIN
	const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
	navBarHeight.value = (menuButtonInfo.top - statusBarHeight.value) * 2 + menuButtonInfo.height;
	// #endif

	checkBluetoothState();
});

onHide(() => bleStore.stopScan());
onUnload(() => bleStore.stopScan());

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: '分享一个好用的 BLE 工具: BLE Toolkit+',
	path: '/pages/index/index'
}));
// #endif

const checkBluetoothState = () => {
	uni.getBluetoothAdapterState({
		success: (res) => bleStore.setBleState(res.available ? 'on' : 'off'),
		fail: () => bleStore.setBleState('off')
	});
};

const toggleScan = () => {
	if (isScanning.value) {
		bleStore.stopScan();
	} else {
		checkBluetoothAndPermissionsBeforeScan();
	}
};

const checkBluetoothAndPermissionsBeforeScan = () => {
	// 适配器打开与 discovery 生命周期只由 BLE Store/Runtime 持有。
	// #ifdef MP-WEIXIN
	checkAndRequestWxLocationPermission();
	// #endif
	// #ifndef MP-WEIXIN
	bleStore.startScan();
	// #endif
};

// #ifdef MP-WEIXIN
const checkAndRequestWxLocationPermission = () => {
	wx.getSetting({
		success: (res) => {
			if (!res.authSetting['scope.userLocation']) {
				wx.authorize({
					scope: 'scope.userLocation',
					success: () => bleStore.startScan(),
					fail: () => {
						wx.showModal({
							title: '提示',
							content: '蓝牙扫描需要定位权限',
							confirmText: '去设置',
							success: (modalRes) => {
								if (modalRes.confirm) wx.openSetting();
							}
						});
					}
				});
			} else {
				bleStore.startScan();
			}
		}
	});
};
// #endif

const connectDevice = async (device) => {
	await bleStore.stopScan('connect');
	uni.navigateTo({
		url: `/pages/device/detail?device=${encodeURIComponent(JSON.stringify(device))}`
	});
};

const disconnectDeviceFromList = (device) => {
	closeDevice(device.deviceId)
		.then(() => {
			bleStore.removeConnectedDevice(device.deviceId);
			uni.showToast({ title: '已断开', icon: 'success' });
		})
		.catch((error) => uni.showToast({ title: error?.message || '断开失败', icon: 'none' }));
};

const formatDeviceId = (deviceId) => (deviceId && deviceId.length > 12 ? `...${deviceId.slice(-12)}` : deviceId);

const showAdvertisingData = (device) => {
	const advertisement = device.advertisement || {};
	const displayBytes = (item) => !item?.present ? '本轮微信 API 未提供此字段' : item.length === 0 ? '字段存在但长度为 0' : `${item.hex} (${item.length}B)`;
	const manufacturer = advertisement.manufacturerData?.length
		? advertisement.manufacturerData.map((item) => `ID ${item.id ?? '未知'}: ${displayBytes(item)}`).join('\n')
		: '本轮微信 API 未提供 Manufacturer Data';
	const serviceData = advertisement.serviceData?.length
		? advertisement.serviceData.map((item) => `${item.uuid || '未知 UUID'}: ${displayBytes(item)}`).join('\n')
		: '本轮微信 API 未提供 Service Data';
	const content = `设备ID: ${formatDeviceId(device.deviceId)}\n名称: ${advertisement.localName || device.name || '本轮未提供'}\nRSSI: ${device.RSSI} dBm\n\n广播服务 UUIDs:\n${advertisement.serviceUUIDs?.length ? advertisement.serviceUUIDs.join('\n') : '本轮微信 API 未提供 Service UUID'}\n\n原始广播数据:\n${displayBytes(advertisement.advertisData)}\n\nManufacturer Data:\n${manufacturer}\n\nService Data:\n${serviceData}`;
	advDataModalContent.value = content;
	showAdvDataModal.value = true;
	modalDeviceId.value = device.deviceId;
};

const closeAdvDataModal = () => {
	showAdvDataModal.value = false;
	modalDeviceId.value = null;
};

const copyAdvData = () => {
	uni.setClipboardData({
		data: advDataModalContent.value,
		success: () => uni.showToast({ title: '已复制', icon: 'success' })
	});
};
</script>

<style scoped>
.page-content {
	height: calc(100vh - 2rpx);
}

.scan-error {
	font-size: 22rpx;
	line-height: 1.5;
	color: var(--ble-red);
}

.custom-navbar {
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(246, 250, 255, 0.92) 100%);
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.08);
	backdrop-filter: blur(16rpx);
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

.hero-title {
	max-width: 12em;
}

.hero-actions {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.hero-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.scan-btn.scanning {
	background: linear-gradient(135deg, #ff5e62 0%, #ff9f43 100%);
	box-shadow: 0 18rpx 42rpx rgba(242, 85, 95, 0.22);
}

.scan-icon {
	font-size: 32rpx;
	line-height: 1;
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

.modal-overlay {
	position: fixed;
	inset: 0;
	padding: 36rpx;
	background: rgba(10, 20, 35, 0.42);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.modal-content {
	width: 100%;
	max-height: 78vh;
	display: flex;
	flex-direction: column;
	border-radius: 34rpx;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(242, 248, 255, 0.96) 100%);
	box-shadow: 0 24rpx 60rpx rgba(10, 20, 35, 0.18);
}

.modal-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
	padding: 30rpx;
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.08);
}

.modal-close {
	font-size: 46rpx;
	line-height: 1;
	color: var(--ble-text-muted);
	padding: 0 8rpx;
}

.modal-scroll {
	min-height: 420rpx;
	padding: 0 30rpx;
}

.modal-textarea {
	width: 100%;
	min-height: 420rpx;
	padding: 24rpx 0;
	font-size: 24rpx;
	line-height: 1.7;
	color: var(--ble-text-subtle);
}

.modal-actions {
	display: flex;
	gap: 16rpx;
	padding: 24rpx 30rpx 30rpx;
	border-top: 1rpx solid rgba(20, 76, 136, 0.08);
}

.modal-button {
	flex: 1;
}
</style>
