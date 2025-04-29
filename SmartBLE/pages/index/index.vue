<template>
	<view class="container">
		<!-- 过滤选项 -->
		<view class="filter-panel">
			<view class="filter-header">
				<text class="filter-title">过滤设置</text>
				<!-- #ifdef MP-WEIXIN -->
				<view class="nav-buttons">
					<button class="nav-btn" @click="goBroadcast">
						<text class="button-icon">📡</text>
						<text>广播</text>
					</button>
					<button class="nav-btn" @click="goAbout">
						<text class="button-icon">ℹ️</text>
						<text>关于</text>
					</button>
				</view>
				<!-- #endif -->
			</view>

			<view class="filter-item">
				<text>信号强度过滤</text>
				<slider :value="filterRSSI" :min="-100" :max="0" :step="1" show-value @change="onRSSIChange" />
			</view>
			<view class="filter-options">
				<view class="filter-option">
					<text>名称前缀过滤</text>
					<input type="text" v-model="filterPrefix" placeholder="输入设备名称前缀" class="prefix-input" />
				</view>
				<view class="filter-option">
					<text>隐藏无名称设备</text>
					<switch :checked="hideNoName" @change="onHideNoNameChange" color="#007AFF" class="custom-switch" />
				</view>
			</view>
		</view>

		<!-- 操作按钮组 -->
		<view class="button-group">
			<button 
				:type="isScanning ? 'warn' : 'primary'" 
				@click="toggleScan" 
				:disabled="false"
				:class="{'button-scanning': isScanning}"
			>
				{{ isScanning ? '停止扫描' : '搜索设备' }}
			</button>
		</view>

		<!-- 设备列表 -->
		<view class="device-list">
			<view class="list-header">
				<text class="list-title">发现设备 ({{filteredDevices.length}})</text>
				<text class="scan-status" :class="{'active': isScanning}">{{isScanning ? '扫描中' : '未扫描'}}</text>
			</view>
			<scroll-view scroll-y class="device-scroll">
				<view class="device-item" v-for="(device, index) in filteredDevices" :key="index"
					@click="showAdvertisingData(device)">
					<view class="device-main">
						<view class="device-info">
							<view class="name-container">
								<text class="device-name">{{device.name || '未知设备'}}</text>
								<text class="device-type" v-if="device.name">{{getDeviceType(device.name)}}</text>
							</view>
							<text class="device-id">{{formatDeviceId(device.deviceId)}}</text>
						</view>
						<view class="device-actions">
							<button class="connect-btn" size="mini" type="primary" 
								:disabled="device.connected" 
								@click.stop="connectDevice(device)">
								{{device.connected ? '已连接' : '连接'}}
							</button>
						</view>
					</view>
					<view class="device-details">
						<view class="signal-strength">
							<view class="signal-label">信号强度:</view>
							<view class="signal-bars">
								<view v-for="i in 4" :key="i" class="signal-bar"
									:class="{'active': i <= getSignalLevel(device.RSSI)}"></view>
							</view>
							<text class="signal-value">{{device.RSSI}} dBm</text>
						</view>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 已连接设备的操作面板 -->
		<view class="control-panel" v-if="currentDevice">
			<view class="panel-header">
				<text class="panel-title">当前设备: {{currentDevice.name || '未知设备'}}</text>
				<button type="warn" size="mini" @click="disconnectDevice">断开连接</button>
			</view>

			<!-- 服务列表 -->
			<scroll-view class="services-list" scroll-y>
				<view v-for="(service, sIndex) in services" :key="sIndex" class="service-item">
					<view class="service-header" @click="toggleService(sIndex)">
						<text>服务: {{service.uuid}}</text>
						<text class="arrow">{{service.isOpen ? '▼' : '▶'}}</text>
					</view>
					<view v-if="service.isOpen" class="characteristics-list">
						<view v-for="(characteristic, cIndex) in service.characteristics" :key="cIndex"
							class="characteristic-item">
							<text>特征值: {{characteristic.uuid}}</text>
							<view class="characteristic-props">
								<button size="mini" v-if="characteristic.properties.read"
									@click="readCharacteristic(service.uuid, characteristic.uuid)">读取</button>
								<button size="mini" v-if="characteristic.properties.write"
									@click="showWriteModal(service.uuid, characteristic.uuid)">写入</button>
								<button size="mini" v-if="characteristic.properties.notify"
									@click="toggleNotify(service.uuid, characteristic.uuid)">
									{{characteristic.notifying ? '停止监听' : '监听'}}
								</button>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>

			<!-- 数据收发日志 -->
			<view class="log-panel">
				<view class="log-header">
					<text>操作日志</text>
					<button size="mini" @click="clearLogs">清除</button>
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

		<!-- 广播信息弹窗 -->
		<view class="modal-overlay" v-if="showAdvDataModal" @click.stop="closeAdvDataModal">
			<view class="modal-content" @click.stop>
				<view class="modal-header">
					<text class="modal-title">广播信息</text>
					<text class="modal-close" @click="closeAdvDataModal">×</text>
				</view>
				<scroll-view scroll-y class="modal-scroll">
					<textarea class="modal-textarea" :value="advDataModalContent" disabled selectable></textarea>
				</scroll-view>
				<view class="modal-actions">
					<button class="modal-button modal-button-copy" type="primary" @click="copyAdvData">复制代码</button>
					<button class="modal-button modal-button-close" @click="closeAdvDataModal">关闭</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				isScanning: false,
				devices: [],
				currentDevice: null,
				services: [],
				logs: [],
				writeData: '',
				showWrite: false,
				currentService: '',
				currentCharacteristic: '',
				filterRSSI: -100,
				filterPrefix: '',
				hideNoName: false,
				// 自定义弹窗相关
				showAdvDataModal: false,
				advDataModalContent: '',
				modalDeviceId: null // 新增：记录当前弹窗对应的设备ID
			}
		},
		computed: {
			// 过滤后的设备列表
			filteredDevices() {
				return this.devices.filter(device => {
					// 信号强度过滤
					if (device.RSSI < this.filterRSSI) {
						return false;
					}

					// 过滤无名称设备
					if (this.hideNoName && !device.name) {
						return false;
					}

					// 名称前缀过滤
					if (this.filterPrefix && device.name) {
						return device.name.toLowerCase().startsWith(this.filterPrefix.toLowerCase());
					}

					return true;
				});
			}
		},
		onLoad() {
			// 设置导航栏标题
			uni.setNavigationBarTitle({
				title: 'BLE Toolkit+'
			});

			// #ifdef MP-WEIXIN
			// 监听特征值变化
			uni.onBLECharacteristicValueChange(res => {
				const value = Array.from(new Uint8Array(res.value))
					.map(item => String.fromCharCode(item))
					.join('');
				this.addLog('接收', `收到数据：${value}`);
			});
			// #endif
		},
		// 导航栏按钮点击事件处理
		onNavigationBarButtonTap(e) {
			if (e.index === 0) {
				this.goBroadcast();
			}else{
				this.goAbout()
			}
		},
		methods: {
			// #ifdef MP-WEIXIN
			// 请求微信小程序的蓝牙权限（移除了定位权限请求）
			requestWxPermissions() {
				wx.getSetting({
					success: (res) => {
						// 请求蓝牙权限
						if (!res.authSetting['scope.bluetooth']) {
							wx.authorize({
								scope: 'scope.bluetooth',
								success: () => {
									console.log('蓝牙权限授权成功');
									this.addLog('system', '蓝牙权限授权成功');
								},
								fail: (err) => {
									console.error('蓝牙权限授权失败', err);
									this.addLog('error', '蓝牙权限授权失败，请在设置中开启');
									// 引导用户去设置页面开启权限
									wx.showModal({
										title: '提示',
										content: '需要使用蓝牙功能，请在设置中开启蓝牙权限',
										confirmText: '去设置',
										success: (res) => {
											if (res.confirm) {
												wx.openSetting();
											}
										}
									});
								}
							});
						}
					}
				});
			},
			// #endif

			// 跳转到广播页面
			goBroadcast() {
				uni.navigateTo({
					url: '/pages/broadcast/index'
				});
			},
			
			// 跳转到关于页面
			goAbout(){
				uni.navigateTo({
					url: '/pages/about/index'
				});
			},
			
			// 信号强度滑块变化处理
			onRSSIChange(e) {
				this.filterRSSI = e.detail.value;
			},

			// 处理隐藏无名称设备开关变化
			onHideNoNameChange(e) {
				this.hideNoName = e.detail.value;
			},

			// 开始扫描
			startScan() {
				// #ifdef MP-WEIXIN
				// 微信小程序需要先检查并请求定位权限
				wx.getSetting({
					success: (res) => {
						if (!res.authSetting['scope.userLocation']) {
							this.addLog('系统', '请求定位权限...');
							wx.authorize({
								scope: 'scope.userLocation',
								success: () => {
									this.addLog('系统', '定位权限授权成功');
									// 权限获取成功后，继续执行扫描
									this.executeScan();
								},
								fail: (err) => {
									console.error('定位权限授权失败', err);
									this.addLog('错误', '定位权限授权失败，无法开始扫描');
									this.isScanning = false; // 重置扫描状态
									wx.showModal({
										title: '提示',
										content: '蓝牙扫描需要获取您的地理位置，请在设置中开启定位权限',
										confirmText: '去设置',
										success: (modalRes) => {
											if (modalRes.confirm) {
												wx.openSetting();
											}
										}
									});
								}
							});
						} else {
							// 已有定位权限，直接执行扫描
							this.executeScan();
						}
					},
					fail: (err) => {
						console.error('检查定位权限设置失败', err);
						this.addLog('错误', '检查定位权限设置失败');
						this.isScanning = false; // 重置扫描状态
					}
				});
				// #endif
				
				// #ifndef MP-WEIXIN
				// 其他平台直接执行扫描
				this.executeScan();
				// #endif
			},
			
			// 实际执行扫描的操作
			executeScan(){
				this.isScanning = true;
				this.devices = [];

				uni.openBluetoothAdapter({
					success: () => {
						this.addLog('系统', '初始化蓝牙适配器成功');
						uni.startBluetoothDevicesDiscovery({
							success: () => {
								this.addLog('系统', '开始搜索设备');
								uni.onBluetoothDeviceFound(res => {
									const devices = res.devices;
									devices.forEach(newDevice => { // 使用newDevice避免覆盖外部device变量
										const existingDeviceIndex = this.devices.findIndex(d => d.deviceId === newDevice.deviceId);
										let updatedDeviceData; // 存储更新后的设备数据
										
										if (existingDeviceIndex === -1) {
											// 添加新设备，包含广播数据
											updatedDeviceData = {
												...newDevice,
												advertisDataHex: this.ab2hex(newDevice.advertisData), // 存储为Hex字符串
												advertisServiceUUIDs: newDevice.advertisServiceUUIDs || []
											};
											this.devices.push(updatedDeviceData);
										} else {
											// 更新现有设备的RSSI和广播数据 (某些设备广播内容会变)
											updatedDeviceData = {
												...this.devices[existingDeviceIndex], // 保留原有信息如连接状态
												...newDevice, // 更新蓝牙模块报告的信息（RSSI, name等）
												advertisDataHex: this.ab2hex(newDevice.advertisData),
												advertisServiceUUIDs: newDevice.advertisServiceUUIDs || []
											};
											this.$set(this.devices, existingDeviceIndex, updatedDeviceData);
										}
										
										// 如果弹窗打开且对应当前设备，则更新弹窗内容
										if (this.showAdvDataModal && this.modalDeviceId === newDevice.deviceId) {
											this.updateModalContent(updatedDeviceData);
										}
									});
								});
							},
							fail: err => {
								this.addLog('错误', '搜索设备失败：' + JSON.stringify(err));
								this.isScanning = false; // 重置扫描状态
							}
						});
					},
					fail: err => {
						this.addLog('错误', '初始化蓝牙适配器失败：' + JSON.stringify(err));
						this.isScanning = false;
					}
				});
			},

			// 停止扫描
			stopScan() {
				uni.stopBluetoothDevicesDiscovery({
					success: () => {
						this.isScanning = false;
						this.addLog('系统', '停止搜索设备');
						// #ifdef MP-WEIXIN
						wx.offBluetoothDeviceFound();
						// #endif
					},
					fail: err => {
						this.addLog('错误', '停止搜索失败：' + JSON.stringify(err));
						// 即使失败也要更新状态
						this.isScanning = false;
					},
					complete: () => {
						// 确保状态被重置
						this.isScanning = false;
					}
				});
			},

			// 添加切换扫描按钮的方法
			toggleScan() {
				if (this.isScanning) {
					this.stopScan();
				} else {
					// 点击开始扫描时，先检查蓝牙状态和权限
					this.checkBluetoothAndPermissionsBeforeScan();
				}
			},

			// 检查蓝牙状态和权限（扫描前）
			checkBluetoothAndPermissionsBeforeScan() {
				uni.openBluetoothAdapter({
					success: (res) => {
						this.addLog('系统', '蓝牙适配器已开启');
						// 蓝牙正常，继续检查权限（仅微信小程序需要显式检查定位）
						// #ifdef MP-WEIXIN
						this.checkAndRequestWxLocationPermission();
						// #endif
						// #ifndef MP-WEIXIN
						// 其他平台直接开始扫描 (App平台通常在API调用时隐式处理权限)
						this.executeScan();
						// #endif
					},
					fail: (err) => {
						this.addLog('错误', '蓝牙适配器未开启或异常: ' + JSON.stringify(err));
						// 检查是否是蓝牙未开启的常见错误码 (微信: 10001)
						if (err.errCode === 10001) {
							uni.showModal({
								title: '提示',
								content: '请先开启系统蓝牙',
								showCancel: false
							});
						} else {
							uni.showToast({
								title: '蓝牙初始化失败',
								icon: 'none'
							});
						}
					}
				});
			},
			
			// #ifdef MP-WEIXIN
			// 检查并请求微信小程序的定位权限
			checkAndRequestWxLocationPermission() {
				wx.getSetting({
					success: (res) => {
						if (!res.authSetting['scope.userLocation']) {
							this.addLog('系统', '请求定位权限...');
							wx.authorize({
								scope: 'scope.userLocation',
								success: () => {
									this.addLog('系统', '定位权限授权成功');
									this.executeScan(); // 权限获取成功，开始扫描
								},
								fail: (err) => {
									console.error('定位权限授权失败', err);
									this.addLog('错误', '定位权限授权失败，无法开始扫描');
									wx.showModal({
										title: '提示',
										content: '蓝牙扫描需要获取您的地理位置，请在设置中开启定位权限',
										confirmText: '去设置',
										success: (modalRes) => {
											if (modalRes.confirm) {
												wx.openSetting();
											}
										}
									});
								}
							});
						} else {
							// 已有定位权限，直接执行扫描
							this.addLog('系统', '已有定位权限');
							this.executeScan();
						}
					},
					fail: (err) => {
						console.error('检查定位权限设置失败', err);
						this.addLog('错误', '检查定位权限设置失败');
					}
				});
			},
			// #endif

			// 连接设备
			connectDevice(device) {
				// 跳转到设备详情页
				uni.navigateTo({
					url: `/pages/device/detail?device=${JSON.stringify(device)}`
				});
			},

			// 断开连接
			disconnectDevice() {
				if (!this.currentDevice) return;

				uni.closeBLEConnection({
					deviceId: this.currentDevice.deviceId,
					success: () => {
						this.currentDevice.connected = false;
						this.currentDevice = null;
						this.services = [];
						this.addLog('系统', '断开设备连接');
					}
				});
			},

			// 获取服务
			getBLEServices(deviceId) {
				uni.getBLEDeviceServices({
					deviceId,
					success: res => {
						this.services = res.services.map(service => ({
							...service,
							isOpen: false,
							characteristics: []
						}));
						this.services.forEach(service => {
							this.getBLECharacteristics(deviceId, service.uuid);
						});
					}
				});
			},

			// 获取特征值
			getBLECharacteristics(deviceId, serviceId) {
				uni.getBLEDeviceCharacteristics({
					deviceId,
					serviceId,
					success: res => {
						const service = this.services.find(s => s.uuid === serviceId);
						if (service) {
							service.characteristics = res.characteristics;
						}
					}
				});
			},

			// 读取特征值
			readCharacteristic(serviceId, characteristicId) {
				uni.readBLECharacteristicValue({
					deviceId: this.currentDevice.deviceId,
					serviceId,
					characteristicId,
					success: () => {
						this.addLog('读取', `开始读取特征值：${characteristicId}`);
					}
				});
			},

			// 写入特征值
			writeCharacteristic(serviceId, characteristicId, value) {
				const buffer = new ArrayBuffer(value.length);
				const dataView = new DataView(buffer);
				for (let i = 0; i < value.length; i++) {
					dataView.setUint8(i, value.charCodeAt(i));
				}

				uni.writeBLECharacteristicValue({
					deviceId: this.currentDevice.deviceId,
					serviceId,
					characteristicId,
					value: buffer,
					success: () => {
						this.addLog('写入', `写入数据成功：${value}`);
					},
					fail: err => {
						this.addLog('错误', '写入数据失败：' + JSON.stringify(err));
					}
				});
			},

			// 监听特征值变化
			toggleNotify(serviceId, characteristicId) {
				const characteristic = this.services
					.find(s => s.uuid === serviceId)
					?.characteristics.find(c => c.uuid === characteristicId);

				if (!characteristic) return;

				if (!characteristic.notifying) {
					uni.notifyBLECharacteristicValueChange({
						deviceId: this.currentDevice.deviceId,
						serviceId,
						characteristicId,
						state: true,
						success: () => {
							characteristic.notifying = true;
							this.addLog('系统', `开始监听特征值：${characteristicId}`);
						}
					});
				} else {
					uni.notifyBLECharacteristicValueChange({
						deviceId: this.currentDevice.deviceId,
						serviceId,
						characteristicId,
						state: false,
						success: () => {
							characteristic.notifying = false;
							this.addLog('系统', `停止监听特征值：${characteristicId}`);
						}
					});
				}
			},

			// 显示写入数据弹窗
			showWriteModal(serviceId, characteristicId) {
				this.currentService = serviceId;
				this.currentCharacteristic = characteristicId;
				uni.showModal({
					title: '写入数据',
					editable: true,
					placeholderText: '请输入要发送的数据',
					success: res => {
						if (res.confirm && res.content) {
							this.writeCharacteristic(serviceId, characteristicId, res.content);
						}
					}
				});
			},

			// 切换服务展开状态
			toggleService(index) {
				this.services[index].isOpen = !this.services[index].isOpen;
			},

			// 添加日志
			addLog(type, message) {
				const now = new Date();
				const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
				this.logs.push({
					time,
					type,
					message
				});
			},

			// 清除日志
			clearLogs() {
				this.logs = [];
			},

			getSignalLevel(rssi) {
				// 将RSSI值转换为信号格数（1-4）
				if (rssi >= -60) return 4;
				if (rssi >= -70) return 3;
				if (rssi >= -80) return 2;
				return 1;
			},

			// 获取设备类型
			getDeviceType(name) {
				if (name.toLowerCase().includes('ble')) return 'BLE';
				if (name.toLowerCase().includes('bluetooth')) return 'BT';
				return '';
			},

			// 格式化设备ID显示
			formatDeviceId(deviceId) {
				if (!deviceId) return '';
				return deviceId.length > 12 ? '...' + deviceId.slice(-12) : deviceId;
			},

			// ArrayBuffer转16进制字符串
			ab2hex(buffer) {
				if (!buffer) return '';
				const hexArr = Array.prototype.map.call(
					new Uint8Array(buffer),
					function(bit) {
						return ('00' + bit.toString(16)).slice(-2)
					}
				)
				return hexArr.join('');
			},
			
			// 显示广播数据
			showAdvertisingData(device) {
				let content = `设备ID: ${this.formatDeviceId(device.deviceId)}\n`;
				content += `名称: ${device.name || 'N/A'}\n`;
				content += `RSSI: ${device.RSSI} dBm\n\n`;
				content += `广播服务UUIDs:\n${device.advertisServiceUUIDs.length > 0 ? device.advertisServiceUUIDs.join('\n') : '无'}\n\n`;
				content += `广播数据 (Hex):\n${device.advertisDataHex || 'N/A'}`;
				
				// 更新弹窗内容并显示
				this.advDataModalContent = content;
				this.showAdvDataModal = true;
				this.modalDeviceId = device.deviceId; // 记录当前显示的设备ID
			},
			
			// 关闭广播信息弹窗
			closeAdvDataModal() {
				this.showAdvDataModal = false;
				this.modalDeviceId = null; // 清除记录
			},
			
			// 更新弹窗内容（用于实时刷新）
			updateModalContent(device) {
				let content = `设备ID: ${this.formatDeviceId(device.deviceId)}\n`;
				content += `名称: ${device.name || 'N/A'}\n`;
				content += `RSSI: ${device.RSSI} dBm\n\n`; // RSSI 也会实时更新
				content += `广播服务UUIDs:\n${device.advertisServiceUUIDs.length > 0 ? device.advertisServiceUUIDs.join('\n') : '无'}\n\n`;
				content += `广播数据 (Hex):\n${device.advertisDataHex || 'N/A'}`;
				this.advDataModalContent = content;
			},
			
			// 复制代码到剪贴板
			copyAdvData() {
				uni.setClipboardData({
					data: this.advDataModalContent,
					success: () => {
						uni.showToast({ title: '已复制', icon: 'success', duration: 1500 });
					}
				});
			},
			
			// #ifdef MP-WEIXIN
			onShareAppMessage(res) {
				console.log('分享来源:', res.from);
				return {
					title: '分享一个好用的BLE工具: BLE Toolkit+', // 分享标题
					path: '/pages/index/index', // 用户点击分享卡片后跳转的页面路径
					// imageUrl: '/static/logo.png' // 可选：自定义分享图片路径
				};
			}
			// #endif
		},
		onUnload() {
			// 页面卸载时断开连接
			if (this.currentDevice) {
				this.disconnectDevice();
			}
			uni.closeBluetoothAdapter();
		}
	}
