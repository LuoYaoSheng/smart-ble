<template>
	<view class="content">
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
						<view class="picker-container">
							<text class="picker-text">{{modeOptions[modeIndex]}}</text>
							<text class="picker-icon">▼</text>
						</view>
					</picker>
			</view>

			<view class="form-item">
					<text class="label">发射功率：</text>
					<picker @change="onPowerChange" :value="powerIndex" :range="powerOptions">
						<view class="picker-container">
							<text class="picker-text">{{powerOptions[powerIndex]}}</text>
							<text class="picker-icon">▼</text>
						</view>
				</picker>
			</view>

				<view class="form-item switch-item">
					<text class="label">可连接：</text>
					<switch color="#007AFF" :checked="androidSettings.connectable" @change="onConnectableChange" />
			</view>
			
			<view class="form-item switch-item">
				<text class="label">包含设备名称：</text>
				<switch color="#007AFF" :checked="androidSettings.includeDeviceName" @change="onIncludeDeviceNameChange" />
			</view>
			
			<view class="form-item switch-item">
				<text class="label">跳过权限检查：</text>
				<switch color="#007AFF" :checked="skipPermissionCheck" @change="onSkipPermissionCheckChange" />
			</view>
			</template>
			</view>

		<view class="button-group">
			<button 
				:type="advertising ? 'warn' : 'primary'" 
				@click="toggleAdvertising" 
				:disabled="!isSupported"
				:class="{'button-advertising': advertising}"
			>
				{{ advertising ? '停止广播' : '开始广播' }}
				</button>
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
				// 微信小程序相关数据
				wxBLEServer: null,
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
				timeout: 0,
				// 权限控制
				skipPermissionCheck: true
			}
		},
		onLoad() {
			// 获取平台信息
			// #ifdef APP-PLUS
			const systemInfo = uni.getSystemInfoSync()
			this.platform = systemInfo.platform
			
			// 获取插件实例
			this.blePeripheral = uni.requireNativePlugin('LysBlePeripheral')
			
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

					// #ifdef MP-WEIXIN
			this.platform = 'weixin'
			this.deviceName = 'BLEToolkit_WeChat'
			this.serviceUUID = '0000FFE0-0000-1000-8000-00805F9B34FB'
			this.manufacturerId = '0001'
			this.manufacturerData = 'BLEToolkit_Test'
					// #endif

			// 检查设备支持状态
			this.checkSupport()
		},
		methods: {
			// 检查设备支持状态
			checkSupport() {
					// #ifdef APP-PLUS
				if (!this.blePeripheral) {
					this.addLog('错误：插件未初始化')
					this.isSupported = false
					return
				}

				this.blePeripheral.isSupported((result) => {
					this.isSupported = result.code === 0 && result.supported
					this.addLog(this.isSupported ? '设备支持低功耗蓝牙广播' : '设备不支持低功耗蓝牙广播')
					
					// 检查支持后再请求权限
					if (this.isSupported && this.platform === 'android') {
						this.requestAndroidPermissions()
					}
				})
					// #endif

				// #ifdef MP-WEIXIN
				// 微信小程序端检查BLE广播支持
				this.checkWxBleSupport()
				// #endif
			},
			
			// #ifdef MP-WEIXIN
			// 检查微信小程序BLE广播支持
			checkWxBleSupport() {
				wx.openBluetoothAdapter({
					mode: 'peripheral', // 使用从机模式打开蓝牙适配器
					success: (res) => {
						this.addLog('初始化蓝牙从机模式成功')
						this.isSupported = true
						
						// 创建BLE外围设备服务器
						this.createBLEPeripheralServer()
					},
					fail: (err) => {
						console.error('蓝牙初始化失败', err)
						this.addLog('错误：蓝牙从机模式初始化失败')
						this.addLog('错误信息：' + JSON.stringify(err))
						this.isSupported = false
					}
				})
			},
			
			// 创建BLE外围设备服务器
			createBLEPeripheralServer() {
				wx.createBLEPeripheralServer({
					success: (res) => {
						this.wxBLEServer = res.server
						this.addLog('创建BLE外围设备服务器成功')
					},
					fail: (err) => {
						console.error('创建BLE外围设备服务器失败', err)
						this.addLog('创建BLE外围设备服务器失败')
						this.addLog('错误信息：' + JSON.stringify(err))
					}
				})
			},
				// #endif

			// 请求Android所需权限
			requestAndroidPermissions() {
				if (this.platform !== 'android') return
				
				this.addLog('检查Android权限...')
				
				// 确保blePeripheral已初始化
				if (!this.blePeripheral) {
					this.addLog('错误：插件未初始化')
					return
				}
				
				// 不再使用不存在的setSkipPermissionCheck方法
				try {
					// 使用Android原生API检查权限
					const main = plus.android.runtimeMainActivity()
					const Context = plus.android.importClass("android.content.Context")
					const PackageManager = plus.android.importClass("android.content.pm.PackageManager")
					
					// 获取所有需要的权限
					const locationPermission = "android.permission.ACCESS_FINE_LOCATION"
					
					// 检查是否有位置权限（最关键的权限）
					if (main.checkSelfPermission(locationPermission) !== PackageManager.PERMISSION_GRANTED) {
						this.addLog('缺少位置权限')
						
						// 请求位置权限
						try {
							const permissions = [locationPermission]
							const Array = plus.android.importClass("java.lang.reflect.Array")
							const StringClass = plus.android.importClass("java.lang.String")
							
							// 创建字符串数组
							const permissionsArray = Array.newInstance(StringClass, permissions.length)
							for (let i = 0; i < permissions.length; i++) {
								Array.set(permissionsArray, i, permissions[i])
							}
							
							// 请求权限
							main.requestPermissions(permissionsArray, 1)
							
							// 提示用户
							this.addLog('正在申请位置权限，请在弹出的对话框中选择"允许"')
						} catch (e) {
							this.addLog('请求权限失败: ' + e.message)
							this.showPermissionDialog()
						}
					} else {
						this.addLog('已有位置权限')
					}
				} catch (e) {
					this.addLog('检查权限失败: ' + e.message)
					this.showPermissionDialog()
				}
			},
			
			// 显示权限提示对话框
			showPermissionDialog() {
				uni.showModal({
					title: '权限请求',
					content: '需要蓝牙和位置权限才能使用广播功能，请在系统设置中手动开启',
					confirmText: '去设置',
					success: (res) => {
						if (res.confirm) {
							// 打开应用设置页面
							this.openAppSettings()
						}
					}
				})
			},

			// 打开应用设置页面
			openAppSettings() {
				if (this.platform !== 'android') return
				
				try {
					const Intent = plus.android.importClass('android.content.Intent')
					const Settings = plus.android.importClass('android.provider.Settings')
					const Uri = plus.android.importClass('android.net.Uri')
					const mainActivity = plus.android.runtimeMainActivity()
					const packageName = mainActivity.getPackageName()
					
					const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
					const uri = Uri.fromParts('package', packageName, null)
					intent.setData(uri)
					mainActivity.startActivity(intent)
				} catch (e) {
					this.addLog('打开设置页面失败: ' + e.message)
				}
			},

			// 开始广播
			startAdvertising() {
				// #ifdef APP-PLUS
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
				
				// Android平台先检查权限
				if (this.platform === 'android') {
					try {
						// 检查蓝牙是否已开启
						const BluetoothAdapter = plus.android.importClass("android.bluetooth.BluetoothAdapter")
						const bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
						if (!bluetoothAdapter.isEnabled()) {
							this.addLog('蓝牙未开启，请先打开蓝牙')
							uni.showModal({
								title: '提示',
								content: '请先开启蓝牙',
								success: (res) => {
									if (res.confirm) {
										// 请求打开蓝牙
										try {
											const Intent = plus.android.importClass("android.content.Intent")
											const enableIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
											plus.android.runtimeMainActivity().startActivityForResult(enableIntent, 1)
										} catch (e) {
											this.addLog('请求开启蓝牙失败: ' + e.message)
										}
									}
								}
							})
							return
						}
						
						// 检查位置权限
						const context = plus.android.runtimeMainActivity()
						const PackageManager = plus.android.importClass("android.content.pm.PackageManager")
						const locationPermission = "android.permission.ACCESS_FINE_LOCATION"
						
						if (context.checkSelfPermission(locationPermission) !== PackageManager.PERMISSION_GRANTED) {
							this.addLog('缺少位置权限，Android需要位置权限才能使用蓝牙功能')
							this.showPermissionDialog()
							return
						}
						
						// 修改广播选项，移除不存在的skipPermissionCheck选项
						const options = {
							settings: {
								advertiseMode: this.modeIndex,
								txPowerLevel: this.powerIndex,
								connectable: this.androidSettings.connectable
							},
							advertiseData: {
								includeDeviceName: this.androidSettings.includeDeviceName,
								manufacturerId: parseInt(this.manufacturerId, 16),
								manufacturerData: this.manufacturerData
							}
						}
						
						// 执行广播
						this.blePeripheral.startAdvertising(options, (result) => {
							if (result.code === 0) {
								this.advertising = true
								this.addLog('Android广播启动成功')
							} else {
								this.addLog('Android广播启动失败：' + (result.message || '未知错误'))
								
								// 如果收到权限相关错误
								if (result.message && result.message.includes('permission')) {
									this.addLog('广播失败原因：缺少权限')
									this.showPermissionDialog()
								}
							}
						})
					} catch (e) {
						this.addLog('处理蓝牙状态时出错: ' + e.message)
						return
					}
				} else if (this.platform === 'ios') {
					// iOS直接执行广播
					this.startIosBroadcast()
				}
				// #endif
				
				// #ifdef MP-WEIXIN
				// 微信小程序广播逻辑
				this.startWxAdvertising()
				// #endif
			},
			
			// #ifdef APP-PLUS
			// 检查Android权限并回调结果
			checkAndroidPermissions(callback) {
				if (this.platform !== 'android') {
					callback(true)
					return
				}
				
				try {
					// 使用Android原生API检查权限
					const main = plus.android.runtimeMainActivity()
					const PackageManager = plus.android.importClass("android.content.pm.PackageManager")
					
					// 检查位置权限（最关键的权限）
					const hasLocationPermission = main.checkSelfPermission("android.permission.ACCESS_FINE_LOCATION") === PackageManager.PERMISSION_GRANTED
					
					if (hasLocationPermission) {
						this.addLog('已有位置权限')
						callback(true)
					} else {
						this.addLog('缺少位置权限')
						callback(false)
						this.showPermissionDialog()
					}
				} catch (e) {
					this.addLog('检查权限失败: ' + e.message)
					callback(false)
				}
			},
			
			// 开始Android广播
			startAndroidBroadcast() {
				// 构建Android广播参数
				const options = {
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
				
				// 执行广播
				this.blePeripheral.startAdvertising(options, (result) => {
					if (result.code === 0) {
						this.advertising = true
						this.addLog('Android广播启动成功')
					} else {
						this.addLog('Android广播启动失败：' + (result.message || '未知错误'))
					}
				})
			},
			
			// 开始iOS广播
			startIosBroadcast() {
				// 构建iOS广播参数
				const options = {
					localName: this.deviceName,
					services: [this.serviceUUID],
					manufacturerData: {
						id: parseInt(this.manufacturerId, 16),
						data: this.manufacturerData
					}
				}
				
				// 执行广播
				this.blePeripheral.startAdvertising(options, (result) => {
					if (result.code === 0) {
						this.advertising = true
						this.addLog('iOS广播启动成功')
					} else {
						this.addLog('iOS广播启动失败：' + (result.message || '未知错误'))
					}
				})
			},
			// #endif

			// #ifdef MP-WEIXIN
			// 微信小程序开始广播
			startWxAdvertising() {
				if (!this.wxBLEServer) {
					this.addLog('错误：BLE外围设备服务器未初始化')
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
				
				// 构建广播参数 - 注意数据大小限制
				// 蓝牙广播数据总量限制为31字节，设备名称也占用空间
				let shortenedDeviceName = this.deviceName
				if (shortenedDeviceName.length > 8) {
					shortenedDeviceName = shortenedDeviceName.substring(0, 8)
					this.addLog('设备名称过长，已截断为: ' + shortenedDeviceName)
				}
				
				// 缩短厂商数据
				let manufacturerData = null
				if (this.manufacturerData && this.manufacturerId) {
					// 限制厂商数据长度避免超出广播限制
					let shortenedData = this.manufacturerData
					if (shortenedData.length > 4) {
						shortenedData = shortenedData.substring(0, 4)
						this.addLog('厂商数据过长，已截断为: ' + shortenedData)
					}
					
					manufacturerData = [{
						manufacturerId: parseInt(this.manufacturerId, 16),
						manufacturerSpecificData: this.strToArrayBuffer(shortenedData)
					}]
				}
				
				// 构建广播请求 - 减少数据量
				const advertiseRequest = {
					deviceName: shortenedDeviceName,
					// 最多只包含一个服务UUID
					serviceUuids: [this.serviceUUID]
				}
				
				// 仅在需要厂商数据时添加
				if (manufacturerData) {
					advertiseRequest.manufacturerData = manufacturerData
				}
				
				this.wxBLEServer.startAdvertising({
					advertiseRequest: advertiseRequest,
					powerLevel: this.getPowerLevel(),
					success: (res) => {
						console.log('微信小程序广播启动成功', res)
						this.advertising = true
						this.addLog('微信小程序广播启动成功')
								},
								fail: (err) => {
						console.error('微信小程序广播启动失败', err)
						this.addLog('微信小程序广播启动失败：' + JSON.stringify(err))
						
						// 尝试简化配置再次尝试
						if (err.errCode === 10008) {
							this.addLog('尝试简化广播数据...')
							this.retryWithSimpleAdvertising()
						}
					}
				})
			},
			
			// 使用最简化配置重试广播
			retryWithSimpleAdvertising() {
				if (!this.wxBLEServer) return
				
				// 最简化的广播配置
				const simpleRequest = {
					deviceName: this.deviceName.substring(0, 5), // 极短的设备名
					serviceUuids: [this.serviceUUID.split('-')[0]] // 使用短UUID
				}
				
				this.wxBLEServer.startAdvertising({
					advertiseRequest: simpleRequest,
					powerLevel: 'low', // 使用低功率减少干扰
					success: (res) => {
						this.advertising = true
						this.addLog('简化广播启动成功')
					},
					fail: (err) => {
						this.addLog('简化广播也失败：' + JSON.stringify(err))
					}
				})
			},
			
			// 将字符串转换为ArrayBuffer
			strToArrayBuffer(str) {
				const buf = new ArrayBuffer(str.length)
				const bufView = new Uint8Array(buf)
				for (let i = 0; i < str.length; i++) {
					bufView[i] = str.charCodeAt(i)
				}
				return buf
			},
			
			// 获取对应的功率级别
			getPowerLevel() {
				const powerLevels = ['low', 'medium', 'high', 'high']
				return powerLevels[this.powerIndex] || 'high'
			},
			// #endif

			// 停止广播
			stopAdvertising() {
				// #ifdef APP-PLUS
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
				// #endif

				// #ifdef MP-WEIXIN
				// 微信小程序停止广播
				this.stopWxAdvertising()
				// #endif
			},

			// #ifdef MP-WEIXIN
			// 微信小程序停止广播
			stopWxAdvertising() {
				if (!this.wxBLEServer) {
					this.addLog('错误：BLE外围设备服务器未初始化')
					return
				}
				
				this.wxBLEServer.stopAdvertising({
					success: (res) => {
						this.advertising = false
						this.addLog('微信小程序广播停止成功')
					},
					fail: (err) => {
						this.addLog('微信小程序广播停止失败：' + JSON.stringify(err))
					}
				})
			},
			// #endif

			// 检查广播状态
			checkAdvertisingStatus() {
				// #ifdef APP-PLUS
				if (!this.blePeripheral) {
					this.addLog('错误：插件未初始化')
					return false
				}

				this.blePeripheral.isAdvertising((result) => {
					this.advertising = result.code === 0 && result.advertising
					this.addLog(this.advertising ? '当前正在广播中' : '当前未在广播')
				})
				// #endif
				
				// #ifdef MP-WEIXIN
				// 微信小程序检查广播状态
				this.addLog(this.advertising ? '当前正在广播中' : '当前未在广播')
				// #endif
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

			// 包含设备名称设置
			onIncludeDeviceNameChange(e) {
				this.androidSettings.includeDeviceName = e.detail.value
				if (this.androidSettings.includeDeviceName) {
					this.addLog('警告：包含设备名称会占用大量广播空间，可能导致广播失败')
				}
			},

			// 设置跳过权限检查
			onSkipPermissionCheckChange(e) {
				this.skipPermissionCheck = e.detail.value
				this.addLog(`跳过权限检查: ${this.skipPermissionCheck ? '是' : '否'}`)
				// 不再调用不存在的方法，仅记录设置变更
			},

			// 添加日志方法
			addLog(message) {
				const time = new Date().toLocaleTimeString()
				this.log = `[${time}] ${message}\n${this.log}`
			},

			// 添加新的直接启动广播方法，不依赖权限API
			startAndroidBroadcastDirect() {
				// 构建Android广播参数
				const options = {
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
				
				// 执行广播
				this.blePeripheral.startAdvertising(options, (result) => {
					console.log(  result );
					if (result.code === 0) {
						this.advertising = true
						this.addLog('Android广播启动成功')
					} else {
						this.addLog('Android广播启动失败：' + (result.message || '未知错误'))
						if (result.message && result.message.includes('permission')) {
							this.addLog('广播失败原因：缺少权限')
							uni.showModal({
								title: '缺少必要权限',
								content: '蓝牙广播需要位置和蓝牙权限，请在系统设置中授予权限',
								confirmText: '去设置',
								success: (res) => {
									if (res.confirm) {
										this.openAppSettings()
									}
								}
							})
						}
					}
				})
			},
			
			// 切换广播状态
			toggleAdvertising() {
				if (this.advertising) {
					this.stopAdvertising()
			} else {
					this.startAdvertising()
			}
			},
		},
		onUnload() {
			// 页面卸载时停止广播
			// #ifdef APP-PLUS
			if (this.advertising && this.blePeripheral) {
				this.blePeripheral.stopAdvertising()
			}
			// #endif
			
			// #ifdef MP-WEIXIN
			// 停止微信小程序广播并关闭适配器
			if (this.advertising && this.wxBLEServer) {
				this.wxBLEServer.stopAdvertising()
			}
			wx.closeBluetoothAdapter()
			// #endif
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
	
	.switch-item {
		margin-top: 5px;
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

	.picker-container {
		flex: 1;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: linear-gradient(to bottom, #ffffff, #f9f9f9);
		box-shadow: 0 1px 2px rgba(0,0,0,0.05);
	}
	
	.picker-text {
		font-size: 14px;
		color: #333;
	}

	.picker-icon {
		font-size: 12px;
		color: #999;
		margin-left: 5px;
	}
	
	/* 兼容旧的picker样式 */
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

	.button-advertising {
		background: linear-gradient(to right, #ff3b30, #ff9500) !important;
		box-shadow: 0 2px 6px rgba(255, 59, 48, 0.4);
	}
</style>