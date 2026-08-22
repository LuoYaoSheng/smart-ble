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
					<button v-if="hasOtaService" class="ble-btn ble-btn--danger ble-btn--sm" @click="showOtaModal = true">固件更新</button>
				</view>
			</view>
			<view class="device-actions-row">
				<button class="ble-btn ble-btn--ghost ble-btn--md ble-btn--block" @click="clearLogs">清空日志</button>
				<button class="ble-btn ble-btn--secondary ble-btn--md ble-btn--block" @click="shareLogs">导出日志</button>
				<button
					class="ble-btn ble-btn--md ble-btn--block"
					:class="isConnected ? 'ble-btn--danger' : 'ble-btn--primary'"
					@click="toggleConnection"
				>
					{{ isConnected ? '断开连接' : '连接设备' }}
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
import { utf8Decode } from '../../../../core/ble-core/provisioning/framing.js';
import {
	createNotifyToggleController,
	encodeWritePayload,
	formatDeviceLogExport
} from '../../services/device-session-operations.js';

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
let reconnectTimer = null;
let pageDisconnectUnsubscribe = null;
let pageActive = true;
const notifyController = createNotifyToggleController({
	subscribe: ({ session, serviceId, characteristicId, callback }) => subscribeBleValue(session, serviceId, characteristicId, callback),
	disable: ({ session, serviceId, characteristicId }) => setNotifyEnabled(session, serviceId, characteristicId, false)
});

const describeServices = (session) => session.services.map((service) => ({
	...service,
	characteristics: service.characteristics || []
}));

const bindPageSession = (session, { announceConnected = false, announceResume = false } = {}) => {
	bleSession = session;
	const srvs = describeServices(session);
	hasOtaService.value = srvs.some((service) => String(service.uuid).toLowerCase() === OTA_UUIDS.SERVICE_OTA);
	bleStore.bindConnectedSession(
		{
			deviceId: deviceId.value,
			name: deviceInfo.value.name || '未知设备',
			RSSI: deviceInfo.value.RSSI || 0
		},
		session,
		srvs
	);

	pageDisconnectUnsubscribe?.();
	pageDisconnectUnsubscribe = session.onDisconnect(() => {
		if (bleSession !== session) return;
		bleSession = null;
		if (!pageActive) return;
		if (isUserDisconnected.value) {
			addLog('系统', '已手动断开连接');
			return;
		}
		addLog('系统', '设备已断开连接');
		retryConnection();
	});

	connectionRetryCount.value = 0;
	if (announceConnected) {
		addLog('系统', `获取到 ${srvs.length} 个服务`);
		addLog('系统', '设备连接成功');
	}
	if (announceResume) {
		addLog('系统', '已恢复现有连接');
	}
};

onLoad((options) => {
	if (options.device) {
		try {
			const parsedDevice = JSON.parse(decodeURIComponent(options.device));
			deviceId.value = parsedDevice.deviceId;   // set first
			bleStore.initConnectedDevice(parsedDevice);
			const existingSession = bleStore.getRuntimeSession(deviceId.value);
			if (existingSession && !existingSession.dead) {
				isUserDisconnected.value = false;
				bindPageSession(existingSession, { announceResume: true });
			} else {
				if (storeDevice.value.isConnected) {
					bleStore.updateDeviceConnectionStatus(deviceId.value, false);
				}
				initBluetoothAdapter();
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

onShow(() => {
	pageActive = true;
	if (!deviceId.value) return;
	const existingSession = bleStore.getRuntimeSession(deviceId.value);
	if (existingSession && !existingSession.dead && bleSession !== existingSession) {
		bindPageSession(existingSession);
	}
});

onUnload(() => {
	pageActive = false;
	if (unsubLogger) {
		unsubLogger();
	}
	notifyController.dispose().catch(() => {});
	if (reconnectTimer) clearTimeout(reconnectTimer);
	pageDisconnectUnsubscribe?.();
	pageDisconnectUnsubscribe = null;
	bleSession = null;
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
	const content = formatDeviceLogExport(logs.value);
	uni.setClipboardData({
		data: content,
		success: () => uni.showToast({ title: '日志已复制', icon: 'success' })
	});
};

const initBluetoothAdapter = async () => {
	if (isInitializing.value) return;
	const existingSession = bleStore.getRuntimeSession(deviceId.value);
	if (existingSession && !existingSession.dead) {
		isUserDisconnected.value = false;
		bindPageSession(existingSession);
		return;
	}
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
		if (reconnectTimer) clearTimeout(reconnectTimer);
		reconnectTimer = null;
		bleStore.disconnectConnectedDevice(deviceId.value, { remove: false })
			.catch((error) => {
				isUserDisconnected.value = false;
				addLog('错误', '断开失败: ' + (error?.errMsg || error?.message || '未知错误'));
			});
	} else {
		connectDevice();
	}
};

const connectDevice = async () => {
	try {
		const existingSession = bleStore.getRuntimeSession(deviceId.value);
		if (existingSession && !existingSession.dead) {
			isUserDisconnected.value = false;
			bindPageSession(existingSession, { announceResume: true });
			return;
		}
		addLog('系统', '正在连接...');
		const session = await connectBleDevice(deviceId.value, { timeout: 10000 });
		isUserDisconnected.value = false;
		bindPageSession(session, { announceConnected: true });
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
	try {
		const buffer = encodeWritePayload(type, data);
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
	const target = { session: bleSession, serviceId, characteristicId: charId, callback: handleReceivedData };
	if (notifyController.isPending(target)) return;
	notifyController.toggle(target)
		.then((enabled) => {
			if (!pageActive || bleSession !== target.session) return;
			char.notifying = enabled;
			addLog('系统', enabled ? '开启监听成功' : '关闭监听成功');
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
	margin: 24rpx 24rpx 0;
	padding: 28rpx;
	border-radius: 34rpx;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(242, 248, 255, 0.95) 100%);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
	box-shadow: 0 18rpx 40rpx rgba(17, 43, 78, 0.06);
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

.device-actions-row {
	display: flex;
	gap: 14rpx;
}

.main-content {
	flex: 1;
	height: 0;
	padding: 24rpx;
}
</style>
