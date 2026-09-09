<template>
	<view v-if="text" class="app-badge" :class="tone">
		<view v-if="dot" class="dot"></view>
		<text>{{ text }}</text>
	</view>
</template>

<script setup>
// 正典状态徽章（COMPONENT_CONTRACT B3 · prototype components.css .badge）
// tone: dim(默认)/on/err/warn
defineProps({
	text: { type: [String, Number], default: '' },
	tone: { type: String, default: 'dim' },
	dot: { type: Boolean, default: true }
});
</script>

<style scoped>
.app-badge {
	display: inline-flex;
	align-items: center;
	gap: 10rpx;
	border-radius: var(--r-round);
	padding: 6rpx 20rpx;
	font-size: var(--fs-mini);
	font-weight: var(--fw-bold);
	background: var(--c-fill);
	color: var(--c-sub);
}
.dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: var(--c-ph); }
.app-badge.on { background: var(--c-success-weak); color: var(--c-success-deep); }
.app-badge.on .dot { background: var(--c-success); box-shadow: 0 0 12rpx rgba(23, 199, 168, 0.6); }
.app-badge.err { background: var(--c-danger-weak); color: var(--c-danger); }
.app-badge.err .dot { background: var(--c-danger); }
.app-badge.warn { background: var(--c-warning-weak); color: var(--c-warning-deep); }
.app-badge.warn .dot { background: var(--c-warning); }
.app-badge.dim { color: var(--c-mut); }
</style>
