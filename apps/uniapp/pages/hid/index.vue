<template>
	<view class="container">
		<view class="custom-navbar">
			<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
			<view class="nav-content" :style="{ height: navBarHeight + 'px' }">
				<text class="nav-title">Smart HID</text>
				<view class="nav-actions">
					<view class="ble-status-indicator" v-if="bleState === 'on'">
						<view class="status-dot green"></view>
						<text class="status-text">蓝牙已开启</text>
					</view>
					<view class="ble-status-indicator" v-else>
						<view class="status-dot grey"></view>
						<text class="status-text">蓝牙已关闭</text>
					</view>
				</view>
			</view>
		</view>

		<view class="page-content">
			<!-- 未配置态：引导配置 -->
			<view v-if="!hasConfiguredDevice" class="empty-state hero">
				<image src="/static/placeholders/empty_scan.svg" class="empty-icon-img" mode="aspectFit"></image>
				<text class="empty-title">Smart HID</text>
				<text class="empty-sub">配置 Smart HID 的 Wi-Fi 和 ControlHub</text>
				<text class="empty-sub-sub">设备无二维码，通过搜索附近 Smart HID 识别</text>
				<button class="primary-btn" @click="goAdd">
					<text class="btn-icon">🔍</text>
					<text>搜索 Smart HID</text>
				</button>
			</view>

			<!-- 已配置态：历史设备列表（不假装实时在线） -->
			<view v-else class="configured-list">
				<view class="section-header">
					<text class="section-title">最近配置</text>
					<text class="section-hint">仅历史记录，非实时在线</text>
				</view>
				<view class="device-item" v-for="d in knownDevices" :key="d.deviceId" @click="goDetail(d)">
					<view class="device-info">
						<text class="device-name">{{ d.name || 'Smart HID' }}</text>
						<text class="device-id">{{ d.deviceId }}</text>
					</view>
					<text class="device-arrow">›</text>
				</view>

				<button class="secondary-btn" @click="goAdd">
					<text class="btn-icon">+</text>
					<text>配置新设备</text>
				</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useBleStore } from '../../store/ble';
import { useHidStore } from '../../store/hid';

const bleStore = useBleStore();
const hidStore = useHidStore();

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight || 20);
const navBarHeight = ref(44);

const bleState = computed(() => bleStore.bleState);
const knownDevices = computed(() => hidStore.knownDevices);
const hasConfiguredDevice = computed(() => knownDevices.value.length > 0);

// 注：HID 首页不主动启动扫描；扫描在 Add 向导 W02 显式触发。
const goAdd = () => {
	uni.navigateTo({ url: '/pages/hid/add' });
};

const goDetail = (device) => {
	hidStore.setCurrentDevice(device);
	uni.navigateTo({ url: `/pages/hid/detail?deviceId=${encodeURIComponent(device.deviceId)}` });
};
</script>

<style>
.container { height: 100vh; display: flex; flex-direction: column; background-color: #f7f8fa; }
.custom-navbar { background-color: #ffffff; box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05); z-index: 100; }
.nav-content { display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #333; }
.nav-actions { display: flex; align-items: center; }
.ble-status-indicator { display: flex; align-items: center; gap: 8rpx; }
.status-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.status-dot.green { background-color: #34C759; box-shadow: 0 0 8rpx rgba(52, 199, 89, 0.4); }
.status-dot.grey { background-color: #999999; }
.status-text { font-size: 24rpx; color: #666; }
.page-content { flex: 1; display: flex; flex-direction: column; padding: 30rpx; }

.hero { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 60rpx 40rpx; }
.empty-icon-img { width: 180rpx; height: 180rpx; opacity: 0.6; margin-bottom: 32rpx; }
.empty-title { font-size: 40rpx; color: #333; font-weight: bold; margin-bottom: 16rpx; }
.empty-sub { font-size: 28rpx; color: #666; margin-bottom: 8rpx; text-align: center; }
.empty-sub-sub { font-size: 24rpx; color: #999; margin-bottom: 48rpx; text-align: center; }
.primary-btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; width: 80%; height: 88rpx; border-radius: 44rpx; font-size: 30rpx; font-weight: 600; color: #fff; background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%); border: none; box-shadow: 0 8rpx 16rpx rgba(0, 122, 255, 0.2); }
.primary-btn::after { border: none; }

.configured-list { display: flex; flex-direction: column; gap: 20rpx; }
.section-header { display: flex; justify-content: space-between; align-items: baseline; padding: 0 8rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #333; }
.section-hint { font-size: 22rpx; color: #999; }
.device-item { display: flex; align-items: center; justify-content: space-between; background-color: #fff; padding: 28rpx 30rpx; border-radius: 16rpx; }
.device-info { display: flex; flex-direction: column; gap: 6rpx; }
.device-name { font-size: 30rpx; color: #333; font-weight: 500; }
.device-id { font-size: 24rpx; color: #999; font-family: monospace; }
.device-arrow { font-size: 40rpx; color: #ccc; }
.secondary-btn { display: flex; align-items: center; justify-content: center; gap: 10rpx; height: 80rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 500; color: #007AFF; background-color: #E5F1FF; border: none; margin-top: 10rpx; }
.secondary-btn::after { border: none; }
.btn-icon { font-size: 30rpx; }
</style>
