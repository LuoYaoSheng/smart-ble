<template>
	<view v-if="visible" class="adv-mask" @click.stop="$emit('close')">
		<view class="adv-sheet" @click.stop>
			<view class="grip"></view>
			<view class="sh-h">
				<text class="sh-t">广播数据 · {{ titleName }}</text>
				<button class="ble-btn ble-btn--sm soft-btn" @click="$emit('close')">关闭</button>
			</view>
			<scroll-view scroll-y class="sheet-scroll">
				<view class="kv"><text class="k">设备 ID</text><text class="v ble-mono">{{ device.deviceId }}</text></view>
				<view class="kv"><text class="k">名称</text><text class="v">{{ adv.localName || '（未命名）' }}</text></view>
				<view class="kv"><text class="k">RSSI</text><text class="v ble-mono">{{ device.RSSI }} dBm</text></view>
				<view class="kv"><text class="k">profileMatch</text><text class="v ble-mono">{{ matchText }}</text></view>

				<template v-if="hasAdvertisement">
					<view class="ad-sec">
						<view class="hd"><text>Service UUIDs</text><text>{{ adv.serviceUuids.length ? adv.serviceUuids.length + ' 项' : '—' }}</text></view>
						<view v-for="uuid in adv.serviceUuids" :key="uuid" class="hex">{{ uuid }}</view>
						<view v-if="!adv.serviceUuids.length" class="miss">本轮平台 API 未提供此字段</view>
					</view>

					<view class="ad-sec">
						<view class="hd"><text>AD 结构 · 逐段（平台解析字段重建）</text><text>advertisement {{ adv.advertisData.byteLength }} B</text></view>
						<template v-if="segments.length">
							<view v-for="seg in segments" :key="seg.type + seg.name" class="seg">
								<view class="hd"><text>{{ seg.type }} · {{ seg.name }}</text><text>{{ seg.frameLength }} B</text></view>
								<view class="hex">{{ seg.hex }}</view>
							</view>
						</template>
						<view v-else class="miss">本轮平台 API 未提供此字段</view>
						<view class="hd whole-hd"><text>整包 hex</text><text>{{ adv.advertisData.length }} B</text></view>
						<view v-if="adv.advertisData.present" class="hex">{{ adv.advertisData.hex || '—' }}</view>
						<view v-else class="miss">本轮平台 API 未提供此字段</view>
					</view>

					<view v-if="manufacturerIdText" class="kv">
						<text class="k">厂商 ID（Manufacturer Data）</text>
						<text class="v ble-mono">{{ manufacturerIdText }}</text>
					</view>
					<view v-else class="ad-sec">
						<view class="hd"><text>Manufacturer Data</text><text>—</text></view>
						<view class="miss">本轮平台 API 未提供此字段</view>
					</view>

					<view class="ad-sec">
						<view class="hd"><text>Service Data</text><text>{{ serviceDataText.head }}</text></view>
						<view v-if="serviceDataText.hex" class="hex">{{ serviceDataText.hex }}</view>
						<view v-else class="miss">本轮平台 API 未提供此字段</view>
					</view>
				</template>

				<view v-else class="note info">本轮平台 API 未提供此字段（advertisement 不存在）</view>
				<view v-if="adv.advertisData.present && adv.advertisData.byteLength === 0" class="note warn">字段存在但长度为 0</view>
			</scroll-view>
			<view class="sheet-acts">
				<button class="ble-btn ble-btn--primary ble-btn--sm" @click="$emit('copy', copyText)">
					<app-icon name="copy" :size="26" color="#FFFFFF" />
					<text>复制数据</text>
				</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';
import AppIcon from '../ui/AppIcon.vue';
import { buildAdSegments } from '../../services/ble-runtime/advertisement.js';

// 正典 p001-advdlg：底部弹层 + kv 四行 + 深色 ad-sec 段（Service UUIDs /
// AD 结构逐段 + 整包 hex / Manufacturer Data / Service Data），
// 单字段缺失逐项标注「本轮平台 API 未提供此字段」。
const props = defineProps({ visible: { type: Boolean, default: false }, device: { type: Object, default: null } });
defineEmits(['close', 'copy']);

const adv = computed(() => props.device?.advertisement || {});
const segments = computed(() => buildAdSegments(adv.value));
const hasAdvertisement = computed(() =>
	Boolean(adv.value.serviceUuids?.length) ||
	adv.value.advertisData?.present ||
	adv.value.manufacturerData?.length ||
	adv.value.serviceData?.length
);

const titleName = computed(() => props.device?.name || String(props.device?.deviceId || '').slice(-6));

