<template>
	<view class="container">
		<!-- 设备信息面板 -->
		<view class="device-panel">
			<view class="device-header">
				<view class="device-info">
					<view class="name-container">
						<text class="device-name">{{deviceInfo.name || '未知设备'}}</text>
						<view class="status-dot" :class="{'connected': isConnected}"></view>
				</view>
					<view class="device-id-container">
						<text class="device-id-label">设备ID:</text>
						<text class="device-id">{{deviceInfo.deviceId}}</text>
				</view>
			</view>
				<view class="device-actions">
					<button class="action-btn" :class="{'connected': isConnected}" @click="toggleConnection">
						{{isConnected ? '断开连接' : '连接设备'}}
				</button>
			</view>
			</view>
		</view>

		<!-- 主要内容区域 -->
		<scroll-view class="main-content" scroll-y>
			<!-- 服务列表 -->
			<view class="services-panel">
				<view class="panel-header">
					<text class="panel-title">服务列表</text>
					<text class="toggle-btn" @click="toggleAllServices">{{showAllServices ? '收起列表' : '展开列表'}}</text>
					</view>
				<view class="services-list">
					<view v-for="(service, sIndex) in services" :key="sIndex" class="service-item">
					<view class="service-header" @click="toggleService(sIndex)">
						<view class="service-info">
								<text class="service-name">服务 {{sIndex + 1}}</text>
							<text class="service-uuid">{{service.uuid}}</text>
						</view>
							<text class="arrow">{{service.isOpen ? '▼' : '▶'}}</text>
					</view>
					<view v-if="service.isOpen" class="characteristics-list">
						<view v-for="(characteristic, cIndex) in service.characteristics" 
							:key="cIndex" 
							class="characteristic-item">
								<view class="characteristic-info">
									<text class="characteristic-name">{{characteristic.name || '特征值 ' + (cIndex + 1)}}</text>
									<text class="characteristic-uuid">{{characteristic.uuid}}</text>
									</view>
								<view class="characteristic-props">
									<button class="prop-btn read" 
										v-if="characteristic.properties.read"
										@click="readCharacteristic(service.uuid, characteristic.uuid)">
										<text class="btn-icon">📖</text>
										<text>读取</text>
									</button>
									<button class="prop-btn write" 
										v-if="characteristic.properties.write"
										@click="showWriteModal(service.uuid, characteristic.uuid)">
										<text class="btn-icon">✏️</text>
										<text>写入</text>
									</button>
									<button class="prop-btn notify" 
										v-if="characteristic.properties.notify"
										@click="toggleNotify(service.uuid, characteristic.uuid)">
										<text class="btn-icon">{{characteristic.notifying ? '🔔' : '🔕'}}</text>
										<text>{{characteristic.notifying ? '停止监听' : '监听'}}</text>
									</button>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 通信日志 -->
			<view class="log-panel">
				<view class="panel-header">
					<text class="panel-title">通信日志</text>
					<view class="log-actions">
						<button class="action-btn share" @click="shareLogs">导出</button>
						<button class="action-btn clear" @click="clearLogs">清除</button>
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
		</scroll-view>

		<!-- 写入数据模态框 -->
		<view class="modal" v-if="showWriteDataModal">
			<view class="modal-content">
				<view class="modal-header">
					<text class="modal-title">写入数据</text>
					<text class="modal-close" @click="closeWriteModal">×</text>
				</view>
				<view class="modal-body">
					<view class="input-group">
						<text class="input-label">数据类型：</text>
						<radio-group @change="onSendTypeChange" class="radio-group">
							<label class="radio-label">
								<radio value="text" :checked="sendType === 'text'" />文本
							</label>
							<label class="radio-label">
								<radio value="hex" :checked="sendType === 'hex'" />HEX
							</label>
						</radio-group>
						</view>
					<view class="input-group">
						<text class="input-label">数据内容：</text>
						<input type="text" 
							v-model="sendData" 
							:placeholder="sendType === 'text' ? '请输入文本数据' : '请输入HEX数据，如：FF 00 01'"
							class="data-input"
							ref="dataInput"
							@focus="onInputFocus" />
								</view>
							</view>
				<view class="modal-footer">
					<button class="modal-btn cancel" @click="closeWriteModal">取消</button>
					<button class="modal-btn confirm" @click="confirmWrite">确定</button>
						</view>
					</view>
			</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				deviceInfo: {},
				isConnected: false,
				services: [],
				logs: [],
				logScrollTop: 0,
				isSending: false,
				currentService: '',
				currentCharacteristic: '',
				sendType: 'text',
				sendData: '',
				autoSend: false,
				sendInterval: 1000,
				autoSendTimer: null,
				isInitializing: false,
				connectionRetryCount: 0,
				maxRetryCount: 3,
				showAllServices: false,
				isUserDisconnected: false,
				showWriteDataModal: false,
				writeServiceId: '',
				writeCharacteristicId: '',
			}
		},
		computed: {
			getSendButtonText() {
				if (!this.currentService || !this.currentCharacteristic) {
					return '请先选择特征值';
				}
				if (this.isSending) {
					return '发送中...';
				}
				return '发送';
			}
		},
		onLoad(options) {
			if (options.deviceInfo) {
				try {
					this.deviceInfo = JSON.parse(decodeURIComponent(options.deviceInfo))
					this.initBluetoothAdapter()
				} catch (error) {
					this.addLog('错误', '设备信息解析失败：' + error.message)
					uni.showToast({
						title: '设备信息无效',
						icon: 'none'
					})
				}
			}
		},
		methods: {
			// 初始化蓝牙适配器
			async initBluetoothAdapter() {
				if (this.isInitializing) return
				this.isInitializing = true
				
				try {
					this.addLog('系统', '正在初始化蓝牙适配器...')
					await uni.openBluetoothAdapter()
					this.addLog('系统', '蓝牙适配器初始化成功')
					
					// 开始连接设备
					await this.connectDevice()
				} catch (error) {
					this.addLog('错误', '初始化蓝牙适配器失败：' + error.errMsg)
					this.isConnected = false
					this.retryConnection()
				} finally {
					this.isInitializing = false
				}
			},

			// 连接设备
			async connectDevice() {
				try {
					this.addLog('系统', '正在连接设备...')
					await uni.createBLEConnection({
						deviceId: this.deviceInfo.deviceId,
						timeout: 10000 // 设置超时时间为10秒
					})
					
					// 获取服务
					await this.getServices()
					
					this.isConnected = true
					this.connectionRetryCount = 0 // 重置重试计数
					this.addLog('系统', '设备连接成功')
					
					// 监听通知
					uni.onBLECharacteristicValueChange((res) => {
						this.handleReceivedData(res.value)
					})
					
					// 监听连接状态
					uni.onBLEConnectionStateChange((res) => {
						this.isConnected = res.connected
						this.addLog('系统', res.connected ? '设备已连接' : '设备已断开')
						if (!res.connected && !this.isUserDisconnected) {
							this.retryConnection()
						}
					})
					
				} catch (error) {
					this.addLog('错误', '连接失败：' + error.errMsg)
					this.isConnected = false
					this.retryConnection()
				}
			},

			// 重试连接
			async retryConnection() {
				if (this.connectionRetryCount >= this.maxRetryCount) {
					this.addLog('错误', '连接重试次数已达上限')
					uni.showToast({
						title: '连接失败，请重试',
						icon: 'none'
					})
					return
				}
				
				this.connectionRetryCount++
				this.addLog('系统', `第 ${this.connectionRetryCount} 次重试连接...`)
				
				// 延迟2秒后重试
							setTimeout(() => {
					this.connectDevice()
				}, 2000)
			},

			// 切换所有服务展开状态
			toggleAllServices() {
				this.showAllServices = !this.showAllServices
				this.services.forEach(service => {
					service.isOpen = this.showAllServices
				})
			},

			// 切换单个服务展开状态
			toggleService(index) {
				this.services[index].isOpen = !this.services[index].isOpen
				// 更新整体展开状态
				this.showAllServices = this.services.every(service => service.isOpen)
			},

			// 读取特征值
			async readCharacteristic(serviceId, characteristicId) {
				try {
					await uni.readBLECharacteristicValue({
						deviceId: this.deviceInfo.deviceId,
					serviceId,
						characteristicId
					})
					this.addLog('读取', `开始读取特征值：${characteristicId}`)
				} catch (error) {
					this.addLog('错误', `读取特征值失败：${error.errMsg}`)
				}
			},

			// 写入特征值
			async writeCharacteristic(serviceId, characteristicId, data) {
				try {
					this.addLog('系统', `准备写入数据到特征值: ${characteristicId}`);
					
					// 根据发送类型处理数据
				let buffer;
					if (this.sendType === 'hex') {
						// 处理HEX格式
						const hexString = data.replace(/\s/g, '').toUpperCase();
						if (!/^[0-9A-F]+$/.test(hexString)) {
							throw new Error('无效的HEX格式');
						}
						buffer = new ArrayBuffer(hexString.length / 2);
					const dataView = new DataView(buffer);
						for (let i = 0; i < hexString.length; i += 2) {
							dataView.setUint8(i / 2, parseInt(hexString.substr(i, 2), 16));
						}
				} else {
						// 处理文本格式，使用 UTF-8 编码
						// 将字符串转换为 UTF-8 编码的字节数组
						const bytes = [];
						for (let i = 0; i < data.length; i++) {
							const charCode = data.charCodeAt(i);
							if (charCode < 0x80) {
								// ASCII 字符
								bytes.push(charCode);
							} else if (charCode < 0x800) {
								// 2字节 UTF-8
								bytes.push(0xC0 | (charCode >> 6));
								bytes.push(0x80 | (charCode & 0x3F));
							} else if (charCode < 0x10000) {
								// 3字节 UTF-8
								bytes.push(0xE0 | (charCode >> 12));
								bytes.push(0x80 | ((charCode >> 6) & 0x3F));
								bytes.push(0x80 | (charCode & 0x3F));
							} else if (charCode < 0x110000) {
								// 4字节 UTF-8
								bytes.push(0xF0 | (charCode >> 18));
								bytes.push(0x80 | ((charCode >> 12) & 0x3F));
								bytes.push(0x80 | ((charCode >> 6) & 0x3F));
								bytes.push(0x80 | (charCode & 0x3F));
							}
						}
						buffer = new ArrayBuffer(bytes.length);
					const dataView = new DataView(buffer);
						for (let i = 0; i < bytes.length; i++) {
							dataView.setUint8(i, bytes[i]);
						}
					}
					
					this.addLog('系统', `数据长度: ${buffer.byteLength} 字节`);
					
					// 写入数据
					await uni.writeBLECharacteristicValue({
						deviceId: this.deviceInfo.deviceId,
						serviceId: serviceId,
						characteristicId: characteristicId,
					value: buffer,
						writeType: 'write'  // 使用有应答写入
					});
					
					// 记录发送的日志
					const hexString = Array.from(new Uint8Array(buffer))
						.map(b => b.toString(16).padStart(2, '0').toUpperCase())
						.join(' ');
						
					this.addLog('写入', this.sendType === 'hex' ? 
						`HEX: ${hexString}` : 
						`TEXT: ${data} (HEX: ${hexString})`);
					
					// 显示成功提示
					uni.showToast({
						title: '发送成功',
						icon: 'success'
					});
					
				} catch (error) {
					this.addLog('错误', `写入特征值失败: ${error.errMsg}`);
					uni.showToast({
						title: error.message || '发送失败',
						icon: 'none'
					});
					throw error;
				}
			},
			
			// 切换通知状态
			async toggleNotify(serviceId, characteristicId) {
				const characteristic = this.services
					.find(s => s.uuid === serviceId)
					?.characteristics.find(c => c.uuid === characteristicId)
				
				if (!characteristic) return
				
				try {
					await uni.notifyBLECharacteristicValueChange({
						deviceId: this.deviceInfo.deviceId,
					serviceId,
						characteristicId,
						state: !characteristic.notifying
					})
					
					characteristic.notifying = !characteristic.notifying
					this.addLog('系统', `${characteristic.notifying ? '开始' : '停止'}监听特征值：${characteristicId}`)
				} catch (error) {
					this.addLog('错误', `设置通知状态失败：${error.errMsg}`)
				}
			},
			
			// 发送数据
			async sendDataToDevice() {
				if (!this.currentService || !this.currentCharacteristic || !this.sendData.trim()) {
					uni.showToast({
						title: '请选择特征值并输入数据',
						icon: 'none'
					})
					return
				}
				
				if (this.isSending) return
				
				this.isSending = true
				
				try {
					const buffer = this.prepareData(this.sendData.trim(), this.sendType === 'hex')
					
					await uni.writeBLECharacteristicValue({
						deviceId: this.deviceInfo.deviceId,
						serviceId: this.currentService,
						characteristicId: this.currentCharacteristic,
						value: buffer
					})
					
					this.addLog('发送', this.sendData)
					uni.showToast({
						title: '发送成功',
						icon: 'success'
					})
				} catch (error) {
					this.addLog('错误', '发送失败：' + error.errMsg)
					uni.showToast({
						title: '发送失败',
						icon: 'error'
					})
				} finally {
					setTimeout(() => {
						this.isSending = false
					}, 1000)
				}
			},
			
			// 准备发送数据
			prepareData(data, isHex) {
				if (isHex) {
					const hexArray = data.split(' ').filter(Boolean)
					const buffer = new ArrayBuffer(hexArray.length)
					const dataView = new DataView(buffer)
					hexArray.forEach((hex, index) => {
						dataView.setUint8(index, parseInt(hex, 16))
					})
					return buffer
				} else {
					const buffer = new ArrayBuffer(data.length)
					const dataView = new DataView(buffer)
					for (let i = 0; i < data.length; i++) {
						dataView.setUint8(i, data.charCodeAt(i))
					}
					return buffer
				}
			},
			
			// 处理接收到的数据
			handleReceivedData(value) {
				try {
					// 将ArrayBuffer转换为十六进制字符串
					let hexString = ''
					const dataView = new DataView(value)
					for (let i = 0; i < dataView.byteLength; i++) {
						const byte = dataView.getUint8(i)
						hexString += byte.toString(16).padStart(2, '0').toUpperCase() + ' '
					}
					
					// 尝试将数据转换为文本
					let textString = ''
					for (let i = 0; i < dataView.byteLength; i++) {
						const byte = dataView.getUint8(i)
						// 只转换可打印的ASCII字符
						if (byte >= 32 && byte <= 126) {
							textString += String.fromCharCode(byte)
				} else {
							textString += '.'
						}
					}
					
					// 同时显示十六进制和文本格式
					this.addLog('接收', `HEX: ${hexString.trim()}\nTEXT: ${textString}`)
				} catch (error) {
					this.addLog('错误', '数据解析失败：' + error.message)
				}
			},

			// 添加日志
			addLog(type, message) {
				const now = new Date()
				const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
				
				// 根据消息内容判断是否为通知消息
				if (message.includes('监听特征值')) {
					type = 'notify'
				}
				
				this.logs.unshift({
					time,
					type,
					message
				})
				
				// 限制日志数量
				if (this.logs.length > 100) {
					this.logs.pop()
				}
				
				// 滚动到底部
				this.$nextTick(() => {
					this.logScrollTop = 0
				})
			},
			
			// 处理自动发送切换
			onAutoSendChange(e) {
				this.autoSend = e.detail.value
				
				if (this.autoSend) {
					this.startAutoSend()
				} else if (this.autoSendTimer) {
					clearInterval(this.autoSendTimer)
					this.autoSendTimer = null
				}
			},
			
			// 验证发送间隔
			validateInterval() {
				const interval = parseInt(this.sendInterval)
				if (isNaN(interval) || interval < 100) {
					this.sendInterval = 100
					uni.showToast({
						title: '最小间隔为100ms',
						icon: 'none'
					})
				} else if (interval > 10000) {
					this.sendInterval = 10000
					uni.showToast({
						title: '最大间隔为10000ms',
						icon: 'none'
					})
				}
				
				if (this.autoSend) {
					this.startAutoSend()
				}
			},
			
			// 开始自动发送
			startAutoSend() {
				if (this.autoSendTimer) {
					clearInterval(this.autoSendTimer)
				}
				
				this.autoSendTimer = setInterval(() => {
					this.sendDataToDevice()
				}, parseInt(this.sendInterval) || 1000)
			},

			// 切换连接状态
			async toggleConnection() {
				if (this.isConnected) {
					try {
						this.isUserDisconnected = true
						await uni.closeBLEConnection({
							deviceId: this.deviceInfo.deviceId
						})
						this.isConnected = false
						this.addLog('系统', '设备已断开连接')
								uni.showToast({
							title: '设备已断开',
									icon: 'success'
						})
					} catch (error) {
						this.addLog('错误', '断开连接失败：' + error.errMsg)
								uni.showToast({
							title: '断开连接失败',
									icon: 'error'
						})
					}
				} else {
					this.isUserDisconnected = false
					await this.connectDevice()
				}
			},

			// 清除日志
			clearLogs() {
				this.logs = []
				this.logScrollTop = 0
				this.addLog('系统', '日志已清除')
			},
			
			// 分享日志
			shareLogs() {
				if (this.logs.length === 0) {
				uni.showToast({
						title: '暂无日志可分享',
						icon: 'none'
					})
					return
				}

				// 格式化日志内容
				const logContent = this.logs.map(log => {
					return `[${log.time}] [${log.type}] ${log.message}`
				}).join('\n')
				
				// 复制到剪贴板
				uni.setClipboardData({
					data: logContent,
							success: () => {
								uni.showToast({
							title: '日志已复制',
									icon: 'success'
						})
							},
							fail: () => {
								uni.showToast({
							title: '复制失败',
							icon: 'none'
						})
					}
				})
			},

			// 显示写入数据模态框
			showWriteModal(serviceId, characteristicId) {
				this.writeServiceId = serviceId
				this.writeCharacteristicId = characteristicId
				this.showWriteDataModal = true
				this.sendData = ''
				this.sendType = 'text'
			},
			
			// 处理发送类型切换
			onSendTypeChange(e) {
				this.sendType = e.detail.value
				// 清空输入框
				this.sendData = ''
			},
			
			// 处理输入框获得焦点
			onInputFocus() {
				// 如果输入框为空，可以在这里添加一些默认值
				if (!this.sendData) {
					this.sendData = ''
				}
			},
			
			// 关闭写入数据模态框
			closeWriteModal() {
				this.showWriteDataModal = false
				this.sendData = ''
			},
			
			// 确认写入数据
			async confirmWrite() {
				if (!this.sendData.trim()) {
					uni.showToast({
						title: '请输入数据',
						icon: 'none'
					})
					return
				}
				
				try {
					await this.writeCharacteristic(this.writeServiceId, this.writeCharacteristicId, this.sendData)
					this.closeWriteModal()
				} catch (error) {
					console.error('写入数据失败:', error)
				}
			},

			// 获取特征值名称
			getCharacteristicName(uuid) {
				// 从UUID中提取最后4位
				const last4 = uuid.slice(-4).toLowerCase();
				
				// 根据最后4位判断特征值类型
				switch(last4) {
					case '26a8':
						return 'LED控制(常亮)';
					case '26a9':
						return 'LED控制(慢闪)';
					case '26b0':
						return '只读特征';
					case '26b1':
						return '只写特征';
					case '26b2':
						return '只通知特征';
					case '26b3':
						return '读写特征';
					case '26b4':
						return '读和通知特征';
					case '26b5':
						return '写和通知特征';
					case '26b6':
						return '读写和通知特征';
					default:
						return '未知特征';
				}
			},

			// 获取服务列表
			async getServices() {
				try {
					this.addLog('系统', '开始获取服务列表...');
					
					// 添加延迟，等待服务发现完成
					await new Promise(resolve => setTimeout(resolve, 2000));
					
					// 获取服务列表
					const services = await uni.getBLEDeviceServices({
						deviceId: this.deviceInfo.deviceId
					});
					
					this.addLog('系统', `获取到 ${services.services.length} 个服务`);
					
					// 清空现有服务列表
					this.services = [];
					
					// 过滤掉系统服务（通常以 1800 开头）
					const filteredServices = services.services.filter(service => {
						const isSystemService = service.uuid.toLowerCase().startsWith('1800');
						if (isSystemService) {
							this.addLog('系统', `跳过系统服务: ${service.uuid}`);
						}
						return !isSystemService;
					});
					
					this.addLog('系统', `过滤后剩余 ${filteredServices.length} 个服务`);
					
					// 遍历每个服务
					for (const service of filteredServices) {
						this.addLog('系统', `正在处理服务: ${service.uuid}`);
						
						const serviceInfo = {
							uuid: service.uuid,
							isPrimary: service.isPrimary,
							isOpen: false,
							characteristics: []
						};
						
						try {
							// 添加延迟，等待特征值发现完成
							await new Promise(resolve => setTimeout(resolve, 1000));
							
							// 获取该服务的特征值列表
							const characteristics = await uni.getBLEDeviceCharacteristics({
								deviceId: this.deviceInfo.deviceId,
								serviceId: service.uuid
							});
							
							this.addLog('系统', `服务 ${service.uuid} 的特征值数量: ${characteristics.characteristics.length}`);
							
							// 遍历特征值
							for (const characteristic of characteristics.characteristics) {
								// 过滤掉系统特征值（通常以 2A 开头）
								if (characteristic.uuid.toLowerCase().startsWith('2a')) {
									this.addLog('系统', `跳过系统特征值: ${characteristic.uuid}`);
									continue;
								}
								
								const charInfo = {
									uuid: characteristic.uuid,
									properties: characteristic.properties,
									value: '',
									notifying: false,
									name: this.getCharacteristicName(characteristic.uuid)
								};
								
								this.addLog('系统', `特征值: ${charInfo.name} (${characteristic.uuid})`);
								
								// 如果是可读特征值，尝试读取其值
								if (characteristic.properties.read) {
									try {
										// 添加延迟，等待读取操作完成
										await new Promise(resolve => setTimeout(resolve, 500));
										
										await uni.readBLECharacteristicValue({
											deviceId: this.deviceInfo.deviceId,
											serviceId: service.uuid,
											characteristicId: characteristic.uuid
										});
										this.addLog('读取', `已请求读取特征值: ${charInfo.name}`);
									} catch (error) {
										this.addLog('错误', `读取特征值失败: ${error.errMsg}`);
									}
								}
								
								serviceInfo.characteristics.push(charInfo);
							}
						} catch (error) {
							this.addLog('错误', `获取特征值失败: ${error.errMsg}`);
							// 即使获取特征值失败，也继续处理下一个服务
							continue;
						}
						
						this.services.push(serviceInfo);
					}
					
					this.addLog('系统', `服务列表获取完成，共 ${this.services.length} 个服务`);
					
				} catch (error) {
					this.addLog('错误', `获取服务列表失败: ${error.errMsg}`);
					uni.showToast({
						title: '获取服务列表失败',
						icon: 'none'
					});
				}
			},

			// 字节数组转字符串
			bytesToString(bytes) {
				if (!bytes || bytes.length === 0) return '';
				
				// 尝试UTF-8解码
				try {
					const decoder = new TextDecoder('utf-8');
					return decoder.decode(new Uint8Array(bytes));
				} catch (error) {
					console.error('UTF-8解码失败:', error);
				}
				
				// 如果UTF-8解码失败，尝试HEX格式
				try {
					return Array.from(bytes)
						.map(byte => byte.toString(16).padStart(2, '0'))
						.join(' ');
				} catch (error) {
					console.error('HEX转换失败:', error);
				}
				
				return '无法解析';
			},
		},
		onUnload() {
			// 设置用户主动断开标志
			this.isUserDisconnected = true
			
			// 清除自动发送定时器
			if (this.autoSendTimer) {
				clearInterval(this.autoSendTimer)
				this.autoSendTimer = null
			}
			
			// 断开连接
			if (this.isConnected) {
				uni.closeBLEConnection({
					deviceId: this.deviceInfo.deviceId
				})
			}
			
			// 关闭蓝牙适配器
			uni.closeBluetoothAdapter()
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

	.device-panel {
		background-color: #fff;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
	}

	.device-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.device-info {
		flex: 1;
		margin-right: 20rpx;
	}

	.name-container {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-bottom: 12rpx;
	}

	.device-name {
		font-size: 36rpx;
		font-weight: 600;
		color: #333;
	}

	.status-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background-color: #999;
		transition: all 0.3s;
	}

	.status-dot.connected {
		background-color: #34C759;
		box-shadow: 0 0 8rpx rgba(52,199,89,0.4);
	}

	.device-id-container {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.device-id-label {
		font-size: 24rpx;
		color: #666;
	}

	.device-id {
		font-size: 24rpx;
		color: #999;
		flex: 1;
		word-break: break-all;
	}

	.device-actions {
		display: flex;
		gap: 16rpx;
	}

	.action-btn {
		margin: 0;
		padding: 0 30rpx;
		height: 64rpx;
		line-height: 64rpx;
		font-size: 28rpx;
		border-radius: 32rpx;
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
		color: #fff;
		border: none;
		transition: all 0.3s;
	}

	.action-btn.connected {
		background: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
	}

	.main-content {
		flex: 1;
		height: 0;
	}

	.services-panel, .log-panel {
		background-color: #fff;
		margin-bottom: 20rpx;
		border-radius: 20rpx;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
		overflow: hidden;
	}

	.panel-header {
		padding: 24rpx 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2rpx solid #f5f5f5;
	}

	.panel-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
	}

	.services-list {
		padding: 20rpx;
	}

	.service-item {
		margin-bottom: 20rpx;
		border-radius: 12rpx;
		overflow: hidden;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
	}

	.service-header {
		padding: 20rpx;
		background: linear-gradient(to right, #f8f8f8, #f5f5f5);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.service-info {
		flex: 1;
		margin-right: 20rpx;
	}

	.service-name {
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
		display: block;
		margin-bottom: 8rpx;
	}

	.service-uuid {
		font-size: 24rpx;
		color: #666;
		word-break: break-all;
	}

	.characteristics-list {
		padding: 16rpx;
		background-color: #fff;
	}

	.characteristic-item {
		padding: 16rpx;
		border-bottom: 2rpx solid #f5f5f5;
	}

	.characteristic-info {
		margin-bottom: 12rpx;
	}

	.characteristic-name {
		font-size: 26rpx;
		color: #333;
		font-weight: 500;
		display: block;
		margin-bottom: 4rpx;
	}

	.characteristic-uuid {
		font-size: 24rpx;
		color: #666;
		word-break: break-all;
	}

	.characteristic-props {
		display: flex;
		gap: 12rpx;
	}

	.prop-btn {
		margin: 0;
		padding: 0 20rpx;
		height: 56rpx;
		line-height: 56rpx;
		font-size: 24rpx;
		border-radius: 28rpx;
		border: none;
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.prop-btn.read {
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		color: #fff;
	}

	.prop-btn.write {
		background: linear-gradient(135deg, #FF9500 0%, #FF9F0A 100%);
		color: #fff;
	}

	.prop-btn.notify {
		background: linear-gradient(135deg, #5856D6 0%, #5E5CE6 100%);
		color: #fff;
	}

	.btn-icon {
		font-size: 28rpx;
	}

	.log-panel {
		height: 970rpx;
	}

	.log-content {
		height: calc(100% - 88rpx);
		padding: 20rpx;
	}

	.log-item {
		font-size: 24rpx;
		margin-bottom: 12rpx;
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
	}

	.log-type.error {
		background: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
		color: white;
	}

	.log-type.read {
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		color: white;
	}

	.log-type.write {
		background: linear-gradient(135deg, #FF9500 0%, #FF9F0A 100%);
		color: white;
	}

	.log-type.receive {
		background: linear-gradient(135deg, #5856D6 0%, #5E5CE6 100%);
		color: white;
	}

	.log-type.notify {
		background: linear-gradient(135deg, #FF2D55 0%, #FF375F 100%);
		color: white;
	}

	.log-message {
		color: #333;
		flex: 1;
		word-break: break-all;
	}

	.log-actions {
		display: flex;
		gap: 12rpx;
	}
	
	.action-btn.share {
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
		color: #fff;
	}
	
	.action-btn.clear {
		background: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
		color: #fff;
	}

	.modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 999;
	}

	.modal-content {
		width: 80%;
		background-color: #fff;
		border-radius: 20rpx;
		overflow: hidden;
		margin-top: -200rpx; /* 整体上移 */
	}

	.modal-header {
		padding: 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2rpx solid #f5f5f5;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
	}

	.modal-close {
		font-size: 40rpx;
		color: #999;
		padding: 10rpx;
	}

	.modal-body {
		padding: 30rpx;
	}

	.input-group {
		margin-bottom: 30rpx;
	}

	.input-label {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 16rpx;
		display: block;
	}

	.radio-group {
		display: flex;
		gap: 30rpx;
	}

	.radio-label {
		font-size: 28rpx;
		color: #666;
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.data-input {
		width: 100%;
		height: 80rpx;
		border: 2rpx solid #eee;
		border-radius: 12rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		background-color: #f8f8f8;
	}

	.modal-footer {
		padding: 20rpx 30rpx;
		display: flex;
		justify-content: flex-end;
		gap: 20rpx;
		border-top: 2rpx solid #f5f5f5;
	}

	.modal-btn {
		margin: 0;
		padding: 0 40rpx;
		height: 72rpx;
		line-height: 72rpx;
		font-size: 28rpx;
		border-radius: 36rpx;
		border: none;
	}

	.modal-btn.cancel {
		background-color: #f5f5f5;
		color: #666;
	}

	.modal-btn.confirm {
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
		color: #fff;
	}

	.log-area {
		background-color: #f5f5f5;
		padding: 10px;
		border-radius: 5px;
		margin-top: 10px;
		height: 300px;
		overflow-y: auto;
		font-family: monospace;
		font-size: 12px;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-all;
	}
</style> 