// SmartBLE Desktop - Tauri Frontend

let invoke, listen;

// Platform detection - matches Flutter pattern
const PLATFORM = {
    isMacOS: typeof process !== 'undefined' && process.platform === 'darwin',
    isWindows: typeof process !== 'undefined' && process.platform === 'win32',
    isLinux: typeof process !== 'undefined' && process.platform === 'linux',
    isUnsupported: false
};

// Check if peripheral mode is supported on this platform
const PERIPHERAL_SUPPORT = {
    supported: PLATFORM.isMacOS, // Only macOS has some support via native APIs
    message: PLATFORM.isMacOS
        ? 'macOS 支持外设模式，但需使用原生应用获取完整功能'
        : PLATFORM.isWindows
            ? 'Windows 平台暂不支持外设模式'
            : PLATFORM.isLinux
                ? 'Linux 平台暂不支持外设模式'
                : '当前平台不支持外设模式',
    // Based on Flutter: Android uses actual device name, iOS/macOS support custom name
    nameWarning: PLATFORM.isMacOS
        ? 'macOS 支持自定义广播名称'
        : '自定义广播名称在此平台上可能无效',
    recommendation: PLATFORM.isMacOS
        ? '建议使用 apps/desktop/macos/SmartBLE-mac 原生应用'
        : '请使用对应平台的原生应用获取完整支持'
};

// App State
const state = {
    bluetoothReady: false,
    scanning: false,
    devices: new Map(),
    currentDevice: null,
    connectedDevices: new Set(),
    servicesByDevice: new Map(),
    logs: [],
    advertising: false,
    // Filter options
    filters: {
        rssi: -100,
        namePrefix: '',
        hideUnnamed: false
    },
    // Scan timer for auto-stop
    scanTimer: null,
    // Maximum devices to display
    maxDevices: 100,
    // Platform info
    platform: PLATFORM,
    // T06: Auto-reconnect state (aligned with Flutter: max 3 attempts, exponential backoff)
    reconnect: {
        enabled: true,
        attempts: new Map(),      // deviceId -> attempt count
        timers: new Map(),        // deviceId -> setTimeout handle
        userDisconnected: new Set() // deviceId -> user initiated, skip reconnect
    },
    // Mock testing
    useMockBLE: window.location.search.includes('mock=true')
};

// DOM Elements
const elements = {
    bluetoothStatus: document.getElementById('bluetoothStatus'),
    scanButton: document.getElementById('scanButton'),
    deviceCount: document.getElementById('deviceCount'),
    deviceList: document.getElementById('deviceList'),
    deviceListView: document.getElementById('deviceListView'),
    deviceDetailView: document.getElementById('deviceDetailView'),
    connectedView: document.getElementById('connectedView'),    // T13
    broadcastView: document.getElementById('broadcastView'),
    deviceName: document.getElementById('deviceName'),
    deviceId: document.getElementById('deviceId'),
    connectionStatus: document.getElementById('connectionStatus'),
    // Removed elements.servicesList
    // Removed old write elements
    broadcastName: document.getElementById('broadcastName'),
    broadcastServiceUuid: document.getElementById('broadcastServiceUuid'),
    broadcastManufacturerId: document.getElementById('broadcastManufacturerId'),
    broadcastManufacturerData: document.getElementById('broadcastManufacturerData'),
    broadcastIncludeName: document.getElementById('broadcastIncludeName'),
    broadcastStatus: document.getElementById('broadcastStatus'),
    startBroadcastButton: document.getElementById('startBroadcastButton'),
    stopBroadcastButton: document.getElementById('stopBroadcastButton'),
    connectButton: document.getElementById('connectButton'),
    disconnectButton: document.getElementById('disconnectButton'),
    // Filter elements (removed as they are now encapsulated in the Web Component)
    // Device info dialog
    deviceInfoDialog: document.getElementById('deviceInfoDialog'),
    otaDialog: document.getElementById('otaDialog'),
    infoDeviceName: document.getElementById('infoDeviceName'),
    infoDeviceId: document.getElementById('infoDeviceId'),
    infoRssi: document.getElementById('infoRssi'),
    infoServiceUuids: document.getElementById('infoServiceUuids'),
    infoAdvData: document.getElementById('infoAdvData')
};

let currentWriteChar = null;

