<template>
	<view class="log-panel">
		<view class="panel-header">
			<view class="title-group">
				<text class="panel-title">通信日志</text>
				<text class="panel-caption">保留最近操作、返回结果和异常信息，便于复制排查。</text>
			</view>
		</view>

		<scroll-view class="log-content" scroll-y :scroll-top="scrollTop">
			<view v-if="logs.length === 0" class="ble-empty-card log-empty">
				<image src="/static/placeholders/empty_log.png" class="ble-empty-image" mode="aspectFit"></image>
				<text class="ble-empty-title">还没有日志记录</text>
				<text class="ble-empty-copy">连接设备、读写特征值或开启监听后，这里会持续追加通信日志。</text>
			</view>

			<view v-else>
				<view v-for="(log, index) in logs" :key="index" class="log-item">
					<text class="log-time ble-mono">{{ formatLogTime(log) }}</text>
					<text class="log-type" :class="typeClass(log.type)">{{ log.type }}</text>
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
	}
});

const TYPE_CLASS = {
	'系统': 'sys',
	'错误': 'err',
	'读取': 'read',
	'写入': 'write',
	'接收': 'recv',
	'成功': 'ok'
};

const typeClass = (type) => TYPE_CLASS[type] || 'sys';
const formatLogTime = (log) => log.timestamp || log.time || '--:--:--';
</script>

<style scoped>
.log-panel {
	flex: 1;
	display: flex;
	flex-direction: column;
	margin-top: 20rpx;
	border-radius: 30rpx 30rpx 0 0;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(242, 248, 255, 0.96) 100%);
	box-shadow: 0 -12rpx 34rpx rgba(17, 43, 78, 0.06);
	overflow: hidden;
}

.panel-header {
	padding: 24rpx 28rpx 18rpx;
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.08);
}

.title-group {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
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

.log-content {
	flex: 1;
	height: 0;
	padding: 18rpx 28rpx 26rpx;
}

.log-empty {
	min-height: 280rpx;
}

.log-item {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	padding: 12rpx 0;
	border-bottom: 1rpx solid rgba(20, 76, 136, 0.06);
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
