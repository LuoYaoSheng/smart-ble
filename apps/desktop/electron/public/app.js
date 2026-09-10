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
        this.isConnecting = false;
        this.hasScanned = false; // P001 正典状态词：扫描完成后显示「扫描完成 · 发现 N 台」
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

        this.isBroadcasting = false; // 广播状态
        this.broadcastSupportChecked = false; // P008 检查支持状态
        this.broadcastUuidError = false; // P008 UUID 校验态
        this.broadcastFailed = false; // P008 启动失败徽章态

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
        // Tab 切换（P001 正典底部 TabBar）
        document.querySelectorAll('.tabbar .tb').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
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
        document.getElementById('scanButton')?.addEventListener('click', () => {
            this.toggleScan();
        });

        // Broadcast buttons（P008 正典：开始/停止/检查支持 + 预算实时计算）
        document.getElementById('startBroadcastButton')?.addEventListener('click', () => {
            this.startBroadcast();
        });
        document.getElementById('stopBroadcastButton')?.addEventListener('click', () => {
            this.stopBroadcast();
        });
        document.getElementById('checkSupportButton')?.addEventListener('click', () => {
            this.checkBroadcastSupport();
        });
        ['broadcastName', 'broadcastServiceUuid', 'broadcastManufacturerId', 'broadcastManufacturerData'].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', () => this.updateByteBudget());
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

        // P006 详情页按钮（正典 devhead.acts：连接/断开；OTA 在 subnav 右侧）
        document.getElementById('connectButton')?.addEventListener('click', () => {
            if (this.currentDevice && !this.connectedDevices.has(this.currentDevice.id)) {
                this.connectToDevice(this.currentDevice);
            }
        });
        document.getElementById('disconnectButton')?.addEventListener('click', () => {
            if (this.currentDevice) {
                this.disconnect();
            }
        });

        // OTA button（subnav 固件更新；dialog element id is mainOtaDialog）
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

        // Service panel via Web Component（契约统一：char-action 单事件，action ∈ read/write/notify）
        const servicePanel = document.getElementById('mainServicePanel');
        if (servicePanel) {
            servicePanel.addEventListener('char-action', async (e) => {
                const { serviceUuid, charUuid, action, btn } = e.detail;
                if (action === 'read') {
                    this.readCharacteristic(serviceUuid, charUuid);
                } else if (action === 'write') {
                    const writeDialog = document.getElementById('mainWriteDialog');
                    if (writeDialog) writeDialog.show(serviceUuid, charUuid);
                } else if (action === 'notify') {
                    const enabled = btn ? btn.classList.contains('listening') : false;
                    this.toggleNotify(serviceUuid, charUuid, enabled, btn);
                }
            });
        }
    }

    switchTab(tab) {
        // 更新标签按钮状态（P001 正典 TabBar：.tb.on）
        document.querySelectorAll('.tabbar .tb').forEach(btn => {
            btn.classList.toggle('on', btn.dataset.tab === tab);
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
        const aboutBtn = document.querySelector('.tabbar .tb[data-tab="about"]');
        aboutBtn?.classList.add('on');
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

    // P010：版本记录页（正典结构：当前版本/当前限制/发布历史/预览记录四卡 + foot；
    // Release Metadata 纯投影，禁止手写版本事实）
    renderVersionsPage() {
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

        const done = (msg) => {
            this.addLog?.(msg, 'success');
            console.log(msg);
        };
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

    // P007 已连接面板（正典：sumcard 汇总卡 + conn 变体设备卡 + link 空态）
    renderConnectedDevicesPanel() {
        const list = document.getElementById('connectedDeviceList');
        const badge = document.getElementById('connectedBadge');
        const sumcard = document.getElementById('connectedSumcard');
        const countEl = document.getElementById('connectedCount');
        const disconnectAllBtn = document.getElementById('disconnectAllBtn');
        if (!list) return;

        const count = this.connectedDevices.size;
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
        // 正典：单台不显示汇总卡（one 模式），两台及以上才出现（multi 模式 + 全部断开）
        if (sumcard) sumcard.style.display = count > 1 ? 'flex' : 'none';
        if (countEl) countEl.textContent = String(count);
        if (disconnectAllBtn) {
            disconnectAllBtn.onclick = () => {
                [...this.connectedDevices].forEach(id => {
                    this.currentDevice = this.devices.get(id) || { id };
                    this.disconnect();
                });
            };
        }

        if (count === 0) {
            list.innerHTML = `
                <div class="empty">
                    <div class="ill">${this.emptyIll('link')}</div>
                    <div class="t">还没有连接中的设备</div>
                    <div class="d">先在「扫描」页找到设备并连接，会话将保存在这里</div>
                    <button class="btn soft" id="connectedGoScan"><svg class="ic sm" aria-hidden="true"><use href="#i-scan"/></svg><span>去扫描</span></button>
                </div>`;
            list.querySelector('#connectedGoScan')?.addEventListener('click', () => this.switchTab('scan'));
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

    // P008 广播表单读取（includeName 恒真：桌面 noble 路径始终带名）
    readBroadcastForm() {
        return {
            name: document.getElementById('broadcastName')?.value || 'SmartBLE',
            uuid: (document.getElementById('broadcastServiceUuid')?.value || '').trim(),
            mfgId: (document.getElementById('broadcastManufacturerId')?.value || '').trim(),
            mfgData: document.getElementById('broadcastManufacturerData')?.value || '',
        };
    }

    // P008 31B 预算（正典口径：名称 2+len / UUID 2+len/2 / 厂商块 4+dataLen）
    calcAdvertiseBytes(f) {
        const nameB = f.name ? 2 + f.name.length : 0;
        const uuidB = f.uuid && this.isValidBroadcastUuid(f.uuid) ? 2 + f.uuid.length / 2 : 0;
        const mfgB = (f.mfgId || f.mfgData) ? 4 + f.mfgData.length : 0;
        return { name: nameB, uuid: uuidB, mfg: mfgB, total: nameB + uuidB + mfgB };
    }

    isValidBroadcastUuid(u) {
        return /^([0-9a-fA-F]{4}|[0-9a-fA-F]{8}|[0-9a-fA-F]{36})$/.test(u);
    }

    // P008 预算条 + 四行明细 + 超限拦截态
    updateByteBudget() {
        const f = this.readBroadcastForm();
        const b = this.calcAdvertiseBytes(f);
        const over = b.total > 31;
        const uuidOk = !f.uuid || this.isValidBroadcastUuid(f.uuid);

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
        this.broadcastUuidError = !uuidOk;

        const startBtn = document.getElementById('startBroadcastButton');
        if (startBtn && !this.isBroadcasting) startBtn.disabled = over || !uuidOk;
    }

    // P008 广播状态徽章（正典：广播中 on / 失败 err / 已就绪 warn / 未就绪 dim）+ 输入禁用
    updateBroadcastStatus(state) {
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
        const broadcasting = state === 'advertising';
        ['broadcastName', 'broadcastServiceUuid', 'broadcastManufacturerId', 'broadcastManufacturerData'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = broadcasting;
        });
        if (lock) lock.style.display = broadcasting ? '' : 'none';
        if (startBtn) startBtn.style.display = broadcasting ? 'none' : 'inline-flex';
        if (stopBtn) stopBtn.style.display = broadcasting ? 'inline-flex' : 'none';
        if (broadcasting && badge) badge.classList.add('on');
    }

    // P008 广播日志（cardv 白卡 + F026 脱敏漏斗）
    bLog(type, msg) {
        const text = window.SmartBLELogRedaction ? window.SmartBLELogRedaction.sanitizeLogString(msg) : msg;
        const panel = document.getElementById('broadcastLogPanel');
        if (panel) panel.addLog(type, text);
    }

    async startBroadcast() {
        const f = this.readBroadcastForm();
        const b = this.calcAdvertiseBytes(f);

        if (this.broadcastUuidError) {
            this.bLog('error', 'UUID 非法：需为 4 / 8 / 36 位十六进制');
            this.showToast('UUID 非法，请检查服务 UUID 格式', 'error');
            return;
        }
        if (b.total > 31) {
            this.bLog('error', `广播数据超限：当前 ${b.total} 字节，BLE 最多支持 31 字节（不静默截断）`);
            this.showToast(`广播数据超限（${b.total}/31 字节）`, 'error');
            return;
        }

        try {
            this.bLog('info', `启动广播 · 名称 ${f.name} · UUID ${f.uuid || '—'} · 厂商 0x${f.mfgId || '0000'}`);
            const result = await window.bleAPI.startAdvertising(f.name, f.uuid ? [f.uuid] : [], f.mfgId, f.mfgData, true);
            if (result.success) {
                this.isBroadcasting = true;
                this.updateBroadcastStatus('advertising');
                this.bLog('success', '广播已启动');
                this.showToast('广播已启动', 'success');
            } else {
                this.broadcastFailed = true;
                this.updateBroadcastStatus('failed');
                this.bLog('error', `广播启动失败: ${result.error}`);
                this.showToast(`启动失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.broadcastFailed = true;
            this.updateBroadcastStatus('failed');
            this.bLog('error', `广播启动失败: ${error.message || error}`);
            this.showToast(`启动失败: ${error.message || error}`, 'error');
        }
    }

    async stopBroadcast() {
        try {
            const result = await window.bleAPI.stopAdvertising();
            if (result.success) {
                this.isBroadcasting = false;
                this.updateBroadcastStatus(this.broadcastSupportChecked ? 'ready' : 'idle');
                this.bLog('info', '广播已停止');
                this.showToast('广播已停止', 'info');
            }
        } catch (error) {
            this.showToast(`停止失败: ${error.message}`, 'error');
        }
    }

    // P008 检查支持（桌面原生层口径：Linux=BlueZ 可用，mac/win 原生层受限）
    checkBroadcastSupport() {
        const os = window.platform?.platform || '';
        const layer = { linux: 'BlueZ', darwin: 'CoreBluetooth', win32: 'WinRT' }[os] || '未知原生层';
        const supported = os === 'linux';
        this.broadcastSupportChecked = true;
        this.broadcastFailed = false;
        this.updateBroadcastStatus(supported ? 'ready' : 'idle');
        this.bLog('info', `桌面原生层 ${layer}（${os || '未知平台'}）——${supported ? '支持外围广播' : '扫描/连接可用，广播外围受限（10_platform §2.4）'}`);
        if (!supported) {
            this.bLog('info', '请使用手机客户端执行虚拟外设测试');
        }
        this.showToast(supported ? '已就绪：支持广播' : '当前平台广播外围受限', supported ? 'success' : 'info');
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
            // P008 平台 chip + 初始徽章态 + 31B 预算首算
            const osNames = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' };
            const chip = document.getElementById('broadcastPlatformChip');
            if (chip) chip.textContent = `平台：Desktop · ${osNames[window.platform?.platform] || '未知'}`;
            this.updateBroadcastStatus('idle');
            this.updateByteBudget();
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

    // P001 蓝牙状态芯片（正典 navbar bt-chip：bt-dot on/off + 状态词）
    updateBluetoothStatus(state) {
        const dot = document.querySelector('#btChip .bt-dot');
        const word = document.getElementById('btWord');
        const stateMap = {
            'poweredOn': { text: '蓝牙就绪', cls: 'on' },
            'poweredOff': { text: '蓝牙未开启', cls: 'off' },
            'unauthorized': { text: '未授权', cls: 'off' },
            'unknown': { text: '初始化中…', cls: '' }
        };
        const status = stateMap[state] || { text: '状态未知', cls: '' };
        if (dot) dot.className = 'bt-dot ' + status.cls;
        if (word) word.textContent = status.text;
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
            this.hasScanned = false;
            this.updateDeviceList();
            this.isScanning = true;
            this.updateScanButton();
            this.updateScanStatus();

            const result = await window.bleAPI.startScan();
            if (!result.success) {
                this.showError('扫描失败: ' + result.error);
                this.isScanning = false;
                this.updateScanButton();
                this.updateScanStatus();
            } else {
                // Auto-stop after 5 seconds - aligned with UniApp
                this.scheduleAutoStop();
            }
        } catch (error) {
            this.showError('扫描失败: ' + error.message);
            this.isScanning = false;
            this.updateScanButton();
            this.updateScanStatus();
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
            this.hasScanned = true;
            this.updateScanButton();
            this.updateScanStatus();
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

    // P001 扫描按钮（正典 C.btn：primary+scan / danger+stop）
    updateScanButton() {
        const btn = document.getElementById('scanButton');
        if (!btn) return;
        if (this.isScanning) {
            btn.className = 'btn danger';
            btn.innerHTML = '<svg class="ic sm" aria-hidden="true"><use href="#i-stop"/></svg><span>停止扫描</span>';
        } else {
            btn.className = 'btn primary';
            btn.innerHTML = '<svg class="ic sm" aria-hidden="true"><use href="#i-scan"/></svg><span>开始扫描</span>';
        }
    }

    // P001 扫描状态词（正典 scantool.lb：扫描中 live 点 · 5s 会话 / 扫描完成 · 发现 N 台 / 待开始扫描）
    updateScanStatus() {
        const el = document.getElementById('scanStatusLabel');
        if (!el) return;
        if (this.isScanning) {
            el.innerHTML = '<span class="live"></span>扫描中 · 5s 会话';
        } else if (this.hasScanned) {
            el.textContent = `扫描完成 · 发现 ${this.getFilteredDevices().length} 台`;
        } else {
            el.textContent = '待开始扫描';
        }
    }

    onDeviceDiscovered(device) {
        // 检查是否是新设备
        const isNew = !this.devices.has(device.id);

        this.devices.set(device.id, device);

        if (isNew) {
            // 新设备才重新渲染列表
            this.updateDeviceList();
            this.updateScanStatus();
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

    // P001 空态插图（正典 C.ILL 同源 SVG：radar 扫描空态 / link 筛选无匹配）
    emptyIll(kind) {
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

    updateDeviceList() {
        const list = document.getElementById('deviceList');
        const count = document.getElementById('deviceCount');

        // Get filtered devices - aligned with UniApp
        const filteredDevices = this.getFilteredDevices();
        const allDevices = Array.from(this.devices.values());

        // 正典 sec-t chip：仅在列表非空时显示数量
        if (count) {
            count.textContent = String(filteredDevices.length);
            count.style.display = filteredDevices.length ? '' : 'none';
        }

        if (allDevices.length === 0) {
            if (list) {
                list.innerHTML = `
                    <div class="empty">
                        <div class="ill">${this.emptyIll('radar')}</div>
                        <div class="t">还没有扫描结果</div>
                        <div class="d">点上方按钮开始扫描附近 BLE 设备</div>
                    </div>`;
            }
            return;
        }

        if (filteredDevices.length === 0) {
            if (list) {
                list.innerHTML = `
                    <div class="empty">
                        <div class="ill">${this.emptyIll('link')}</div>
                        <div class="t">当前没有匹配设备</div>
                        <div class="d">调整筛选条件试试</div>
                    </div>`;
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
        card.connectedHint = this.connectedDevices.has(device.id);
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

        // Update header（正典显示名批准链口径：未命名兜底）
        const nameEl = document.getElementById('deviceName');
        const idEl = document.getElementById('deviceId');
        const resolved = window.SmartBLEDisplayName?.resolveDeviceDisplayName(device);
        if (nameEl) nameEl.textContent = (resolved ? resolved.displayName : device.name) || '未命名 BLE 设备';
        if (idEl) idEl.textContent = device.id;

        this.updateConnectionStatus(this.connectedDevices.has(deviceId) ? 'connected' : 'disconnected');

        // Render services
        this.renderServices();
    }

    goBack() {
        this.currentDevice = null;
        const panel = document.getElementById('gattPanel');
        if (panel) panel.innerHTML = '';
        const otaBtn = document.getElementById('otaButton');
        if (otaBtn) otaBtn.style.display = 'none';
        this.servicesByDevice.clear();
        this.characteristicsMap.clear();
        this.logs = [];
        const logPanel = document.getElementById('mainLogPanel');
        if (logPanel) logPanel.clearLogs();
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
            // 进入详情视图并写头部（修复历史缺陷：从扫描卡直连时头部名称/ID 从未写入）
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.getElementById('deviceDetailView')?.classList.add('active');
            const nameEl = document.getElementById('deviceName');
            const idEl = document.getElementById('deviceId');
            const resolved = window.SmartBLEDisplayName?.resolveDeviceDisplayName(device);
            if (nameEl) nameEl.textContent = (resolved ? resolved.displayName : device.name) || '未命名 BLE 设备';
            if (idEl) idEl.textContent = device.id;
            this.updateConnectionStatus('connecting');
            this.isConnecting = true;
            this.renderServices();
            this.addLog(`正在连接 ${device.name || device.id}...`, 'info');

            const result = await window.bleAPI.connect(device.id);
            this.isConnecting = false;
            if (!result.success) {
                this.addLog(`连接失败: ${result.error}`, 'error');
                this.updateConnectionStatus('disconnected');
            }
        } catch (error) {
            this.isConnecting = false;
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

    // P006 面板状态机（正典 panel：idle / connecting / 服务发现中 / ready / empty）
    renderServices() {
        const servicePanel = document.getElementById('mainServicePanel');
        const panel = document.getElementById('gattPanel');
        if (!servicePanel) return;

        if (!this.currentDevice) {
            servicePanel.services = [];
            if (panel) panel.innerHTML = '';
            const otaBtn = document.getElementById('otaButton');
            if (otaBtn) otaBtn.style.display = 'none';
            return;
        }
        const deviceId = this.currentDevice.id;
        const isConn = this.connectedDevices.has(deviceId);
        // 从 onServicesDiscovered 维护的状态渲染；不得在此再触发 ble:discoverServices，
        // 否则与主进程的 servicesDiscovered 事件互喂成发现风暴
        const discovered = this.servicesByDevice.has(deviceId);
        const currentServices = this.servicesByDevice.get(deviceId) || [];

        // UUID 规范化后比较：noble/bleAPI 给的是无横线小写，常量历史版本带横线导致永不相等
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
            if (panel) panel.innerHTML = this.isConnecting
                ? op('连接中…', `正在连接 ${this.currentDevice.name || this.currentDevice.id}（10s 超时 · 失败自动重试 3 次）`)
                : op('未初始化', '点击「连接设备」建立 GATT 会话。');
            return;
        }

        if (!discovered) {
            servicePanel.services = [];
            if (panel) panel.innerHTML = op('服务发现中…', `正在读取 ${this.currentDevice.name || this.currentDevice.id} 的 GATT 树`);
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

    // P006 监听（正典：listening 类为唯一态源，组件已乐观翻转，失败回翻）
    revertNotifyBtn(btn) {
        if (!btn) return;
        const on = btn.classList.toggle('listening');
        btn.classList.toggle('on', on);
        const label = btn.querySelector('span');
        if (label) label.textContent = on ? '停止监听' : '开始监听';
    }

    async toggleNotify(serviceUuid, charUuid, enabled, btn = null) {
        if (!this.currentDevice) return;

        this.addLog(`${enabled ? '开始监听' : '停止监听'} ${String(charUuid).slice(0, 8)}…${enabled ? ' · 防抖去重 300ms' : ''}`, 'info');

        try {
            const result = await window.bleAPI.notifyCharacteristic(this.currentDevice.id, serviceUuid, charUuid, enabled);

            if (result.success) {
                // 态由组件持有，无需回写
            } else {
                this.revertNotifyBtn(btn);
                this.addLog(`设置通知失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.revertNotifyBtn(btn);
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

    showDeviceDetail() {
        // Redundant since selectDevice already manages view changes and sets up state
    }

    // P006 连接状态（正典 devhead：st 圆点 on/mid + 状态词 + 连接/断开按钮互斥）
    updateConnectionStatus(status) {
        const st = document.getElementById('gattSt');
        const word = document.getElementById('gattStateWord');
        const connectBtn = document.getElementById('connectButton');
        const disconnectBtn = document.getElementById('disconnectButton');

        const isConn = status === 'connected';
        const isMid = status === 'connecting';

        if (st) st.className = 'st' + (isConn ? ' on' : isMid ? ' mid' : '');
        if (word) word.textContent = isConn ? '已连接' : isMid ? '连接中' : '未连接';

        if (connectBtn) {
            connectBtn.style.display = isConn ? 'none' : 'inline-flex';
            connectBtn.disabled = isMid;
            const label = connectBtn.querySelector('span');
            if (label) label.textContent = isMid ? '连接中…' : '连接设备';
        }
        if (disconnectBtn) disconnectBtn.style.display = isConn ? 'inline-flex' : 'none';
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

    // 正典 toast（#toasts 容器 + 深色胶囊；success 带对勾图标）
    showToast(message, type = 'info') {
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

    showError(message) {
        alert(message);
    }
}

// Initialize app when DOM is ready
// F030：产品决议不做国际化——UI 文案硬编码中文，无语言切换（正典 R30 现状确认）。
document.addEventListener('DOMContentLoaded', async () => {
    window.appInstance = new App();
});
