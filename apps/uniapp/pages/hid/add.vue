<template>
	<view class="container">
		<view class="page-content">
			<!-- 进度指示 -->
			<view class="step-bar">
				<view v-for="(s, i) in steps" :key="s.key" :class="['step-pill', i === currentStep ? 'active' : '', i < currentStep ? 'done' : '']">
					<text>{{ i < currentStep ? '✓' : s.short }}</text>
				</view>
			</view>
			<view class="step-title">{{ steps[currentStep].title }}</view>

			<!-- W01 准备 -->
			<view v-if="currentStep === 0" class="step-body">
				<text class="step-desc">请准备：</text>
				<view class="check-item"><text class="dot">·</text><text>Smart HID 设备已上电（新设备自动进入配网模式）</text></view>
				<view class="check-item"><text class="dot">·</text><text>ControlHub 已运行，控制台已显示动态配对二维码</text></view>
				<view class="check-item"><text class="dot">·</text><text>手机蓝牙已开启，并与设备在同一网络环境附近</text></view>
				<button class="primary-btn" @click="next">开始</button>
			</view>

			<!-- W02 搜索 Smart HID -->
			<view v-if="currentStep === 1" class="step-body">
				<text class="step-desc">扫描附近 Smart HID 设备（按配网服务 UUID / SHID- 名前缀过滤）</text>
				<view v-if="scanning" class="scanning-hint">搜索中…</view>
				<button class="primary-btn" @click="onScan" :disabled="scanning">
					<text class="btn-icon">🔍</text><text>{{ scanning ? '搜索中' : '搜索 Smart HID' }}</text>
				</button>
				<view class="found-list">
					<view v-for="d in foundDevices" :key="d.deviceId" :class="['found-item', selectedDeviceId === d.deviceId ? 'selected' : '']" @click="selectDevice(d)">
						<text class="found-name">{{ d.name || 'SHID 设备' }}</text>
						<text class="found-id">{{ d.deviceId }}</text>
					</view>
				</view>
				<button v-if="selectedDeviceId" class="primary-btn" :disabled="connecting" @click="onConnectGetInfo">
					{{ connecting ? '连接中…' : '连接并读取设备信息' }}
				</button>
				<view v-if="deviceInfoSummary" class="info-card">
					<text class="info-label">已识别设备</text>
					<text class="info-value mono">{{ deviceInfoSummary }}</text>
				</view>
			</view>

			<!-- W03 ControlHub 配对码 -->
			<view v-if="currentStep === 2" class="step-body">
				<text class="step-desc">扫描 ControlHub 控制台显示的动态配对二维码（5 分钟内有效，一次性）</text>
				<button class="primary-btn" @click="onScanControlHubQR">
					<text class="btn-icon">📷</text><text>扫 ControlHub 二维码</text>
				</button>
				<view v-if="hubInfo" class="info-card">
					<text class="info-label">配对目标</text>
					<text class="info-value mono">{{ hubInfo.host }}:{{ hubInfo.port }}</text>
				</view>
				<button v-if="hubInfo" class="primary-btn" @click="next">下一步</button>
			</view>

			<!-- W04 Wi-Fi（手输，V1 无设备侧扫描） -->
			<view v-if="currentStep === 3" class="step-body">
				<text class="step-desc">输入设备所在 Wi-Fi（V1 协议无设备侧扫描，SSID 手动输入）</text>
				<input class="pwd-input" type="text" v-model="wifiSsid" placeholder="Wi-Fi 名称（SSID）" />
				<input class="pwd-input" type="text" password v-model="wifiPassword" placeholder="Wi-Fi 密码" />
				<button class="primary-btn" :disabled="!wifiSsid" @click="next">下一步</button>
			</view>

			<!-- W05 下发与进度 -->
			<view v-if="currentStep === 4" class="step-body">
				<text class="step-desc">确认后下发配置：设备将连 Wi-Fi → 与 ControlHub 配对（换取 MQTT 凭据）→ 连接 MQTT</text>
				<view class="summary-card">
					<text class="info-label">Wi-Fi</text><text class="info-value">{{ wifiSsid }}</text>
					<text class="info-label">ControlHub</text><text class="info-value mono">{{ hubInfo?.host }}:{{ hubInfo?.port }}</text>
				</view>
				<button v-if="!provisioning" class="primary-btn" @click="onProvision">开始配置</button>
				<view v-if="provisioning || provisionDone" class="progress-item" v-for="p in progressRows" :key="p.key">
					<text :class="['progress-dot', p.state]">{{ p.state === 'done' ? '✓' : p.state === 'active' ? '…' : p.state === 'fail' ? '!' : '·' }}</text>
					<text class="progress-label">{{ p.label }}</text>
				</view>
				<view v-if="errorMessage" class="error-box">
					<text class="error-text">{{ errorMessage }}</text>
					<view class="error-actions" v-if="errorAction">
						<button class="secondary-btn" @click="errorAction.fn">{{ errorAction.label }}</button>
					</view>
				</view>
			</view>

			<!-- W06 完成 -->
			<view v-if="currentStep === 5" class="step-body">
				<view class="done-icon">✓</view>
				<text class="done-title">配置完成</text>
				<text class="done-sub">设备已就绪（LED 常亮）。HID 控制请通过 ControlHub 下发。</text>
				<button class="primary-btn" @click="goDetail">查看设备</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { useHidStore } from '../../store/hid';
