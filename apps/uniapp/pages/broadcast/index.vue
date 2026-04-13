<template>
	<scroll-view class="page-container" scroll-y>
		<!-- 状态卡片（与 Flutter BroadcastPage 对齐） -->
		<view class="status-card" :class="{ 'status-card-active': advertising }">
			<view class="status-icon-wrap" :class="{ 'icon-active': advertising }">
				<text class="status-icon">{{ advertising ? 'LIVE' : 'OFF' }}</text>
			</view>
			<text class="status-title" :class="{ 'title-active': advertising }">{{ advertising ? '正在广播' : '未广播' }}</text>
			<text class="status-subtitle" :class="{ 'subtitle-active': advertising }">{{ advertising ? '其他设备可以扫描到此设备' : '点击开始启动BLE广播' }}</text>
		</view>

		<!-- 平台说明卡片 -->
		<view class="platform-card">
			<view class="platform-left">
				<text class="platform-icon-text">{{ platform === 'android' ? 'A' : platform === 'ios' ? 'i' : 'W' }}</text>
			</view>
			<view class="platform-info">
				<text class="platform-title">{{ platform === 'android' ? 'Android 平台说明' : platform === 'ios' ? 'iOS 平台说明' : '微信小程序平台说明' }}</text>
				<text class="platform-msg">{{ platform === 'android' ? '广播将显示设备的实际蓝牙名称' : '支持自定义广播名称' }}</text>
			</view>
		</view>

		<!-- 广播设置 -->
		<view class="settings-section">
			<text class="section-title">广播设置</text>

			<view class="field-group">
				<text class="field-label">设备名称</text>
				<input class="field-input" :value="deviceName" :disabled="advertising"
					placeholder="自定义名称或系统蓝牙名称"
					@input="e => deviceName = e.detail.value" />
			</view>

			<view class="field-group">
				<text class="field-label">服务UUID</text>
				<input class="field-input" v-model="serviceUUID" :disabled="advertising"
					placeholder="输入服务UUID (128位)" />
			</view>

			<!-- UUID格式校验提示 -->
			<view class="uuid-hint" v-if="serviceUUID && !isUUIDValid">
				<text class="uuid-hint-text">⚠️ UUID 格式无效，应为 128-bit (如：12345678-1234-1234-1234-123456789012) 或 短 UUID (如：FFE0)</text>
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
					<switch color="#007AFF" :checked="androidSettings.connectable" @change="onConnectableChange" />
				</view>
				<view class="switch-row">
					<text class="switch-label">包含设备名称</text>
					<switch color="#007AFF" :checked="androidSettings.includeDeviceName" @change="onIncludeDeviceNameChange" />
				</view>
				<view class="switch-row">
					<text class="switch-label">添加服务UUID</text>
					<switch color="#007AFF" :checked="androidSettings.addServiceUuid" @change="onAddServiceUuidChange" />
				</view>
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
				<text class="bytes-hint-warn" v-if="calcAdvertiseBytes() > 31">⚠ 超出限制！</text>
			</view>
		</view>

		<!-- 广播操作按钮 -->
		<view class="action-section">
			<button
				class="btn-advertise"
				:class="advertising ? 'btn-stop' : ''"
				@click="toggleAdvertising">
				<text>{{ advertising ? '停止广播' : '开始广播' }}</text>
			</button>
			<button class="btn-check" @click="checkSupport">检查支持</button>
		</view>

		<!-- 广播状态栏 -->
		<view
			class="broadcast-status-bar"
			:class="advertising ? 'status-bar-active' : ''">
			<view
				class="status-indicator-dot"
				:class="advertising ? 'dot-active' : ''"></view>
			<text class="status-bar-text">{{ advertising ? '广播中' : '已停止' }}</text>
			<text class="status-bar-tip" v-if="isSupported">{{ advertising ? '其他设备可扫描到此设备' : '点击开始广播' }}</text>
			<text class="status-bar-tip status-bar-tip-warn" v-else>当前平台不支持广播</text>
		</view>

		<view class="log-panel-brd">
			<view class="log-panel-brd-header">
				<text class="log-panel-brd-title">操作日志</text>
				<text class="log-clear-brd" @click="clearLogs">清空</text>
			</view>
			<scroll-view class="log-panel-brd-content" scroll-y>
				<view v-if="logs.length === 0" class="log-brd-empty"><text>暂无日志</text></view>
				<view v-for="(entry, idx) in logs" :key="idx" class="log-brd-entry">
					<text class="log-brd-time">[{{entry.timestamp}}]</text>
					<text class="log-brd-type" :class="'log-brd-type-' + entry.type">[{{entry.type}}]</text>
					<text class="log-brd-msg">{{entry.message}}</text>
				</view>
			</scroll-view>
		</view>
	</scroll-view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onLoad, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { logger } from '../../../core/ble-core/utils/logger';

