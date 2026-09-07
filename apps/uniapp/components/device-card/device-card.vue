<template>
	<view class="dev" @click="onClick">
		<view class="top">
			<view class="ava" :class="{ shid: isShid }">
				<text class="ava-t">{{ initial }}</text>
				<view v-if="isConnectionTab" class="on">
					<app-icon name="check" :size="22" color="#ffffff" />
				</view>
			</view>
			<view class="mid">
				<view class="nm">
					<text class="nm-t">{{ displayName }}</text>
					<text v-if="matchChipText" class="match-chip" :class="strongMatch ? 'primary' : 'warning'">{{ matchChipText }}</text>
					<text v-else-if="isConnectionTab && connLabel" class="conn-chip">{{ connLabel }}</text>
				</view>
				<text class="id ble-mono">{{ idText }}</text>
				<view class="meta">
					<view v-if="typeof device.RSSI === 'number'" class="sig" :class="'q' + signalQuality">
						<view v-for="i in 4" :key="i" class="bar"></view>
					</view>
					<text v-if="typeof device.RSSI === 'number'" class="dbm">{{ device.RSSI }} dBm</text>
					<text v-if="isConnectionTab" class="meta-txt">{{ connMeta }}</text>
				</view>
			</view>
		</view>

		<view v-if="isConnectionTab" class="acts">
			<button class="ble-btn ble-btn--sm soft-btn danger-t" @click.stop="onActionClick">断开</button>
		</view>
		<view v-else class="acts">
			<button
				v-if="isShid"
				class="ble-btn ble-btn--primary ble-btn--sm"
				:class="{ 'ble-btn--disabled': device.connected }"
				:disabled="device.connected"
				@click.stop="onProfileClick"
			>
				<app-icon name="hid" :size="26" color="#ffffff" />
				<text>{{ device.profileActionLabel || '配置 Smart HID' }}</text>
			</button>
			<button
				class="ble-btn ble-btn--sm"
				:class="[isShid || device.connected ? 'soft-btn' : 'ble-btn--primary', { 'ble-btn--disabled': device.connected }]"
				:disabled="device.connected"
				@click.stop="onGenericClick"
			>
				<app-icon name="link" :size="26" :color="isShid || device.connected ? '#18222E' : '#ffffff'" />
				<text>{{ device.connected ? '已连接' : '连接' }}</text>
			</button>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';
import AppIcon from '../common/app-icon.vue';
import { getProfile } from '../../services/provisioning/profiles.js';

// 正典 C1 devCard（scan 变体）：首字母头像 + 名称/匹配 chip + mono ID（CSS 省略）+
// sig 信号条与 dBm（meta 仅此两项）+ 动作行（hid/link 图标）。
// conn 变体归 P007 页管，仅对齐共享视觉（首字母头像 + sig），文案契约保持。
const props = defineProps({
	device: { type: Object, required: true },
	isConnectionTab: { type: Boolean, default: false }
});

const emit = defineEmits(['click', 'action', 'generic', 'profile']);

const onClick = () => emit('click', props.device);
const onActionClick = () => emit('action', props.device);
const onGenericClick = () => emit('generic', props.device);
const onProfileClick = () => emit('profile', props.device);

const isShid = computed(() => !props.isConnectionTab && (props.device.profileMatch ?? 0) >= 1);
const strongMatch = computed(() => (props.device.profileMatch ?? 0) >= 2);

const initial = computed(() => {
	const raw = String(props.device.name || props.device.deviceId || '').trim();
	return (raw[0] || '?').toUpperCase();
});

const displayName = computed(() => {
	if (props.isConnectionTab) return props.device.name || '未命名设备';
	return props.device.name || '未命名 BLE 设备';
});

const idText = computed(() => {
	if (props.isConnectionTab || props.device.name) return props.device.deviceId;
	return `${props.device.deviceId}（未命名）`;
});

const matchChipText = computed(() => {
	const level = props.device.profileMatch ?? 0;
	if (level >= 2) {
		return props.device.profileChipStrong || `${props.device.profileBadge || props.device.profileName} · 强匹配`;
	}
	if (level === 1) {
		return props.device.profileChipWeak || `疑似 ${props.device.profileBadge || props.device.profileName} · 弱匹配`;
	}
	return '';
});