import { smartHidService } from '../../services/smart-hid/index.js';

const hidStore = useHidStore();

const steps = [
	{ key: 'W01', short: 'W01', title: 'W01 准备' },
	{ key: 'W02', short: 'W02', title: 'W02 搜索 Smart HID' },
	{ key: 'W03', short: 'W03', title: 'W03 ControlHub 配对码' },
	{ key: 'W04', short: 'W04', title: 'W04 Wi-Fi' },
	{ key: 'W05', short: 'W05', title: 'W05 配置' },
	{ key: 'W06', short: 'W06', title: 'W06 完成' }
];
const currentStep = ref(0);

const scanning = ref(false);
const connecting = ref(false);
const foundDevices = computed(() => hidStore.smartDevices);
const selectedDeviceId = ref('');
const deviceInfoSummary = ref('');

const wifiSsid = ref('');
const wifiPassword = ref('');

const provisioning = ref(false);
const provisionDone = ref(false);
const errorMessage = ref('');
const errorAction = ref(null);

const hubInfo = computed(() => hidStore.hubInfo);
const currentDevice = computed(() => hidStore.currentDevice);

const PROGRESS_LABELS = {
	wifi: 'Wi-Fi 连接',
	hub: 'ControlHub 配对',
	conn: 'MQTT 连接',
	usb: '设备控制链路就绪'
};
const progressRows = computed(() =>
	Object.entries(hidStore.progress).map(([key, state]) => ({ key, state, label: PROGRESS_LABELS[key] || key }))
);

const next = () => { currentStep.value++; };
const goto = (i) => { currentStep.value = i; };

const onScan = async () => {
		scanning.value = true;
		try {
			await smartHidService.scanSmartHid();
			if (!foundDevices.value.length) {
				uni.showToast({ title: '未发现 Smart HID 设备', icon: 'none' });
			}
		} catch (e) {
			uni.showToast({ title: e.message || '扫描失败', icon: 'none' });
		} finally {
			scanning.value = false;
		}
	};

const selectDevice = (d) => {
	selectedDeviceId.value = d.deviceId;
	hidStore.setCurrentDevice(d);
};

const onConnectGetInfo = async () => {
	connecting.value = true;
	try {
		const { info } = await smartHidService.connect(selectedDeviceId.value);
		deviceInfoSummary.value = info ? `${info.device_id} · fw ${info.firmware} · ${info.state}` : selectedDeviceId.value;
		next();
	} catch (e) {
		uni.showToast({ title: e.message || '连接失败', icon: 'none', duration: 3000 });
	} finally {
		connecting.value = false;
	}
};

const onScanControlHubQR = () => {
	uni.scanCode({
		onlyFromCamera: false,
		scanType: ['qrCode'],
		success: (res) => {
			const payload = smartHidService.parsePairingQrPayload(res.result);
			if (!payload) {
				uni.showModal({ title: '不是 Smart HID 配对码', content: '请扫描 ControlHub 控制台的动态配对二维码（shid://pair?…）', showCancel: false });
				return;
			}
			hidStore.setHubInfo(payload);
		},
		fail: () => { /* 用户取消扫码 */ }
	});
};