const advertising = ref(false);
const logs = ref([]);
let unsubLogger = null;
const blePeripheral = ref(null);
const platform = ref('');
const isSupported = ref(false);
const wxBLEServer = ref(null);

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

const isUUIDValid = computed(() => {
	if (!serviceUUID.value) return true;
	const uuid = serviceUUID.value.trim();
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const shortUuidRegex = /^[0-9a-f]{4}([0-9a-f]{4})?$/i;
	return uuidRegex.test(uuid) || shortUuidRegex.test(uuid);
});

const addLog = (type, message) => {
	switch(type) {
		case '错误': logger.error(message, 'broadcast'); break;
		case '成功': logger.success(message, 'broadcast'); break;
		case '接收': logger.receive(message, 'broadcast'); break;
		case '操作': logger.send(message, 'broadcast'); break;
		default: logger.info(message, 'broadcast'); break;
	}
};

const clearLogs = () => {
	logger.clear('broadcast');
	logs.value = [];
};

const checkSupport = () => {
	// #ifdef APP-PLUS
	if (!blePeripheral.value) {
		addLog('错误', '插件未初始化');
		isSupported.value = false;
		return;
	}
	blePeripheral.value.isSupported((result) => {
		isSupported.value = result.code === 0 && result.supported;
		addLog(isSupported.value ? '系统' : '错误', isSupported.value ? '设备支持低功耗蓝牙广播' : '设备不支持低功耗蓝牙广播');
	});
	// #endif

	// #ifdef MP-WEIXIN
	checkWxBleSupport();
	// #endif
};

// #ifdef MP-WEIXIN
const checkWxBleSupport = () => {
	wx.openBluetoothAdapter({
		mode: 'peripheral',
		success: () => {
			addLog('系统', '初始化蓝牙从机模式成功');
			isSupported.value = true;
			createBLEPeripheralServer();
		},
		fail: (err) => {
			addLog('错误', '蓝牙从机模式初始化失败: ' + JSON.stringify(err));
			isSupported.value = false;
		}
	});
};

