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
import { logger } from '../../../../core/ble-core/utils/logger';
import {
	connectDevice as connectBleDevice,
	openAdapter as openBleAdapter,
	readValue,
	setNotifyEnabled,
	subscribe as subscribeBleValue,
	writeValue as writeBleValue
} from '../../services/ble-runtime/index.js';
import OtaDialog from '../../components/ota-dialog/ota-dialog.vue';
import ServicePanel from '../../components/service-panel/service-panel.vue';
import LogPanel from '../../components/log-panel/log-panel.vue';
import WriteDialog from '../../components/write-dialog/write-dialog.vue';
import { OTA_UUIDS } from '../../utils/ota_manager.js';

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
let bleSession = null;
const notifyUnsubscribers = new Map();

onLoad((options) => {
	if (options.device) {
		try {
			const parsedDevice = JSON.parse(decodeURIComponent(options.device));
			deviceId.value = parsedDevice.deviceId;   // set first
			bleStore.initConnectedDevice(parsedDevice);
			
			// Now storeDevice computed is valid because deviceId.value is set
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
	for (const unsubscribe of notifyUnsubscribers.values()) unsubscribe();
	notifyUnsubscribers.clear();
	const session = bleSession;
	bleSession = null;
	session?.close();
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
		await openBleAdapter();
		await connectDevice();
	} catch (error) {
		addLog('错误', '蓝牙初始化失败: ' + (error?.errMsg || error?.message || '未知错误'));
		retryConnection();
	} finally {
		isInitializing.value = false;
	}
};

const toggleConnection = () => {
	if (isConnected.value) {
		isUserDisconnected.value = true;
		const session = bleSession;
		bleSession = null;
		session?.close().finally(() => {
			bleStore.updateDeviceConnectionStatus(deviceId.value, false);
			addLog('系统', '已手动断开连接');
		});
	} else {
		connectDevice();
	}
};

const connectDevice = async () => {
	try {
		addLog('系统', '正在连接...');
		const session = await connectBleDevice(deviceId.value, { timeout: 10000 });
		bleSession = session;
		const srvs = session.services.map((service) => ({
			...service,
			characteristics: service.characteristics || []
		}));
		hasOtaService.value = srvs.some((service) => String(service.uuid).toLowerCase() === OTA_UUIDS.SERVICE_OTA);
		bleStore.updateDeviceServices(deviceId.value, srvs);
		addLog('系统', `获取到 ${srvs.length} 个服务`);
		bleStore.updateDeviceConnectionStatus(deviceId.value, true);
		connectionRetryCount.value = 0;
		isUserDisconnected.value = false;
		addLog('系统', '设备连接成功');

		session.onDisconnect(() => {
			if (bleSession !== session) return;
			bleSession = null;
			bleStore.updateDeviceConnectionStatus(deviceId.value, false);
			addLog('系统', '设备已断开连接');
			if (!isUserDisconnected.value) retryConnection();
		});
	} catch (error) {
		addLog('错误', '连接失败: ' + (error?.errMsg || error?.message || '未知错误'));
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
	if (!bleSession) return;
	addLog('系统', '读请求已发送');
	readValue(bleSession, serviceId, charId)
		.then(handleReceivedData)
		.catch((error) => addLog('错误', '读请求失败: ' + (error?.errMsg || error?.message || '未知错误')));
};

const onBeforeWriteCharacteristic = ({ serviceId, charId }) => {
	writeServiceId.value = serviceId;
	writeCharacteristicId.value = charId;
	showWriteDataModal.value = true;
};

const onConfirmWrite = async ({ type, data }) => {
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

	try {
		if (!bleSession) throw new Error('设备未连接');
		await writeBleValue(bleSession, writeServiceId.value, writeCharacteristicId.value, buffer);
		addLog('写入', `${type.toUpperCase()}: ${data}`);
		uni.showToast({ title: '写入成功' });
		showWriteDataModal.value = false;
	} catch (error) {
		addLog('错误', '写入失败: ' + (error?.errMsg || error?.message || '未知错误'));
	} finally {
		isSending.value = false;
	}
};

const onToggleNotify = ({ serviceId, charId }) => {
	const service = services.value.find(s => s.uuid === serviceId);
	if (!service || !bleSession) return;
	const char = service.characteristics.find(c => c.uuid === charId);
	if (!char) return;
	const key = `${serviceId}|${charId}`;
	const enable = !char.notifying;
	if (enable) {
		subscribeBleValue(bleSession, serviceId, charId, handleReceivedData)
			.then((unsubscribe) => {
				notifyUnsubscribers.set(key, unsubscribe);
				char.notifying = true;
				addLog('系统', '开启监听成功');
			})
			.catch((error) => addLog('错误', '设置监听失败: ' + (error?.errMsg || error?.message || '未知错误')));
		return;
	}
	setNotifyEnabled(bleSession, serviceId, charId, false)
		.then(() => {
			notifyUnsubscribers.get(key)?.();
			notifyUnsubscribers.delete(key);
			char.notifying = false;
			addLog('系统', '关闭监听成功');
		})
		.catch((error) => addLog('错误', '设置监听失败: ' + (error?.errMsg || error?.message || '未知错误')));
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