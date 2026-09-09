<template>
	<view class="subpage">
		<AppSubnav title="Smart HID 设备详情" />

		<view class="page-content">
			<view class="card ble-card">
				<view class="device-title-row">
					<view class="device-head">
						<AppIcon name="hid" :size="40" tone="successDeep" />
						<text class="device-title">{{ device?.name || 'Smart HID 设备' }}</text>
					</view>
					<AppBadge text="配置成功 · READY" tone="on" />
				</view>
			</view>

			<view class="card ble-card">
				<view class="card-title-row">
					<text class="card-title">设备身份</text>
				</view>
				<AppListRow label="Device ID" :value="device?.deviceId || ''" mono />
				<view class="proto-row">
					<text class="card-label">协议版本</text>
					<AppChip v-if="device?.protocol" :text="device.protocol" tone="neutral" />
					<AppChip v-else text="协议未记录" tone="neutral" />
				</view>
				<AppListRow label="固件版本" :value="device?.firmware || ''" mono />
			</view>

			<view class="card ble-card">
				<view class="card-title-row">
					<text class="card-title">最近配置</text>
				</view>
				<AppListRow label="Wi-Fi" :value="device?.lastWifi || ''" />
				<AppListRow label="ControlHub" :value="device?.lastHub || ''" mono />
			</view>

			<view class="note note-info">
				<AppIcon name="doc" :size="28" tone="primary" />
				<text class="note-text">本页为本次配网会话的内存快照，退出后不再可见（零本地持久化）。重新配置前需让设备进入配网模式。</text>
			</view>

			<view class="actions">
				<AppButton label="重新配置" tone="primary" icon="refresh" block @tap="reconfigure" />
				<view class="secondary-actions">
					<AppButton label="运行诊断" tone="soft" icon="pulse" block @tap="goDiagnostics" />
					<AppButton label="高级 BLE 调试" tone="soft" icon="set" block @tap="goAdvancedBle" />
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
// UI-G2：P003 改挂正典组件层（AppSubnav/AppBadge/AppChip/AppListRow/AppButton）
import AppSubnav from '../../components/ui/AppSubnav.vue';
import AppBadge from '../../components/ui/AppBadge.vue';
import AppChip from '../../components/ui/AppChip.vue';
import AppListRow from '../../components/ui/AppListRow.vue';
import AppButton from '../../components/ui/AppButton.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
import { useHidStore } from '../../store/hid';
import {
	buildGenericDeviceDetailUrl,
	buildHidDiagnosticsUrl,
	buildHidProvisionUrl
} from '../../services/hid-navigation.js';

const hidStore = useHidStore();
const deviceId = ref('');

const device = computed(() => {
	const allDevices = [hidStore.currentDevice, ...hidStore.knownDevices].filter(Boolean);
	return allDevices.find((item) => item.deviceId === deviceId.value) || null;
});

onLoad((opts) => {
	deviceId.value = opts.deviceId ? decodeURIComponent(opts.deviceId) : '';
	if (!deviceId.value || !device.value) {
		uni.showModal({ title: '设备记录不存在', content: '该历史设备记录已不存在，请返回设备列表。', showCancel: false, success: () => uni.navigateBack() });
	}
});

const reconfigure = () => {
	if (!device.value) return;
	hidStore.setCurrentDevice(device.value);
	uni.navigateTo({ url: buildHidProvisionUrl(device.value.deviceId) });
};

const goDiagnostics = () => {
	if (!device.value) return;
	uni.navigateTo({ url: buildHidDiagnosticsUrl(device.value.deviceId) });
};

const goAdvancedBle = () => {
	if (!device.value) return;
	uni.navigateTo({ url: buildGenericDeviceDetailUrl(device.value) });
};
</script>

<style scoped>
.page-content {
	padding: 20rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.card {
	padding: 22rpx;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.device-title-row,
.card-title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14rpx;
	padding-bottom: 12rpx;
	border-bottom: 1rpx solid var(--ble-line-soft);
}

.device-head { display: flex; align-items: center; gap: 14rpx; min-width: 0; }

.device-title { min-width: 0; color: var(--ble-text); font-size: 32rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-title {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.proto-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	padding: 18rpx 0;
	border-bottom: 2rpx solid var(--c-line-soft);
}

.card-label {
	font-size: 24rpx;
	color: var(--ble-text-muted);
}

.note {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	padding: 18rpx 20rpx;
	border-radius: var(--ble-radius-md, 18rpx);
}

.note-info {
	background: var(--c-primary-weak);
	color: var(--ble-text);
}

.note-text {
	flex: 1;
	font-size: 22rpx;
	line-height: 1.6;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.secondary-actions { display: flex; gap: 12rpx; }
.secondary-actions .app-btn { flex: 1; min-width: 0; }
</style>
