<template>
	<view class="discovery-panel ble-card">
		<view class="panel-head">
			<view class="ble-section-meta"><text class="ble-section-title">搜索并连接设备</text><text class="ble-section-caption">先让 Smart HID 进入配网或恢复模式，再搜索附近设备。</text></view>
			<button class="scan-button ble-button-primary" :disabled="scanning" @click="$emit('scan')">{{ scanning ? '搜索中…' : '搜索设备' }}</button>
		</view>
		<view class="flow-hint"><text>1</text><text>设备进入配网/恢复模式</text><text>→</text><text>2</text><text>搜索并选择</text><text>→</text><text>3</text><text>连接后配置</text></view>
		<error-banner v-if="error" title="搜索失败" :message="error.message || '请检查蓝牙与定位权限后重试。'" action-label="重试" @action="$emit('scan')" />
		<view v-if="devices.length" class="device-list">
			<view v-for="device in devices" :key="device.deviceId" class="device-row">
				<view class="device-copy"><view class="device-name-row"><text class="device-name">{{ device.name || 'Smart HID' }}</text><text class="match-tag" :class="{ weak: device.profileMatch < 2 }">{{ device.profileMatch >= 2 ? '服务已匹配' : '待连接确认' }}</text></view><text class="device-id ble-mono">{{ device.deviceId }}</text><text class="device-rssi">{{ device.RSSI }} dBm</text></view>
				<button class="connect-button ble-button-secondary" @click="$emit('select', device)">继续连接</button>
			</view>
		</view>
		<empty-state v-else-if="!scanning" title="还没有搜索结果" description="点击“搜索设备”，附近处于配网或恢复模式的 Smart HID 会显示在这里。" />
	</view>
</template>

<script setup>
import EmptyState from '../common/empty-state.vue';
import ErrorBanner from '../common/error-banner.vue';
defineProps({ devices: { type: Array, default: () => [] }, scanning: { type: Boolean, default: false }, error: { type: Object, default: null } });
defineEmits(['scan', 'select']);
</script>

<style scoped>
.discovery-panel { padding: 26rpx; display: flex; flex-direction: column; gap: 20rpx; }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.scan-button { flex-shrink: 0; min-width: 190rpx; }
.flow-hint { display: flex; align-items: center; flex-wrap: wrap; gap: 8rpx; padding: 16rpx 18rpx; border-radius: 18rpx; background: rgba(27,109,255,.06); color: var(--ble-text-subtle); font-size: 21rpx; }
.flow-hint text:nth-child(1),.flow-hint text:nth-child(4),.flow-hint text:nth-child(7) { width: 34rpx; height: 34rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--ble-brand); color: #fff; font-weight: 700; }
.device-list { display: flex; flex-direction: column; gap: 12rpx; }
.device-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; border-radius: 22rpx; background: rgba(255,255,255,.84); border: 1rpx solid rgba(20,76,136,.08); }
.device-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.device-name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10rpx; }
.device-name { font-size: 27rpx; font-weight: 700; color: var(--ble-text); }
.match-tag { padding: 5rpx 10rpx; border-radius: 999rpx; background: rgba(23,199,168,.12); color: #0e9c82; font-size: 18rpx; }
.match-tag.weak { background: rgba(255,159,67,.12); color: #b66a10; }
.device-id,.device-rssi { font-size: 20rpx; color: var(--ble-text-muted); }
.connect-button { flex-shrink: 0; min-width: 156rpx; }
</style>
