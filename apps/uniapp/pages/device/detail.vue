<template>
	<view class="container">
		<view class="device-panel ble-card">
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
import { utf8Decode, utf8Encode } from '../../../../core/ble-core/provisioning/framing.js';

const bleStore = useBleStore();

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
let reconnectTimer = null;
const notifyUnsubscribers = new Map();

onLoad((options) => {
	if (options.deviceId) {
		deviceId.value = decodeURIComponent(options.deviceId);
		const device = bleStore.scannedDevices.find((item) => item.deviceId === deviceId.value)
			|| bleStore.connectedDevicesMap[deviceId.value]
			|| { deviceId: deviceId.value };
		bleStore.initConnectedDevice(device);
		if (!storeDevice.value.isConnected) {
			connectDevice();
		}
	} else if (options.device) {
		// 兼容旧的整对象 JSON 传参
		try {
			const parsedDevice = JSON.parse(decodeURIComponent(options.device));
			deviceId.value = parsedDevice.deviceId;
			bleStore.initConnectedDevice(parsedDevice);
			if (!storeDevice.value.isConnected) {
				connectDevice();
			}
		} catch (error) {
			uni.showModal({ title: '无法打开设备', content: '设备参数无效，请返回扫描页重新选择。', showCancel: false, success: () => uni.navigateBack() });
		}
	} else {
		uni.showModal({ title: '无法打开设备', content: '缺少设备参数，请返回扫描页重新选择。', showCancel: false, success: () => uni.navigateBack() });
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
	if (reconnectTimer) clearTimeout(reconnectTimer);
	const session = bleSession;
	bleSession = null;
	session?.close().finally(() => bleStore.updateDeviceConnectionStatus(deviceId.value, false));
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
		addLog('错误', '连接失败: ' + (error?.message || error?.errMsg || '未知错误'));
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
		if (reconnectTimer) clearTimeout(reconnectTimer);
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connectDevice();
		}, delay);
};

const handleReceivedData = (buffer) => {
	const dataView = new DataView(buffer);
	const hexArr = [];
	for (let i = 0; i < dataView.byteLength; i++) {
		hexArr.push(dataView.getUint8(i).toString(16).padStart(2, '0').toUpperCase());
	}
	const hexData = hexArr.join(' ');
	let textData = '';
		try { textData = utf8Decode(buffer); } catch(e){}
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
			const encoded = utf8Encode(data);
			buffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
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
.container {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: transparent;
}

.device-panel {
	/* 卡片配方（渐变/描边/圆角/阴影）走模板上的 ble-card */
	margin: 24rpx 24rpx 0;
	padding: 28rpx;
	z-index: 10;
	flex-shrink: 0;
}

.device-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 16rpx;
	margin-bottom: 22rpx;
}

.device-info {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	flex: 1;
}

.name-container {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 16rpx;
}

.device-name {
	font-size: 36rpx;
	line-height: 1.2;
	font-weight: 700;
	color: var(--ble-text);
}

.status-dot {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background: #9aa8b6;
}

.status-dot.connected {
	background: var(--ble-mint);
	box-shadow: 0 0 16rpx rgba(23, 199, 168, 0.48);
}

.device-id-container {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8rpx;
}

.device-id-label {
	font-size: 22rpx;
	color: var(--ble-text-muted);
}

.device-id {
	font-size: 22rpx;
	color: var(--ble-text-subtle);
	font-family: "SF Mono", "Roboto Mono", Menlo, monospace;
}

.device-actions-top {
	margin-left: auto;
}

.action-btn {
	height: 56rpx;
	line-height: 56rpx;
	padding: 0 22rpx;
	border: none;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #ff9f43 0%, #f2555f 100%);
	color: #ffffff;
	font-size: 22rpx;
	font-weight: 700;
	box-shadow: 0 12rpx 28rpx rgba(242, 85, 95, 0.14);
}

.action-btn::after {
	border: none;
}

.device-actions-row {
	display: flex;
	gap: 14rpx;
}

.row-btn {
	flex: 1;
	height: 76rpx;
	line-height: 76rpx;
	border-radius: 999rpx;
	font-size: 26rpx;
	font-weight: 700;
	border: none;
	background: var(--ble-gradient-brand);
	color: #ffffff;
}

.row-btn::after {
	border: none;
}

.row-btn.clear {
	background: rgba(96, 117, 141, 0.08);
	color: var(--ble-text-subtle);
	flex: 0.9;
}

.row-btn.share {
	background: rgba(27, 109, 255, 0.08);
	color: var(--ble-brand);
	flex: 0.9;
}

.row-btn.connected {
	background: linear-gradient(135deg, #f2555f 0%, #ff9f43 100%);
}

.main-content {
	flex: 1;
	height: 0;
	padding: 24rpx;
}
</style>
