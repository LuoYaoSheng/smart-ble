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

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.initBLE();
    }

    bindEvents() {
        // Scan button
        document.getElementById('scanButton').addEventListener('click', () => {
            this.toggleScan();
        });

        // Back button
        document.getElementById('backButton').addEventListener('click', () => {
            this.showDeviceList();
        });

        // Clear logs button
        document.getElementById('clearLogsButton').addEventListener('click', () => {
            this.clearLogs();
        });

        // Disconnect button
        document.getElementById('disconnectButton').addEventListener('click', () => {
            if (this.currentDevice) {
                this.disconnect(this.currentDevice.id);
            }
        });

        // Write dialog
        document.querySelector('.dialog-close').addEventListener('click', () => {
            this.closeWriteDialog();
        });
        document.querySelector('.dialog-cancel').addEventListener('click', () => {
            this.closeWriteDialog();
        });
        document.querySelector('.dialog-confirm').addEventListener('click', () => {
            this.confirmWrite();
        });
    }

    async initBLE() {
        try {
            const result = await window.bleAPI.init();
            console.log('BLE initialized:', result);

            // Setup event listeners
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
    }

    updateBluetoothStatus(state) {
        const statusEl = document.getElementById('bluetoothStatus');
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('.status-text');

        const stateMap = {
            'poweredOn': { text: '蓝牙已开启', class: 'active' },
            'poweredOff': { text: '蓝牙已关闭', class: '' },
            'unauthorized': { text: '未授权', class: 'error' },
            'unknown': { text: '状态未知', class: '' }
        };

        const status = stateMap[state] || { text: '状态未知', class: '' };
        text.textContent = status.text;
        dot.className = 'status-dot ' + status.class;
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
            this.updateDeviceList();
            this.isScanning = true;
            this.updateScanButton();

            await window.bleAPI.startScan();
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
        const icon = btn.querySelector('.icon');
        const text = btn.querySelector('.text');

        if (this.isScanning) {
            icon.textContent = '⏹';
            text.textContent = '停止扫描';
            btn.classList.add('scanning');
        } else {
            icon.textContent = '🔍';
            text.textContent = '开始扫描';
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

        count.textContent = `发现 ${this.devices.size} 台设备`;

        if (this.devices.size === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📡</div>
                    <div class="empty-text">暂无设备</div>
                    <div class="empty-hint">点击上方按钮开始扫描</div>
                </div>
            `;
            return;
        }

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

        card.innerHTML = `
            <div class="device-icon">📡</div>
            <div class="device-info">
                <div class="device-name">${device.name || '未知设备'}</div>
                <div class="device-id">${device.id}</div>
            </div>
            <div class="rssi-indicator">
                <div class="rssi-value ${rssiClass}">${device.rssi} dBm</div>
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

    async connectToDevice(device) {
        try {
            this.currentDevice = device;
            this.showDeviceDetail();
            this.updateConnectionStatus('connecting');
            this.addLog('正在连接设备...', 'info');

            await window.bleAPI.connect(device.id);
        } catch (error) {
            this.addLog('连接失败: ' + error.message, 'error');
            this.showDeviceList();
        }
    }

    onDeviceConnected(deviceId) {
        this.addLog('设备已连接', 'success');
        this.updateConnectionStatus('connected');

        // Discover services
        window.bleAPI.discoverServices(deviceId);
    }

    onDeviceDisconnected(deviceId) {
        this.addLog('设备已断开', 'info');
        this.updateConnectionStatus('disconnected');
    }

    async disconnect(deviceId) {
        try {
            await window.bleAPI.disconnect(deviceId);
            this.showDeviceList();
        } catch (error) {
            this.showError('断开连接失败: ' + error.message);
        }
    }

    onServicesDiscovered(data) {
        this.services = data.services || [];
        this.renderServices();
        this.addLog(`发现 ${this.services.length} 个服务`, 'info');
    }

    renderServices() {
        const list = document.getElementById('servicesList');

        if (this.services.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-text">未发现服务</div></div>';
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

        header.addEventListener('click', () => {
            card.classList.toggle('expanded');
        });

        if (service.characteristics.length > 0) {
            service.characteristics.forEach(char => {
                const charEl = this.createCharacteristicElement(service.uuid, char);
                charsContainer.appendChild(charEl);
            });
        } else {
            charsContainer.innerHTML = '<div style="padding: 16px; color: var(--text-secondary);">无特征值</div>';
        }

        return card;
    }

    createCharacteristicElement(serviceUuid, char) {
        const div = document.createElement('div');
        div.className = 'characteristic';

        const properties = [];
        if (char.properties.includes('read')) properties.push('read');
        if (char.properties.includes('write') || char.properties.includes('writeWithoutResponse')) properties.push('write');
        if (char.properties.includes('notify') || char.properties.includes('indicate')) properties.push('notify');

        const propertyChips = properties.map(p =>
            `<span class="property-chip ${p}">${p.toUpperCase()}</span>`
        ).join('');

        div.innerHTML = `
            <div class="char-icon">📄</div>
            <div class="char-info">
                <div class="char-name">${char.name}</div>
                <div class="char-uuid">${char.uuid}</div>
                <div class="char-properties">${propertyChips}</div>
            </div>
            <div class="char-actions"></div>
        `;

        const actions = div.querySelector('.char-actions');
        const icon = div.querySelector('.char-icon');

        // Read button
        if (char.properties.includes('read')) {
            const btn = document.createElement('button');
            btn.className = 'btn-icon';
            btn.innerHTML = '📥';
            btn.title = '读取';
            btn.addEventListener('click', () => this.readCharacteristic(serviceUuid, char.uuid));
            actions.appendChild(btn);
        }

        // Write button
        if (char.properties.includes('write') || char.properties.includes('writeWithoutResponse')) {
            const btn = document.createElement('button');
            btn.className = 'btn-icon';
            btn.innerHTML = '📤';
            btn.title = '写入';
            btn.addEventListener('click', () => this.showWriteDialog(serviceUuid, char.uuid));
            actions.appendChild(btn);
        }

        // Notify button
        if (char.properties.includes('notify') || char.properties.includes('indicate')) {
            const btn = document.createElement('button');
            btn.className = 'btn-icon';
            btn.innerHTML = '🔔';
            btn.title = '通知';
            btn.addEventListener('click', () => this.toggleNotify(serviceUuid, char.uuid, btn));
            actions.appendChild(btn);
        }

        return div;
    }

    async readCharacteristic(serviceUuid, charUuid) {
        if (!this.currentDevice) return;

        this.addLog(`读取特征值...`, 'info');

        try {
            const result = await window.bleAPI.readCharacteristic(
                this.currentDevice.id,
                serviceUuid,
                charUuid
            );

            if (result.success) {
                this.addLog(`读取成功: ${result.value}`, 'success');
            } else {
                this.addLog(`读取失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`读取失败: ${error.message}`, 'error');
        }
    }

    showWriteDialog(serviceUuid, charUuid) {
        this.writeDialogCallback = { serviceUuid, charUuid };
        document.getElementById('writeDialog').style.display = 'flex';
        document.getElementById('writeDataInput').focus();
    }

    closeWriteDialog() {
        document.getElementById('writeDialog').style.display = 'none';
        document.getElementById('writeDataInput').value = '';
        this.writeDialogCallback = null;
    }

    async confirmWrite() {
        if (!this.writeDialogCallback || !this.currentDevice) return;

        const input = document.getElementById('writeDataInput');
        const data = input.value.trim();
        const format = document.querySelector('input[name="format"]:checked').value;

        if (!data) return;

        let writeData = data;
        if (format === 'utf8') {
            // Convert UTF-8 to HEX
            writeData = Buffer.from(data, 'utf8').toString('hex').match(/.{2}/g).join(' ');
        }

        this.addLog(`写入特征值: ${writeData}`, 'info');

        try {
            const result = await window.bleAPI.writeCharacteristic(
                this.currentDevice.id,
                this.writeDialogCallback.serviceUuid,
                this.writeDialogCallback.charUuid,
                writeData,
                false
            );

            if (result.success) {
                this.addLog('写入成功', 'success');
            } else {
                this.addLog(`写入失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`写入失败: ${error.message}`, 'error');
        }

        this.closeWriteDialog();
    }

    async toggleNotify(serviceUuid, charUuid, btn) {
        if (!this.currentDevice) return;

        const isNotifying = btn.classList.contains('notifying');
        const action = isNotifying ? '禁用' : '启用';

        this.addLog(`${action}通知...`, 'info');

        try {
            const result = await window.bleAPI.notifyCharacteristic(
                this.currentDevice.id,
                serviceUuid,
                charUuid,
                !isNotifying
            );

            if (result.success) {
                btn.classList.toggle('notifying');
                btn.innerHTML = isNotifying ? '🔔' : '🔕';
                this.addLog(`通知已${action}`, 'success');
            } else {
                this.addLog(`设置通知失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`设置通知失败: ${error.message}`, 'error');
        }
    }

    onCharacteristicValueChanged(data) {
        this.addLog(`收到通知: ${data.value}`, 'receive');
    }

    showDeviceList() {
        document.getElementById('deviceListView').classList.add('active');
        document.getElementById('deviceDetailView').classList.remove('active');
        this.currentDevice = null;
        this.services = [];
        this.logs = [];
    }

    showDeviceDetail() {
        document.getElementById('deviceListView').classList.remove('active');
        document.getElementById('deviceDetailView').classList.add('active');

        document.getElementById('deviceName').textContent = this.currentDevice.name || '未知设备';
        document.getElementById('deviceId').textContent = this.currentDevice.id;
        document.getElementById('servicesList').innerHTML = '<div class="loading-state">正在发现服务...</div>';
    }

    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.className = 'status-badge ' + status;

        const statusMap = {
            'connected': '已连接',
            'connecting': '连接中',
            'disconnected': '未连接'
        };

        statusEl.textContent = statusMap[status] || '未知';
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

    showError(message) {
        alert(message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
