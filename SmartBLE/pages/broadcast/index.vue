<template>
	<view class="container">
		<view class="title">BLE外设广播示例</view>

		<!-- 状态显示 -->
		<view class="status-section">
			<view class="status-item">
				<text class="label">设备支持状态：</text>
				<text :class="['value', supported ? 'success' : 'error']">
					{{ supported ? '支持' : '不支持' }}
				</text>
			</view>
			<view class="status-item">
				<text class="label">广播状态：</text>
				<text :class="['value', isAdvertising ? 'success' : 'info']">
					{{ isAdvertising ? '正在广播' : '未广播' }}
				</text>
			</view>
		</view>

		<!-- 配置表单 -->
		<view class="form-section">
			<view class="form-item">
				<text class="label">本地名称</text>
				<input type="text" v-model="formData.localName" placeholder="请输入设备名称" class="input" />
			</view>

			<view class="form-item">
				<text class="label">服务UUID</text>
				<input type="text" v-model="formData.serviceUUID" placeholder="请输入服务UUID" class="input" />
			</view>

			<view class="form-item">
				<text class="label">厂商ID</text>
				<input type="text" v-model="formData.manufacturerId" placeholder="请输入厂商ID(十六进制)" class="input" />
			</view>

			<view class="form-item">
				<text class="label">厂商数据</text>
				<input type="text" v-model="formData.manufacturerData" placeholder="请输入厂商数据" class="input" />
			</view>
		</view>

		<!-- 操作按钮 -->
		<view class="button-section">
			<button class="btn check-btn" @click="checkSupport" :disabled="isAdvertising">
				检查设备支持
			</button>

			<button class="btn start-btn" @click="startAdvertising" :disabled="!supported || isAdvertising">
				开始广播
			</button>

			<button class="btn stop-btn" @click="stopAdvertising" :disabled="!isAdvertising">
				停止广播
			</button>
		</view>

		<!-- 日志显示 -->
		<view class="log-section">
			<view class="log-title">操作日志</view>
			<scroll-view scroll-y class="log-content" :scroll-top="scrollTop" @scrolltoupper="loadMoreLogs">
				<view v-for="(log, index) in logs" :key="index" class="log-item">
					{{ log }}
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				blePeripheral: null,
				supported: false,
				isAdvertising: false,
				formData: {
					localName: 'LysBleDevice',
					serviceUUID: 'FFE0',
					manufacturerId: '0A00',
					manufacturerData: 'LysBleTest'
				},
				logs: [
					'示例日志：',
					'1. 点击"检查设备支持"按钮检查设备是否支持BLE广播',
					'2. 可以修改默认配置或使用默认值',
					'3. 点击"开始广播"按钮开始广播',
					'4. 使用其他BLE扫描工具（如nRF Connect）扫描设备',
					'5. 点击"停止广播"按钮停止广播'
				],
				scrollTop: 0
			}
		},
		onLoad() {
			// 获取插件实例
			this.blePeripheral = uni.requireNativePlugin('LysBlePeripheral')
			this.addLog('插件初始化完成')

			// 自动检查设备支持状态
			this.checkSupport()
		},
		methods: {
			// 添加日志
			addLog(message) {
				const time = new Date().toLocaleTimeString()
				this.logs.unshift('[' + time + '] ' + message)
				this.scrollTop = 0
			},

			// 加载更多日志
			loadMoreLogs() {
				// 可以在这里实现加载历史日志的逻辑
			},

			// 检查设备支持
			checkSupport() {
				this.addLog('正在检查设备支持状态...')
				this.blePeripheral.isSupported((result) => {
					this.supported = result.code === 0 && result.supported
					this.addLog('设备支持状态: ' + (this.supported ? '支持' : '不支持'))
				})
			},

			// 开始广播
			startAdvertising() {
				if (!this.supported) {
					uni.showToast({
						title: '设备不支持BLE广播',
						icon: 'none'
					})
					return
				}

				this.addLog('正在启动广播...')

				// 构建广播选项
				const options = {
					localName: this.formData.localName,
					services: [this.formData.serviceUUID],
					manufacturerData: {
						id: parseInt(this.formData.manufacturerId, 16),
						data: this.formData.manufacturerData
					}
				}

				this.blePeripheral.startAdvertising(options, (result) => {
					if (result.code === 0) {
						this.isAdvertising = true
						this.addLog('广播启动成功')
					} else {
						this.addLog('广播启动失败: ' + result.message)
						uni.showToast({
							title: result.message,
							icon: 'none'
						})
					}
				})
			},

			// 停止广播
			stopAdvertising() {
				this.addLog('正在停止广播...')
				this.blePeripheral.stopAdvertising((result) => {
					if (result.code === 0) {
						this.isAdvertising = false
						this.addLog('广播已停止')
					} else {
						this.addLog('停止广播失败: ' + result.message)
						uni.showToast({
							title: result.message,
							icon: 'none'
						})
					}
				})
			}
		},
		onUnload() {
			// 页面卸载时停止广播
			if (this.isAdvertising) {
				this.stopAdvertising()
			}
		}
	}
</script>

<style>
	.container {
		padding: 20px;
	}

	.title {
		font-size: 20px;
		font-weight: bold;
		text-align: center;
		margin-bottom: 20px;
	}

	.status-section {
		background-color: #f5f5f5;
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 20px;
	}

	.status-item {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10px;
	}

	.status-item:last-child {
		margin-bottom: 0;
	}

	.label {
		color: #666;
	}

	.value {
		font-weight: bold;
	}

	.success {
		color: #4CAF50;
	}

	.error {
		color: #F44336;
	}

	.info {
		color: #2196F3;
	}

	.form-section {
		background-color: #fff;
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 20px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.form-item {
		margin-bottom: 15px;
	}

	.form-item:last-child {
		margin-bottom: 0;
	}

	.form-item .label {
		display: block;
		margin-bottom: 5px;
	}

	.input {
		width: 100%;
		height: 40px;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 0 10px;
		font-size: 14px;
	}

	.button-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
	}

	.btn {
		width: 100%;
		height: 44px;
		line-height: 44px;
		text-align: center;
		border-radius: 4px;
		font-size: 16px;
		color: #fff;
	}

	.check-btn {
		background-color: #2196F3;
	}

	.start-btn {
		background-color: #4CAF50;
	}

	.stop-btn {
		background-color: #F44336;
	}

	.btn[disabled] {
		background-color: #ccc;
		opacity: 0.7;
	}

	.log-section {
		background-color: #fff;
		padding: 15px;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.log-title {
		font-size: 16px;
		font-weight: bold;
		margin-bottom: 10px;
	}

	.log-content {
		height: 200px;
		background-color: #f5f5f5;
		padding: 10px;
		border-radius: 4px;
	}

	.log-item {
		font-size: 12px;
		color: #666;
		margin-bottom: 5px;
		word-break: break-all;
	}

	.log-item:last-child {
		margin-bottom: 0;
	}
</style>