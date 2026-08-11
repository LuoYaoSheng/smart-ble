<template>
	<view class="container">
		<view class="page-content">
			<!-- 设备基本信息 -->
			<view class="card">
				<view class="card-row">
					<text class="card-label">Device ID</text>
					<text class="card-value mono">{{ device?.deviceId || '—' }}</text>
				</view>
				<view class="card-row">
					<text class="card-label">硬件</text>
					<text class="card-value">{{ device?.hardware || '—' }}</text>
				</view>
				<view class="card-row">
					<text class="card-label">固件</text>
					<text class="card-value">{{ device?.firmware || '—' }}</text>
				</view>
				<view class="card-row">
					<text class="card-label">协议</text>
					<text class="card-value">{{ device?.protocol || '—' }}</text>
				</view>
			</view>

			<!-- 配置状态 -->
			<view class="card">
				<view class="card-title">配置状态</view>
				<view class="card-row">
					<text class="card-label">Wi-Fi</text>
					<text class="card-value">{{ device?.lastWifi || '—' }}</text>
				</view>
				<view class="card-row">
					<text class="card-label">ControlHub</text>
					<text class="card-value">{{ device?.lastHub || '—' }}</text>
				</view>
			</view>

			<!-- 操作 -->
			<view class="actions">
				<button class="action-btn primary" @click="reconfigure">重新配置</button>
				<button class="action-btn secondary" @click="goDiagnostics">诊断</button>
				<button class="action-btn tertiary" @click="goAdvancedBle">高级 BLE 调试</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useHidStore } from '../../store/hid';

const hidStore = useHidStore();
const deviceId = ref('');

const device = computed(() => {
	const all = [hidStore.currentDevice, ...hidStore.knownDevices].filter(Boolean);
	return all.find(d => d.deviceId === deviceId.value) || hidStore.currentDevice;
});

onLoad((opts) => {
	deviceId.value = opts.deviceId ? decodeURIComponent(opts.deviceId) : '';
});

const reconfigure = () => {
	uni.navigateTo({ url: '/pages/hid/add' });
};

const goDiagnostics = () => {
	uni.navigateTo({ url: `/pages/hid/diagnostics?deviceId=${encodeURIComponent(deviceId.value)}` });
};

const goAdvancedBle = () => {
	// 高级 BLE 调试：跳到通用设备详情（复用现有 pages/device/detail）
	uni.showToast({ title: '请从设备 Tab 进入通用 BLE 调试', icon: 'none' });
};
</script>

<style>
.container { height: 100vh; display: flex; flex-direction: column; background-color: #f7f8fa; }
.page-content { flex: 1; display: flex; flex-direction: column; padding: 30rpx; gap: 24rpx; }
.card { background-color: #fff; border-radius: 16rpx; padding: 24rpx 30rpx; display: flex; flex-direction: column; gap: 16rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #333; padding-bottom: 8rpx; border-bottom: 2rpx solid #f5f5f5; }
.card-row { display: flex; justify-content: space-between; align-items: center; }
.card-label { font-size: 26rpx; color: #999; }
.card-value { font-size: 28rpx; color: #333; }
.card-value.mono { font-family: monospace; }
.actions { display: flex; flex-direction: column; gap: 16rpx; margin-top: 20rpx; }
.action-btn { height: 84rpx; border-radius: 42rpx; font-size: 28rpx; font-weight: 500; border: none; }
.action-btn::after { border: none; }
.action-btn.primary { color: #fff; background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%); box-shadow: 0 8rpx 16rpx rgba(0, 122, 255, 0.2); }
.action-btn.secondary { color: #007AFF; background-color: #E5F1FF; }
.action-btn.tertiary { color: #666; background-color: #f0f0f0; }
</style>
