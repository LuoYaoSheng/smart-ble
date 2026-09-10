<template>
	<view class="progress-list">
		<view v-for="row in rows" :key="row.key" class="progress-row">
			<view :class="['progress-dot', row.state]">
				<AppIcon v-if="markerIcon(row.state)" :name="markerIcon(row.state)" :size="26" :tone="markerTone(row.state)" />
				<text v-else>·</text>
			</view>
			<text class="progress-label">{{ row.label }}</text>
			<text class="progress-state">{{ stateText(row.state) }}</text>
		</view>
	</view>
</template>

<script setup>
import AppIcon from '../ui/AppIcon.vue'; // UI-PARITY-G0 正典图标入口

defineProps({ rows: { type: Array, default: () => [] } });

// UI-PARITY-G0：状态图标走正典 AppIcon（check/x/warn）；active/pending 保留原型 stIcon 的 '·' 文字点位
const markerIcon = (state) => ({ done: 'check', fail: 'x', warn: 'warn' }[state] || '');
const markerTone = (state) => ({ done: 'successDeep', fail: 'danger', warn: 'warningDeep' }[state] || 'mut');
const stateText = (state) => ({ done: '完成', active: '进行中', fail: '失败', warn: '待确认' }[state] || '等待');
</script>

<style scoped>
.progress-list { display: flex; flex-direction: column; gap: 14rpx; }
.progress-row { display: grid; grid-template-columns: 44rpx 1fr auto; align-items: center; gap: 14rpx; padding: 18rpx 20rpx; border-radius: 22rpx; background: rgba(247, 250, 253, 0.94); }
.progress-dot { display: flex; align-items: center; justify-content: center; width: 44rpx; height: 44rpx; border-radius: 50%; background: rgba(96, 117, 141, 0.1); color: var(--ble-text-muted); font-size: 22rpx; font-weight: 800; }
.progress-dot.active { color: var(--ble-brand); background: var(--c-primary-weak); }
.progress-dot.done { color: var(--c-success-deep); background: var(--c-success-weak); } /* #0e8f79 → #0E9A80 · 正典 .prow.done UI-CONV 2026-09-10 */
.progress-dot.fail { color: var(--ble-red); background: var(--c-danger-weak); } /* 正典 .prow.fail UI-CONV 2026-09-10 */
.progress-dot.warn { color: var(--c-warning-deep); background: var(--c-warning-weak); } /* #c86d00 → #C77E14 · 正典 .prow.warn UI-CONV 2026-09-10 */
.progress-label { font-size: 26rpx; color: var(--ble-text); }
.progress-state { font-size: 22rpx; color: var(--ble-text-muted); }
</style>
