<template>
	<scroll-view class="page-container" scroll-y>
		<view class="settings-section">
			<view class="settings-heading">
				<text class="section-title">广播设置</text>
				<view class="settings-meta">
					<text class="platform-tag">{{ platformLabel }}</text>
					<view class="runtime-state" :class="{ active: advertising, ready: !advertising && isSupported }">
						<view class="status-indicator-dot"></view>
						<text>{{ broadcastStateText }}</text>
					</view>
				</view>
			</view>

			<view class="field-group">
				<view class="field-label-row">
					<text class="field-label">设备名称</text>
					<text v-if="platform === 'android'" class="field-hint">Android 使用系统蓝牙名称</text>
				</view>
				<input class="field-input" :value="deviceName" :disabled="advertising"
					placeholder="自定义名称或系统蓝牙名称"
					@input="e => deviceName = e.detail.value" />
			</view>

			<view class="field-group">
				<text class="field-label">服务UUID</text>
				<input class="field-input" v-model="serviceUUID" :disabled="advertising"
					placeholder="输入服务UUID (128位)" />
			</view>

			<view class="uuid-hint" v-if="payloadAnalysis.errors.length">
				<text class="uuid-hint-text">{{ payloadAnalysis.errors[0] }}</text>
			</view>

			<template v-if="platform === 'android'">
				<view class="field-group">
					<text class="field-label">广播模式</text>
					<picker @change="onModeChange" :value="modeIndex" :range="modeOptions">
						<view class="field-picker">
							<text>{{modeOptions[modeIndex]}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>

				<view class="field-group">
					<text class="field-label">发射功率</text>
					<picker @change="onPowerChange" :value="powerIndex" :range="powerOptions">
						<view class="field-picker">
							<text>{{powerOptions[powerIndex]}}</text>
							<text class="picker-arrow">▼</text>
						</view>
					</picker>
				</view>

				<view class="switch-row">
					<text class="switch-label">可连接</text>
					<switch color="#1B6DFF" :checked="androidSettings.connectable" @change="onConnectableChange" />
				</view>
				<view class="switch-row">
					<text class="switch-label">包含设备名称</text>
					<switch color="#1B6DFF" :checked="androidSettings.includeDeviceName" @change="onIncludeDeviceNameChange" />
				</view>
				<view class="switch-row">
					<text class="switch-label">添加服务UUID</text>
					<switch color="#1B6DFF" :checked="androidSettings.addServiceUuid" @change="onAddServiceUuidChange" />
				</view>
			</template>
			<!-- 厂商ID + 厂商数据（通用字段，对齐 Flutter BroadcastPage） -->
			<view class="field-group">
				<text class="field-label">厂商ID (HEX)</text>
				<input class="field-input" v-model="manufacturerId" :disabled="advertising" placeholder="如：0001" />
			</view>
			<view class="field-group">
				<text class="field-label">厂商数据</text>
				<input class="field-input" v-model="manufacturerData" :disabled="advertising" placeholder="广播携带的数据" />
			</view>
			<!-- 广播字节数实时提示 -->
			<view class="bytes-hint" v-if="serviceUUID || manufacturerData">
				<text class="bytes-hint-text">预计广播包大小：{{ calcAdvertiseBytes() }} / 31 字节</text>
				<text class="bytes-hint-warn" v-if="calcAdvertiseBytes() > 31">超出限制</text>
			</view>

			<view class="action-section">
				<button
					class="ble-btn ble-btn--lg action-primary"
					:class="advertising ? 'ble-btn--danger' : 'ble-btn--primary'"
					@click="toggleAdvertising"
				>
					{{ advertising ? '停止广播' : '开始广播' }}
				</button>
				<button class="ble-btn ble-btn--secondary ble-btn--lg action-secondary" @click="checkSupport">检查支持</button>
			</view>
		</view>

		<log-panel
			class="broadcast-log"
			variant="card"
			compact
			clearable
			title="操作日志"
			caption="记录广播启动、停止和支持检查结果。"
			empty-text="暂无日志 · 开始广播或检查支持后，操作记录会显示在这里"
			:logs="logs"
			@clear="clearLogs"
		/>
	</scroll-view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onHide, onLoad, onShow, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { logger } from '../../../../core/ble-core/utils/logger';
import { useBleStore } from '../../store/ble';
import { createWxPeripheralAdapterController } from '../../services/wx-peripheral-mode.js';
import { createWxPeripheralServerController } from '../../services/wx-peripheral-server.js';
import {
	DEFAULT_ADVERTISING_PAYLOAD,
	analyzeAdvertisingPayload,
	manufacturerDataBuffer
} from '../../utils/advertising-payload.js';
import { validateAppBroadcastStart } from '../../services/broadcast/validation.js';
import {
	createBroadcastAdapter,
	buildBroadcastPayload,
} from '../../services/broadcast/index.js';
import { useBroadcastSession } from '../../composables/use-broadcast-session.js';
import LogPanel from '../../components/log-panel/log-panel.vue';
const bleStore = useBleStore();

const blePeripheral = ref(null);
const platform = ref('');

// Platform hooks injected into Broadcast Adapter (page must not call discovery APIs directly)
let platformStartAdvertising = async () => ({ ok: true });
let platformStopAdvertising = async () => ({ ok: true });

const broadcastAdapter = createBroadcastAdapter({
	platform: 'uniapp-page-008',
	startAdvertising: (payload, options) => platformStartAdvertising(payload, options),
	stopAdvertising: (options) => platformStopAdvertising(options),
});

const {
	advertising,
	isSupported,
	logs,
	broadcastStateText: sessionStateText,
	pageState,
	addLog: sessionAddLog,
	clearLogs: sessionClearLogs,
	reportBroadcastError: sessionReportError,
	markSupported,
	startBroadcast,
	stopBroadcast,
	cleanup,
	stopOnLeave,
	getBroadcastState,
	getBroadcastPayload,
} = useBroadcastSession({
	adapter: broadcastAdapter,
	owner: { type: 'PAGE', id: 'PAGE-008' },
});

// #ifdef MP-WEIXIN
const wxPeripheralAdapter = createWxPeripheralAdapterController({
	platform: wx,
	getConnectedCount: () => bleStore.connectedDevicesList.length
});
const wxPeripheralServer = createWxPeripheralServerController({ platform: wx });
// #endif

// Android 参数
const androidSettings = ref({
	advertiseMode: 2,
	txPowerLevel: 3,
	connectable: true,
	includeDeviceName: false,
	addServiceUuid: false
});

// UI 显示参数
const deviceName = ref('');
const serviceUUID = ref('');
const modeIndex = ref(2);
const powerIndex = ref(3);
const modeOptions = ['低功耗', '平衡', '低延迟'];
const powerOptions = ['超低功率', '低功率', '中功率', '高功率'];
const manufacturerId = ref('');
const manufacturerData = ref('');
const platformLabel = computed(() => ({ android: 'Android', ios: 'iOS', weixin: '微信', web: 'Web' }[platform.value] || 'BLE'));
const broadcastStateText = computed(() => {
	if (advertising.value) return '广播中';
	if (platform.value === 'web') return '不支持';
	if (pageState.value === 'Error') return '失败';
	if (pageState.value === 'Stopped') return '已停止';
	return isSupported.value ? '已就绪' : '未就绪';
});

const payloadAnalysis = computed(() => buildBroadcastPayload({
	deviceName: deviceName.value,
	serviceUuid: serviceUUID.value,
	manufacturerId: manufacturerId.value,
	manufacturerData: manufacturerData.value
}, {
	includeDeviceName: platform.value === 'android' ? androidSettings.value.includeDeviceName : true,
	includeServiceUuid: platform.value === 'android' ? androidSettings.value.addServiceUuid : true
}));
const addLog = (type, message) => {
	sessionAddLog(type, message);
	switch(type) {
		case '错误': logger.error(message, 'broadcast'); break;
		case '成功': logger.success(message, 'broadcast'); break;
		case '接收': logger.receive(message, 'broadcast'); break;
		case '操作': logger.send(message, 'broadcast'); break;
		default: logger.info(message, 'broadcast'); break;
	}
};

const reportBroadcastError = (message) => {
	const detail = message || '当前无法启动蓝牙广播。';
	addLog('错误', detail);
	uni.showToast({ title: detail, icon: 'none' });
};

const clearLogs = () => {
	logger.clear('broadcast');
	sessionClearLogs();
};

const checkSupport = () => {
	// #ifdef APP-PLUS
	if (!blePeripheral.value) {
		addLog('错误', '插件未初始化');
		markSupported(false);
		return;
	}
	blePeripheral.value.isSupported((result) => {
		const supported = result.code === 0 && result.supported;
		markSupported(supported);
		addLog(supported ? '系统' : '错误', supported ? '设备支持低功耗蓝牙广播' : '设备不支持低功耗蓝牙广播');
	});
	// #endif

	// #ifdef MP-WEIXIN
	checkWxBleSupport();
	// #endif

	// #ifndef APP-PLUS
	// #ifndef MP-WEIXIN
	markSupported(false);
	addLog('系统', '当前平台不支持 BLE 广播，请使用微信小程序或 App。');
	// #endif
	// #endif
};

// #ifdef MP-WEIXIN
const checkWxBleSupport = async () => {
	try {
		await wxPeripheralAdapter.open();
		await wxPeripheralServer.ensureCreated();
		addLog('系统', '蓝牙从机模式已就绪');
		markSupported(true);
	} catch (error) {
		if (error?.code === 'released_during_open') return;
		const detail = error?.errMsg || error?.message || JSON.stringify(error);
		if (isWeixinDevTools()) addLog('系统', '开发者工具不支持 BLE 外围服务，请使用真机调试广播功能');
		else addLog('错误', '蓝牙从机模式初始化失败: ' + detail);
		markSupported(false);
	}
};

const isWeixinDevTools = () => {
	try {
		return wx.getDeviceInfo?.().platform === 'devtools';
	} catch {
		return false;
	}
};

const releaseWxPeripheralMode = async () => {
	await wxPeripheralServer.close().catch((error) => {
		addLog('错误', '关闭 BLE 外围服务器失败: ' + (error?.errMsg || error?.message || error));
	});
	await cleanup().catch(() => {});
	markSupported(false);
	await wxPeripheralAdapter.release();
	wxPeripheralServer.invalidate();
};
// #endif

const openAppSettings = () => {
	if (platform.value !== 'android') return;
	try {
		const Intent = plus.android.importClass('android.content.Intent');
		const Settings = plus.android.importClass('android.provider.Settings');
		const Uri = plus.android.importClass('android.net.Uri');
		const mainActivity = plus.android.runtimeMainActivity();
		const packageName = mainActivity.getPackageName();
		const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
		const uri = Uri.fromParts('package', packageName, null);
		intent.setData(uri);
		mainActivity.startActivity(intent);
	} catch (e) {
		addLog('错误', '打开设置页面失败: ' + e.message);
	}
};

const showPermissionDialog = () => {
	const Build = plus.android.importClass("android.os.Build");
	const content = Build.VERSION.SDK_INT >= 31 ? 
		'需要蓝牙广播、连接、扫描和位置权限，请在系统设置中手动开启' :
		'需要蓝牙和位置权限，请在系统设置中开启';
	uni.showModal({
		title: '权限请求',
		content,
		confirmText: '去设置',
		success: (res) => {
			if (res.confirm) openAppSettings();
		}
	});
};

const checkPermissionsAfterRequest = (onGranted, onDenied) => {
	try {
		const main = plus.android.runtimeMainActivity();
		const PackageManager = plus.android.importClass("android.content.pm.PackageManager");
		const Build = plus.android.importClass("android.os.Build");
		const permissions = ["android.permission.ACCESS_FINE_LOCATION"];
		if (Build.VERSION.SDK_INT >= 31) {
			permissions.push("android.permission.BLUETOOTH_ADVERTISE");
			permissions.push("android.permission.BLUETOOTH_CONNECT");
		}
		
		let allGranted = true;
		const missing = [];
		for (const permission of permissions) {
			if (main.checkSelfPermission(permission) !== PackageManager.PERMISSION_GRANTED) {
				allGranted = false;
				missing.push(permission);
			}
		}
		if (!allGranted) {
			addLog('错误', '请求后仍缺权限：' + missing.join(', '));
			if (onDenied) onDenied('缺少权限: ' + missing.join(', '));
			showPermissionDialog();
		} else {
			addLog('系统', '所有必要权限已获得');
			if (onGranted) onGranted();
		}
	} catch (e) {
		if (onDenied) onDenied('检查状态失败: ' + e.message);
	}
};

const requestPermissionsOneByOne = (permissions, index, onGranted, onDenied) => {
	if (index >= permissions.length) {
		checkPermissionsAfterRequest(onGranted, onDenied);
		return;
	}
	const permission = permissions[index];
	plus.android.requestPermissions([permission], (result) => {
		requestPermissionsOneByOne(permissions, index + 1, onGranted, onDenied);
	}, (error) => {
		requestPermissionsOneByOne(permissions, index + 1, onGranted, onDenied);
	});
};

const requestAndroidPermissions = (onGranted, onDenied) => {
	if (platform.value !== 'android') {
		if (onGranted) onGranted();
		return;
	}
	if (!blePeripheral.value) {
		if (onDenied) onDenied('插件未初始化');
		return;
	}
	try {
		const main = plus.android.runtimeMainActivity();
		const PackageManager = plus.android.importClass("android.content.pm.PackageManager");
		const Build = plus.android.importClass("android.os.Build");
		const permissions = ["android.permission.ACCESS_FINE_LOCATION"];
		if (Build.VERSION.SDK_INT >= 31) {
			permissions.push("android.permission.BLUETOOTH_ADVERTISE");
			permissions.push("android.permission.BLUETOOTH_CONNECT");
		}
		
		const missing = [];
		for (const permission of permissions) {
			if (main.checkSelfPermission(permission) !== PackageManager.PERMISSION_GRANTED) {
				missing.push(permission);
			}
		}
		if (missing.length > 0) {
			requestPermissionsOneByOne(missing, 0, onGranted, onDenied);
		} else {
			if (onGranted) onGranted();
		}
	} catch (e) {
		if (onDenied) onDenied('检查失败: ' + e.message);
	}
};

const calcAdvertiseBytes = () => payloadAnalysis.value.totalBytes;

// #ifdef MP-WEIXIN
const getPowerLevel = () => {
	const levels = ['low', 'medium', 'high', 'high'];
	return levels[powerIndex.value] || 'high';
};
const runWxStart = async (payload) => {
	const advertiseRequest = {
		deviceName: payload.deviceName,
		serviceUuids: payload.serviceUuid ? [payload.serviceUuid] : []
	};
	if (payload.manufacturerId != null) {
		advertiseRequest.manufacturerData = [{
			manufacturerId: payload.manufacturerId,
			manufacturerSpecificData: manufacturerDataBuffer(payload.manufacturerData)
		}];
	}
	await wxPeripheralServer.start(advertiseRequest, getPowerLevel());
	return { ok: true };
};
const runWxStop = async () => {
	await wxPeripheralServer.stop();
	return { ok: true };
};
// #endif

// #ifdef APP-PLUS
const runAppStart = (payload) => new Promise((resolve, reject) => {
	if (!blePeripheral.value) {
		reject(new Error('广播插件未初始化'));
		return;
	}
	if (platform.value === 'android') {
		const options = {
			settings: {
				advertiseMode: modeIndex.value,
				txPowerLevel: powerIndex.value,
				connectable: androidSettings.value.connectable
			},
			advertiseData: {
				includeDeviceName: androidSettings.value.includeDeviceName,
				manufacturerId: payload.manufacturerId || 0,
				manufacturerData: payload.manufacturerData || ''
			}
		};
		if (androidSettings.value.addServiceUuid && payload.serviceUuid) {
			options.advertiseData.serviceUuid = payload.serviceUuid;
		}
		blePeripheral.value.startAdvertising(options, (result) => {
			if (result.code === 0) resolve({ ok: true });
			else reject(new Error(result?.message || result?.errMsg || 'Android广播启动失败'));
		});
		return;
	}
	const options = {
		localName: payload.deviceName,
		services: payload.serviceUuid ? [payload.serviceUuid] : [],
		manufacturerData: {
			id: payload.manufacturerId || 0,
			data: payload.manufacturerData || ''
		}
	};
	blePeripheral.value.startAdvertising(options, (result) => {
		if (result.code === 0) resolve({ ok: true });
		else reject(new Error(result?.message || result?.errMsg || 'iOS广播启动失败'));
	});
});
const runAppStop = () => new Promise((resolve, reject) => {
	if (!blePeripheral.value) {
		reject(new Error('广播插件未初始化，无法停止广播。'));
		return;
	}
	blePeripheral.value.stopAdvertising((result) => {
		if (result.code === 0) resolve({ ok: true });
		else reject(new Error(result?.message || result?.errMsg || '停止广播失败'));
	});
});
// #endif

// Bind platform hooks used by Broadcast Adapter / Session
platformStartAdvertising = async (payload) => {
	// #ifdef APP-PLUS
	return runAppStart(payload);
	// #endif
	// #ifdef MP-WEIXIN
	return runWxStart(payload);
	// #endif
	// #ifndef APP-PLUS
	// #ifndef MP-WEIXIN
	throw new Error('当前平台不支持 BLE 广播');
	// #endif
	// #endif
};

platformStopAdvertising = async () => {
	// #ifdef APP-PLUS
	return runAppStop();
	// #endif
	// #ifdef MP-WEIXIN
	return runWxStop();
	// #endif
	// #ifndef APP-PLUS
	// #ifndef MP-WEIXIN
	return { ok: true };
	// #endif
	// #endif
};

const startAdvertising = async () => {
	// #ifdef APP-PLUS
	const validationError = validateAppBroadcastStart({
		pluginReady: Boolean(blePeripheral.value),
		deviceName: deviceName.value,
		serviceUuid: serviceUUID.value,
		payload: payloadAnalysis.value
	});
	if (validationError) {
		reportBroadcastError(validationError);
		return;
	}
	// #endif
	try {
		await startBroadcast({
			deviceName: deviceName.value,
			serviceUuid: serviceUUID.value,
			manufacturerId: manufacturerId.value,
			manufacturerData: manufacturerData.value
		}, {
			payloadOptions: {
				includeDeviceName: platform.value === 'android' ? androidSettings.value.includeDeviceName : true,
				includeServiceUuid: platform.value === 'android' ? androidSettings.value.addServiceUuid : true
			}
		});
	} catch (error) {
		// errors already logged by useBroadcastSession
	}
};

const stopAdvertising = async () => {
	try {
		await stopBroadcast();
	} catch (error) {
		// errors already logged by useBroadcastSession
	}
};

const checkBluetoothAndPermissionsBeforeAdvertise = () => {
	// #ifdef APP-ANDROID
	try {
		const BluetoothAdapter = plus.android.importClass("android.bluetooth.BluetoothAdapter");
		const bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
		if (!bluetoothAdapter || !bluetoothAdapter.isEnabled()) {
			uni.showModal({
				title: '提示',
				content: '请先开启系统蓝牙',
				confirmText: '去开启',
				success: (res) => {
					if (res.confirm) {
						try {
							const Intent = plus.android.importClass("android.content.Intent");
							const enableIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
							plus.android.runtimeMainActivity().startActivityForResult(enableIntent, 1);
						} catch (error) {
							reportBroadcastError('无法打开系统蓝牙设置：' + (error?.message || '未知错误'));
						}
					}
				}
			});
			return;
		}
		requestAndroidPermissions(
			() => startAdvertising(),
			(reason) => reportBroadcastError(reason || '未获得启动广播所需权限。')
		);
	} catch (error) {
		reportBroadcastError('检查 Android 蓝牙状态失败：' + (error?.message || '未知错误'));
	}
	// #endif
	// #ifdef APP-IOS
	startAdvertising();
	// #endif
	// #ifdef MP-WEIXIN
	wxPeripheralAdapter.open()
			.then(() => wxPeripheralServer.ensureCreated())
			.then(() => startAdvertising())
		.catch((error) => {
			const content = error?.code === 'active_connections'
				? error.message
				: error?.errCode === 10001 ? '请先开启系统蓝牙。' : '当前无法启动蓝牙广播。';
			uni.showModal({ title: '无法开始广播', content, showCancel: false });
		});
	// #endif
};

const toggleAdvertising = () => {
	if (platform.value === 'web') {
		reportBroadcastError('当前平台不支持 BLE 广播，请使用微信小程序或 App。');
		return;
	}
	if (advertising.value) {
		stopAdvertising();
	} else {
		if (!payloadAnalysis.value.valid) {
			uni.showToast({ title: payloadAnalysis.value.errors[0], icon: 'none' });
			return;
		}
		checkBluetoothAndPermissionsBeforeAdvertise();
	}
};

const onModeChange = (e) => modeIndex.value = parseInt(e.detail.value);
const onPowerChange = (e) => powerIndex.value = parseInt(e.detail.value);
const onConnectableChange = (e) => androidSettings.value.connectable = e.detail.value;
const onIncludeDeviceNameChange = (e) => androidSettings.value.includeDeviceName = e.detail.value;
const onAddServiceUuidChange = (e) => androidSettings.value.addServiceUuid = e.detail.value;

onLoad(() => {
	// #ifdef APP-PLUS
	blePeripheral.value = uni.requireNativePlugin('LysBlePeripheral');
	// #ifdef APP-ANDROID
		platform.value = 'android';
		deviceName.value = 'SmartBLE-A';
		serviceUUID.value = DEFAULT_ADVERTISING_PAYLOAD.serviceUuid;
		manufacturerId.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerId;
		manufacturerData.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerData;
	// #endif
	// #ifdef APP-IOS
		platform.value = 'ios';
		deviceName.value = 'SmartBLE-I';
		serviceUUID.value = DEFAULT_ADVERTISING_PAYLOAD.serviceUuid;
		manufacturerId.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerId;
		manufacturerData.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerData;
	// #endif
	// #endif

	// #ifdef MP-WEIXIN
	platform.value = 'weixin';
	deviceName.value = DEFAULT_ADVERTISING_PAYLOAD.deviceName;
	serviceUUID.value = DEFAULT_ADVERTISING_PAYLOAD.serviceUuid;
	manufacturerId.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerId;
	manufacturerData.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerData;
	// #endif

	// #ifndef MP-WEIXIN
	// #ifndef APP-PLUS
	platform.value = 'web';
	// #endif
	checkSupport();
	// #endif
});

onShow(() => {
	// #ifdef MP-WEIXIN
	checkSupport();
	// #endif
});

onMounted(() => {
	const history = logger.getHistory('broadcast') || [];
	for (const entry of [...history].reverse()) {
		sessionAddLog(entry.type || '系统', entry.message || entry);
	}
	stopOnLeave(() => cleanup());
});

onUnmounted(() => {
	cleanup().catch(() => {});
});

onHide(() => {
	// #ifndef MP-WEIXIN
	if (advertising.value) stopAdvertising();
	// #endif
	// #ifdef MP-WEIXIN
	releaseWxPeripheralMode();
	// #endif
});

onUnload(() => {
	// #ifdef MP-WEIXIN
	releaseWxPeripheralMode();
	// #endif
	cleanup().catch(() => {});
});

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: '分享一个好用的BLE工具: BLE Toolkit+ - 广播',
	path: '/pages/index/index'
}));
// #endif
</script>

