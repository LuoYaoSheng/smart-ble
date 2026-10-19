/**
 * OtaDialog Web Component — 桌面共享实现（OTA 契约对齐 · R-1/R-2）
 *
 * 流程（对齐 macOS OtaManager / core/apple SmartHidCore OtaContract.swift）：
 *   选包(.bin) → 包校验(manifest 必需：完整契约字段、SemVer、size、sha256 实测比对)
 *   → CTRL 写 {op:start,target,target_version,size,chunk_size,sha256} → 等 ready(30s)
 *   → DATA 分块带响应写(块间隔 20ms) → {op:commit} 等 success(30s)
 *   → 取消 {op:abort}。
 * 状态帧分类走共享 ota-contract.js（子串匹配，failed/aborted 不漏检）。
 * 契约事实源：contracts/target/ota-package.schema.json + 固件 ota_server.cpp；
 * 决策记录：docs/specs/06_review/OTA_CONTRACT_R1_R2_DECISION.md（方案 A）。
 */
class OtaDialog extends HTMLElement {
    constructor() {
        super();
        this.deviceId = null;
        this.fileBuffer = null;
        this.fileSha256 = null;
        this.manifestJson = null;   // 必需 manifest（契约六字段）
        this.manifestTarget = null;
        this.manifestVersion = null;
        this.chunkSize = 180;
        this._phase = 'idle';       // idle | waiting_ready | transferring | committing | done
        this._cancelled = false;
        this._waitTimer = null;
        this._unsubscribeValue = null;
        this._run = null;
        this._generation = 0;
        this._packageRevision = 0;
        this._manifestRevision = 0;
        this._cancelPromise = null;

        this.otaServiceUuid  = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';
        this.charControlUuid = 'beb5483e-36e1-4688-b7f5-ea07361b26c0';
        this.charDataUuid    = 'beb5483e-36e1-4688-b7f5-ea07361b26c1';
        this.charStatusUuid  = 'beb5483e-36e1-4688-b7f5-ea07361b26c2';

        // P006 正典弹窗壳：.mask/.modal + .bigact 选包 + .ota-bar 进度（light DOM，样式走 prototype.css）
        this.innerHTML = `
            <div class="mask" id="overlay" style="display:none">
                <div class="modal" style="max-width:440px">
                    <div class="t">固件更新</div>

                    <input type="file" id="fileInput" accept=".bin" style="display:none;" />
                    <div class="bigact" id="dropZone" style="margin-bottom:10px">
                        <svg class="ic lg" aria-hidden="true"><use href="#i-dl"/></svg>
                        <div style="flex:1">
                            <div class="t" id="dropTitle">选择固件包</div>
                            <div class="d">点击选择 .bin，或将文件拖入此处 · sha256 实测校验</div>
                            <div class="d" id="fileName" style="color:var(--c-primary);font-weight:var(--fw-med)"></div>
                        </div>
                    </div>

                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:var(--fs-cap)">
                        <span id="manifestState" style="color:var(--c-mut);flex:1">manifest（必需）：未选择</span>
                        <input type="file" id="manifestInput" accept=".json" style="display:none;" />
                        <button class="btn soft sm" id="manifestBtn"><span>选择 manifest</span></button>
                    </div>

                    <div style="text-align:center;margin:6px 0 4px">
                        <div id="phaseTitle" style="font-size:var(--fs-h2);font-weight:var(--fw-bold)">等待选包</div>
                        <div id="statusText" style="font-size:var(--fs-cap);color:var(--c-mut);margin-top:3px;min-height:18px;word-break:break-all">等待选择固件文件……</div>
                    </div>
                    <div class="ota-bar" id="otaBar" style="margin-top:10px">
                        <i id="progressFill" style="width:0%"></i>
                    </div>

                    <div class="btns" style="margin-top:14px">
                        <button class="btn soft" id="cancelBtn"><span>取消</span></button>
                        <button class="btn primary" id="startBtn" disabled><svg class="ic sm" aria-hidden="true"><use href="#i-play"/></svg><span>开始升级</span></button>
                    </div>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.overlay      = this.querySelector('#overlay');
        this.fileInput    = this.querySelector('#fileInput');
        this.manifestInput = this.querySelector('#manifestInput');
        this.manifestBtn = this.querySelector('#manifestBtn');
        this.dropZone     = this.querySelector('#dropZone');
        this.dropTitle    = this.querySelector('#dropTitle');
        this.fileNameEl   = this.querySelector('#fileName');
        this.manifestStateEl = this.querySelector('#manifestState');
        this.statusText   = this.querySelector('#statusText');
        this.phaseTitle   = this.querySelector('#phaseTitle');
        this.progressFill = this.querySelector('#progressFill');
        this.startBtn     = this.querySelector('#startBtn');
        this.cancelBtn    = this.querySelector('#cancelBtn');

        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this._handleFile(e.target.files[0]));
        this.querySelector('#manifestBtn').addEventListener('click', () => this.manifestInput.click());
        this.manifestInput.addEventListener('change', (e) => this._handleManifest(e.target.files[0]));

        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.style.borderColor = 'var(--c-primary)';
        });
        this.dropZone.addEventListener('dragleave', () => { this.dropZone.style.borderColor = ''; });
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.style.borderColor = '';
            const f = e.dataTransfer.files[0];
            if (f) this._handleFile(f);
        });

        this.cancelBtn.addEventListener('click', () => this._cancel());
        this.startBtn.addEventListener('click', () => this._startOta());
    }

    show(deviceId) {
        if (this._run || this._cancelPromise) {
            this.overlay.style.display = 'flex';
            return;
        }
        this.deviceId = deviceId;
        this._resetPackageState();
        this._setStatus('请选择固件 .bin 和对应 manifest', '');
        this._setProgress(0);
        this.overlay.style.display = 'flex';
    }

    hide() {
        if (this._run) { this._cancel(); return; }
        this.overlay.style.display = 'none';
        if (this.fileInput) this.fileInput.value = '';
        if (this.manifestInput) this.manifestInput.value = '';
    }

    disconnectedCallback() {
        if (this._run) this._cancel();
    }

    _resetPackageState() {
        this._packageRevision++;
        this._manifestRevision++;
        this.fileBuffer = null;
        this.fileSha256 = null;
        this.manifestJson = null;
        this.manifestTarget = null;
        this.manifestVersion = null;
        this._phase = 'idle';
        this._cancelled = false;
        this._clearWait();
        this.fileNameEl.textContent = '';
        this.manifestStateEl.textContent = 'manifest（必需）：未选择';
        this.manifestStateEl.classList.remove('loaded');
        this._restoreUi();
    }

    _setStatus(msg, type = '') {
        this.statusText.textContent = msg;
        this.statusText.style.color = type === 'error' ? 'var(--c-danger)' : type === 'success' ? '#0E9A80' : 'var(--c-mut)';
        const bar = this.querySelector('#otaBar');
        if (bar) bar.className = 'ota-bar' + (type === 'error' ? ' err' : type === 'success' ? ' ok' : '');
    }

    _setProgress(pct) { this.progressFill.style.width = `${pct}%`; }

    async _handleFile(file) {
        if (!file || this._run || this._cancelPromise) return;
        const revision = ++this._packageRevision;
        this.fileBuffer = null;
        this.fileSha256 = null;
        this.manifestTarget = null;
        this.manifestVersion = null;
        this.startBtn.disabled = true;
        if (!file.name.toLowerCase().endsWith('.bin')) { this._setStatus('请选择 .bin 格式的固件文件', 'error'); return; }
        this.fileNameEl.textContent = file.name;
        this._setStatus(`正在读取 ${file.name} …`);
        try {
            const bytes = new Uint8Array(await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = event => resolve(event.target.result);
                reader.onerror = () => reject(new Error('文件读取失败'));
                reader.readAsArrayBuffer(file);
            }));
            const sha = await window.SmartBLEOtaContract.OtaManifest.sha256Hex(bytes);
            if (revision !== this._packageRevision) return;
            this.fileBuffer = bytes;
            this.fileSha256 = sha;
            this._validateManifest();
        } catch (error) {
            if (revision === this._packageRevision) this._setStatus(`文件读取失败：${error.message || error}`, 'error');
        }
    }

    _handleManifest(file) {
        if (!file || this._run || this._cancelPromise) return;
        const revision = this._packageRevision;
        const manifestRevision = ++this._manifestRevision;
        this.manifestJson = null;
        this.manifestTarget = null;
        this.manifestVersion = null;
        this.startBtn.disabled = true;
        const reader = new FileReader();
        reader.onload = event => {
            if (revision !== this._packageRevision || manifestRevision !== this._manifestRevision) return;
            try {
                this.manifestJson = JSON.parse(event.target.result);
                this.manifestStateEl.textContent = `manifest：${file.name}`;
                this._validateManifest();
            } catch {
                this.manifestJson = null;
                this._setStatus('manifest JSON 解析失败', 'error');
            }
        };
        reader.onerror = () => { if (revision === this._packageRevision) this._setStatus('manifest 文件读取失败', 'error'); };
        reader.readAsText(file);
    }

    _validateManifest() {
        this.manifestTarget = null;
        this.manifestVersion = null;
        this.startBtn.disabled = true;
        if (!this.fileBuffer?.length || !this.fileSha256) { this._setStatus('请选择非空固件 .bin', ''); return false; }
        const result = window.SmartBLEOtaContract?.OtaManifest.validateRequired(this.manifestJson, this.fileBuffer.length, this.fileSha256);
        if (!result?.ok) { this._setStatus(`包校验失败（${result?.code || 'missing_contract'}）：${result?.message || 'OTA 契约未加载'}`, 'error'); return false; }
        this.manifestTarget = result.target;
        this.manifestVersion = result.version;
        this.startBtn.disabled = Boolean(this._run || this._cancelPromise);
        this._setStatus(`包校验通过：${result.target} · ${result.version} · ${this.fileBuffer.length} 字节`, 'success');
        return true;
    }

    _ble() {
        if (window.bleAPI) return window.bleAPI;
        const call = typeof invoke === 'function' ? invoke : (window.__TAURI__?.core?.invoke || window.__TAURI__?.tauri?.invoke || window.__TAURI__?.invoke);
        const events = typeof listen === 'function' ? listen : (window.__TAURI__?.event?.listen || window.__TAURI__?.listen);
        if (!call || !events) throw new Error('BLE API 未就绪');
        return {
            writeRaw: (deviceId, serviceUuid, charUuid, data, withoutResponse) => call('write_raw', { deviceId, serviceUuid, charUuid, data, writeWithResponse: !withoutResponse }),
            notifyCharacteristic: (deviceId, serviceUuid, charUuid, notify) => call('notify_characteristic', { deviceId, serviceUuid, charUuid, notify }),
            disconnect: deviceId => call('disconnect', { deviceId }),
            onCharacteristicValueChanged: callback => events('notification-received', event => { const p = event.payload || {}; callback({ deviceId: p.deviceId, serviceUuid: p.serviceUuid, characteristicUuid: p.charUuid, value: p.value }); }),
            onDeviceDisconnected: callback => events('device-disconnected', event => callback({ id: event.payload?.deviceId })),
        };
    }

    _isCurrent(run) { return this._run === run && run.generation === this._generation && !run.stopped; }
    _assertRun(run) {
        if (!this._isCurrent(run)) throw new Error('OTA 会话已取消');
        if (run.error) throw run.error;
        if (run.disconnected && !run.successSeen) throw new Error('设备已断开，升级结果未确认');
    }

    async _writeRun(run, charUuid, bytes) {
        this._assertRun(run);
        const result = await run.api.writeRaw(run.deviceId, this.otaServiceUuid, charUuid, Array.from(bytes), false);
        this._assertRun(run);
        if (result?.success !== true) throw new Error(result?.error || '写入未确认');
    }

    _onValueChanged(data, run = this._run) {
        if (!run || !this._isCurrent(run) || data?.deviceId !== run.deviceId) return;
        const norm = value => String(value || '').toLowerCase().replace(/-/g, '');
        if (norm(data.characteristicUuid) !== norm(this.charStatusUuid)) return;
        if (data.serviceUuid && norm(data.serviceUuid) !== norm(this.otaServiceUuid)) return;
        const contract = window.SmartBLEOtaContract;
        const text = contract.bytesToUtf8(contract.hexToBytes(data.value || ''));
        const kind = contract.OtaStatusClassifier.classify(text);
        if (kind === 'error') {
            run.error = new Error(`设备报错：${text}`);
            this._rejectWait(run.error);
        } else if (this._pendingWait?.run === run && this._pendingWait.kind === kind) {
            if (kind === 'success') run.successSeen = true;
            const waiter = this._pendingWait;
            this._pendingWait = null;
            this._clearWait();
            waiter.resolve();
        }
    }

    _waitFor(run, kind) {
        this._assertRun(run);
        const promise = new Promise((resolve, reject) => {
            this._pendingWait = { run, kind, resolve, reject };
            this._armWait(30, () => {
                const error = new Error(`等待设备 ${kind} 超时（30s）`);
                run.error = error;
                this._rejectWait(error);
            });
        });
        promise.catch(() => {}); // ACK can fail before the waiter is awaited.
        return promise;
    }

    _rejectWait(error) {
        this._clearWait();
        const waiter = this._pendingWait;
        this._pendingWait = null;
        waiter?.reject(error);
    }

    _armWait(seconds, onTimeout) { this._clearWait(); this._waitTimer = setTimeout(onTimeout, seconds * 1000); }
    _clearWait() { if (this._waitTimer) clearTimeout(this._waitTimer); this._waitTimer = null; }

    async _startOta() {
        if (this._run || this._cancelPromise || !this.deviceId || !this._validateManifest()) return;
        let api;
        try { api = this._ble(); } catch (error) { this._setStatus(error.message || String(error), 'error'); return; }
        const run = { generation: ++this._generation, deviceId: this.deviceId, bytes: this.fileBuffer.slice(), api, listeners: [], subscribed: false, started: false, stopped: false, disconnected: false, successSeen: false };
        this._run = run;
        this._cancelled = false;
        this._phase = 'preparing';
        this.startBtn.disabled = true;
        this.dropZone.style.pointerEvents = 'none';
        if (this.manifestBtn) this.manifestBtn.disabled = true;
        this._setProgress(0);
        try {
            run.listeners.push(await run.api.onCharacteristicValueChanged(data => this._onValueChanged(data, run)));
            this._assertRun(run);
            run.listeners.push(await run.api.onDeviceDisconnected(data => {
                if (!this._isCurrent(run) || (data?.id || data?.deviceId) !== run.deviceId) return;
                run.disconnected = true;
                if (!run.successSeen) { run.error = new Error('设备已断开，升级结果未确认'); this._rejectWait(run.error); }
            }));
            this._assertRun(run);
            const subscription = await run.api.notifyCharacteristic(run.deviceId, this.otaServiceUuid, this.charStatusUuid, true);
            this._assertRun(run);
            if (subscription?.success !== true) throw new Error(subscription?.error || 'OTA 状态订阅未确认');
            run.subscribed = true;
            this._phase = 'waiting_ready';
            const ready = this._waitFor(run, 'ready'); // Arm before CTRL write; do not lose an early ready.
            const payload = window.SmartBLEOtaContract.OtaStartPayload.build({ manifestTarget: this.manifestTarget, manifestVersion: this.manifestVersion, fileSize: run.bytes.length, chunkSize: this.chunkSize, sha256: this.fileSha256 });
            run.started = true;
            await this._writeRun(run, this.charControlUuid, new TextEncoder().encode(JSON.stringify(payload)));
            await ready;
            this._assertRun(run);
            this._phase = 'transferring';
            for (let sent = 0; sent < run.bytes.length;) {
                const end = Math.min(sent + this.chunkSize, run.bytes.length);
                await this._writeRun(run, this.charDataUuid, run.bytes.slice(sent, end));
                sent = end;
                this._setProgress(Math.floor(sent * 100 / run.bytes.length));
                this._setStatus(`传输中：${sent} / ${run.bytes.length} 字节`);
                if (sent < run.bytes.length) await this._sleep(20);
                this._assertRun(run);
            }
            this._phase = 'committing';
            const success = this._waitFor(run, 'success');
            await this._writeRun(run, this.charControlUuid, new TextEncoder().encode(JSON.stringify({ op: 'commit' })));
            await success;
            this._assertRun(run);
            this._phase = 'done';
            this._setProgress(100);
            this._setStatus('设备确认升级成功，重启后请核验固件版本', 'success');
        } catch (error) {
            this._rejectWait(error);
            if (this._isCurrent(run)) {
                this._phase = 'idle';
                this._setStatus(run.successSeen ? '设备已报告成功，但提交写入响应未确认；请重连核验固件版本' : `OTA 失败：${error.message || error}`, 'error');
                await this._disconnectRun(run); // Never resume a failed transaction on the old handles.
            }
        } finally {
            await this._cleanupRun(run);
            if (this._run === run) { this._run = null; this._restoreUi(); }
        }
    }

    async _disconnectRun(run) {
        // This is a deliberate lifecycle boundary, not a passive drop to retry.
        window.appInstance?.userDisconnected?.add(run.deviceId);
        if (typeof state !== 'undefined') state.reconnect?.userDisconnected?.add(run.deviceId);
        let result;
        try { result = await run.api.disconnect(run.deviceId); }
        catch (error) { result = { success: false, error: error.message || String(error) }; }
        run.disconnected = true;
        if (result?.success !== true) return result?.error || '断开会话未确认';
        return null;
    }

    async _cleanupRun(run) {
        for (const stop of run.listeners.splice(0)) { try { stop?.(); } catch (_) {} }
        if (run.subscribed && !run.disconnected) {
            run.subscribed = false;
            try { await run.api.notifyCharacteristic(run.deviceId, this.otaServiceUuid, this.charStatusUuid, false); } catch (_) {}
        }
    }

    async _cancel() {
        if (this._cancelPromise) return this._cancelPromise;
        const run = this._run;
        if (!run) { this.hide(); return; }
        run.stopped = true;
        this._generation++;
        this._cancelled = true;
        this._phase = 'idle';
        this._rejectWait(new Error('用户已取消'));
        this._cancelPromise = (async () => {
            let failure = null;
            if (run.started && !run.disconnected) {
                try {
                    const result = await run.api.writeRaw(run.deviceId, this.otaServiceUuid, this.charControlUuid, Array.from(new TextEncoder().encode(JSON.stringify({ op: 'abort' }))), false);
                    if (result?.success !== true) failure = result?.error || '设备取消写入未确认';
                } catch (error) { failure = error.message || String(error); }
            }
            failure = (await this._disconnectRun(run)) || failure;
            await this._cleanupRun(run);
            if (this._run === run) this._run = null;
            this._setStatus(failure ? `已停止传输，但设备取消未确认：${failure}；请重连检查` : '已取消，设备会话已断开', failure ? 'error' : '');
            if (!failure) this.hide();
        })();
        try { await this._cancelPromise; }
        finally { this._cancelPromise = null; this._restoreUi(); }
    }

    _restoreUi() {
        this.dropZone.style.pointerEvents = 'auto';
        if (this.manifestBtn) this.manifestBtn.disabled = false;
        this.startBtn.disabled = Boolean(this._run || this._cancelPromise || !this.manifestTarget || !this.manifestVersion || !this.fileBuffer?.length);
    }

    _sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

customElements.define('ota-dialog', OtaDialog);
