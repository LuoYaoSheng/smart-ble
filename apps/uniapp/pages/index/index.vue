<template>
	<view class="container">
		<view class="custom-navbar">
			<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
			<view class="nav-content" :style="{ height: navBarHeight + 'px' }">
				<text class="nav-title">BLE Toolkit+</text>
				<view class="nav-actions">
					<view class="ble-status-indicator" v-if="bleState === 'on'">
						<view class="status-dot green"></view>
						<text class="status-text">蓝牙已开启</text>
					</view>
					<view class="ble-status-indicator" v-else>
						<view class="status-dot grey"></view>
						<text class="status-text">蓝牙已关闭</text>
					</view>
				</view>
			</view>
		</view>

		<view class="page-content">
			<filter-panel v-model="filterSettings" />

			<view class="tab-control-container">
				<uni-segmented-control :current="currentTab" :values="tabItems" @clickItem="onClickTab" style-type="text" active-color="#007AFF" />
			</view>

			<view v-show="currentTab === 0" class="tab-content scan-tab-content">
				<view class="scan-control-row">
					<view class="scan-btn-container">
						<button :class="['scan-btn', isScanning ? 'scanning' : 'primary']" @click="toggleScan">
							<text class="scan-icon">{{ isScanning ? '■' : '🔍' }}</text>
							<text>{{ isScanning ? '停止扫描' : '开始扫描' }}</text>
						</button>
					</view>
					<view class="device-badge">
						<text v-if="filteredDevices.length === devices.length">发现 {{filteredDevices.length}} 台</text>
						<text v-else>显示 {{filteredDevices.length}} / {{devices.length}} 台</text>
					</view>
				</view>
				<view class="device-list">
					<scroll-view scroll-y class="device-scroll">
						<view v-if="filteredDevices.length === 0" class="empty-state">
							<image src="/static/placeholders/empty_scan.svg" class="empty-icon-img" mode="aspectFit"></image>
							<text class="empty-title">{{ devices.length > 0 ? '无匹配设备' : '暂无设备' }}</text>
							<text class="empty-sub">{{ devices.length > 0 ? '尝试调整过滤条件' : '点击上方按钮开始扫描' }}</text>
						</view>
						<template v-else>
							<device-card 
								v-for="device in filteredDevices" 
								:key="device.deviceId" 
								:device="device" 
								@click="showAdvertisingData" 
								@action="connectDevice" />
						</template>
					</scroll-view>
				</view>
			</view>

			<view v-show="currentTab === 1" class="tab-content connected-tab-content">
				<scroll-view scroll-y class="device-scroll">
					<view v-if="connectedDevicesList.length === 0" class="empty-state">
						<image src="/static/placeholders/empty_connected.svg" class="empty-icon-img" mode="aspectFit"></image>
						<text class="empty-title">无连接设备</text>
						<text class="empty-sub">请在发现列表中连接设备</text>
					</view>
					<template v-else>
						<device-card 
							v-for="device in connectedDevicesList" 
							:key="device.deviceId" 
							:device="device" 
							:isConnectionTab="true"
							@click="connectDevice" 
							@action="disconnectDeviceFromList" />
					</template>
				</scroll-view>
			</view>

			<view class="modal-overlay" v-if="showAdvDataModal" @click.stop="closeAdvDataModal">
				<view class="modal-content" @click.stop>
					<view class="modal-header">
						<text class="modal-title">广播信息</text>
						<text class="modal-close" @click="closeAdvDataModal">×</text>
					</view>
					<scroll-view scroll-y class="modal-scroll">
						<textarea class="modal-textarea" :value="advDataModalContent" disabled selectable></textarea>
					</scroll-view>
					<view class="modal-actions">
						<button class="modal-button modal-button-copy" type="primary" @click="copyAdvData">复制代码</button>
						<button class="modal-button modal-button-close" @click="closeAdvDataModal">关闭</button>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onUnload, onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { useBleStore } from '../../store/ble';
import FilterPanel from '../../components/filter-panel/filter-panel.vue';
import DeviceCard from '../../components/device-card/device-card.vue';

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
const bleState = computed(() => bleStore.bleState);
const devices = computed(() => bleStore.scannedDevices);

const connectedDevicesList = computed(() => bleStore.connectedDevicesList);

const filteredDevices = computed(() => {
	return devices.value.filter(device => {
		if (device.RSSI < filterSettings.value.rssi) return false;
		if (filterSettings.value.hideNoName && !device.name) return false;
		if (filterSettings.value.prefix && device.name) {
			return device.name.toLowerCase().startsWith(filterSettings.value.prefix.toLowerCase());
		}
		return true;
	});
});

onLoad(() => {
	// #ifdef MP-WEIXIN
	const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
	navBarHeight.value = (menuButtonInfo.top - statusBarHeight.value) * 2 + menuButtonInfo.height;
	// #endif

	checkBluetoothState();
	uni.onBluetoothAdapterStateChange(res => {
		bleStore.setBleState(res.available ? 'on' : 'off');
	});
});

onUnload(() => bleStore.stopScan());

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: '分享一个好用的BLE工具: BLE Toolkit+',
	path: '/pages/index/index'
}));
// #endif

