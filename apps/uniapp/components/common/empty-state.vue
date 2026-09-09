<template>
	<view class="ble-empty-card">
		<app-ill v-if="ill" :name="ill" :width="236" class="ble-empty-ill" />
		<text class="ble-empty-title">{{ title }}</text>
		<text v-if="description" class="ble-empty-copy">{{ description }}</text>
		<button v-if="actionLabel" class="ble-btn ble-btn--md empty-action" @click="$emit('action')">
			<app-icon v-if="actionIcon" :name="actionIcon" :size="30" color="#18222E" />
			<text>{{ actionLabel }}</text>
		</button>
		<slot></slot>
	</view>
</template>

<script setup>
import AppIll from './app-ill.vue';
import AppIcon from './app-icon.vue';

// 正典 B6 C.empty：动作按钮固定 soft 色调（--c-fill 底 + --c-text 字 + line 内描边）。
defineProps({
	ill: { type: String, default: '' },
	title: { type: String, required: true },
	description: { type: String, default: '' },
	actionLabel: { type: String, default: '' },
	actionIcon: { type: String, default: '' }
});
defineEmits(['action']);
</script>

<style scoped>
.ble-empty-ill {
	margin-bottom: 12rpx;
}

.empty-action {
	color: var(--c-text);
	background: var(--c-fill);
	box-shadow: inset 0 0 0 2rpx var(--c-line);
}
</style>
