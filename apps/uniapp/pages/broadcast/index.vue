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
					<text class="log-brd-type" :class="'log-brd-type-' + typeClass(entry.type)">[{{entry.type}}]</text>
					<text class="log-brd-msg">{{entry.message}}</text>
				</view>
			</scroll-view>
		</view>
	</scroll-view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onHide, onLoad, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { logger } from '../../../../core/ble-core/utils/logger';

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

/* 日志 type 是中文（系统/错误/成功），WXSS 类选择器不允许非 ASCII——映射为 ASCII 后缀 */
const LOG_TYPE_CLASS = { '系统': 'sys', '错误': 'err', '成功': 'ok' };
const typeClass = (t) => LOG_TYPE_CLASS[t] || 'sys';

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
	blePeripheral.value = uni.requireNativePlugin('LysBlePeripheral');
	// #ifdef APP-ANDROID
	platform.value = 'android';
		deviceName.value = 'BLEToolkit_Android';
		serviceUUID.value = '0000FFE0-0000-1000-8000-00805F9B34FB';
		manufacturerId.value = '0001';
		manufacturerData.value = 'BLEToolkit_Test';
	// #endif
	// #ifdef APP-IOS
	platform.value = 'ios';
		deviceName.value = 'BLEToolkit_iOS';
		serviceUUID.value = 'FFE0';
		manufacturerId.value = '0A00';
		manufacturerData.value = 'BLEToolkit_Test';
	// #endif
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

onHide(() => {
	if (advertising.value) stopAdvertising();
});

onUnload(() => {
	// #ifdef MP-WEIXIN
		if (wxBLEServer.value) {
			wxBLEServer.value.stopAdvertising({});
			wxBLEServer.value.close?.({});
			wxBLEServer.value = null;
		}
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
.page-container {
	min-height: 100vh;
	padding: 28rpx;
	box-sizing: border-box;
	background: transparent;
}

.status-card,
.platform-card,
.settings-section,
.broadcast-status-bar,
.log-panel-brd {
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(242, 248, 255, 0.95) 100%);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
	border-radius: 32rpx;
	box-shadow: 0 18rpx 40rpx rgba(17, 43, 78, 0.06);
}

.status-card {
	padding: 34rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 14rpx;
}

.status-card.status-card-active {
	background: linear-gradient(135deg, rgba(230, 255, 247, 0.98) 0%, rgba(236, 248, 255, 0.98) 100%);
}

.status-icon-wrap {
	width: 138rpx;
	height: 138rpx;
	border-radius: 42rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(96, 117, 141, 0.08);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
}

.status-icon-wrap.icon-active {
	background: linear-gradient(135deg, rgba(21, 93, 255, 0.16) 0%, rgba(123, 224, 255, 0.22) 100%);
	border-color: rgba(21, 93, 255, 0.16);
}

.status-icon {
	font-size: 34rpx;
	font-weight: 700;
	color: var(--ble-brand);
	letter-spacing: 2rpx;
}

.status-title {
	font-size: 38rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.status-subtitle {
	font-size: 24rpx;
	line-height: 1.6;
	color: var(--ble-text-subtle);
}

.platform-card,
.broadcast-status-bar {
	margin-top: 20rpx;
	padding: 24rpx;
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.platform-left {
	width: 88rpx;
	height: 88rpx;
	border-radius: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, rgba(21, 93, 255, 0.14) 0%, rgba(123, 224, 255, 0.2) 100%);
}

.platform-icon-text {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--ble-brand);
}

.platform-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.platform-title {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.platform-msg {
	font-size: 23rpx;
	line-height: 1.5;
	color: var(--ble-text-subtle);
}

.settings-section {
	margin-top: 20rpx;
	padding: 28rpx;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.field-group {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.field-label,
.switch-label {
	font-size: 25rpx;
	font-weight: 600;
	color: var(--ble-text);
}

.field-input,
.field-picker {
	height: 82rpx;
	padding: 0 22rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: rgba(241, 246, 252, 0.92);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
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
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.06);
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
	margin-top: 20rpx;
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.btn-advertise,
.btn-check {
	height: 88rpx;
	border: none;
	border-radius: 999rpx;
	font-size: 28rpx;
	font-weight: 700;
}

.btn-advertise {
	color: #ffffff;
	background: var(--ble-gradient-brand);
	box-shadow: 0 18rpx 42rpx rgba(27, 109, 255, 0.18);
}

.btn-advertise.btn-stop {
	background: linear-gradient(135deg, #f2555f 0%, #ff9f43 100%);
	box-shadow: 0 18rpx 42rpx rgba(242, 85, 95, 0.18);
}

.btn-check {
	color: var(--ble-brand);
	background: rgba(27, 109, 255, 0.08);
}

.btn-advertise::after,
.btn-check::after {
	border: none;
}

.broadcast-status-bar.status-bar-active {
	background: linear-gradient(135deg, rgba(230, 255, 247, 0.98) 0%, rgba(236, 248, 255, 0.98) 100%);
}

.status-indicator-dot {
	width: 20rpx;
	height: 20rpx;
	border-radius: 50%;
	background: #9aa8b6;
	flex-shrink: 0;
}

.status-indicator-dot.dot-active {
	background: var(--ble-mint);
	box-shadow: 0 0 16rpx rgba(23, 199, 168, 0.48);
}

.status-bar-text {
	font-size: 27rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.status-bar-tip {
	margin-left: auto;
	font-size: 22rpx;
	color: var(--ble-text-subtle);
}

.status-bar-tip-warn {
	color: #d37a12;
}

.log-panel-brd {
	margin-top: 20rpx;
	overflow: hidden;
}

.log-panel-brd-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.08);
}

.log-panel-brd-title {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.log-clear-brd {
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(242, 85, 95, 0.1);
	color: var(--ble-red);
	font-size: 22rpx;
	font-weight: 700;
}

.log-panel-brd-content {
	height: 320rpx;
	padding: 12rpx 0 18rpx;
}

.log-brd-empty {
	display: flex;
	justify-content: center;
	padding: 44rpx 0;
	font-size: 24rpx;
	color: var(--ble-text-muted);
}

.log-brd-entry {
	display: flex;
	align-items: flex-start;
	gap: 10rpx;
	padding: 12rpx 24rpx;
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.06);
}

.log-brd-time {
	font-size: 21rpx;
	color: var(--ble-text-muted);
	flex-shrink: 0;
}

.log-brd-type {
	font-size: 21rpx;
	font-weight: 700;
	flex-shrink: 0;
}

.log-brd-type-sys { color: var(--ble-brand); }
.log-brd-type-err { color: var(--ble-red); }
.log-brd-type-ok { color: #0e9c82; }

.log-brd-msg {
	font-size: 22rpx;
	line-height: 1.55;
	color: var(--ble-text-subtle);
	flex: 1;
	word-break: break-all;
}
</style>