/** 错误码 → 恢复动作（V1 恢复原则：Wi-Fi 失败退 Wi-Fi；token 失效只重扫码；MQTT 失败进诊断） */
const recoveryFor = (code) => {
	switch (code) {
		case 'wifi_failed':
		case 'invalid_payload':
			return { label: '返回修改 Wi-Fi', fn: () => { resetProvision(); goto(3); } };
		case 'pairing_invalid':
		case 'pairing_expired':
		case 'pairing_used':
		case 'controlhub_unreachable':
			return { label: '重新扫码', fn: () => { resetProvision(); goto(2); } };
		case 'mqtt_invalid':
			return { label: '进入诊断', fn: () => {
				uni.navigateTo({ url: `/pages/hid/diagnostics?deviceId=${encodeURIComponent(currentDevice.value?.deviceId || '')}` });
			} };
		default:
			return { label: '重试', fn: () => { resetProvision(); } };
	}
};

const resetProvision = () => {
	provisioning.value = false;
	errorMessage.value = '';
	errorAction.value = null;
	hidStore.resetProgress();
};

const onProvision = async () => {
	if (!hubInfo.value || !wifiSsid.value) return;
	resetProvision();
	provisioning.value = true;
	try {
		let resultWaiter = null;
		await smartHidService.provisionCandidate({
			wifi_ssid: wifiSsid.value,
			wifi_password: wifiPassword.value,
			hub_host: hubInfo.value.host,
			hub_port: hubInfo.value.port,
			token: hubInfo.value.token
		}, {
			beforeWrite: () => {
				resultWaiter = smartHidService.waitForProvisionResult(60000);
				return resultWaiter;
			}
		});
		const { ok, status } = await resultWaiter;
		provisioning.value = false;
		if (ok) {
			provisionDone.value = true;
			next();
		} else {
			errorMessage.value = describeStatus(status);
			errorAction.value = recoveryFor(status && status.error);
		}
	} catch (e) {
		provisioning.value = false;
		const code = (hidStore.lastError && hidStore.lastError.code) || (e && e.kind) || '';
		errorMessage.value = e.message || '配网失败';
		errorAction.value = recoveryFor(code);
	}
};

const describeStatus = (status) => {
	if (!status) return '配网失败';
	if (status.error) {
		const hints = {
			invalid_payload: '配置内容非法，请检查输入',
			wifi_failed: 'Wi-Fi 连接失败（检查 SSID / 密码）',
			controlhub_unreachable: '连不上 ControlHub（确认它在运行、手机与设备可达）',
			pairing_invalid: '配对码无效，请重新扫码',
			pairing_expired: '配对码已过期，请重新扫码',
			pairing_used: '配对码已被使用，请重新扫码',
			mqtt_invalid: 'MQTT 连接失败，请进入诊断',
			storage_failed: '设备存储失败，请重试'
		};
		return `[${status.error}] ${hints[status.error] || status.error}`;
	}
	if (status.state === 'recovery') return '设备进入恢复模式（旧配置连不上），请重新配网';
	return `配网未完成（state=${status.state}）`;
};

const goDetail = () => {
	const d = currentDevice.value || {};
	// 配置完成写入 knownDevices（仅本地历史，非实时在线；不含密码/token）
	hidStore.commitKnownDevice({ ...d, lastWifi: wifiSsid.value, lastHub: hubInfo.value ? hubInfo.value.host : '' });
	uni.redirectTo({ url: `/pages/hid/detail?deviceId=${encodeURIComponent(d?.deviceId || '')}` });
};

onLoad(() => {
	hidStore.startProvisionSession();
});
onUnload(() => {
	hidStore.endProvisionSession();
	smartHidService.disconnect();
});
</script>

<style>
.container {
	min-height: 100vh;
	background: transparent;
}

.page-content {
	padding: 28rpx;
	display: flex;
	flex-direction: column;
	gap: 22rpx;
}

.step-bar {
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	gap: 10rpx;
	padding: 12rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.76);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
}

.step-pill {
	height: 60rpx;
	border-radius: 999rpx;
	background: rgba(96, 117, 141, 0.08);
	color: var(--ble-text-muted);
	font-size: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 700;
}

.step-pill.active {
	background: var(--ble-gradient-brand);
	color: #ffffff;
	box-shadow: 0 10rpx 24rpx rgba(27, 109, 255, 0.18);
}

.step-pill.done {
	background: rgba(23, 199, 168, 0.18);
	color: #0e9c82;
}

.step-title {
	font-size: 40rpx;
	line-height: 1.18;
	font-weight: 700;
	color: var(--ble-text);
}

