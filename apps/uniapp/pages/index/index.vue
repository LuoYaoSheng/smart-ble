	<view class="container">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
			<view class="nav-content" :style="{ height: navBarHeight + 'px' }">
				<text class="nav-title">BLE Toolkit+</text>
				<view class="nav-actions">
					<view class="ble-status-indicator" v-if="bleState === 'on'">
						<view class="status-dot green"></view>
						<text class="status-text">蓝牙已开启</text>
					</view>
					<view class="ble-status-indicator" v-else>
						<view class="status-dot grey"></view>
						<text class="status-text">蓝牙已关闭</text>
					</view>
				</view>
			</view>
		</view>

		<view class="page-content">
			<!-- 过滤选项 -->
			<view class="filter-panel">
				<view class="filter-header" @click="filterExpanded = !filterExpanded">
					<text class="filter-title">过滤设置</text>
					<text class="filter-arrow">{{ filterExpanded ? '▲' : '▼' }}</text>
				</view>

				<view v-if="filterExpanded" class="filter-body">
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
			</view>

		<!-- 操作控制行 -->
		<view class="scan-control-row">
			<view class="scan-btn-container">
				<button 
					:class="['scan-btn', isScanning ? 'scanning' : 'primary']"
					@click="toggleScan" 
				>
					<text class="scan-icon">{{ isScanning ? '■' : '🔍' }}</text>
					<text>{{ isScanning ? '停止扫描' : '开始扫描' }}</text>
				</button>
			</view>
			<view class="device-badge">
				<text v-if="filteredDevices.length === devices.length">发现 {{filteredDevices.length}} 台设备</text>
				<text v-else>显示 {{filteredDevices.length}} / {{devices.length}} 台</text>
			</view>
		</view>

		<!-- 设备列表 -->
		<view class="device-list">
			<scroll-view scroll-y class="device-scroll">
				<view v-if="filteredDevices.length === 0" class="empty-state">
					<text class="empty-icon">{{ devices.length > 0 ? '📭' : '📡' }}</text>
					<text class="empty-title">{{ devices.length > 0 ? '无匹配设备' : '暂无设备' }}</text>
					<text class="empty-sub">{{ devices.length > 0 ? '尝试调整过滤条件' : '点击上方按钮开始扫描' }}</text>
				</view>
				<view v-else class="device-item" v-for="(device, index) in filteredDevices" :key="index"
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
				modalDeviceId: null, // 新增：记录当前弹窗对应的设备ID
				// 节流相关
				deviceBuffer: [],
				throttleTimeout: null,
				throttleInterval: 1000, // ms, 缩短节流间隔以加快显示
				// 自动停止扫描相关
				scanDuration: 5000,
				scanStopTimer: null,
				
				// 导航栏相关
				statusBarHeight: uni.getSystemInfoSync().statusBarHeight || 20,
				navBarHeight: 44,
				bleState: 'off',
				
				// 过滤面板默认折叠（与 Flutter 一致）
				filterExpanded: false
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
			// #ifdef MP-WEIXIN
			const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
			this.navBarHeight = (menuButtonInfo.top - this.statusBarHeight) * 2 + menuButtonInfo.height;
			// #endif

			// 初始化时检查蓝牙状态
			this.checkBluetoothState();
			
			// 监听蓝牙适配器状态变化
			uni.onBluetoothAdapterStateChange(res => {
				this.bleState = res.available ? 'on' : 'off';
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
			// TabBar 模式下，自定义顶部按钮失效或移除处理
		},
		methods: {
			// 检查蓝牙状态
			checkBluetoothState() {
				uni.getBluetoothAdapterState({
					success: (res) => {
						this.bleState = res.available ? 'on' : 'off';
					},
					fail: () => {
						this.bleState = 'off';
					}
				});
			},
			
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

			// #endif

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
				// 清空缓冲区和定时器
				this.deviceBuffer = [];
				if (this.throttleTimeout) clearTimeout(this.throttleTimeout);
				if (this.scanStopTimer) clearTimeout(this.scanStopTimer);
				this.throttleTimeout = null;
				this.scanStopTimer = null;

				uni.openBluetoothAdapter({
					success: () => {
						this.addLog('系统', '初始化蓝牙适配器成功');
						uni.startBluetoothDevicesDiscovery({
							success: () => {
								this.addLog('系统', '开始搜索设备');
								uni.onBluetoothDeviceFound(res => {
									const devices = res.devices;
									// 不直接处理，先放入缓冲区
									this.deviceBuffer.push(...devices);
									
									// 如果节流计时器未启动，则启动它
									if (!this.throttleTimeout) {
										this.throttleTimeout = setTimeout(() => {
											this.processDeviceBuffer();
										}, this.throttleInterval);
									}
								});
								
								// 设置自动停止扫描的定时器
								this.scanStopTimer = setTimeout(() => {
									this.addLog('系统', `扫描达到${this.scanDuration / 1000}秒，自动停止`);
									if (this.isScanning) { // 只有仍在扫描时才停止
										this.stopScan();
									}
								}, this.scanDuration);
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
				// 清除自动停止定时器
				if (this.scanStopTimer) {
					clearTimeout(this.scanStopTimer);
					this.scanStopTimer = null;
				}
				
				uni.stopBluetoothDevicesDiscovery({
					success: () => {
						this.isScanning = false;
						this.addLog('系统', '停止搜索设备');
						// #ifdef MP-WEIXIN
						wx.offBluetoothDeviceFound();
						// #endif
						
						// 处理最后剩余的设备
						this.processDeviceBuffer(); 
					},
					fail: err => {
						this.addLog('错误', '停止搜索失败：' + JSON.stringify(err));
						// 即使失败也要更新状态和清除定时器
						this.isScanning = false;
						if (this.scanStopTimer) {
							clearTimeout(this.scanStopTimer);
							this.scanStopTimer = null;
						}
						if (this.throttleTimeout) {
							clearTimeout(this.throttleTimeout);
							this.throttleTimeout = null;
						}
					},
					complete: () => {
						// 确保状态被重置
						this.isScanning = false;
						if (this.scanStopTimer) {
							clearTimeout(this.scanStopTimer);
							this.scanStopTimer = null;
						}
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
			
			// 处理设备缓冲区（节流核心）
			processDeviceBuffer() {
				if (this.deviceBuffer.length === 0) {
					this.throttleTimeout = null; // 如果缓冲区为空，重置定时器标志
					return;
				}
				
				const currentBuffer = [...this.deviceBuffer]; // 复制缓冲区内容进行处理
				this.deviceBuffer = []; // 清空缓冲区
				let modalDeviceLatestData = null; // 存储当前弹窗设备的最新数据
				
				// 使用 Map 优化查找和更新
				const deviceMap = new Map(this.devices.map(d => [d.deviceId, d]));
				
				currentBuffer.forEach(newDevice => {
					const deviceId = newDevice.deviceId;
					const advertisDataHex = this.ab2hex(newDevice.advertisData);
					const advertisServiceUUIDs = newDevice.advertisServiceUUIDs || [];
					
					const existingDevice = deviceMap.get(deviceId);
					let processedData;
					
					if (existingDevice) {
						// 更新现有设备
						processedData = {
							...existingDevice,
							...newDevice, // 更新RSSI, name等
							advertisDataHex: advertisDataHex,
							advertisServiceUUIDs: advertisServiceUUIDs
						};
					} else {
						// 添加新设备
						processedData = {
							...newDevice,
							advertisDataHex: advertisDataHex,
							advertisServiceUUIDs: advertisServiceUUIDs,
							connected: false // 确保新设备状态正确
						};
					}
					deviceMap.set(deviceId, processedData);
					
					// 如果是当前弹窗的设备，记录其最新数据
					if (this.showAdvDataModal && this.modalDeviceId === deviceId) {
						modalDeviceLatestData = processedData;
					}
				});
				
				// 将 Map 转回数组并更新 this.devices
				// 按信号强度排序，并限制显示数量
				let sortedDevices = Array.from(deviceMap.values()).sort((a, b) => b.RSSI - a.RSSI);
				const displayLimit = 100; // 设置显示上限
				this.devices = sortedDevices.slice(0, displayLimit);
				
				// 如果需要，更新弹窗内容 (检查限制后的列表是否还包含该设备)
				if (modalDeviceLatestData && this.devices.some(d => d.deviceId === this.modalDeviceId)) {
					// modalDeviceLatestData 可能不在排序后的前100里，但为了弹窗一致性，仍用其最新数据更新
					// 或者只在 modalDeviceLatestData 仍在 this.devices 中时才更新
					this.updateModalContent(modalDeviceLatestData);
				} else if (this.showAdvDataModal && !this.devices.some(d => d.deviceId === this.modalDeviceId)){
					// 如果弹窗对应的设备被过滤掉了，可以选择关闭弹窗或提示
					// this.closeAdvDataModal(); 
					// 或者保留弹窗内容不变
				}
				
				this.throttleTimeout = null; // 处理完成，重置定时器标志
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
				let content = `设备ID: ${this.formatDeviceId(device.deviceId)}\n`; // 显示时仍然格式化
				content += `名称: ${device.name || 'N/A'}\n`;
				content += `RSSI: ${device.RSSI} dBm\n\n`; // RSSI 也会实时更新
				content += `广播服务UUIDs:\n${device.advertisServiceUUIDs.length > 0 ? device.advertisServiceUUIDs.join('\n') : '无'}\n\n`;
				content += `广播数据 (Hex):\n${device.advertisDataHex || 'N/A'}`;
				this.advDataModalContent = content;
			},
			
			// 复制代码到剪贴板
			copyAdvData() {
				// 找到当前弹窗对应的设备
				const currentModalDevice = this.devices.find(d => d.deviceId === this.modalDeviceId);
				if (!currentModalDevice) {
					uni.showToast({ title: '未找到设备信息', icon: 'none' });
					return;
				}

				// 构建要复制的完整内容
				let fullContent = `设备ID: ${currentModalDevice.deviceId}\n`; // 使用完整的 deviceId
				fullContent += `名称: ${currentModalDevice.name || 'N/A'}\n`;
				fullContent += `RSSI: ${currentModalDevice.RSSI} dBm\n\n`;
				fullContent += `广播服务UUIDs:\n${currentModalDevice.advertisServiceUUIDs.length > 0 ? currentModalDevice.advertisServiceUUIDs.join('\n') : '无'}\n\n`;
				fullContent += `广播数据 (Hex):\n${currentModalDevice.advertisDataHex || 'N/A'}`;
				
				uni.setClipboardData({
					data: fullContent,
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
			// 清除节流定时器
			if (this.throttleTimeout) {
				clearTimeout(this.throttleTimeout);
				this.throttleTimeout = null;
			}
			// 清除自动停止扫描定时器
			if (this.scanStopTimer) {
				clearTimeout(this.scanStopTimer);
				this.scanStopTimer = null;
			}
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
		height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: #f7f8fa;
	}

	.custom-navbar {
		background-color: #ffffff;
		box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
		z-index: 100;
	}

	.nav-content {
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 30rpx;
	}

	.nav-title {
		font-size: 34rpx;
		font-weight: 600;
		color: #333;
	}

	.nav-actions {
		display: flex;
		align-items: center;
	}

	.ble-status-indicator {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.status-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
	}

	.status-dot.green {
		background-color: #34C759;
		box-shadow: 0 0 8rpx rgba(52, 199, 89, 0.4);
	}

	.status-dot.grey {
		background-color: #999999;
	}

	.status-text {
		font-size: 24rpx;
		color: #666;
	}

	.page-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 30rpx;
		gap: 24rpx;
		height: 0;
	}

	.filter-panel {
		background-color: #fff;
		padding: 30rpx;
		border-radius: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
		flex-shrink: 0;
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0;
		padding: 4rpx 0;
	}

	.filter-header:active {
		opacity: 0.7;
	}

	.filter-arrow {
		font-size: 22rpx;
		color: #999;
		transition: all 0.2s;
	}

	.filter-body {
		margin-top: 24rpx;
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

	.scan-control-row {
		display: flex;
		align-items: center;
		padding: 0 10rpx;
		margin-bottom: 24rpx;
	}

	.scan-btn-container {
		flex: 1;
		margin-right: 24rpx;
	}

	.scan-btn {
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12rpx;
		font-size: 30rpx;
		font-weight: 500;
		border-radius: 16rpx;
		color: #fff;
		border: none;
		transition: all 0.3s;
	}

	.scan-btn.primary {
		background-color: #007AFF;
	}

	.scan-btn.scanning {
		background-color: #FF3B30;
	}

	.scan-icon {
		font-size: 32rpx;
	}

	.device-badge {
		background-color: rgba(0, 122, 255, 0.1);
		padding: 12rpx 24rpx;
		border-radius: 40rpx;
	}

	.device-badge text {
		color: #007AFF;
		font-size: 26rpx;
		font-weight: 500;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 400rpx;
	}

	.empty-icon {
		font-size: 80rpx;
		margin-bottom: 20rpx;
		opacity: 0.5;
	}

	.empty-title {
		font-size: 32rpx;
		color: #999;
		margin-bottom: 12rpx;
	}

	.empty-sub {
		font-size: 24rpx;
		color: #ccc;
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