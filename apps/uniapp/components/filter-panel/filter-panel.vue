<template>
	<view class="filter-panel ble-card">
		<view class="filter-header" @click="toggleExpand">
			<view class="filter-title-group">
				<text class="filter-title">扫描过滤器</text>
				<text class="filter-caption">按信号阈值、名称前缀和空名称设备过滤结果。</text>
			</view>
			<text class="filter-arrow">{{ expanded ? '收起' : '展开' }}</text>
		</view>

		<view class="filter-summary" v-if="!expanded">
			<view class="summary-chip">
				<text>RSSI ≥ {{ modelValue.rssi }} dBm</text>
			</view>
			<view class="summary-chip" v-if="modelValue.prefix">
				<text>前缀 {{ modelValue.prefix }}</text>
			</view>
			<view class="summary-chip" v-if="modelValue.hideNoName">
				<text>隐藏无名设备</text>
			</view>
		</view>

		<view v-if="expanded" class="filter-body">
			<view class="filter-item">
				<view class="filter-row">
					<text class="filter-label">信号强度</text>
					<text class="filter-value-badge">{{ modelValue.rssi }} dBm</text>
				</view>
				<slider :value="modelValue.rssi" :min="-100" :max="0" :step="1" activeColor="#1B6DFF" @change="onRSSIChange" />
				<view class="rssi-presets">
					<view
						v-for="preset in rssiPresets"
						:key="preset"
						class="preset-btn"
						:class="{ active: modelValue.rssi === preset }"
						@click="setFilterRSSI(preset)"
					>
						{{ preset }}
					</view>
				</view>
			</view>

			<view class="filter-option">
				<text class="filter-label">名称前缀</text>
				<input
					type="text"
					:value="modelValue.prefix"
					@input="onPrefixChange"
					placeholder="例如 SHID / Light / Test"
					class="prefix-input"
				/>
			</view>

			<view class="filter-option">
				<text class="filter-label">隐藏无名设备</text>
				<switch :checked="modelValue.hideNoName" @change="onHideNoNameChange" color="#1B6DFF" class="custom-switch" />
			</view>

			<view class="filter-reset-row">
				<view class="reset-btn" @click="resetFilter">重置过滤</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
	modelValue: {
		type: Object,
		default: () => ({
			rssi: -100,
			prefix: '',
			hideNoName: false
		})
	}
});

const emit = defineEmits(['update:modelValue']);

const expanded = ref(false);
const rssiPresets = [-100, -85, -70, -55];

const toggleExpand = () => {
	expanded.value = !expanded.value;
};

const onRSSIChange = (e) => emitValue('rssi', e.detail.value);
const setFilterRSSI = (preset) => emitValue('rssi', preset);
const onPrefixChange = (e) => emitValue('prefix', e.detail.value);
const onHideNoNameChange = (e) => emitValue('hideNoName', e.detail.value);

function emitValue(key, value) {
	emit('update:modelValue', {
		...props.modelValue,
		[key]: value
	});
}

const resetFilter = () => {
	emit('update:modelValue', { rssi: -100, prefix: '', hideNoName: false });
};
</script>

<style scoped>
.filter-panel {
	padding: 26rpx;
}

.filter-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
}

.filter-title-group {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.filter-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.filter-caption {
	font-size: 22rpx;
	line-height: 1.5;
	color: var(--ble-text-muted);
}

.filter-arrow {
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(27, 109, 255, 0.08);
	color: var(--ble-brand);
	font-size: 22rpx;
	font-weight: 700;
}

.filter-summary {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 18rpx;
}

.summary-chip {
	padding: 10rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(27, 109, 255, 0.08);
	color: var(--ble-text-subtle);
	font-size: 22rpx;
}

.filter-body {
	display: flex;
	flex-direction: column;
	gap: 22rpx;
	margin-top: 20rpx;
	padding-top: 20rpx;
	border-top: 1rpx solid rgba(20, 76, 136, 0.08);
}

.filter-item {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.filter-row,
.filter-option {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.filter-label {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--ble-text);
}

.filter-value-badge {
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(27, 109, 255, 0.1);
	color: var(--ble-brand);
	font-size: 22rpx;
	font-weight: 700;
}

.prefix-input {
	flex: 1;
	height: 76rpx;
	padding: 0 22rpx;
	border-radius: 20rpx;
	background: rgba(241, 246, 252, 0.92);
	border: 1rpx solid rgba(20, 76, 136, 0.08);
	font-size: 24rpx;
	text-align: right;
	color: var(--ble-text);
}

.custom-switch {
	transform: scale(0.84);
	margin-right: -12rpx;
}

.rssi-presets {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.preset-btn {
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(96, 117, 141, 0.08);
	color: var(--ble-text-subtle);
	font-size: 22rpx;
	font-weight: 700;
}

.preset-btn.active {
	background: var(--ble-gradient-brand);
	color: #ffffff;
}

.filter-reset-row {
	display: flex;
	justify-content: flex-end;
}

.reset-btn {
	padding: 12rpx 18rpx;
	border-radius: 999rpx;
	background: rgba(242, 85, 95, 0.1);
	color: var(--ble-red);
	font-size: 22rpx;
	font-weight: 700;
}
</style>