// Initialize App
async function init() {
    try {
        // Try to get Tauri API - wait for it to be injected
        let attempts = 0;
        while (attempts < 100) {
            if (window.__TAURI__) {
                break;
            }
            await new Promise(r => setTimeout(r, 50));
            attempts++;
        }

        if (!window.__TAURI__) {
            console.error('__TAURI__ not found on window object');
            updateStatus('API Error', false);
            return;
        }

        console.log('Tauri API structure:', Object.keys(window.__TAURI__));

        // Tauri v1.5 API structure - handle different paths
        if (window.__TAURI__.core) {
            invoke = window.__TAURI__.core.invoke;
        } else if (window.__TAURI__.tauri) {
            invoke = window.__TAURI__.tauri.invoke;
        } else {
            invoke = window.__TAURI__.invoke;
        }

        if (window.__TAURI__.event) {
            listen = window.__TAURI__.event.listen;
        } else {
            listen = window.__TAURI__.listen;
        }

        if (!invoke) {
            console.error('invoke not found. Available:', Object.keys(window.__TAURI__));
            updateStatus('API Error', false);
            return;
        }

        setupEventListeners();
        updateBroadcastPlatformInfo(); // Update broadcast UI based on platform
        await initBluetooth();
        setupTauriListeners();
    } catch (error) {
        console.error('Failed to initialize Tauri:', error);
        updateStatus('Error', false);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Scan button
    elements.scanButton.addEventListener('click', toggleScan);

    // Device detail buttons
    document.getElementById('backButton')?.addEventListener('click', goBack);
    document.getElementById('connectButton')?.addEventListener('click', () => connectDevice(state.currentDevice?.id));
    document.getElementById('disconnectButton')?.addEventListener('click', disconnectDevice);
    document.getElementById('clearLogsButton')?.addEventListener('click', () => clearLogs());
    document.getElementById('otaButton')?.addEventListener('click', () => {
        if (state.currentDevice) {
            // Correct id is 'mainOtaDialog', not 'otaDialog'
            const otaDialog = document.getElementById('mainOtaDialog');
            if (otaDialog) otaDialog.show(state.currentDevice.id);
        }
    });

    // Connected devices panel — "Disconnect All" button
    document.getElementById('disconnectAllBtn')?.addEventListener('click', async () => {
        const ids = [...state.connectedDevices];
        for (const deviceId of ids) {
            await disconnectFromPanel(deviceId);
        }
    });

    // Broadcast buttons
    elements.startBroadcastButton?.addEventListener('click', startAdvertising);
    elements.stopBroadcastButton?.addEventListener('click', stopAdvertising);

    // Filter controls (via Web Component)
    const filterPanel = document.getElementById('mainFilterPanel');
    if (filterPanel) {
        filterPanel.addEventListener('filter-change', (e) => {
            state.filters = e.detail;
            renderDeviceList();
        });
    }

    // Write Dialog Web Component
    const writeDialog = document.getElementById('mainWriteDialog');
    if (writeDialog) {
        writeDialog.addEventListener('write', async (e) => {
            if (!state.currentDevice) return;
            const { serviceUuid, charUuid, data, format } = e.detail;
            const deviceId = state.currentDevice.id;

            try {
                const result = await invoke('write_characteristic', {
                    deviceId, serviceUuid, charUuid, data, format
                });
                if (result.success) {
                    addLog('success', `Write successful`);
                    writeDialog.close();
                } else {
                    addLog('error', `Write failed: ${result.error}`);
                }
        
            } catch (error) {
                addLog('error', `Write error: ${error}`);
            }
        });
    }

    // Service Panel Web Component events
    const servicePanel = document.getElementById('mainServicePanel');
    if (servicePanel) {
        servicePanel.addEventListener('char-action', async (e) => {
            const { serviceUuid, charUuid, action, btn } = e.detail;
            switch (action) {
                case 'read':
                    await readCharacteristic(serviceUuid, charUuid);
                    break;
                case 'write':
                    showWriteDialog(serviceUuid, charUuid);
                    break;
                case 'notify':
                    await toggleNotify(serviceUuid, charUuid, btn);
                    break;
            }
        });
    }

    // Device info dialog
    elements.deviceInfoDialog?.querySelectorAll('.dialog-close').forEach(btn => {
        btn.addEventListener('click', closeDeviceInfoDialog);
    });
    elements.deviceInfoDialog?.addEventListener('click', (e) => {
        if (e.target === elements.deviceInfoDialog) closeDeviceInfoDialog();
    });
}

// Setup Tauri Event Listeners
async function setupTauriListeners() {
    await listen('device-discovered', (event) => {
        event.payload.forEach(device => {
            state.devices.set(device.id, device);
        });
        renderDeviceList();
    });

    // Listen for notification data
    await listen('notification-received', (event) => {
        const { deviceId, serviceUuid, charUuid, value } = event.payload;
        addLog('info', `[${deviceId}] Received from ${charUuid.slice(0, 8)}...: ${value}`);
        updateCharacteristicValue(deviceId, serviceUuid, charUuid, value);
    });

    // T06: Listen for unexpected disconnections and trigger auto-reconnect
    await listen('device-disconnected', (event) => {
        const { deviceId } = event.payload;
        state.connectedDevices.delete(deviceId);
        if (state.currentDevice && state.currentDevice.id === deviceId) {
            updateConnectionUI(false);
        }
        renderConnectedDevicesPanel(); // T13: 更新已连接面板
        addLog('info', `Device disconnected: ${deviceId}`);

        // Start reconnection if not user initiated
        if (!state.reconnect.userDisconnected.has(deviceId)) {
            attemptReconnect(deviceId);
        }
    });
}

// T06: Auto-Reconnect (aligned with Flutter: max 3 attempts, 2s/4s/6s backoff)
// MAX_RECONNECT_ATTEMPTS is defined in BleUtils.js (shared with Electron)
const MAX_RECONNECT_ATTEMPTS = (window.BleUtils && window.BleUtils.MAX_RECONNECT_ATTEMPTS) || 3;

function attemptReconnect(deviceId) {
    const rc = state.reconnect;
    if (!rc.enabled || rc.userDisconnected.has(deviceId)) return;

    const attempts = rc.attempts.get(deviceId) || 0;
    if (attempts >= MAX_RECONNECT_ATTEMPTS) {
        addLog('error', `Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached for ${deviceId}, giving up`);
        rc.attempts.delete(deviceId);
        return;
    }

    const nextAttempt = attempts + 1;
    rc.attempts.set(deviceId, nextAttempt);
    const delayMs = nextAttempt * 2000; // 2s, 4s, 6s
    addLog('info', `Will reconnect to ${deviceId} in ${delayMs / 1000}s (attempt ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS})`);

    // Cancel any pending timer
    if (rc.timers.has(deviceId)) {
        clearTimeout(rc.timers.get(deviceId));
    }

    rc.timers.set(deviceId, setTimeout(async () => {
        rc.timers.delete(deviceId);
        addLog('info', `Reconnecting to ${deviceId} (attempt ${nextAttempt})...`);
        try {
            const result = await invoke('connect', { deviceId });
            if (result.success) {
                rc.attempts.set(deviceId, 0);
                state.connectedDevices.add(deviceId);
                if (state.currentDevice && state.currentDevice.id === deviceId) {
                    updateConnectionUI(true);
                }
                renderConnectedDevicesPanel(); // T13: 更新已连接面板
                addLog('success', `Reconnected successfully`);
                await discoverServices(deviceId);
            } else {
                addLog('error', `Reconnect failed: ${result.error}`);
                attemptReconnect(deviceId);
            }
        } catch (e) {
            addLog('error', `Reconnect error: ${e}`);
            attemptReconnect(deviceId);
        }
    }, delayMs));
}

// Initialize Bluetooth
async function initBluetooth() {
    // Show initializing status
    updateStatus('Initializing...', 'initializing');

    try {
        const result = await invoke('init_ble');
        updateStatus(result.success ? 'Ready' : 'Not Ready', result.success ? 'ready' : 'error');
        state.bluetoothReady = result.success;
        if (!result.success) {
            addLog('error', `Bluetooth init failed: ${result.error}`);
        }
    } catch (error) {
        updateStatus('Error', 'error');
        addLog('error', `Bluetooth init error: ${error}`);
    }
}

// Update Status
function updateStatus(text, status) {
    const dot = elements.bluetoothStatus?.querySelector('.status-dot');
    const statusText = elements.bluetoothStatus?.querySelector('.status-text');
    const statusIndicator = elements.bluetoothStatus;

    if (statusText) statusText.textContent = text;
    if (statusIndicator) {
        statusIndicator.classList.remove('connecting');
    }
    if (dot) {
        dot.classList.remove('active', 'error');
        if (status === 'ready') {
            dot.classList.add('active');
        } else if (status === 'error') {
            dot.classList.add('error');
        } else if (status === 'initializing') {
            if (statusIndicator) {
                statusIndicator.classList.add('connecting');
            }
        }
    }
}

// Tab Navigation
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    if (tab === 'scan') {
        elements.deviceListView.classList.add('active');
    } else if (tab === 'connected') {
        // T13: 已连接设备 Tab
        elements.connectedView?.classList.add('active');
        renderConnectedDevicesPanel();
    } else if (tab === 'broadcast') {
        elements.broadcastView.classList.add('active');
        checkBroadcastSupport();
    } else if (tab === 'about') {
        document.getElementById('aboutView').classList.add('active');
    }
}

