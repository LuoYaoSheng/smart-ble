<template>
	<view class="app-list-row">
		<view class="k">{{ label }}</view>
		<view class="v" :class="{ mono, dim: isEmpty }">{{ isEmpty ? '—' : value }}</view>
	</view>
</template>

<script setup>
// 正典键值行 kv（COMPONENT_CONTRACT A4 · prototype components.css .kv）
// 缺失值显示「—」不隐藏行（PAGE003 规则）
import { computed } from 'vue';

const props = defineProps({
	label: { type: String, required: true },
	value: { type: [String, Number], default: '' },
	mono: { type: Boolean, default: false }
});
const isEmpty = computed(() => props.value === '' || props.value === null || props.value === undefined);
</script>

<style scoped>
.app-list-row {
	display: flex;
	align-items: baseline;
	padding: 18rpx 0;
	border-bottom: 2rpx solid var(--c-line-soft);
	font-size: var(--fs-body);
}
.app-list-row:last-child { border-bottom: none; }
.k { width: 192rpx; flex-shrink: 0; color: var(--c-mut); font-size: var(--fs-cap); font-weight: var(--fw-med); }
.v { flex: 1; color: var(--c-text); word-break: break-all; line-height: 1.5; }
.v.mono { font-family: var(--font-mono); }
.v.dim { color: var(--c-ph); }
</style>
