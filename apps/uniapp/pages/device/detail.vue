<template>
	<view class="container">
		<AppSubnav title="GATT 调试">
			<template #action>
				<AppButton v-if="hasOtaService" label="固件更新" tone="ghost" size="sm" danger-text icon="dl" @tap="showOtaModal = true" />
			</template>
		</AppSubnav>

		<view class="device-panel">
			<view class="device-header">
				<view class="device-info">
					<view class="name-container">
						<text class="device-name">{{deviceInfo.name || '未知设备'}}</text>
						<view class="status-dot" :class="{'connected': isConnected}"></view>
					</view>
					<view class="device-id-container">
						<text class="device-id">{{deviceInfo.deviceId}}</text>
						<text class="conn-word">· {{ connWord }}</text>
					</view>
				</view>
				<AppButton
					class="conn-btn"
					:label="connLabel"
					:tone="isConnected ? 'danger' : 'primary'"
					:icon="isConnected ? 'x' : 'link'"
					:loading="isInitializing || isConnecting"
					:disabled="isInitializing || isConnecting"
					@tap="toggleConnection"
				/>
			</view>
		</view>

		<scroll-view class="main-content" scroll-y>
			<view v-if="servicePanelState === 'ready'" class="sec-t">
				<view class="t">
					<AppIcon name="chip" :size="30" tone="primary" />
					<text class="sec-title">服务与特征</text>
					<AppChip :text="`${canonServices.length} 服务 / ${charCount} 特征`" tone="neutral" />
				</view>
				<text class="expand-toggle" @click="toggleExpandAll">{{ allExpanded ? '全部收起' : '全部展开' }}</text>
			</view>
			<ServicePanel
				:services="canonServices"
				:state="servicePanelState"
				:error-text="lastConnectError"
				:expanded="expandedMap"
				:notifying="notifyingMap"
				@toggle-service="onToggleService"
				@read="onReadCharacteristic"
				@write="onBeforeWriteCharacteristic"
				@notify="onToggleNotify"
				@retry="manualRetryConnection"
			/>
		</scroll-view>

		<LogPanel :logs="logs" variant="dock" @clear="clearLogs" @export="shareLogs" />

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
import { ref, computed } from 'vue';
import { onShareAppMessage, onUnload } from '@dcloudio/uni-app';
// UI-G2：P006 改挂正典组件层（AppSubnav + 固件更新右键 / ServicePanel 五态 / LogPanel dock）
import AppSubnav from '../../components/ui/AppSubnav.vue';
import AppButton from '../../components/ui/AppButton.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
import AppChip from '../../components/ui/AppChip.vue';
import ServicePanel from '../../components/ui/ServicePanel.vue';
import LogPanel from '../../components/ui/LogPanel.vue';
import OtaDialog from '../../components/ota-dialog/ota-dialog.vue';
import WriteDialog from '../../components/write-dialog/write-dialog.vue';
import { OTA_UUIDS } from '../../utils/ota_manager.js';
import {
	readValue,
	setNotifyEnabled,
	subscribe as subscribeBleValue,
	writeValue as writeBleValue
} from '../../services/ble-runtime/index.js';
import { utf8Decode } from '../../../../core/ble-core/provisioning/framing.js';
import {
	createNotifyToggleController,
	encodeWritePayload,
	formatDeviceLogExport
} from '../../services/device-session-operations.js';
import { useDeviceSession } from '../../composables/use-device-session.js';
// #ifdef H5
// H5 假数据通道：暴露 GATT 调试页本地态给 window.__MOCK__（?mock=1 时才有消费者）
import { registerPageTargets } from '../../services/mock/mock-registry.js';
// #endif

const {
	deviceInfo,
	isConnected,
	services,
	servicePanelState,
	isInitializing,
	isConnecting,
	lastConnectError,
	autoRetryExhausted,
	hasOtaService,
	logs,
	getSession,
	addLog,
	clearLogs,
	toggleConnection,
	manualRetryConnection,
	isPageActive
} = useDeviceSession();

// #ifdef H5
registerPageTargets('p006', { isInitializing, isConnecting, lastConnectError, autoRetryExhausted, hasOtaService, logs });
// #endif

const showWriteDataModal = ref(false);
const writeServiceId = ref('');
const writeCharacteristicId = ref('');
const showOtaModal = ref(false);
const isSending = ref(false);
const expandedMap = ref({});
const notifyingMap = ref({});

// 运行时 services 形状 → 正典 ServicePanel 形状（uuid/name/ota + chars[].props）
const canonServices = computed(() => (services.value || []).map((s) => ({
	uuid: s.uuid,
	name: s.name,
	ota: String(s.uuid).toLowerCase() === OTA_UUIDS.SERVICE_OTA,
	chars: (s.characteristics || []).map((c) => ({
		uuid: c.uuid,
		name: c.name,
		props: {
			read: !!c.properties?.read,
			write: !!c.properties?.write,
			notify: !!c.properties?.notify
		}
	}))
})));
const charCount = computed(() => canonServices.value.reduce((n, s) => n + s.chars.length, 0));
const allExpanded = computed(() =>
	canonServices.value.length > 0 && canonServices.value.every((s, i) => expandedMap.value[i]));

const connWord = computed(() => {
	if (isConnected.value) return '已连接';
	if (isInitializing.value || isConnecting.value) return '连接中';
	return '未连接';
});
const connLabel = computed(() => {
	if (isInitializing.value || isConnecting.value) return '连接中…';
	return isConnected.value ? '断开连接' : '连接设备';
});

const onToggleService = (index) => {
	expandedMap.value = { ...expandedMap.value, [index]: !expandedMap.value[index] };
};
const toggleExpandAll = () => {
	const next = !allExpanded.value;
	const map = {};
	canonServices.value.forEach((s, i) => { map[i] = next; });
	expandedMap.value = map;
};

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
			notifyingMap.value = { ...notifyingMap.value, [charId]: enabled };
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
	margin: 32rpx 32rpx 0;
	padding: 32rpx;
	border-radius: var(--ble-radius-lg);
	background: var(--ble-gradient-surface);
	border: 1rpx solid var(--ble-line);
	box-shadow: var(--ble-shadow-soft);
	z-index: var(--z-nav);
	flex-shrink: 0;
}

.device-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 16rpx;
}

.device-info {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	flex: 1;
	min-width: 0;
}

.name-container {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 16rpx;
}

.device-name {
	font-size: 34rpx;
	line-height: 1.3;
	font-weight: 700;
	color: var(--ble-text);
}

.status-dot {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background: var(--c-ph);
}

.status-dot.connected {
	background: var(--ble-mint);
	box-shadow: 0 0 16rpx rgba(23, 199, 168, 0.55);
}

.device-id-container {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8rpx;
}

.device-id {
	font-size: 22rpx;
	color: var(--ble-text-subtle);
	font-family: "SF Mono", "Roboto Mono", Menlo, monospace;
}

.conn-word {
	font-size: 22rpx;
	color: var(--ble-text-muted);
}

.conn-btn { flex-shrink: 0; }

.sec-t {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	margin-bottom: 18rpx;
}

.sec-t .t {
	display: flex;
	align-items: center;
	gap: 12rpx;
	min-width: 0;
}

.sec-title {
	font-size: var(--fs-h1);
	font-weight: var(--fw-bold);
	color: var(--c-text);
}

.expand-toggle { flex-shrink: 0; font-size: var(--fs-cap); font-weight: var(--fw-med); color: var(--c-primary); }

.main-content {
	flex: 1;
	height: 0;
	padding: 32rpx;
}
</style>
