<template>
	<view v-if="text" class="app-chip" :class="tone"><text>{{ text }}</text></view>
</template>

<script setup>
// 正典标签（COMPONENT_CONTRACT B2 · prototype components.css .chip）
// tone: neutral/primary/success/danger/warning/mono
defineProps({
	text: { type: [String, Number], default: '' },
	tone: { type: String, default: 'neutral' }
});
</script>

<style scoped>
.app-chip {
	display: inline-flex;
	align-items: center;
	gap: 8rpx;
	border-radius: var(--r-round);
	padding: 4rpx 18rpx;
	font-size: var(--fs-mini);
	font-weight: var(--fw-med);
	line-height: 1.7;
	white-space: nowrap;
}
.app-chip.neutral { background: var(--c-fill); color: var(--c-sub); }
.app-chip.primary { background: var(--c-primary-weak); color: var(--c-primary); }
.app-chip.success { background: var(--c-success-weak); color: var(--c-success-deep); }
.app-chip.danger { background: var(--c-danger-weak); color: var(--c-danger); }
.app-chip.warning { background: var(--c-warning-weak); color: var(--c-warning-deep); }
.app-chip.mono { font-family: var(--font-mono); font-size: var(--fs-micro); background: var(--c-fill); color: var(--c-sub); }
</style>