// T14: OS Support Verification for Peripheral Broadcaster
function checkBroadcastSupport() {
    // navigator.platform is deprecated but userAgent serves equally well
    const uc = navigator.userAgent.toLowerCase();
    const isMac = uc.includes('mac') || uc.includes('darwin');
    
    const startBtn = document.getElementById('startBroadcastButton');
    const statusEl = document.getElementById('broadcastStatus');
    
    // Disable on Windows and Linux fallback
    if (!isMac) {
        let osName = uc.includes('win') ? 'Windows' : 'Linux';
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.style.opacity = '0.5';
            startBtn.style.cursor = 'not-allowed';
        }
        if (statusEl) {
            statusEl.innerHTML = `
                <span class="status-dot error"></span>
                <span class="status-text" style="color:var(--error)">当前操作系统（${osName}）底层严格限制 BLE 外设广播。<br/>请使用手机客户端执行虚拟外设测试。</span>
            `;
        }
    }
}

// T13: 渲染已连接设备面板
function renderConnectedDevicesPanel() {
    const list = document.getElementById('connectedDeviceList');
    const badge = document.getElementById('connectedBadge');
    const disconnectAllBtn = document.getElementById('disconnectAllBtn');
    if (!list) return;

    const count = state.connectedDevices.size;
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
    if (disconnectAllBtn) {
        disconnectAllBtn.style.display = count > 1 ? 'inline-block' : 'none';
    }

    if (count === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <img src="placeholders/empty_connected.svg" class="empty-icon-img" alt="connected" style="width: 80px; height: 80px; opacity: 0.7; margin-bottom: 12px;">
                <div class="empty-text">暂无已连接设备</div>
                <div class="empty-hint">在扫描页面点击设备进行连接</div>
            </div>`;
        return;
    }

    list.innerHTML = '';
    [...state.connectedDevices].forEach(deviceId => {
        const device = state.devices.get(deviceId) || { id: deviceId, name: deviceId.slice(0, 16) };
        const card = document.createElement('device-card');
        card.setAttribute('is-connection-tab', 'true');
        card.device = device;
        card.addEventListener('show-detail', (e) => navigateToDevice(e.detail.id));
        card.addEventListener('disconnect', (e) => disconnectFromPanel(e.detail.id));
        list.appendChild(card);
    });
}

async function disconnectFromPanel(deviceId) {
    state.reconnect.userDisconnected.add(deviceId);
    state.reconnect.attempts.delete(deviceId);
    if (state.reconnect.timers.has(deviceId)) {
        clearTimeout(state.reconnect.timers.get(deviceId));
        state.reconnect.timers.delete(deviceId);
    }
    try {
        await invoke('disconnect', { deviceId });
        state.connectedDevices.delete(deviceId);
        renderConnectedDevicesPanel();
        addLog('info', `Disconnected ${deviceId}`);
    } catch (e) { addLog('error', `Disconnect error: ${e}`); }
}

function navigateToDevice(deviceId) {
    const device = state.devices.get(deviceId);
    if (device) { state.currentDevice = device; showDeviceDetail(device); }
}


// Toggle Scan
async function toggleScan() {
    if (state.scanning) {
        await stopScan();
    } else {
        await startScan();
        
        // CI MOCK INJECTION
        if (state.useMockBLE) {
            console.log('[MOCK] Injecting dummy device Dummy-BLE-01 and Dummy-BLE-02');
            state.devices.set('MOCK-11:22:33:44:55:66', {
                id: 'MOCK-11:22:33:44:55:66',
                name: 'Dummy-BLE-01',
                rssi: -45,
                serviceUuids: ['180D', '180A', '4FAFC201-1FB5-459E-8FCC-C5C9C331914D'],
                advData: 'Mock Hex Data'
            });
            state.devices.set('MOCK-AA:BB:CC:DD:EE:FF', {
                id: 'MOCK-AA:BB:CC:DD:EE:FF',
                name: 'Dummy-BLE-02',
                rssi: -60,
                serviceUuids: ['FFF0'],
                advData: 'Mock Hex Data 02'
            });
            renderDeviceList();
        }
    }
}

async function startScan() {
    if (!state.bluetoothReady) {
        addLog('error', 'Bluetooth not ready');
        return;
    }

    try {
        state.devices.clear();
        renderDeviceList();

        const result = await invoke('start_scan');
        if (result.success) {
            state.scanning = true;
            updateScanButton(true);
            addLog('info', 'Scanning started');

            // Auto-stop after 5 seconds
            if (state.scanTimer) clearTimeout(state.scanTimer);
            state.scanTimer = setTimeout(() => {
                if (state.scanning) {
                    stopScan();
                    addLog('info', 'Scan completed (auto-stopped after 5s)');
                }
            }, 5000);
        } else {
            addLog('error', `Scan failed: ${result.error}`);
        }
    } catch (error) {
        addLog('error', `Scan error: ${error}`);
    }
}

async function stopScan() {
    try {
        await invoke('stop_scan');
        state.scanning = false;
        updateScanButton(false);
        addLog('info', 'Scanning stopped');
    } catch (error) {
        addLog('error', `Stop scan error: ${error}`);
    }
}

function updateScanButton(scanning) {
    if (!elements.scanButton) return;
    const icon = elements.scanButton.querySelector('.icon');
    const text = elements.scanButton.querySelector('.text');
    if (scanning) {
        if (icon) icon.textContent = '';
        if (text) text.textContent = 'Stop Scan';
        elements.scanButton.classList.add('btn-danger', 'scanning');
        elements.scanButton.classList.remove('btn-primary');
    } else {
        if (icon) icon.textContent = ' Search';
        if (text) text.textContent = 'Start Scan';
        elements.scanButton.classList.remove('btn-danger', 'scanning');
        elements.scanButton.classList.add('btn-primary');
    }
}

// Render Device List - Smart update to prevent flickering
function renderDeviceList() {
    if (!elements.deviceList) return;

    // Apply filters and get device list
    const filteredDevices = applyFilters();

    // Update device count
    if (elements.deviceCount) {
        elements.deviceCount.textContent = `Found ${filteredDevices.length} device${filteredDevices.length !== 1 ? 's' : ''}`;
    }

    // Handle empty state
    if (filteredDevices.length === 0) {
        if (!elements.deviceList.querySelector('.empty-state')) {
            const hasDevices = state.devices.size > 0;
            elements.deviceList.innerHTML = `
                <div class="empty-state">
                    <img src="placeholders/empty_scan.svg" class="empty-icon-img" alt="scan" style="width: 80px; height: 80px; opacity: 0.7; margin-bottom: 12px;">
                    <div class="empty-text">${hasDevices ? '没有符合过滤条件的设备' : '暂无发现设备'}</div>
                    <div class="empty-hint">${state.scanning ? '正在扫描发现周边设备...' : '尝试调整过滤条件或开始扫描'}</div>
                </div>
            `;
        }
        return;
    }

    // Clear empty state if it exists
    const emptyState = elements.deviceList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // Track current device IDs
    const currentIds = new Set();
    elements.deviceList.querySelectorAll('device-card').forEach(item => {
        currentIds.add(item.dataset.id);
    });

    // Get new device IDs
    const newIds = new Set(filteredDevices.map(d => d.id));

    // Remove devices that are no longer in the filtered list
    currentIds.forEach(id => {
        if (!newIds.has(id)) {
            const item = elements.deviceList.querySelector(`device-card[data-id="${id}"]`);
            if (item) item.remove();
        }
    });

    // Update or add devices
    filteredDevices.forEach(device => {
        let card = elements.deviceList.querySelector(`device-card[data-id="${device.id}"]`);

        if (!card) {
            // Create new device card using Web Component
            card = document.createElement('device-card');
            card.dataset.id = device.id;
            card.device = device;
            
            card.addEventListener('connect', (e) => connectDevice(e.detail.id));
            card.addEventListener('show-detail', (e) => showDeviceInfoDialog(e.detail.id));
            
            elements.deviceList.appendChild(card);
        } else {
            // Update existing device card properties
            card.device = device;
        }
    });
}

// Apply filters to device list
function applyFilters() {
    let devices = Array.from(state.devices.values());

    // Filter by RSSI
    if (state.filters.rssi > -100) {
        devices = devices.filter(d => (d.rssi || -100) >= state.filters.rssi);
    }

    // Filter by name prefix
    if (state.filters.namePrefix) {
        const prefix = state.filters.namePrefix.toLowerCase();
        devices = devices.filter(d => {
            const name = (d.name || '').toLowerCase();
            return name.startsWith(prefix);
        });
    }

    // Hide unnamed devices
    if (state.filters.hideUnnamed) {
        devices = devices.filter(d => d.name && d.name.length > 0);
    }

    // Sort by RSSI (strongest first)
    devices.sort((a, b) => (b.rssi || 0) - (a.rssi || 0));

    // Limit to max devices
    if (devices.length > state.maxDevices) {
        devices = devices.slice(0, state.maxDevices);
    }

    return devices;
}

// Show Device Info Dialog
function showDeviceInfoDialog(deviceId) {
    const device = state.devices.get(deviceId);
    if (!device || !elements.deviceInfoDialog) return;

    if (elements.infoDeviceName) elements.infoDeviceName.textContent = device.name || 'Unknown';
    if (elements.infoDeviceId) elements.infoDeviceId.textContent = device.id || '-';
    if (elements.infoRssi) elements.infoRssi.textContent = `${device.rssi || 0} dBm`;
    if (elements.infoServiceUuids) elements.infoServiceUuids.textContent = device.serviceUuids?.join(', ') || '-';
    if (elements.infoAdvData) elements.infoAdvData.textContent = device.advData || 'N/A';

    elements.deviceInfoDialog.style.display = 'flex';
}

// Close Device Info Dialog
function closeDeviceInfoDialog() {
    if (elements.deviceInfoDialog) {
        elements.deviceInfoDialog.style.display = 'none';
    }
}

// Select Device
async function selectDevice(deviceId) {
    const device = state.devices.get(deviceId);
    if (!device) return;

    state.currentDevice = device;
    // Stop scanning if active
    if (state.scanning) {
        await stopScan();
    }
    // Show detail view without connecting
    showDeviceDetail();
    addLog('info', `Viewing device: ${device.name || 'Unknown'}`);
}

// Connect Device
async function connectDevice(deviceId) {
    if (state.scanning) await stopScan();

    try {
        const device = state.devices.get(deviceId);
        state.currentDevice = device;
        showDeviceDetail();
        updateConnectionStatus(false, true);
        updateDeviceButtons();

        const result = await invoke('connect', { deviceId });
        if (result.success) {
            state.connectedDevices.add(deviceId);
            updateConnectionUI(true);
            renderConnectedDevicesPanel(); // T13: 更新已连接面板
            
            // Fetch services after successful connection
            await discoverServices(deviceId);
            addLog('success', `Connected to ${state.currentDevice?.name || 'device'}`);
        } else {
            state.connectedDevices.delete(deviceId);
            updateConnectionStatus(false);
            updateDeviceButtons();
            addLog('error', `Connect failed: ${result.error}`);
        }
    } catch (error) {
        state.connectedDevices.delete(deviceId);
        updateConnectionStatus(false);
        updateDeviceButtons();
        addLog('error', `Connect error: ${error}`);
    }
}

// Disconnect Device
async function disconnectDevice() {
    if (!state.currentDevice) return;
    const deviceId = state.currentDevice.id;
    // T06: mark user-initiated, skip reconnect
    state.reconnect.userDisconnected.add(deviceId);
    state.reconnect.attempts.delete(deviceId);
    if (state.reconnect.timers.has(deviceId)) {
        clearTimeout(state.reconnect.timers.get(deviceId));
        state.reconnect.timers.delete(deviceId);
    }
    try {
        const result = await invoke('disconnect', { deviceId });
        if (result.success) {
            state.connectedDevices.delete(deviceId);
            updateConnectionUI(false);
            renderConnectedDevicesPanel(); // T13: 更新已连接面板
            renderServices([]);
            addLog('success', 'Disconnected successfully');
        }
    } catch (error) {
        addLog('error', `Disconnect error: ${error}`);
    }
}

// Update device connect/disconnect button visibility
function updateDeviceButtons() {
    const isConn = state.currentDevice ? state.connectedDevices.has(state.currentDevice.id) : false;

    if (elements.connectButton) {
        elements.connectButton.style.display = isConn ? 'none' : 'block';
    }
    if (elements.disconnectButton) {
        elements.disconnectButton.style.display = isConn ? 'block' : 'none';
    }
    if (!isConn) {
        const servicePanel = document.getElementById('mainServicePanel');
        if (servicePanel) servicePanel.services = [];
    }
}

// Show Device Detail
function showDeviceDetail() {
    if (!elements.deviceDetailView || !elements.deviceListView) return;

    elements.deviceListView.classList.remove('active');
    elements.deviceDetailView.classList.add('active');

    if (elements.deviceName) {
        elements.deviceName.textContent = state.currentDevice?.name || 'Unknown Device';
    }
    if (elements.deviceId) {
        elements.deviceId.textContent = state.currentDevice?.id || '';
    }
    
    const isConn = state.currentDevice ? state.connectedDevices.has(state.currentDevice.id) : false;
    updateConnectionStatus(isConn);
    updateDeviceButtons();
    
    renderServices();
}

function updateConnectionStatus(connected, connecting = false) {
    if (!elements.connectionStatus) return;

    if (connecting) {
        elements.connectionStatus.textContent = 'Connecting...';
        elements.connectionStatus.classList.remove('connected');
        elements.connectionStatus.classList.add('connecting');
    } else if (connected) {
        elements.connectionStatus.textContent = 'Connected';
        elements.connectionStatus.classList.remove('connecting');
        elements.connectionStatus.classList.add('connected');
    } else {
        elements.connectionStatus.textContent = 'Disconnected';
        elements.connectionStatus.classList.remove('connected', 'connecting');
    }
}

// Convenience alias used throughout: sync both connection display + button states
function updateConnectionUI(connected) {
    updateConnectionStatus(connected);
    updateDeviceButtons();
}

// Discover Services
async function discoverServices(deviceId) {
    try {
        const result = await invoke('discover_services', { deviceId });
        if (result.success && result.data) {
            state.servicesByDevice.set(deviceId, result.data);
            if (state.currentDevice && state.currentDevice.id === deviceId) {
                renderServices();
                addLog('success', `Found ${result.data.length} service(s) for ${deviceId}`);
            }
        } else {
            addLog('error', `Service discovery failed: ${result.error}`);
            if (state.currentDevice && state.currentDevice.id === deviceId) renderServices();
        }
    } catch (error) {
        addLog('error', `Service discovery error: ${error}`);
        if (state.currentDevice && state.currentDevice.id === deviceId) renderServices();
    }
}

// Render Services
function renderServices() {
    const servicePanel = document.getElementById('mainServicePanel');
    if (!servicePanel) return;
    
    if (!state.currentDevice) {
        servicePanel.services = [];
        return;
    }
    const deviceId = state.currentDevice.id;
    const currentServices = state.servicesByDevice.get(deviceId) || [];

    servicePanel.services = currentServices;
    
    // Check for OTA service
    const otaUuid = '4FAFC201-1FB5-459E-8FCC-C5C9C331914D'.toLowerCase();
    const hasOta = currentServices.some(s => s.uuid.toLowerCase() === otaUuid);
    
    // Add OTA button to header dynamically if it doesn't exist
    let otaBtn = document.getElementById('otaActionBtn');
    if (hasOta) {
        if (!otaBtn) {
            otaBtn = document.createElement('button');
            otaBtn.id = 'otaActionBtn';
            otaBtn.className = 'icon-btn';
            otaBtn.innerHTML = '⬆️ OTA升级';
            otaBtn.style.marginRight = '10px';
            otaBtn.onclick = () => document.getElementById('otaDialog').show(deviceId);
            
            elements.disconnectButton.parentNode.insertBefore(otaBtn, elements.disconnectButton);
        }
        otaBtn.style.display = 'inline-block';
    } else if (otaBtn) {
        otaBtn.style.display = 'none';
    }
}

// Read Characteristic
async function readCharacteristic(serviceUuid, charUuid) {
    if (!state.currentDevice) return;
    const deviceId = state.currentDevice.id;
    try {
        addLog('info', `Reading characteristic ${charUuid}`);
        const result = await invoke('read_characteristic', { deviceId, serviceUuid, charUuid });
        if (result.success) {
            addLog('success', `Read: ${result.value || '(empty)'}`);
            updateCharacteristicValue(deviceId, serviceUuid, charUuid, result.value);
        } else {
            addLog('error', `Read failed: ${result.error}`);
        }
    } catch (error) {
        addLog('error', `Read error: ${error}`);
    }
}

// Show Write Dialog
function showWriteDialog(serviceUuid, charUuid) {
    const dialog = document.getElementById('mainWriteDialog');
    if (dialog) dialog.show(serviceUuid, charUuid);
}
// writeData is now handled by the 'write' event listener in setupEventListeners

// Toggle Notify
async function toggleNotify(serviceUuid, charUuid, btn) {
    if (!state.currentDevice) return;
    const deviceId = state.currentDevice.id;
    const isNotifying = btn.classList.contains('active');
    const newState = !isNotifying;

    try {
        const result = await invoke('notify_characteristic', {
            deviceId,
            serviceUuid,
            charUuid,
            notify: newState
        });

        if (result.success) {
            btn.classList.toggle('active', newState);
            btn.textContent = newState ? 'Stop Notify' : 'Notify';
            addLog('success', `Notifications ${newState ? 'enabled' : 'disabled'}`);
        } else {
            addLog('error', `Notify failed: ${result.error}`);
        }
    } catch (error) {
        addLog('error', `Notify error: ${error}`);
    }
}

// Update Characteristic Value
function updateCharacteristicValue(deviceId, serviceUuid, charUuid, value) {
    if (!state.currentDevice || state.currentDevice.id !== deviceId) return;
    const panel = document.getElementById('mainServicePanel');
    if (panel) {
        panel.updateCharacteristicValue(serviceUuid, charUuid, value);
    }
}

// Update broadcast UI based on platform - matches Flutter pattern
function updateBroadcastPlatformInfo() {
    const broadcastInfo = document.querySelector('.broadcast-info ul');
    if (!broadcastInfo) return;

    // Platform-specific messages based on Flutter implementation
    let infoItems = [];

    if (PLATFORM.isMacOS) {
        infoItems = [
            '<li><strong>macOS 平台：</strong>支持自定义广播名称</li>',
            '<li>其他设备可以扫描发现此广播</li>',
            '<li class="warning-item">⚠️ 此 Tauri 版本外设模式功能受限</li>',
            '<li class="info-item">💡 建议使用 <code>apps/desktop/macos/SmartBLE-mac</code> 原生应用</li>',
            '<li>btleplug 库对 macOS 外设模式支持有限</li>'
        ];
    } else if (PLATFORM.isWindows) {
        infoItems = [
            '<li><strong>Windows 平台暂不支持外设模式</strong></li>',
            '<li class="error-item">❌ btleplug 库在 Windows 上不支持广播功能</li>',
            '<li class="info-item">💡 请使用 Android/iOS/macOS 原生应用进行广播</li>',
            '<li>扫描功能正常可用</li>'
        ];
    } else if (PLATFORM.isLinux) {
        infoItems = [
            '<li><strong>Linux 平台暂不支持外设模式</strong></li>',
            '<li class="error-item">❌ 需要 BlueZ 外设模式支持（当前未实现）</li>',
            '<li class="info-item">💡 请使用 Android/iOS/macOS 原生应用进行广播</li>',
            '<li>扫描功能正常可用</li>'
        ];
    } else {
        infoItems = [
            '<li><strong>当前平台不支持外设模式</strong></li>',
            '<li>请使用对应平台的原生应用</li>',
            '<li>扫描功能正常可用</li>'
        ];
    }

    broadcastInfo.innerHTML = infoItems.join('');
}

// T08+T09: Advertising - aligned with UniApp broadcast options
// Platform-specific messaging matches Flutter pattern
async function startAdvertising() {
    const name = elements.broadcastName?.value || 'SmartBLE';
    const serviceUuid = elements.broadcastServiceUuid?.value || 'FFF0';
    const manufacturerId = elements.broadcastManufacturerId?.value || '0A00';
    const manufacturerData = elements.broadcastManufacturerData?.value || 'SmartBLE_Broadcast';
    const includeName = elements.broadcastIncludeName?.checked !== false;

    // T08: 统一广播数据超限校验（BLE ADV payload 上限 31 字节）
    const totalBytes = calcAdvertiseBytesJs(serviceUuid, manufacturerData);
    if (totalBytes > 31) {
        addLog('error', `广播数据超限：当前 ${totalBytes} 字节，BLE 最多支持 31 字节`);
        return;
    }

    // Show platform-specific warning before attempting
    if (PLATFORM.isWindows) {
        addLog('warning', 'Windows 平台暂不支持外设模式');
        addLog('info', '💡 请使用 Android/iOS/macOS 原生应用进行广播');
    } else if (PLATFORM.isLinux) {
        addLog('warning', 'Linux 平台暂不支持外设模式');
        addLog('info', '💡 请使用 Android/iOS/macOS 原生应用进行广播');
    } else if (PLATFORM.isMacOS) {
        addLog('warning', 'macOS 外设模式需要原生应用支持');
        addLog('info', '💡 建议使用 apps/desktop/macos/SmartBLE-mac 原生应用');
    }

    try {
        const result = await invoke('start_advertising', {
            name,
            serviceUuids: [serviceUuid],
            manufacturerId,
            manufacturerData,
            includeName
        });
        if (result.success) {
            state.advertising = true;
            updateAdvertisingUI(true);
            // Platform-specific success message (like Flutter)
            if (PLATFORM.isMacOS) {
                addLog('success', `开始广播: ${name}`);
            } else {
                addLog('success', `Advertising started as "${name}"`);
            }
        } else {
            // Platform-specific error messages
            if (PLATFORM.isMacOS) {
                addLog('error', `macOS 外设模式需要原生应用支持: ${result.error}`);
            } else if (PLATFORM.isWindows) {
                addLog('error', `Windows 不支持外设模式: ${result.error}`);
            } else if (PLATFORM.isLinux) {
                addLog('error', `Linux 不支持外设模式: ${result.error}`);
            } else {
                addLog('error', `Advertising failed: ${result.error}`);
            }
            addLog('info', PERIPHERAL_SUPPORT.recommendation);
        }
    } catch (error) {
        addLog('error', `Advertising error: ${error}`);
        addLog('info', PERIPHERAL_SUPPORT.recommendation);
    }
}

async function stopAdvertising() {
    try {
        const result = await invoke('stop_advertising');
        if (result.success) {
            state.advertising = false;
            updateAdvertisingUI(false);
            addLog('info', 'Advertising stopped');
        }
    } catch (error) {
        addLog('error', `Stop advertising error: ${error}`);
    }
}

// T08: 计算广播包字节数（BLE ADV payload 上限 31 字节）
function calcAdvertiseBytesJs(serviceUuid, manufacturerData) {
    let total = 0;
    if (serviceUuid) {
        const isShort = serviceUuid.replace(/-/g, '').length <= 8;
        total += 2 + (isShort ? 2 : 16);
    }
    if (manufacturerData) {
        const dataBytes = new TextEncoder().encode(manufacturerData).length;
        total += 2 + 2 + dataBytes; // AD头(2) + 厂商ID(2) + 数据
    }
    return total;
}

function updateAdvertisingUI(advertising) {
    const statusDot = elements.broadcastStatus?.querySelector('.status-dot');
    const statusText = elements.broadcastStatus?.querySelector('.status-text');

    if (advertising) {
        if (statusDot) statusDot.classList.add('active');
        if (statusText) statusText.textContent = 'Broadcasting';
        if (elements.startBroadcastButton) elements.startBroadcastButton.style.display = 'none';
        if (elements.stopBroadcastButton) elements.stopBroadcastButton.style.display = 'inline-flex';
        elements.broadcastName?.setAttribute('disabled', 'true');
        elements.broadcastServiceUuid?.setAttribute('disabled', 'true');
    } else {
        if (statusDot) statusDot.classList.remove('active');
        if (statusText) statusText.textContent = 'Not broadcasting';
        if (elements.startBroadcastButton) elements.startBroadcastButton.style.display = 'inline-flex';
        if (elements.stopBroadcastButton) elements.stopBroadcastButton.style.display = 'none';
        elements.broadcastName?.removeAttribute('disabled');
        elements.broadcastServiceUuid?.removeAttribute('disabled');
    }
}

// Log Functions
function addLog(type, message) {
    const panel = document.getElementById('mainLogPanel');
    if (panel) panel.addLog(type, message);
}

function clearLogs() {
    const panel = document.getElementById('mainLogPanel');
    if (panel) panel.clearLogs();
}

function exportLogs() {
    const panel = document.getElementById('mainLogPanel');
    if (panel) panel.exportLogs();
}

// Navigation - go back to device list
// Aligned with UniApp: Connection persists when navigating back
async function goBack() {
    // UniApp pattern: Keep connection alive when going back to list
    // User can manually disconnect from detail view if needed

    // Clear current device reference but keep connection state
    state.currentDevice = null;

    // Navigate back to device list
    if (elements.deviceDetailView && elements.deviceListView) {
        elements.deviceDetailView.classList.remove('active');
        elements.deviceListView.classList.add('active');
    }

    // Restart scan to refresh device list (scan works while connected on most platforms)
    if (!state.scanning) {
        try {
            await startScan();
        } catch (e) {
            // Scan might fail if already connected on some platforms
            addLog('info', 'Note: Scan while connected may not work on all platforms');
        }
    }

    addLog('info', state.connectedDevices.size > 0 ? 'Returned to list (connection active)' : 'Returned to list');
}

// Utility — delegates to BleUtils when available, falls back to inline
function escapeHtml(text) {
    if (window.BleUtils) return window.BleUtils.escapeHtml(text);
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ── Entry Point ───────────────────────────────────────────────
// Initialize i18n first, then kick off the main Tauri BLE app.
// Mirrors the Electron pattern in public/app.js (DOMContentLoaded).
document.addEventListener('DOMContentLoaded', async () => {
    if (window.i18n) {
        await window.i18n.init();
    }
    await init();
});