</script>

<style>
	.container {
		padding: 30rpx;
		height: 100vh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
		background-color: #f7f8fa;
	}

	.filter-panel {
		background-color: #fff;
		padding: 30rpx;
		border-radius: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24rpx;
	}

	.filter-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
	}

	.nav-buttons {
		display: flex;
		gap: 16rpx;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f5f5f5;
		border: none;
		padding: 12rpx 24rpx;
		border-radius: 100rpx;
		font-size: 24rpx;
		color: #333;
		line-height: 1;
		margin: 0;
		transition: all 0.3s;
	}

	.nav-btn:active {
		opacity: 0.8;
		transform: translateY(2rpx);
	}

	.nav-btn .button-icon {
		font-size: 28rpx;
		margin-right: 8rpx;
	}

	.filter-item {
		margin-bottom: 30rpx;
	}

	.filter-options {
		display: flex;
		gap: 30rpx;
	}

	.filter-option {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.filter-item text,
	.filter-option text {
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
		margin-bottom: 12rpx;
		display: block;
	}

	.prefix-input {
		height: 76rpx;
		border: 2rpx solid #eee;
		border-radius: 12rpx;
		padding: 0 24rpx;
		font-size: 28rpx;
		background-color: #f9f9f9;
		transition: all 0.3s;
	}

	.prefix-input:focus {
		border-color: #007AFF;
		background-color: #fff;
	}

	.action-buttons {
		display: flex;
		gap: 24rpx;
		margin-bottom: 24rpx;
	}

	.action-buttons button {
		flex: 1;
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12rpx;
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

	.action-buttons button[type="primary"].scanning {
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		animation: pulse 2s infinite;
	}

	.action-buttons button[type="default"] {
		background: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
		color: #fff;
	}

	.action-buttons button[type="default"]:active {
		transform: translateY(2rpx);
		opacity: 0.9;
	}

	.button-icon {
		font-size: 40rpx;
		margin-right: 4rpx;
	}

	@keyframes pulse {
		0% {
			box-shadow: 0 4rpx 16rpx rgba(52, 199, 89, 0.2);
		}

		50% {
			box-shadow: 0 4rpx 24rpx rgba(52, 199, 89, 0.4);
		}

		100% {
			box-shadow: 0 4rpx 16rpx rgba(52, 199, 89, 0.2);
		}
	}

	.device-list {
		flex: 1;
		background-color: #fff;
		border-radius: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.list-header {
		padding: 24rpx 30rpx;
		border-bottom: 2rpx solid #f5f5f5;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: linear-gradient(to right, #fff, #f9f9f9);
	}

	.list-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
	}

	.scan-status {
		font-size: 24rpx;
		color: #999;
		padding: 6rpx 20rpx;
		border-radius: 100rpx;
		background-color: #f5f5f5;
		transition: all 0.3s;
	}

	.scan-status.active {
		color: #fff;
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		box-shadow: 0 2rpx 8rpx rgba(52, 199, 89, 0.3);
	}

	.device-scroll {
		flex: 1;
		height: 0;
	}

	.device-item {
		padding: 24rpx 30rpx;
		border-bottom: 2rpx solid #f5f5f5;
		transition: all 0.3s;
	}

	.device-item:active {
		background-color: #f9f9f9;
	}

	.device-main {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 12rpx;
	}

	.device-info {
		flex: 1;
		margin-right: 24rpx;
		min-width: 0;
	}

	.name-container {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-bottom: 6rpx;
	}

	.device-name {
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
		max-width: 400rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.device-type {
		font-size: 20rpx;
		color: #fff;
		background: linear-gradient(135deg, #007AFF 0%, #0066DD 100%);
		padding: 4rpx 12rpx;
		border-radius: 6rpx;
		font-weight: 500;
	}

	.device-id {
		font-size: 24rpx;
		color: #999;
		max-width: 400rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.device-actions {
		display: flex;
		align-items: center;
	}

	.connect-btn {
		margin-left: 20rpx; /* 与设备信息保持距离 */
		line-height: 1.8; /* 调整按钮内文字行高 */
		padding: 0 24rpx; /* 调整按钮内边距 */
		border-radius: 100rpx; /* 圆形按钮 */
		font-size: 24rpx;
		font-weight: 500;
	}

	.connect-btn[disabled] {
		background-color: #c8c7cc !important; /* 禁用状态颜色 */
		color: #ffffff !important;
		opacity: 0.7;
	}

	.device-details {
		margin-top: 12rpx;
	}

	.signal-strength {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.signal-label {
		font-size: 24rpx;
		color: #666;
	}

	.signal-bars {
		display: flex;
		align-items: flex-end;
		gap: 4rpx;
		height: 24rpx;
	}

	.signal-bar {
		width: 6rpx;
		background-color: #eee;
		border-radius: 3rpx;
		transition: all 0.3s;
	}

	.signal-bar:nth-child(1) {
		height: 8rpx;
	}

	.signal-bar:nth-child(2) {
		height: 14rpx;
	}

	.signal-bar:nth-child(3) {
		height: 20rpx;
	}

	.signal-bar:nth-child(4) {
		height: 24rpx;
	}

	.signal-bar.active {
		background: linear-gradient(to top, #007AFF 0%, #0066DD 100%);
	}

	.signal-value {
		font-size: 24rpx;
		color: #666;
	}

	/* 控制面板样式优化 */
	.control-panel {
		margin-top: 24rpx;
		border-top: 2rpx solid #f5f5f5;
		flex: 1;
		display: flex;
		flex-direction: column;
		background-color: #fff;
		border-radius: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
		overflow: hidden;
	}

	.panel-header {
		padding: 24rpx 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2rpx solid #f5f5f5;
		background: linear-gradient(to right, #fff, #f9f9f9);
	}

	.panel-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
	}

	.services-list {
		flex: 1;
		overflow-y: auto;
		padding: 20rpx;
	}

	.service-item {
		margin-bottom: 20rpx;
		border-radius: 12rpx;
		overflow: hidden;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
	}

	.service-header {
		padding: 20rpx;
		background: linear-gradient(to right, #f8f8f8, #f5f5f5);
		display: flex;
		justify-content: space-between;
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
	}

	.characteristics-list {
		padding: 16rpx;
		background-color: #fff;
	}

	.characteristic-item {
		padding: 16rpx;
		border-bottom: 2rpx solid #f5f5f5;
	}

	.characteristic-props {
		margin-top: 12rpx;
		display: flex;
		gap: 12rpx;
	}

	.characteristic-props button {
		font-size: 24rpx;
		padding: 4rpx 16rpx;
		border-radius: 8rpx;
	}

	.log-panel {
		height: 300rpx;
		border-top: 2rpx solid #f5f5f5;
		margin-top: 24rpx;
	}

	.log-header {
		padding: 16rpx 20rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: linear-gradient(to right, #fff, #f9f9f9);
	}

	.log-content {
		height: calc(100% - 60rpx);
		padding: 16rpx;
		background-color: #f9f9f9;
	}

	.log-item {
		font-size: 24rpx;
		margin-bottom: 8rpx;
		display: flex;
		align-items: flex-start;
	}

	.log-time {
		color: #999;
		margin-right: 12rpx;
	}

	.log-type {
		margin: 0 12rpx;
		padding: 2rpx 12rpx;
		border-radius: 6rpx;
		font-weight: 500;
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

	.log-type.read {
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		color: white;
		box-shadow: 0 2rpx 8rpx rgba(52, 199, 89, 0.2);
	}

	.log-type.write {
		background: linear-gradient(135deg, #FF9500 0%, #FF9F0A 100%);
		color: white;
		box-shadow: 0 2rpx 8rpx rgba(255, 149, 0, 0.2);
	}

	.log-type.receive {
		background: linear-gradient(135deg, #5856D6 0%, #5E5CE6 100%);
		color: white;
		box-shadow: 0 2rpx 8rpx rgba(88, 86, 214, 0.2);
	}

	.custom-switch {
		transform: none;
		width: 52px;
		height: 32px;
	}

	.custom-switch::before {
		width: 30px;
		height: 30px;
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
		height: 88rpx;
		font-size: 32rpx;
		font-weight: 600;
		border-radius: 4px;
		transition: all 0.3s;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
		border: none;
	}

	.button-group button[disabled] {
		opacity: 0.5;
	}
	
	.button-scanning {
		background: linear-gradient(to right, #ff3b30, #ff9500) !important;
		box-shadow: 0 2px 6px rgba(255, 59, 48, 0.4);
	}

	/* 自定义弹窗样式 */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 999;
	}

	.modal-content {
		background-color: #fff;
		padding: 40rpx;
		border-radius: 20rpx;
		width: 80%;
		max-width: 600rpx;
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}

	.modal-title {
		font-size: 34rpx;
		font-weight: 600;
		color: #333;
	}

	.modal-close {
		font-size: 40rpx;
		color: #999;
		cursor: pointer;
	}

	.modal-scroll {
		max-height: 80vh; /* 再次增加滚动区域最大高度 */
		margin-bottom: 20rpx; /* 减少与下方按钮组的间距 */
	}

	.modal-textarea {
		width: 100%;
		min-height: 200rpx; /* 最小高度 */
		max-height: 70vh; /* 再次增加文本域最大高度 */
		padding: 20rpx;
		border: 1px solid #eee;
		border-radius: 10rpx;
		font-size: 26rpx;
		line-height: 1.6;
		background-color: #f9f9f9;
		color: #333;
		box-sizing: border-box;
	}

	.modal-button {
		margin-top: 10rpx; /* 按钮间距 */
	}

	.modal-button-close {
		background-color: #f0f0f0;
		color: #333;
	}

	.modal-button-close:active {
		background-color: #e0e0e0;
	}

	.modal-actions {
		display: flex;
		justify-content: space-between; /* 或 space-around, 或 gap */
		gap: 20rpx; /* 按钮之间的间距 */
		margin-top: 20rpx; /* 按钮组与上方内容的间距 */
	}

	.modal-actions .modal-button {
		flex: 1; /* 让按钮平分宽度 */
		margin-top: 0; /* 移除单个按钮的上边距 */
	}

	/* 可以为复制代码按钮单独加个类，如果需要特定样式 */
	.modal-button-copy {
		/* 自定义复制代码按钮样式 */
	}
</style>