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
    connecting: false, // P006 面板状态机：连接中
    hasScanned: false, // P001 正典状态词：扫描完成后显示「扫描完成 · 发现 N 台」
    devices: new Map(),
    currentDevice: null,
    connectedDevices: new Set(),
    servicesByDevice: new Map(),
    logs: [],
    advertising: false,
    broadcastSupportChecked: false, // P008 检查支持状态
    broadcastUuidError: false,      // P008 UUID 校验态
    broadcastUnsupported: false,    // P008 平台拦截态
    broadcastOsName: '',
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

// P002/P003/P005 Smart HID 线（PARITY-002 桌面接入）：
// hidProv / hidDiag 为纯内存状态；F023 红线——密码/令牌仅 submit 参数，不落任何存储。
const hid = {
    svc: null,
    prov: null, // { device, phase, connecting, connError, lost, ssid, pwd, hub, pairing, provisioning, done, err, progress }
    diag: null  // { deviceId, state, rows, error, connecting, showErr }
};

// DOM Elements
const elements = {
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
        renderAboutPage(); // F027/F028/F029：关于页投影（版本三态/推广卡/平台状态）
        updateBroadcastPlatformInfo(); // Update broadcast UI based on platform
        attachHidService(); // P002/P003/P005：Smart HID 会话服务（Tauri invoke/listen 适配）
        await initBluetooth();
        setupTauriListeners();
    } catch (error) {
        console.error('Failed to initialize Tauri:', error);
        updateStatus('Error', false);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab navigation（P001 正典底部 TabBar）
    document.querySelectorAll('.tabbar .tb').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 筛选面板折叠（正典 sec-t txtlink：筛选 / 收起筛选）
    const filterToggle = document.getElementById('filterToggle');
    const collapsePanel = document.getElementById('mainFilterPanel');
    filterToggle?.addEventListener('click', () => {
        const open = collapsePanel?.hasAttribute('hidden');
        if (open) collapsePanel.removeAttribute('hidden');
        else collapsePanel?.setAttribute('hidden', '');
        filterToggle.textContent = open ? '收起筛选' : '筛选';
    });

    // Scan button
    elements.scanButton.addEventListener('click', toggleScan);

    // Device detail buttons
    document.getElementById('backButton')?.addEventListener('click', goBack);

    // F027/F028/F029：关于页二级导航与分享（桌面口径）
    document.getElementById('goVersionsLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('versions');
    });
    document.getElementById('versionsBackButton')?.addEventListener('click', () => {
        switchTab('about');
    });
    document.getElementById('shareAppLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        shareApp();
    });
    document.getElementById('connectButton')?.addEventListener('click', () => connectDevice(state.currentDevice?.id));
    document.getElementById('disconnectButton')?.addEventListener('click', disconnectDevice);

    // P002/P003/P005 Smart HID 二级页
    document.getElementById('hidProvBackButton')?.addEventListener('click', () => hidLeaveProvision());
    document.getElementById('hidProvReconnect')?.addEventListener('click', () => hidConnect());
    document.getElementById('hidProvBackToList')?.addEventListener('click', () => switchTab('scan'));
    document.getElementById('hidProvRejoin')?.addEventListener('click', () => hidConnect());
    document.getElementById('hidPwdEye')?.addEventListener('click', () => hidTogglePwdEye());
    document.getElementById('hidQrBigact')?.addEventListener('click', () => hidOpenQrSheet());
    document.getElementById('hidSubmitButton')?.addEventListener('click', () => hidSubmit());
    document.getElementById('hidCancelWaitButton')?.addEventListener('click', () => hidCancelWait());
    document.getElementById('hidDoneViewButton')?.addEventListener('click', () => openHidDetail());
    document.getElementById('hidRecoveryButton')?.addEventListener('click', () => hidRunRecovery());
    ['hidSsidInput', 'hidHubInput'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', () => {
            if (hid.prov) {
                hid.prov.ssid = document.getElementById('hidSsidInput').value;
                hid.prov.hub = document.getElementById('hidHubInput').value;
                hidUpdateSubmitState();
            }
        });
    });
    document.getElementById('hidDetailBackButton')?.addEventListener('click', () => switchTab('scan'));
    document.getElementById('hidDiagBackButton')?.addEventListener('click', () => {
        if (hid.svc?.getKnownDevice()) openHidDetail();
        else switchTab('scan');
    });
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

    // Broadcast buttons（P008 正典：开始/停止/检查支持 + 预算实时计算）
    elements.startBroadcastButton?.addEventListener('click', startAdvertising);
    elements.stopBroadcastButton?.addEventListener('click', stopAdvertising);
    document.getElementById('checkSupportButton')?.addEventListener('click', checkBroadcastSupport);
    ['broadcastName', 'broadcastServiceUuid', 'broadcastManufacturerId', 'broadcastManufacturerData'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', () => updateByteBudget());
    });

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
            const { serviceUuid, charUuid, data, format, mode } = e.detail;
            const deviceId = state.currentDevice.id;

            const writeOnce = async (payload) => invoke('write_characteristic', {
                deviceId, serviceUuid, charUuid, data: payload, format
            });

            // C9 写入分段执行（对齐 F-AND 参照实现；与 Electron 版互为镜像）
            if (mode === 'batch' && Array.isArray(e.detail.lines)) {
                const lines = e.detail.lines;
                addLog('info', `批量发送: ${lines.length} 条指令…`);
                let ok = 0;
                let fail = 0;
                for (const line of lines) {
                    try {
                        const result = await writeOnce(line);
                        if (result.success) { ok++; addLog('success', `写入成功: ${line}`); }
                        else { fail++; addLog('error', `写入失败: ${result.error}`); }
                    } catch (error) {
                        fail++;
                        addLog('error', `写入失败: ${error}`);
                    }
                }
                addLog(fail === 0 ? 'success' : 'error', `批量发送完成（成功 ${ok} / 失败 ${fail}）`);
                if (fail === 0) writeDialog.close();
                return;
            }

            if (mode === 'loop') {
                const { loopCount, intervalMs } = e.detail;
                const infinite = !loopCount || loopCount <= 0;
                const total = infinite ? '∞' : String(loopCount);
                state.writeLoopCancelled = false;
                const cancelLoop = () => { state.writeLoopCancelled = true; };
                writeDialog.addEventListener('close', cancelLoop, { once: true });
                addLog('info', `循环发送（${total} 次 × ${intervalMs}ms）开始…`);
                let sent = 0;
                try {
                    while (!state.writeLoopCancelled && (infinite || sent < loopCount)) {
                        const result = await writeOnce(data);
                        sent++;
                        if (!result.success) {
                            addLog('error', `循环第 ${sent} 次写入失败: ${result.error}`);
                            break;
                        }
                        addLog('info', `循环发送中 (${sent}/${total})`);
                        if (infinite || sent < loopCount) {
                            await new Promise((r) => setTimeout(r, intervalMs));
                        }
                    }
                    if (state.writeLoopCancelled) {
                        addLog('info', `循环发送已停止（已发 ${sent} 次）`);
                    } else {
                        addLog('success', `循环发送完成（共 ${sent} 次）`);
                        writeDialog.close();
                    }
                } catch (error) {
                    addLog('error', `循环发送中断: ${error}`);
                } finally {
                    writeDialog.removeEventListener('close', cancelLoop);
                }
                return;
            }

            // 单次（默认，原路径）
            try {
                const result = await writeOnce(data);
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
            // P001 扫描卡 SHID 徽章双入口：Profile 广告匹配（强=服务 UUID / 弱=名称前缀）
            if (window.SmartHidDesktop) {
                const match = window.SmartHidDesktop.matchScannedDevice(device);
                if (match) device.profileMatch = match; // 1=WEAK / 2=STRONG
            }
            state.devices.set(device.id, device);
        });
        renderDeviceList();
        updateScanStatus();
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

        // U-REC-001 同型预防：Smart HID 会话设备的断开/重连归 hidService 独占（P002 向导自管重连）
        if (window.SmartHidService?.ownsDevice?.(deviceId)) {
            addLog('warning', `Device ${deviceId} handled by Smart HID session, skip auto-reconnect`);
            return;
        }

        // Start reconnection if not user initiated
        if (!state.reconnect.userDisconnected.has(deviceId)) {
            attemptReconnect(deviceId);
        }
    });
}

// T06: Auto-Reconnect (aligned with Flutter: max 3 attempts, 2s/4s/6s backoff)
// MAX_RECONNECT_ATTEMPTS 顶层常量由 BleUtils.js 声明（经典脚本共享全局词法环境）；
// 此处不得重复声明——重复声明会让整个 app.js 在实例化期 SyntaxError 而完全不执行。

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

// Update Status（P001 正典 navbar bt-chip：bt-dot on/off + 状态词）
function updateStatus(text, status) {
    const dot = document.querySelector('#btChip .bt-dot');
    const word = document.getElementById('btWord');
    if (status === 'ready') {
        if (dot) dot.className = 'bt-dot on';
        if (word) word.textContent = '蓝牙就绪';
    } else if (status === 'error') {
        if (dot) dot.className = 'bt-dot off';
        if (word) word.textContent = '蓝牙不可用';
    } else {
        if (dot) dot.className = 'bt-dot';
        if (word) word.textContent = '初始化中…';
    }
}

