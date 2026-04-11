<template>
	<view class="container">
		<view class="device-panel">
			<view class="device-header">
				<view class="device-info">
					<view class="name-container">
						<text class="device-name">{{deviceInfo.name || '未知设备'}}</text>
						<view class="status-dot" :class="{'connected': isConnected}"></view>
					</view>
					<view class="device-id-container">
						<text class="device-id-label">设备ID:</text>
						<text class="device-id">{{deviceInfo.deviceId}}</text>
					</view>
				</view>
				<view class="device-actions-top">
					<button class="action-btn" v-if="hasOtaService" @click="showOtaModal = true">固件更新</button>
				</view>
			</view>
			<view class="device-actions-row">
				<button class="row-btn clear" @click="clearLogs">清空日志</button>
				<button class="row-btn share" @click="shareLogs">导出日志</button>
				<button class="row-btn" :class="{'connected': isConnected}" @click="toggleConnection">
					{{isConnected ? '断开连接' : '连接设备'}}
				</button>
			</view>
		</view>

		<scroll-view class="main-content" scroll-y>
			<service-panel 
				v-if="services.length > 0"
				:services="services" 
				@read="onReadCharacteristic" 
				@write="onBeforeWriteCharacteristic" 
				@notifyToggle="onToggleNotify" 
			/>
		</scroll-view>

		<log-panel :logs="logs" :scrollTop="logScrollTop" />

		<write-dialog 
			:visible="showWriteDataModal" 
			@update:visible="showWriteDataModal = $event"
			:isSending="isSending" 
			@confirm="onConfirmWrite" 
		/>
			
		<ota-dialog 
			:visible="showOtaModal" 
			:deviceId="deviceInfo.deviceId" 
			@close="showOtaModal = false" 
		/>
	</view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { onLoad, onUnload, onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { useBleStore } from '../../store/ble';
import { logger } from '../../../core/ble-core/utils/logger';
import OtaDialog from '../../components/ota-dialog/ota-dialog.vue';
import ServicePanel from '../../components/service-panel/service-panel.vue';
import LogPanel from '../../components/log-panel/log-panel.vue';
import WriteDialog from '../../components/write-dialog/write-dialog.vue';

const bleStore = useBleStore();

const isInitializing = ref(false);
const connectionRetryCount = ref(0);
const maxRetryCount = 3;
const isUserDisconnected = ref(false);
const showWriteDataModal = ref(false);
const writeServiceId = ref('');
const writeCharacteristicId = ref('');
const hasOtaService = ref(false);
const showOtaModal = ref(false);
const isSending = ref(false);
const logScrollTop = ref(0);

const deviceId = ref('');
let unsubLogger = null;

onLoad((options) => {
	if (options.device) {
		try {
			const parsedDevice = JSON.parse(decodeURIComponent(options.device));
			deviceId.value = parsedDevice.deviceId;
			bleStore.initConnectedDevice(parsedDevice);
			
			if (!storeDevice.value.isConnected) {
				initBluetoothAdapter();
			}
		} catch (error) {
			uni.showToast({ title: '设备信息无效', icon: 'none' });
		}
	}
	
	const deviceVal = deviceId.value;
	// 绑定 Logger 流
	logs.value = [...logger.getHistory(deviceVal)];
	unsubLogger = logger.subscribe(entry => {
		logs.value.unshift(entry);
		nextTick(() => { logScrollTop.value = 99999; });
	}, deviceVal);
});

onUnload(() => {
	if (unsubLogger) {
		unsubLogger();
	}
});

const storeDevice = computed(() => {
	return bleStore.connectedDevicesMap[deviceId.value] || {};
});

const deviceInfo = computed(() => storeDevice.value);
const isConnected = computed(() => storeDevice.value.isConnected);
const services = computed(() => storeDevice.value.services || []);
const logs = ref([]);

const addLog = (type, message) => {
	bleStore.addDeviceLog(deviceId.value, type, message);
	nextTick(() => { logScrollTop.value = 99999; });
};

const clearLogs = () => {
	logger.clear(deviceId.value);
	logs.value = [];
	logScrollTop.value = 0;
	addLog('系统', '日志已清除');
};

const shareLogs = () => {
	if (logs.value.length === 0) {
		uni.showToast({ title: '暂无日志', icon: 'none' });
		return;
	}
	const content = logs.value.map(l => `[${l.timestamp}] [${l.type}] ${l.message}`).join('\n');
	uni.setClipboardData({
		data: content,
		success: () => uni.showToast({ title: '日志已复制', icon: 'success' })
	});
};

const initBluetoothAdapter = async () => {
	if (isInitializing.value) return;
	isInitializing.value = true;
	try {
		addLog('系统', '正在初始化蓝牙...');
		await uni.openBluetoothAdapter();
		await connectDevice();
	} catch (error) {
		addLog('错误', '蓝牙初始化失败: ' + error.errMsg);
		retryConnection();
	} finally {
		isInitializing.value = false;
	}
};

const toggleConnection = () => {
	if (isConnected.value) {
		isUserDisconnected.value = true;
		uni.closeBLEConnection({
			deviceId: deviceId.value,
			success: () => {
				bleStore.updateDeviceConnectionStatus(deviceId.value, false);
				addLog('系统', '已手动断开连接');
			}
		});
	} else {
		connectDevice();
	}
};

const connectDevice = async () => {
	try {
		addLog('系统', '正在连接...');
		await uni.createBLEConnection({
			deviceId: deviceId.value,
			timeout: 10000
		});
		await getServices();
		bleStore.updateDeviceConnectionStatus(deviceId.value, true);
		connectionRetryCount.value = 0;
		isUserDisconnected.value = false;
		addLog('系统', '设备连接成功');

		uni.onBLECharacteristicValueChange(res => {
			if (res.deviceId === deviceId.value) handleReceivedData(res.value);
		});

		uni.onBLEConnectionStateChange(res => {
			if (res.deviceId === deviceId.value) {
				bleStore.updateDeviceConnectionStatus(deviceId.value, res.connected);
				if (!res.connected) addLog('系统', '设备已断开连接');
				if (!res.connected && !isUserDisconnected.value) {
					retryConnection();
				}
			}
		});
	} catch (error) {
		addLog('错误', '连接失败: ' + error.errMsg);
		bleStore.updateDeviceConnectionStatus(deviceId.value, false);
		retryConnection();
	}
};

const retryConnection = () => {
	if (connectionRetryCount.value >= maxRetryCount) {
		addLog('错误', '自动重连次数达上限，放弃重连');
		return;
	}
	connectionRetryCount.value++;
	const delay = connectionRetryCount.value * 2000;
	addLog('系统', `设备断线，将在 ${delay/1000}s 后进行第 ${connectionRetryCount.value}/${maxRetryCount} 次重连...`);
	setTimeout(connectDevice, delay);
};

const getServices = () => {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			uni.getBLEDeviceServices({
				deviceId: deviceId.value,
				success: async (res) => {
					addLog('系统', `获取到 ${res.services.length} 个服务`);
					let srvs = [];
					let otaFound = false;
					for (let i = 0; i < res.services.length; i++) {
						const service = res.services[i];
						if (service.uuid.toUpperCase().includes('FFD0')) otaFound = true;
						try {
							const chars = await getCharacteristics(service.uuid);
							srvs.push({ ...service, characteristics: chars });
						} catch (e) {
							addLog('错误', `获取特征值失败: ${service.uuid}`);
						}
					}
					hasOtaService.value = otaFound;
					bleStore.updateDeviceServices(deviceId.value, srvs);
					resolve();
				},
				fail: (err) => {
					addLog('错误', '获取服务失败: ' + err.errMsg);
					reject(err);
				}
			});
		}, 1000);
	});
};

