<template>
	<view class="content">
		<view class="title">
			<text>BLE Toolkit+ 广播工具</text>
			<text class="platform">({{platform}})</text>
			</view>

		<view class="form">
			<!-- 基础参数 -->
			<view class="form-item">
				<text class="label">设备名称：</text>
				<input type="text" v-model="deviceName" placeholder="请输入设备名称" />
			</view>

			<view class="form-item">
				<text class="label">服务UUID：</text>
				<input type="text" v-model="serviceUUID" placeholder="请输入服务UUID" />
			</view>

			<view class="form-item">
				<text class="label">厂商ID：</text>
				<input type="text" v-model="manufacturerId" placeholder="请输入厂商ID(hex)" />
			</view>

			<view class="form-item">
				<text class="label">厂商数据：</text>
				<input type="text" v-model="manufacturerData" placeholder="请输入厂商数据" />
			</view>

			<!-- Android 特有参数 -->
			<template v-if="platform === 'android'">
			<view class="form-item">
					<text class="label">广播模式：</text>
					<picker @change="onModeChange" :value="modeIndex" :range="modeOptions">
						<view class="picker">{{modeOptions[modeIndex]}}</view>
				</picker>
			</view>

				<view class="form-item">
					<text class="label">发射功率：</text>
					<picker @change="onPowerChange" :value="powerIndex" :range="powerOptions">
						<view class="picker">{{powerOptions[powerIndex]}}</view>
					</picker>
			</view>

				<view class="form-item">
					<text class="label">可连接：</text>
					<switch :checked="androidSettings.connectable" @change="onConnectableChange" />
				</view>
			</template>
			</view>

		<view class="button-group">
			<button type="primary" @click="startAdvertising" :disabled="!isSupported">开始广播</button>
			<button type="default" @click="stopAdvertising" :disabled="!advertising">停止广播</button>
			<button type="default" @click="checkAdvertisingStatus">检查状态</button>
			</view>

		<view class="status">
			<text>设备支持状态：{{isSupported ? '支持' : '不支持'}}</text>
			<text>广播状态：{{advertising ? '正在广播' : '已停止'}}</text>
		</view>

		<view class="log">
			<text class="log-title">日志信息：</text>
			<scroll-view class="log-content" scroll-y>
				<text>{{log}}</text>
			</scroll-view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				advertising: false,
				log: '',
				blePeripheral: null,
				platform: '',
				isSupported: false,
				// Android 参数
				androidSettings: {
					advertiseMode: 2, // 0-低功耗，1-平衡，2-低延迟
					txPowerLevel: 3, // 0-超低，1-低，2-中，3-高
					connectable: true
				},
				androidAdvertiseData: {
				includeDeviceName: true,
					manufacturerId: 0x0001,
					manufacturerData: "BLEToolkit_Test"
				},
				// iOS 参数
				iosSettings: {
					localName: "BLEToolkit_iOS",
					services: ["FFE0"],
					manufacturerData: {
						id: 0x0A00,
						data: "BLEToolkit_Test"
					}
				},
				// UI 显示参数
				deviceName: '',
				serviceUUID: '',
				modeIndex: 2, // 默认低延迟模式
				powerIndex: 3, // 默认高功率
				modeOptions: ['低功耗', '平衡', '低延迟'],
				powerOptions: ['超低功率', '低功率', '中功率', '高功率'],
				manufacturerId: '',
				manufacturerData: '',
				timeout: 0
			}
		},
		onLoad() {
			// 获取平台信息
					// #ifdef APP-PLUS
			const systemInfo = uni.getSystemInfoSync()
			this.platform = systemInfo.platform
			// 根据平台设置默认值
			if (this.platform === 'android') {
				this.deviceName = 'BLEToolkit_Android'
				this.serviceUUID = '0000FFE0-0000-1000-8000-00805F9B34FB'
				this.manufacturerId = '0001'
				this.manufacturerData = 'BLEToolkit_Test'
			} else if (this.platform === 'ios') {
				this.deviceName = 'BLEToolkit_iOS'
				this.serviceUUID = 'FFE0'
				this.manufacturerId = '0A00'
				this.manufacturerData = 'BLEToolkit_Test'
					}
					// #endif

			// 获取插件实例
			this.blePeripheral = uni.requireNativePlugin('LysBlePeripheral')

			// 检查设备支持状态
			this.checkSupport()
		},
		methods: {
			// 检查设备支持状态
			checkSupport() {
				if (!this.blePeripheral) {
					this.addLog('错误：插件未初始化')
					this.isSupported = false
					return
				}

				this.blePeripheral.isSupported((result) => {
					this.isSupported = result.code === 0 && result.supported
					this.addLog(this.isSupported ? '设备支持低功耗蓝牙广播' : '设备不支持低功耗蓝牙广播')
				})
			},

			// 开始广播
			startAdvertising() {
				if (!this.blePeripheral) {
					this.addLog('错误：插件未初始化')
					return
				}

				// 验证参数
				if (!this.deviceName) {
					this.addLog('错误：请输入设备名称')
					return
				}

				if (!this.serviceUUID) {
					this.addLog('错误：请输入服务UUID')
					return
				}

				// 构建广播参数
				let options = {}

				if (this.platform === 'android') {
					// Android 平台参数
					options = {
						settings: {
							advertiseMode: this.modeIndex,
							txPowerLevel: this.powerIndex,
							connectable: this.androidSettings.connectable
						},
						advertiseData: {
							includeDeviceName: true,
							manufacturerId: parseInt(this.manufacturerId, 16),
							manufacturerData: this.manufacturerData
						}
					}
				} else if (this.platform === 'ios') {
					// iOS 平台参数
					options = {
						localName: this.deviceName,
						services: [this.serviceUUID],
						manufacturerData: {
							id: parseInt(this.manufacturerId, 16),
							data: this.manufacturerData
						}
					}
				}

				this.blePeripheral.startAdvertising(options, (result) => {
					if (result.code === 0) {
						this.advertising = true
						this.addLog('广播启动成功')
					} else {
						this.addLog('广播启动失败：' + (result.message || '未知错误'))
					}
				})
			},

			// 停止广播
			stopAdvertising() {
				if (!this.blePeripheral) {
					this.addLog('错误：插件未初始化')
					return
				}

				this.blePeripheral.stopAdvertising((result) => {
					if (result.code === 0) {
						this.advertising = false
						this.addLog('停止广播成功')
					} else {
						this.addLog('停止广播失败：' + (result.message || '未知错误'))
					}
				})
			},

			// 检查广播状态
			checkAdvertisingStatus() {
				if (!this.blePeripheral) {
					this.addLog('错误：插件未初始化')
					return false
				}

				this.blePeripheral.isAdvertising((result) => {
					this.advertising = result.code === 0 && result.advertising
					this.addLog(this.advertising ? '当前正在广播中' : '当前未在广播')
				})
			},

			// 广播模式选择
			onModeChange(e) {
				this.modeIndex = parseInt(e.detail.value)
			},

			// 发射功率选择
			onPowerChange(e) {
				this.powerIndex = parseInt(e.detail.value)
			},

			// 连接状态切换
			onConnectableChange(e) {
				this.androidSettings.connectable = e.detail.value
			},

			// 添加日志方法
			addLog(message) {
				const time = new Date().toLocaleTimeString()
				this.log = `[${time}] ${message}\n${this.log}`
			}
		},
		onUnload() {
			// 页面卸载时停止广播
			if (this.advertising && this.blePeripheral) {
				this.blePeripheral.stopAdvertising()
			}
		}
	}
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px;
	}

	.title {
		font-size: 20px;
		font-weight: bold;
		margin-bottom: 30px;
		display: flex;
		align-items: center;
	}

	.platform {
		font-size: 14px;
		color: #666;
		margin-left: 10px;
	}

	.form {
		width: 100%;
		margin-bottom: 30px;
	}

	.form-item {
		display: flex;
		align-items: center;
		margin-bottom: 15px;
	}

	.label {
		width: 80px;
		font-size: 14px;
		color: #666;
	}

	input {
		flex: 1;
		height: 40px;
		padding: 0 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
	}

	.picker {
		flex: 1;
		height: 40px;
		line-height: 40px;
		padding: 0 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
	}

	.button-group {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
		width: 100%;
	}

	.button-group button {
		width: 100%;
	}

	.button-group button[disabled] {
		opacity: 0.5;
	}

	.status {
		margin-bottom: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
	}

	.log {
		width: 100%;
		padding: 10px;
		background-color: #f5f5f5;
		border-radius: 5px;
	}

	.log-title {
		font-size: 14px;
		color: #666;
		margin-bottom: 10px;
		display: block;
	}

	.log-content {
		max-height: 200px;
	}

	.log-content text {
		display: block;
		margin-bottom: 5px;
		font-size: 12px;
		color: #333;
		white-space: pre-wrap;
		word-break: break-all;
	}
</style>