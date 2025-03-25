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
					@click="connectDevice(device)">
					<view class="device-main">
						<view class="device-info">
							<view class="name-container">
								<text class="device-name">{{device.name || '未知设备'}}</text>
								<text class="device-type" v-if="device.name">{{getDeviceType(device.name)}}</text>
							</view>
							<text class="device-id">{{formatDeviceId(device.deviceId)}}</text>
						</view>
						<view class="device-status" :class="{'connected': device.connected}">
							<text>{{device.connected ? '已连接' : '点击连接'}}</text>
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
				hideNoName: false
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
			// 请求蓝牙和定位权限
			this.requestWxPermissions();
			// #endif

			// 监听特征值变化
			uni.onBLECharacteristicValueChange(res => {
				const value = Array.from(new Uint8Array(res.value))
					.map(item => String.fromCharCode(item))
					.join('');
				this.addLog('接收', `收到数据：${value}`);
			});
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
			// 请求微信小程序的蓝牙和定位权限
			requestWxPermissions() {
				// 请求定位权限
				wx.getSetting({
					success: (res) => {
						if (!res.authSetting['scope.userLocation']) {
							wx.authorize({
								scope: 'scope.userLocation',
								success: () => {
									console.log('定位权限授权成功');
									this.addLog('system', '定位权限授权成功');
								},
								fail: (err) => {
									console.error('定位权限授权失败', err);
									this.addLog('error', '定位权限授权失败，请在设置中开启');
									// 引导用户去设置页面开启权限
									wx.showModal({
										title: '提示',
										content: '需要获取您的地理位置，请在设置中开启定位权限',
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
									devices.forEach(device => {
										if (!this.devices.find(d => d.deviceId ===
												device.deviceId)) {
											this.devices.push(device);
										}
									});
								});
							},
							fail: err => {
								this.addLog('错误', '搜索设备失败：' + JSON.stringify(err));
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
					this.startScan();
				}
			},

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
				return deviceId;
				// 只显示设备ID的后12位，前面用...代替
				return deviceId.length > 12 ? '...' + deviceId.slice(-12) : deviceId;
			}
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

	.device-status {
		padding: 8rpx 20rpx;
		border-radius: 100rpx;
		background-color: #f5f5f5;
		font-size: 24rpx;
		color: #666;
		font-weight: 500;
		transition: all 0.3s;
	}

	.device-status.connected {
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		color: #fff;
		box-shadow: 0 2rpx 8rpx rgba(52, 199, 89, 0.3);
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
		border-radius: 20rpx;
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
</style>