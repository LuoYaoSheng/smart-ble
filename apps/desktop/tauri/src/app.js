// SmartBLE Desktop - Tauri Frontend

let invoke, listen;

// App State
const state = {
    bluetoothReady: false,
    scanning: false,
    devices: new Map(),
    currentDevice: null,
    connected: false,
    services: [],
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
    maxDevices: 100
};

// DOM Elements
const elements = {
    bluetoothStatus: document.getElementById('bluetoothStatus'),
    scanButton: document.getElementById('scanButton'),
    deviceCount: document.getElementById('deviceCount'),
    deviceList: document.getElementById('deviceList'),
    deviceListView: document.getElementById('deviceListView'),
    deviceDetailView: document.getElementById('deviceDetailView'),
    broadcastView: document.getElementById('broadcastView'),
    deviceName: document.getElementById('deviceName'),
    deviceId: document.getElementById('deviceId'),
    connectionStatus: document.getElementById('connectionStatus'),
    servicesList: document.getElementById('servicesList'),
    logPanel: document.getElementById('logPanel'),
    logList: document.getElementById('logList'),
    logCount: document.getElementById('logCount'),
    writeDialog: document.getElementById('writeDialog'),
    writeDataInput: document.getElementById('writeDataInput'),
    writeCharLabel: document.getElementById('writeCharLabel'),
    broadcastName: document.getElementById('broadcastName'),
    broadcastServiceUuid: document.getElementById('broadcastServiceUuid'),
    broadcastStatus: document.getElementById('broadcastStatus'),
    startBroadcastButton: document.getElementById('startBroadcastButton'),
    stopBroadcastButton: document.getElementById('stopBroadcastButton'),
    connectButton: document.getElementById('connectButton'),
    disconnectButton: document.getElementById('disconnectButton'),
    // Filter elements
    rssiFilter: document.getElementById('rssiFilter'),
    rssiValue: document.getElementById('rssiValue'),
    namePrefixFilter: document.getElementById('namePrefixFilter'),
    hideUnnamedFilter: document.getElementById('hideUnnamedFilter'),
    resetFilterButton: document.getElementById('resetFilterButton'),
    // Device info dialog
    deviceInfoDialog: document.getElementById('deviceInfoDialog'),
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
    document.getElementById('clearLogsButton')?.addEventListener('click', clearLogs);

    // Broadcast buttons
    elements.startBroadcastButton?.addEventListener('click', startAdvertising);
    elements.stopBroadcastButton?.addEventListener('click', stopAdvertising);

    // Filter controls
    elements.rssiFilter?.addEventListener('input', (e) => {
        state.filters.rssi = parseInt(e.target.value);
        elements.rssiValue.textContent = e.target.value;
        renderDeviceList();
    });
    elements.namePrefixFilter?.addEventListener('input', (e) => {
        state.filters.namePrefix = e.target.value;
        renderDeviceList();
    });
    elements.hideUnnamedFilter?.addEventListener('change', (e) => {
        state.filters.hideUnnamed = e.target.checked;
        renderDeviceList();
    });
    elements.resetFilterButton?.addEventListener('click', resetFilters);
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = parseInt(btn.dataset.value);
            elements.rssiFilter.value = value;
            state.filters.rssi = value;
            elements.rssiValue.textContent = value;
            renderDeviceList();
        });
    });

    // Device info dialog
    elements.deviceInfoDialog?.querySelectorAll('.dialog-close').forEach(btn => {
        btn.addEventListener('click', closeDeviceInfoDialog);
    });
    elements.deviceInfoDialog?.addEventListener('click', (e) => {
        if (e.target === elements.deviceInfoDialog) closeDeviceInfoDialog();
    });

    // Write dialog
    document.querySelector('.dialog-close')?.addEventListener('click', closeWriteDialog);
    document.querySelector('.dialog-cancel')?.addEventListener('click', closeWriteDialog);
    document.querySelector('.dialog-confirm')?.addEventListener('click', writeData);
    elements.writeDialog?.addEventListener('click', (e) => {
        if (e.target === elements.writeDialog) closeWriteDialog();
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
        const { serviceUuid, charUuid, value } = event.payload;
        addLog('info', `Received from ${charUuid.slice(0, 8)}...: ${value}`);
        updateCharacteristicValue(serviceUuid, charUuid, value);
    });
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
    } else if (tab === 'broadcast') {
        elements.broadcastView.classList.add('active');
    } else if (tab === 'about') {
        document.getElementById('aboutView').classList.add('active');
    }
}

