<template>
	<view class="progress-list">
		<view v-for="row in rows" :key="row.key" class="progress-row">
			<view :class="['progress-dot', row.state]">{{ marker(row.state) }}</view>
			<text class="progress-label">{{ row.label }}</text>
			<text class="progress-state">{{ stateText(row.state) }}</text>
		</view>
	</view>
</template>

<script setup>
defineProps({ rows: { type: Array, default: () => [] } });

const marker = (state) => ({ done: '✓', active: '…', fail: '!', warn: '!' }[state] || '·');
const stateText = (state) => ({ done: '完成', active: '进行中', fail: '失败', warn: '待确认' }[state] || '等待');
</script>

<style scoped>
.progress-list { display: flex; flex-direction: column; gap: 14rpx; }
.progress-row { display: grid; grid-template-columns: 44rpx 1fr auto; align-items: center; gap: 14rpx; padding: 18rpx 20rpx; border-radius: 22rpx; background: rgba(247, 250, 253, 0.94); }
.progress-dot { display: flex; align-items: center; justify-content: center; width: 44rpx; height: 44rpx; border-radius: 50%; background: rgba(96, 117, 141, 0.1); color: var(--ble-text-muted); font-size: 22rpx; font-weight: 800; }
.progress-dot.active { color: var(--ble-brand); background: rgba(27, 109, 255, 0.12); }
.progress-dot.done { color: #0e8f79; background: rgba(23, 199, 168, 0.18); }
.progress-dot.fail { color: var(--ble-red); background: rgba(242, 85, 95, 0.14); }
.progress-dot.warn { color: #c86d00; background: rgba(255, 159, 67, 0.18); }
.progress-label { font-size: 26rpx; color: var(--ble-text); }
.progress-state { font-size: 22rpx; color: var(--ble-text-muted); }
</style>
