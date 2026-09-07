<template>
	<view class="operation-state" :class="'is-' + state">
		<template v-if="state === 'loading'">
			<view class="ble-status-line">
				<view class="ble-status-dot active"></view>
				<text>{{ title || '处理中…' }}</text>
			</view>
			<text v-if="description" class="operation-copy">{{ description }}</text>
		</template>

		<template v-else-if="state === 'error'">
			<view class="ble-error-box" role="alert">
				<text v-if="title" class="operation-title">{{ title }}</text>
				<text class="operation-copy">{{ description || '操作失败，请重试。' }}</text>
			</view>
			<button
				v-if="actionLabel"
				class="ble-btn ble-btn--primary ble-btn--md"
				:class="{ 'ble-btn--disabled': actionDisabled }"
				:disabled="actionDisabled"
				@click="$emit('action')"
			>
				{{ actionLabel }}
			</button>
		</template>

		<template v-else-if="state === 'success'">
			<view class="ble-success-box">
				<view class="ble-success-icon"><app-icon name="check" :size="28" color="#FFFFFF" /></view>
				<view>
					<text class="operation-title">{{ title || '已完成' }}</text>
					<text v-if="description" class="operation-copy">{{ description }}</text>
				</view>
			</view>
			<button
				v-if="actionLabel"
				class="ble-btn ble-btn--primary ble-btn--md"
				:class="{ 'ble-btn--disabled': actionDisabled }"
				:disabled="actionDisabled"
				@click="$emit('action')"
			>
				{{ actionLabel }}
			</button>
		</template>

		<template v-else>
			<view class="ble-empty-card operation-empty">
				<text class="ble-empty-title">{{ title || '暂无内容' }}</text>
				<text v-if="description" class="ble-empty-copy">{{ description }}</text>
				<button
					v-if="actionLabel"
					class="ble-btn ble-btn--primary ble-btn--md"
					:class="{ 'ble-btn--disabled': actionDisabled }"
					:disabled="actionDisabled"
					@click="$emit('action')"
				>
					{{ actionLabel }}
				</button>
				<slot></slot>
			</view>
		</template>
	</view>
</template>

<script setup>
import AppIcon from './app-icon.vue';

defineProps({
	state: {
		type: String,
		default: 'empty' // loading | error | success | empty | idle
	},
	title: { type: String, default: '' },
	description: { type: String, default: '' },
	actionLabel: { type: String, default: '' },
	actionDisabled: { type: Boolean, default: false }
});

defineEmits(['action']);
</script>

<style scoped>
.operation-state {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.operation-title {
	display: block;
	font-size: 26rpx;
	font-weight: 800;
	color: var(--ble-text);
}

.operation-copy {
	display: block;
	font-size: 23rpx;
	line-height: 1.55;
	color: var(--ble-text-subtle);
}

.operation-empty {
	min-height: 320rpx;
	margin-top: 0;
}

.is-loading .operation-copy {
	padding-left: 30rpx;
}
</style>