const connLabel = computed(() => {
	if (props.device.profileId) {
		const profile = getProfile(props.device.profileId);
		return profile?.model?.connectedLabel || profile?.presentation?.badge || '';
	}
	return '通用 GATT';
});

// 正典 conn 变体 meta 默认文案（d.meta||'已连接 · 可进行 GATT 调试'）；
// P007 轮若正典给出 profile 专属 meta 再补。
const connMeta = computed(() => '已连接 · 可进行 GATT 调试');

const signalQuality = computed(() => {
	const rssi = Number(props.device.RSSI);
	if (rssi >= -60) return 4;
	if (rssi >= -70) return 3;
	if (rssi >= -80) return 2;
	return 1;
});
</script>

<style scoped>
.dev {
	display: flex;
	flex-direction: column;
	margin-bottom: 24rpx;
	padding: 28rpx;
	border-radius: 34rpx;
	background: var(--ble-surface-strong);
	border: 1rpx solid #E3EAF3;
}

.top {
	display: flex;
	align-items: flex-start;
	gap: 24rpx;
}

.ava {
	position: relative;
	width: 88rpx;
	height: 88rpx;
	border-radius: 26rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #E8F1FF, #DCE9FF);
}

.ava.shid {
	background: linear-gradient(135deg, #D9F6F0, #E2F8F4);
}

.ava-t {
	font-size: 34rpx;
	font-weight: 700;
	color: #1B6DFF;
}

.ava.shid .ava-t {
	color: #0E9A80;
}

.ava .on {
	position: absolute;
	right: -8rpx;
	bottom: -8rpx;
	width: 34rpx;
	height: 34rpx;
	border-radius: 50%;
	background: #17C7A8;
	display: flex;
	align-items: center;
	justify-content: center;
}

.mid {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.nm {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 12rpx;
}

.nm-t {
	font-size: 30rpx;
	font-weight: 700;
	color: #18222E;
}

.match-chip {
	padding: 4rpx 16rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	font-weight: 500;
}

.match-chip.primary {
	background: #E8F1FF;
	color: #1B6DFF;
}

.match-chip.warning {
	background: #FFF3E4;
	color: #C77E14;
}

.conn-chip {
	padding: 4rpx 16rpx;
	border-radius: 999rpx;
	background: #E8F1FF;
	color: #1B6DFF;
	font-size: 22rpx;
	font-weight: 500;
}

.id {
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #60758D;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 16rpx;
	margin-top: 10rpx;
}

.sig {
	display: inline-flex;
	align-items: flex-end;
	gap: 4rpx;
	height: 24rpx;
}

.sig .bar {
	width: 6rpx;
	border-radius: 2rpx;
	background: #E3EAF3;
}

.sig .bar:nth-child(1) { height: 8rpx; }
.sig .bar:nth-child(2) { height: 14rpx; }
.sig .bar:nth-child(3) { height: 20rpx; }
.sig .bar:nth-child(4) { height: 24rpx; }

.sig.q4 .bar { background: #17C7A8; }
.sig.q3 .bar:nth-child(-n+3) { background: #17C7A8; }
.sig.q2 .bar:nth-child(-n+2) { background: #FF9F43; }
.sig.q1 .bar:nth-child(1) { background: #F2555F; }

.dbm {
	font-size: 20rpx;
	color: #60758D;
}

.meta-txt {
	font-size: 20rpx;
	color: #60758D;
}

.acts {
	display: flex;
	gap: 16rpx;
	margin-top: 24rpx;
}

.acts .ble-btn {
	flex: 1;
}

.soft-btn {
	color: #18222E;
	background: #F1F5FB;
	box-shadow: inset 0 0 0 2rpx #E3EAF3;
}

.soft-btn.danger-t {
	color: #F2555F;
	background: #FDEBEC;
	box-shadow: none;
}

.soft-btn.ble-btn--disabled {
	opacity: 0.54;
	box-shadow: none;
}
</style>
