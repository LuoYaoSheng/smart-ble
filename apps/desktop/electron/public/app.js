//
// SmartBLE Desktop - Renderer Process
//

class App {
    constructor() {
        // E2E UI Testing Mock Flag
        this.USE_MOCK_BLE = window.location.search.includes('mock=true');
        
        this.devices = new Map();
        this.servicesByDevice = new Map();
        this.connectedDevices = new Set();
        this.logs = [];
        this.currentDevice = null;
        this.isScanning = false;
        this.writeDialogCallback = null;
        this.characteristicsMap = new Map(); // 存储特征值引用以便更新状态
        this.isBroadcasting = false; // 广播状态

        // Filter state - aligned with UniApp
        this.filterRSSI = -100;
        this.filterNamePrefix = '';
        this.hideUnnamed = false;

        // Auto-stop scan timer
        this.autoStopTimer = null;

        // Auto-reconnect state
        this.reconnectAttempts = new Map();
        this.reconnectTimers = new Map();
        this.userDisconnected = new Set();
        this.autoReconnectEnabled = true;

        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupEventListeners(); // 先设置监听器
        await this.initBLE(); // 再初始化 BLE
    }

    bindEvents() {
        // Tab 切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Scan button
        document.getElementById('scanButton')?.addEventListener('click', () => {
            this.toggleScan();
        });

        // Broadcast buttons
        document.getElementById('startBroadcastButton')?.addEventListener('click', () => {
            this.startBroadcast();
        });
        document.getElementById('stopBroadcastButton')?.addEventListener('click', () => {
            this.stopBroadcast();
        });

        // Back button
        document.getElementById('backButton')?.addEventListener('click', () => {
            this.showDeviceList();
        });

        // Clear logs button
        document.getElementById('clearLogsButton')?.addEventListener('click', () => {
            this.clearLogs();
        });

        // Disconnect button
        document.getElementById('disconnectButton')?.addEventListener('click', () => {
            if (this.currentDevice) {
                this.disconnect();
            }
        });

        // Filter controls via Web Component
        const filterPanel = document.getElementById('mainFilterPanel');
        if (filterPanel) {
            filterPanel.addEventListener('filter-change', (e) => {
                this.filterRSSI = e.detail.rssi;
                this.filterNamePrefix = e.detail.namePrefix;
                this.hideUnnamed = e.detail.hideUnnamed;
                this.updateDeviceList();
            });
        }

        // Write dialog via Web Component
        const writeDialog = document.getElementById('mainWriteDialog');
        if (writeDialog) {
            writeDialog.addEventListener('write', async (e) => {
                const { serviceUuid, charUuid, data, format } = e.detail;
                if (!this.currentDevice) return;
                
                try {
                    const result = await window.bleAPI.writeCharacteristic(
                        this.currentDevice.id,
                        serviceUuid,
                        charUuid,
                        data,
                        format
                    );
                    if (result.success) {
                        this.addLog(`写入成功: ${data}`, 'success');
                        writeDialog.close();
                    } else {
                        this.addLog(`写入失败: ${result.error}`, 'error');
                    }
                } catch (error) {
                    this.addLog(`写入失败: ${error.message}`, 'error');
                }
            });
        }

        // Setup Detail View Buttons
        document.getElementById('backButton')?.addEventListener('click', () => this.goBack());
        document.getElementById('disconnectButton')?.addEventListener('click', () => {
            if (this.currentDevice) this.disconnectDevice(this.currentDevice.id);
        });

        // Service panel via Web Component
        const servicePanel = document.getElementById('mainServicePanel');
        if (servicePanel) {
            servicePanel.addEventListener('read', (e) => {
                this.readCharacteristic(e.detail.serviceUuid, e.detail.charUuid);
            });
            servicePanel.addEventListener('write', (e) => {
                const writeDialog = document.getElementById('mainWriteDialog');
                if (writeDialog) writeDialog.open(e.detail.serviceUuid, e.detail.charUuid);
            });
            servicePanel.addEventListener('notify', (e) => {
                this.toggleNotify(e.detail.serviceUuid, e.detail.charUuid, e.detail.enabled);
            });
        }
    }

    switchTab(tab) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // 切换视图
        const deviceListView = document.getElementById('deviceListView');
        const broadcastView = document.getElementById('broadcastView');
        const connectedView = document.getElementById('connectedView'); // T14
        const aboutView = document.getElementById('aboutView');

