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
					:class="[
						isConnected ? 'ble-btn--danger' : 'ble-btn--primary',
						(isInitializing || isConnecting) ? 'ble-btn--busy' : ''
					]"
					:disabled="isInitializing || isConnecting"
					@click="toggleConnection"
				>
					{{ isInitializing || isConnecting ? '连接中…' : (isConnected ? '断开连接' : '连接设备') }}
				</button>
			</view>
		</view>

		<scroll-view class="main-content" scroll-y>
			<service-panel
				:services="services"
				:state="servicePanelState"
				:error-message="lastConnectError"
				:retry-disabled="isInitializing || isConnecting"
				@read="onReadCharacteristic"
				@write="onBeforeWriteCharacteristic"
				@notifyToggle="onToggleNotify"
				@retry="manualRetryConnection"
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
import { ref } from 'vue';
import { onShareAppMessage, onUnload } from '@dcloudio/uni-app';
import {
	readValue,
	setNotifyEnabled,
	subscribe as subscribeBleValue,
	writeValue as writeBleValue
} from '../../services/ble-runtime/index.js';
import OtaDialog from '../../components/ota-dialog/ota-dialog.vue';
import ServicePanel from '../../components/service-panel/service-panel.vue';
import LogPanel from '../../components/log-panel/log-panel.vue';
import WriteDialog from '../../components/write-dialog/write-dialog.vue';
import { utf8Decode } from '../../../../core/ble-core/provisioning/framing.js';
import {
	createNotifyToggleController,
	encodeWritePayload,
	formatDeviceLogExport
} from '../../services/device-session-operations.js';
import { useDeviceSession } from '../../composables/use-device-session.js';

const {
	deviceInfo,
	isConnected,
	services,
	servicePanelState,
	isInitializing,
	isConnecting,
	lastConnectError,
	hasOtaService,
	logs,
	logScrollTop,
	getSession,
	addLog,
	clearLogs,
	toggleConnection,
	manualRetryConnection,
	isPageActive
} = useDeviceSession();

const showWriteDataModal = ref(false);
const writeServiceId = ref('');
const writeCharacteristicId = ref('');
const showOtaModal = ref(false);
const isSending = ref(false);

const notifyController = createNotifyToggleController({
	subscribe: ({ session, serviceId, characteristicId, callback }) => subscribeBleValue(session, serviceId, characteristicId, callback),
	disable: ({ session, serviceId, characteristicId }) => setNotifyEnabled(session, serviceId, characteristicId, false)
});

onUnload(() => {
	notifyController.dispose().catch(() => {});
});

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: '分享一个好用的 BLE 工具: BLE Toolkit+',
	path: '/pages/index/index'
}));
// #endif

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

const handleReceivedData = (buffer) => {
	const dataView = new DataView(buffer);
	const hexArr = [];
	for (let i = 0; i < dataView.byteLength; i++) {
		hexArr.push(dataView.getUint8(i).toString(16).padStart(2, '0').toUpperCase());
	}
	const hexData = hexArr.join(' ');
	let textData = '';
	try { textData = utf8Decode(buffer); } catch (e) {}
	addLog('接收', `HEX: ${hexData}\nTEXT: ${textData}`);
};

const onReadCharacteristic = ({ serviceId, charId }) => {
	const bleSession = getSession();
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
		const bleSession = getSession();
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
	const bleSession = getSession();
	const service = services.value.find(s => s.uuid === serviceId);
	if (!service || !bleSession) return;
	const char = service.characteristics.find(c => c.uuid === charId);
	if (!char) return;
	const target = { session: bleSession, serviceId, characteristicId: charId, callback: handleReceivedData };
	if (notifyController.isPending(target)) return;
	notifyController.toggle(target)
		.then((enabled) => {
			if (!isPageActive() || getSession() !== target.session) return;
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
	border-radius: var(--ble-radius-lg);
	background: var(--ble-gradient-surface);
	border: 1rpx solid var(--ble-line);
	box-shadow: var(--ble-shadow-soft);
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
