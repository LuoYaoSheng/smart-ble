<template>
	<view class="device-card" :class="variant" hover-class="dev-hover" :hover-stay-time="80" @click="$emit('tap', device)">
		<view class="top">
			<view class="ava" :class="{ shid: isShid }">
				<text class="ava-letter">{{ avatarLetter }}</text>
				<view v-if="variant === 'conn'" class="on"><AppIcon name="check" :size="22" tone="card" /></view>
			</view>
			<view class="mid">
				<view class="nm">
					<text class="nm-text">{{ displayName }}</text>
					<AppChip v-if="matchChipText" :text="matchChipText" :tone="isStrong ? 'primary' : 'warning'" />
					<AppChip v-else-if="variant === 'conn' && connLabel" :text="connLabel" tone="primary" />
				</view>
				<view class="id mono">{{ idText }}</view>
				<view class="meta">
					<view v-if="hasRssi" class="sig" :class="'q' + quality">
						<view v-for="i in 4" :key="i" class="bar"></view>
					</view>
					<text v-if="hasRssi" class="dbm">{{ device.RSSI }} dBm</text>
					<text v-if="variant === 'conn'" class="conn-meta">{{ device.meta || '已连接 · 可进行 GATT 调试' }}</text>
				</view>
			</view>
		</view>
		<view class="acts">
			<AppButton v-if="isShid && variant === 'scan'" :label="configureLabel" tone="primary" size="sm" icon="hid" :disabled="device.connected" @tap.stop="$emit('configure', device)" />
			<AppButton v-if="variant === 'scan'" :label="device.connected ? '已连接' : '连接'" :tone="device.connected || isShid ? 'soft' : 'primary'" size="sm" icon="link" :disabled="device.connected" @tap.stop="$emit('connect', device)" />
			<AppButton v-if="variant === 'conn'" label="断开" tone="soft" size="sm" danger-text @tap.stop="$emit('disconnect', device)" />
		</view>
	</view>
</template>

<script setup>
// 正典设备卡（COMPONENT_CONTRACT C1 · 原型 components.js C.devCard 单一来源）
// variant: scan / conn · SHID 双入口（配置 Smart HID + 连接）· RSSI 四档信号条（≥-60 四 / ≥-70 三 / ≥-80 二 / 其余一）
// 设备形状兼容运行时（profileMatch 数值 1/2）与原型（{level:'STRONG'/'WEAK'}）两种口径；
// 标签覆盖字段沿用 profile 注册表（profileActionLabel/profileChipStrong/profileChipWeak/profileBadge/profileName）。
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import AppChip from './AppChip.vue';
import AppButton from './AppButton.vue';

const props = defineProps({
	device: { type: Object, required: true },
	variant: { type: String, default: 'scan' }
});
defineEmits(['tap', 'connect', 'configure', 'disconnect']);

const matchLevel = computed(() => {
	const pm = props.device.profileMatch;
	if (pm == null) return null;
	if (typeof pm === 'number') return pm >= 2 ? 'STRONG' : pm >= 1 ? 'WEAK' : null;
	return pm.level || null;
});
const isShid = computed(() => matchLevel.value !== null);
const isStrong = computed(() => matchLevel.value === 'STRONG');

const profileBadge = computed(() => props.device.profileBadge || props.device.profileName || 'Smart HID');
const matchChipText = computed(() => {
	if (!isShid.value || props.variant !== 'scan') return '';
	return isStrong.value
		? props.device.profileChipStrong || `${profileBadge.value} · 强匹配`
		: props.device.profileChipWeak || `疑似 ${profileBadge.value} · 弱匹配`;
});
const configureLabel = computed(() => props.device.profileActionLabel || '配置 Smart HID');

