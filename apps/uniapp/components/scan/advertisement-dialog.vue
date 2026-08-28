<template>
	<view v-if="visible" class="ble-modal-mask" @click.stop="$emit('close')">
		<view class="ble-modal-sheet modal-sheet">
			<view class="ble-modal-header">
				<view class="ble-section-meta">
					<text class="ble-section-title">广播原始数据</text>
					<text class="ble-section-caption">字段来自本轮平台扫描结果，未提供与空数据会分别标注。</text>
				</view>
				<text class="ble-modal-close" @click="$emit('close')">×</text>
			</view>
			<scroll-view scroll-y class="modal-scroll"><textarea class="modal-textarea ble-mono" :value="content" disabled selectable></textarea></scroll-view>
			<view class="ble-modal-footer">
				<button class="ble-button-primary modal-button" @click="$emit('copy', content)">复制数据</button>
				<button class="ble-button-secondary modal-button" @click="$emit('close')">关闭</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ visible: { type: Boolean, default: false }, device: { type: Object, default: null } });
defineEmits(['close', 'copy']);
const displayBytes = (item) => !item?.present ? '本轮平台 API 未提供此字段' : item.length === 0 ? '字段存在但长度为 0' : `${item.hex} (${item.length}B)`;
const content = computed(() => {
	const device = props.device || {};
	const advertisement = device.advertisement || {};
	const manufacturer = advertisement.manufacturerData?.length ? advertisement.manufacturerData.map((item) => `ID ${item.id ?? '未知'}: ${displayBytes(item)}`).join('\n') : '本轮平台 API 未提供 Manufacturer Data';
	const serviceData = advertisement.serviceData?.length ? advertisement.serviceData.map((item) => `${item.uuid || '未知 UUID'}: ${displayBytes(item)}`).join('\n') : '本轮平台 API 未提供 Service Data';
	return `设备 ID: ${device.deviceId || '未知'}\n名称: ${advertisement.localName || device.name || '本轮未提供'}\nRSSI: ${device.RSSI ?? '未知'} dBm\n\n广播服务 UUIDs:\n${advertisement.serviceUUIDs?.length ? advertisement.serviceUUIDs.join('\n') : '本轮平台 API 未提供 Service UUID'}\n\n原始广播数据:\n${displayBytes(advertisement.advertisData)}\n\nManufacturer Data:\n${manufacturer}\n\nService Data:\n${serviceData}`;
});
</script>

<style scoped>
/* 模态壳（遮罩/面板/头部/底部）统一走 design-system.css 的 ble-modal-* */
.modal-sheet { max-height: 78vh; display: flex; flex-direction: column; }
.modal-scroll { max-height: 52vh; padding: 24rpx 30rpx; box-sizing: border-box; }
.modal-textarea { width: 100%; min-height: 520rpx; padding: 20rpx; box-sizing: border-box; border-radius: 20rpx; background: rgba(96,117,141,.06); font-size: 22rpx; }
.modal-button { flex: 1; }
</style>
