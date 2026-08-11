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
				<view class="check-item"><text class="dot">·</text><text>Smart HID 设备已上电并进入 Provisioning Mode</text></view>
				<view class="check-item"><text class="dot">·</text><text>ControlHub 已运行，并显示动态配对二维码</text></view>
				<view class="check-item"><text class="dot">·</text><text>手机蓝牙已开启</text></view>
				<button class="primary-btn" @click="next">开始</button>
			</view>

			<!-- W02 搜索 Smart HID（无设备二维码） -->
			<view v-if="currentStep === 1" class="step-body">
				<text class="step-desc">扫描附近 Smart HID 设备（通过 Provisioning Service UUID 过滤）</text>
				<view v-if="scanning" class="scanning-hint">搜索中…</view>
				<button class="primary-btn" @click="onScan" :disabled="scanning">
					<text class="btn-icon">🔍</text><text>{{ scanning ? '搜索中' : '搜索 Smart HID' }}</text>
				</button>
				<view class="found-list">
					<view v-for="d in foundDevices" :key="d.deviceId" :class="['found-item', selectedDeviceId === d.deviceId ? 'selected' : '']" @click="selectDevice(d)">
						<text class="found-name">{{ d.name }}</text>
						<text class="found-id">{{ d.deviceId }}</text>
					</view>
				</view>
				<button v-if="selectedDeviceId" class="primary-btn" @click="onConnectGetInfo">连接并读取设备信息</button>
			</view>

			<!-- W03 ControlHub -->
			<view v-if="currentStep === 2" class="step-body">
				<text class="step-desc">扫描 ControlHub 动态配对二维码</text>
				<view class="info-card">
					<text class="info-label">已识别设备</text>
					<text class="info-value">{{ currentDevice?.name || '—' }}</text>
					<text class="info-value">{{ currentDevice?.deviceId || '—' }}</text>
				</view>
				<button class="primary-btn" @click="onScanControlHubQR">扫 ControlHub 二维码</button>
			</view>

			<!-- W04 Wi-Fi（列表来自 ESP32 Wi-Fi Scan） -->
			<view v-if="currentStep === 3" class="step-body">
				<text class="step-desc">选择 Wi-Fi（列表来自 ESP32 扫描）</text>
				<view class="found-list">
					<view v-for="w in wifiNetworks" :key="w.ssid" :class="['found-item', selectedSsid === w.ssid ? 'selected' : '']" @click="selectedSsid = w.ssid">
						<text class="found-name">{{ w.ssid }}</text>
						<text class="found-id">{{ w.rssi }} dBm</text>
					</view>
				</view>
				<input v-if="selectedSsid" class="pwd-input" type="text" password v-model="wifiPassword" placeholder="Wi-Fi 密码" />
				<button v-if="selectedSsid" class="primary-btn" @click="onSetWifi">下一步</button>
			</view>

			<!-- W05 配置进度 -->
			<view v-if="currentStep === 4" class="step-body">
				<text class="step-desc">正在配置…</text>
				<view class="progress-item" v-for="p in progressSteps" :key="p.key">
					<text :class="['progress-dot', p.state]">{{ p.state === 'done' ? '✓' : p.state === 'active' ? '…' : '·' }}</text>
					<text class="progress-label">{{ p.label }}</text>
				</view>
			</view>

			<!-- W06 完成 -->
			<view v-if="currentStep === 5" class="step-body">
				<view class="done-icon">✓</view>
				<text class="done-title">配置完成</text>
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
	{ key: 'W03', short: 'W03', title: 'W03 ControlHub' },
	{ key: 'W04', short: 'W04', title: 'W04 Wi-Fi' },
	{ key: 'W05', short: 'W05', title: 'W05 配置' },
	{ key: 'W06', short: 'W06', title: 'W06 完成' }
];
const currentStep = ref(0);

const scanning = ref(false);
const foundDevices = ref([]);
const selectedDeviceId = ref('');
const currentDevice = computed(() => hidStore.currentDevice);

const wifiNetworks = ref([]);
const selectedSsid = ref('');
const wifiPassword = ref('');

const progressSteps = ref([
	{ key: 'wifi', label: 'Wi-Fi', state: 'pending' },
	{ key: 'hub', label: 'ControlHub', state: 'pending' },
	{ key: 'conn', label: '控制连接', state: 'pending' },
	{ key: 'usb', label: 'USB HID', state: 'pending' }
]);

const next = () => { currentStep.value++; };

const onScan = async () => {
	// 真实实现：smartHidService.scanSmartHid()，结果写入 foundDevices
	// 此处为脚手架占位，不触发真实 BLE
	scanning.value = true;
	try {
		await smartHidService.scanSmartHid();
		foundDevices.value = hidStore.smartDevices;
	} finally {
		scanning.value = false;
	}
};