const hasRssi = computed(() => typeof props.device.RSSI === 'number');
const quality = computed(() => {
	const rssi = Number(props.device.RSSI);
	if (rssi >= -60) return 4;
	if (rssi >= -70) return 3;
	if (rssi >= -80) return 2;
	return 1;
});
// 名称口径（PAGE_SPEC P001 数据展示规则）：优先运行时多级 fallback 产物 displayName
// （name→localName→AD 0x09/0x08→Profile→厂商→「未命名 BLE · ID后四位」），再回退本地兜底
const displayName = computed(() =>
	props.device.displayName
	|| props.device.name
	|| (props.variant === 'conn' ? '未命名设备' : '未命名 BLE 设备'));
const hasNameSource = computed(() => Boolean(props.device.displayName || props.device.name));
const idText = computed(() => {
	if (props.variant === 'conn' || hasNameSource.value) return props.device.deviceId;
	return `${props.device.deviceId}（未命名）`;
});
const connLabel = computed(() => props.device.connLabel || '');
const avatarLetter = computed(() => {
	const raw = String(props.device.displayName || props.device.name || props.device.deviceId || '').trim();
	return (raw[0] || '?').toUpperCase();
});
</script>

<style scoped>
.device-card {
	background: var(--c-card);
	border: 2rpx solid var(--c-line);
	border-radius: var(--r-lg);
	padding: var(--sp-4);
	box-shadow: var(--shadow-1);
	margin-bottom: var(--sp-3);
}
.dev-hover { box-shadow: 0px 4rpx 8rpx rgba(16, 32, 64, 0.05), 0px 20rpx 44rpx rgba(16, 32, 64, 0.09); }
.top { display: flex; gap: 24rpx; align-items: flex-start; }
.ava {
	width: 88rpx;
	height: 88rpx;
	border-radius: var(--r-md);
	background: linear-gradient(135deg, var(--c-primary-weak), var(--c-avatar-grad-end));
	color: var(--c-primary);
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: var(--fw-xbold);
	font-size: 34rpx;
	flex-shrink: 0;
	position: relative;
}
.ava.shid { background: linear-gradient(135deg, var(--c-shid-avatar-start), var(--c-success-weak)); color: var(--c-success-deep); }
.ava-letter { line-height: 1; }
.on {
	position: absolute;
	right: -8rpx;
	bottom: -8rpx;
	background: var(--c-success);
	color: var(--c-card);
	border-radius: 50%;
	width: 30rpx;
	height: 30rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 4rpx solid var(--c-card);
}
.mid { flex: 1; min-width: 0; }
.nm { font-size: var(--fs-h2); font-weight: var(--fw-bold); color: var(--c-text); display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.nm-text { line-height: 1.3; }
.id { font-family: var(--font-mono); font-size: var(--fs-micro); color: var(--c-mut); margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { display: flex; align-items: center; gap: 16rpx; margin-top: 10rpx; flex-wrap: wrap; }
.sig { display: inline-flex; align-items: flex-end; gap: 4rpx; height: 24rpx; }
.sig .bar { width: 6rpx; border-radius: 2rpx; background: var(--c-line); }
.sig .bar:nth-child(1) { height: 8rpx; }
.sig .bar:nth-child(2) { height: 14rpx; }
.sig .bar:nth-child(3) { height: 20rpx; }
.sig .bar:nth-child(4) { height: 24rpx; }
.sig.q4 .bar { background: var(--c-success); }
.sig.q3 .bar:nth-child(-n+3) { background: var(--c-success); }
.sig.q2 .bar:nth-child(-n+2) { background: var(--c-warning); }
.sig.q1 .bar:nth-child(1) { background: var(--c-danger); }
.dbm { font-size: var(--fs-micro); color: var(--c-mut); font-weight: var(--fw-med); font-family: var(--font-mono); }
.conn-meta { font-size: var(--fs-mini); color: var(--c-mut); }
.acts { display: flex; gap: 16rpx; margin-top: 24rpx; }
.acts :deep(.app-btn) { flex: 1; }
</style>
