<template>
	<view class="ble-empty-card">
		<image v-if="image" :src="image" class="ble-empty-image" mode="aspectFit"></image>
		<text class="ble-empty-title">{{ title }}</text>
		<text v-if="description" class="ble-empty-copy">{{ description }}</text>
		<slot></slot>
	</view>
</template>

<script setup>
defineProps({
	image: { type: String, default: '' },
	title: { type: String, required: true },
	description: { type: String, default: '' }
});
</script>