const matchText = computed(() => {
	const level = props.device?.profileMatch ?? 0;
	if (level >= 2) return `STRONG · ${props.device.profileId}`;
	if (level === 1) return `WEAK · ${props.device.profileId}`;
	return '—';
});

const manufacturerIdText = computed(() => {
	const entry = adv.value.manufacturerData?.find((item) => item?.id != null);
	return entry ? `0x${entry.id.toString(16).padStart(4, '0').toUpperCase()}` : '';
});

const serviceDataText = computed(() => {
	const entry = adv.value.serviceData?.find((item) => item?.present);
	if (!entry) return { head: '—', hex: '' };
	return {
		head: `${entry.uuid || '未知 UUID'} · ${entry.byteLength} B`,
		hex: entry.hex || '（长度 0）'
	};
});

const copyText = computed(() => {
	const device = props.device || {};
	const lines = [
		`设备 ID: ${device.deviceId}`,
		`名称: ${adv.value.localName || '（未命名）'}`,
		`RSSI: ${device.RSSI} dBm`,
		`profileMatch: ${matchText.value}`
	];
	if (adv.value.serviceUuids?.length) {
		lines.push('Service UUIDs:', ...adv.value.serviceUuids);
	}
	if (segments.value.length) {
		lines.push('AD 结构（平台解析字段重建）:');
		for (const seg of segments.value) {
			lines.push(`${seg.type} · ${seg.name} (${seg.frameLength} B): ${seg.hex}`);
		}
	}
	if (manufacturerIdText.value) lines.push(`厂商 ID: ${manufacturerIdText.value}`);
	for (const entry of adv.value.serviceData || []) {
		if (entry?.present) lines.push(`Service Data ${entry.uuid}: ${entry.hex}`);
	}
	if (!hasAdvertisement.value) lines.push('本轮平台 API 未提供此字段（advertisement 不存在）');
	return lines.join('\n');
});
</script>

<style scoped>
.adv-mask {
	position: fixed;
	inset: 0;
	z-index: var(--z-modal);
	display: flex;
	align-items: flex-end;
	background: rgba(15, 29, 48, 0.5);
}

.adv-sheet {
	width: 100%;
	max-height: 78vh;
	display: flex;
	flex-direction: column;
	padding: 0 32rpx 32rpx;
	border-radius: 40rpx 40rpx 0 0;
	background: var(--c-card);
}

.grip {
	width: 72rpx;
	height: 8rpx;
	border-radius: 4rpx;
	background: var(--c-line);
	margin: 20rpx auto 8rpx;
}

.sh-h {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 12rpx 0 20rpx;
}

.sh-t {
	flex: 1;
	font-size: 34rpx;
	font-weight: 700;
	color: var(--c-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.sheet-scroll { flex: 1; min-height: 0; max-height: 56vh; }

.kv {
	display: flex;
	align-items: baseline;
	padding: 18rpx 0;
	border-bottom: 1rpx solid var(--c-line-soft);
	font-size: 30rpx;
}

.kv .k {
	width: 220rpx;
	flex-shrink: 0;
	color: var(--c-mut);
	font-size: 24rpx;
	font-weight: 600;
}

.kv .v {
	flex: 1;
	color: var(--c-text);
	word-break: break-all;
	line-height: 1.5;
}

.ad-sec {
	margin-top: 18rpx;
	padding: 20rpx 24rpx;
	border-radius: 24rpx;
	background: var(--c-ink);
}

.ad-sec .hd {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 10rpx;
	font-size: 20rpx;
	color: var(--c-review-label);
}

.ad-sec .seg .hd { margin-top: 12rpx; }
.ad-sec .seg:first-child .hd { margin-top: 0; }
.whole-hd { margin-top: 14rpx; }

.ad-sec .hex {
	font-family: "SF Mono", "Roboto Mono", Menlo, monospace;
	font-size: 22rpx;
	color: var(--c-ink-text);
	word-break: break-all;
	line-height: 1.7;
}

.ad-sec .miss {
	font-size: 22rpx;
	color: var(--c-review-sub);
	padding: 6rpx 0;
}

.note {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 18rpx;
	padding: 16rpx 20rpx;
	border-radius: 18rpx;
	font-size: 24rpx;
}

.note.info { background: var(--c-primary-weak); color: var(--c-note-info-fg); }
.note.warn { background: var(--c-warning-weak); color: var(--c-warning-deep); }

.sheet-acts {
	display: flex;
	gap: 18rpx;
	margin-top: 24rpx;
}

.sheet-acts .ble-btn { flex: 1; }

.soft-btn {
	color: var(--c-text);
	background: var(--c-fill);
	box-shadow: inset 0 0 0 2rpx var(--c-line);
}
</style>
