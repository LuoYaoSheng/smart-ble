<template>
	<view class="stepper" aria-label="Smart HID 配网进度">
		<view v-for="(step, index) in steps" :key="step.key" :class="['step', index === current ? 'active' : '', index < current ? 'done' : '']">
			<view class="step-index"><AppIcon v-if="index < current" name="check" :size="24" tone="successDeep" /><template v-else>{{ index + 1 }}</template></view>
			<text class="step-label">{{ step.label }}</text>
		</view>
	</view>
</template>

<script setup>
import AppIcon from '../ui/AppIcon.vue'; // UI-PARITY-G0 正典图标入口

defineProps({
	steps: { type: Array, required: true },
	current: { type: Number, default: 0 }
});
</script>

<style scoped>
.stepper {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12rpx;
}

.step {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	height: 66rpx;
	border-radius: 20rpx;
	background: rgba(96, 117, 141, 0.08);
	color: var(--ble-text-muted, #9AA8B6); /* #93a2b4 → #9AA8B6 圈外值收敛 UI-CONV 2026-09-10 */
}

.step-index {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32rpx;
	height: 32rpx;
	border-radius: 50%;
	background: rgba(96, 117, 141, 0.12);
	font-size: 19rpx;
	font-weight: 800;
}

.step-label {
	font-size: 22rpx;
	font-weight: 700;
}

.step.active {
	color: #ffffff;
	/* 正典 C6 stepper 当前步：纯 --c-primary（原型 .st.cur .n）；v0 品牌青蓝渐变退役 UI-CONV 2026-09-10 */
	background: var(--c-primary);
	box-shadow: 0 12rpx 28rpx rgba(27, 109, 255, 0.18);
}

.step.active .step-index {
	background: rgba(255, 255, 255, 0.2);
}

.step.done {
	color: var(--c-success-deep); /* #0e8f79 → #0E9A80 圈外值收敛（正典 .st.done .lb=#0E9A80）UI-CONV 2026-09-10 */
	background: var(--c-success-weak);
}

.step.done .step-index {
	background: rgba(23, 199, 168, 0.18);
}
</style>
