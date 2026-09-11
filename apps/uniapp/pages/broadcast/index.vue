<template>
	<view class="ble-shell broadcast-shell">
		<AppNavbar kicker="PERIPHERAL" title="广播">
			<template #status>
				<view class="nav-status-group">
					<AppChip :text="'平台：' + platformLabel" tone="neutral" />
					<AppBadge :text="statusBadge.text" :tone="statusBadge.tone" :dot="statusBadge.dot" />
				</view>
			</template>
		</AppNavbar>

		<view class="ble-content page-content">
		<scroll-view class="page-container" scroll-y>
			<view class="settings-section">
				<view class="settings-heading">
					<text class="section-title">广播设置</text>
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
							<AppIcon name="chev-d" :size="26" tone="mut" class="picker-arrow" />
						</view>
					</picker>
				</view>

				<view class="field-group">
					<text class="field-label">发射功率</text>
					<picker @change="onPowerChange" :value="powerIndex" :range="powerOptions">
						<view class="field-picker">
							<text>{{powerOptions[powerIndex]}}</text>
							<AppIcon name="chev-d" :size="26" tone="mut" class="picker-arrow" />
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

		<LogPanel
			class="broadcast-log"
			variant="card"
			empty-text="暂无日志 · 开始广播或检查支持后，操作记录会显示在这里"
			:logs="logs"
			@clear="clearLogs"
			@export="exportLogs"
		/>
		</scroll-view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
// UI-G2：P008 改挂正典组件层（AppNavbar 平台 chip + 状态 badge / LogPanel card + 导出）
import AppNavbar from '../../components/ui/AppNavbar.vue';
import AppChip from '../../components/ui/AppChip.vue';
import AppBadge from '../../components/ui/AppBadge.vue';
import LogPanel from '../../components/ui/LogPanel.vue';
import AppIcon from '../../components/ui/AppIcon.vue'; // UI-PARITY-G0 正典图标入口
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
// #ifdef H5
// H5 假数据通道：暴露广播页本地态给 window.__MOCK__（?mock=1 时才有消费者）
import { registerPageTargets } from '../../services/mock/mock-registry.js';
// #endif
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
	sessionSnap,
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

