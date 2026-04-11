<template>
	<view class="log-panel">
		<view class="panel-header">
			<text class="panel-title">通信日志</text>
		</view>
		<scroll-view class="log-content" scroll-y :scroll-top="scrollTop">
			<view v-for="(log, index) in logs" :key="index" class="log-item">
				<text class="log-time">{{log.time}}</text>
				<text class="log-type" :class="log.type">{{log.type}}</text>
				<text class="log-message">{{log.message}}</text>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
const props = defineProps({
	logs: {
		type: Array,
		default: () => []
	},
	scrollTop: {
		type: Number,
		default: 0
	}
});
</script>

<style scoped>
.log-panel { flex: 1; display: flex; flex-direction: column; background-color: #fff; margin-top: 20rpx; border-top-left-radius: 24rpx; border-top-right-radius: 24rpx; box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.04); overflow: hidden; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 30rpx; background-color: #f8f8f8; border-bottom: 2rpx solid #eee; }
.panel-title { font-size: 30rpx; font-weight: bold; color: #333; }
.log-content { flex: 1; padding: 20rpx 30rpx; height: 0; min-height: 200rpx; }
.log-item { margin-bottom: 16rpx; display: flex; align-items: flex-start; font-size: 24rpx; font-family: monospace; line-height: 1.4; word-break: break-all; }
.log-time { color: #999; margin-right: 12rpx; flex-shrink: 0; }
.log-type { padding: 2rpx 8rpx; border-radius: 6rpx; margin-right: 12rpx; font-weight: bold; flex-shrink: 0; font-size: 20rpx; }
.log-type.系统 { background-color: rgba(0, 122, 255, 0.1); color: #007AFF; }
.log-type.错误 { background-color: rgba(255, 59, 48, 0.1); color: #FF3B30; }
.log-type.读取 { background-color: rgba(52, 199, 89, 0.1); color: #34C759; }
.log-type.写入 { background-color: rgba(255, 149, 0, 0.1); color: #FF9500; }
.log-type.接收 { background-color: rgba(88, 86, 214, 0.1); color: #5856D6; }
.log-message { color: #333; flex: 1; white-space: pre-wrap; }
</style>
