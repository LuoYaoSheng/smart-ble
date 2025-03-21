<template>
	<view class="container">
		<view class="version-list">
			<view class="version-item" v-for="(version, index) in versionHistory" :key="index">
				<view class="version-header">
					<text class="version-name">{{version.version}}</text>
					<text class="version-date">{{version.date}}</text>
				</view>
				<view class="version-content">
					<view class="update-item" v-for="(item, idx) in version.updates" :key="idx">
						<text class="update-type" :class="getTypeClass(item.type)">{{item.type}}</text>
						<text class="update-text">{{item.content}}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				versionHistory: [{
					version: 'v1.0.1',
					date: '2024-03-21',
					updates: [{
						type: '新增',
						content: '支持 UTF-8 编码的文本数据写入'
					}, {
						type: '新增',
						content: '支持 HEX 格式数据写入'
					}, {
						type: '优化',
						content: '优化写入数据模态框位置'
					}, {
						type: '优化',
						content: '优化日志显示区域高度'
					}, {
						type: '优化',
						content: '改进数据格式切换体验'
					}]
				}, {
					version: 'v1.0.0',
					date: '2024-03-14',
					updates: [{
						type: '新增',
						content: '支持自定义广播数据'
					}, {
						type: '新增',
						content: '支持设备过滤功能'
					}, {
						type: '优化',
						content: '优化蓝牙连接稳定性'
					}]
				}, {
					version: 'v0.9.0',
					date: '2024-03-01',
					updates: [{
						type: '新增',
						content: '支持BLE设备扫描'
					}, {
						type: '新增',
						content: '支持设备连接与断开'
					}, {
						type: '新增',
						content: '支持服务与特征值读写'
					}]
				}, {
					version: 'v0.8.0',
					date: '2024-02-15',
					updates: [{
						type: '新增',
						content: '项目初始化'
					}, {
						type: '新增',
						content: '基础界面设计'
					}]
				}]
			}
		},
		methods: {
			getTypeClass(type) {
				const typeMap = {
					'新增': 'type-new',
					'优化': 'type-optimize',
					'修复': 'type-fix'
				};
				return typeMap[type] || '';
			}
		},
		// #ifdef MP-WEIXIN
		onShareAppMessage() {
			return {
				title: '智能蓝牙助手',
				path: '/pages/about/version',
				imageUrl: '/static/logo.png'
			}
		},
		onShareTimeline() {
			return {
				title: '智能蓝牙助手',
				query: '',
				imageUrl: '/static/logo.png'
			}
		}
		// #endif
	}
</script>

<style>
	.container {
		padding: 30rpx;
		background-color: #f7f8fa;
		min-height: 100vh;
	}
	
	.version-list {
		background-color: #fff;
		border-radius: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
		overflow: hidden;
	}
	
	.version-item {
		padding: 30rpx;
		border-bottom: 2rpx solid #f5f5f5;
	}
	
	.version-item:last-child {
		border-bottom: none;
	}
	
	.version-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}
	
	.version-name {
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
	}
	
	.version-date {
		font-size: 24rpx;
		color: #999;
	}
	
	.version-content {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}
	
	.update-item {
		display: flex;
		align-items: flex-start;
		gap: 12rpx;
	}
	
	.update-type {
		font-size: 24rpx;
		padding: 4rpx 12rpx;
		border-radius: 6rpx;
		font-weight: 500;
	}
	
	.update-type.type-new {
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		color: #fff;
	}
	
	.update-type.type-optimize {
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
		color: #fff;
	}
	
	.update-type.type-fix {
		background: linear-gradient(135deg, #FF9500 0%, #FF9F0A 100%);
		color: #fff;
	}
	
	.update-text {
		font-size: 28rpx;
		color: #666;
		flex: 1;
	}
</style> 