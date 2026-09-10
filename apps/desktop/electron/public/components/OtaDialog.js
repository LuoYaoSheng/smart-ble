/**
 * OtaDialog Web Component — Electron版（OTA 契约对齐 · R-1/R-2）
 *
 * 流程（对齐 macOS OtaManager / core/apple SmartHidCore OtaContract.swift）：
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
        this._unsubscribeValue = null;

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
                        <span id="manifestState" style="color:var(--c-mut);flex:1">manifest（可选）：未选择</span>
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
        this.deviceId = deviceId;
        this._resetPackageState();
        this._setStatus('等待选择固件文件……', '');
        this._setProgress(0);
        this.startBtn.disabled = true;
        this.overlay.style.display = 'flex';
    }

    hide() {
        this._teardownSession();
        this.overlay.style.display = 'none';
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
        this.statusText.style.color = type === 'error' ? 'var(--c-danger)' : type === 'success' ? '#0E9A80' : 'var(--c-mut)';
        const bar = this.querySelector('#otaBar');
        if (bar) bar.className = 'ota-bar' + (type === 'error' ? ' err' : type === 'success' ? ' ok' : '');
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
            // 选包后重校验已选的 manifest（如有）
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
                this.manifestStateEl.style.color = 'var(--c-primary)';
                this._validateManifest();
            } catch {
                this.manifestJson = null;
                this.manifestTarget = null;
                this.manifestVersion = null;
                this.manifestStateEl.textContent = 'manifest：JSON 解析失败';
                this.manifestStateEl.style.color = '';
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

    async _writeRaw(charUuid, bytes, withoutResponse) {
        const result = await window.bleAPI.writeRaw(
            this.deviceId,
            this.otaServiceUuid,
            charUuid,
            Array.from(bytes),
            withoutResponse,
        );
        if (!result.success) throw new Error(result.error || 'writeRaw failed');
    }

    // ---- 契约状态帧处理（R-2 子串分类） ----

    _onValueChanged(data) {
        if (!data || data.deviceId !== this.deviceId) return;
        // UUID 规范化比较：通知事件带无横线 UUID，常量是带横线书写
        const norm = (u) => (u || '').toLowerCase().replace(/-/g, '');
        if (norm(data.characteristicUuid) !== norm(this.charStatusUuid)) return;
        const OC = window.SmartBLEOtaContract;
        const text = OC.bytesToUtf8(OC.hexToBytes(data.value || ''));
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
            // 订阅 STATUS 特征 notify（bleAPI 支持多监听者，互不影响 App 展示）
            await window.bleAPI.notifyCharacteristic(
                this.deviceId, this.otaServiceUuid, this.charStatusUuid, true,
            );
            if (this._unsubscribeValue) this._unsubscribeValue();
            this._unsubscribeValue = window.bleAPI.onCharacteristicValueChanged((data) => this._onValueChanged(data));

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
            await this._writeRaw(this.charControlUuid, encoder.encode(JSON.stringify(payload)), false);

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
                await this._writeRaw(this.charDataUuid, chunk, true); // WithoutResponse for throughput

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
            await this._writeRaw(this.charControlUuid, encoder.encode(JSON.stringify({ op: 'commit' })), false);
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
            // 传输/等待期取消：发送 {op:abort} 契约帧后关闭
            this._cancelled = true;
            this._clearWait();
            this._phase = 'idle';
            try {
                const encoder = new TextEncoder();
                await this._writeRaw(this.charControlUuid, encoder.encode(JSON.stringify({ op: 'abort' })), false);
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

    _teardownSession() {
        this._clearWait();
        this._phase = 'idle';
        if (this._unsubscribeValue) {
            this._unsubscribeValue();
            this._unsubscribeValue = null;
        }
        // 关 notify（失败静默——设备可能已断开）
        if (this.deviceId) {
            window.bleAPI?.notifyCharacteristic(
                this.deviceId, this.otaServiceUuid, this.charStatusUuid, false,
            ).catch(() => {});
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

customElements.define('ota-dialog', OtaDialog);