const createBLEPeripheralServer = (onSuccess) => {
	wx.createBLEPeripheralServer({
		success: (res) => {
			wxBLEServer.value = res.server;
			addLog('系统', '创建BLE外围设备服务器成功');
			if (onSuccess) onSuccess();
		},
		fail: (err) => {
			addLog('错误', '创建BLE外围设备服务器失败');
		}
	});
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

const calcAdvertiseBytes = () => {
	let total = 0;
	if (serviceUUID.value) {
		const isShort = serviceUUID.value.replace(/-/g, '').length <= 8;
		total += 2 + (isShort ? 2 : 16);
	}
	if (manufacturerData.value) {
		let dataBytes = 0;
		try { dataBytes = new TextEncoder().encode(manufacturerData.value).length; } 
		catch (e) { dataBytes = manufacturerData.value.length; }
		total += 2 + 2 + dataBytes;
	}
	return total;
};

// #ifdef MP-WEIXIN
const getPowerLevel = () => {
	const levels = ['low', 'medium', 'high', 'high'];
	return levels[powerIndex.value] || 'high';
};
const strToArrayBuffer = (str) => {
	const buf = new ArrayBuffer(str.length);
	const bufView = new Uint8Array(buf);
	for (let i = 0; i < str.length; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
};
const retryWithSimpleAdvertising = () => {
	if (!wxBLEServer.value) return;
	const simpleRequest = {
		deviceName: deviceName.value.substring(0, 5),
		serviceUuids: [serviceUUID.value.split('-')[0]]
	};
	wxBLEServer.value.startAdvertising({
		advertiseRequest: simpleRequest,
		powerLevel: 'low',
		success: () => {
			advertising.value = true;
			addLog('成功', '简化广播启动成功');
		},
		fail: (err) => {
			addLog('错误', '简化广播也失败：' + JSON.stringify(err));
		}
	});
};
const startWxAdvertising = () => {
	if (!wxBLEServer.value) return;
	if (!deviceName.value || !serviceUUID.value) return;
	let shortenedDeviceName = deviceName.value;
	if (shortenedDeviceName.length > 8) {
		shortenedDeviceName = shortenedDeviceName.substring(0, 8);
	}
	let manufacturerDataObj = null;
	if (manufacturerData.value && manufacturerId.value) {
		let shortenedData = manufacturerData.value;
		if (shortenedData.length > 4) shortenedData = shortenedData.substring(0, 4);
		manufacturerDataObj = [{
			manufacturerId: parseInt(manufacturerId.value, 16),
			manufacturerSpecificData: strToArrayBuffer(shortenedData)
		}];
	}
	const advertiseRequest = {
		deviceName: shortenedDeviceName,
		serviceUuids: [serviceUUID.value]
	};
	if (manufacturerDataObj) advertiseRequest.manufacturerData = manufacturerDataObj;

	wxBLEServer.value.startAdvertising({
		advertiseRequest,
		powerLevel: getPowerLevel(),
		success: () => {
			advertising.value = true;
			addLog('成功', '微信小程序广播启动成功');
		},
		fail: (err) => {
			if (err.errCode === 10008) {
				retryWithSimpleAdvertising();
			} else {
				addLog('错误', '微信小程序广播启动失败');
			}
		}
	});
};
const stopWxAdvertising = () => {
	if (!wxBLEServer.value) return;
	wxBLEServer.value.stopAdvertising({
		success: () => {
			advertising.value = false;
			addLog('系统', '小程序广播已停止');
		}
	});
};
// #endif

// #ifdef APP-PLUS
const startIosBroadcast = () => {
	const options = {
		localName: deviceName.value,
		services: [serviceUUID.value],
		manufacturerData: {
			id: parseInt(manufacturerId.value, 16),
			data: manufacturerData.value
		}
	};
	blePeripheral.value.startAdvertising(options, (result) => {
		if (result.code === 0) {
			advertising.value = true;
			addLog('成功', 'iOS广播启动成功');
		} else {
			addLog('错误', 'iOS广播启动失败');
		}
	});
};
// #endif

const startAdvertising = () => {
	// #ifdef APP-PLUS
	if (!blePeripheral.value || !deviceName.value || !serviceUUID.value) return;
	const totalBytes = calcAdvertiseBytes();
	if (totalBytes > 31) {
		uni.showToast({ title: '广播数据超限', icon: 'none' });
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
				manufacturerId: parseInt(manufacturerId.value, 16) || 0,
				manufacturerData: manufacturerData.value
			}
		};
		if (androidSettings.value.addServiceUuid && serviceUUID.value) {
			options.advertiseData.serviceUuid = serviceUUID.value;
		}
		blePeripheral.value.startAdvertising(options, (result) => {
			if (result.code === 0) {
				advertising.value = true;
				addLog('成功', 'Android广播启动成功');
			} else {
				addLog('错误', 'Android广播启动失败');
			}
		});
	} else if (platform.value === 'ios') {
		startIosBroadcast();
	}
	// #endif
	
	// #ifdef MP-WEIXIN
	startWxAdvertising();
	// #endif
};

const stopAdvertising = () => {
	// #ifdef APP-PLUS
	if (blePeripheral.value) {
		blePeripheral.value.stopAdvertising((result) => {
			if (result.code === 0) {
				advertising.value = false;
				addLog('系统', '广播已停止');
			}
		});
	}
	// #endif
	// #ifdef MP-WEIXIN
	stopWxAdvertising();
	// #endif
};

const checkBluetoothAndPermissionsBeforeAdvertise = () => {
	// #ifdef APP-PLUS
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
						} catch (e) {}
					}
				}
			});
			return;
		}
		requestAndroidPermissions(() => startAdvertising(), () => {});
	} catch (e) {}
	// #endif
	// #ifdef MP-WEIXIN
	wx.openBluetoothAdapter({
		mode: 'peripheral',
		success: () => {
			if (wxBLEServer.value) startWxAdvertising();
			else createBLEPeripheralServer(() => startWxAdvertising());
		},
		fail: (err) => {
			if (err.errCode === 10001) uni.showModal({ title: '提示', content: '请开启蓝牙', showCancel: false });
		}
	});
	// #endif
};

