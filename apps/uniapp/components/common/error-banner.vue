<template>
	<view v-if="message" class="error-banner" role="alert">
		<text class="error-title">{{ title }}</text>
		<text class="error-message">{{ message }}</text>
		<text v-if="actionLabel" class="error-action" @click="$emit('action')">{{ actionLabel }}</text>
	</view>
</template>

<script setup>
defineProps({
	title: { type: String, default: '操作失败' },
	message: { type: String, default: '' },
	actionLabel: { type: String, default: '' }
});
defineEmits(['action']);
</script>

<style scoped>
.error-banner { display: flex; flex-direction: column; gap: 8rpx; padding: 18rpx 20rpx; border-radius: 20rpx; background: rgba(242,85,95,.08); border: 1rpx solid rgba(242,85,95,.14); }
.error-title { font-size: 24rpx; font-weight: 700; color: var(--ble-red); }
.error-message { font-size: 22rpx; line-height: 1.5; color: var(--ble-text-subtle); }
.error-action { align-self: flex-start; font-size: 23rpx; font-weight: 700; color: var(--ble-brand); }
</style>
