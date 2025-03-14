<template>
	<view class="container">
		<!-- 广播设置面板 -->
		<view class="broadcast-panel">
			<text class="panel-title">广播设置</text>

			<!-- #ifdef MP-WEIXIN -->
			<!-- 快速测试按钮 -->
			<view class="preset-buttons">
				<button v-for="(preset, index) in presetData" :key="index" class="preset-button"
					@click="applyPreset(index)">
					{{preset.name}}
				</button>
			</view>
			<!-- #endif -->

			<view class="form-item">
				<text class="form-label">设备名称</text>
				<input type="text" v-model="broadcastName" placeholder="请输入设备名称" class="form-input" />
			</view>

			<view class="form-item">
				<text class="form-label">服务UUID</text>
				<input type="text" v-model="serviceUuid" placeholder="请输入服务UUID" class="form-input" />
			</view>

			<view class="form-item">
				<text class="form-label">厂商ID (十六进制)</text>
				<input type="text" v-model="manufacturerId" placeholder="请输入厂商ID" class="form-input" />
			</view>

			<view class="form-item">
				<text class="form-label">厂商数据 (十六进制)</text>
				<input type="text" v-model="manufacturerData" placeholder="请输入厂商数据" class="form-input" />
			</view>

			<view class="form-item">
				<text class="form-label">发送功率</text>
				<picker :range="powerLevels" @change="onPowerLevelChange">
					<view class="form-input">{{powerLevels[selectedPowerLevel]}}</view>
				</picker>
			</view>

			<view class="form-switch">
				<text>是否可连接</text>
				<switch :checked="connectable" @change="onConnectableChange" color="#007AFF" />
			</view>

			<view class="form-switch">
				<text>包含设备名称</text>
				<switch :checked="includeDeviceName" @change="onIncludeDeviceNameChange" color="#007AFF" />
			</view>

			<view class="form-switch">
				<text>包含发射功率</text>
				<switch :checked="includeTxPowerLevel" @change="onIncludeTxPowerLevelChange" color="#007AFF" />
			</view>

			<view class="action-buttons">
				<button type="primary" @click="startBroadcast" :disabled="isBroadcasting">
					{{isBroadcasting ? '广播中...' : '开始广播'}}
				</button>
				<button type="default" @click="stopBroadcast" v-if="isBroadcasting">停止广播</button>
			</view>
		</view>

		<!-- 日志面板 -->
		<view class="log-panel">
			<view class="log-header">
				<text class="log-title">操作日志</text>
				<view class="log-actions">
					<button size="mini" @click="clearLogs">清除</button>
				</view>
			</view>
			<scroll-view class="log-content" scroll-y>
				<view v-for="(log, index) in logs" :key="index" class="log-item">
					<text class="log-time">{{log.time}}</text>
					<text class="log-type" :class="log.type">{{log.type}}</text>
					<text class="log-message">{{log.message}}</text>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
	// #ifdef APP-PLUS
	const bleModule = uni.requireNativePlugin('BLE-Module');
	// #endif

	export default {
		data() {
			return {
				isBroadcasting: false,
				broadcastName: 'BLE-Device',
				serviceUuid: 'FFF0',
				manufacturerId: '004E',
				manufacturerData: '4E001101',
				powerLevels: ['极低', '低', '中', '高'],
				selectedPowerLevel: 3,
				connectable: false,
				includeDeviceName: true,
				includeTxPowerLevel: true,
				logs: [],
				isInitialized: false,
				// #ifdef MP-WEIXIN
				isWXBroadcasting: false,
				peripheralServer: null, // 用于安卓平台的外围设备服务器
				// 预设的测试数据
				presetData: [{
						name: '基础测试',
						broadcastName: 'BLE-Test',
						serviceUuid: 'FFF0',
						manufacturerId: '004E',
						manufacturerData: '4E001101',
						platforms: ['ios', 'android', 'devtools']
					},
					{
						name: 'iBeacon测试',
						broadcastName: 'iBeacon',
						serviceUuid: 'FEAA',
						manufacturerId: '004C',
						manufacturerData: '02154E4F4B49412D4445562D3031020106080302A8C0',
						platforms: ['ios']
					},
					{
						name: '安卓测试',
						broadcastName: 'Android-BLE',
						serviceUuid: '180F',
						manufacturerId: '01E0',
						manufacturerData: 'E0010102030405',
						platforms: ['android', 'devtools']
					},
					{
						name: 'iOS测试',
						broadcastName: 'iOS-BLE',
						serviceUuid: '1812',
						manufacturerId: '004C',
						manufacturerData: '4C000215E2C56DB5DFFB48D2B060D0F5A71096E000000000C5',
						platforms: ['ios']
					}
				],
				// 当前平台
				currentPlatform: 'android',
				// 平台标识
				platform: '',
				isNativeIOS: false,
				isNativeAndroid: false,
				isWechat: false,
				// iOS特有配置
				iosConfig: {
					peripheralManager: null,
					advertisingData: null,
				},
				// #endif
			}
		},
		methods: {
			// 初始化广播插件
			async initializeAdvertiser() {
				try {
					// 检查蓝牙是否开启
					try {
						await uni.openBluetoothAdapter();
						this.addLog('system', '蓝牙已开启');
					} catch (error) {
						this.addLog('error', '请开启蓝牙');
						uni.showModal({
							title: '提示',
							content: '请开启蓝牙后重试',
							showCancel: false
						});
						return false;
					}

					// 请求蓝牙权限
					const result = await this.requestBluetoothPermission();
					if (!result) {
						return false;
					}

					// #ifdef APP-PLUS
					// 检查设备是否支持BLE广播
					bleModule.getAdvertisingSupport((result) => {
						if (result.code === 0 && result.supported) {
							this.isInitialized = true;
							this.addLog('system', '设备支持BLE广播');
						} else {
							this.addLog('error', `设备不支持BLE广播：${result.reason || '未知原因'}`);
							uni.showModal({
								title: '提示',
								content: '当前设备不支持BLE广播功能',
								showCancel: false
							});
							return false;
						}
					});
					// #endif

					// #ifdef MP-WEIXIN
					// 微信小程序不需要检查广播支持
					this.isInitialized = true;
					this.addLog('system', '微信小程序环境已就绪');
					// #endif

					return true;
				} catch (error) {
					this.addLog('error', `初始化失败：${error.message}`);
					return false;
				}
			},

			// 请求蓝牙权限
			async requestBluetoothPermission() {
				try {
					// 检查运行平台
					const sys = uni.getSystemInfoSync();

					// #ifdef MP-WEIXIN
					// 微信小程序环境，直接使用微信的权限请求
					if (sys.platform === 'ios' || sys.platform === 'android' || sys.platform === 'devtools') {
						return await this.requestWxPermissions();
					}
					// #endif

					// #ifdef APP-PLUS
					if (sys.platform === 'android') {
						// Android 平台
						const permissions = [
							'android.permission.BLUETOOTH',
							'android.permission.BLUETOOTH_ADMIN',
							'android.permission.BLUETOOTH_SCAN',
							'android.permission.BLUETOOTH_ADVERTISE',
							'android.permission.BLUETOOTH_CONNECT',
							'android.permission.ACCESS_COARSE_LOCATION',
							'android.permission.ACCESS_FINE_LOCATION'
						];

						// 请求所有需要的权限
						for (const permission of permissions) {
							try {
								await this.requestAndroidPermission(permission);
							} catch (error) {
								this.addLog('error', `权限 ${permission} 获取失败`);
								uni.showModal({
									title: '提示',
									content: '请在系统设置中授予蓝牙和定位权限',
									showCancel: false,
									success: () => {
										// 打开应用设置页面
										if (plus.os.name.toLowerCase() === 'android') {
											const main = plus.android.runtimeMainActivity();
											const Intent = plus.android.importClass(
												'android.content.Intent');
											const Settings = plus.android.importClass(
												'android.provider.Settings');
											const Uri = plus.android.importClass('android.net.Uri');
											const intent = new Intent();
											intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
											intent.setData(Uri.fromParts('package', main.getPackageName(),
												null));
											main.startActivity(intent);
										}
									}
								});
								return false;
							}
						}
						this.addLog('system', '蓝牙权限已获取');
						return true;
					} else if (sys.platform === 'ios') {
						// iOS 平台直接返回 true
						this.addLog('system', '蓝牙权限已获取');
						return true;
					}
					// #endif

					return true;
				} catch (error) {
					this.addLog('error', '权限请求失败');
					return false;
				}
			},

			// 请求单个 Android 权限
			requestAndroidPermission(permission) {
				return new Promise((resolve, reject) => {
					plus.android.requestPermissions(
						[permission],
						function(resultObj) {
							const result = resultObj.granted.indexOf(permission) !== -1;
							result ? resolve() : reject();
						},
						function(error) {
							reject(error);
						}
					);
				});
			},

			async startBroadcast() {
				// 检查初始化状态
				if (!this.isInitialized) {
					const initialized = await this.initializeAdvertiser();
					if (!initialized) {
						return;
					}
				}

				// #ifdef APP-PLUS
				if (this.isNativeIOS) {
					// iOS原生平台广播实现
					this.startIOSBroadcast();
				} else if (this.isNativeAndroid) {
					// 原有的Android广播实现
					this.startAndroidBroadcast();
				}
				// #endif

				// #ifdef MP-WEIXIN
				// 原有的微信小程序广播实现
				this.startWechatBroadcast();
				// #endif
			},

			// iOS原生平台广播实现
			startIOSBroadcast() {
				try {
					// 准备广播参数
					const params = {
						advertiseData: {},
						scanResponse: {}
					};

					// 设置广播数据
					if (this.serviceUuid) {
						let fullUuid = this.serviceUuid.toUpperCase();
						if (fullUuid.length <= 4) {
							fullUuid = `0000${fullUuid}-0000-1000-8000-00805F9B34FB`.slice(-36);
						}
						if (!/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(fullUuid)) {
							this.addLog('error', 'UUID格式无效');
							return;
						}
						params.advertiseData.serviceUuid = fullUuid;
					}

					if (this.includeDeviceName) {
						params.advertiseData.localName = this.broadcastName;
					}

					if (this.manufacturerId && this.manufacturerData) {
						try {
							const manufacturerId = parseInt(this.manufacturerId, 16);
							const cleanData = this.manufacturerData.replace(/\s+/g, '');
							if (/^[0-9A-Fa-f]+$/.test(cleanData)) {
								params.advertiseData.manufacturerData = {
									manufacturerId: manufacturerId,
									data: cleanData
								};
							}
						} catch (e) {
							this.addLog('error', '厂商数据格式无效');
							return;
						}
					}

					// 启动广播
					bleModule.startAdvertising(params, (result) => {
						if (result.code === 0) {
							this.isBroadcasting = true;
							this.addLog('system', 'iOS广播启动成功');
							uni.showToast({
								title: '广播已启动',
								icon: 'success'
							});
						} else {
							this.addLog('error', `iOS广播启动失败：${result.message || '未知错误'}`);
							uni.showToast({
								title: '广播启动失败',
								icon: 'error'
							});
						}
					});
				} catch (error) {
					this.addLog('error', `iOS广播异常：${error.message || error}`);
				}
			},

			// 原有Android广播实现重命名
			startAndroidBroadcast() {
				// 原有的Android广播代码移动到这里
				bleModule.isAdvertising((result) => {
					if (result.code === 0 && result.advertising) {
						this.addLog('system', '当前已在广播中');
						return;
					}
				});

				// 构建广播参数
				const params = {
					advertiseMode: 2,
					txPowerLevel: this.selectedPowerLevel,
					connectable: this.connectable,
					timeout: 0,
				};

				const advertiseData = {};
				const scanResponse = {};

				if (this.includeDeviceName) {
					scanResponse.includeDeviceName = true;
					scanResponse.deviceName = this.broadcastName;
				}

				if (this.includeTxPowerLevel) {
					scanResponse.includeTxPower = true;
				}

				if (this.manufacturerId && this.manufacturerData) {
					try {
						const manufacturerId = parseInt(this.manufacturerId, 16);
						const cleanData = this.manufacturerData.replace(/\s+/g, '');
						if (/^[0-9A-Fa-f]+$/.test(cleanData)) {
							let data = cleanData.length % 2 === 0 ? cleanData : '0' + cleanData;
							if (data.length > 40) {
								data = data.substring(0, 40);
								this.addLog('system', '厂商数据已截断至20字节');
							}
							advertiseData.manufacturerId = manufacturerId;
							advertiseData.manufacturerData = data;
							this.addLog('system',
								`厂商数据已设置：ID=0x${manufacturerId.toString(16).toUpperCase()}, Data=${data}`);
						} else {
							this.addLog('error', '厂商数据格式无效');
							return;
						}
					} catch (e) {
						this.addLog('error', '厂商ID格式无效');
						return;
					}
				}

				if (this.serviceUuid) {
					try {
						let fullUuid = this.serviceUuid.toUpperCase();
						if (fullUuid.length <= 4) {
							fullUuid = `0000${fullUuid}-0000-1000-8000-00805F9B34FB`.slice(-36);
						}
						if (!/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(fullUuid)) {
							this.addLog('error', 'UUID格式无效');
							return;
						}
						advertiseData.serviceUuid = fullUuid;
						this.addLog('system', `服务UUID已设置：${fullUuid}`);
					} catch (e) {
						this.addLog('error', 'UUID设置失败');
						return;
					}
				}

				params.advertiseData = advertiseData;
				params.scanResponse = scanResponse;

				this.addLog('system', '正在启动Android广播...');
				bleModule.startAdvertising(params, (result) => {
					if (result.code === 0) {
						this.isBroadcasting = true;
						this.addLog('system', 'Android广播启动成功');
						uni.showToast({
							title: '广播已启动',
							icon: 'success'
						});
					} else {
						this.addLog('error', `Android广播失败：${result.message || '未知错误'}`);
					}
				});
			},

			// 微信小程序广播实现
			startWechatBroadcast() {
				// 原有的微信小程序广播代码移动到这里
				try {
					const systemInfo = uni.getSystemInfoSync();
					const isIOS = systemInfo.platform === 'ios';

					this.addLog('system', `当前平台: ${systemInfo.platform}`);

					if (isIOS) {
						// iOS平台使用startBeaconDiscovery
						this.startWechatIOSBroadcast();
					} else {
						// 安卓平台使用createBLEPeripheralServer
						this.startWechatAndroidBroadcast();
					}
				} catch (error) {
					this.addLog('error', `微信小程序广播异常：${error.message || error}`);
				}
			},

			// 微信小程序iOS平台广播实现
			startWechatIOSBroadcast() {
				this.addLog('system', '使用微信小程序iOS广播方式');

				// 准备UUID，iOS必须是标准UUID格式
				let uuid = this.serviceUuid.toUpperCase();
				if (uuid.length <= 4) {
					uuid = `0000${uuid}-0000-1000-8000-00805F9B34FB`.slice(-36);
				}

				// 确保UUID格式正确
				if (!/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(uuid)) {
					this.addLog('error', 'UUID格式无效，iOS需要标准UUID格式');
					uni.showToast({
						title: 'UUID格式无效',
						icon: 'error'
					});
					return;
				}

				wx.startBeaconDiscovery({
					uuids: [uuid],
					success: () => {
						this.isWXBroadcasting = true;
						this.isBroadcasting = true;
						this.addLog('system', '微信小程序iOS广播启动成功');
						uni.showToast({
							title: '广播已启动',
							icon: 'success'
						});
					},
					fail: (err) => {
						this.addLog('error', `微信小程序iOS广播启动失败: ${JSON.stringify(err)}`);
						uni.showToast({
							title: '广播启动失败',
							icon: 'error'
						});
					}
				});
			},

			// 微信小程序Android平台广播实现
			startWechatAndroidBroadcast() {
				this.addLog('system', '使用微信小程序Android广播方式');

				// 创建外围设备服务器
				wx.createBLEPeripheralServer({
					success: (res) => {
						this.peripheralServer = res.server;
						this.addLog('system', '创建外围设备服务器成功');

						// 准备广播数据
						let serviceUuids = [];
						if (this.serviceUuid) {
							let uuid = this.serviceUuid.toUpperCase();
							if (uuid.length <= 4) {
								uuid = `0000${uuid}-0000-1000-8000-00805F9B34FB`.slice(-36);
							}
							if (!/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(uuid)) {
								this.addLog('error', 'UUID格式无效');
								return;
							}
							serviceUuids = [uuid];
							this.addLog('system', `服务UUID已设置：${uuid}`);
						}

						// 开始广播
						this.peripheralServer.startAdvertising({
							advertiseRequest: {
								connectable: this.connectable,
								deviceName: this.includeDeviceName ? this.broadcastName : undefined,
								serviceUuids: serviceUuids,
								// 在安卓端暂时不使用manufacturerData，避免隐私问题
								manufacturerData: undefined
							},
							powerLevel: this.selectedPowerLevel,
							success: () => {
								this.isWXBroadcasting = true;
								this.isBroadcasting = true;
								this.addLog('system', '微信小程序Android广播启动成功');
								uni.showToast({
									title: '广播已启动',
									icon: 'success'
								});
							},
							fail: (err) => {
								this.addLog('error', `微信小程序Android广播启动失败: ${JSON.stringify(err)}`);
								console.error('微信小程序Android广播启动失败:', err);
								uni.showToast({
									title: '广播启动失败',
									icon: 'error'
								});
							}
						});
					},
					fail: (err) => {
						this.addLog('error', `创建外围设备服务器失败: ${JSON.stringify(err)}`);
						console.error('创建外围设备服务器失败:', err);
						uni.showToast({
							title: '创建服务器失败',
							icon: 'error'
						});
					}
				});
			},

			stopBroadcast() {
				if (!this.isInitialized) {
					this.addLog('error', '广播功能未就绪');
					return;
				}

				// #ifdef APP-PLUS
				if (this.isNativeIOS) {
					// iOS原生平台停止广播
					this.stopIOSBroadcast();
				} else if (this.isNativeAndroid) {
					// Android原生平台停止广播
					this.stopAndroidBroadcast();
				}
				// #endif

				// #ifdef MP-WEIXIN
				// 微信小程序停止广播
				this.stopWechatBroadcast();
				// #endif
			},

			// iOS原生平台停止广播
			stopIOSBroadcast() {
				bleModule.stopAdvertising((result) => {
					if (result.code === 0) {
						this.isBroadcasting = false;
						this.addLog('system', 'iOS广播已停止');
						uni.showToast({
							title: '广播已停止',
							icon: 'success'
						});
					} else {
						this.addLog('error', `停止iOS广播失败：${result.message || '未知错误'}`);
					}
				});
			},

			// Android原生平台停止广播
			stopAndroidBroadcast() {
				bleModule.stopAdvertising((result) => {
					if (result.code === 0) {
						this.isBroadcasting = false;
						this.addLog('system', 'Android广播已停止');
						uni.showToast({
							title: '广播已停止',
							icon: 'success'
						});
					} else {
						this.addLog('error', `停止Android广播失败：${result.message || '未知错误'}`);
					}
				});
			},

			// 微信小程序停止广播
			stopWechatBroadcast() {
				try {
					const systemInfo = uni.getSystemInfoSync();
					const isIOS = systemInfo.platform === 'ios';

					if (isIOS) {
						// iOS平台使用stopBeaconDiscovery
						wx.stopBeaconDiscovery({
							success: () => {
								this.isWXBroadcasting = false;
								this.isBroadcasting = false;
								this.addLog('system', '微信小程序iOS广播已停止');
								uni.showToast({
									title: '广播已停止',
									icon: 'success'
								});
							},
							fail: (err) => {
								this.addLog('error', `停止微信小程序iOS广播失败: ${JSON.stringify(err)}`);
							}
						});
					} else {
						// 安卓平台使用peripheralServer.stopAdvertising
						if (this.peripheralServer) {
							this.peripheralServer.stopAdvertising({
								success: () => {
									this.isWXBroadcasting = false;
									this.isBroadcasting = false;
									this.addLog('system', '微信小程序Android广播已停止');
									uni.showToast({
										title: '广播已停止',
										icon: 'success'
									});
								},
								fail: (err) => {
									this.addLog('error', `停止微信小程序Android广播失败: ${JSON.stringify(err)}`);
								}
							});
						} else {
							this.addLog('error', '外围设备服务器不存在');
						}
					}
				} catch (error) {
					this.addLog('error', `停止微信小程序广播异常: ${error.message || error}`);
				}
			},

			onPowerLevelChange(e) {
				this.selectedPowerLevel = parseInt(e.detail.value);
			},

			onConnectableChange(e) {
				this.connectable = e.detail.value;
			},

			onIncludeDeviceNameChange(e) {
				this.includeDeviceName = e.detail.value;
			},

			onIncludeTxPowerLevelChange(e) {
				this.includeTxPowerLevel = e.detail.value;
			},

			addLog(type, message) {
				try {
					const now = new Date();
					const time =
						`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
					this.logs.push({
						time,
						type,
						message
					});

					// 记录到控制台，方便调试
					console.log(`[${time}][${type}] ${message}`);
				} catch (error) {
					console.error('日志记录失败:', error);
				}
			},

			clearLogs() {
				this.logs = [];
			},

			// 清除所有自动通知
			async clearAutoNotify() {
				// #ifdef APP-PLUS
				try {
					if (this.isBroadcasting) {
						this.addLog('system', '请先停止广播');
						return;
					}

					this.addLog('system', '正在清除自动通知...');

					// 使用原生插件清除通知
					bleModule.clearNotifications((result) => {
						if (result.code === 0) {
							this.addLog('system', '自动通知已清除');
							uni.showToast({
								title: '通知已清除',
								icon: 'success'
							});
						} else {
							this.addLog('error', `清除通知失败：${result.message || '未知错误'}`);
							uni.showToast({
								title: '清除失败',
								icon: 'error'
							});
						}
					});
				} catch (error) {
					this.addLog('error', `清除通知异常：${error.message || error}`);
					uni.showToast({
						title: '清除异常',
						icon: 'error'
					});
				}
				// #endif

				// #ifdef MP-WEIXIN
				try {
					if (this.isWXBroadcasting) {
						this.addLog('system', '请先停止广播');
						return;
					}

					this.addLog('system', '正在清除自动通知...');

					// 微信小程序环境下，停止所有特征值监听
					wx.offBLEPeripheralConnectionStateChanged();

					// 重新初始化监听器
					wx.onBLEPeripheralConnectionStateChanged(res => {
						this.addLog('system', `设备连接状态变化：${JSON.stringify(res)}`);
					});

					this.addLog('system', '自动通知已清除');
					uni.showToast({
						title: '通知已清除',
						icon: 'success'
					});
				} catch (error) {
					this.addLog('error', `清除通知异常：${error.message || error}`);
					uni.showToast({
						title: '清除异常',
						icon: 'error'
					});
				}
				// #endif
			},

			// 请求微信小程序的蓝牙和定位权限
			requestWxPermissions() {
				return new Promise((resolve, reject) => {
					// 简化权限请求流程
					wx.getSetting({
						success: (res) => {
							let needRequestPermissions = false;

							// 检查定位权限
							if (!res.authSetting['scope.userLocation']) {
								needRequestPermissions = true;
							}

							// 检查蓝牙权限
							if (!res.authSetting['scope.bluetooth']) {
								needRequestPermissions = true;
							}

							// 如果需要请求权限
							if (needRequestPermissions) {
								// 先请求蓝牙权限
								wx.authorize({
									scope: 'scope.bluetooth',
									success: () => {
										this.addLog('system', '蓝牙权限授权成功');

										// 再请求定位权限
										wx.authorize({
											scope: 'scope.userLocation',
											success: () => {
												this.addLog('system',
													'定位权限授权成功');
												resolve(true);
											},
											fail: (err) => {
												console.error('定位权限授权失败', err);
												this.addLog('error',
													'定位权限授权失败，请在设置中开启');

												// 提示用户前往设置页面
												wx.showModal({
													title: '提示',
													content: '需要定位权限，请在设置中开启',
													confirmText: '去设置',
													success: (modalRes) => {
														if (modalRes.confirm) {
															wx.openSetting();
														}
														// 无论用户是否去设置，都尝试继续运行
														resolve(true);
													}
												});
											}
										});
									},
									fail: (err) => {
										console.error('蓝牙权限授权失败', err);
										this.addLog('error', '蓝牙权限授权失败，请在设置中开启');

										// 提示用户前往设置页面
										wx.showModal({
											title: '提示',
											content: '需要蓝牙权限，请在设置中开启',
											confirmText: '去设置',
											success: (modalRes) => {
												if (modalRes.confirm) {
													wx.openSetting();
												}
												// 无论用户是否去设置，都尝试继续运行
												resolve(true);
											}
										});
									}
								});
							} else {
								// 已有所有权限
								this.addLog('system', '已获取所有必要权限');
								resolve(true);
							}
						},
						fail: (err) => {
							// 处理获取设置失败的情况
							console.error('获取权限设置失败', err);
							this.addLog('error', '获取权限设置失败，将尝试继续运行');
							// 尽管失败，仍然尝试继续运行
							resolve(true);
						}
					});
				});
			},

			// 应用预设数据
			applyPreset(index) {
				if (index >= 0 && index < this.presetData.length) {
					const preset = this.presetData[index];
					this.broadcastName = preset.broadcastName;
					this.serviceUuid = preset.serviceUuid;
					this.manufacturerId = preset.manufacturerId;
					this.manufacturerData = preset.manufacturerData;

					this.addLog('system', `已应用预设: ${preset.name}`);
					uni.showToast({
						title: '已应用预设',
						icon: 'success'
					});
				}
			},

			// 检测当前运行平台
			detectPlatform() {
				// #ifdef APP-PLUS
				const platform = uni.getSystemInfoSync().platform;
				this.isNativeIOS = platform === 'ios';
				this.isNativeAndroid = platform === 'android';
				this.platform = platform;
				this.addLog('system', `当前为原生平台: ${platform}`);
				// #endif

				// #ifdef MP-WEIXIN
				this.isWechat = true;
				const systemInfo = uni.getSystemInfoSync();
				this.platform = systemInfo.platform;
				this.addLog('system', `当前为微信小程序平台: ${this.platform}`);
				// #endif
			},

			// 初始化iOS广播
			initializeIOSBroadcast() {
				// #ifdef APP-PLUS
				if (this.isNativeIOS) {
					this.addLog('system', '初始化iOS广播...');
					bleModule.getAdvertisingSupport((result) => {
						if (result.code === 0 && result.supported) {
							this.isInitialized = true;
							this.addLog('system', 'iOS设备支持BLE广播');
						} else {
							this.addLog('error', `iOS设备不支持BLE广播：${result.reason || '未知原因'}`);
						}
					});
				}
				// #endif
			},

		},
		async onLoad() {
			// 页面加载时初始化
			this.addLog('system', '广播页面已加载');
			
			// 检测当前平台
			this.detectPlatform();

			// 根据平台初始化
			if (this.isNativeIOS) {
				this.initializeIOSBroadcast();
			} else {
				await this.initializeAdvertiser();
			}

			this.addLog('system', '请设置广播参数并点击开始广播');
		},
		onUnload() {
			if (this.isBroadcasting) {
				this.stopBroadcast();
			}
			// #ifdef MP-WEIXIN
			// 取消微信小程序的监听
			wx.offBLEPeripheralConnectionStateChanged();
			// #endif
		},
		// #ifdef MP-WEIXIN
		onShareAppMessage() {
			return {
				title: '智能蓝牙助手',
				path: '/pages/broadcast/index',
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
		height: 100vh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		background-color: #f7f8fa;
		gap: 24rpx;
	}

	.broadcast-panel {
		background: linear-gradient(135deg, #fff 0%, #f8f9fc 100%);
		border-radius: 24rpx;
		padding: 40rpx;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
	}

	.panel-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #1a1a1a;
		margin-bottom: 30rpx;
	}

	.form-item {
		margin-bottom: 24rpx;
	}

	.form-item:last-child {
		margin-bottom: 0;
	}

	.form-label {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 12rpx;
		display: block;
	}

	.form-input {
		width: 100%;
		height: 80rpx;
		border: 2rpx solid #eee;
		border-radius: 16rpx;
		padding: 0 24rpx;
		font-size: 28rpx;
		background-color: #f8f9fc;
		transition: all 0.3s;
	}

	.form-input:focus {
		border-color: #007AFF;
		background-color: #fff;
		box-shadow: 0 2rpx 8rpx rgba(0, 122, 255, 0.1);
	}

	.form-switch {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20rpx 0;
	}

	.form-switch text {
		font-size: 28rpx;
		color: #333;
	}

	.action-buttons {
		display: flex;
		gap: 24rpx;
		margin-top: 40rpx;
	}

	.action-buttons button {
		flex: 1;
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32rpx;
		font-weight: 600;
		border-radius: 20rpx;
		transition: all 0.3s;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
		border: none;
	}

	.action-buttons button[type="primary"] {
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
	}

	.action-buttons button[type="primary"]:active {
		transform: translateY(2rpx);
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
	}

	.action-buttons button[type="default"] {
		background: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
		color: #fff;
	}

	.action-buttons button[type="default"]:active {
		transform: translateY(2rpx);
		opacity: 0.9;
	}

	.log-panel {
		flex: 1;
		background: linear-gradient(135deg, #fff 0%, #f8f9fc 100%);
		border-radius: 24rpx;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.log-header {
		padding: 24rpx 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2rpx solid #eee;
		background: linear-gradient(to right, #f8f9fc, #f5f6fa);
	}

	.log-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #1a1a1a;
	}

	.log-actions {
		display: flex;
		gap: 16rpx;
	}

	.log-actions button {
		height: 60rpx;
		font-size: 26rpx;
		border-radius: 12rpx;
	}

	.log-content {
		flex: 1;
		padding: 24rpx;
		overflow-y: auto;
		background: #f8f9fc;
	}

	.log-item {
		padding: 12rpx 16rpx;
		background: #fff;
		border-radius: 12rpx;
		margin-bottom: 12rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
		font-size: 26rpx;
		display: flex;
		align-items: flex-start;
	}

	.log-time {
		color: #999;
		margin-right: 12rpx;
		white-space: nowrap;
	}

	.log-type {
		margin: 0 12rpx;
		padding: 4rpx 16rpx;
		border-radius: 100rpx;
		white-space: nowrap;
		font-size: 24rpx;
		font-weight: 600;
	}

	.log-type.system {
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
		color: white;
		box-shadow: 0 2rpx 8rpx rgba(0, 122, 255, 0.2);
	}

	.log-type.error {
		background: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
		color: white;
		box-shadow: 0 2rpx 8rpx rgba(255, 59, 48, 0.2);
	}

	.log-message {
		flex: 1;
		word-break: break-all;
		line-height: 1.5;
		color: #333;
	}

	.preset-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
		margin-bottom: 30rpx;
	}

	.preset-button {
		flex: 1;
		min-width: 160rpx;
		height: 70rpx;
		line-height: 70rpx;
		font-size: 26rpx;
		padding: 0 20rpx;
		background: linear-gradient(135deg, #5856D6 0%, #5E5CE6 100%);
		color: #fff;
		border-radius: 12rpx;
		box-shadow: 0 4rpx 12rpx rgba(88, 86, 214, 0.2);
		margin: 0;
	}

	.preset-button:active {
		transform: translateY(2rpx);
		opacity: 0.9;
	}
</style>