const toggleAdvertising = () => {
	if (advertising.value) {
		stopAdvertising();
	} else {
		if (serviceUUID.value && !isUUIDValid.value) {
			uni.showToast({ title: 'UUID格式无效', icon: 'none' });
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
	const systemInfo = uni.getSystemInfoSync();
	platform.value = systemInfo.platform;
	blePeripheral.value = uni.requireNativePlugin('LysBlePeripheral');
	
	if (platform.value === 'android') {
		deviceName.value = 'BLEToolkit_Android';
		serviceUUID.value = '0000FFE0-0000-1000-8000-00805F9B34FB';
		manufacturerId.value = '0001';
		manufacturerData.value = 'BLEToolkit_Test';
	} else if (platform.value === 'ios') {
		deviceName.value = 'BLEToolkit_iOS';
		serviceUUID.value = 'FFE0';
		manufacturerId.value = '0A00';
		manufacturerData.value = 'BLEToolkit_Test';
	}
	// #endif

	// #ifdef MP-WEIXIN
	platform.value = 'weixin';
	deviceName.value = 'BLEToolkit_WeChat';
	serviceUUID.value = '0000FFE0-0000-1000-8000-00805F9B34FB';
	manufacturerId.value = '0001';
	manufacturerData.value = 'BLEToolkit_Test';
	// #endif

	checkSupport();
});

onMounted(() => {
	logs.value = [...logger.getHistory('broadcast')];
	unsubLogger = logger.subscribe(entry => {
		logs.value.unshift(entry);
	}, 'broadcast');
});

onUnmounted(() => {
	if (unsubLogger) unsubLogger();
	stopAdvertising();
});

onUnload(() => {
	// #ifdef MP-WEIXIN
	if (wxBLEServer.value) {
		wxBLEServer.value.stopAdvertising({});
	}
	wx.closeBluetoothAdapter({});
	// #endif
});

// #ifdef MP-WEIXIN
onShareAppMessage(() => ({
	title: '分享一个好用的BLE工具: BLE Toolkit+ - 广播',
	path: '/pages/index/index'
}));
// #endif
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px;
	}

	.title {
		font-size: 20px;
		font-weight: bold;
		margin-bottom: 30px;
		display: flex;
		align-items: center;
	}

	.platform {
		font-size: 14px;
		color: #666;
		margin-left: 10px;
	}

	.form {
		width: 100%;
		margin-bottom: 30px;
	}

	.form-item {
		display: flex;
		align-items: center;
		margin-bottom: 15px;
	}
	
	.switch-item {
		margin-top: 5px;
	}

	.label {
		width: 80px;
		font-size: 14px;
		color: #666;
	}

	input {
		flex: 1;
		height: 40px;
		padding: 0 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
	}

	.picker-container {
		flex: 1;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: linear-gradient(to bottom, #ffffff, #f9f9f9);
		box-shadow: 0 1px 2px rgba(0,0,0,0.05);
	}
	
	.picker-text {
		font-size: 14px;
		color: #333;
	}

	.picker-icon {
		font-size: 12px;
		color: #999;
		margin-left: 5px;
	}
	
	/* 兼容旧的picker样式 */
	.picker {
		flex: 1;
		height: 40px;
		line-height: 40px;
		padding: 0 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
	}

	.button-group {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
		width: 100%;
	}

	.button-group button {
		width: 100%;
	}

	.button-group button[disabled] {
		opacity: 0.5;
	}

	.status {
		margin-bottom: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
	}

	.log {
		width: 100%;
		padding: 10px;
		background-color: #f5f5f5;
		border-radius: 5px;
	}

	.log-title {
		font-size: 14px;
		color: #666;
		margin-bottom: 10px;
		display: block;
	}

	.log-content {
		max-height: 200px;
	}

	.log-content text {
		display: block;
		margin-bottom: 5px;
		font-size: 12px;
		color: #333;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.button-advertising {
		background: linear-gradient(to right, #ff3b30, #ff9500) !important;
		box-shadow: 0 2px 6px rgba(255, 59, 48, 0.4);
	}

/* UUID 格式校验提示 */
.uuid-hint {
	margin: -8rpx 0 16rpx 0;
	padding: 12rpx 16rpx;
	background: #FFF3CD;
	border-radius: 8rpx;
	border-left: 4rpx solid #FF9500;
}
.uuid-hint-text {
	font-size: 22rpx;
	color: #664D03;
	line-height: 1.5;
}

/* T04: 广播页日志面板 */
.log-panel-brd {
	margin: 0 30rpx 30rpx;
	background: #fff;
	border-radius: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
	overflow: hidden;
}
.log-panel-brd-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 30rpx 16rpx;
	border-bottom: 2rpx solid #f5f5f5;
}
.log-panel-brd-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #333;
}
.log-clear-brd {
	font-size: 26rpx;
	color: #999;
	padding: 6rpx 20rpx;
	border: 2rpx solid #eee;
	border-radius: 100rpx;
}
.log-clear-brd:active {
	color: #FF3B30;
	border-color: #FF3B30;
}
.log-panel-brd-content {
	height: 300rpx;
	padding: 16rpx 0;
}
.log-brd-empty {
	display: flex;
	justify-content: center;
	padding: 40rpx 0;
	color: #ccc;
	font-size: 26rpx;
}
.log-brd-entry {
	display: flex;
	flex-wrap: nowrap;
	align-items: flex-start;
	padding: 10rpx 30rpx;
	gap: 12rpx;
	border-bottom: 1rpx solid #f9f9f9;
}
.log-brd-time {
	font-size: 22rpx;
	color: #bbb;
	flex-shrink: 0;
}
.log-brd-type {
	font-size: 22rpx;
	font-weight: 600;
	flex-shrink: 0;
}
.log-brd-type-系统 { color: #007AFF; }
.log-brd-type-错误 { color: #FF3B30; }
.log-brd-type-成功 { color: #34C759; }
.log-brd-msg {
	font-size: 24rpx;
	color: #333;
	flex: 1;
	word-break: break-all;
}

/* 字节数提示 */
.bytes-hint {
	margin: 0 0 16rpx;
	padding: 12rpx 16rpx;
	background: #E5F1FF;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	gap: 12rpx;
}
.bytes-hint-text { font-size: 24rpx; color: #007AFF; }
.bytes-hint-warn { font-size: 24rpx; color: #FF3B30; font-weight: 600; }

/* 广播操作按钮区 */
.action-section {
	margin: 20rpx 30rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}
.btn-advertise {
	height: 96rpx;
	border-radius: 48rpx;
	background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
	color: #fff;
	font-size: 32rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	border: none;
	box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.25);
}
.btn-advertise::after { border: none; }
.btn-advertise.btn-stop {
	background: linear-gradient(135deg, #FF3B30 0%, #FF9500 100%);
	box-shadow: 0 8rpx 24rpx rgba(255, 59, 48, 0.25);
}
.btn-check {
	height: 80rpx;
	border-radius: 40rpx;
	background: #f5f5f5;
	color: #666;
	font-size: 28rpx;
	border: none;
}
.btn-check::after { border: none; }

/* 广播状态栏 */
.broadcast-status-bar {
	margin: 0 30rpx 20rpx;
	padding: 24rpx 30rpx;
	background: #fff;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}
.broadcast-status-bar.status-bar-active {
	background: linear-gradient(135deg, #f0fff4 0%, #e8f5ff 100%);
	border: 2rpx solid #34C759;
}
.status-indicator-dot {
	width: 20rpx;
	height: 20rpx;
	border-radius: 50%;
	background: #ccc;
	flex-shrink: 0;
}
.status-indicator-dot.dot-active {
	background: #34C759;
	box-shadow: 0 0 12rpx rgba(52, 199, 89, 0.5);
	animation: pulseDot 1.5s ease-in-out infinite;
}
@keyframes pulseDot {
	0%, 100% { transform: scale(1); opacity: 1; }
	50% { transform: scale(1.3); opacity: 0.7; }
}
.status-bar-text {
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
}
.status-bar-tip {
	font-size: 24rpx;
	color: #999;
	margin-left: auto;
}
.status-bar-tip-warn { color: #FF9500; }

</style>