// Tab Navigation
function switchTab(tab) {
    document.querySelectorAll('.tabbar .tb').forEach(btn => {
        btn.classList.toggle('on', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
        view.style.display = ''; // 清内联 display（P010/P002/P003/P005 初始内联 none 由 active class 接管显隐）
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
    } else if (tab === 'versions') {
        // P010：关于页二级视图，Tab 状态保持「关于」
        document.getElementById('versionsView')?.classList.add('active');
        renderVersionsPage();
        document.querySelector('.tabbar .tb[data-tab="about"]')?.classList.add('on');
    }
}

// P009：关于页投影（结构对齐 docs/specs/prototype/platform/desktop/high-fi/pages/p009-about.js）
// F027 版本三态 + 平台状态；F028 推广卡桌面线已裁撤；F029 菜单行为不变
function renderAboutPage() {
    const VM = window.SmartBLEVersionMetadata;
    const PRODUCT = window.SmartBLEProduct;
    if (!VM || !PRODUCT) {
        const chip = document.getElementById('aboutVersionChip');
        if (chip) chip.textContent = 'dev.unknown';
        const line = document.getElementById('aboutVersionLine');
        if (line) line.textContent = 'vdev.unknown · 零后端 · 零本地持久化';
        return;
    }

    const release = VM.getReleaseMetadata();
    const channel = String(release.channel || 'preview').toLowerCase();
    const metadataVersionLabel = VM.buildVersionString({
        version: VM.getProductVersion(),
        commit: release.commit,
        channel: release.channel,
    });

    // P009 三态：基准 = metadata 投影；运行时渠道（tauri.conf version）成功才覆盖
    const chip = document.getElementById('aboutVersionChip');
    const verLine = document.getElementById('aboutVersionLine');
    const applyLabels = (versionLabel) => {
        if (chip) chip.textContent = 'v' + versionLabel;
        if (verLine) verLine.textContent = `v${versionLabel} · ${channel} · 零后端 · 零本地持久化`;
    };
    applyLabels(metadataVersionLabel);
    const appApi = window.__TAURI__?.app;
    if (appApi?.getVersion) {
        appApi.getVersion().then((value) => {
            const next = typeof value === 'string' ? value.trim() : '';
            if (next) {
                applyLabels(VM.buildVersionString({
                    version: next,
                    commit: release.commit,
                    channel: release.channel,
                }));
            }
        }).catch(() => {});
    }

    // P009 应用信息：当前环境 / 设备型号（Tauri allowlist 未开 os 模块，走 navigator 真实值）
    const envValue = document.getElementById('aboutEnvValue');
    if (envValue) {
        const os = navigator.userAgentData?.platform
            || (/Windows/.test(navigator.userAgent) ? 'Windows'
                : /Mac OS/.test(navigator.userAgent) ? 'macOS'
                : /Linux/.test(navigator.userAgent) ? 'Linux' : '—');
        envValue.textContent = `Desktop · ${os}`;
    }
    const modelValue = document.getElementById('aboutModelValue');
    if (modelValue) {
        const arch = /x64|Win64/.test(navigator.userAgent) ? 'x64'
            : (/arm/i.test(navigator.userAgent) ? 'arm' : '');
        modelValue.textContent = arch ? `PC · ${arch}` : '—';
    }

    // P009 构建：Release Metadata 投影（无 commit 时如实留空）
    const buildValue = document.getElementById('aboutBuildValue');
    if (buildValue) {
        const sha = release.commit ? String(release.commit).trim().slice(0, 7) : '';
        buildValue.textContent = sha ? `v+${sha}（Release Metadata 投影）` : '—';
        buildValue.classList.toggle('dim', !sha);
    }

    // P009 功能特性 chips（product.js 单一来源）
    const chipRow = document.getElementById('aboutFeatureChips');
    if (chipRow) {
        chipRow.innerHTML = '';
        (PRODUCT.PRODUCT_FEATURES || []).forEach((f) => {
            const el = document.createElement('span');
            el.className = 'about-feature-chip';
            el.textContent = f;
            chipRow.appendChild(el);
        });
    }

    // F027：平台与公开状态（rel-row + 双状态词）
    const grid = document.getElementById('platformGrid');
    if (grid) {
        grid.innerHTML = '';
        const stword = (word) => {
            const el = document.createElement('span');
            el.className = 'about-stword about-st-' + word;
            el.textContent = word;
            return el;
        };
        VM.getPlatformPublicStatuses().forEach((p) => {
            const row = document.createElement('div');
            row.className = 'about-rel-row';
            const name = document.createElement('span');
            name.className = 'about-rel-name';
            name.textContent = p.name;
            const st = document.createElement('span');
            st.className = 'about-rel-st';
            const cap = p.role === 'REFERENCE' ? 'REFERENCE' : (p.capability_status || '');
            const rel = p.role === 'REFERENCE' ? '' : (p.release_status || '');
            if (cap && rel && cap !== rel) {
                st.append(stword(cap), stword(rel));
            } else {
                st.append(stword(cap || rel || 'NOT_RELEASED'));
            }
            row.append(name, st);
            grid.appendChild(row);
        });
    }

    // F029 菜单外链：product.js 单一来源
    const websiteRow = document.getElementById('aboutWebsiteRow');
    if (websiteRow) websiteRow.href = PRODUCT.PRODUCT_INFO.website;
    // 问题反馈（2026-09-11 正典更新）：桌面版非微信小程序宿主 → 弹窗展示小程序码 + 说明，
    // 用户微信扫码进入小程序联系客服；Gitee Issues 保留为复制链接兜底
    const feedbackRow = document.getElementById('aboutFeedbackRow');
    if (feedbackRow) {
        feedbackRow.href = '#';
        feedbackRow.addEventListener('click', (e) => {
            e.preventDefault();
            showFeedbackSheet();
        });
    }
}

// 问题反馈弹窗（P009）：小程序码 + 引导说明（.mask/.modal 正典壳）
function showFeedbackSheet() {
    const PRODUCT = window.SmartBLEProduct;
    if (!PRODUCT) return;
    const info = PRODUCT.PRODUCT_INFO;
    const qrSrc = (info.miniProgram && info.miniProgram.qrImage) || 'assets/wx-mini-qr.jpg';
    const mpName = (info.miniProgram && info.miniProgram.name) || info.name;
    const body = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
            <img src="${qrSrc}" alt="${mpName} 微信小程序码" width="200" height="200"
                 style="border:1px solid #E4EBF5;border-radius:12px;background:#fff">
            <div style="font-size:13px;color:#60758D;line-height:1.6;text-align:center">
                使用微信「扫一扫」扫描小程序码<br>
                进入「${mpName}」小程序，即可直接联系客服反馈问题
            </div>
        </div>`;
    hidShowModal({
        title: '问题反馈',
        bodyHtml: body,
        buttons: [
            {
                label: '复制反馈链接',
                tone: 'soft',
                onClick: () => {
                    const url = info.feedback || '';
                    const done = () => addLog('info', '反馈链接已复制到剪贴板');
                    if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(url).then(done, done);
                    } else { done(); }
                    return false; // 不关闭弹窗，允许继续扫码
                }
            },
            { label: '我知道了', tone: 'primary' }
        ]
    });
}

// P010：版本记录页（正典结构：当前版本/当前限制/发布历史/预览记录四卡 + foot；
// Release Metadata 纯投影，禁止手写版本事实）
function renderVersionsPage() {
    const VM = window.SmartBLEVersionMetadata;
    const body = document.getElementById('versionsBody');
    if (!body) return;
    if (!VM) {
        body.innerHTML = '<div class="card"><div class="logempty">版本元数据不可用（dev.unknown）</div></div>';
        return;
    }

    const model = VM.getVersionPageModel();
    const c = model.current;
    const commit = String(VM.getReleaseMetadata().commit || '').trim();
    const sha7 = commit ? commit.slice(0, 7) : '';
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const chipTone = (st) => st === 'VERIFIED' ? 'success' : st === 'PREVIEW' ? 'primary' : st === 'BLOCKED' ? 'warning' : 'neutral';
    const platformChips = c.platforms.map((p) =>
        `<span class="chip ${chipTone(p.display_status)}">${esc(p.name)} ${esc(p.display_status)}</span>`).join('');

    const limitationRows = c.limitations.length
        ? c.limitations.map((x) => `<div style="display:flex;gap:8px;padding:7px 0;font-size:var(--fs-body);color:var(--c-sub);line-height:1.55;border-bottom:1px solid var(--c-line-soft)"><span style="color:var(--c-warning);display:flex;flex-shrink:0;margin-top:2px"><svg class="ic xs" aria-hidden="true"><use href="#i-warn"/></svg></span>${esc(x)}</div>`).join('')
        : '<div class="logempty">暂无已知限制条目</div>';

    const relRows = model.history.releases.length
        ? model.history.releases.map((r) => `<div class="rel-row"><span>v${esc(r.version)} <span class="dt">${esc(r.built_at || '')}</span></span><span class="v">${esc(r.commit ? String(r.commit).slice(0, 7) : '')}</span></div>`).join('')
        : '<div class="logempty">暂无正式发布版本——产品当前处于 PREVIEW 阶段，首个正式版发布后将在此列出。</div>';

    const prevRows = model.history.previews.length
        ? model.history.previews.map((p) => `<div class="rel-row"><span>v${esc(p.version)} <span class="dt">${esc(p.channel)} 渠道 · ${esc(p.status)}</span></span><span class="v">${esc(sha7)}</span></div>`).join('')
        : '<div class="logempty">暂无预览记录</div>';

    body.innerHTML = `
        <div class="card" style="margin-top:12px">
            <div class="card-t"><svg class="ic" aria-hidden="true"><use href="#i-doc"/></svg> 当前版本</div>
            <div style="display:flex;align-items:baseline;gap:10px;margin:6px 0 10px">
                <span style="font-size:var(--fs-display);font-weight:var(--fw-xbold);color:var(--c-primary)">${esc(c.display_version)}</span>
                <span class="chip ${chipTone(c.status)}">${esc(c.channel_label)}</span>
            </div>
            <div class="kv"><span class="k">构建</span><span class="v mono ${sha7 ? '' : 'dim'}">${sha7 ? 'v+' + esc(sha7) : '—'}</span></div>
            <div class="kv"><span class="k">Release tag</span><span class="v">${c.has_release_tag ? '已登记（preview）' : '未登记'}</span></div>
            <div class="chip-row" style="margin-top:10px">${platformChips}</div>
            <div style="margin-top:12px"><button class="btn soft sm block" id="versionsCopyBtn"><svg class="ic sm" aria-hidden="true"><use href="#i-copy"/></svg><span>复制版本信息</span></button></div>
        </div>
        <div class="card">
            <div class="card-t"><svg class="ic" aria-hidden="true"><use href="#i-warn"/></svg> 当前限制</div>
            ${limitationRows}
            <div style="margin-top:8px"><div class="note info"><span class="ic"><svg class="ic sm" aria-hidden="true"><use href="#i-info"/></svg></span><div>当前无 Artifact，不提供下载入口。</div></div></div>
        </div>
        <div class="card"><div class="card-t"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg> 正式发布历史</div>${relRows}</div>
        <div class="card"><div class="card-t"><svg class="ic" aria-hidden="true"><use href="#i-dl"/></svg> 预览记录</div>${prevRows}</div>
        <div class="foot">本页数据来自 Release Metadata 投影，不是手写版本事实源。</div>`;

    // P010 复制版本信息（剪贴板 + 按钮态反馈）
    body.querySelector('#versionsCopyBtn')?.addEventListener('click', (e) => {
        const info = `BLE Toolkit+ v${c.display_version} · ${c.channel_label} · 构建 v+${sha7 || 'unknown'} · ${c.platforms.map((p) => `${p.name} ${p.display_status}`).join(' / ')}`;
        const btn = e.currentTarget;
        const done = (ok) => {
            const label = btn.querySelector('span');
            if (label) label.textContent = ok ? '已复制 ✓' : '复制失败';
            setTimeout(() => { if (label) label.textContent = '复制版本信息'; }, 1600);
        };
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(info).then(() => done(true), () => done(false));
        } else {
            done(false);
        }
    });
}

// F029 桌面口径（10_platform §4：分享 = 导出文本/文件）
function shareApp() {
    const PRODUCT = window.SmartBLEProduct;
    const VM = window.SmartBLEVersionMetadata;
    const info = PRODUCT ? PRODUCT.PRODUCT_INFO : null;
    if (!info) return;

    const versionLabel = VM
        ? VM.buildVersionString({
            version: VM.getProductVersion(),
            commit: VM.getReleaseMetadata().commit,
            channel: VM.getReleaseMetadata().channel,
        })
        : 'dev.unknown';

    const text = `${info.name} - BLE 调试与验证工具\n${info.summary}\n版本：${versionLabel}\n${info.website}`;

    const done = (msg) => addLog('success', msg);
    const fallbackCopy = () => {
        navigator.clipboard?.writeText(text).then(
            () => done('分享文本已复制到剪贴板'),
            () => done('复制失败，请手动复制下载文件内容'),
        );
    };

    // 优先导出 .txt 文件，失败回退剪贴板
    try {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'smartble-share.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        done('分享文本已导出为 smartble-share.txt');
    } catch {
        fallbackCopy();
    }
}

// T14: OS Support Verification for Peripheral Broadcaster
// P007 已连接面板（正典：sumcard 汇总卡 + conn 变体设备卡 + link 空态）
function renderConnectedDevicesPanel() {
    const list = document.getElementById('connectedDeviceList');
    const badge = document.getElementById('connectedBadge');
    const sumcard = document.getElementById('connectedSumcard');
    const countEl = document.getElementById('connectedCount');
    if (!list) return;

    const count = state.connectedDevices.size;
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
    // 正典：单台不显示汇总卡（one 模式），两台及以上才出现（multi 模式 + 全部断开）
    if (sumcard) sumcard.style.display = count > 1 ? 'flex' : 'none';
    if (countEl) countEl.textContent = String(count);

    if (count === 0) {
        list.innerHTML = `
            <div class="empty">
                <div class="ill">${emptyIll('link')}</div>
                <div class="t">还没有连接中的设备</div>
                <div class="d">先在「扫描」页找到设备并连接，会话将保存在这里</div>
                <button class="btn soft" id="connectedGoScan"><svg class="ic sm" aria-hidden="true"><use href="#i-scan"/></svg><span>去扫描</span></button>
            </div>`;
        list.querySelector('#connectedGoScan')?.addEventListener('click', () => switchTab('scan'));
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
        state.hasScanned = false;
        renderDeviceList();

        const result = await invoke('start_scan');
        if (result.success) {
            state.scanning = true;
            updateScanButton(true);
            updateScanStatus();
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
        state.hasScanned = true;
        updateScanButton(false);
        updateScanStatus();
        addLog('info', 'Scanning stopped');
    } catch (error) {
        addLog('error', `Stop scan error: ${error}`);
    }
}

// P001 扫描按钮（正典 C.btn：primary+scan / danger+stop）
function updateScanButton(scanning) {
    const btn = elements.scanButton;
    if (!btn) return;
    if (scanning) {
        btn.className = 'btn danger';
        btn.innerHTML = '<svg class="ic sm" aria-hidden="true"><use href="#i-stop"/></svg><span>停止扫描</span>';
    } else {
        btn.className = 'btn primary';
        btn.innerHTML = '<svg class="ic sm" aria-hidden="true"><use href="#i-scan"/></svg><span>开始扫描</span>';
    }
}

// P001 扫描状态词（正典 scantool.lb：扫描中 live 点 · 5s 会话 / 扫描完成 · 发现 N 台 / 待开始扫描）
function updateScanStatus() {
    const el = document.getElementById('scanStatusLabel');
    if (!el) return;
    if (state.scanning) {
        el.innerHTML = '<span class="live"></span>扫描中 · 5s 会话';
    } else if (state.hasScanned) {
        el.textContent = `扫描完成 · 发现 ${applyFilters().length} 台`;
    } else {
        el.textContent = '待开始扫描';
    }
}

// P001 空态插图（正典 C.ILL 同源 SVG：radar 扫描空态 / link 筛选无匹配）
function emptyIll(kind) {
    if (kind === 'link') {
        return `<svg width="118" height="86" viewBox="0 0 118 86" fill="none">
      <path d="M46 40a12 12 0 0017 17l8-8a12 12 0 10-17-17" stroke="#9AA8B6" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M72 46A12 12 0 0055 29l-8 8a12 12 0 1017 17" stroke="#1B6DFF" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M24 74h70" stroke="#E3EAF3" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
    return `<svg width="118" height="86" viewBox="0 0 118 86" fill="none">
      <circle cx="59" cy="46" r="34" stroke="#E3EAF3" stroke-width="2"/>
      <circle cx="59" cy="46" r="21" stroke="#E3EAF3" stroke-width="2"/>
      <circle cx="59" cy="46" r="8" stroke="#1B6DFF" stroke-width="2"/>
      <path d="M59 46L88 20" stroke="#1B6DFF" stroke-width="2" stroke-linecap="round"/>
      <circle cx="76" cy="54" r="3.5" fill="#17C7A8"/><circle cx="48" cy="34" r="2.5" fill="#9AA8B6"/>
      <path d="M18 78h82" stroke="#E3EAF3" stroke-width="2" stroke-linecap="round"/></svg>`;
}

// Render Device List - Smart update to prevent flickering
function renderDeviceList() {
    if (!elements.deviceList) return;

    // Apply filters and get device list
    const filteredDevices = applyFilters();

    // 正典 sec-t chip：仅在列表非空时显示数量
    if (elements.deviceCount) {
        elements.deviceCount.textContent = String(filteredDevices.length);
        elements.deviceCount.style.display = filteredDevices.length ? '' : 'none';
    }

    // Handle empty state（正典 C.empty：radar 还没有扫描结果 / link 当前没有匹配设备）
    if (filteredDevices.length === 0) {
        const hasDevices = state.devices.size > 0;
        elements.deviceList.innerHTML = `
            <div class="empty">
                <div class="ill">${emptyIll(hasDevices ? 'link' : 'radar')}</div>
                <div class="t">${hasDevices ? '当前没有匹配设备' : '还没有扫描结果'}</div>
                <div class="d">${hasDevices ? '调整筛选条件试试' : '点上方按钮开始扫描附近 BLE 设备'}</div>
            </div>`;
        return;
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
            card.connectedHint = state.connectedDevices.has(device.id);

            card.addEventListener('connect', (e) => connectDevice(e.detail.id));
            card.addEventListener('configure-hid', (e) => {
                const dev = state.devices.get(e.detail.id);
                openHidProvision({ id: e.detail.id, name: dev?.name });
            });
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
        state.connecting = true;
        updateConnectionStatus(false, true);
        updateDeviceButtons();
        renderServices();

        const result = await invoke('connect', { deviceId });
        state.connecting = false;
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
            renderServices();
            addLog('error', `Connect failed: ${result.error}`);
        }
    } catch (error) {
        state.connectedDevices.delete(deviceId);
        state.connecting = false;
        updateConnectionStatus(false);
        updateDeviceButtons();
        renderServices();
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

// Update device connect/disconnect button visibility（显隐已并入 updateConnectionStatus；此处只做会话清理）
function updateDeviceButtons() {
    const isConn = state.currentDevice ? state.connectedDevices.has(state.currentDevice.id) : false;
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

    // 正典显示名批准链口径
    const resolved = window.SmartBLEDisplayName?.resolveDeviceDisplayName(state.currentDevice);
    if (elements.deviceName) {
        elements.deviceName.textContent = (resolved ? resolved.displayName : state.currentDevice?.name) || '未命名 BLE 设备';
    }
    if (elements.deviceId) {
        elements.deviceId.textContent = state.currentDevice?.id || '';
    }
    
    const isConn = state.currentDevice ? state.connectedDevices.has(state.currentDevice.id) : false;
    updateConnectionStatus(isConn);
    updateDeviceButtons();
    
    renderServices();
}

// P006 连接状态（正典 devhead：st 圆点 on/mid + 状态词 + 连接/断开按钮互斥）
function updateConnectionStatus(connected, connecting = false) {
    const st = document.getElementById('gattSt');
    const word = document.getElementById('gattStateWord');
    const connectBtn = document.getElementById('connectButton');
    const disconnectBtn = document.getElementById('disconnectButton');

    if (st) st.className = 'st' + (connected ? ' on' : connecting ? ' mid' : '');
    if (word) word.textContent = connected ? '已连接' : connecting ? '连接中' : '未连接';

    if (connectBtn) {
        connectBtn.style.display = connected ? 'none' : 'inline-flex';
        connectBtn.disabled = connecting;
        const label = connectBtn.querySelector('span');
        if (label) label.textContent = connecting ? '连接中…' : '连接设备';
    }
    if (disconnectBtn) disconnectBtn.style.display = connected ? 'inline-flex' : 'none';
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

// P006 面板状态机（正典 panel：idle / connecting / 服务发现中 / ready / empty）
function renderServices() {
    const servicePanel = document.getElementById('mainServicePanel');
    const panel = document.getElementById('gattPanel');
    if (!servicePanel) return;
    
    if (!state.currentDevice) {
        servicePanel.services = [];
        if (panel) panel.innerHTML = '';
        const otaBtn = document.getElementById('otaButton');
        if (otaBtn) otaBtn.style.display = 'none';
        return;
    }
    const deviceId = state.currentDevice.id;
    const isConn = state.connectedDevices.has(deviceId);
    const discovered = state.servicesByDevice.has(deviceId);
    const currentServices = state.servicesByDevice.get(deviceId) || [];

    // UUID 规范化后比较：bleplug 可能给大写/带横线，常量历史版本带横线导致永不相等
    const normalizeUuid = (u) => (u || '').toLowerCase().replace(/-/g, '');
    const otaServiceUuid = '4fafc2011fb5459e8fccc5c9c331914d';
    const hasOta = currentServices.some(s => normalizeUuid(s.uuid) === otaServiceUuid);

    // OTA 按钮（正典 subnav：仅 ready 态 + OTA 服务存在时可见）
    const otaBtn = document.getElementById('otaButton');
    if (otaBtn) otaBtn.style.display = (isConn && hasOta) ? 'inline-flex' : 'none';

    const op = (title, desc, mode = 'loading') => `
        <div class="op ${mode === 'loading' ? '' : mode}">
            ${mode === 'loading' ? '<span class="spin"></span>'
                : `<span class="ico" style="color:${mode === 'ok' ? '#0E9A80' : mode === 'warn' ? '#C77E14' : 'var(--c-danger)'}"><svg class="ic" aria-hidden="true"><use href="#i-${mode === 'warn' ? 'warn' : 'x'}"/></svg></span>`}
            <div style="flex:1"><div class="t">${title}</div>${desc ? `<div class="d">${desc}</div>` : ''}</div>
        </div>`;

    if (!isConn) {
        servicePanel.services = [];
        if (panel) panel.innerHTML = state.connecting
            ? op('连接中…', `正在连接 ${state.currentDevice.name || state.currentDevice.id}（10s 超时 · 失败自动重试 3 次）`)
            : op('未初始化', '点击「连接设备」建立 GATT 会话。');
        return;
    }

    if (!discovered) {
        servicePanel.services = [];
        if (panel) panel.innerHTML = op('服务发现中…', `正在读取 ${state.currentDevice.name || state.currentDevice.id} 的 GATT 树`);
        return;
    }

    servicePanel.services = currentServices;
    if (currentServices.length === 0) {
        if (panel) panel.innerHTML = op('服务发现完成 · 列表为空', '该设备未暴露任何 GATT 服务（或权限受限）。', 'warn');
    } else {
        if (panel) panel.innerHTML = hasOta
            ? '<div style="margin-bottom:12px"><div class="note warn"><span class="ic"><svg class="ic sm" aria-hidden="true"><use href="#i-warn"/></svg></span><div><b>OTA 走真实契约链路</b>（选包→校验→传输→提交 · R-1/R-2）；无 manifest 时真固件按 missing_target 拒绝。</div></div></div>'
            : '';
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

// Toggle Notify（P006 正典：listening 类为唯一态源，组件已乐观翻转，失败回翻）
function revertNotifyBtn(btn) {
    if (!btn) return;
    const on = btn.classList.toggle('listening');
    btn.classList.toggle('on', on);
    const label = btn.querySelector('span');
    if (label) label.textContent = on ? '停止监听' : '开始监听';
}

async function toggleNotify(serviceUuid, charUuid, btn) {
    if (!state.currentDevice) return;
    const deviceId = state.currentDevice.id;
    const newState = btn.classList.contains('listening');

    try {
        const result = await invoke('notify_characteristic', {
            deviceId,
            serviceUuid,
            charUuid,
            notify: newState
        });

        if (result.success) {
            addLog('info', `${newState ? '开始监听' : '停止监听'} ${String(charUuid).slice(0, 8)}…${newState ? ' · 防抖去重 300ms' : ''}`);
        } else {
            revertNotifyBtn(btn);
            addLog('error', `Notify failed: ${result.error}`);
        }
    } catch (error) {
        revertNotifyBtn(btn);
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
// P008 广播表单读取
function readBroadcastForm() {
    return {
        name: elements.broadcastName?.value || 'SmartBLE',
        uuid: (elements.broadcastServiceUuid?.value || '').trim(),
        mfgId: (elements.broadcastManufacturerId?.value || '').trim(),
        mfgData: elements.broadcastManufacturerData?.value || '',
    };
}

// P008 31B 预算（正典口径：名称 2+len / UUID 2+len/2 / 厂商块 4+dataLen）
function calcAdvertiseBytes(f) {
    const nameB = f.name ? 2 + f.name.length : 0;
    const uuidB = f.uuid && isValidBroadcastUuid(f.uuid) ? 2 + f.uuid.length / 2 : 0;
    const mfgB = (f.mfgId || f.mfgData) ? 4 + f.mfgData.length : 0;
    return { name: nameB, uuid: uuidB, mfg: mfgB, total: nameB + uuidB + mfgB };
}

function isValidBroadcastUuid(u) {
    return /^([0-9a-fA-F]{4}|[0-9a-fA-F]{8}|[0-9a-fA-F]{36})$/.test(u);
}

// P008 预算条 + 四行明细 + 超限拦截态
function updateByteBudget() {
    const f = readBroadcastForm();
    const b = calcAdvertiseBytes(f);
    const over = b.total > 31;
    const uuidOk = !f.uuid || isValidBroadcastUuid(f.uuid);

    const bar = document.getElementById('broadcastBytebar');
    if (bar) bar.classList.toggle('over', over);
    const totalEl = document.getElementById('broadcastByteTotal');
    if (totalEl) totalEl.textContent = String(b.total);

    const budget = document.getElementById('broadcastBudget');
    if (budget) {
        budget.innerHTML = `
            <div class="b-r ${b.name > 31 ? 'over' : ''}"><span>完整名称 (0x09)</span><span>${b.name} B</span></div>
            <div class="b-r"><span>服务 UUID (0x03/0x07)</span><span>${b.uuid} B</span></div>
            <div class="b-r"><span>厂商块 (0xFF = 2+2+${f.mfgData.length})</span><span>${b.mfg} B</span></div>
            <div class="b-r tot ${over ? 'over' : ''}"><span>合计 ${over ? '· 超限，启动将被拦截（不静默截断）' : ''}</span><span>${b.total} / 31 B</span></div>`;
    }

    const errEl = document.getElementById('broadcastUuidErr');
    if (errEl) errEl.style.display = uuidOk ? 'none' : 'flex';
    state.broadcastUuidError = !uuidOk;

    const startBtn = document.getElementById('startBroadcastButton');
    if (startBtn && !state.advertising) startBtn.disabled = over || !uuidOk || state.broadcastUnsupported;
}

// P008 广播状态徽章（正典：广播中 on / 失败 err / 已就绪 warn / 未就绪 dim）+ 输入禁用
function updateBroadcastStatus(state) {
    const badge = document.getElementById('broadcastStateBadge');
    const startBtn = document.getElementById('startBroadcastButton');
    const stopBtn = document.getElementById('stopBroadcastButton');
    const lock = document.getElementById('broadcastNameLock');
    const words = { advertising: ['on', '广播中'], failed: ['err', '失败'], ready: ['warn', '已就绪'], idle: ['dim', '未就绪'] };
    const [tone, word] = words[state] || words.idle;

    if (badge) {
        badge.className = 'badge ' + tone;
        badge.innerHTML = `<i class="dot"></i>${word}`;
    }
    const advertising = state === 'advertising';
    ['broadcastName', 'broadcastServiceUuid', 'broadcastManufacturerId', 'broadcastManufacturerData'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = advertising;
    });
    if (lock) lock.style.display = advertising ? '' : 'none';
    if (startBtn) startBtn.style.display = advertising ? 'none' : 'inline-flex';
    if (stopBtn) stopBtn.style.display = advertising ? 'inline-flex' : 'none';
}

// P008 广播日志（cardv 白卡 + F026 脱敏漏斗）
function bLog(type, msg) {
    const text = window.SmartBLELogRedaction ? window.SmartBLELogRedaction.sanitizeLogString(msg) : msg;
    const panel = document.getElementById('broadcastLogPanel');
    if (panel) panel.addLog(type, text);
}

// P008 检查支持（平台原生层口径：mac=btleplug 受限 / win·linux 不支持）
function checkBroadcastSupport() {
    const uc = navigator.userAgent.toLowerCase();
    const isMac = uc.includes('mac') || uc.includes('darwin');
    const isWin = uc.includes('win');
    state.broadcastOsName = isMac ? 'macOS' : isWin ? 'Windows' : 'Linux';
    state.broadcastUnsupported = !isMac;
    state.broadcastSupportChecked = true;

    updateBroadcastStatus(isMac ? 'ready' : 'idle');
    const layer = isMac ? 'btleplug/CoreBluetooth' : isWin ? 'WinRT' : 'BlueZ';
    bLog('info', `桌面原生层 ${layer}（${state.broadcastOsName}）——${isMac ? '外围能力受限，以实测为准（10_platform §2.4）' : '底层严格限制 BLE 外设广播'}`);
    if (!isMac) {
        bLog('info', '请使用手机客户端执行虚拟外设测试');
    }
    updateByteBudget();
}

async function startAdvertising() {
    const f = readBroadcastForm();
    const b = calcAdvertiseBytes(f);

    if (state.broadcastUuidError) {
        bLog('error', 'UUID 非法：需为 4 / 8 / 36 位十六进制');
        return;
    }
    if (b.total > 31) {
        bLog('error', `广播数据超限：当前 ${b.total} 字节，BLE 最多支持 31 字节（不静默截断）`);
        return;
    }

    if (state.broadcastUnsupported) {
        bLog('error', `当前平台（${state.broadcastOsName || '此系统'}）底层严格限制 BLE 外设广播，启动已拦截`);
        bLog('info', '请使用手机客户端执行虚拟外设测试');
        return;
    }

    try {
        bLog('info', `启动广播 · 名称 ${f.name} · UUID ${f.uuid || '—'} · 厂商 0x${f.mfgId || '0000'}`);
        const result = await invoke('start_advertising', {
            name: f.name,
            serviceUuids: f.uuid ? [f.uuid] : [],
            manufacturerId: f.mfgId,
            manufacturerData: f.mfgData,
            includeName: true
        });
        if (result.success) {
            state.advertising = true;
            updateBroadcastStatus('advertising');
            bLog('success', `广播已启动 · ${f.name}`);
        } else {
            updateBroadcastStatus('failed');
            bLog('error', `广播启动失败: ${result.error}`);
            bLog('info', PERIPHERAL_SUPPORT.recommendation);
        }
    } catch (error) {
        updateBroadcastStatus('failed');
        bLog('error', `广播启动失败: ${error}`);
        bLog('info', PERIPHERAL_SUPPORT.recommendation);
    }
}

async function stopAdvertising() {
    try {
        const result = await invoke('stop_advertising');
        if (result.success) {
            state.advertising = false;
            updateBroadcastStatus(state.broadcastSupportChecked && !state.broadcastUnsupported ? 'ready' : 'idle');
            bLog('info', '广播已停止');
        }
    } catch (error) {
        bLog('error', `停止广播失败: ${error}`);
    }
}

// Update broadcast UI based on platform（P008：平台 chip + 初始徽章态 + 预算首算；旧平台说明列表由广播日志承接）
function updateBroadcastPlatformInfo() {
    const uc = navigator.userAgent.toLowerCase();
    const osName = (uc.includes('mac') || uc.includes('darwin')) ? 'macOS' : uc.includes('win') ? 'Windows' : 'Linux';
    const chip = document.getElementById('broadcastPlatformChip');
    if (chip) chip.textContent = `平台：Desktop · ${osName}`;
    updateBroadcastStatus('idle');
    updateByteBudget();
}

function addLog(type, message) {
    // F026：渲染端日志唯一漏斗，统一脱敏（uniapp logger/log-redaction.js 锁定镜像）
    const text = window.SmartBLELogRedaction ? window.SmartBLELogRedaction.sanitizeLogString(message) : message;
    const panel = document.getElementById('mainLogPanel');
    if (panel) panel.addLog(type, text);
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

    // P006：清面板态与 OTA 入口（连接保留）
    const gattPanel = document.getElementById('gattPanel');
    if (gattPanel) gattPanel.innerHTML = '';
    const otaBtn = document.getElementById('otaButton');
    if (otaBtn) otaBtn.style.display = 'none';

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

// escapeHtml 顶层函数由 BleUtils.js 提供（经典脚本共享全局），此处不得重复声明
// （重复声明会使整个 app.js 实例化失败——P7 真机走查实测教训）。

// ═════════════════════════════════════════════════════════════════════
// Smart HID 线（P002 配网 / P003 详情 / P005 诊断 · PARITY-002 桌面接入）
// 正典：prototype/platform/desktop/high-fi/pages/{p002,p003,p005}-*.js
//       + uniapp composables/use-smart-hid-provisioning.js 编排语义。
// F023 红线：token / 密码仅作 submit 参数（内存），不写日志 / 不落存储。
// ═════════════════════════════════════════════════════════════════════

// 正典 toast（#toasts 容器 + 深色胶囊；与 E-WIN app.js 同型）
function showToast(message, type = 'info') {
    const host = document.getElementById('toasts') || document.body;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'success') {
        toast.innerHTML = '<span class="ok-i"><svg class="ic xs" aria-hidden="true"><use href="#i-check"/></svg></span>';
    }
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    host.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}


// hid-service（字节镜像 E-WIN）的 Tauri invoke/listen 适配层
function tauriHidAdapter() {
    return {
        connect: (id) => invoke('connect', { deviceId: id }),
        disconnect: (id) => invoke('disconnect', { deviceId: id }),
        discoverServices: (id) => invoke('discover_services', { deviceId: id }),
        readCharacteristic: (id, serviceUuid, charUuid) =>
            invoke('read_characteristic', { deviceId: id, serviceUuid, charUuid }),
        writeRaw: (id, serviceUuid, charUuid, data, withoutResponse) =>
            invoke('write_raw', { deviceId: id, serviceUuid, charUuid, data, writeWithResponse: !withoutResponse }),
        notifyCharacteristic: (id, serviceUuid, charUuid, notify) =>
            invoke('notify_characteristic', { deviceId: id, serviceUuid, charUuid, notify }),
        onCharacteristicValueChanged: (cb) => {
            let stop = null;
            listen('notification-received', (e) => {
                const p = e.payload || {};
                cb({ deviceId: p.deviceId, characteristicUuid: p.charUuid, value: p.value });
            }).then((unlisten) => { stop = unlisten; }).catch(() => {});
            return () => { try { stop?.(); } catch (e) { /* noop */ } };
        },
        onDeviceDisconnected: (cb) => {
            let stop = null;
            listen('device-disconnected', (e) => {
                cb({ id: (e.payload || {}).deviceId });
            }).then((unlisten) => { stop = unlisten; }).catch(() => {});
            return () => { try { stop?.(); } catch (e) { /* noop */ } };
        }
    };
}

function attachHidService() {
    if (!window.SmartHidDesktop) return;
    try {
        hid.svc = window.SmartHidDesktop.attach(tauriHidAdapter());
        hid.svc.onSessionDisconnect(() => hidHandleLost());
        hid.svc.onStatus((status) => {
            if (hid.prov && hid.prov.phase === 'status' && status) {
                hid.prov.progress = window.SmartHidDesktop.deriveProgress(status, hid.prov.progress);
                hidRenderProgressCard();
            }
        });
    } catch (e) {
        console.error('attachHidService failed:', e);
    }
}

// 二级页视图切换（class active 机制；switchTab 同口径清内联 display）
function showHidView(viewId) {
    document.querySelectorAll('.tabbar .tb').forEach(btn => btn.classList.remove('on'));
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
        view.style.display = '';
    });
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');
}

// ---- P002 配网向导 ----------------------------------------------------

function openHidProvision(device) {
    if (!hid.svc) {
        showToast('Smart HID 模块未加载', 'error');
        return;
    }
    hid.prov = {
        device,
        phase: 'connect',
        connecting: false,
        connError: '',
        connErrorCode: '',
        lost: false,
        ssid: '',
        pwd: '',
        hub: '',
        pairing: null,
        provisioning: false,
        done: false,
        err: null,
        progress: window.SmartHidDesktop.initialProgress()
    };
    showHidView('hidProvisionView');
    hidRenderWizard();
    hidConnect();
}

function hidStepIndex() {
    const p = hid.prov;
    if (!p) return 0;
    return p.phase === 'connect' ? 0 : p.phase === 'configure' ? 1 : 2;
}

function hidStepperHtml(current) {
    const steps = ['连接设备', '填写配置', '下发状态'];
    return steps.map((label, i) => {
        const cls = i < current ? 'st done' : i === current ? 'st cur' : 'st';
        const node = `<div class="${cls}"><div class="n">${i < current ? '✓' : i + 1}</div><div class="lb">${label}</div></div>`;
        return (i > 0 ? `<div class="ln ${i <= current ? 'done' : ''}"></div>` : '') + node;
    }).join('');
}

function hidRenderWizard() {
    const p = hid.prov;
    if (!p) return;

    document.getElementById('hidProvStepper').innerHTML = hidStepperHtml(hidStepIndex());
    document.getElementById('hidProvAva').textContent = ((p.device?.name || 'S').trim()[0] || 'S').toUpperCase();
    document.getElementById('hidProvDevName').textContent = p.device?.name || 'Smart HID 设备';
    document.getElementById('hidProvDevId').textContent = `${p.device?.id || '—'}${p.done || p.phase === 'status' ? ' · Device Info 已验证' : ''}`;

    const show = (id, visible) => {
        const el = document.getElementById(id);
        if (el) el.hidden = !visible;
    };
    show('hidProvConnectPhase', p.phase === 'connect');
    show('hidProvConfigurePhase', p.phase === 'configure');
    show('hidProvStatusPhase', p.phase === 'status');

    // 阶段一
    show('hidProvConnecting', p.phase === 'connect' && p.connecting);
    show('hidProvConnError', p.phase === 'connect' && !p.connecting && Boolean(p.connError));
    if (p.connError) document.getElementById('hidProvConnErrorText').textContent = p.connError;
    const connCodeEl = document.getElementById('hidProvConnErrorCode');
    if (connCodeEl) {
        connCodeEl.textContent = p.connErrorCode || '';
        connCodeEl.style.display = p.connErrorCode ? '' : 'none';
    }

    // 阶段二
    show('hidProvLostBanner', p.lost);
    show('hidProvLostActions', p.lost);
    const badge = document.getElementById('hidProvConnBadge');
    badge.className = 'badge ' + (p.lost ? 'err' : 'on');
    document.getElementById('hidProvConnWord').textContent = p.lost ? '已断开' : '已连接';
    const info = hid.svc?.getDeviceInfo();
    document.getElementById('hidProvDevSummary').textContent = info
        ? `${info.device_id} · fw ${info.firmware} · ${info.state}`
        : (p.device?.id || '');
    document.getElementById('hidProvRejoinWord').textContent = p.connecting ? '重连中…' : '重新连接设备';
    const ssidInput = document.getElementById('hidSsidInput');
    const hubInput = document.getElementById('hidHubInput');
    if (ssidInput && document.activeElement !== ssidInput) ssidInput.value = p.ssid;
    if (hubInput && document.activeElement !== hubInput) hubInput.value = p.hub;
    const qrReady = Boolean(p.pairing?.token);
    document.getElementById('hidQrTitle').textContent = qrReady ? '重新获取配对码（已回填）' : '获取 ControlHub 配对码';
    document.getElementById('hidQrDesc').textContent = qrReady
        ? 'token 已获取（内存会话，不落盘）；地址仍可修改'
        : '粘贴 / 手输 shid://pair 配对码，自动回填地址与令牌';
    const qrBadge = document.getElementById('hidQrBadge');
    qrBadge.className = 'chip ' + (qrReady ? 'success' : 'warning');
    qrBadge.textContent = qrReady ? '已获取' : '必需';
    document.getElementById('hidQrBigact').classList.toggle('got', qrReady);
    hidUpdateSubmitState();

    // 阶段三
    show('hidProvDoneCard', p.done);
    show('hidProvErrBlock', !p.done && Boolean(p.err));
    document.getElementById('hidProvWaitingBlock').style.display = (!p.done && !p.err) ? '' : 'none';
    if (p.err) {
        document.getElementById('hidProvErrCode').textContent = p.err.code || 'provision_failed';
        document.getElementById('hidProvErrText').textContent = p.err.msg || '';
        const rec = document.getElementById('hidRecoveryButton');
        rec.textContent = ({
            diagnostics: '进入诊断',
            pairing: '重新获取配对码',
            form: '修改配置',
            retry: '重新下发'
        }[p.err.recovery] || '重试');
    }
    hidRenderProgressCard();
}

function hidRenderProgressCard() {
    const p = hid.prov;
    const card = document.getElementById('hidProvProgressCard');
    if (!p || !card) return;
    const rows = [
        ['wifi', 'Wi-Fi 连接'],
        ['hub', 'ControlHub 配对'],
        ['conn', 'MQTT 控制链路'],
        ['usb', 'USB HID Ready']
    ];
    card.innerHTML = rows.map(([key, label]) => {
        const st = p.progress[key] || 'pending';
        const glyph = st === 'done' ? '✓' : st === 'fail' ? '✕' : '·';
        const dt = (p.err && p.err.row === key) ? `<span class="dt mono">${p.err.code}</span>` : '';
        return `<div class="prow ${st}"><span class="st-i">${glyph}</span><span class="t">${label}</span>${dt}</div>`;
    }).join('');
}

function hidUpdateSubmitState() {
    const p = hid.prov;
    const btn = document.getElementById('hidSubmitButton');
    if (!p || !btn) return;
    const can = Boolean(p.ssid.trim() && p.hub.trim() && p.pairing?.token && !p.provisioning);
    btn.disabled = !can;
}

async function hidConnect() {
    const svc = hid.svc;
    const p = hid.prov;
    if (!svc || !p) return;
    p.phase = 'connect';
    p.connecting = true;
    p.connError = '';
    p.connErrorCode = '';
    hidRenderWizard();
    addLog('info', `[SmartHID] 连接 ${p.device.id} 并验证 Device Info…`);
    try {
        const { info } = await svc.connect(p.device.id);
        p.connecting = false;
        p.lost = false;
        p.phase = 'configure';
        addLog('success', `[SmartHID] device ${info.device_id} fw=${info.firmware} state=${info.state}`);
    } catch (error) {
        p.connecting = false;
        p.connError = error?.message || '连接失败，请靠近设备后重试。';
        p.connErrorCode = error?.code || '';
        addLog('error', `[SmartHID] 连接失败: ${p.connError}`);
    }
    hidRenderWizard();
}

function hidHandleLost() {
    const p = hid.prov;
    if (!p) return;
    if (p.phase === 'configure') {
        p.lost = true;
        hidRenderWizard();
        showToast('设备连接已断开，请重新连接后再下发', 'error');
    }
}

function hidTogglePwdEye() {
    const input = document.getElementById('hidPwdInput');
    const eye = document.getElementById('hidPwdEye');
    if (!input || !eye) return;
    const showPlain = input.type === 'password';
    input.type = showPlain ? 'text' : 'password';
    eye.querySelector('use')?.setAttribute('href', showPlain ? '#i-eye-off' : '#i-eye');
}

// 通用小弹层（.mask/.modal 正典壳；按钮数组驱动）
function hidShowModal({ title, bodyHtml, buttons, onMount }) {
    hidCloseModal();
    const mask = document.createElement('div');
    mask.className = 'mask';
    mask.id = 'hidModalMask';
    mask.innerHTML = `
        <div class="modal" style="max-width:440px">
            <div class="t">${title}</div>
            <div class="m-body" id="hidModalBody">${bodyHtml || ''}</div>
            <div style="display:flex;gap:9px;margin-top:14px" id="hidModalActs"></div>
        </div>`;
    document.body.appendChild(mask);
    const acts = mask.querySelector('#hidModalActs');
    for (const btn of buttons || []) {
        const el = document.createElement('button');
        el.className = 'btn ' + (btn.tone || 'soft') + ' sm';
        el.style.flex = '1';
        el.textContent = btn.label;
        el.addEventListener('click', () => {
            if (btn.onClick?.(mask) !== false) hidCloseModal();
        });
        acts.appendChild(el);
    }
    onMount?.(mask);
    return mask;
}

function hidCloseModal() {
    document.getElementById('hidModalMask')?.remove();
}

// F020 配对码（桌面口径 10_platform §2.4：粘贴 / 手输兜底为主路径）
function hidOpenQrSheet() {
    const p = hid.prov;
    if (!p) return;
    hidShowModal({
        title: '粘贴 / 手输配对码',
        bodyHtml: `
            <div class="note info" style="margin:0 0 10px">
                <div>粘贴 ControlHub 屏显 <span class="mono">shid://pair</span> 二维码内容，识别后自动回填地址与令牌（纯前端解析，不落盘）。</div>
            </div>
            <div class="field"><label>配对码内容 <span class="req">*</span></label>
                <div class="inp"><input class="mono" id="hidQrPasteInput" placeholder="shid://pair?token=…&host=…&port=17892"></div>
                <div class="err-line" id="hidQrPasteErr" style="display:none"></div>
            </div>`,
        buttons: [
            { label: '解析并回填', tone: 'primary', onClick: () => hidParseQrInput() },
            { label: '取消', tone: 'soft' }
        ],
        onMount: (mask) => {
            const input = mask.querySelector('#hidQrPasteInput');
            input?.focus();
            input?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (hidParseQrInput() !== false) hidCloseModal();
                }
            });
        }
    });
}

function hidParseQrInput() {
    const p = hid.prov;
    const input = document.getElementById('hidQrPasteInput');
    const errLine = document.getElementById('hidQrPasteErr');
    if (!p || !hid.svc || !input) return false;
    const payload = hid.svc.parseQr(input.value);
    if (!payload) {
        if (errLine) {
            errLine.style.display = '';
            errLine.textContent = '未识别到有效配对码（非 shid://pair 或缺少/非法参数）';
        }
        return false;
    }
    p.pairing = payload;
    p.hub = window.SmartHidDesktop.formatControlHubAddress(payload);
    addLog('success', '[SmartHID] 配对码已解析 · 地址与令牌已回填（token 不落日志）');
    showToast('配对码已解析 · 地址与令牌已回填', 'success');
    hidRenderWizard();
    return true;
}

async function hidSubmit() {
    const svc = hid.svc;
    const p = hid.prov;
    if (!svc || !p) return;
    if (!p.pairing?.token) {
        showToast('请先获取 ControlHub 配对码', 'error');
        return;
    }
    let candidate;
    try {
        candidate = window.SmartHidDesktop.buildProvisionFormCandidate({
            wifiSsid: p.ssid,
            wifiPassword: p.pwd,
            hubAddress: p.hub,
            token: p.pairing.token
        });
    } catch (error) {
        showToast(error?.message || '请检查配网信息', 'error');
        return;
    }

    p.phase = 'status';
    p.provisioning = true;
    p.done = false;
    p.err = null;
    p.progress = window.SmartHidDesktop.initialProgress();
    hidRenderWizard();
    addLog('info', `[SmartHID] 下发 candidate：${candidate.wifi_ssid} → ${candidate.hub_host}:${candidate.hub_port}`);

    try {
        const { ok, status } = await svc.provisionAndWait(candidate, 60000);
        if (!ok) {
            const err = new Error(window.SmartHid.describeSmartHidStatus(status));
            err.status = status;
            throw err;
        }
        p.provisioning = false;
        p.done = true;
        const info = svc.getDeviceInfo() || {};
        svc.commitKnownDevice({
            deviceId: p.device.id,
            name: p.device.name || info.device_id || 'Smart HID',
            protocol: info.protocol || '',
            firmware: info.firmware || '—',
            lastWifi: p.ssid,
            lastHub: p.hub
        });
        addLog('success', '[SmartHID] 配网完成 · 设备 READY');
    } catch (error) {
        p.provisioning = false;
        const message = error?.message || '配网失败';
        if (/取消/.test(message)) {
            p.phase = 'configure';
            p.err = null;
            p.progress = window.SmartHidDesktop.initialProgress();
            showToast('已取消等待', 'info');
            hidRenderWizard();
            return;
        }
        const offline = !svc.isConnected();
        if (error?.status) {
            p.err = {
                code: error.status.error || error.status.state || 'provision_failed',
                msg: message,
                recovery: window.SmartHid.smartHidRecoveryAction(error.status)
            };
        } else {
            p.err = {
                code: offline ? 'ble_disconnected' : 'provision_failed',
                msg: offline ? '设备 BLE 连接已断开，重新连接后可继续下发' : message,
                recovery: offline ? 'retry' : window.SmartHid.smartHidRecoveryAction('provision_failed')
            };
        }
        addLog('error', `[SmartHID] 配网失败: ${p.err.code} · ${p.err.msg}`);
    }
    hidRenderWizard();
}

function hidCancelWait() {
    const p = hid.prov;
    if (!hid.svc || !p || !p.provisioning) return;
    hid.svc.cancelProvisionWait('用户已取消等待');
    p.provisioning = false;
    p.phase = 'configure';
    p.err = null;
    p.progress = window.SmartHidDesktop.initialProgress();
    showToast('已取消等待', 'info');
    hidRenderWizard();
}

function hidRunRecovery() {
    const p = hid.prov;
    if (!p || !p.err) return;
    const action = p.err.recovery;
    if (action === 'diagnostics') {
        openHidDiagnostics(p.device.id);
        return;
    }
    if (action === 'pairing') {
        p.pairing = null;
        p.phase = 'configure';
        p.err = null;
        hidRenderWizard();
        hidOpenQrSheet();
        return;
    }
    if (action === 'form') {
        p.phase = 'configure';
        p.err = null;
        hidRenderWizard();
        return;
    }
    // retry：连接不在则先重连，再重新下发
    hidRetryProvision();
}

async function hidRetryProvision() {
    const svc = hid.svc;
    const p = hid.prov;
    if (!svc || !p) return;
    if (!svc.isConnected()) {
        p.err = null;
        await hidConnect();
        if (p.phase !== 'configure') return;
    }
    p.err = null;
    hidSubmit();
}

// U-01 离开确认（配网中 → modal 确认；对齐 uniapp confirmLeaveIfNeeded）
function hidLeaveProvision() {
    const p = hid.prov;
    if (!p || !p.provisioning) {
        switchTab('scan');
        return;
    }
    hidShowModal({
        title: '配网进行中',
        bodyHtml: '<div style="font-size:var(--fs-body);color:var(--c-sub);line-height:1.6">离开将取消等待设备状态。确定离开吗？</div>',
        buttons: [
            { label: '确定离开', tone: 'primary', onClick: () => { hidCancelWait(); switchTab('scan'); } },
            { label: '继续等待', tone: 'soft' }
        ]
    });
}

// ---- P003 设备详情（会话级内存快照） -----------------------------------

function openHidDetail() {
    const snapshot = hid.svc?.getKnownDevice?.() || null;
    const body = document.getElementById('hidDetailBody');
    if (!body) return;
    if (!snapshot) {
        body.innerHTML = `
            <div class="empty" style="margin-top:12px">
                <div class="ill"><svg width="118" height="86" viewBox="0 0 118 86" fill="none">
                    <rect x="20" y="14" width="78" height="58" rx="6" stroke="#E3EAF3" stroke-width="2"/>
                    <path d="M32 30h54M32 42h54M32 54h34" stroke="#9AA8B6" stroke-width="2" stroke-linecap="round"/></svg></div>
                <div class="t">设备记录不存在</div>
                <div class="d">该设备快照已随会话结束释放，请重新配网后查看。</div>
            </div>`;
    } else {
        const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const kv = (k, v, mono) => `<div class="kv"><span class="k">${k}</span><span class="v${mono ? ' mono' : ''}">${esc(v) || '<span class="dim">—</span>'}</span></div>`;
        body.innerHTML = `
            <div class="card" style="margin-top:12px;display:flex;gap:13px;align-items:center">
                <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#D9F6F0,#E2F8F4);color:#0E9A80;display:flex;align-items:center;justify-content:center">
                    <svg class="ic lg" aria-hidden="true"><use href="#i-hid"/></svg></div>
                <div style="flex:1;min-width:0">
                    <div style="font-size:var(--fs-h1);font-weight:var(--fw-xbold)">${esc(snapshot.name || 'Smart HID 设备')}</div>
                    <div style="margin-top:4px"><span class="badge on"><span class="dot"></span><span>配置成功 · READY</span></span></div>
                </div>
            </div>
            <div class="card">
                <div class="card-t"><svg class="ic sm" aria-hidden="true"><use href="#i-chip"/></svg> 设备身份</div>
                ${kv('Device ID', snapshot.deviceId, true)}
                ${kv('协议版本', snapshot.protocol ? `Smart HID ${snapshot.protocol}` : '')}
                ${kv('固件版本', snapshot.firmware, true)}
                ${snapshot.protocol ? '' : '<div style="margin-top:8px"><span class="chip neutral">协议未记录</span></div>'}
            </div>
            <div class="card">
                <div class="card-t"><svg class="ic sm" aria-hidden="true"><use href="#i-wifi"/></svg> 最近配置</div>
                ${kv('Wi-Fi', snapshot.lastWifi)}
                ${kv('ControlHub', snapshot.lastHub, true)}
            </div>
            <div class="note info" style="margin-top:4px">
                <svg class="ic sm" aria-hidden="true"><use href="#i-info"/></svg>
                <div>本页为<b>本次配网会话的内存快照</b>，退出应用后不再可见（零本地持久化）。重新配置前需让设备进入配网模式。</div>
            </div>
            <div style="margin-top:16px;display:flex;flex-direction:column;gap:9px">
                <button class="btn primary" id="hidDetailReconfig" style="width:100%"><svg class="ic sm" aria-hidden="true"><use href="#i-refresh"/></svg><span>重新配置</span></button>
                <div style="display:flex;gap:9px">
                    <button class="btn soft" id="hidDetailDiag" style="flex:1"><svg class="ic sm" aria-hidden="true"><use href="#i-pulse"/></svg><span>运行诊断</span></button>
                    <button class="btn soft" id="hidDetailGatt" style="flex:1"><svg class="ic sm" aria-hidden="true"><use href="#i-set"/></svg><span>高级 BLE 调试</span></button>
                </div>
            </div>`;
        const deviceId = snapshot.deviceId;
        const name = snapshot.name;
        body.querySelector('#hidDetailReconfig')?.addEventListener('click', () => {
            openHidProvision({ id: deviceId, name });
        });
        body.querySelector('#hidDetailDiag')?.addEventListener('click', () => {
            openHidDiagnostics(deviceId);
        });
        body.querySelector('#hidDetailGatt')?.addEventListener('click', () => {
            const device = state.devices.get(deviceId) || { id: deviceId, name };
            state.currentDevice = device;
            showDeviceDetail();
        });
    }
    showHidView('hidDetailView');
}

// ---- P005 五项诊断 ----------------------------------------------------

function openHidDiagnostics(deviceId) {
    if (!hid.svc) {
        showToast('Smart HID 模块未加载', 'error');
        return;
    }
    const session = hid.svc.getSessionState();
    hid.diag = {
        deviceId,
        state: session.connected && session.deviceId === deviceId ? 'connected' : 'offline',
        rows: null,
        error: null,
        connecting: false,
        showErr: false
    };
    showHidView('hidDiagnosticsView');
    hidRenderDiag();
}

function hidRenderDiag() {
    const d = hid.diag;
    const body = document.getElementById('hidDiagBody');
    if (!d || !body) return;
    const word = ({
        idle: '尚未检测',
        connected: '设备已连接可开始检测',
        checking: '正在读取实时状态…',
        live: '实时检测完成',
        offline: '设备未连接',
        error: '检测失败'
    })[d.state];
    const tone = d.state === 'live' ? 'on' : (d.state === 'error' || d.state === 'offline') ? 'err' : 'dim';
    const defaults = [
        ['ble', 'BLE 链路'], ['wifi', 'Wi-Fi 连接'], ['hub', 'ControlHub'],
        ['conn', '控制连接 (MQTT)'], ['usb', '设备 Ready 状态']
    ];
    const rows = (d.rows || defaults.map(([key, label]) => ({ key, label, state: 'pending', detail: '' })));
    const wordMap = { pending: '待检测', active: '检测中', ok: '正常', warn: '异常', fail: '失败' };
    const rowsHtml = rows.map((r) => {
        const icon = r.state === 'ok' ? '<svg class="ic sm" aria-hidden="true"><use href="#i-check"/></svg>'
            : r.state === 'warn' ? '<svg class="ic sm" aria-hidden="true"><use href="#i-warn"/></svg>'
                : r.state === 'fail' ? '<svg class="ic sm" aria-hidden="true"><use href="#i-x"/></svg>'
                    : '·';
        return `<div class="diag ${r.state}"><span class="ico">${icon}</span>
            <div style="flex:1"><div style="display:flex;align-items:center"><span class="t">${r.label}</span>
            <span class="word">${wordMap[r.state] || r.state}</span></div>
            ${r.detail ? `<div class="dt">${r.detail}</div>` : ''}</div></div>`;
    }).join('');
    body.innerHTML = `
        <div class="card" style="margin-top:12px;display:flex;align-items:center;gap:10px">
            <span class="badge ${tone}"><span class="dot"></span><span>${word}</span></span>
            <span class="mono" style="font-size:var(--fs-mini);color:var(--c-mut)">${d.deviceId}</span></div>
        <div class="card">${rowsHtml}</div>
        ${d.error ? `
        <div class="op ${d.state === 'error' ? 'err' : 'warn'}" style="margin-bottom:12px">
            <div><div class="t">错误详情</div><div class="d">${d.error.message}</div></div></div>
        <button class="btn ghost sm" id="hidDiagToggleErr" style="width:100%">${d.showErr ? '隐藏错误码' : '显示错误码（详细信息）'}</button>
        ${d.showErr ? `<div class="ad-sec" style="margin-top:10px"><div class="hd"><span>code</span></div><div class="hex mono" style="color:#FF8B94">${d.error.code}</div></div>` : ''}` : ''}
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:9px">
            <button class="btn primary" id="hidDiagRun" style="width:100%" ${d.connecting || d.state === 'checking' ? 'disabled' : ''}>
                <svg class="ic sm" aria-hidden="true"><use href="#i-refresh"/></svg><span>${d.connecting || d.state === 'checking' ? '检测中…' : '重新检测'}</span></button>
            <div style="display:flex;gap:9px">
                <button class="btn soft" id="hidDiagGoDetail" style="flex:1"><svg class="ic sm" aria-hidden="true"><use href="#i-chev-r"/></svg><span>返回设备详情</span></button>
                <button class="btn soft danger-t" id="hidDiagReprov" style="flex:1"><svg class="ic sm" aria-hidden="true"><use href="#i-refresh"/></svg><span>重新配网</span></button>
            </div>
        </div>`;
    body.querySelector('#hidDiagRun')?.addEventListener('click', () => hidRunDiagnose());
    body.querySelector('#hidDiagGoDetail')?.addEventListener('click', () => openHidDetail());
    body.querySelector('#hidDiagReprov')?.addEventListener('click', () => openHidProvision({ id: d.deviceId, name: hid.svc?.getKnownDevice()?.name }));
    body.querySelector('#hidDiagToggleErr')?.addEventListener('click', () => {
        d.showErr = !d.showErr;
        hidRenderDiag();
    });
}

async function hidRunDiagnose() {
    const svc = hid.svc;
    const d = hid.diag;
    if (!svc || !d) return;
    d.error = null;
    const session = svc.getSessionState();
    if (!session.connected || session.deviceId !== d.deviceId) {
        d.connecting = true;
        d.state = 'connected';
        hidRenderDiag();
        try {
            await svc.connect(d.deviceId);
        } catch (error) {
            d.connecting = false;
            d.state = 'error';
            d.error = { code: 'connect_failed', message: error?.message || '连接失败' };
            hidRenderDiag();
            return;
        }
        d.connecting = false;
    }
    d.state = 'checking';
    hidRenderDiag();
    try {
        d.rows = await svc.diagnose();
        d.state = 'live';
        addLog('info', `[SmartHID] 诊断完成：${d.rows.map((r) => `${r.label}=${r.state}`).join(' · ')}`);
    } catch (error) {
        d.state = 'error';
        d.error = { code: 'diag_failed', message: error?.message || '读取设备状态失败' };
        addLog('error', `[SmartHID] 诊断失败: ${d.error.message}`);
    }
    hidRenderDiag();
}

// ── Entry Point ───────────────────────────────────────────────
// F030：产品决议不做国际化——UI 文案硬编码中文，无语言切换（正典 R30 现状确认）。
document.addEventListener('DOMContentLoaded', async () => {
    await init();
});