<style>
.page-container {
	min-height: 100vh;
	padding: 20rpx;
	box-sizing: border-box;
	background: transparent;
}

.settings-section {
	background: var(--ble-gradient-surface);
	border: 1rpx solid var(--ble-line);
	border-radius: var(--ble-radius-lg);
	box-shadow: var(--ble-shadow-soft);
	padding: 24rpx;
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.broadcast-log {
	margin-top: 16rpx;
}

.settings-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.settings-meta,
.runtime-state,
.field-label-row {
	display: flex;
	align-items: center;
}

.settings-meta { gap: 10rpx; }
.field-label-row { justify-content: space-between; gap: 12rpx; }

.platform-tag,
.runtime-state {
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
}

.platform-tag { color: var(--ble-brand); background: rgba(27, 109, 255, 0.08); }
.runtime-state { gap: 8rpx; color: #a6630a; background: rgba(255, 159, 67, 0.12); }
.runtime-state.ready { color: #0e8d75; background: rgba(23, 199, 168, 0.12); }
.runtime-state.active { color: #ffffff; background: var(--ble-gradient-brand); }

.field-group {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.field-label,
.switch-label {
	font-size: 25rpx;
	font-weight: 600;
	color: var(--ble-text);
}

.field-hint { color: var(--ble-text-muted); font-size: 20rpx; }

.field-input,
.field-picker {
	height: 76rpx;
	padding: 0 22rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: rgba(241, 246, 252, 0.92);
	border: 1rpx solid var(--ble-line-soft);
	font-size: 25rpx;
	color: var(--ble-text);
}

.picker-arrow {
	font-size: 20rpx;
	color: var(--ble-text-muted);
}

.switch-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18rpx 0;
	border-bottom: 1rpx solid var(--ble-line-faint);
}

.switch-row:last-of-type {
	border-bottom: none;
}

.uuid-hint,
.bytes-hint {
	padding: 14rpx 18rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.uuid-hint {
	background: rgba(255, 159, 67, 0.12);
}

.uuid-hint-text {
	font-size: 22rpx;
	line-height: 1.5;
	color: #a6630a;
}

.bytes-hint {
	background: rgba(27, 109, 255, 0.08);
}

.bytes-hint-text {
	font-size: 23rpx;
	color: var(--ble-brand);
}

.bytes-hint-warn {
	font-size: 23rpx;
	font-weight: 700;
	color: var(--ble-red);
}

.action-section {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.action-primary { flex: 1; min-width: 0; }
.action-secondary { flex: 0 0 190rpx; padding: 0 18rpx; }

.status-indicator-dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: currentColor;
	flex-shrink: 0;
}
</style>
