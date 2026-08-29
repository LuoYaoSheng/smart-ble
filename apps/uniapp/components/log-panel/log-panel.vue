<template>
	<view class="log-panel" :class="{ 'log-panel--compact': compact, 'log-panel--card': variant === 'card' }">
		<view class="panel-header">
			<view class="title-group">
				<text class="panel-title">{{ title }}</text>
				<text v-if="caption" class="panel-caption">{{ caption }}</text>
			</view>
			<text v-if="clearable" class="clear-action" @click="$emit('clear')">清空</text>
		</view>

		<scroll-view class="log-content" scroll-y :scroll-top="scrollTop">
			<view v-if="logs.length === 0" class="ble-empty-card log-empty">
				<image v-if="emptyImage" :src="emptyImage" class="ble-empty-image" mode="aspectFit"></image>
				<text class="ble-empty-title">{{ emptyTitle }}</text>
				<text v-if="emptyDescription" class="ble-empty-copy">{{ emptyDescription }}</text>
			</view>

			<view v-else>
				<view v-for="(log, index) in logs" :key="index" class="log-item">
					<text class="log-time ble-mono">{{ formatLogTime(log) }}</text>
					<text class="log-type" :class="typeClass(log.type)">{{ displayType(log.type) }}</text>
					<text class="log-message ble-mono">{{ log.message }}</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
defineProps({
	logs: {
		type: Array,
		default: () => []
	},
	scrollTop: {
		type: Number,
		default: 0
	},
	title: {
		type: String,
		default: '通信日志'
	},
	caption: {
		type: String,
		default: '保留最近操作、返回结果和异常信息，便于复制排查。'
	},
	clearable: {
		type: Boolean,
		default: false
	},
	compact: {
		type: Boolean,
		default: false
	},
	variant: {
		type: String,
		default: 'dock' // dock | card
	},
	emptyTitle: {
		type: String,
		default: '还没有日志记录'
	},
	emptyDescription: {
		type: String,
		default: '连接设备、读写特征值或开启监听后，这里会持续追加通信日志。'
	},
	emptyImage: {
		type: String,
		default: '/static/placeholders/empty_log.png'
	}
});

defineEmits(['clear']);

const TYPE_CLASS = {
	'系统': 'sys',
	'错误': 'err',
	'读取': 'read',
	'写入': 'write',
	'接收': 'recv',
	'成功': 'ok',
	'操作': 'write',
	info: 'sys',
	error: 'err',
	warning: 'err',
	success: 'ok',
	receive: 'recv',
	send: 'write'
};

const TYPE_LABEL = {
	info: '系统',
	error: '错误',
	warning: '错误',
	success: '成功',
	receive: '接收',
	send: '写入'
};

const typeClass = (type) => TYPE_CLASS[type] || 'sys';
const displayType = (type) => TYPE_LABEL[type] || type || '系统';
const formatLogTime = (log) => log.timestamp || log.time || '--:--:--';
</script>

<style scoped>
.log-panel {
	flex: 1;
	display: flex;
	flex-direction: column;
	margin-top: 20rpx;
	border-radius: 30rpx 30rpx 0 0;
	background: var(--ble-gradient-surface);
	box-shadow: 0 -12rpx 34rpx rgba(17, 43, 78, 0.06);
	overflow: hidden;
}

.log-panel--card {
	margin-top: 0;
	border-radius: var(--ble-radius-lg);
	border: 1rpx solid var(--ble-line);
	box-shadow: var(--ble-shadow-soft);
}

.log-panel--compact .log-content {
	min-height: 280rpx;
	max-height: 420rpx;
	height: auto;
}

.panel-header {
	padding: 24rpx 28rpx 18rpx;
	border-bottom: 1rpx solid var(--ble-line-soft);
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
}

.title-group {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	min-width: 0;
	flex: 1;
}

.panel-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--ble-text);
}

.panel-caption {
	font-size: 22rpx;
	line-height: 1.5;
	color: var(--ble-text-muted);
}

.clear-action {
	flex-shrink: 0;
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	background: rgba(27, 109, 255, 0.08);
	color: var(--ble-brand);
	font-size: 22rpx;
	font-weight: 700;
}

.log-content {
	flex: 1;
	height: 0;
	padding: 18rpx 28rpx 26rpx;
}

.log-empty {
	min-height: 240rpx;
	margin-top: 0;
}

.log-item {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	padding: 12rpx 0;
	border-bottom: 1rpx solid var(--ble-line-faint);
	font-size: 22rpx;
	line-height: 1.65;
}

.log-item:last-child {
	border-bottom: none;
}

.log-time {
	flex-shrink: 0;
	color: var(--ble-text-muted);
}

.log-type {
	flex-shrink: 0;
	padding: 4rpx 10rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
}

.log-type.sys {
	background: rgba(27, 109, 255, 0.1);
	color: var(--ble-brand);
}

.log-type.err {
	background: rgba(242, 85, 95, 0.12);
	color: var(--ble-red);
}

.log-type.read {
	background: rgba(23, 199, 168, 0.12);
	color: #0e9c82;
}

.log-type.write {
	background: rgba(255, 159, 67, 0.14);
	color: #d37a12;
}

.log-type.recv {
	background: rgba(94, 118, 255, 0.12);
	color: #5662d6;
}

.log-type.ok {
	background: rgba(23, 199, 168, 0.12);
	color: #0e9c82;
}

.log-message {
	flex: 1;
	white-space: pre-wrap;
	word-break: break-all;
	color: var(--ble-text-subtle);
}
</style>
