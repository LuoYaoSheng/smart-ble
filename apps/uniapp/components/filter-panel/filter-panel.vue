<template>
	<view class="filter ble-card">
		<view class="row">
			<text class="lb">最弱信号</text>
			<view class="presets">
				<view
					v-for="preset in rssiPresets"
					:key="preset.value"
					class="pre"
					:class="{ on: modelValue.rssi === preset.value }"
					@click="setFilterRSSI(preset.value)"
				>
					{{ preset.label }}
				</view>
			</view>
		</view>

		<view class="row">
			<text class="lb">阈值 {{ modelValue.rssi }} dBm</text>
			<slider
				class="slider"
				:value="modelValue.rssi"
				:min="-100"
				:max="-40"
				:step="5"
				activeColor="#1B6DFF"
				@change="onRSSIChange"
			/>
		</view>

		<view class="row">
			<text class="lb">名称前缀</text>
			<input
				type="text"
				:value="modelValue.prefix"
				@input="onPrefixChange"
				placeholder="如 SHID / LightBLE"
				class="prefix-input"
			/>
		</view>

		<view class="row">
			<text class="lb">隐藏无名</text>
			<switch :checked="modelValue.hideNoName" @change="onHideNoNameChange" color="#17C7A8" class="custom-switch" />
			<view class="spacer"></view>
			<button class="ble-btn ble-btn--sm reset-btn" @click="resetFilter">重置过滤</button>
		</view>
	</view>
</template>

<script setup>
// UI-PARITY-G0：slider activeColor / switch color 为原生组件属性（不解析 CSS var），
// 取正典 hex（--c-primary #1B6DFF / --c-success #17C7A8，design-tokens.json）。
// 正典 p001 .filter：四行结构（最弱信号四档 / 阈值滑杆 / 名称前缀 / 隐藏无名+重置）。
// 展开收起由宿主页 sec-t 的 txtlink 控制（本组件只承载行内容）。
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

const rssiPresets = [
	{ value: -40, label: '强 [-40]' },
	{ value: -60, label: '较好 [-60]' },
	{ value: -70, label: '一般 [-70]' },
	{ value: -85, label: '弱 [-85]' }
];

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
.filter {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	padding: 26rpx;
}

.row {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.lb {
	width: 128rpx;
	flex-shrink: 0;
	font-size: 24rpx;
	font-weight: 600;
	color: var(--ble-text-muted);
}

.presets {
	flex: 1;
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 12rpx;
}

.pre {
	padding: 8rpx 22rpx; /* 原型 presets 4px 11px */
	border-radius: var(--r-round);
	background: var(--c-fill);
	color: var(--c-sub);
	font-size: 22rpx;
	font-weight: 600;
}

.pre.on {
	background: var(--ble-brand);
	color: var(--c-card);
}

.slider { flex: 1; margin: 0; }

.prefix-input {
	flex: 1;
	height: 76rpx;
	padding: 0 22rpx;
	border-radius: 16rpx;
	background: var(--c-fill);
	border: none;
	font-size: 26rpx;
	color: var(--ble-text);
}

.custom-switch {
	transform: scale(0.84);
	margin-right: -12rpx;
}

.spacer { flex: 1; }

.reset-btn {
	color: var(--c-text);
	background: var(--c-fill);
	box-shadow: inset 0 0 0 2rpx var(--c-line);
}
</style>
