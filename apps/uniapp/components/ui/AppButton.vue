<template>
	<view class="app-btn" :class="[tone, size, { block, dangerText, disabled: disabled || loading }]" :hover-class="(disabled || loading) ? '' : 'app-btn-hover'" :hover-stay-time="80" @click="onClick">
		<view v-if="loading" class="spin"></view>
		<AppIcon v-else-if="icon" :name="icon" :size="iconSize" tone="inherit" :color="iconColor" />
		<text class="label">{{ label }}</text>
	</view>
</template>

<script setup>
// 正典按钮（COMPONENT_CONTRACT B1 · prototype components.css .btn）
// tone: primary/danger/ghost/soft · size: md/sm · dangerText: ghost/soft 的红字变体
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps({
	label: { type: String, required: true },
	tone: { type: String, default: 'primary' },
	size: { type: String, default: 'md' },
	icon: { type: String, default: '' },
	loading: { type: Boolean, default: false },
	disabled: { type: Boolean, default: false },
	block: { type: Boolean, default: false },
	dangerText: { type: Boolean, default: false }
});
const emit = defineEmits(['tap']);

const iconSize = computed(() => (props.size === 'sm' ? 28 : 32));
// 实底按钮内图标白；ghost/soft 用语义前景（dangerText→danger，ghost→primary，soft→text）
const iconColor = computed(() => {
	if (props.tone === 'ghost') return props.dangerText ? '#F2555F' : '#1B6DFF';
	if (props.tone === 'soft') return props.dangerText ? '#F2555F' : '#18222E';
	return '#FFFFFF';
});

const onClick = () => {
	if (props.disabled || props.loading) return;
	emit('tap');
};
</script>

<style scoped>
.app-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	border-radius: var(--r-md);
	font-weight: var(--fw-med);
	white-space: nowrap;
	transition: transform var(--dur-fast) var(--ease), opacity var(--dur-fast) var(--ease);
}
.app-btn-hover { transform: scale(.97); }
.app-btn .label { line-height: 1; }

/* 尺寸 */
.app-btn.md { height: 80rpx; padding: 0 36rpx; font-size: var(--fs-h2); }
.app-btn.sm { height: 64rpx; padding: 0 26rpx; font-size: var(--fs-body); border-radius: var(--r-sm); }
.app-btn.block { width: 100%; }

/* 变体 */
.app-btn.primary { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-deep)); color: var(--c-card); box-shadow: var(--shadow-primary); }
.app-btn.danger { background: linear-gradient(135deg, var(--c-danger-grad-hi), var(--c-danger)); color: var(--c-card); box-shadow: 0px 6px 16px rgba(242, 85, 95, 0.28); }
.app-btn.ghost { background: transparent; color: var(--c-primary); box-shadow: inset 0 0 0 3rpx var(--c-primary); }
.app-btn.ghost.dangerText { color: var(--c-danger); box-shadow: inset 0 0 0 3rpx var(--c-danger); }
.app-btn.soft { background: var(--c-fill); color: var(--c-text); box-shadow: inset 0 0 0 2rpx var(--c-line); }
.app-btn.soft.dangerText { color: var(--c-danger); background: var(--c-danger-weak); box-shadow: none; }

/* 禁用 */
.app-btn.disabled { background: var(--c-fill) !important; color: var(--c-ph) !important; box-shadow: none !important; transform: none; }

/* spinner（800ms 唯一动画元素） */
.spin {
	width: 28rpx;
	height: 28rpx;
	border: 4rpx solid rgba(255, 255, 255, 0.4);
	border-top-color: var(--c-card);
	border-radius: 50%;
	animation: app-btn-spin 0.8s linear infinite;
}
.app-btn.soft .spin, .app-btn.ghost .spin { border-color: rgba(27, 109, 255, 0.25); border-top-color: var(--c-primary); }
@keyframes app-btn-spin { to { transform: rotate(360deg); } }
</style>