const selectDevice = (d) => {
	selectedDeviceId.value = d.deviceId;
	hidStore.setCurrentDevice(d);
};

const onConnectGetInfo = async () => {
	// 真实实现：smartHidService.connect() → getDeviceInfo()，得到 Device ID
	await smartHidService.connect(selectedDeviceId.value);
	await smartHidService.getDeviceInfo();
	next();
};

const onScanControlHubQR = () => {
	// 真实实现：uni.scanCode → 解析 ControlHub 动态 QR → hidStore.setHubInfo
	// 失败仅退回本步（Pair Token 过期重新获取 QR）
	uni.showModal({ title: '提示（占位）', content: 'ControlHub QR 扫码待接入。脚手架阶段直接进入下一步。', showCancel: false, success: () => next() });
};

const onSetWifi = async () => {
	// 真实实现：smartHidService.setWifi({ ssid, password })
	await smartHidService.setWifi({ ssid: selectedSsid.value, password: wifiPassword.value });
	startProgress();
};

const startProgress = () => {
	currentStep.value = 4;
	// 真实实现：订阅 hidStore.progress 或 BLE notify 更新各项状态
	// 脚手架：不动实际状态
};

const goDetail = () => {
	const d = currentDevice.value;
	// 配置完成写入 knownDevices（仅本地历史，非实时在线）
	hidStore.commitKnownDevice(d);
	uni.redirectTo({ url: `/pages/hid/detail?deviceId=${encodeURIComponent(d?.deviceId || '')}` });
};

onLoad(() => {
	hidStore.startProvisionSession();
});
onUnload(() => {
	hidStore.endProvisionSession();
});
</script>

<style>
.container { height: 100vh; display: flex; flex-direction: column; background-color: #f7f8fa; }
.page-content { flex: 1; display: flex; flex-direction: column; padding: 30rpx; }
.step-bar { display: flex; gap: 12rpx; margin-bottom: 30rpx; }
.step-pill { flex: 1; height: 56rpx; border-radius: 28rpx; background-color: #eee; color: #999; font-size: 22rpx; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.step-pill.active { background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%); color: #fff; }
.step-pill.done { background-color: #34C759; color: #fff; }
.step-title { font-size: 36rpx; font-weight: 600; color: #333; margin-bottom: 24rpx; }
.step-body { display: flex; flex-direction: column; gap: 20rpx; }
.step-desc { font-size: 28rpx; color: #666; }
.check-item { display: flex; gap: 14rpx; font-size: 26rpx; color: #555; padding: 4rpx 0; }
.check-item .dot { color: #007AFF; font-weight: bold; }
.scanning-hint { font-size: 26rpx; color: #999; }
.primary-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; height: 88rpx; border-radius: 44rpx; font-size: 30rpx; font-weight: 600; color: #fff; background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%); border: none; box-shadow: 0 8rpx 16rpx rgba(0, 122, 255, 0.2); }
.primary-btn::after { border: none; }
.primary-btn[disabled] { opacity: 0.5; }
.btn-icon { font-size: 30rpx; }
.found-list { display: flex; flex-direction: column; gap: 12rpx; }
.found-item { background-color: #fff; padding: 24rpx 28rpx; border-radius: 14rpx; display: flex; flex-direction: column; gap: 6rpx; border: 4rpx solid transparent; }
.found-item.selected { border-color: #007AFF; background-color: #E5F1FF; }
.found-name { font-size: 28rpx; color: #333; font-weight: 500; }
.found-id { font-size: 22rpx; color: #999; font-family: monospace; }
.info-card { background-color: #fff; padding: 24rpx 28rpx; border-radius: 14rpx; display: flex; flex-direction: column; gap: 6rpx; }
.info-label { font-size: 22rpx; color: #999; }
.info-value { font-size: 28rpx; color: #333; }
.pwd-input { height: 80rpx; background-color: #fff; border-radius: 14rpx; padding: 0 24rpx; font-size: 28rpx; }
.progress-item { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 0; }
.progress-dot { width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: bold; }
.progress-dot.pending { background-color: #eee; color: #999; }
.progress-dot.active { background-color: #007AFF; color: #fff; }
.progress-dot.done { background-color: #34C759; color: #fff; }
.progress-label { font-size: 28rpx; color: #555; }
.done-icon { width: 120rpx; height: 120rpx; border-radius: 60rpx; background-color: #34C759; color: #fff; font-size: 60rpx; display: flex; align-items: center; justify-content: center; align-self: center; margin: 40rpx 0; }
.done-title { font-size: 36rpx; color: #333; font-weight: 600; text-align: center; }
</style>