const getCharacteristics = (serviceId) => {
	return new Promise((resolve, reject) => {
		uni.getBLEDeviceCharacteristics({
			deviceId: deviceId.value,
			serviceId,
			success: (res) => {
				const chars = res.characteristics.map(c => ({ ...c, notifying: false }));
				resolve(chars);
			},
			fail: reject
		});
	});
};

const handleReceivedData = (buffer) => {
	const dataView = new DataView(buffer);
	const hexArr = [];
	for (let i = 0; i < dataView.byteLength; i++) {
		hexArr.push(dataView.getUint8(i).toString(16).padStart(2, '0').toUpperCase());
	}
	const hexData = hexArr.join(' ');
	let textData = '';
	try { textData = decodeURIComponent(escape(String.fromCharCode.apply(null, new Uint8Array(buffer)))); } catch(e){}
	addLog('接收', `HEX: ${hexData}\nTEXT: ${textData}`);
};

const onReadCharacteristic = ({ serviceId, charId }) => {
	uni.readBLECharacteristicValue({
		deviceId: deviceId.value,
		serviceId,
		characteristicId: charId,
		success: () => addLog('系统', '读请求已发送'),
		fail: (err) => addLog('错误', '读请求失败: ' + err.errMsg)
	});
};

const onBeforeWriteCharacteristic = ({ serviceId, charId }) => {
	writeServiceId.value = serviceId;
	writeCharacteristicId.value = charId;
	showWriteDataModal.value = true;
};

