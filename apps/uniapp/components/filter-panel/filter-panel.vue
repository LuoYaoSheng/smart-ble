<template>
	<view class="filter-panel">
		<view class="filter-header" @click="toggleExpand">
			<text class="filter-title">过滤设置</text>
			<text class="filter-arrow">{{ expanded ? '▲' : '▼' }}</text>
		</view>

		<view v-if="expanded" class="filter-body">
			<view class="filter-item">
				<view class="filter-row">
					<text>信号强度过滤</text>
					<text class="filter-value-badge">{{ modelValue.rssi }} dBm</text>
				</view>
				<slider :value="modelValue.rssi" :min="-100" :max="0" :step="1" @change="onRSSIChange" />
				<view class="rssi-presets">
					<view 
						v-for="preset in rssiPresets" :key="preset"
						class="preset-btn"
						:class="{ active: modelValue.rssi === preset }"
						@click="setFilterRSSI(preset)"
					>{{ preset }}</view>
				</view>
			</view>
			<view class="filter-options">
				<view class="filter-option">
					<text>名称前缀过滤</text>
					<input type="text" :value="modelValue.prefix" @input="onPrefixChange" placeholder="输入设备名称前缀" class="prefix-input" />
				</view>
				<view class="filter-option">
					<text>隐藏无名设备</text>
					<switch :checked="modelValue.hideNoName" @change="onHideNoNameChange" color="#007AFF" class="custom-switch" />
				</view>
			</view>
			<view class="filter-reset-row">
				<view class="reset-btn" @click="resetFilter">↺ 重置过滤</view>
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
const rssiPresets = [-100, -80, -60, -40];

const toggleExpand = () => {
    expanded.value = !expanded.value;
};

const updateValue = (key, value) => {
	emit('update:modelValue', {
		...props.modelValue,
		[key]: value
	});
};

const onRSSIChange = (e) => updateValue('rssi', e.detail.value);
const setFilterRSSI = (preset) => updateValue('rssi', preset);
const onPrefixChange = (e) => updateValue('prefix', e.detail.value);
const onHideNoNameChange = (e) => updateValue('hideNoName', e.detail.value);

const resetFilter = () => {
	emit('update:modelValue', { rssi: -100, prefix: '', hideNoName: false });
};
</script>

<style scoped>
.filter-panel { background-color: #fff; padding: 20rpx 30rpx; z-index: 10; border-bottom: 2rpx solid #f5f5f5; }
.filter-header { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0; }
.filter-title { font-size: 32rpx; font-weight: bold; color: #333; }
.filter-arrow { font-size: 24rpx; color: #999; }
.filter-body { margin-top: 20rpx; animation: slideDown 0.3s ease; }
@keyframes slideDown { from { opacity: 0.5; transform: translateY(-10rpx); } to { opacity: 1; transform: translateY(0); } }
.filter-item { margin-bottom: 20rpx; }
.filter-row { display: flex; justify-content: space-between; font-size: 28rpx; color: #666; margin-bottom: 10rpx; }
.filter-value-badge { background-color: rgba(0, 122, 255, 0.1); color: #007AFF; padding: 4rpx 16rpx; border-radius: 20rpx; font-size: 24rpx; font-weight: bold; }
.filter-options { display: flex; flex-direction: column; gap: 20rpx; }
.filter-option { display: flex; justify-content: space-between; align-items: center; font-size: 28rpx; color: #666; }
.prefix-input { flex: 1; margin-left: 20rpx; padding: 10rpx 20rpx; background-color: #f5f5f5; border-radius: 12rpx; font-size: 26rpx; text-align: right; }
.custom-switch { transform: scale(0.8); margin-right: -10rpx; }
.rssi-presets { display: flex; justify-content: space-between; margin-top: 10rpx; }
.preset-btn { font-size: 24rpx; padding: 6rpx 20rpx; border-radius: 20rpx; background: #f0f0f0; color: #666; }
.preset-btn.active { background: #007AFF; color: #fff; }
.filter-reset-row { display: flex; justify-content: flex-end; margin-top: 20rpx; }
.reset-btn { font-size: 24rpx; color: #FF3B30; background: rgba(255, 59, 48, 0.1); padding: 6rpx 20rpx; border-radius: 20rpx; }
</style>
