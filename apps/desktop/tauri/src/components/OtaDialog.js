/**
 * OtaDialog Web Component — Tauri 版（OTA 契约对齐 · R-1/R-2）
 *
 * 流程（对齐 macOS OtaManager / core/apple SmartHidCore OtaContract.swift；
 * 与 Electron 版 OtaDialog 互为镜像，差异仅在 BLE 适配层 invoke/listen）：
 *   选包(.bin) → 包校验(manifest 可选：SemVer+size+sha256 实测比对；无 manifest 跳过)
 *   → CTRL 写 {op:start,target,target_version,size,chunk_size,sha256} → 等 ready(30s)
 *   → DATA 分块 writeNoResponse(块间隔 20ms) → {op:commit} 等 success(30s)
 *   → 取消 {op:abort}。
 * 状态帧分类走共享 ota-contract.js（子串匹配，failed/aborted 不漏检）。
 * 契约事实源：contracts/target/ota-package.schema.json + 固件 ota_server.cpp；
 * 决策记录：docs/specs/06_review/OTA_CONTRACT_R1_R2_DECISION.md（方案 A）。
 */
class OtaDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.deviceId = null;
        this.fileBuffer = null;
        this.fileSha256 = null;
        this.manifestJson = null;   // 可选 manifest（契约六字段）
        this.manifestTarget = null;
        this.manifestVersion = null;
        this.chunkSize = 180;
        this._phase = 'idle';       // idle | waiting_ready | transferring | committing | done
        this._cancelled = false;
        this._waitTimer = null;
        this._unlistenNotification = null;

        // OTA Service / Characteristic UUIDs (aligned with firmware ota_server.h)
        this.otaServiceUuid  = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';
        this.charControlUuid = 'beb5483e-36e1-4688-b7f5-ea07361b26c0';
        this.charDataUuid    = 'beb5483e-36e1-4688-b7f5-ea07361b26c1';
        this.charStatusUuid  = 'beb5483e-36e1-4688-b7f5-ea07361b26c2';

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: contents; }

                .overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 2000;
                    align-items: center;
                    justify-content: center;
                }
                .overlay.visible { display: flex; }

                .dialog {
                    background: var(--surface, #fff);
                    color: var(--text-primary, #000);
                    border-radius: 16px;
                    padding: 24px;
                    width: 440px;
                    max-width: 92vw;
                    box-shadow: 0 16px 48px rgba(0,0,0,0.25);
                    animation: fadeIn 0.2s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                h3 {
                    margin: 0 0 20px;
                    font-size: 18px;
                    font-weight: 600;
                }

                .drop-zone {
                    border: 2px dashed var(--border, #e5e5ea);
                    border-radius: 12px;
                    padding: 24px 16px;
                    text-align: center;
                    cursor: pointer;
                    margin-bottom: 10px;
                    transition: border-color 0.2s, background 0.2s;
                    background: transparent;
                }
                .drop-zone:hover,
                .drop-zone.drag-over {
                    border-color: var(--primary, #007aff);
                    background: rgba(0, 122, 255, 0.05);
                }
                .drop-zone .drop-icon { font-size: 28px; margin-bottom: 8px; }
                .drop-zone .drop-hint { font-size: 13px; color: var(--text-secondary, #8e8e93); }
                .drop-zone .file-name { font-size: 14px; font-weight: 500; color: var(--primary, #007aff); margin-top: 6px; }

                .manifest-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 16px;
                    padding: 8px 12px;
                    border-radius: 8px;
                    background: rgba(0, 122, 255, 0.04);
                    font-size: 13px;
                }
                .manifest-row .manifest-state { color: var(--text-secondary, #8e8e93); }
                .manifest-row .manifest-state.loaded { color: var(--primary, #007aff); font-weight: 500; }
                .manifest-row button {
                    padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border, #e5e5ea);
                    background: var(--surface, #fff); font-size: 12px; cursor: pointer;
                }

                .status-row {
                    font-size: 13px;
                    color: var(--text-secondary, #8e8e93);
                    margin-bottom: 10px;
                    min-height: 18px;
                    word-break: break-all;
                }
                .status-row.error { color: var(--error, #ff3b30); }
                .status-row.success { color: var(--success, #34c759); }

                .progress-track {
                    width: 100%;
                    height: 8px;
                    background: var(--border, #e5e5ea);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 16px;
                }
                .progress-fill {
                    height: 100%;
                    background: var(--primary, #007aff);
                    width: 0%;
                    border-radius: 4px;
                    transition: width 0.15s linear;
                }

                .btn-row {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 4px;
                }
                button {
                    padding: 9px 18px;
                    border-radius: 8px;
                    border: none;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: opacity 0.15s;
                }
                button:disabled { opacity: 0.45; cursor: not-allowed; }
                .btn-cancel { background: var(--border, #e5e5ea); color: var(--text-primary, #000); }
                .btn-start  { background: var(--primary, #007aff); color: #fff; }
                .btn-cancel:hover:not(:disabled) { opacity: 0.8; }
                .btn-start:hover:not(:disabled)  { opacity: 0.88; }
            </style>

            <div class="overlay" id="overlay">
                <div class="dialog">
                    <h3>固件升级 (OTA)</h3>

                    <input type="file" id="fileInput" accept=".bin" style="display:none;" />
                    <div class="drop-zone" id="dropZone">
                        <div class="drop-icon">📦</div>
                        <div class="drop-hint">点击选择 .bin 固件，或将文件拖入此处</div>
                        <div class="file-name" id="fileName"></div>
                    </div>

                    <div class="manifest-row">
                        <span class="manifest-state" id="manifestState">manifest（可选）：未选择</span>
                        <input type="file" id="manifestInput" accept=".json" style="display:none;" />
                        <button id="manifestBtn">选择 manifest</button>
                    </div>

                    <div class="status-row" id="statusText">等待选择固件文件……</div>
                    <div class="progress-track">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>

                    <div class="btn-row">
                        <button class="btn-cancel" id="cancelBtn">取消</button>
                        <button class="btn-start"  id="startBtn" disabled>开始升级</button>
                    </div>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        const sr = this.shadowRoot;
        this.overlay      = sr.getElementById('overlay');
        this.fileInput    = sr.getElementById('fileInput');
        this.manifestInput = sr.getElementById('manifestInput');
        this.dropZone     = sr.getElementById('dropZone');
        this.fileNameEl   = sr.getElementById('fileName');
        this.manifestStateEl = sr.getElementById('manifestState');
        this.statusText   = sr.getElementById('statusText');
        this.progressFill = sr.getElementById('progressFill');
        this.startBtn     = sr.getElementById('startBtn');
        this.cancelBtn    = sr.getElementById('cancelBtn');

        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this._handleFile(e.target.files[0]));
        sr.getElementById('manifestBtn').addEventListener('click', () => this.manifestInput.click());
        this.manifestInput.addEventListener('change', (e) => this._handleManifest(e.target.files[0]));

        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drag-over');
        });
        this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('drag-over'));
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
            const f = e.dataTransfer.files[0];
            if (f) this._handleFile(f);
        });

        this.cancelBtn.addEventListener('click', () => this._cancel());
        this.startBtn.addEventListener('click', () => this._startOta());
    }

    show(deviceId) {
        this.deviceId = deviceId;
        this._resetPackageState();
        this._setStatus('等待选择固件文件……', '');
        this._setProgress(0);
        this.startBtn.disabled = true;
        this.overlay.classList.add('visible');
    }

    hide() {
        this._teardownSession();
        this.overlay.classList.remove('visible');
        if (this.fileInput) this.fileInput.value = '';
        if (this.manifestInput) this.manifestInput.value = '';
    }

    _resetPackageState() {
        this.fileBuffer = null;
        this.fileSha256 = null;
        this.manifestJson = null;
        this.manifestTarget = null;
        this.manifestVersion = null;
        this._phase = 'idle';
        this._cancelled = false;
        this._clearWait();
        this.fileNameEl.textContent = '';
        this.manifestStateEl.textContent = 'manifest（可选）：未选择';
        this.manifestStateEl.classList.remove('loaded');
    }

    _setStatus(msg, type = '') {
        this.statusText.textContent = msg;
        this.statusText.className = 'status-row' + (type ? ` ${type}` : '');
    }

    _setProgress(pct) {
        this.progressFill.style.width = `${pct}%`;
    }

    async _handleFile(file) {
        if (!file) return;
        if (!file.name.endsWith('.bin')) {
            this._setStatus('请选择 .bin 格式的固件文件', 'error');
            return;
        }
        this.fileNameEl.textContent = file.name;
        this._setStatus(`正在读取 ${file.name} …`);
        this.fileBuffer = null;
        this.startBtn.disabled = true;

        const readAsBuffer = () => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(new Uint8Array(e.target.result));
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });

        try {
            const bytes = await readAsBuffer();
            const OC = window.SmartBLEOtaContract;
            if (!OC) throw new Error('ota-contract.js 未加载');
            this.fileBuffer = bytes;
            this.fileSha256 = await OC.OtaManifest.sha256Hex(bytes);
            this._setStatus(`已就绪：${bytes.length.toLocaleString()} 字节 · sha256 ${this.fileSha256.slice(0, 12)}…`);
            if (this.manifestJson) this._validateManifest();
            this.startBtn.disabled = false;
        } catch (err) {
            this._setStatus(`❌ ${err.message || err}`, 'error');
        }
    }

    _handleManifest(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.manifestJson = JSON.parse(e.target.result);
                this.manifestStateEl.textContent = `manifest：${file.name}`;
                this.manifestStateEl.classList.add('loaded');
                this._validateManifest();
            } catch {
                this.manifestJson = null;
                this.manifestTarget = null;
                this.manifestVersion = null;
                this.manifestStateEl.textContent = 'manifest：JSON 解析失败';
                this.manifestStateEl.classList.remove('loaded');
                this._setStatus('manifest JSON 解析失败', 'error');
            }
        };
        reader.readAsText(file);
    }

    _validateManifest() {
        const OC = window.SmartBLEOtaContract;
        if (!this.manifestJson || !this.fileBuffer || !OC) return;
        const result = OC.OtaManifest.parse(this.manifestJson, this.fileBuffer.length, this.fileSha256);
        if (!result.ok) {
            this.manifestTarget = null;
            this.manifestVersion = null;
            this.startBtn.disabled = true;
            this._setStatus(`❌ 包校验失败（${result.code}）：${result.message}`, 'error');
            return;
        }
        this.manifestTarget = result.target;
        this.manifestVersion = result.version;
        this.startBtn.disabled = false;
        const t = result.target || '—';
        const v = result.version || '—';
        this._setStatus(`包校验通过（manifest：target=${t} version=${v} size=${this.fileBuffer.length.toLocaleString()}）`, 'success');
    }

    /** Get resolved invoke() — prefers global, falls back to window.__TAURI__ */
    _getInvoke() {
        if (typeof invoke === 'function') return invoke;
        if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke;
        if (window.__TAURI__?.tauri?.invoke) return window.__TAURI__.tauri.invoke;
        if (window.__TAURI__?.invoke) return window.__TAURI__.invoke;
        throw new Error('Tauri invoke API not available');
    }

    /** Get resolved listen() — same resolution order as invoke */
    _getListen() {
        if (typeof listen === 'function') return listen;
        if (window.__TAURI__?.event?.listen) return window.__TAURI__.event.listen;
        if (window.__TAURI__?.listen) return window.__TAURI__.listen;
        throw new Error('Tauri listen API not available');
    }

    async _writeRaw(charUuid, bytes, withResponse) {
        const fn_invoke = this._getInvoke();
        const result = await fn_invoke('write_raw', {
            deviceId:          this.deviceId,
            serviceUuid:       this.otaServiceUuid,
            charUuid,
            data:              Array.from(bytes),
            writeWithResponse: withResponse,
        });
        if (!result.success) throw new Error(result.error || 'write_raw failed');
    }

    // ---- 契约状态帧处理（R-2 子串分类） ----

    _onNotification(event) {
        const { deviceId, charUuid, value } = event.payload || {};
        if (deviceId !== this.deviceId) return;
        // UUID 规范化比较：通知事件可能带无横线 UUID，常量是带横线书写
        const norm = (u) => (u || '').toLowerCase().replace(/-/g, '');
        if (norm(charUuid) !== norm(this.charStatusUuid)) return;
        const OC = window.SmartBLEOtaContract;
        const text = OC.bytesToUtf8(OC.hexToBytes(value || ''));
        const kind = OC.OtaStatusClassifier.classify(text);

        if (kind === 'ready' && this._phase === 'waiting_ready') {
            this._clearWait();
            this._setStatus('设备就绪（ready），开始传输……');
            this._transferChunks();
        } else if (kind === 'success' && this._phase === 'committing') {
            this._clearWait();
            this._phase = 'done';
            this._setProgress(100);
            this._setStatus('✅ OTA 完成！设备正在重启……', 'success');
            setTimeout(() => this.hide(), 3000);
        } else if (kind === 'error') {
            this._clearWait();
            this._phase = 'idle';
            this._setStatus(`❌ 设备报错：${text}`, 'error');
            this._restoreUi();
        }
        // ok / 未命中（如版本串）静默忽略
    }

    _armWait(seconds, onTimeout) {
        this._clearWait();
        this._waitTimer = setTimeout(onTimeout, seconds * 1000);
    }

    _clearWait() {
        if (this._waitTimer) {
            clearTimeout(this._waitTimer);
            this._waitTimer = null;
        }
    }

    async _startOta() {
        if (!this.fileBuffer || !this.deviceId) return;
        const OC = window.SmartBLEOtaContract;
        if (!OC) return;
        this._cancelled = false;
        this._phase = 'waiting_ready';
        this.startBtn.disabled = true;
        this.dropZone.style.pointerEvents = 'none';
        this._setProgress(0);

        const encoder = new TextEncoder();

        try {
            // 订阅 STATUS 特征 notify + 'notification-received' 事件
            const fn_invoke = this._getInvoke();
            const sub = await fn_invoke('notify_characteristic', {
                deviceId: this.deviceId,
                serviceUuid: this.otaServiceUuid,
                charUuid: this.charStatusUuid,
                notify: true,
            });
            if (!sub.success) throw new Error(sub.error || 'notify subscribe failed');
            if (this._unlistenNotification) this._unlistenNotification();
            this._unlistenNotification = await this._getListen()('notification-received', (e) => this._onNotification(e));

            // 契约 start 帧（R-1 方案 A）：manifest 缺项省略，真固件按 missing_target 诚实拒绝
            const payload = OC.OtaStartPayload.build({
                manifestTarget: this.manifestTarget,
                manifestVersion: this.manifestVersion,
                fileSize: this.fileBuffer.length,
                chunkSize: this.chunkSize,
                sha256: this.fileSha256,
            });
            if (!this.manifestTarget || !this.manifestVersion) {
                this._setStatus('start 帧省略 target/target_version（无 manifest 契约字段）→ 真固件将拒绝（missing_target），详见 OTA_CONTRACT_R1_R2_DECISION', '');
            } else {
                this._setStatus(`发送 OTA 开始指令（${OC.OtaStartPayload.display(payload)}）……`);
            }
            await this._writeRaw(this.charControlUuid, encoder.encode(JSON.stringify(payload)), true);

            this._armWait(30, () => {
                if (this._phase !== 'waiting_ready') return;
                this._phase = 'idle';
                this._setStatus('❌ 等待设备 ready 超时（30s）', 'error');
                this._restoreUi();
            });
        } catch (err) {
            this._phase = 'idle';
            this._setStatus(`❌ OTA 失败: ${err.message || err}`, 'error');
            this._restoreUi();
        }
    }

    async _transferChunks() {
        this._phase = 'transferring';
        const total = this.fileBuffer.length;

        try {
            let sent = 0;
            while (sent < total) {
                if (this._cancelled) throw new Error('用户已取消');

                const end   = Math.min(sent + this.chunkSize, total);
                const chunk = this.fileBuffer.slice(sent, end);
                await this._writeRaw(this.charDataUuid, chunk, false);

                sent = end;
                const pct = Math.floor((sent / total) * 100);
                this._setProgress(pct);
                this._setStatus(`传输中... ${pct}%  (${sent.toLocaleString()} / ${total.toLocaleString()} 字节)`);
                await this._sleep(20);
            }

            // 分块完成 → 提交（op=commit）并等 success（30s）
            this._phase = 'committing';
            this._setStatus('分块传输完成，发送提交指令（op=commit）……');
            const encoder = new TextEncoder();
            await this._writeRaw(this.charControlUuid, encoder.encode(JSON.stringify({ op: 'commit' })), true);
            this._armWait(30, () => {
                if (this._phase !== 'committing') return;
                this._phase = 'idle';
                this._setStatus('❌ 等待设备 success 超时（30s）', 'error');
                this._restoreUi();
            });
        } catch (err) {
            this._phase = 'idle';
            if (this._cancelled) {
                this._setStatus('已取消', '');
            } else {
                this._setStatus(`❌ OTA 失败: ${err.message || err}`, 'error');
            }
            this._restoreUi();
        }
    }

    async _cancel() {
        if (this._phase === 'waiting_ready' || this._phase === 'transferring' || this._phase === 'committing') {
            this._cancelled = true;
            this._clearWait();
            this._phase = 'idle';
            try {
                const encoder = new TextEncoder();
                await this._writeRaw(this.charControlUuid, encoder.encode(JSON.stringify({ op: 'abort' })), true);
            } catch { /* 设备可能已断开 */ }
            this._setStatus('已取消（op=abort 已发送）', '');
            this._restoreUi();
        }
        this.hide();
    }

    _restoreUi() {
        this.dropZone.style.pointerEvents = 'auto';
        this.startBtn.disabled = !this.fileBuffer;
    }

    async _teardownSession() {
        this._clearWait();
        this._phase = 'idle';
        if (this._unlistenNotification) {
            try { this._unlistenNotification(); } catch { /* noop */ }
            this._unlistenNotification = null;
        }
        if (this.deviceId) {
            try {
                const fn_invoke = this._getInvoke();
                await fn_invoke('notify_characteristic', {
                    deviceId: this.deviceId,
                    serviceUuid: this.otaServiceUuid,
                    charUuid: this.charStatusUuid,
                    notify: false,
                });
            } catch { /* 设备可能已断开 */ }
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

customElements.define('ota-dialog', OtaDialog);
