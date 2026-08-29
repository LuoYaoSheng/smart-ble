<template>
	<view class="ble-shell">
		<view class="page-content">
			<empty-state
				v-if="knownDevices.length === 0"
				image="/static/placeholders/empty_connected.png"
				title="还没有配置过的设备"
				description="完成一次 Smart HID 配网后，设备会记录在这里，方便查看历史配置或重新进入配置流程。"
			/>

			<template v-else>
				<view class="list-meta ble-card">
					<view class="ble-section-meta">
						<text class="ble-section-title">已配置设备</text>
						<text class="ble-section-caption">本地历史记录，非实时在线状态。READY 设备已关闭蓝牙广播，重新配置前需让设备进入配网模式。</text>
					</view>
					<view class="ble-chip ble-chip-muted">{{ knownDevices.length }} 台</view>
				</view>

				<view
					v-for="device in knownDevices"
					:key="device.deviceId"
					class="history-item ble-card"
					@click="openDetail(device)"
				>
					<view class="device-mark">HID</view>
					<view class="device-copy">
						<text class="device-name">{{ device.name || 'Smart HID' }}</text>
						<text class="device-id ble-mono">{{ device.deviceId }}</text>
						<view class="device-tags">
							<text v-if="device.lastWifi" class="device-tag">Wi-Fi {{ device.lastWifi }}</text>
							<text v-if="device.lastHub" class="device-tag">Hub {{ device.lastHub }}</text>
							<text class="device-tag">{{ formatDate(device.configuredAt) }}</text>
						</view>
					</view>
					<text class="remove-btn" @click.stop="confirmRemove(device)">移除</text>
				</view>
			</template>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';
import { useHidStore } from '../../store/hid';
import EmptyState from '../../components/common/empty-state.vue';

const hidStore = useHidStore();
const knownDevices = computed(() => hidStore.knownDevices);

const formatDate = (timestamp) => {
	if (!timestamp) return '';
	const date = new Date(timestamp);
	const pad = (value) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const openDetail = (device) => {
	uni.navigateTo({ url: `/pages/hid/detail?deviceId=${encodeURIComponent(device.deviceId)}` });
};

const confirmRemove = (device) => {
	uni.showModal({
		title: '移除设备记录',
		content: `移除 ${device.name || device.deviceId} 的本地配置历史？设备本身不受影响。`,
		confirmText: '移除',
		success: (result) => {
			if (result.confirm) hidStore.removeKnownDevice(device.deviceId);
		}
	});
};
</script>

<style scoped>
.page-content {
	padding: 28rpx;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.list-meta {
	flex-direction: row;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	padding: 24rpx;
}

.history-item {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 24rpx;
}

.device-mark {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 82rpx;
	height: 82rpx;
	flex-shrink: 0;
	border-radius: 24rpx;
	color: #fff;
	background: var(--ble-gradient-brand);
	font-size: 23rpx;
	font-weight: 800;
}

.device-copy {
	min-width: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.device-name {
	color: var(--ble-text);
	font-size: 28rpx;
	font-weight: 700;
}

.device-id {
	color: var(--ble-text-muted);
	font-size: 21rpx;
	word-break: break-all;
}

.device-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 4rpx;
}

.device-tag {
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
	background: rgba(96, 117, 141, 0.1);
	color: var(--ble-text-subtle);
	font-size: 20rpx;
}

.remove-btn {
	flex-shrink: 0;
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(242, 85, 95, 0.08);
	color: var(--ble-red);
	font-size: 22rpx;
	font-weight: 700;
}
</style>