// Toggle Scan
async function toggleScan() {
    if (state.scanning) {
        await stopScan();
    } else {
        await startScan();
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

// Render Device List
function renderDeviceList() {
    if (!elements.deviceList) return;

    // Apply filters and get device list
    const filteredDevices = applyFilters();

    if (filteredDevices.length === 0) {
        const hasDevices = state.devices.size > 0;
        elements.deviceList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"> Scanner</div>
                <div class="empty-text">${hasDevices ? 'No devices match filters' : 'No devices found'}</div>
                <div class="empty-hint">${state.scanning ? 'Scanning...' : 'Click scan to start'}</div>
            </div>
        `;
    } else {
        elements.deviceList.innerHTML = filteredDevices.map(device => `
            <div class="device-item" data-id="${device.id}">
                <div class="device-item-header">
                    <span class="device-item-name">${escapeHtml(device.name || 'Unknown')}</span>
                    <span class="device-item-rssi">${device.rssi || 0} dBm</span>
                </div>
                <div class="device-item-id">${escapeHtml(device.id)}</div>
                <button class="btn btn-mini btn-connect" data-action="connect" data-id="${device.id}"> Connect</button>
            </div>
        `).join('');

        // Add click handlers
        elements.deviceList.querySelectorAll('.device-item').forEach(item => {
            // Card click shows device info
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-connect')) {
                    showDeviceInfoDialog(item.dataset.id);
                }
            });

            // Connect button handler
            const connectBtn = item.querySelector('.btn-connect');
            if (connectBtn) {
                connectBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    connectDevice(item.dataset.id);
                });
            }
        });
    }

    if (elements.deviceCount) {
        elements.deviceCount.textContent = `Found ${filteredDevices.length} device${filteredDevices.length !== 1 ? 's' : ''}`;
    }
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

// Reset filters
function resetFilters() {
    state.filters.rssi = -100;
    state.filters.namePrefix = '';
    state.filters.hideUnnamed = false;

    if (elements.rssiFilter) elements.rssiFilter.value = -100;
    if (elements.rssiValue) elements.rssiValue.textContent = '-100';
    if (elements.namePrefixFilter) elements.namePrefixFilter.value = '';
    if (elements.hideUnnamedFilter) elements.hideUnnamedFilter.checked = false;

    renderDeviceList();
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
        // Show connecting status
        const device = state.devices.get(deviceId);
        state.currentDevice = device;
        showDeviceDetail();
        updateConnectionStatus(false, true);

        const result = await invoke('connect', { deviceId });
        if (result.success) {
            state.connected = true;
            updateConnectionStatus(true);
            await discoverServices(deviceId);
            addLog('success', `Connected to ${state.currentDevice?.name || 'device'}`);
        } else {
            updateConnectionStatus(false);
            addLog('error', `Connect failed: ${result.error}`);
        }
    } catch (error) {
        updateConnectionStatus(false);
        addLog('error', `Connect error: ${error}`);
    }
}

// Disconnect Device
async function disconnectDevice() {
    try {
        const result = await invoke('disconnect');
        if (result.success) {
            state.connected = false;
            state.currentDevice = null;
            state.services = [];
            goBack();
            addLog('info', 'Disconnected');
        }
    } catch (error) {
        addLog('error', `Disconnect error: ${error}`);
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
    // Update status based on actual connection state
    updateConnectionStatus(state.connected);

    // Show/hide connect and disconnect buttons
    if (elements.connectButton) {
        elements.connectButton.style.display = state.connected ? 'none' : 'block';
    }
    if (elements.disconnectButton) {
        elements.disconnectButton.style.display = state.connected ? 'block' : 'none';
    }

    if (!state.connected && elements.servicesList) {
        elements.servicesList.innerHTML = '<div class="empty-state"><div class="empty-text">Connect to discover services</div></div>';
    } else if (elements.servicesList) {
        elements.servicesList.innerHTML = '<div class="loading-state"><div class="spinner"></div><div style="margin-top:12px">Discovering services...</div></div>';
    }
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

    // Update button visibility
    if (elements.connectButton) {
        elements.connectButton.style.display = connected ? 'none' : 'block';
    }
    if (elements.disconnectButton) {
        elements.disconnectButton.style.display = connected ? 'block' : 'none';
    }
}

// Discover Services
async function discoverServices(deviceId) {
    try {
        const result = await invoke('discover_services', { deviceId });
        if (result.success && result.data) {
            state.services = result.data;
            renderServices();
            addLog('success', `Found ${state.services.length} service${state.services.length !== 1 ? 's' : ''}`);
        } else {
            addLog('error', `Service discovery failed: ${result.error}`);
            renderServices();
        }
    } catch (error) {
        addLog('error', `Service discovery error: ${error}`);
        renderServices();
    }
}

// Render Services
function renderServices() {
    if (!elements.servicesList) return;

    if (state.services.length === 0) {
        elements.servicesList.innerHTML = '<div class="empty-state"><div class="empty-text">No services found</div></div>';
        return;
    }

    elements.servicesList.innerHTML = state.services.map((service, sIdx) => `
        <div class="service-card" data-service-idx="${sIdx}">
            <div class="service-header">
                <div class="service-info">
                    <h4>${escapeHtml(service.name)}</h4>
                    <div class="service-uuid">${escapeHtml(service.uuid)}</div>
                </div>
                <span class="service-expand">-</span>
            </div>
            <div class="characteristics-list">
                ${service.characteristics && service.characteristics.length > 0
                    ? service.characteristics.map((char, cIdx) => renderCharacteristic(service.uuid, char, cIdx)).join('')
                    : '<div style="padding:12px;color:var(--text-secondary);font-size:12px">No characteristics</div>'
                }
            </div>
        </div>
    `).join('');

    // Service expand toggle
    elements.servicesList.querySelectorAll('.service-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.service-card');
            card.classList.toggle('expanded');
        });
    });
}

function renderCharacteristic(serviceUuid, char, idx) {
    const props = char.properties || [];
    const propBadges = props.map(p => `<span class="prop-badge">${escapeHtml(p)}</span>`).join('');

    return `
        <div class="characteristic-item" data-service-uuid="${serviceUuid}" data-char-uuid="${char.uuid}">
            <div class="characteristic-header">
                <div>
                    <div class="characteristic-name">${escapeHtml(char.name)}</div>
                    <div class="characteristic-uuid">${escapeHtml(char.uuid)}</div>
                </div>
                <div class="char-props">${propBadges}</div>
            </div>
            ${char.value ? `<div class="characteristic-value">${escapeHtml(char.value)}</div>` : ''}
            <div class="characteristic-actions">
                ${props.includes('read') ? `<button class="btn btn-sm btn-secondary" data-action="read">Read</button>` : ''}
                ${props.includes('write') || props.includes('writeWithoutResponse') ? `<button class="btn btn-sm btn-primary" data-action="write">Write</button>` : ''}
                ${props.includes('notify') || props.includes('indicate') ? `<button class="btn btn-sm btn-secondary" data-action="notify">Notify</button>` : ''}
            </div>
        </div>
    `;
}

// Characteristic Actions
elements.servicesList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const charItem = btn.closest('.characteristic-item');
    const serviceUuid = charItem.dataset.serviceUuid;
    const charUuid = charItem.dataset.charUuid;
    const action = btn.dataset.action;

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

// Read Characteristic
async function readCharacteristic(serviceUuid, charUuid) {
    try {
        addLog('info', `Reading characteristic ${charUuid}`);
        const result = await invoke('read_characteristic', { serviceUuid, charUuid });
        if (result.success) {
            addLog('success', `Read: ${result.value || '(empty)'}`);
            updateCharacteristicValue(serviceUuid, charUuid, result.value);
        } else {
            addLog('error', `Read failed: ${result.error}`);
        }
    } catch (error) {
        addLog('error', `Read error: ${error}`);
    }
}

// Show Write Dialog
function showWriteDialog(serviceUuid, charUuid) {
    currentWriteChar = { serviceUuid, charUuid };
    if (elements.writeCharLabel) {
        elements.writeCharLabel.textContent = `Characteristic: ${charUuid}`;
    }
    if (elements.writeDataInput) {
        elements.writeDataInput.value = '';
    }
    if (elements.writeDialog) {
        elements.writeDialog.style.display = 'flex';
        elements.writeDataInput?.focus();
    }
}

function closeWriteDialog() {
    if (elements.writeDialog) {
        elements.writeDialog.style.display = 'none';
    }
    currentWriteChar = null;
}

// Write Data
async function writeData() {
    if (!currentWriteChar) return;

    const data = elements.writeDataInput?.value.trim();
    if (!data) return;

    const format = document.querySelector('input[name="format"]:checked')?.value || 'hex';

    try {
        const result = await invoke('write_characteristic', {
            serviceUuid: currentWriteChar.serviceUuid,
            charUuid: currentWriteChar.charUuid,
            data,
            format
        });

        if (result.success) {
            addLog('success', `Write successful`);
            closeWriteDialog();
        } else {
            addLog('error', `Write failed: ${result.error}`);
        }
    } catch (error) {
        addLog('error', `Write error: ${error}`);
    }
}

// Toggle Notify
async function toggleNotify(serviceUuid, charUuid, btn) {
    const isNotifying = btn.classList.contains('active');
    const newState = !isNotifying;

    try {
        const result = await invoke('notify_characteristic', {
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
function updateCharacteristicValue(serviceUuid, charUuid, value) {
    const charItem = elements.servicesList?.querySelector(
        `[data-service-uuid="${serviceUuid}"][data-char-uuid="${charUuid}"]`
    );
    if (!charItem) return;

    let valueDiv = charItem.querySelector('.characteristic-value');
    if (!valueDiv) {
        valueDiv = document.createElement('div');
        valueDiv.className = 'characteristic-value';
        charItem.appendChild(valueDiv);
    }
    valueDiv.textContent = value || '(empty)';
}

// Advertising
async function startAdvertising() {
    const name = elements.broadcastName?.value || 'SmartBLE';
    const serviceUuid = elements.broadcastServiceUuid?.value || 'FFF0';

    try {
        const result = await invoke('start_advertising', { name, serviceUuids: [serviceUuid] });
        if (result.success) {
            state.advertising = true;
            updateAdvertisingUI(true);
            addLog('success', 'Advertising started');
        } else {
            addLog('error', `Advertising failed: ${result.error}`);
        }
    } catch (error) {
        addLog('error', `Advertising error: ${error}`);
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
    const timestamp = new Date().toLocaleTimeString();
    state.logs.unshift({ type, message, timestamp });
    renderLogs();
}

function renderLogs() {
    if (!elements.logList) return;

    if (state.logs.length === 0) {
        if (elements.logPanel) elements.logPanel.style.display = 'none';
        return;
    }

    if (elements.logPanel) elements.logPanel.style.display = 'flex';
    if (elements.logCount) elements.logCount.textContent = `${state.logs.length} entries`;

    elements.logList.innerHTML = state.logs.slice(0, 100).map(log => `
        <div class="log-entry ${log.type}">
            <span class="log-time">[${log.timestamp}]</span>
            <span class="log-message">${escapeHtml(log.message)}</span>
        </div>
    `).join('');
}

function clearLogs() {
    state.logs = [];
    renderLogs();
}

// Navigation
function goBack() {
    if (elements.deviceDetailView && elements.deviceListView) {
        elements.deviceDetailView.classList.remove('active');
        elements.deviceListView.classList.add('active');
    }
    state.connected = false;
    state.currentDevice = null;
    state.services = [];
}

// Utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