const onClickTab = (e) => currentTab.value = e.currentIndex;

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
	uni.openBluetoothAdapter({
		success: () => {
			bleStore.setBleState('on');
			// #ifdef MP-WEIXIN
			checkAndRequestWxLocationPermission();
			// #endif
			// #ifndef MP-WEIXIN
			bleStore.startScan();
			// #endif
		},
		fail: (err) => {
			if (err.errCode === 10001) {
				uni.showModal({ title: '提示', content: '请先开启系统蓝牙', showCancel: false });
			} else {
				uni.showToast({ title: '蓝牙初始化失败', icon: 'none' });
			}
		}
	});
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
							title: '提示', content: '蓝牙扫描需要定位权限',
							confirmText: '去设置', success: (mRes) => { if (mRes.confirm) wx.openSetting(); }
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

const connectDevice = (device) => {
	uni.navigateTo({
		url: `/pages/device/detail?device=${encodeURIComponent(JSON.stringify(device))}`
	});
};

const disconnectDeviceFromList = (device) => {
	uni.closeBLEConnection({
		deviceId: device.deviceId,
		success: () => {
			bleStore.removeConnectedDevice(device.deviceId);
			uni.showToast({ title: '已断开', icon: 'success' });
		}
	});
};

const formatDeviceId = (deviceId) => deviceId && deviceId.length > 12 ? '...' + deviceId.slice(-12) : deviceId;

const showAdvertisingData = (device) => {
	let content = `设备ID: ${formatDeviceId(device.deviceId)}\n名称: ${device.name || 'N/A'}\nRSSI: ${device.RSSI} dBm\n\n广播服务UUIDs:\n${device.advertisServiceUUIDs && device.advertisServiceUUIDs.length > 0 ? device.advertisServiceUUIDs.join('\n') : '无'}\n\n广播数据 (Hex):\n${device.advertisDataHex || 'N/A'}`;
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

<style>
.container { height: 100vh; display: flex; flex-direction: column; background-color: #f7f8fa; }
.custom-navbar { background-color: #ffffff; box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05); z-index: 100; }
.nav-content { display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #333; }
.nav-actions { display: flex; align-items: center; }
.ble-status-indicator { display: flex; align-items: center; gap: 8rpx; }
.status-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.status-dot.green { background-color: #34C759; box-shadow: 0 0 8rpx rgba(52, 199, 89, 0.4); }
.status-dot.grey { background-color: #999999; }
.status-text { font-size: 24rpx; color: #666; }
.page-content { flex: 1; display: flex; flex-direction: column; padding: 30rpx; gap: 24rpx; height: 0; }
.tab-control-container { background-color: #fff; padding: 10px 20px; border-radius: 12rpx; flex-shrink: 0; }
.tab-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.scan-control-row { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0; flex-shrink: 0; }
.scan-btn-container { width: 40%; }
.scan-btn { display: flex; align-items: center; justify-content: center; gap: 8rpx; height: 80rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; color: #fff; background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%); border: none; box-shadow: 0 8rpx 16rpx rgba(0, 122, 255, 0.2); transition: all 0.3s; }
.scan-btn::after { border: none; }
.scan-btn.scanning { background: #FF3B30; box-shadow: 0 8rpx 16rpx rgba(255, 59, 48, 0.2); animation: pulse 2s infinite; }
.scan-icon { font-size: 32rpx; }
.device-badge { background-color: #E5F1FF; color: #007AFF; padding: 6rpx 20rpx; border-radius: 20rpx; font-size: 24rpx; font-weight: 500; }
.device-list { flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-top: 10rpx; }
.device-scroll { flex: 1; height: 100%; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100rpx 0; }
.empty-icon-img { width: 160rpx; height: 160rpx; opacity: 0.7; margin-bottom: 24rpx; }
.empty-title { font-size: 32rpx; color: #333; font-weight: bold; margin-bottom: 10rpx; }
.empty-sub { font-size: 26rpx; color: #999; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { width: 85%; max-height: 80vh; background-color: #fff; border-radius: 24rpx; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { padding: 30rpx; display: flex; justify-content: space-between; align-items: center; border-bottom: 2rpx solid #f5f5f5; }
.modal-title { font-size: 34rpx; font-weight: 600; color: #333; }
.modal-close { font-size: 44rpx; color: #999; padding: 0 20rpx; line-height: 1; }
.modal-scroll { flex: 1; min-height: 400rpx; padding: 30rpx; }
.modal-textarea { width: 100%; height: 100%; font-size: 26rpx; color: #666; font-family: monospace; line-height: 1.6; }
.modal-actions { display: flex; padding: 30rpx; gap: 20rpx; border-top: 2rpx solid #f5f5f5; }
.modal-button { flex: 1; height: 80rpx; line-height: 80rpx; border-radius: 40rpx; font-size: 28rpx; }
.modal-button-copy { background-color: #007AFF; color: #fff; }
.modal-button-close { background-color: #f5f5f5; color: #666; }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(0.98); } 100% { transform: scale(1); } }
</style>