        // Hide all views first
        deviceListView?.classList.remove('active');
        deviceListView.style.display = 'none';
        broadcastView?.classList.remove('active');
        broadcastView.style.display = 'none';
        connectedView?.classList.remove('active');
        connectedView.style.display = 'none';
        aboutView?.classList.remove('active');
        aboutView.style.display = 'none';

        if (tab === 'scan') {
            deviceListView?.classList.add('active');
            deviceListView.style.display = 'block';
        } else if (tab === 'connected') {
            // T14: 显示已连接列表
            connectedView?.classList.add('active');
            connectedView.style.display = 'block';
            this.renderConnectedDevicesPanel();
        } else if (tab === 'broadcast') {
            // 切换到广播时停止扫描
            if (this.isScanning) {
                this.stopScan();
            }
            broadcastView?.classList.add('active');
            broadcastView.style.display = 'block';
        } else if (tab === 'about') {
            aboutView?.classList.add('active');
            aboutView.style.display = 'block';
        }
    }

    // T14: 渲染已连接设备面板
    renderConnectedDevicesPanel() {
        const list = document.getElementById('connectedDeviceList');
        const badge = document.getElementById('connectedBadge');
        const disconnectAllBtn = document.getElementById('disconnectAllBtn');
        if (!list) return;

        const count = this.connectedDevices.size;
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
        if (disconnectAllBtn) {
            disconnectAllBtn.style.display = count > 1 ? 'inline-block' : 'none';
            disconnectAllBtn.onclick = () => {
                [...this.connectedDevices].forEach(id => {
                    this.currentDevice = this.devices.get(id) || { id };
                    this.disconnect();
                });
            };
        }

        if (count === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔗</div>
                    <div class="empty-text">暂无已连接设备</div>
                    <div class="empty-hint">在扫描页面点击设备进行连接</div>
                </div>`;
            return;
        }

        list.innerHTML = [...this.connectedDevices].map(deviceId => {
            const device = this.devices.get(deviceId);
            const name = device?.name || deviceId;
            return `
                <div class="device-card" style="margin-bottom:10px;padding:14px;border-radius:10px;border:1px solid rgba(0,0,0,0.1)">
                    <div style="display:flex;align-items:center;gap:12px">
                        <div style="width:40px;height:40px;border-radius:10px;background:rgba(52,199,89,0.1);display:flex;align-items:center;justify-content:center;color:#34C759">●</div>
                        <div style="flex:1">
                            <div style="font-weight:600">${name}</div>
                            <div style="font-size:12px;color:#666">${deviceId}</div>
                        </div>
                        <button class="btn btn-secondary" style="font-size:12px;padding:4px 10px" onclick="window.appInstance.showDeviceDetailPanel('${deviceId}')">详情</button>
                        <button class="btn btn-danger" style="font-size:12px;padding:4px 10px" onclick="window.appInstance.disconnectDeviceFromPanel('${deviceId}')">断开</button>
                    </div>
                </div>`;
        }).join('');
    }

    showDeviceDetailPanel(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            this.currentDevice = device;
            this.showDeviceDetail();
        }
    }

    async disconnectDeviceFromPanel(deviceId) {
        try {
            await window.bleAPI.disconnect(deviceId);
            this.connectedDevices.delete(deviceId);
            this.renderConnectedDevicesPanel();
            this.addLog(`断开连接: ${deviceId}`, 'info');
        } catch (error) {
            this.showError('断开连接失败: ' + error.message);
        }
    }

    async startBroadcast() {
        const name = document.getElementById('broadcastName')?.value || 'SmartBLE';
        const serviceUuid = document.getElementById('broadcastServiceUuid')?.value || 'FFF0';
        const manufacturerId = document.getElementById('broadcastManufacturerId')?.value || '0A00';
        const manufacturerData = document.getElementById('broadcastManufacturerData')?.value || 'SmartBLE_Broadcast';
        const includeName = document.getElementById('broadcastIncludeName')?.checked ?? true;

        try {
            const result = await window.bleAPI.startAdvertising(name, [serviceUuid], manufacturerId, manufacturerData, includeName);
            if (result.success) {
                this.isBroadcasting = true;
                this.updateBroadcastStatus(true);
                this.showToast('广播已启动', 'success');
            } else {
                this.showToast(`启动失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`启动失败: ${error.message}`, 'error');
        }
    }

    async stopBroadcast() {
        try {
            const result = await window.bleAPI.stopAdvertising();
            if (result.success) {
                this.isBroadcasting = false;
                this.updateBroadcastStatus(false);
                this.showToast('广播已停止', 'info');
            }
        } catch (error) {
            this.showToast(`停止失败: ${error.message}`, 'error');
        }
    }

    updateBroadcastStatus(isBroadcasting) {
        const statusEl = document.getElementById('broadcastStatus');
        const startBtn = document.getElementById('startBroadcastButton');
        const stopBtn = document.getElementById('stopBroadcastButton');

        if (!statusEl) return;

        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        if (isBroadcasting) {
            if (dot) dot.className = 'status-dot active';
            if (text) text.textContent = '正在广播';
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-flex';
        } else {
            if (dot) dot.className = 'status-dot';
            if (text) text.textContent = '未广播';
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
        }
    }

    async initBLE() {
        try {
            console.log('Initializing BLE...');
            const result = await window.bleAPI.init();
            console.log('BLE initialized:', result);

            // 根据平台显示/隐藏广播功能
            // Linux (bleno) 支持广播，macOS 和 Windows 不支持
            if (window.platform?.platform === 'linux') {
                document.getElementById('broadcastTab').style.display = 'flex';
            }
        } catch (error) {
            console.error('BLE init error:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }

    setupEventListeners() {
        // State change
        window.bleAPI.onStateChange((data) => {
            this.updateBluetoothStatus(data.state);
        });

        // Device discovered
        window.bleAPI.onDeviceDiscovered((device) => {
            this.onDeviceDiscovered(device);
        });

        // Device connected
        window.bleAPI.onDeviceConnected((data) => {
            this.onDeviceConnected(data.id);
        });

        // Device disconnected
        window.bleAPI.onDeviceDisconnected((data) => {
            this.onDeviceDisconnected(data.id);
        });

        // Services discovered
        window.bleAPI.onServicesDiscovered((data) => {
            this.onServicesDiscovered(data);
        });

        // Characteristic value changed
        window.bleAPI.onCharacteristicValueChanged((data) => {
            this.onCharacteristicValueChanged(data);
        });

        // Warning messages
        window.bleAPI.onWarning?.((data) => {
            console.log('BLE Warning:', data.message);
        });
    }

    updateBluetoothStatus(state) {
        console.log('updateBluetoothStatus called with state:', state);
        const statusEl = document.getElementById('bluetoothStatus');
        if (!statusEl) {
            console.log('bluetoothStatus element not found');
            return;
        }

        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        const stateMap = {
            'poweredOn': { text: '蓝牙已开启', class: 'active' },
            'poweredOff': { text: '蓝牙已关闭', class: '' },
            'unauthorized': { text: '未授权', class: 'error' },
            'unknown': { text: '初始化中...', class: '' }
        };

        const status = stateMap[state] || { text: '状态未知', class: '' };
        console.log('Setting status to:', status);
        if (text) text.textContent = status.text;
        if (dot) dot.className = 'status-dot ' + status.class;
    }

    async toggleScan() {
        if (this.isScanning) {
            await this.stopScan();
        } else {
            await this.startScan();
            
            // CI MOCK INJECTION
            // Generates a fake device for automated UI E2E testing
            if (this.USE_MOCK_BLE) {
                console.log('[MOCK] Injecting dummy device Dummy-BLE-01');
                this.onDeviceDiscovered({
                    id: 'MOCK-11:22:33:44:55:66',
                    name: 'Dummy-BLE-01',
                    rssi: -45,
                    connectable: true,
                    services: ['FFF0', '180A']
                });
            }
        }
    }

    async startScan() {
        try {
            this.devices.clear();
            this.characteristicsMap.clear();
            this.updateDeviceList();
            this.isScanning = true;
            this.updateScanButton();

            const result = await window.bleAPI.startScan();
            if (!result.success) {
                this.showError('扫描失败: ' + result.error);
                this.isScanning = false;
                this.updateScanButton();
            } else {
                // Auto-stop after 5 seconds - aligned with UniApp
                this.scheduleAutoStop();
            }
        } catch (error) {
            this.showError('扫描失败: ' + error.message);
            this.isScanning = false;
            this.updateScanButton();
        }
    }

    async stopScan() {
        // Clear auto-stop timer
        if (this.autoStopTimer) {
            clearTimeout(this.autoStopTimer);
            this.autoStopTimer = null;
        }

        try {
            await window.bleAPI.stopScan();
            this.isScanning = false;
            this.updateScanButton();
        } catch (error) {
            this.showError('停止扫描失败: ' + error.message);
        }
    }

    // Auto-stop scan after 5 seconds - aligned with UniApp
    scheduleAutoStop() {
        if (this.autoStopTimer) {
            clearTimeout(this.autoStopTimer);
        }
        this.autoStopTimer = setTimeout(async () => {
            if (this.isScanning) {
                await this.stopScan();
                this.addLog('自动停止扫描（5秒）', 'info');
            }
        }, 5000);
    }

    // Apply filters and get filtered devices - aligned with UniApp
    getFilteredDevices() {
        return Array.from(this.devices.values()).filter(device => {
            // RSSI filter
            if (this.filterRSSI > -100 && device.rssi < this.filterRSSI) {
                return false;
            }

            // Hide unnamed filter
            if (this.hideUnnamed && (!device.name || device.name === '未知设备')) {
                return false;
            }

            // Name prefix filter
            if (this.filterNamePrefix && !device.name?.toLowerCase().startsWith(this.filterNamePrefix.toLowerCase())) {
                return false;
            }

            return true;
        }).sort((a, b) => b.rssi - a.rssi); // Sort by RSSI (strongest first)
    }

    updateScanButton() {
        const btn = document.getElementById('scanButton');
        if (!btn) return;

        const icon = btn.querySelector('.icon');
        const text = btn.querySelector('.text');

        if (this.isScanning) {
            if (icon) icon.textContent = '⏹';
            if (text) text.textContent = '停止扫描';
            btn.classList.add('scanning');
        } else {
            if (icon) icon.textContent = '🔍';
            if (text) text.textContent = '开始扫描';
            btn.classList.remove('scanning');
        }
    }

    onDeviceDiscovered(device) {
        // 检查是否是新设备
        const isNew = !this.devices.has(device.id);

        this.devices.set(device.id, device);

        if (isNew) {
            // 新设备才重新渲染列表
            this.updateDeviceList();
        } else {
            // 已存在的设备只更新 RSSI
            this.updateDeviceRSSI(device);
        }
    }

    updateDeviceRSSI(device) {
        // Find the device card and update it using its property
        const deviceList = document.getElementById('deviceList');
        if (!deviceList) return;

        const cards = deviceList.querySelectorAll('device-card');
        cards.forEach(card => {
            if (card.device && card.device.id === device.id) {
                // Because we assign the whole object, the internal Watcher updates the UI
                card.device = device;
            }
        });
    }

    updateDeviceList() {
        const list = document.getElementById('deviceList');
        const count = document.getElementById('deviceCount');

        // Get filtered devices - aligned with UniApp
        const filteredDevices = this.getFilteredDevices();
        const allDevices = Array.from(this.devices.values());

        if (count) {
            if (filteredDevices.length === allDevices.length) {
                count.textContent = `发现 ${allDevices.length} 台设备`;
            } else {
                count.textContent = `显示 ${filteredDevices.length} / ${allDevices.length} 台`;
            }
        }

        if (allDevices.length === 0) {
            if (list) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📡</div>
                        <div class="empty-text">暂无设备</div>
                        <div class="empty-hint">点击上方按钮开始扫描</div>
                    </div>
                `;
            }
            return;
        }

        if (filteredDevices.length === 0) {
            if (list) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <div class="empty-text">没有符合过滤条件的设备</div>
                        <div class="empty-hint">尝试调整过滤条件</div>
                    </div>
                `;
            }
            return;
        }

        if (!list) return;

        // Rebuild list with filtered devices
        list.innerHTML = '';

        filteredDevices.forEach(device => {
            const card = this.createDeviceCard(device);
            list.appendChild(card);
        });
    }

    // Select Device - navigate to detail view
    selectDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;

        this.currentDevice = device;

        // Navigate to detail view
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById('deviceDetailView').classList.add('active');

        // Update header
        const nameEl = document.getElementById('deviceName');
        const idEl = document.getElementById('deviceId');
        if (nameEl) nameEl.textContent = device.name || '未知设备';
        if (idEl) idEl.textContent = device.id;

        const isConn = this.connectedDevices.has(deviceId);
        this.updateConnectionStatus(isConn);

        // Render services
        this.renderServices();
    }

    goBack() {
        this.currentDevice = null;
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById('deviceListView').classList.add('active');
        this.updateDeviceList();
    }

    async connectToDevice(device) {
        try {
            this.userDisconnected.delete(device.id);
            this.reconnectAttempts.set(device.id, 0);
            if (this.reconnectTimers.has(device.id)) {
                clearTimeout(this.reconnectTimers.get(device.id));
                this.reconnectTimers.delete(device.id);
            }

            this.currentDevice = device;
            this.showDeviceDetail();
            this.updateConnectionStatus('connecting');
            this.addLog(`正在连接 ${device.name || device.id}...`, 'info');

            const result = await window.bleAPI.connect(device.id);
            if (!result.success) {
                this.addLog(`连接失败: ${result.error}`, 'error');
                this.updateConnectionStatus('disconnected');
            }
        } catch (error) {
            this.addLog('连接失败: ' + error.message, 'error');
            this.updateConnectionStatus('disconnected');
        }
    }

    onDeviceConnected(deviceId) {
        this.connectedDevices.add(deviceId);
        
        if (this.currentDevice && this.currentDevice.id === deviceId) {
            this.addLog('设备已连接', 'success');
            this.updateConnectionStatus('connected');
        }

        this.renderConnectedDevicesPanel(); // T14 更新已连接面板

        // Automatically discover services
        this.discoverServices(deviceId);
    }

    onDeviceDisconnected(deviceId) {
        this.connectedDevices.delete(deviceId);
        if (this.currentDevice && this.currentDevice.id === deviceId) {
            this.addLog('设备已断开', 'info');
            this.updateConnectionStatus('disconnected');
        }
        this.renderConnectedDevicesPanel(); // T14 更新已连接面板

        // Handle auto reconnect
        if (this.autoReconnectEnabled && !this.userDisconnected.has(deviceId)) {
            const attempts = this.reconnectAttempts.get(deviceId) || 0;
            if (attempts < 3) {
                const nextAttempt = attempts + 1;
                this.reconnectAttempts.set(deviceId, nextAttempt);
                const delay = nextAttempt * 2000; // 2s, 4s, 6s

                this.addLog(`设备 ${deviceId} 意外断开，将在 ${delay/1000}s 后尝试重连... (第 ${nextAttempt}/3 次)`, 'warning');
                
                if (this.reconnectTimers.has(deviceId)) clearTimeout(this.reconnectTimers.get(deviceId));
                this.reconnectTimers.set(deviceId, setTimeout(() => {
                    this.addLog(`尝试自动重连 ${deviceId}... (第 ${nextAttempt}/3 次)`, 'info');
                    const device = this.devices.get(deviceId);
                    if (device) this.connectToDevice(device);
                }, delay));
            } else {
                this.addLog(`设备 ${deviceId} 已达到最大重连次数，放弃重连。`, 'error');
                this.reconnectAttempts.delete(deviceId);
            }
        }
    }

    async disconnect() {
        if (!this.currentDevice) return;
        const deviceId = this.currentDevice.id;
        
        this.userDisconnected.add(deviceId);
        if (this.reconnectTimers.has(deviceId)) {
            clearTimeout(this.reconnectTimers.get(deviceId));
            this.reconnectTimers.delete(deviceId);
        }
        this.reconnectAttempts.delete(deviceId);

        try {
            const result = await window.bleAPI.disconnect(deviceId);
            if (result.success) {
                // Not returning to list immediately to allow viewing context
                this.updateConnectionStatus('disconnected');
            }
        } catch (error) {
            this.showError('断开连接失败: ' + error.message);
        }
    }

    async discoverServices(deviceId) {
        try {
            const result = await window.bleAPI.discoverServices(deviceId);
            if (!result.success) {
                this.addLog(`发现服务失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog('发现服务失败: ' + error.message, 'error');
        }
    }

    onServicesDiscovered(data) {
        if (!data || !data.deviceId) return;
        const deviceId = data.deviceId;
        const services = data.services || [];
        this.servicesByDevice.set(deviceId, services);
        
        // Build characteristics map
        services.forEach(service => {
            service.characteristics.forEach(char => {
                const key = `${deviceId}:${service.uuid}:${char.uuid}`;
                this.characteristicsMap.set(key, {
                    deviceId: deviceId,
                    service: service,
                    characteristic: char,
                    notifying: false
                });
            });
        });

        if (this.currentDevice && this.currentDevice.id === deviceId) {
            this.renderServices();
            this.addLog(`发现 ${services.length} 个服务`, 'success');
        }
    }

    renderServices() {
        const servicePanel = document.getElementById('mainServicePanel');
        if (!servicePanel) return;
        
        if (!this.currentDevice) {
            servicePanel.services = [];
            return;
        }

        try {
            window.bleAPI.discoverServices(this.currentDevice.id).then(result => {
                if (result.success && result.data) {
                    servicePanel.services = result.data;
                    
                    // Check for OTA service
                    const otaUuid = '4FAFC201-1FB5-459E-8FCC-C5C9C331914D'.toLowerCase();
                    const hasOta = result.data.some(s => s.uuid.toLowerCase() === otaUuid);
                    
                    let otaBtn = document.getElementById('otaActionBtn');
                    if (hasOta) {
                        if (!otaBtn) {
                            otaBtn = document.createElement('button');
                            otaBtn.id = 'otaActionBtn';
                            otaBtn.className = 'icon-btn';
                            otaBtn.innerHTML = '⬆️ OTA升级';
                            otaBtn.style.marginRight = '10px';
                            otaBtn.onclick = () => document.getElementById('otaDialog').show(this.currentDevice.id);
                            
                            const disconnectBtn = document.getElementById('disconnectButton');
                            disconnectBtn.parentNode.insertBefore(otaBtn, disconnectBtn);
                        }
                        otaBtn.style.display = 'inline-block';
                    } else if (otaBtn) {
                        otaBtn.style.display = 'none';
                    }
                } else {
                    servicePanel.services = [];
                }
            });
        } catch (e) {
            console.error(e);
            servicePanel.services = [];
        }
    }

    async readCharacteristic(serviceUuid, charUuid) {
        if (!this.currentDevice) return;
        const deviceId = this.currentDevice.id;

        this.addLog(`正在读取特征值...`, 'info');

        try {
            const result = await window.bleAPI.readCharacteristic(deviceId, serviceUuid, charUuid);

            if (result.success) {
                const value = result.value || '空';
                this.addLog(`读取成功: ${value}`, 'success');
                this.updateCharacteristicValue(serviceUuid, charUuid, value);
            } else {
                this.addLog(`读取失败: ${result.error}`, 'error');
                this.showToast(`读取失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`读取失败: ${error.message}`, 'error');
        }
    }

    async toggleNotify(serviceUuid, charUuid, enabled) {
        if (!this.currentDevice) return;

        this.addLog(`${enabled ? '启用' : '禁用'}通知...`, 'info');

        try {
            const result = await window.bleAPI.notifyCharacteristic(this.currentDevice.id, serviceUuid, charUuid, enabled);

            if (result.success) {
                this.addLog(`通知已${enabled ? '启用' : '禁用'}`, 'success');
            } else {
                this.addLog(`设置通知失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`设置通知失败: ${error.message}`, 'error');
        }
    }

    updateCharacteristicValue(serviceUuid, charUuid, value) {
        const panel = document.getElementById('mainServicePanel');
        if (panel) panel.updateCharacteristicValue(serviceUuid, charUuid, value);
    }

    onCharacteristicValueChanged(data) {
        if (!this.currentDevice || this.currentDevice.id !== data.deviceId) return;
        
        const hex = data.value || '';
        this.addLog(`收到通知: ${hex}`, 'receive');

        // Update the characteristic value in the panel
        this.updateCharacteristicValue(data.serviceUuid, data.characteristicUuid, hex);

        // Show notification
        this.showToast(`收到数据: ${hex}`, 'info');
    }

    showDeviceList() {
        const deviceListView = document.getElementById('deviceListView');
        const deviceDetailView = document.getElementById('deviceDetailView');

        if (deviceListView) deviceListView.classList.add('active');
        if (deviceDetailView) deviceDetailView.classList.remove('active');

        this.currentDevice = null;
        this.servicesByDevice.clear();
        this.logs = [];
        this.characteristicsMap.clear();

        // Hide log panel
        const logPanel = document.getElementById('mainLogPanel');
        if (logPanel) logPanel.clearLogs();
    }

    showDeviceDetail() {
        // Redundant since selectDevice already manages view changes and sets up state
    }

    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) return;

        const statusMap = {
            'connected': { text: '已连接', class: 'connected' },
            'connecting': { text: '连接中', class: 'connecting' },
            'disconnected': { text: '未连接', class: 'disconnected' }
        };

        const statusInfo = statusMap[status] || { text: '未知', class: '' };
        statusEl.textContent = statusInfo.text;
        statusEl.className = 'status-badge ' + statusInfo.class;
    }

    addLog(message, type = 'info') {
        const panel = document.getElementById('mainLogPanel');
        if (panel) panel.addLog(type, message);
    }

    renderLogs() {
        // Handled by Web Component
    }
    clearLogs() {
        const panel = document.getElementById('mainLogPanel');
        if (panel) panel.clearLogs();
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Show
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    showError(message) {
        alert(message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.appInstance = new App();
});
