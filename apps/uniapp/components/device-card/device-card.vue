<template>
	<view class="device-item" @click="onClick">
		<view class="device-main">
			<view class="device-info">
				<view class="name-container">
					<text class="device-name">{{device.name || '未知设备'}}</text>
					<text class="device-type" v-if="device.name && !isConnectionTab">{{getDeviceType(device.name)}}</text>
					<text class="device-type" v-if="isConnectionTab">已连接</text>
				</view>
				<text class="device-id">{{formatDeviceId(device.deviceId)}}</text>
			</view>
			<view class="device-actions">
				<button v-if="isConnectionTab" class="disconnect-btn" size="mini" type="warn" @click.stop="onActionClick">断开</button>
				<button v-else class="connect-btn" size="mini" type="primary" :disabled="device.connected" @click.stop="onActionClick">
					{{device.connected ? '已连接' : '连接'}}
				</button>
			</view>
		</view>
		<view v-if="!isConnectionTab" class="device-details">
			<view class="signal-strength">
				<view class="signal-label">信号强度:</view>
				<view class="signal-bars">
					<view v-for="i in 4" :key="i" class="signal-bar"
						:class="{'active': i <= getSignalLevel(device.RSSI)}"></view>
				</view>
				<text class="signal-value">{{device.RSSI}} dBm</text>
			</view>
		</view>
	</view>
</template>

<script setup>
const props = defineProps({
	device: { type: Object, required: true },
	isConnectionTab: { type: Boolean, default: false }
});

const emit = defineEmits(['click', 'action']);

const onClick = () => emit('click', props.device);
const onActionClick = () => emit('action', props.device);

const formatDeviceId = (id) => id ? (id.length > 17 ? id.substring(0, 17) + '...' : id) : '未知ID';
const getDeviceType = (name) => {
	if (!name) return '未知';
	const lowerName = name.toLowerCase();
	if (lowerName.includes('mi') || lowerName.includes('xiaomi')) return '小米设备';
	if (lowerName.includes('huawei') || lowerName.includes('honor')) return '华为设备';
	if (lowerName.includes('apple') || lowerName.includes('mac') || lowerName.includes('iphone')) return '苹果设备';
	if (lowerName.includes('watch') || lowerName.includes('band')) return '智能穿戴';
	if (lowerName.includes('tv')) return '智能电视';
	return 'BLE设备';
};

const getSignalLevel = (rssi) => {
	if (rssi >= -60) return 4;
	if (rssi >= -70) return 3;
	if (rssi >= -80) return 2;
	return 1;
};
</script>

<style scoped>
.device-item { background-color: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.device-item:active { background-color: #fafafa; }
.device-main { display: flex; justify-content: space-between; align-items: center; }
.device-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.name-container { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.device-name { font-size: 32rpx; font-weight: 600; color: #333; }
.device-type { font-size: 20rpx; color: #007AFF; background-color: rgba(0, 122, 255, 0.1); padding: 4rpx 12rpx; border-radius: 8rpx; }
.device-id { font-size: 24rpx; color: #999; font-family: monospace; }
.device-actions { margin-left: 20rpx; }
.connect-btn { background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%); border-radius: 30rpx; font-size: 24rpx; padding: 0 30rpx; height: 56rpx; line-height: 56rpx; border: none; }
.connect-btn::after { border: none; }
.connect-btn[disabled] { background: #E5E5EA; color: #999; }
.disconnect-btn { background: #FF3B30; color: #fff; border-radius: 30rpx; font-size: 24rpx; padding: 0 30rpx; height: 56rpx; line-height: 56rpx; border: none; }
.device-details { margin-top: 20rpx; padding-top: 16rpx; border-top: 2rpx dashed #eee; }
.signal-strength { display: flex; align-items: center; gap: 12rpx; }
.signal-label { font-size: 24rpx; color: #666; }
.signal-bars { display: flex; align-items: flex-end; gap: 4rpx; height: 24rpx; }
.signal-bar { width: 6rpx; background-color: #E5E5EA; border-radius: 4rpx; }
.signal-bar:nth-child(1) { height: 8rpx; }
.signal-bar:nth-child(2) { height: 14rpx; }
.signal-bar:nth-child(3) { height: 20rpx; }
.signal-bar:nth-child(4) { height: 26rpx; }
.signal-bar.active { background-color: #34C759; }
.signal-bar:nth-child(1).active { background-color: #FF3B30; }
.signal-bar:nth-child(2).active { background-color: #FF9500; }
.signal-bar:nth-child(3).active { background-color: #34C759; }
.signal-bar:nth-child(4).active { background-color: #30D158; }
.signal-value { font-size: 24rpx; color: #999; margin-left: 8rpx; }
</style>