const onConfirmWrite = ({ type, data }) => {
	isSending.value = true;
	let buffer;
	if (type === 'hex') {
		const hexStr = data.replace(/\s+/g, '');
		if (hexStr.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(hexStr)) {
			uni.showToast({ title: 'HEX格式不正确', icon: 'none' });
			isSending.value = false;
			return;
		}
		buffer = new ArrayBuffer(hexStr.length / 2);
		const dataView = new DataView(buffer);
		for (let i = 0; i < hexStr.length; i += 2) {
			dataView.setUint8(i / 2, parseInt(hexStr.substring(i, i + 2), 16));
		}
	} else {
		buffer = new ArrayBuffer(data.length);
		const dataView = new DataView(buffer);
		for (let i = 0; i < data.length; i++) {
			dataView.setUint8(i, data.charCodeAt(i));
		}
	}

	uni.writeBLECharacteristicValue({
		deviceId: deviceId.value,
		serviceId: writeServiceId.value,
		characteristicId: writeCharacteristicId.value,
		value: buffer,
		success: () => {
			addLog('写入', `${type.toUpperCase()}: ${data}`);
			uni.showToast({ title: '写入成功' });
			showWriteDataModal.value = false;
		},
		fail: (err) => addLog('错误', '写入失败: ' + err.errMsg),
		complete: () => { isSending.value = false; }
	});
};

const onToggleNotify = ({ serviceId, charId }) => {
	const service = services.value.find(s => s.uuid === serviceId);
	const char = service.characteristics.find(c => c.uuid === charId);
	const isOtaStatus = charId.toUpperCase().includes('FFD4');
	
	uni.notifyBLECharacteristicValueChange({
		state: !char.notifying,
		deviceId: deviceId.value,
		serviceId,
		characteristicId: charId,
		success: () => {
			char.notifying = !char.notifying;
			addLog('系统', `${char.notifying ? '开启' : '关闭'}监听成功`);
		},
		fail: (err) => addLog('错误', '设置监听失败: ' + err.errMsg)
	});
};
</script>

<style scoped>
.container { height: 100vh; display: flex; flex-direction: column; background-color: #f7f8fa; }
.device-panel { background-color: #fff; padding: 30rpx; border-bottom: 2rpx solid #eee; z-index: 10; flex-shrink: 0; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.02); }
.device-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24rpx; }
.device-info { display: flex; flex-direction: column; gap: 8rpx; flex: 1; }
.name-container { display: flex; align-items: center; gap: 16rpx; }
.device-name { font-size: 36rpx; font-weight: bold; color: #333; }
.status-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background-color: #999; }
.status-dot.connected { background-color: #34C759; box-shadow: 0 0 10rpx rgba(52,199,89,0.4); }
.device-id-container { display: flex; align-items: center; gap: 8rpx; }
.device-id-label { font-size: 24rpx; color: #999; }
.device-id { font-size: 24rpx; color: #666; font-family: monospace; }
.device-actions-top { margin-left: auto; }
.action-btn { background-color: #FF9500; color: #fff; font-size: 24rpx; padding: 0 24rpx; height: 52rpx; line-height: 52rpx; border-radius: 26rpx; border: none; }
.action-btn::after { border: none; }
.device-actions-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.row-btn { flex: 1; height: 72rpx; line-height: 72rpx; border-radius: 36rpx; font-size: 28rpx; border: none; background-color: #007AFF; color: #fff; }
.row-btn::after { border: none; }
.row-btn.clear { background-color: #f5f5f5; color: #666; flex: 0.8; }
.row-btn.share { background-color: rgba(0,122,255,0.1); color: #007AFF; flex: 0.8; }
.row-btn.connected { background-color: #FF3B30; }
.main-content { flex: 1; height: 0; padding: 24rpx; }
</style>