.step-body {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	padding: 30rpx;
	border-radius: 34rpx;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(242, 248, 255, 0.95) 100%);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
	box-shadow: 0 18rpx 40rpx rgba(17, 43, 78, 0.06);
}

.step-desc {
	font-size: 26rpx;
	line-height: 1.7;
	color: var(--ble-text-subtle);
}

.check-item {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	font-size: 25rpx;
	line-height: 1.6;
	color: var(--ble-text-subtle);
}

.check-item .dot {
	color: var(--ble-brand);
	font-weight: 700;
}

.scanning-hint {
	font-size: 24rpx;
	color: var(--ble-text-muted);
}

.primary-btn,
.secondary-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	height: 88rpx;
	border: none;
	border-radius: 999rpx;
	font-size: 28rpx;
	font-weight: 700;
}

.primary-btn {
	color: #ffffff;
	background: var(--ble-gradient-brand);
	box-shadow: 0 18rpx 42rpx rgba(27, 109, 255, 0.18);
}

.secondary-btn {
	color: var(--ble-brand);
	background: rgba(27, 109, 255, 0.08);
}

.primary-btn::after,
.secondary-btn::after {
	border: none;
}

.primary-btn[disabled] {
	opacity: 0.56;
	box-shadow: none;
}

.btn-icon {
	font-size: 30rpx;
	line-height: 1;
}

.found-list {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.found-item,
.info-card,
.summary-card {
	padding: 24rpx;
	border-radius: 26rpx;
	background: rgba(255, 255, 255, 0.82);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.found-item.selected {
	border-color: rgba(27, 109, 255, 0.28);
	background: linear-gradient(135deg, rgba(229, 241, 255, 0.94) 0%, rgba(239, 248, 255, 0.98) 100%);
	box-shadow: 0 14rpx 30rpx rgba(27, 109, 255, 0.1);
}

.found-name {
	font-size: 27rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.found-id {
	font-size: 22rpx;
	color: var(--ble-text-muted);
	font-family: "SF Mono", "Roboto Mono", Menlo, monospace;
}

.info-label {
	font-size: 21rpx;
	color: var(--ble-text-muted);
}

.info-value {
	font-size: 27rpx;
	color: var(--ble-text);
}

.info-value.mono {
	font-family: "SF Mono", "Roboto Mono", Menlo, monospace;
}

.pwd-input {
	height: 82rpx;
	padding: 0 22rpx;
	border-radius: 22rpx;
	background: rgba(241, 246, 252, 0.92);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
	font-size: 26rpx;
	color: var(--ble-text);
}

.progress-item {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 10rpx 0;
}

.progress-dot {
	width: 42rpx;
	height: 42rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22rpx;
	font-weight: 700;
}

.progress-dot.pending {
	background: rgba(96, 117, 141, 0.08);
	color: var(--ble-text-muted);
}

.progress-dot.active {
	background: rgba(27, 109, 255, 0.12);
	color: var(--ble-brand);
}

.progress-dot.done {
	background: rgba(23, 199, 168, 0.18);
	color: #0e9c82;
}

.progress-dot.fail {
	background: rgba(242, 85, 95, 0.16);
	color: var(--ble-red);
}

.progress-dot.warn {
	background: rgba(255, 159, 67, 0.18);
	color: #d37a12;
}

.progress-label {
	font-size: 26rpx;
	color: var(--ble-text-subtle);
}

.error-box {
	padding: 22rpx;
	border-radius: 24rpx;
	background: rgba(242, 85, 95, 0.08);
	border: 1rpx solid rgba(242, 85, 95, 0.12);
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.error-text {
	font-size: 24rpx;
	line-height: 1.6;
	color: var(--ble-red);
}

.error-actions {
	display: flex;
}

.done-icon {
	width: 128rpx;
	height: 128rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	align-self: center;
	margin: 20rpx 0 8rpx;
	font-size: 62rpx;
	color: #ffffff;
	background: linear-gradient(135deg, #17c7a8 0%, #6be5c6 100%);
	box-shadow: 0 16rpx 34rpx rgba(23, 199, 168, 0.22);
}

.done-title {
	font-size: 36rpx;
	font-weight: 700;
	text-align: center;
	color: var(--ble-text);
}

.done-sub {
	font-size: 24rpx;
	line-height: 1.7;
	text-align: center;
	color: var(--ble-text-subtle);
}
</style>
