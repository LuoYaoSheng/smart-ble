<template>
	<view class="app-empty">
		<view class="ill"><AppIll :name="ill" :width="236" /></view>
		<view class="t">{{ title }}</view>
		<view v-if="description" class="d">{{ description }}</view>
		<AppButton v-if="actionLabel" :label="actionLabel" tone="soft" :icon="actionIcon" size="md" @tap="$emit('action')" />
	</view>
</template>

<script setup>
// 正典空态（COMPONENT_CONTRACT B6 · prototype components.js C.empty）
// ill: radar(扫描空)/link(无连接)/doc(无记录)/box(容器空)
// P001 双空态：未扫描(radar+action) / 筛选无匹配(link 无 action)
import AppIll from './AppIll.vue';
import AppButton from './AppButton.vue';

defineProps({
	ill: { type: String, default: 'box' },
	title: { type: String, required: true },
	description: { type: String, default: '' },
	actionLabel: { type: String, default: '' },
	actionIcon: { type: String, default: '' }
});
defineEmits(['action']);
</script>

<style scoped>
.app-empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 76rpx 48rpx; }
.ill { margin-bottom: var(--sp-4); }
.t { font-size: var(--fs-h1); font-weight: var(--fw-bold); color: var(--c-text); margin-bottom: 12rpx; }
.d { font-size: var(--fs-body); color: var(--c-mut); line-height: 1.6; max-width: 500rpx; margin-bottom: var(--sp-4); }
</style>
