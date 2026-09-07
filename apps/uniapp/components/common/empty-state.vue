<template>
	<view class="ble-empty-card">
		<app-ill v-if="ill" :name="ill" :width="236" class="ble-empty-ill" />
		<text class="ble-empty-title">{{ title }}</text>
		<text v-if="description" class="ble-empty-copy">{{ description }}</text>
		<button
			v-if="actionLabel"
			class="ble-btn ble-btn--primary ble-btn--md"
			@click="$emit('action')"
		>
			{{ actionLabel }}
		</button>
		<slot></slot>
	</view>
</template>

<script setup>
import AppIll from './app-ill.vue';

defineProps({
	ill: { type: String, default: '' },
	title: { type: String, required: true },
	description: { type: String, default: '' },
	actionLabel: { type: String, default: '' }
});
defineEmits(['action']);
</script>

<style scoped>
.ble-empty-ill {
	margin-bottom: 12rpx;
}
</style>
