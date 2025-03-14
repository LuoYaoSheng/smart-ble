<template>
	<view class="container">
		<!-- 设备信息 -->
		<view class="device-info-panel">
			<view class="device-header">
				<view class="device-basic">
					<text class="device-name">{{device.name || '未知设备'}}</text>
					<text class="device-id">{{device.deviceId}}</text>
				</view>
				<view class="device-status">
					<text class="rssi">RSSI: {{device.RSSI}}dBm <text class="rssi-symbol">{{rssiSymbol}}</text></text>
					<text :class="['status', device.connected ? 'connected' : '']">
						{{device.connected ? '已连接' : '未连接'}}
					</text>
				</view>
			</view>
			<view class="action-buttons">
				<button type="primary" size="mini" @click="toggleConnection">
					{{device.connected ? '断开连接' : '连接设备'}}
				</button>
				<button type="default" size="mini" @click="refreshRSSI" v-if="device.connected">
					刷新信号
				</button>
			</view>
		</view>

		<!-- 标签页导航 -->
		<view class="tab-nav">
			<view 
				v-for="(tab, index) in tabs" 
				:key="index"
				:class="['tab-item', currentTab === index ? 'active' : '']"
				@click="switchTab(index)">
				{{tab.name}}
			</view>
		</view>

		<!-- 内容区域 -->
		<view class="content-area">
			<!-- 设备信息页 -->
			<view v-if="currentTab === 0" class="info-page" v-show="device.connected">
				<!-- 快捷操作面板 -->
				<view class="quick-panel">
					<view class="quick-actions">
						<button class="clear-notify" @click="clearAutoNotify">
							清除自动通知
						</button>
						<button class="export-log" @click="exportLogs">
							导出日志
						</button>
					</view>
				</view>

				<!-- 数据发送面板 -->
				<view class="send-panel">
					<view class="panel-title">
						<text>数据发送</text>
						<view class="char-selector">
							<text class="selected-char" v-if="currentCharacteristic">
								当前特征值：{{getCharacteristicName(currentCharacteristic)}}
							</text>
							<button class="select-char-btn" size="mini" type="default" @click="showCharacteristicSelector">
								选择特征值
							</button>
						</view>
					</view>
					<view class="send-content">
						<view class="send-type-switch">
							<text :class="['type-item', sendType === 'text' ? 'active' : '']" @click="sendType = 'text'">文本模式</text>
							<text :class="['type-item', sendType === 'hex' ? 'active' : '']" @click="sendType = 'hex'">HEX模式</text>
						</view>
						<textarea 
							v-model="sendData" 
							:placeholder="sendType === 'hex' ? '请输入HEX格式数据，如：01 02 03' : '请输入要发送的文本'"
							class="send-input" />
						<view class="send-options">
							<view class="option-item">
								<text>自动发送</text>
								<switch :checked="autoSend" @change="onAutoSendChange" />
							</view>
							<view class="option-item" v-if="autoSend">
								<text>发送间隔(ms)</text>
								<input 
									type="number" 
									v-model="sendInterval" 
									class="interval-input"
									@blur="validateInterval" />
							</view>
						</view>
						<button type="primary" @click="sendData" :disabled="!currentService || !currentCharacteristic">
							{{!currentService || !currentCharacteristic ? '请先选择特征值' : '发送'}}
						</button>
					</view>
				</view>
			</view>

			<!-- 服务列表页 -->
			<scroll-view v-if="currentTab === 1" class="services-page" scroll-y v-show="device.connected">
				<view class="service-item" v-for="(service, sIndex) in services" :key="sIndex">
					<view class="service-header" @click="toggleService(sIndex)">
						<view class="service-info">
							<text class="service-name">{{getServiceName(service.uuid)}}</text>
							<text class="service-uuid">{{service.uuid}}</text>
						</view>
						<text class="arrow" :class="{'open': service.isOpen}">▶</text>
					</view>
					<view v-if="service.isOpen" class="characteristics-list">
						<view v-for="(characteristic, cIndex) in service.characteristics" 
							:key="cIndex" 
							class="characteristic-item">
							<view class="characteristic-header">
								<view class="characteristic-info">
									<text class="characteristic-name">{{getCharacteristicName(characteristic.uuid)}}</text>
									<text class="characteristic-uuid">{{characteristic.uuid}}</text>
									<view class="characteristic-properties">
										<text v-if="characteristic.properties.read" class="property">读</text>
										<text v-if="characteristic.properties.write" class="property">写</text>
										<text v-if="characteristic.properties.notify" class="property">通知</text>
									</view>
								</view>
								<view class="characteristic-actions">
									<button size="mini" 
										v-if="characteristic.properties.read"
										@click="readCharacteristic(service.uuid, characteristic.uuid)">读取</button>
									<button size="mini" 
										v-if="characteristic.properties.write"
										@click="selectCharacteristic(service.uuid, characteristic.uuid)">写入</button>
									<button size="mini" 
										v-if="characteristic.properties.notify"
										:type="characteristic.notifying ? 'warn' : 'default'"
										@click="toggleNotify(service.uuid, characteristic.uuid)">
										{{characteristic.notifying ? '停止监听' : '监听'}}
									</button>
								</view>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>

			<!-- 操作日志页 -->
			<view v-if="currentTab === 2" class="log-page" v-show="device.connected">
				<view class="log-header">
					<text class="panel-title">操作日志</text>
					<view class="log-actions">
						<button size="mini" @click="clearLogs">清除</button>
						<button size="mini" @click="autoScroll = !autoScroll" :class="{active: autoScroll}">
							自动滚动
						</button>
					</view>
				</view>
				<scroll-view 
					class="log-content" 
					scroll-y 
					:scroll-top="autoScroll ? scrollTop : ''"
					@scrolltoupper="onScrollTop"
					@scrolltolower="onScrollBottom"
					:id="logScrollId">
					<view class="log-list">
						<view v-for="(log, index) in logs" :key="index" class="log-item">
							<text class="log-time">{{log.time}}</text>
							<text class="log-type" :class="log.type">{{log.type}}</text>
							<text class="log-message" :class="{'hex': log.isHex}">{{log.message}}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- 特征值选择弹窗 -->
		<uni-popup ref="charSelector" type="bottom" background-color="#fff" safe-area>
			<view class="char-selector-content">
				<view class="selector-header">
					<text class="selector-title">选择可写入特征值</text>
					<text class="close-btn" @click="hideCharacteristicSelector">×</text>
				</view>
				<scroll-view class="writable-chars-list" scroll-y>
					<view v-for="service in writableCharacteristics" :key="service.uuid" class="selector-service-item">
						<view class="selector-service-info">
							<text class="selector-service-name">{{getServiceName(service.uuid)}}</text>
							<text class="selector-service-uuid">{{service.uuid}}</text>
						</view>
						<view class="selector-chars-list">
							<view v-for="char in service.characteristics" 
								:key="char.uuid"
								class="selector-char-item"
								:class="{'selected': currentCharacteristic === char.uuid}"
								@click="selectCharacteristicFromSelector(service.uuid, char.uuid)">
								<view class="selector-char-info">
									<text class="selector-char-name">{{getCharacteristicName(char.uuid)}}</text>
									<text class="selector-char-uuid">{{char.uuid}}</text>
								</view>
								<text class="selector-check" v-if="currentCharacteristic === char.uuid">✓</text>
							</view>
						</view>
					</view>
				</scroll-view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	import { BLE_SERVICES, BLE_CHARACTERISTICS, getServiceName, getCharacteristicName } from '@/utils/ble-utils.js';
	import uniPopup from '@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue';
	
	export default {
		components: {
			uniPopup
		},
		data() {
			return {
				device: {
					deviceId: '',
					name: '',
					RSSI: 0,
					connected: false
				},
				services: [],
				logs: [],
				autoScroll: true,
				scrollTop: 0,
				logScrollId: 'logScroll',
				// 发送数据相关
				sendType: 'text', // 'text' 或 'hex'
				sendData: '',
				autoSend: false,
				sendInterval: 1000,
				autoSendTimer: null,
				currentService: '',
				currentCharacteristic: '',
				rssiTimer: null,
				tabs: [
					{ name: '设备信息' },
					{ name: '服务列表' },
					{ name: '操作日志' }
				],
				currentTab: 0,
				// 添加工具函数到data中
				getServiceName,
				getCharacteristicName,
				writableCharacteristics: [], // 用于存储可写入的特征值列表
			}
		},
		computed: {
			isHexMode() {
				return this.sendType === 'hex';
			},
			rssiSymbol() {
				const rssi = this.device.RSSI;
				if (rssi >= -60) return '▮▮▮▮';
				if (rssi >= -70) return '▮▮▮';
				if (rssi >= -80) return '▮▮';
				if (rssi >= -90) return '▮';
				return '▯';
			}
		},
		onLoad(options) {
			// 获取传递过来的设备信息
			const device = JSON.parse(options.device);
			this.device = {
				...device,
				connected: false
			};
			
			// 监听特征值变化
			uni.onBLECharacteristicValueChange(res => {
				if (res.deviceId === this.device.deviceId) {
					let value;
					if (this.isHexMode) {
						value = Array.from(new Uint8Array(res.value))
							.map(item => item.toString(16).padStart(2, '0'))
							.join(' ');
						this.addLog('接收', value, true);
					} else {
						value = Array.from(new Uint8Array(res.value))
							.map(item => String.fromCharCode(item))
							.join('');
						this.addLog('接收', value);
					}
				}
			});

			// 自动连接设备
			this.connectDevice();
		},
		onReady() {
			// 获取组件引用
			this.$nextTick(() => {
				if (this.$refs.charSelector) {
					this.$refs.charSelector.$on('change', (e) => {
						console.log('popup change:', e);
					});
				}
			});
		},
		methods: {
			// 连接或断开设备
			toggleConnection() {
				if (this.device.connected) {
					this.disconnectDevice();
				} else {
					this.connectDevice();
				}
			},

			// 连接设备
			connectDevice() {
				this.addLog('系统', '正在初始化蓝牙适配器...');
				uni.openBluetoothAdapter({
					success: () => {
						this.addLog('系统', '蓝牙适配器初始化成功');
						this.addLog('系统', `正在连接设备：${this.device.name || this.device.deviceId}`);
						
						uni.createBLEConnection({
							deviceId: this.device.deviceId,
							success: () => {
								this.device.connected = true;
								this.addLog('系统', `连接设备成功：${this.device.name || this.device.deviceId}`);
								
								// 延迟获取服务列表
								setTimeout(() => {
									this.getBLEServices();
								}, 3000);
								
								// 定时刷新RSSI
								this.startRSSIInterval();
							},
							fail: err => {
								this.addLog('错误', '连接设备失败：' + JSON.stringify(err));
							}
						});
					},
					fail: err => {
						this.addLog('错误', '初始化蓝牙适配器失败：' + JSON.stringify(err));
					}
				});
			},

			// 断开连接
			disconnectDevice() {
				if (this.autoSendTimer) {
					clearInterval(this.autoSendTimer);
					this.autoSendTimer = null;
				}
				
				uni.closeBLEConnection({
					deviceId: this.device.deviceId,
					success: () => {
						this.device.connected = false;
						this.services = [];
						this.addLog('系统', '断开设备连接');
					}
				});
			},

			// 刷新信号强度
			refreshRSSI() {
				uni.getBLEDeviceRSSI({
					deviceId: this.device.deviceId,
					success: res => {
						this.device.RSSI = res.RSSI;
						this.addLog('系统', `当前信号强度：${res.RSSI}`);
					}
				});
			},

			// 获取服务列表
			getBLEServices() {
				this.addLog('系统', '开始获取服务列表...');
				this.services = []; // 清空现有服务列表
				
				uni.getBLEDeviceServices({
					deviceId: this.device.deviceId,
					success: res => {
						this.addLog('系统', `发现 ${res.services.length} 个服务`);
						
						// 检查是否有服务
						if (res.services.length === 0) {
							this.addLog('错误', '未发现任何服务');
							return;
						}
						
						// 处理每个服务
						this.services = res.services.map((service, index) => {
							this.addLog('系统', `服务${index + 1}: ${service.uuid}`);
							return {
								...service,
								isOpen: false,
								characteristics: []
							};
						});
						
						// 依次获取每个服务的特征值
						this.services.forEach((service, index) => {
							setTimeout(() => {
								this.getBLECharacteristics(service.uuid);
							}, index * 200); // 增加延时间隔
						});
					},
					fail: err => {
						this.addLog('错误', '获取服务列表失败：' + JSON.stringify(err));
						this.services = []; // 清空服务列表
					}
				});
			},

			// 获取特征值
			getBLECharacteristics(serviceId) {
				this.addLog('系统', `开始获取服务 ${serviceId} 的特征值...`);
				
				uni.getBLEDeviceCharacteristics({
					deviceId: this.device.deviceId,
					serviceId,
					success: res => {
						const service = this.services.find(s => s.uuid === serviceId);
						if (!service) {
							this.addLog('错误', `未找到服务 ${serviceId}`);
							return;
						}
						
						this.addLog('系统', `服务 ${serviceId} 发现 ${res.characteristics.length} 个特征值`);
						
						// 更新特征值列表
						service.characteristics = res.characteristics.map(c => {
							const props = [];
							if (c.properties.read) props.push('读');
							if (c.properties.write) props.push('写');
							if (c.properties.notify) props.push('通知');
							
							this.addLog('系统', `特征值 ${c.uuid} 支持：${props.join('/')}`);
							
							return {
								...c,
								notifying: false
							};
						});
						
						// 更新可写入特征值列表
						this.getWritableCharacteristics();
						
						// 强制更新视图
						this.$forceUpdate();
					},
					fail: err => {
						this.addLog('错误', `获取服务 ${serviceId} 的特征值失败：${JSON.stringify(err)}`);
					}
				});
			},

			// 读取特征值
			readCharacteristic(serviceId, characteristicId) {
				uni.readBLECharacteristicValue({
					deviceId: this.device.deviceId,
					serviceId,
					characteristicId,
					success: () => {
						this.addLog('读取', `开始读取特征值：${characteristicId}`);
					}
				});
			},

			// 写入特征值
			writeCharacteristic(serviceId, characteristicId, value, isHex = false) {
				let buffer;
				if (isHex) {
					// 处理HEX格式数据
					const hexArray = value.split(' ').filter(Boolean);
					buffer = new ArrayBuffer(hexArray.length);
					const dataView = new DataView(buffer);
					hexArray.forEach((hex, index) => {
						dataView.setUint8(index, parseInt(hex, 16));
					});
				} else {
					// 处理文本数据
					buffer = new ArrayBuffer(value.length);
					const dataView = new DataView(buffer);
					for (let i = 0; i < value.length; i++) {
						dataView.setUint8(i, value.charCodeAt(i));
					}
				}
				
				uni.writeBLECharacteristicValue({
					deviceId: this.device.deviceId,
					serviceId,
					characteristicId,
					value: buffer,
					success: () => {
						this.addLog('写入', `写入数据成功：${value}`, isHex);
					},
					fail: err => {
						this.addLog('错误', '写入数据失败：' + JSON.stringify(err));
					}
				});
			},

			// 监听特征值变化
			toggleNotify(serviceId, characteristicId) {
				const service = this.services.find(s => s.uuid === serviceId);
				const characteristic = service?.characteristics.find(c => c.uuid === characteristicId);
				
				if (!characteristic) return;

				if (!characteristic.notifying) {
					uni.notifyBLECharacteristicValueChange({
						deviceId: this.device.deviceId,
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
						deviceId: this.device.deviceId,
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

			// 切换服务展开状态
			toggleService(index) {
				this.services[index].isOpen = !this.services[index].isOpen;
			},

			// 添加日志
			addLog(type, message, isHex = false) {
				const now = new Date();
				const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${now.getMilliseconds().toString().padStart(3,'0')}`;
				this.logs.push({ time, type, message, isHex });
				
				// 如果开启了自动滚动，更新滚动位置
				if (this.autoScroll) {
					this.$nextTick(() => {
						try {
							const query = uni.createSelectorQuery().in(this);
							query.select('#' + this.logScrollId).boundingClientRect(data => {
								if (data) {
									this.scrollTop = data.height;
								}
							}).exec();
						} catch (e) {
							console.error('获取日志面板高度失败:', e);
						}
					});
				}
			},

			// 清除日志
			clearLogs() {
				this.logs = [];
			},

			// 滚动到顶部时触发
			onScrollTop() {
				this.autoScroll = false;
			},

			// 滚动到底部时触发
			onScrollBottom() {
				this.autoScroll = true;
			},

			// 开始定时刷新RSSI
			startRSSIInterval() {
				// 清除可能存在的旧定时器
				if (this.rssiTimer) {
					clearInterval(this.rssiTimer);
				}
				
				// 每3秒刷新一次RSSI
				this.rssiTimer = setInterval(() => {
					if (this.device.connected) {
						this.refreshRSSI();
					}
				}, 3000);
			},

			// 切换标签页
			switchTab(index) {
				this.currentTab = index;
			},

			// 选择特征值用于写入
			selectCharacteristic(serviceId, characteristicId) {
				this.currentService = serviceId;
				this.currentCharacteristic = characteristicId;
				this.switchTab(0); // 切换到设备信息页面
				this.addLog('系统', `已选择特征值用于写入：${characteristicId}`);
			},

			// 获取可写入的特征值列表
			getWritableCharacteristics() {
				const writableServices = [];
				this.services.forEach(service => {
					const writableChars = service.characteristics.filter(char => char.properties.write);
					if (writableChars.length > 0) {
						writableServices.push({
							uuid: service.uuid,
							characteristics: writableChars
						});
					}
				});
				this.writableCharacteristics = writableServices;
			},
			
			// 显示特征值选择器
			showCharacteristicSelector() {
				this.getWritableCharacteristics();
				this.$nextTick(() => {
					this.$refs.charSelector && this.$refs.charSelector.open('bottom');
				});
			},
			
			// 隐藏特征值选择器
			hideCharacteristicSelector() {
				this.$nextTick(() => {
					this.$refs.charSelector && this.$refs.charSelector.close();
				});
			},
			
			// 从选择器中选择特征值
			selectCharacteristicFromSelector(serviceId, characteristicId) {
				this.currentService = serviceId;
				this.currentCharacteristic = characteristicId;
				this.hideCharacteristicSelector();
				this.addLog('系统', `已选择特征值用于写入：${characteristicId}`);
			},

			// 导出日志
			exportLogs() {
				if (this.logs.length === 0) {
					uni.showToast({
						title: '暂无日志可导出',
						icon: 'none'
					});
					return;
				}

				// 格式化日志内容
				const logContent = this.logs.map(log => {
					return `[${log.time}] [${log.type}] ${log.message}`;
				}).join('\n');

				// 生成文件名
				const now = new Date();
				const baseFileName = `BLE_${this.device.name || this.device.deviceId}_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}.txt`;

				// 在APP环境下使用文件系统API
				// #ifdef APP-PLUS
				const appFilePath = '_doc/' + baseFileName;
				plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, fs => {
					fs.root.getFile(appFilePath, { create: true }, fileEntry => {
						fileEntry.createWriter(writer => {
							writer.onwrite = () => {
								uni.showToast({
									title: '日志已导出到文档目录',
									icon: 'success'
								});
							};
							writer.onerror = () => {
								uni.showToast({
									title: '导出失败',
									icon: 'error'
								});
							};
							writer.write(logContent);
						});
					});
				});
				// #endif

				// 在H5环境下直接下载文件
				// #ifdef H5
				const blob = new Blob([logContent], { type: 'text/plain' });
				const url = window.URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = baseFileName;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				window.URL.revokeObjectURL(url);
				uni.showToast({
					title: '日志已下载',
					icon: 'success'
				});
				// #endif

				// 在小程序环境下保存到本地文件
				// #ifdef MP
				const fs = uni.getFileSystemManager();
				const mpFilePath = `${uni.env.USER_DATA_PATH}/${baseFileName}`;
				fs.writeFile({
					filePath: mpFilePath,
					data: logContent,
					encoding: 'utf8',
					success: () => {
						uni.saveFile({
							tempFilePath: mpFilePath,
							success: () => {
								uni.showToast({
									title: '日志已保存',
									icon: 'success'
								});
							},
							fail: () => {
								uni.showToast({
									title: '保存失败',
									icon: 'error'
								});
							}
						});
					},
					fail: () => {
						uni.showToast({
							title: '导出失败',
							icon: 'error'
						});
					}
				});
				// #endif
			},

			// 清除所有自动通知
			async clearAutoNotify() {
				try {
					if (!this.device.connected) {
						this.addLog('错误', '设备未连接');
						return;
					}

					this.addLog('系统', '正在清除所有自动通知...');

					// 遍历所有服务和特征值，停止所有通知
					for (const service of this.services) {
						for (const characteristic of service.characteristics) {
							if (characteristic.notifying) {
								await new Promise((resolve, reject) => {
									uni.notifyBLECharacteristicValueChange({
										deviceId: this.device.deviceId,
										serviceId: service.uuid,
										characteristicId: characteristic.uuid,
										state: false,
										success: () => {
											characteristic.notifying = false;
											this.addLog('系统', `已停止特征值 ${characteristic.uuid} 的通知`);
											resolve();
										},
										fail: (err) => {
											this.addLog('错误', `停止特征值 ${characteristic.uuid} 通知失败：${JSON.stringify(err)}`);
											reject(err);
										}
									});
								}).catch(() => {
									// 继续处理下一个特征值，即使当前特征值处理失败
								});
							}
						}
					}

					this.addLog('系统', '所有自动通知已清除');
					uni.showToast({
						title: '通知已清除',
						icon: 'success'
					});
				} catch (error) {
					this.addLog('错误', `清除通知失败：${error.message || '未知错误'}`);
					uni.showToast({
						title: '清除失败',
						icon: 'error'
					});
				}
			},
		},
		onUnload() {
			this.addLog('系统', '正在退出设备详情页面...');
			
			// 清除所有定时器
			if (this.rssiTimer) {
				clearInterval(this.rssiTimer);
				this.rssiTimer = null;
			}
			
			if (this.autoSendTimer) {
				clearInterval(this.autoSendTimer);
				this.autoSendTimer = null;
			}
			
			// 清除所有通知
			if (this.device.connected) {
				this.clearAutoNotify();
			}
			
			// 断开连接
			if (this.device.connected) {
				uni.closeBLEConnection({
					deviceId: this.device.deviceId,
					success: () => {
						this.device.connected = false;
						this.services = [];
						this.addLog('系统', '已断开设备连接');
					},
					complete: () => {
						// 关闭蓝牙模块
						uni.closeBluetoothAdapter({
							success: () => {
								this.addLog('系统', '已关闭蓝牙模块');
							}
						});
					}
				});
			}
		},
		// #ifdef MP-WEIXIN
		onShareAppMessage() {
			return {
				title: '智能蓝牙助手',
				path: '/pages/device/detail',
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

	.device-info-panel {
		background: linear-gradient(135deg, #fff 0%, #f8f9fc 100%);
		padding: 40rpx;
		border-radius: 24rpx;
		box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.06);
	}

	.device-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 30rpx;
	}

	.device-basic {
		flex: 1;
		min-width: 0;
		margin-right: 24rpx;
	}

	.device-name {
		font-size: 40rpx;
		font-weight: 600;
		margin-bottom: 12rpx;
		color: #1a1a1a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
		max-width: 100%;
	}

	.device-id {
		font-size: 28rpx;
		color: #666;
		opacity: 0.8;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
	}

	.device-status {
		text-align: right;
		flex-shrink: 0;
		min-width: 180rpx;
	}

	.rssi {
		font-size: 28rpx;
		color: #666;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-bottom: 8rpx;
		white-space: nowrap;
	}

	.rssi-symbol {
		font-family: monospace;
		margin-left: 12rpx;
		color: #34C759;
		text-shadow: 0 0 8rpx rgba(52,199,89,0.3);
	}

	.status {
		font-size: 28rpx;
		font-weight: 600;
		padding: 6rpx 16rpx;
		border-radius: 100rpx;
		background-color: #f5f5f5;
		color: #666;
		transition: all 0.3s;
	}

	.status.connected {
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		color: white;
		box-shadow: 0 4rpx 12rpx rgba(52,199,89,0.2);
	}

	.action-buttons {
		display: flex;
		gap: 24rpx;
		margin-top: 30rpx;
	}

	.action-buttons button {
		flex: 1;
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28rpx;
		font-weight: 600;
		border-radius: 16rpx;
		transition: all 0.3s;
	}

	.action-buttons button[type="primary"] {
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
		color: #fff;
		border: none;
		box-shadow: 0 4rpx 12rpx rgba(0,122,255,0.2);
	}

	.action-buttons button[type="primary"]:active {
		transform: translateY(2rpx);
		box-shadow: 0 2rpx 6rpx rgba(0,122,255,0.2);
	}

	.action-buttons button[type="default"] {
		background: linear-gradient(135deg, #8E8E93 0%, #98989D 100%);
		color: #fff;
		border: none;
		box-shadow: 0 4rpx 12rpx rgba(142,142,147,0.2);
	}

	.action-buttons button[type="default"]:active {
		transform: translateY(2rpx);
		opacity: 0.9;
	}

	.tab-nav {
		display: flex;
		background: linear-gradient(135deg, #fff 0%, #f8f9fc 100%);
		border-radius: 20rpx;
		padding: 8rpx;
		box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.06);
	}

	.tab-item {
		flex: 1;
		text-align: center;
		padding: 20rpx 0;
		font-size: 28rpx;
		color: #666;
		position: relative;
		transition: all 0.3s;
		border-radius: 16rpx;
	}

	.tab-item.active {
		color: #007AFF;
		font-weight: 600;
		background-color: rgba(0,122,255,0.1);
	}

	.tab-item.active::after {
		content: '';
		position: absolute;
		bottom: -4rpx;
		left: 50%;
		transform: translateX(-50%);
		width: 32rpx;
		height: 4rpx;
		background: linear-gradient(90deg, #007AFF 0%, #409EFF 100%);
		border-radius: 2rpx;
	}

	.content-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: linear-gradient(135deg, #fff 0%, #f8f9fc 100%);
		border-radius: 24rpx;
		box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.06);
		overflow: hidden;
		height: 0;
	}

	.info-page {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
		padding: 30rpx;
		height: 100%;
		overflow-y: auto;
	}

	.quick-panel {
		background: linear-gradient(135deg, #fff 0%, #f8f9fc 100%);
		border-radius: 24rpx;
		padding: 30rpx;
		box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
	}

	.quick-actions {
		display: flex;
		gap: 20rpx;
	}

	.quick-actions button {
		flex: 1;
		height: 88rpx;
		font-size: 28rpx;
		font-weight: 600;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
		position: relative;
		overflow: hidden;
	}

	.quick-actions button.clear-notify {
		background: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
		color: #fff;
		border: none;
		box-shadow: 0 4rpx 12rpx rgba(255,59,48,0.2);
	}

	.quick-actions button.export-log {
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		color: #fff;
		border: none;
		box-shadow: 0 4rpx 12rpx rgba(52,199,89,0.2);
	}

	.quick-actions button:active {
		transform: translateY(2rpx);
		box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1);
	}

	.quick-actions button::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0));
		opacity: 0;
		transition: opacity 0.3s;
	}

	.quick-actions button:active::before {
		opacity: 1;
	}

	.send-panel {
		background: linear-gradient(135deg, #fff 0%, #f8f9fc 100%);
		border-radius: 24rpx;
		padding: 30rpx;
		box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
	}

	.panel-title {
		font-size: 32rpx;
		font-weight: 600;
		margin-bottom: 24rpx;
		color: #1a1a1a;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.selected-char {
		font-size: 26rpx;
		color: #007AFF;
		font-weight: normal;
		background: rgba(0,122,255,0.1);
		padding: 8rpx 16rpx;
		border-radius: 100rpx;
	}

	.send-type-switch {
		display: flex;
		margin-bottom: 24rpx;
		border: 2rpx solid #eee;
		border-radius: 16rpx;
		overflow: hidden;
		background: #f8f9fc;
		padding: 4rpx;
	}

	.type-item {
		flex: 1;
		text-align: center;
		padding: 16rpx 0;
		font-size: 28rpx;
		color: #666;
		transition: all 0.3s;
		border-radius: 12rpx;
	}

	.type-item.active {
		color: #007AFF;
		background: #fff;
		font-weight: 600;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
	}

	.send-input {
		width: 100%;
		height: 200rpx;
		border: 2rpx solid #eee;
		border-radius: 16rpx;
		padding: 24rpx;
		font-size: 28rpx;
		background-color: #f8f9fc;
		transition: all 0.3s;
		margin-bottom: 24rpx;
	}

	.send-input:focus {
		border-color: #007AFF;
		background-color: #fff;
		box-shadow: 0 2rpx 8rpx rgba(0,122,255,0.1);
	}

	.send-options {
		background-color: #f8f9fc;
		border-radius: 16rpx;
		padding: 24rpx;
		border: 2rpx solid #eee;
		margin-bottom: 24rpx;
	}

	.option-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12rpx 0;
	}

	.option-item:not(:last-child) {
		border-bottom: 2rpx solid rgba(0,0,0,0.05);
		margin-bottom: 12rpx;
	}

	.option-item text {
		font-size: 28rpx;
		color: #333;
	}

	.interval-input {
		width: 200rpx;
		height: 60rpx;
		border: 2rpx solid #eee;
		border-radius: 12rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		background-color: #fff;
		text-align: center;
		transition: all 0.3s;
	}

	.interval-input:focus {
		border-color: #007AFF;
		box-shadow: 0 2rpx 8rpx rgba(0,122,255,0.1);
	}

	.send-panel button[type="primary"] {
		width: 100%;
		height: 88rpx;
		border-radius: 20rpx;
		font-size: 32rpx;
		font-weight: 600;
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
		box-shadow: 0 4rpx 12rpx rgba(0,122,255,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
	}

	.send-panel button[type="primary"]:active {
		transform: translateY(2rpx);
		box-shadow: 0 2rpx 6rpx rgba(0,122,255,0.2);
	}

	.send-panel button[disabled] {
		background: linear-gradient(135deg, #ccc 0%, #ddd 100%);
		box-shadow: none;
		opacity: 0.8;
	}

	.char-selector {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.select-char-btn {
		height: 56rpx;
		font-size: 26rpx;
		padding: 0 24rpx;
		background: linear-gradient(135deg, #8E8E93 0%, #98989D 100%) !important;
		border: none;
		border-radius: 28rpx;
		color: #fff !important;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
		box-shadow: 0 4rpx 12rpx rgba(142,142,147,0.2);
	}

	.select-char-btn:active {
		transform: scale(0.96);
		opacity: 0.9;
		box-shadow: 0 2rpx 6rpx rgba(142,142,147,0.2);
	}

	.char-selector-content {
		background: #fff;
		border-radius: 24rpx 24rpx 0 0;
		padding: 30rpx;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}

	.selector-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24rpx;
		padding-bottom: 20rpx;
		border-bottom: 2rpx solid #f5f5f5;
	}

	.selector-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #1a1a1a;
	}

	.close-btn {
		font-size: 40rpx;
		color: #999;
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 30rpx;
		background: #f5f5f5;
		transition: all 0.3s;
	}

	.close-btn:active {
		background: #e0e0e0;
		transform: scale(0.95);
	}

	.writable-chars-list {
		flex: 1;
		overflow-y: auto;
	}

	.selector-service-item {
		margin-bottom: 30rpx;
		padding: 20rpx;
		background: linear-gradient(135deg, #fff 0%, #f8f9fc 100%);
		border-radius: 16rpx;
		box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
	}

	.selector-service-info {
		margin-bottom: 16rpx;
	}

	.selector-service-name {
		font-size: 28rpx;
		font-weight: 600;
		color: #1a1a1a;
		display: block;
		margin-bottom: 4rpx;
	}

	.selector-service-uuid {
		font-size: 24rpx;
		color: #666;
		opacity: 0.8;
	}

	.selector-chars-list {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.selector-char-item {
		padding: 20rpx;
		border-radius: 12rpx;
		background: #f8f9fc;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: all 0.3s;
	}

	.selector-char-item:active {
		transform: scale(0.98);
	}

	.selector-char-item.selected {
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
	}

	.selector-char-info {
		flex: 1;
	}

	.selector-char-name {
		font-size: 28rpx;
		font-weight: 600;
		color: #1a1a1a;
		display: block;
		margin-bottom: 4rpx;
	}

	.selector-char-item.selected .selector-char-name,
	.selector-char-item.selected .selector-char-uuid {
		color: #fff;
	}

	.selector-char-uuid {
		font-size: 24rpx;
		color: #666;
		opacity: 0.8;
	}

	.selector-check {
		font-size: 32rpx;
		color: #fff;
		margin-left: 12rpx;
	}

	.services-page {
		flex: 1;
		padding: 30rpx;
		height: 100%;
		overflow: hidden;
	}

	.service-item {
		margin-bottom: 24rpx;
		border-radius: 20rpx;
		overflow: hidden;
		background: linear-gradient(135deg, #fff 0%, #f8f9fc 100%);
		box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
		border: 2rpx solid rgba(0,0,0,0.03);
	}

	.service-header {
		padding: 28rpx;
		background: linear-gradient(to right, #f8f9fc, #fff);
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		position: relative;
		transition: all 0.3s;
	}

	.service-header:active {
		background: #f5f6fa;
	}

	.service-info {
		flex: 1;
		min-width: 0;
	}

	.service-name {
		font-size: 32rpx;
		color: #1a1a1a;
		font-weight: 600;
		margin-bottom: 8rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.service-uuid {
		font-size: 26rpx;
		color: #666;
		opacity: 0.8;
		font-family: monospace;
		background: rgba(0,0,0,0.03);
		padding: 4rpx 12rpx;
		border-radius: 6rpx;
	}

	.arrow {
		color: #999;
		font-size: 24rpx;
		transition: transform 0.3s;
		width: 40rpx;
		height: 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0,0,0,0.03);
		border-radius: 50%;
		margin-left: 20rpx;
	}

	.arrow.open {
		transform: rotate(90deg);
		background: rgba(0,122,255,0.1);
		color: #007AFF;
	}

	.characteristics-list {
		padding: 20rpx;
		background-color: #fff;
		max-height: 800rpx;
		overflow-y: auto;
	}

	.characteristic-item {
		padding: 24rpx;
		border-radius: 16rpx;
		background: #f8f9fc;
		margin-bottom: 16rpx;
		transition: all 0.3s;
		border: 2rpx solid rgba(0,0,0,0.03);
	}

	.characteristic-item:last-child {
		margin-bottom: 0;
	}

	.characteristic-header {
		margin-bottom: 20rpx;
	}

	.characteristic-info {
		margin-bottom: 16rpx;
	}

	.characteristic-name {
		font-size: 30rpx;
		color: #1a1a1a;
		font-weight: 600;
		margin-bottom: 8rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.characteristic-uuid {
		font-size: 26rpx;
		color: #666;
		opacity: 0.8;
		font-family: monospace;
		background: rgba(0,0,0,0.03);
		padding: 4rpx 12rpx;
		border-radius: 6rpx;
		display: inline-block;
	}

	.characteristic-properties {
		display: flex;
		gap: 12rpx;
		margin-top: 16rpx;
		flex-wrap: wrap;
	}

	.property {
		font-size: 24rpx;
		padding: 4rpx 20rpx;
		border-radius: 100rpx;
		background: rgba(0,122,255,0.1);
		color: #007AFF;
		font-weight: 600;
	}

	.characteristic-actions {
		display: flex;
		gap: 16rpx;
		flex-wrap: wrap;
		margin-top: 20rpx;
		padding-top: 20rpx;
		border-top: 2rpx solid rgba(0,0,0,0.03);
	}

	.characteristic-actions button {
		min-width: 120rpx;
		height: 64rpx;
		font-size: 26rpx;
		border-radius: 32rpx;
		background: linear-gradient(135deg, #8E8E93 0%, #98989D 100%);
		color: #fff;
		border: none;
		padding: 0 24rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
	}

	.characteristic-actions button:active {
		transform: translateY(2rpx);
		opacity: 0.9;
	}

	.characteristic-actions button[type="warn"] {
		background: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
	}

	.log-page {
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.log-header {
		padding: 24rpx 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2rpx solid #eee;
		background: linear-gradient(to right, #f8f9fc, #f5f6fa);
	}

	.log-actions {
		display: flex;
		gap: 16rpx;
	}

	.log-actions button {
		height: 60rpx;
		font-size: 26rpx;
		border-radius: 12rpx;
		background: linear-gradient(135deg, #8E8E93 0%, #98989D 100%);
		color: #fff;
		border: none;
		padding: 0 24rpx;
		box-shadow: 0 4rpx 12rpx rgba(142,142,147,0.2);
	}

	.log-actions button:active {
		transform: translateY(2rpx);
		opacity: 0.9;
	}

	.log-actions button.active {
		background: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
		box-shadow: 0 4rpx 12rpx rgba(0,122,255,0.2);
	}

	.log-content {
		flex: 1;
		height: 0;
		overflow-y: auto;
		background: #f8f9fc;
	}

	.log-list {
		padding: 24rpx;
	}

	.log-item {
		font-size: 26rpx;
		padding: 12rpx 16rpx;
		display: flex;
		align-items: flex-start;
		background: #fff;
		border-radius: 12rpx;
		margin-bottom: 12rpx;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
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
		box-shadow: 0 2rpx 8rpx rgba(0,122,255,0.2);
	}

	.log-type.error {
		background: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
		color: white;
		box-shadow: 0 2rpx 8rpx rgba(255,59,48,0.2);
	}

	.log-type.read {
		background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
		color: white;
		box-shadow: 0 2rpx 8rpx rgba(52,199,89,0.2);
	}

	.log-type.write {
		background: linear-gradient(135deg, #FF9500 0%, #FF9F0A 100%);
		color: white;
		box-shadow: 0 2rpx 8rpx rgba(255,149,0,0.2);
	}

	.log-type.receive {
		background: linear-gradient(135deg, #5856D6 0%, #5E5CE6 100%);
		color: white;
		box-shadow: 0 2rpx 8rpx rgba(88,86,214,0.2);
	}

	.log-message {
		flex: 1;
		word-break: break-all;
		line-height: 1.5;
		color: #333;
	}

	.log-message.hex {
		font-family: monospace;
		background: #f8f9fc;
		padding: 8rpx 16rpx;
		border-radius: 8rpx;
		font-size: 24rpx;
	}

	.send-panel.auto-sending {
		border: 2rpx solid rgba(52,199,89,0.3);
		animation: autoPulse 2s infinite;
	}

	@keyframes autoPulse {
		0% {
			box-shadow: 0 4rpx 16rpx rgba(52,199,89,0.1);
		}
		50% {
			box-shadow: 0 4rpx 24rpx rgba(52,199,89,0.2);
		}
		100% {
			box-shadow: 0 4rpx 16rpx rgba(52,199,89,0.1);
		}
	}
</style> 