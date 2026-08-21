<template>
	<view class="device-item" @click="onClick">
		<view class="device-main">
			<view class="device-avatar">
				<text class="avatar-text">{{ isConnectionTab ? 'ON' : 'BLE' }}</text>
			</view>
			<view class="device-info">
				<view class="name-container">
					<text class="device-name">{{ device.name || '未知设备' }}</text>
					<text class="device-type">{{ isConnectionTab ? '连接中' : getDeviceType(device.name) }}</text>
				</view>
				<text class="device-id ble-mono">{{ formatDeviceId(device.deviceId) }}</text>
				<text class="device-meta">{{ isConnectionTab ? '点击查看服务、特征值和通信日志' : '点击卡片查看广播原始数据' }}</text>
			</view>
		</view>

		<view class="device-footer">
			<view v-if="!isConnectionTab" class="signal-box">
				<view class="signal-bars">
					<view
						v-for="i in 4"
						:key="i"
						class="signal-bar"
						:class="{ active: i <= getSignalLevel(device.RSSI) }"
					></view>
				</view>
				<text class="signal-value">{{ device.RSSI }} dBm</text>
			</view>
			<view v-else class="ble-chip ble-chip-success">
				<text>连接稳定</text>
			</view>

			<button
				v-if="isConnectionTab"
				class="action-btn action-btn-danger"
				size="mini"
				@click.stop="onActionClick"
			>
				断开
			</button>
			<button
				v-else
				class="action-btn action-btn-primary"
				size="mini"
				:disabled="device.connected"
				@click.stop="onActionClick"
			>
				{{ device.connected ? '已连接' : '进入调试' }}
			</button>
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

const formatDeviceId = (id) => (id ? (id.length > 17 ? `${id.substring(0, 17)}...` : id) : '未知 ID');

const getDeviceType = (name) => {
	if (!name) return '待识别';
	const lowerName = name.toLowerCase();
	if (lowerName.includes('mi') || lowerName.includes('xiaomi')) return '小米生态';
	if (lowerName.includes('huawei') || lowerName.includes('honor')) return '华为生态';
	if (lowerName.includes('apple') || lowerName.includes('mac') || lowerName.includes('iphone')) return 'Apple 设备';
	if (lowerName.includes('watch') || lowerName.includes('band')) return '智能穿戴';
	if (lowerName.includes('tv')) return '家庭终端';
	return 'BLE 设备';
};

const getSignalLevel = (rssi) => {
	if (rssi >= -60) return 4;
	if (rssi >= -70) return 3;
	if (rssi >= -80) return 2;
	return 1;
};
</script>

<style scoped>
.device-item {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	padding: 26rpx;
	margin-bottom: 18rpx;
	border-radius: 30rpx;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(242, 248, 255, 0.96) 100%);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
	box-shadow: 0 14rpx 32rpx rgba(17, 43, 78, 0.06);
}

.device-main {
	display: flex;
	gap: 20rpx;
	align-items: flex-start;
}

.device-avatar {
	width: 84rpx;
	height: 84rpx;
	border-radius: 26rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, rgba(21, 93, 255, 0.16) 0%, rgba(123, 224, 255, 0.22) 100%);
	border: 1rpx solid rgba(21, 93, 255, 0.12);
}

.avatar-text {
	font-size: 22rpx;
	font-weight: 700;
	color: var(--ble-brand);
	letter-spacing: 1rpx;
}

.device-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.name-container {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
}

.device-name {
	font-size: 30rpx;
	line-height: 1.3;
	font-weight: 700;
	color: var(--ble-text);
}

.device-type {
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(27, 109, 255, 0.08);
	color: var(--ble-brand);
	font-size: 20rpx;
	font-weight: 700;
}

.device-id {
	font-size: 22rpx;
	color: var(--ble-text-muted);
}

.device-meta {
	font-size: 22rpx;
	line-height: 1.5;
	color: var(--ble-text-subtle);
}

.device-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	padding-top: 18rpx;
	border-top: 1rpx solid rgba(20, 76, 136, 0.06);
}

.signal-box {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.signal-bars {
	display: flex;
	align-items: flex-end;
	gap: 5rpx;
	height: 26rpx;
}

.signal-bar {
	width: 8rpx;
	border-radius: 6rpx;
	background: rgba(146, 161, 179, 0.34);
}

.signal-bar:nth-child(1) { height: 10rpx; }
.signal-bar:nth-child(2) { height: 16rpx; }
.signal-bar:nth-child(3) { height: 22rpx; }
.signal-bar:nth-child(4) { height: 28rpx; }

.signal-bar.active:nth-child(1) { background: #ff9f43; }
.signal-bar.active:nth-child(2) { background: #3db0ff; }
.signal-bar.active:nth-child(3) { background: #17c7a8; }
.signal-bar.active:nth-child(4) { background: #0ea77d; }

.signal-value {
	font-size: 22rpx;
	font-weight: 700;
	color: var(--ble-text-subtle);
}

.action-btn {
	height: 60rpx;
	line-height: 60rpx;
	padding: 0 26rpx;
	border: none;
	border-radius: 999rpx;
	font-size: 24rpx;
	font-weight: 700;
}

.action-btn::after {
	border: none;
}

.action-btn-primary {
	color: #ffffff;
	background: var(--ble-gradient-brand);
	box-shadow: 0 12rpx 28rpx rgba(27, 109, 255, 0.16);
}

.action-btn-primary[disabled] {
	background: rgba(96, 117, 141, 0.16);
	color: var(--ble-text-muted);
	box-shadow: none;
}

.action-btn-danger {
	color: #ffffff;
	background: linear-gradient(135deg, #f2555f 0%, #ff9f43 100%);
	box-shadow: 0 12rpx 28rpx rgba(242, 85, 95, 0.16);
}
</style>
