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

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.initBLE();
    }

    bindEvents() {
        // Scan button
        document.getElementById('scanButton')?.addEventListener('click', () => {
            this.toggleScan();
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

        // Write dialog
        const dialogClose = document.querySelector('.dialog-close');
        const dialogCancel = document.querySelector('.dialog-cancel');
        const dialogConfirm = document.querySelector('.dialog-confirm');

        dialogClose?.addEventListener('click', () => this.closeWriteDialog());
        dialogCancel?.addEventListener('click', () => this.closeWriteDialog());
        dialogConfirm?.addEventListener('click', () => this.confirmWrite());
    }

    async initBLE() {
        try {
            const result = await window.bleAPI.init();
            console.log('BLE initialized:', result);
            this.setupEventListeners();
        } catch (error) {
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
        const statusEl = document.getElementById('bluetoothStatus');
        if (!statusEl) return;

        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        const stateMap = {
            'poweredOn': { text: '蓝牙已开启', class: 'active' },
            'poweredOff': { text: '蓝牙已关闭', class: '' },
            'unauthorized': { text: '未授权', class: 'error' },
            'unknown': { text: '初始化中...', class: '' }
        };

        const status = stateMap[state] || { text: '状态未知', class: '' };
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
            }
        } catch (error) {
            this.showError('扫描失败: ' + error.message);
            this.isScanning = false;
            this.updateScanButton();
        }
    }

    async stopScan() {
        try {
            await window.bleAPI.stopScan();
            this.isScanning = false;
            this.updateScanButton();
        } catch (error) {
            this.showError('停止扫描失败: ' + error.message);
        }
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
        this.devices.set(device.id, device);
        this.updateDeviceList();
    }

    updateDeviceList() {
        const list = document.getElementById('deviceList');
        const count = document.getElementById('deviceCount');

        if (count) count.textContent = `发现 ${this.devices.size} 台设备`;

        if (this.devices.size === 0) {
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

        if (!list) return;

        list.innerHTML = '';
        Array.from(this.devices.values()).forEach(device => {
            const card = this.createDeviceCard(device);
            list.appendChild(card);
        });
    }

    createDeviceCard(device) {
        const card = document.createElement('div');
        card.className = 'device-card';

        const rssiClass = this.getRssiClass(device.rssi);
        const rssiText = this.getRssiText(device.rssi);

        card.innerHTML = `
            <div class="device-icon">📡</div>
            <div class="device-info">
                <div class="device-name">${device.name || '未知设备'}</div>
                <div class="device-id">${device.id}</div>
            </div>
            <div class="device-meta">
                <div class="rssi-indicator">
                    <div class="signal-bars ${rssiClass}">
                        ${this.getSignalBars(device.rssi)}
                    </div>
                    <span class="rssi-text">${device.rssi} dBm</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            this.connectToDevice(device);
        });

        return card;
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

        const status = statusMap[status] || { text: '未知', class: '' };
        statusEl.textContent = status.text;
        statusEl.className = 'status-badge ' + status.class;
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
