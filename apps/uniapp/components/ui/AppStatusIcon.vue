<template>
	<view class="app-status-icon" :class="state" :style="boxStyle">
		<AppIcon v-if="iconName" :name="iconName" :size="iconSize" :tone="iconTone" />
		<view v-else-if="state === 'active'" class="pulse-dot"></view>
	</view>
</template>

<script setup>
// 正典状态图标（COMPONENT_CONTRACT B7 · 原型 C.stIcon 五态）
// ok→check/successDeep · warn→warn/warningDeep · fail→x/danger · active→primary 脉冲点 · pending→空心 dashed 点
// （active/pending 不使用字符，以样式点表达 —— UI-PARITY-G0 整改项）
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps({
	state: { type: String, default: 'pending' }, // ok|warn|fail|active|pending
	size: { type: Number, default: 48 }
});

const ICON_MAP = {
	ok: { name: 'check', tone: 'successDeep' },
	warn: { name: 'warn', tone: 'warningDeep' },
	fail: { name: 'x', tone: 'danger' }
};
const iconName = computed(() => ICON_MAP[props.state]?.name || '');
const iconTone = computed(() => ICON_MAP[props.state]?.tone || 'mut');
const iconSize = computed(() => Math.round(props.size * 0.55));
const boxStyle = computed(() => ({ width: props.size + 'rpx', height: props.size + 'rpx' }));
</script>

<style scoped>
.app-status-icon {
	border-radius: var(--r-round);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.app-status-icon.ok { background: var(--c-success-weak); }
.app-status-icon.warn { background: var(--c-warning-weak); }
.app-status-icon.fail { background: var(--c-danger-weak); }
.app-status-icon.active { background: var(--c-primary-weak); }
.app-status-icon.pending { border: 3rpx dashed var(--c-line); }
.pulse-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: var(--c-primary); animation: app-status-pulse 1s infinite; }
@keyframes app-status-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
</style>
