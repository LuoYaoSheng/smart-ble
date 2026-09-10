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

        // E2E UI Testing Mock Fallback (Polyfill bleAPI if running strictly in browser)
        if (this.USE_MOCK_BLE && !window.bleAPI) {
            console.warn('[MOCK] Polyfilling window.bleAPI for Playwright test environment');
            window.bleAPI = {
                init: async () => ({ success: true }),
                startScan: async () => ({ success: true }),
                stopScan: async () => ({ success: true }),
                connect: async (id) => {
                    setTimeout(() => window.appInstance.onDeviceConnected(id), 500);
                    return { success: true };
                },
                disconnect: async (id) => {
                    setTimeout(() => window.appInstance.onDeviceDisconnected(id), 100);
                    return { success: true };
                },
                discoverServices: async (id) => {
                    const data = [
                        { uuid: '180A', name: 'Device Info', characteristics: [{ uuid: '2A29', properties: ['read'] }] },
                        { uuid: '4FAFC201-1FB5-459E-8FCC-C5C9C331914D', name: 'OTA Service', characteristics: [] }
                    ];
                    setTimeout(() => window.appInstance.onServicesDiscovered({ deviceId: id, services: data }), 100);
                    return { success: true, data };
                },
                readCharacteristic: async () => ({ success: true, value: 'Mock Data' }),
                writeCharacteristic: async () => ({ success: true }),
                writeRaw: async () => ({ success: true }),
                notifyCharacteristic: async () => ({ success: true }),
                onStateChange: () => {},
                onDeviceDiscovered: () => {},
                onDeviceConnected: () => {},
                onDeviceDisconnected: () => {},
                onServicesDiscovered: () => {},
                onCharacteristicValueChanged: () => {}
            };
        }

        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupEventListeners(); // 先设置监听器
        this.renderAboutPage(); // F027/F028/F029：关于页投影（版本三态/推广卡/平台状态）
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

        // F027/F028/F029：关于页二级导航与分享（桌面口径）
        document.getElementById('goVersionsLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showVersionsView();
        });
        document.getElementById('versionsBackButton')?.addEventListener('click', () => {
            this.switchTab('about');
        });
        document.getElementById('shareAppLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.shareApp();
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

        // OTA button (connected-view header; dialog element id is mainOtaDialog)
        document.getElementById('otaButton')?.addEventListener('click', () => {
            if (this.currentDevice) {
                const otaDialog = document.getElementById('mainOtaDialog');
                if (otaDialog) otaDialog.show(this.currentDevice.id);
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
                const { serviceUuid, charUuid, data, format, mode } = e.detail;
                if (!this.currentDevice) return;

                const writeOnce = async (payload) => {
                    const result = await window.bleAPI.writeCharacteristic(
                        this.currentDevice.id,
                        serviceUuid,
                        charUuid,
                        payload,
                        format
                    );
                    return result;
                };

                // C9 写入分段执行（对齐 F-AND 参照实现）
                if (mode === 'batch' && Array.isArray(e.detail.lines)) {
                    const lines = e.detail.lines;
                    this.addLog(`批量发送: ${lines.length} 条指令…`);
                    let ok = 0;
                    let fail = 0;
                    for (const line of lines) {
                        try {
                            const result = await writeOnce(line);
                            if (result.success) { ok++; this.addLog(`写入成功: ${line}`, 'success'); }
                            else { fail++; this.addLog(`写入失败: ${result.error}`, 'error'); }
                        } catch (error) {
                            fail++;
                            this.addLog(`写入失败: ${error.message || error}`, 'error');
                        }
                    }
                    this.addLog(`批量发送完成（成功 ${ok} / 失败 ${fail}）`, fail === 0 ? 'success' : 'error');
                    if (fail === 0) writeDialog.close();
                    return;
                }

                if (mode === 'loop') {
                    const { loopCount, intervalMs } = e.detail;
                    const infinite = !loopCount || loopCount <= 0;
                    const total = infinite ? '∞' : String(loopCount);
                    this._writeLoopCancelled = false;
                    const cancelLoop = () => { this._writeLoopCancelled = true; };
                    writeDialog.addEventListener('close', cancelLoop, { once: true });
                    this.addLog(`循环发送（${total} 次 × ${intervalMs}ms）开始…`);
                    let sent = 0;
                    try {
                        while (!this._writeLoopCancelled && (infinite || sent < loopCount)) {
                            const result = await writeOnce(data);
                            sent++;
                            if (!result.success) {
                                this.addLog(`循环第 ${sent} 次写入失败: ${result.error}`, 'error');
                                break;
                            }
                            this.addLog(`循环发送中 (${sent}/${total})`);
                            if (infinite || sent < loopCount) {
                                await new Promise((r) => setTimeout(r, intervalMs));
                            }
                        }
                        if (this._writeLoopCancelled) {
                            this.addLog(`循环发送已停止（已发 ${sent} 次）`);
                        } else {
                            this.addLog(`循环发送完成（共 ${sent} 次）`, 'success');
                            writeDialog.close();
                        }
                    } catch (error) {
                        this.addLog(`循环发送中断: ${error.message || error}`, 'error');
                    } finally {
                        writeDialog.removeEventListener('close', cancelLoop);
                    }
                    return;
                }

                // 单次（默认，原路径）
                try {
                    const result = await writeOnce(data);
                    if (result.success) {
                        this.addLog(`写入成功: ${data}`, 'success');
                        writeDialog.close();
                    } else {
                        this.addLog(`写入失败: ${result.error}`, 'error');
                    }
                } catch (error) {
                    this.addLog(`写入失败: ${error.message || error}`, 'error');
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
        const versionsView = document.getElementById('versionsView'); // P010

        // Hide all views first
        deviceListView?.classList.remove('active');
        deviceListView.style.display = 'none';
        broadcastView?.classList.remove('active');
        broadcastView.style.display = 'none';
        connectedView?.classList.remove('active');
        connectedView.style.display = 'none';
        aboutView?.classList.remove('active');
        aboutView.style.display = 'none';
        versionsView?.classList.remove('active');
        versionsView.style.display = 'none';

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
        } else if (tab === 'versions') {
            // P010：关于页二级视图，Tab 状态保持「关于」
            versionsView?.classList.add('active');
            versionsView.style.display = 'block';
            this.renderVersionsPage();
        }
    }

    // P010：进入版本记录二级视图
    showVersionsView() {
        this.switchTab('versions');
        const aboutBtn = document.querySelector('.tab-btn[data-tab="about"]');
        aboutBtn?.classList.add('active');
    }

    // P009：关于页投影（结构对齐 docs/specs/prototype/platform/desktop/high-fi/pages/p009-about.js）
    // F027 版本三态 + 平台状态；F028 推广卡桌面线已裁撤；F029 菜单行为不变
    renderAboutPage() {
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

        // P009 三态：基准 = metadata 投影；运行时渠道成功才覆盖
        const chip = document.getElementById('aboutVersionChip');
        const verLine = document.getElementById('aboutVersionLine');
        const applyLabels = (versionLabel) => {
            if (chip) chip.textContent = 'v' + versionLabel;
            if (verLine) verLine.textContent = `v${versionLabel} · ${channel} · 零后端 · 零本地持久化`;
        };
        applyLabels(metadataVersionLabel);
        if (window.bleAPI?.getAppVersion) {
            window.bleAPI.getAppVersion().then((value) => {
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

        // P009 应用信息：当前环境 / 设备型号（preload 暴露的真实宿主信息）
        const osNames = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' };
        const hostPlatform = window.platform?.platform || '';
        const hostArch = window.platform?.arch || '';
        const envValue = document.getElementById('aboutEnvValue');
        if (envValue) {
            const os = osNames[hostPlatform] || navigator.userAgentData?.platform || '—';
            envValue.textContent = `Desktop · ${os}`;
        }
        const modelValue = document.getElementById('aboutModelValue');
        if (modelValue) {
            modelValue.textContent = hostArch ? `PC · ${hostArch}` : '—';
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
        const feedbackRow = document.getElementById('aboutFeedbackRow');
        if (feedbackRow) feedbackRow.href = PRODUCT.PRODUCT_INFO.feedback;
    }

    // P010：版本记录页（Release Metadata 纯投影，禁止手写版本事实）
    renderVersionsPage() {
        const VM = window.SmartBLEVersionMetadata;
        const body = document.getElementById('versionsBody');
        if (!body) return;
        if (!VM) {
            body.innerHTML = '<p class="versions-empty">版本元数据不可用（dev.unknown）</p>';
            return;
        }

        const model = VM.getVersionPageModel();
        const c = model.current;
        const esc = (s) => String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const platformRows = c.platforms.map((p) =>
            `<tr><td>${esc(p.name)}</td><td>${esc(p.display_status)}</td></tr>`).join('');
        const limitationItems = c.limitations.map((x) => `<li>${esc(x)}</li>`).join('');

        const releaseItems = model.history.releases.length
            ? model.history.releases.map((r) => `
                <div class="versions-release-card">
                    <div class="versions-release-head">
                        <span class="versions-release-tag">${esc(r.tag)}</span>
                        <span class="versions-release-status">${esc(r.status)}</span>
                    </div>
                    <div class="versions-release-meta">${esc(r.version)} · Release · ${esc(r.built_at || '')}</div>
                </div>`).join('')
            : '<p class="versions-empty">暂无正式发布记录（当前为 Preview 渠道）。</p>';

        const previewItems = model.history.previews.length
            ? model.history.previews.map((p) => `
                <div class="versions-release-card versions-preview-card">
                    <div class="versions-release-head">
                        <span class="versions-release-tag">${esc(p.label)}</span>
                        <span class="versions-release-status">${esc(p.status)}</span>
                    </div>
                    <div class="versions-release-meta">${esc(p.channel)} 渠道</div>
                </div>`).join('')
            : '<p class="versions-empty">暂无预览记录。</p>';

        body.innerHTML = `
            <section class="about-card versions-current">
                <h3>当前版本</h3>
                <div class="versions-current-grid">
                    <div class="versions-kv"><span>版本</span><strong>${esc(c.display_version)}</strong></div>
                    <div class="versions-kv"><span>状态</span><strong>${esc(c.status)}</strong></div>
                    <div class="versions-kv"><span>渠道</span><strong>${esc(c.channel_label)}</strong></div>
                </div>
                <h4>平台状态</h4>
                <table class="versions-platform-table">${platformRows}</table>
                <h4>已知限制</h4>
                <ul class="versions-limitations">${limitationItems}</ul>
            </section>
            <section class="about-card">
                <h3>正式发布</h3>
                ${releaseItems}
            </section>
            <section class="about-card">
                <h3>预览记录</h3>
                ${previewItems}
            </section>`;
    }

    // F029 桌面口径（10_platform §4：分享 = 导出文本/文件）
    shareApp() {
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

        const done = (msg) => this.addLog?.('success', msg) || console.log(msg);
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
                    <img src="placeholders/empty_connected.png" class="empty-icon-img" alt="connected">
                    <div class="empty-text">暂无已连接设备</div>
                    <div class="empty-hint">在扫描页面点击设备进行连接</div>
                </div>`;
            return;
        }

        list.innerHTML = '';
        [...this.connectedDevices].forEach(deviceId => {
            const device = this.devices.get(deviceId) || { id: deviceId, name: deviceId.slice(0, 16) };
            const card = document.createElement('device-card');
            card.setAttribute('is-connection-tab', 'true');
            card.device = device;
            card.addEventListener('show-detail', (e) => {
                e.stopPropagation();
                this.showDeviceDetailPanel(e.detail.id);
            });
            card.addEventListener('disconnect', (e) => {
                e.stopPropagation();
                this.disconnectDeviceFromPanel(e.detail.id);
            });
            list.appendChild(card);
        });
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
                console.log('[MOCK] Injecting dummy device Dummy-BLE-01 and Dummy-BLE-02');
                this.onDeviceDiscovered({
                    id: 'MOCK-11:22:33:44:55:66',
                    name: 'Dummy-BLE-01',
                    rssi: -45,
                    connectable: true,
                    services: ['FFF0', '180A', '4FAFC201-1FB5-459E-8FCC-C5C9C331914D']
                });
                this.onDeviceDiscovered({
                    id: 'MOCK-AA:BB:CC:DD:EE:FF',
                    name: 'Dummy-BLE-02',
                    rssi: -60,
                    connectable: true,
                    services: ['FFF0']
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
                        <img src="placeholders/empty_scan.png" class="empty-icon-img" alt="scan">
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
                        <img src="placeholders/empty_scan.png" class="empty-icon-img" alt="search">
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
        const card = document.createElement('device-card');
        card.device = device;
        card.addEventListener('connect', (e) => {
            e.stopPropagation();
            this.connectToDevice({ id: e.detail.id, name: device.name });
        });
        card.addEventListener('show-detail', (e) => {
            e.stopPropagation();
            this.selectDevice(e.detail.id);
        });
        return card;
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
            const maxAttempts = (window.BleUtils && window.BleUtils.MAX_RECONNECT_ATTEMPTS) || 3;
            
            if (attempts < maxAttempts) {
                const nextAttempt = attempts + 1;
                this.reconnectAttempts.set(deviceId, nextAttempt);
                const delay = window.BleUtils ? window.BleUtils.reconnectDelay(nextAttempt) : (nextAttempt * 2000);

                this.addLog(`设备 ${deviceId} 意外断开，将在 ${delay/1000}s 后尝试重连... (第 ${nextAttempt}/${maxAttempts} 次)`, 'warning');
                
                if (this.reconnectTimers.has(deviceId)) clearTimeout(this.reconnectTimers.get(deviceId));
                this.reconnectTimers.set(deviceId, setTimeout(() => {
                    this.addLog(`尝试自动重连 ${deviceId}... (第 ${nextAttempt}/${maxAttempts} 次)`, 'info');
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
        const deviceId = this.currentDevice.id;
        // 从 onServicesDiscovered 维护的状态渲染；不得在此再触发 ble:discoverServices，
        // 否则与主进程的 servicesDiscovered 事件互喂成发现风暴
        const currentServices = this.servicesByDevice.get(deviceId) || [];

        servicePanel.services = currentServices;

        // Check for OTA service — 切换头部静态按钮可见性
        // （不得动态创建按钮：历史动态块指向不存在的 'otaDialog' id，点击即抛错）
        // UUID 规范化后比较：noble/bleAPI 给的是无横线小写，常量历史版本带横线导致永不相等
        const normalizeUuid = (u) => (u || '').toLowerCase().replace(/-/g, '');
        const otaServiceUuid = '4fafc2011fb5459e8fccc5c9c331914d';
        const hasOta = currentServices.some(s => normalizeUuid(s.uuid) === otaServiceUuid);
        const otaBtn = document.getElementById('otaButton');
        if (otaBtn) otaBtn.style.display = hasOta ? 'inline-block' : 'none';
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
        // F026：渲染端日志唯一漏斗，统一脱敏（uniapp logger/log-redaction.js 锁定镜像）
        const text = window.SmartBLELogRedaction ? window.SmartBLELogRedaction.sanitizeLogString(message) : message;
        const panel = document.getElementById('mainLogPanel');
        if (panel) panel.addLog(type, text);
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
// F030：产品决议不做国际化——UI 文案硬编码中文，无语言切换（正典 R30 现状确认）。
document.addEventListener('DOMContentLoaded', async () => {
    window.appInstance = new App();
});
