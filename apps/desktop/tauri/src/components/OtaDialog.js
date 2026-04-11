class OtaDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.deviceId = null;
        this.fileBuffer = null;
        this.chunkSize = 180;

        // Ota Service UUID definitions
        this.otaServiceUuid = "4FAFC201-1FB5-459E-8FCC-C5C9C331914D".toLowerCase();
        this.charControlUuid = "BEB5483E-36E1-4688-B7F5-EA07361B26C0".toLowerCase();
        this.charDataUuid = "BEB5483E-36E1-4688-B7F5-EA07361B26C1".toLowerCase();
        
        this.shadowRoot.innerHTML = `
            <style>
                .overlay {
                    display: none;
                    position: fixed;
                    top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0,0,0,0.5);
                    z-index: 2000;
                    align-items: center;
                    justify-content: center;
                }
                .overlay.visible { display: flex; }
                .dialog {
                    background: var(--bg-primary);
                    padding: 24px;
                    border-radius: 12px;
                    width: 400px;
                    color: var(--text-primary);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                h3 { margin-top: 0; }
                .file-upload {
                    border: 2px dashed var(--border-color);
                    padding: 20px;
                    text-align: center;
                    cursor: pointer;
                    margin-bottom: 20px;
                    border-radius: 8px;
                }
                .file-upload:hover { border-color: var(--accent-color); }
                .progress-bar-container {
                    width: 100%;
                    height: 10px;
                    background: var(--border-color);
                    border-radius: 5px;
                    overflow: hidden;
                    margin: 10px 0;
                }
                .progress-bar {
                    height: 100%;
                    background: var(--accent-color);
                    width: 0%;
                    transition: width 0.2s;
                }
                .buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                }
                button {
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: none;
                    cursor: pointer;
                    background: var(--accent-color);
                    color: white;
                }
                button.secondary { background: var(--border-color); color: var(--text-primary); }
                button:disabled { opacity: 0.5; cursor: not-allowed; }
            </style>
            
            <div class="overlay" id="overlay">
                <div class="dialog">
                    <h3>固件升级 (OTA)</h3>
                    <input type="file" id="fileInput" accept=".bin" style="display:none;" />
                    
                    <div class="file-upload" id="uploadDropArea">
                        <span id="fileName">点击选择 .bin 固件文件</span>
                    </div>
                    
                    <div id="statusText" style="font-size: 14px; margin-bottom: 5px; color: var(--text-secondary);">等待选择文件...</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="progressBar"></div>
                    </div>
                    
                    <div class="buttons">
                        <button class="secondary" id="cancelBtn">取消</button>
                        <button id="startBtn" disabled>开始升级</button>
                    </div>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.overlay = this.shadowRoot.getElementById('overlay');
        this.fileInput = this.shadowRoot.getElementById('fileInput');
        this.uploadDropArea = this.shadowRoot.getElementById('uploadDropArea');
        this.fileNameSpan = this.shadowRoot.getElementById('fileName');
        this.statusText = this.shadowRoot.getElementById('statusText');
        this.progressBar = this.shadowRoot.getElementById('progressBar');
        this.startBtn = this.shadowRoot.getElementById('startBtn');
        this.cancelBtn = this.shadowRoot.getElementById('cancelBtn');

        this.uploadDropArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
        
        this.cancelBtn.addEventListener('click', () => this.hide());
        this.startBtn.addEventListener('click', () => this.startOta());
    }

    show(deviceId) {
        this.deviceId = deviceId;
        this.fileBuffer = null;
        this.fileNameSpan.textContent = '点击选择 .bin 固件文件';
        this.statusText.textContent = '等待选择文件...';
        this.progressBar.style.width = '0%';
        this.startBtn.disabled = true;
        this.overlay.classList.add('visible');
    }

    hide() {
        this.overlay.classList.remove('visible');
    }

    handleFileSelect(file) {
        if (!file) return;
        this.fileNameSpan.textContent = file.name;
        this.statusText.textContent = \`正在读取 \${file.name}...\`;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.fileBuffer = new Uint8Array(e.target.result);
            this.statusText.textContent = \`读取成功: \${this.fileBuffer.length} Bytes\`;
            this.startBtn.disabled = false;
        };
        reader.onerror = () => {
            this.statusText.textContent = '文件读取失败';
        };
        reader.readAsArrayBuffer(file);
    }

    async startOta() {
        if (!this.fileBuffer || !this.deviceId) return;
        this.startBtn.disabled = true;
        this.uploadDropArea.style.pointerEvents = 'none';

        try {
            this.statusText.textContent = '发送 OTA 开始指令...';
            // Start payload
            const startPayload = \`{"action":"start","size":\${this.fileBuffer.length},"chunk_size":\${this.chunkSize},"firmware_version":"desktop-build"}\`;
            const encoder = new TextEncoder();
            
            await window.__TAURI__.invoke('write_characteristic', {
                deviceId: this.deviceId,
                serviceUuid: this.otaServiceUuid,
                charUuid: this.charControlUuid,
                data: Array.from(encoder.encode(startPayload)),
                writeType: 'WithResponse'
            });

            await this.sleep(200);
            
            // Send chunks
            let sent = 0;
            const total = this.fileBuffer.length;
            
            while (sent < total) {
                const end = Math.min(sent + this.chunkSize, total);
                const chunk = this.fileBuffer.slice(sent, end);
                
                await window.__TAURI__.invoke('write_characteristic', {
                    deviceId: this.deviceId,
                    serviceUuid: this.otaServiceUuid,
                    charUuid: this.charDataUuid,
                    data: Array.from(chunk),
                    writeType: 'WithoutResponse'
                });
                
                sent = end;
                const percent = Math.floor((sent / total) * 100);
                this.progressBar.style.width = \`\${percent}%\`;
                this.statusText.textContent = \`发送分包... \${percent}%\`;
                
                // throttle
                await this.sleep(20);
            }

            // Commit payload
            this.statusText.textContent = '发送结束指令...等待设备确认';
            const commitPayload = \`{"action":"commit"}\`;
            await window.__TAURI__.invoke('write_characteristic', {
                deviceId: this.deviceId,
                serviceUuid: this.otaServiceUuid,
                charUuid: this.charControlUuid,
                data: Array.from(encoder.encode(commitPayload)),
                writeType: 'WithResponse'
            });

            this.statusText.textContent = 'OTA 传输成功！';
            setTimeout(() => this.hide(), 2000);

        } catch (e) {
            this.statusText.textContent = \`OTA 失败: \${e}\`;
            this.statusText.style.color = 'red';
        } finally {
            this.uploadDropArea.style.pointerEvents = 'auto';
            this.startBtn.disabled = false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

customElements.define('ota-dialog', OtaDialog);
