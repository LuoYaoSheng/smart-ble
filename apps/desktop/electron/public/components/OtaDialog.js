/**
 * OtaDialog Web Component — Electron版
 * 固件升级流程: start → chunk → commit
 * 通过 window.bleAPI.writeRaw (preload暴露) 发送原始字节数组
 * CSS token 与 SSOT 对齐 (--primary / --surface / --border / --error)
 */
class OtaDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.deviceId = null;
        this.fileBuffer = null;
        this.chunkSize = 180;
        this._cancelled = false;

        this.otaServiceUuid  = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';
        this.charControlUuid = 'beb5483e-36e1-4688-b7f5-ea07361b26c0';
        this.charDataUuid    = 'beb5483e-36e1-4688-b7f5-ea07361b26c1';

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
                    width: 420px;
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
                    margin-bottom: 16px;
                    transition: border-color 0.2s, background 0.2s;
                }
                .drop-zone:hover,
                .drop-zone.drag-over {
                    border-color: var(--primary, #007aff);
                    background: rgba(0, 122, 255, 0.05);
                }
                .drop-zone .drop-icon  { font-size: 28px; margin-bottom: 8px; }
                .drop-zone .drop-hint  { font-size: 13px; color: var(--text-secondary, #8e8e93); }
                .drop-zone .file-name  { font-size: 14px; font-weight: 500; color: var(--primary, #007aff); margin-top: 6px; }

                .status-row { font-size: 13px; color: var(--text-secondary, #8e8e93); margin-bottom: 10px; min-height: 18px; }
                .status-row.error   { color: var(--error, #ff3b30); }
                .status-row.success { color: var(--success, #34c759); }

                .progress-track {
                    width: 100%; height: 8px;
                    background: var(--border, #e5e5ea);
                    border-radius: 4px; overflow: hidden; margin-bottom: 16px;
                }
                .progress-fill {
                    height: 100%;
                    background: var(--primary, #007aff);
                    width: 0%; border-radius: 4px;
                    transition: width 0.15s linear;
                }

                .btn-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
                button { padding: 9px 18px; border-radius: 8px; border: none; font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }
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
                        <div class="drop-hint">点击选择 .bin 文件，或将文件拖入此处</div>
                        <div class="file-name" id="fileName"></div>
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
        this.dropZone     = sr.getElementById('dropZone');
        this.fileNameEl   = sr.getElementById('fileName');
        this.statusText   = sr.getElementById('statusText');
        this.progressFill = sr.getElementById('progressFill');
        this.startBtn     = sr.getElementById('startBtn');
        this.cancelBtn    = sr.getElementById('cancelBtn');

        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this._handleFile(e.target.files[0]));

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

        this.cancelBtn.addEventListener('click', () => {
            this._cancelled = true;
            this.hide();
        });
        this.startBtn.addEventListener('click', () => this._startOta());
    }

    show(deviceId) {
        this.deviceId = deviceId;
        this.fileBuffer = null;
        this._cancelled = false;
        this.fileNameEl.textContent = '';
        this._setStatus('等待选择固件文件……', '');
        this._setProgress(0);
        this.startBtn.disabled = true;
        this.overlay.classList.add('visible');
    }

    hide() {
        this.overlay.classList.remove('visible');
        if (this.fileInput) this.fileInput.value = '';
    }

    _setStatus(msg, type = '') {
        this.statusText.textContent = msg;
        this.statusText.className = 'status-row' + (type ? ` ${type}` : '');
    }

    _setProgress(pct) {
        this.progressFill.style.width = `${pct}%`;
    }

    _handleFile(file) {
        if (!file) return;
        if (!file.name.endsWith('.bin')) {
            this._setStatus('请选择 .bin 格式的固件文件', 'error');
            return;
        }
        this.fileNameEl.textContent = file.name;
        this._setStatus(`正在读取 ${file.name} …`);

        const reader = new FileReader();
        reader.onload = (e) => {
            this.fileBuffer = new Uint8Array(e.target.result);
            this._setStatus(`已就绪：${this.fileBuffer.length.toLocaleString()} 字节`);
            this.startBtn.disabled = false;
        };
        reader.onerror = () => this._setStatus('文件读取失败', 'error');
        reader.readAsArrayBuffer(file);
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

    async _startOta() {
        if (!this.fileBuffer || !this.deviceId) return;
        this._cancelled = false;
        this.startBtn.disabled = true;
        this.dropZone.style.pointerEvents = 'none';
        this._setProgress(0);

        const encoder = new TextEncoder();
        const total   = this.fileBuffer.length;

        try {
            // 1. Start
            this._setStatus('发送 OTA 开始指令……');
            await this._writeRaw(
                this.charControlUuid,
                encoder.encode(JSON.stringify({
                    action: 'start', size: total,
                    chunk_size: this.chunkSize, firmware_version: 'electron-build',
                })),
                false, // WithoutResponse for speed; firmware ACKs via notify
            );
            await this._sleep(200);

            // 2. Chunks
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

            // 3. Commit
            this._setStatus('发送提交指令，等待设备重启……');
            await this._writeRaw(
                this.charControlUuid,
                encoder.encode(JSON.stringify({ action: 'commit' })),
                false,
            );

            this._setProgress(100);
            this._setStatus('✅ OTA 传输完成！设备正在重启……', 'success');
            setTimeout(() => this.hide(), 3000);

        } catch (err) {
            if (this._cancelled) {
                this._setStatus('已取消', '');
            } else {
                this._setStatus(`❌ OTA 失败: ${err.message || err}`, 'error');
            }
        } finally {
            this.dropZone.style.pointerEvents = 'auto';
            this.startBtn.disabled = false;
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

customElements.define('ota-dialog', OtaDialog);