// #ifdef H5
// H5 假数据通道：暴露广播页本地态给 window.__MOCK__（?mock=1 时才有消费者；置于表单 refs 声明后避免 TDZ）
registerPageTargets('p008', { sessionSnap, isSupported, logs, sessionAddLog, platform, deviceName, serviceUUID, manufacturerId, manufacturerData, androidSettings });
// #endif
const platformLabel = computed(() => ({ android: 'Android', ios: 'iOS', weixin: '微信', web: 'Web' }[platform.value] || 'BLE'));
const broadcastStateText = computed(() => {
	if (advertising.value) return '广播中';
	if (platform.value === 'web') return '不支持';
	if (pageState.value === 'Error') return '失败';
	if (pageState.value === 'Stopped') return '已停止';
	return isSupported.value ? '已就绪' : '未就绪';
});
// 正典 P008 导航栏状态徽章：广播中 on / 失败 err / 已就绪 warn / 其余 dim；「不支持」无点
const statusBadge = computed(() => {
	const text = broadcastStateText.value;
	const tone = text === '广播中' ? 'on' : text === '失败' ? 'err' : text === '已就绪' ? 'warn' : 'dim';
	return { text, tone, dot: text !== '不支持' };
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

const exportLogs = () => {
	const lines = logs.value.map((l) => `[${l.timestamp || l.time || '--:--:--'}][${l.type}] ${l.message || l.msg || ''}`);
	uni.setClipboardData({
		data: lines.join('\n') || '（空日志）',
		success: () => uni.showToast({ title: '日志已复制', icon: 'success' })
	});
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
	// WIN-UAND-002 修复：原 `#ifdef APP-ANDROID/APP-IOS` 条件块编译期被丢（token
	// 未定义），此函数曾被编译成空函数——改运行时 platform 分支（platform 由
	// onLoad 依 systemInfo 设置）。
	if (platform.value === 'android') {
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
		return;
	}
	if (platform.value === 'ios') {
		startAdvertising();
		return;
	}
	if (platform.value === 'weixin') {
		wxPeripheralAdapter.open()
			.then(() => wxPeripheralServer.ensureCreated())
			.then(() => startAdvertising())
			.catch((error) => {
				const content = error?.code === 'active_connections'
					? error.message
					: error?.errCode === 10001 ? '请先开启系统蓝牙。' : '当前无法启动蓝牙广播。';
				uni.showModal({ title: '无法开始广播', content, showCancel: false });
			});
	}
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
	// WIN-UAND-002：`#ifdef APP-ANDROID/#ifdef APP-IOS` 在本仓工具链（HBuilderX CLI
	// 标准基座与 npm build:app）中不被定义，条件块整体编译丢弃——Android 参数块/
	// 默认载荷/权限前置链路曾为死代码。App 端细分平台改用运行时 systemInfo 判定；
	// APP-PLUS / MP-WEIXIN / H5 单层 token 已验证有效，保留条件编译。
	// #ifdef APP-PLUS
	blePeripheral.value = uni.requireNativePlugin('LysBlePeripheral');
	const sysPlatform = uni.getDeviceInfo?.().platform || '';
	if (sysPlatform === 'android') {
		platform.value = 'android';
		deviceName.value = 'SmartBLE-A';
	} else if (sysPlatform === 'ios') {
		platform.value = 'ios';
		deviceName.value = 'SmartBLE-I';
	}
	serviceUUID.value = DEFAULT_ADVERTISING_PAYLOAD.serviceUuid;
	manufacturerId.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerId;
	manufacturerData.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerData;
	// #endif
	// #ifdef MP-WEIXIN
	platform.value = 'weixin';
	deviceName.value = DEFAULT_ADVERTISING_PAYLOAD.deviceName;
	serviceUUID.value = DEFAULT_ADVERTISING_PAYLOAD.serviceUuid;
	manufacturerId.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerId;
	manufacturerData.value = DEFAULT_ADVERTISING_PAYLOAD.manufacturerData;
	// #endif
	// #ifdef H5
	platform.value = 'web';
	// #endif
	// #ifndef MP-WEIXIN
	checkSupport();
	// #endif
});

onShow(() => {
	// #ifdef MP-WEIXIN
	checkSupport();
	// #endif
});

onMounted(() => {
	// 恢复全局日志历史到会话面板。历史条目 type 是 logger 词汇（info/success/...），
	// 页面面板用 UI 词汇（系统/成功/...）——先归一化再按 type|message 去重，
	// 防止 onLoad/onShow 的 checkSupport 已写入的同一条日志双显
	const LOGGER_TYPE_TO_UI = { info: '系统', success: '成功', error: '错误', warning: '系统', receive: '接收', send: '操作' };
	const history = logger.getHistory('broadcast') || [];
	const present = new Set(logs.value.map((l) => `${l.type}|${l.message}`));
	for (const entry of [...history].reverse()) {
		const type = LOGGER_TYPE_TO_UI[entry.type] || entry.type || '系统';
		const message = entry.message || entry;
		if (present.has(`${type}|${message}`)) continue;
		sessionAddLog(type, message);
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
.page-content {
	height: calc(100vh - 2rpx);
}

.page-container {
	min-height: 100%;
	padding: 32rpx;
	box-sizing: border-box;
	background: transparent;
}

.nav-status-group {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.settings-section {
	background: var(--ble-gradient-surface);
	border: 1rpx solid var(--ble-line);
	border-radius: var(--ble-radius-lg);
	box-shadow: var(--ble-shadow-soft);
	padding: 32rpx;
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

.field-label-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}

.field-group {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.field-label,
.switch-label {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--ble-text);
}

.field-hint { color: var(--ble-text-muted); font-size: 20rpx; }

.field-input,
.field-picker {
	height: 76rpx;
	padding: 0 22rpx;
	border-radius: var(--ble-radius-sm);
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: rgba(241, 246, 252, 0.92);
	border: 1rpx solid var(--ble-line-soft);
	font-size: 26rpx;
	color: var(--ble-text);
}

.picker-arrow {
	flex-shrink: 0;
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
	border-radius: var(--ble-radius-sm);
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.uuid-hint {
	background: rgba(255, 159, 67, 0.12);
}

.uuid-hint-text {
	font-size: 22rpx;
	line-height: 1.55;
	color: var(--c-warning-deep); /* #a6630a → #C77E14 圈外值收敛 UI-CONV 2026-09-10 */
}

.bytes-hint {
	background: rgba(27, 109, 255, 0.08);
}

.bytes-hint-text {
	font-size: 24rpx;
	color: var(--ble-brand);
}

.bytes-hint-warn {
	font-size: 24rpx;
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
</style>
