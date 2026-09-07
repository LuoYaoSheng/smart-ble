<template>
	<view class="scantool">
		<view class="tool-row">
			<view class="lb">
				<view v-if="scanning" class="live"></view>
				<text>{{ stateLabel }}</text>
			</view>
			<button
				class="ble-btn ble-btn--md"
				:class="scanning ? 'ble-btn--danger' : 'ble-btn--primary'"
				@click="$emit('toggle')"
			>
				<app-icon :name="scanning ? 'stop' : 'scan'" :size="30" color="#ffffff" />
				<text>{{ scanning ? '停止扫描' : '开始扫描' }}</text>
			</button>
		</view>
		<error-banner
			v-if="error"
			:code="error.code"
			:message="error.message"
			@action="$emit('retry')"
		/>
	</view>
</template>

<script setup>
import { computed } from 'vue';
import AppIcon from '../common/app-icon.vue';
import ErrorBanner from '../common/error-banner.vue';

// 正典 p001 .scantool：纯行布局——左侧状态标签（scanLb 三态）+ 右侧按钮；
// 扫描失败横幅（B8）整块跟随其后。
const props = defineProps({
	scanning: { type: Boolean, default: false },
	scanned: { type: Boolean, default: false },
	shownCount: { type: Number, default: 0 },
	error: { type: Object, default: null }
});
defineEmits(['toggle', 'retry']);

const stateLabel = computed(() => {
	if (props.scanning) return '扫描中 · 5s 会话';
	if (props.scanned) return `扫描完成 · 发现 ${props.shownCount} 台`;
	return '待开始扫描';
});
</script>

<style scoped>
.scantool {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.tool-row {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.lb {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 12rpx;
	font-size: 24rpx;
	color: var(--ble-text-muted);
}

.live {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	background: var(--ble-brand);
	animation: scan-pulse 1s infinite;
}

@keyframes scan-pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.25; }
}
</style>
