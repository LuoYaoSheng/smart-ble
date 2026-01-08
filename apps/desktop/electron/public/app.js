//
// SmartBLE Desktop - Renderer Process
//

class App {
    constructor() {
        this.devices = new Map();
        this.services = [];
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

        // Filter controls - aligned with UniApp
        document.getElementById('rssiFilter')?.addEventListener('input', (e) => {
            this.filterRSSI = parseInt(e.target.value);
            document.getElementById('rssiValue').textContent = this.filterRSSI;
            this.updateDeviceList();
        });

        document.getElementById('namePrefixFilter')?.addEventListener('input', (e) => {
            this.filterNamePrefix = e.target.value;
            this.updateDeviceList();
        });

        document.getElementById('hideUnnamedFilter')?.addEventListener('change', (e) => {
            this.hideUnnamed = e.target.checked;
            this.updateDeviceList();
        });

        document.getElementById('resetFilterButton')?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = parseInt(e.target.dataset.value);
                this.filterRSSI = value;
                document.getElementById('rssiFilter').value = value;
                document.getElementById('rssiValue').textContent = value;
                this.updateDeviceList();
            });
        });

        // Write dialog
        const dialogClose = document.querySelector('.dialog-close');
        const dialogCancel = document.querySelector('.dialog-cancel');
        const dialogConfirm = document.querySelector('.dialog-confirm');

        dialogClose?.addEventListener('click', () => this.closeWriteDialog());
        dialogCancel?.addEventListener('click', () => this.closeWriteDialog());
        dialogConfirm?.addEventListener('click', () => this.confirmWrite());
    }

    switchTab(tab) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // 切换视图
        const deviceListView = document.getElementById('deviceListView');
        const broadcastView = document.getElementById('broadcastView');

        if (tab === 'scan') {
            deviceListView?.classList.add('active');
            broadcastView?.classList.remove('active');
        } else if (tab === 'broadcast') {
            // 切换到广播时停止扫描
            if (this.isScanning) {
                this.stopScan();
            }
            deviceListView?.classList.remove('active');
            broadcastView?.classList.add('active');
        }
    }

    async startBroadcast() {
        const name = document.getElementById('broadcastName')?.value || 'SmartBLE';
        const serviceUuid = document.getElementById('broadcastServiceUuid')?.value || 'FFF0';

        try {
            const result = await window.bleAPI.startAdvertising(name, [serviceUuid]);
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

    // Reset filters - aligned with UniApp
    resetFilters() {
        this.filterRSSI = -100;
        this.filterNamePrefix = '';
        this.hideUnnamed = false;

        // Update UI
        document.getElementById('rssiFilter').value = -100;
        document.getElementById('rssiValue').textContent = '-100';
        document.getElementById('namePrefixFilter').value = '';
        document.getElementById('hideUnnamedFilter').checked = false;

        this.updateDeviceList();
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
        // 找到对应的设备卡片并更新 RSSI
        const deviceList = document.getElementById('deviceList');
        if (!deviceList) return;

        // 查找对应 ID 的卡片
        const cards = deviceList.querySelectorAll('.device-card');
        cards.forEach(card => {
            const idEl = card.querySelector('.device-id');
            if (idEl && idEl.textContent === this.formatShortUuid(device.id)) {
                // 更新 RSSI
                const rssiText = card.querySelector('.rssi-text');
                const signalBars = card.querySelector('.signal-bars');
                if (rssiText) rssiText.textContent = `${device.rssi} dBm`;

                // 更新信号条
                if (signalBars) {
                    signalBars.className = `signal-bars ${this.getRssiClass(device.rssi)}`;
                    signalBars.innerHTML = this.getSignalBars(device.rssi);
                }
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

    createDeviceCard(device) {
        const card = document.createElement('div');
        card.className = 'device-card';

        const rssiClass = this.getRssiClass(device.rssi);
        const rssiText = this.getRssiText(device.rssi);
        const adv = device.advertisement || {};

        // 构建服务 UUID 列表
        let serviceInfo = '';
        if (adv.serviceUuids && adv.serviceUuids.length > 0) {
            serviceInfo = `<div class="device-services">${adv.serviceUuids.map(uuid => this.formatShortUuid(uuid)).join(' · ')}</div>`;
        }

        // 构建厂商信息
        let manufacturerInfo = '';
        if (adv.manufacturerData) {
            const companyCode = this.parseManufacturerData(adv.manufacturerData);
            manufacturerInfo = `<div class="device-manufacturer">厂商: ${companyCode} · ${adv.manufacturerData.substring(0, 8)}...</div>`;
        }

        card.innerHTML = `
            <div class="device-icon">📡</div>
            <div class="device-info">
                <div class="device-name">${device.name || '未知设备'}</div>
                <div class="device-id">${this.formatShortUuid(device.id)}</div>
                ${serviceInfo}
                ${manufacturerInfo}
            </div>
            <div class="device-meta">
                <div class="rssi-indicator">
                    <div class="signal-bars ${rssiClass}">
                        ${this.getSignalBars(device.rssi)}
                    </div>
                    <span class="rssi-text">${device.rssi} dBm</span>
                </div>
                <button class="btn-connect" title="连接设备">→</button>
            </div>
        `;

        // 点击整个卡片展开详情
        card.addEventListener('click', (e) => {
            // 如果点击的是连接按钮，则连接设备
            if (e.target.classList.contains('btn-connect')) {
                this.connectToDevice(device);
                e.stopPropagation();
                return;
            }

            // 切换详情展开/收起
            const existingDetails = card.nextElementSibling;
            if (existingDetails && existingDetails.classList.contains('device-details')) {
                // 已展开，收起
                existingDetails.remove();
                card.classList.remove('expanded');
            } else {
                // 未展开，先关闭其他已展开的
                document.querySelectorAll('.device-details').forEach(el => el.remove());
                document.querySelectorAll('.device-card.expanded').forEach(el => el.classList.remove('expanded'));

                // 展开当前
                this.showDeviceDetails(card, device);
                card.classList.add('expanded');
            }
        });

        return card;
    }

    formatShortUuid(uuid) {
        // 对于 128 位 UUID，只显示前 8 位
        if (uuid.length > 8) {
            return uuid.substring(0, 8) + '...';
        }
        return uuid;
    }

    parseManufacturerData(hex) {
        // 厂商 ID 是前两个字节（小端序）
        if (hex && hex.length >= 4) {
            const companyId = parseInt(hex.substring(2, 4) + hex.substring(0, 2), 16);
            const companies = {
                0x004C: 'Apple',
                0x00E0: 'Google',
                0x006D: 'Microsoft',
                0x0087: 'Garmin',
                0x0006: 'Microsoft',
                0x00D6: 'Cyble',
                0xFFFF: 'Test'
            };
            return companies[companyId] || `0x${companyId.toString(16).toUpperCase().padStart(4, '0')}`;
        }
        return 'Unknown';
    }

    showDeviceDetails(card, device) {
        const adv = device.advertisement || {};

        let detailsHtml = `
            <div class="device-details">
                <div class="details-section">
                    <h4>设备信息</h4>
                    <div class="detail-row"><span>设备 ID:</span><span class="mono">${device.id}</span></div>
                    <div class="detail-row"><span>地址:</span><span class="mono">${device.address || 'N/A'}</span></div>
                    <div class="detail-row"><span>RSSI:</span><span>${device.rssi} dBm</span></div>
                    <div class="detail-row"><span>可连接:</span><span>${adv.connectable ? '是' : '否'}</span></div>
                    <div class="detail-row"><span>可扫描:</span><span>${adv.scannable ? '是' : '否'}</span></div>
                    ${adv.txPowerLevel !== undefined ? `<div class="detail-row"><span>TX Power:</span><span>${adv.txPowerLevel} dBm</span></div>` : ''}
                </div>
        `;

        // 服务 UUIDs
        if (adv.serviceUuids && adv.serviceUuids.length > 0) {
            detailsHtml += `
                <div class="details-section">
                    <h4>广播服务 UUIDs (${adv.serviceUuids.length})</h4>
                    ${adv.serviceUuids.map(uuid => `
                        <div class="detail-row">
                            <span class="mono">${uuid}</span>
                            <span class="service-name">${this.getServiceName(uuid)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 服务数据
        if (adv.serviceData && adv.serviceData.length > 0) {
            detailsHtml += `
                <div class="details-section">
                    <h4>服务数据</h4>
                    ${adv.serviceData.map(sd => `
                        <div class="detail-row">
                            <span class="mono">${sd.uuid}</span>
                            <span class="mono">${sd.data || 'N/A'}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 厂商数据
        if (adv.manufacturerData) {
            detailsHtml += `
                <div class="details-section">
                    <h4>厂商数据</h4>
                    <div class="detail-row">
                        <span>公司:</span>
                        <span>${this.parseManufacturerData(adv.manufacturerData)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="mono">${adv.manufacturerData}</span>
                    </div>
                </div>
            `;
        }

        detailsHtml += `</div>`;

        // 在卡片后面插入详情
        card.insertAdjacentHTML('afterend', detailsHtml);
    }

    getServiceName(uuid) {
        const shortUuid = uuid.substring(4, 8);
        const services = {
            '1800': 'Generic Access',
            '1801': 'Generic Attribute',
            '180A': 'Device Information',
            '180F': 'Battery Service',
            '1812': 'HID',
            '180D': 'Heart Rate',
            '181C': 'User Data',
            '1809': 'Health Thermometer',
            '181A': 'Automation IO',
            '181B': 'Object Transfer'
        };
        return services[shortUuid] || '';
    }

    getRssiClass(rssi) {
        if (rssi >= -50) return 'excellent';
        if (rssi >= -70) return 'good';
        if (rssi >= -90) return 'fair';
        return 'weak';
    }

    getRssiText(rssi) {
        if (rssi >= -50) return '极佳';
        if (rssi >= -70) return '良好';
        if (rssi >= -90) return '一般';
        return '微弱';
    }

    getSignalBars(rssi) {
        const bars = 4;
        const activeBars = Math.min(4, Math.max(0, Math.ceil((100 + rssi) / 20)));
        let html = '';
        for (let i = 0; i < bars; i++) {
            const active = i < activeBars ? 'active' : '';
            html += `<div class="signal-bar ${active}"></div>`;
        }
        return html;
    }

    async connectToDevice(device) {
        try {
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
        this.addLog('设备已连接', 'success');
        this.updateConnectionStatus('connected');

        // Automatically discover services
        this.discoverServices();
    }

    onDeviceDisconnected(deviceId) {
        this.addLog('设备已断开', 'info');
        this.updateConnectionStatus('disconnected');
    }

    async disconnect() {
        try {
            const result = await window.bleAPI.disconnect();
            if (result.success) {
                this.showDeviceList();
            }
        } catch (error) {
            this.showError('断开连接失败: ' + error.message);
        }
    }

    async discoverServices() {
        try {
            const result = await window.bleAPI.discoverServices();
            if (!result.success) {
                this.addLog(`发现服务失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog('发现服务失败: ' + error.message, 'error');
        }
    }

    onServicesDiscovered(data) {
        this.services = data.services || [];
        this.characteristicsMap.clear();

        // Build characteristics map
        this.services.forEach(service => {
            service.characteristics.forEach(char => {
                const key = `${service.uuid}:${char.uuid}`;
                this.characteristicsMap.set(key, {
                    service: service,
                    characteristic: char,
                    notifying: false
                });
            });
        });

        this.renderServices();
        this.addLog(`发现 ${this.services.length} 个服务`, 'success');
    }

    renderServices() {
        const list = document.getElementById('servicesList');

        if (!list) return;

        if (this.services.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚙️</div>
                    <div class="empty-text">未发现服务</div>
                    <div class="empty-hint">请确保设备支持 BLE</div>
                </div>
            `;
            return;
        }

        list.innerHTML = '';
        this.services.forEach(service => {
            const card = this.createServiceCard(service);
            list.appendChild(card);
        });
    }

    createServiceCard(service) {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.dataset.serviceUuid = service.uuid;

        const shortUuid = service.uuid.substring(4, 8);

        card.innerHTML = `
            <div class="service-header">
                <div class="service-icon">⚙️</div>
                <div class="service-info">
                    <div class="service-name">${service.name}</div>
                    <div class="service-uuid">${service.uuid}</div>
                </div>
                <div class="service-count">${service.characteristics.length} 特征值</div>
                <div class="service-expand">▼</div>
            </div>
            <div class="service-characteristics"></div>
        `;

        const header = card.querySelector('.service-header');
        const charsContainer = card.querySelector('.service-characteristics');

        // Click to expand/collapse
        header.addEventListener('click', () => {
            const isExpanded = card.classList.toggle('expanded');
            const expandIcon = header.querySelector('.service-expand');
            if (expandIcon) {
                expandIcon.textContent = isExpanded ? '▲' : '▼';
            }
        });

        // Add characteristics
        if (service.characteristics.length > 0) {
            service.characteristics.forEach(char => {
                const charEl = this.createCharacteristicElement(service.uuid, char);
                charsContainer.appendChild(charEl);
            });
        } else {
            charsContainer.innerHTML = `
                <div style="padding: 16px; color: var(--text-secondary); text-align: center;">
                    无特征值
                </div>
            `;
        }

        return card;
    }

    createCharacteristicElement(serviceUuid, char) {
        const div = document.createElement('div');
        div.className = 'characteristic';
        div.dataset.serviceUuid = serviceUuid;
        div.dataset.charUuid = char.uuid;

        const canRead = char.properties.includes('read');
        const canWrite = char.properties.includes('write') || char.properties.includes('writeWithoutResponse');
        const canNotify = char.properties.includes('notify') || char.properties.includes('indicate');

        const propertyChips = [];
        if (canRead) propertyChips.push({ label: 'READ', class: 'read' });
        if (canWrite) propertyChips.push({ label: 'WRITE', class: 'write' });
        if (canNotify) propertyChips.push({ label: 'NOTIFY', class: 'notify' });

        div.innerHTML = `
            <div class="char-icon">
                ${canNotify ? '🔔' : canRead ? '📖' : canWrite ? '✏️' : '📄'}
            </div>
            <div class="char-info">
                <div class="char-name">${char.name}</div>
                <div class="char-uuid">${char.uuid}</div>
                <div class="char-properties">
                    ${propertyChips.map(p => `<span class="property-chip ${p.class}">${p.label}</span>`).join('')}
                </div>
            </div>
            <div class="char-actions"></div>
        `;

        const actions = div.querySelector('.char-actions');

        // Read button
        if (canRead) {
            const btn = this.createActionButton('📥', '读取', () => this.readCharacteristic(serviceUuid, char.uuid));
            actions.appendChild(btn);
        }

        // Write button
        if (canWrite) {
            const btn = this.createActionButton('📤', '写入', () => this.showWriteDialog(serviceUuid, char.uuid));
            actions.appendChild(btn);
        }

        // Notify button
        if (canNotify) {
            const btn = this.createActionButton('🔔', '通知', () => this.toggleNotify(serviceUuid, char.uuid));
            actions.appendChild(btn);
        }

        // Store reference for notify toggle
        if (canNotify) {
            const key = `${serviceUuid}:${char.uuid}`;
            this.characteristicsMap.set(key + ':btn', actions.lastChild);
        }

        return div;
    }

    createActionButton(icon, title, onClick) {
        const btn = document.createElement('button');
        btn.className = 'btn-icon';
        btn.innerHTML = icon;
        btn.title = title;
        btn.addEventListener('click', onClick);
        return btn;
    }

    async readCharacteristic(serviceUuid, charUuid) {
        if (!this.currentDevice) return;

        this.addLog(`正在读取特征值...`, 'info');

        try {
            const result = await window.bleAPI.readCharacteristic(serviceUuid, charUuid);

            if (result.success) {
                const value = result.value || '空';
                this.addLog(`读取成功: ${value}`, 'success');
                // Show value in a toast/notification
                this.showToast(`读取值: ${value}`, 'success');
            } else {
                this.addLog(`读取失败: ${result.error}`, 'error');
                this.showToast(`读取失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`读取失败: ${error.message}`, 'error');
        }
    }

    showWriteDialog(serviceUuid, charUuid) {
        this.writeDialogCallback = { serviceUuid, charUuid };
        const dialog = document.getElementById('writeDialog');
        const input = document.getElementById('writeDataInput');

        if (dialog && input) {
            dialog.style.display = 'flex';
            input.value = '';
            input.focus();

            // Set format to hex by default
            const hexRadio = document.querySelector('input[name="format"][value="hex"]');
            if (hexRadio) hexRadio.checked = true;
        }
    }

    closeWriteDialog() {
        const dialog = document.getElementById('writeDialog');
        if (dialog) dialog.style.display = 'none';
        this.writeDialogCallback = null;
    }

    async confirmWrite() {
        if (!this.writeDialogCallback || !this.currentDevice) return;

        const input = document.getElementById('writeDataInput');
        const formatRadio = document.querySelector('input[name="format"]:checked');

        if (!input) return;

        const data = input.value.trim();
        if (!data) {
            this.showToast('请输入数据', 'warning');
            return;
        }

        let writeData = data;
        if (formatRadio?.value === 'utf8') {
            // Convert UTF-8 to HEX
            writeData = Array.from(new TextEncoder().encode(data))
                .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ');
        }

        // Validate hex format
        if (formatRadio?.value === 'hex') {
            const clean = data.replace(/\s/g, '');
            if (!/^[0-9A-Fa-f]*$/.test(clean)) {
                this.showToast('HEX 格式不正确', 'error');
                return;
            }
        }

        this.addLog(`正在写入: ${writeData}`, 'info');

        try {
            const result = await window.bleAPI.writeCharacteristic(
                this.writeDialogCallback.serviceUuid,
                this.writeDialogCallback.charUuid,
                writeData,
                false
            );

            if (result.success) {
                this.addLog('写入成功', 'success');
                this.showToast('写入成功', 'success');
            } else {
                this.addLog(`写入失败: ${result.error}`, 'error');
                this.showToast(`写入失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`写入失败: ${error.message}`, 'error');
        }

        this.closeWriteDialog();
    }

    async toggleNotify(serviceUuid, charUuid) {
        if (!this.currentDevice) return;

        const key = `${serviceUuid}:${charUuid}`;
        const state = this.characteristicsMap.get(key);
        const btn = state?.btn;

        const isNotifying = state?.notifying || false;
        const newState = !isNotifying;

        this.addLog(`${newState ? '启用' : '禁用'}通知...`, 'info');

        try {
            const result = await window.bleAPI.notifyCharacteristic(serviceUuid, charUuid, newState);

            if (result.success) {
                if (state) {
                    state.notifying = newState;
                }

                if (btn) {
                    btn.classList.toggle('notifying', newState);
                    btn.innerHTML = newState ? '🔕' : '🔔';
                    btn.style.color = newState ? 'var(--success-color)' : '';
                }

                this.addLog(`通知已${newState ? '启用' : '禁用'}`, 'success');
            } else {
                this.addLog(`设置通知失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`设置通知失败: ${error.message}`, 'error');
        }
    }

    onCharacteristicValueChanged(data) {
        const hex = data.value || '';
        this.addLog(`收到通知: ${hex}`, 'receive');

        // Highlight the changed characteristic
        const charEl = document.querySelector(`[data-service-uuid="${data.serviceUuid}"][data-char-uuid="${data.characteristicUuid}"]`);
        if (charEl) {
            charEl.classList.add('highlight');
            setTimeout(() => charEl.classList.remove('highlight'), 1000);
        }

        // Show notification
        this.showToast(`收到数据: ${hex}`, 'info');
    }

    showDeviceList() {
        const deviceListView = document.getElementById('deviceListView');
        const deviceDetailView = document.getElementById('deviceDetailView');

        if (deviceListView) deviceListView.classList.add('active');
        if (deviceDetailView) deviceDetailView.classList.remove('active');

        this.currentDevice = null;
        this.services = [];
        this.logs = [];
        this.characteristicsMap.clear();

        // Hide log panel
        const logPanel = document.getElementById('logPanel');
        if (logPanel) logPanel.style.display = 'none';
    }

    showDeviceDetail() {
        const deviceListView = document.getElementById('deviceListView');
        const deviceDetailView = document.getElementById('deviceDetailView');

        if (deviceListView) deviceListView.classList.remove('active');
        if (deviceDetailView) deviceDetailView.classList.add('active');

        const nameEl = document.getElementById('deviceName');
        const idEl = document.getElementById('deviceId');
        const servicesList = document.getElementById('servicesList');

        if (nameEl) nameEl.textContent = this.currentDevice?.name || '未知设备';
        if (idEl) idEl.textContent = this.currentDevice?.id || '';

        // Show loading state
        if (servicesList) {
            servicesList.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <div>正在发现服务...</div>
                </div>
            `;
        }
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
        const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        this.logs.push({ message, type, timestamp });
        this.renderLogs();
    }

    renderLogs() {
        const panel = document.getElementById('logPanel');
        const list = document.getElementById('logList');
        const count = document.getElementById('logCount');

        if (!panel || !list || !count) return;

        if (this.logs.length === 0) {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = 'flex';
        count.textContent = `${this.logs.length} 条`;

        list.innerHTML = '';
        this.logs.slice().reverse().forEach(log => {
            const item = document.createElement('div');
            item.className = 'log-item';

            const icons = { info: 'ℹ️', success: '✅', error: '❌', receive: '📥' };

            item.innerHTML = `
                <div class="log-icon ${log.type}">${icons[log.type]}</div>
                <div class="log-content">
                    <div class="log-message">${log.message}</div>
                    <div class="log-time">${log.timestamp}</div>
                </div>
            `;

            list.appendChild(item);
        });
    }

    clearLogs() {
        this.logs = [];
        this.renderLogs();
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
    new App();
});
