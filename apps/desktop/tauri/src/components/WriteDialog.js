class WriteDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._serviceUuid = null;
        this._charUuid = null;
    }

    connectedCallback() {
        this.render();
    }

    show(serviceUuid, charUuid) {
        this._serviceUuid = serviceUuid;
        this._charUuid = charUuid;
        const dialog = this.shadowRoot.getElementById('writeDialogOverlay');
        const label = this.shadowRoot.getElementById('writeCharLabel');
        const input = this.shadowRoot.getElementById('writeDataInput');

        if (label) label.textContent = `Characteristic: ${charUuid}`;
        if (input) {
            input.value = '';
            input.focus();
        }
        if (dialog) dialog.style.display = 'flex';
    }

    close() {
        this._serviceUuid = null;
        this._charUuid = null;
        const dialog = this.shadowRoot.getElementById('writeDialogOverlay');
        if (dialog) dialog.style.display = 'none';
    }

    _handleWrite() {
        if (!this._charUuid) return;
        const input = this.shadowRoot.getElementById('writeDataInput');
        const data = input ? input.value.trim() : '';
        if (!data) return;

        const formatNode = this.shadowRoot.querySelector('input[name="format"]:checked');
        const format = formatNode ? formatNode.value : 'hex';

        this.dispatchEvent(new CustomEvent('write', {
            detail: {
                serviceUuid: this._serviceUuid,
                charUuid: this._charUuid,
                data,
                format
            },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .dialog-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }
                .dialog {
                    background: #ffffff;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                    display: flex;
                    flex-direction: column;
                }
                .dialog-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .dialog-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #1c1c1e;
                }
                .dialog-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #8e8e93;
                    padding: 4px;
                }
                .dialog-close:hover { color: #1c1c1e; }
                .dialog-body {
                    padding: 20px;
                }
                .form-group {
                    margin-bottom: 20px;
                }
                .form-group label {
                    display: block;
                    font-size: 13px;
                    color: #8e8e93;
                    margin-bottom: 8px;
                }
                .input {
                    width: 100%;
                    padding: 10px 12px;
                    border-radius: 8px;
                    border: 1px solid #d1d1d6;
                    box-sizing: border-box;
                    font-size: 14px;
                    font-family: monospace;
                }
                .input:focus {
                    outline: none;
                    border-color: #007aff;
                }
                .format-toggle {
                    display: flex;
                    gap: 16px;
                }
                .radio {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 14px;
                    cursor: pointer;
                }
                .dialog-footer {
                    padding: 16px 20px;
                    background: #f8f9fa;
                    border-top: 1px solid rgba(0,0,0,0.05);
                    border-radius: 0 0 12px 12px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .btn {
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                }
                .btn-primary { background: #007aff; color: white; }
                .btn-secondary { background: #e5e5ea; color: #1c1c1e; }
                .btn:active { transform: scale(0.98); }
            </style>
            <div id="writeDialogOverlay" class="dialog-overlay" style="display: none;">
                <div class="dialog">
                    <div class="dialog-header">
                        <h3>Write Characteristic</h3>
                        <button class="dialog-close">×</button>
                    </div>
                    <div class="dialog-body">
                        <div class="form-group">
                            <label id="writeCharLabel">Characteristic: </label>
                            <input type="text" id="writeDataInput" class="input" placeholder="FF 01 02">
                        </div>
                        <div class="format-toggle">
                            <label class="radio">
                                <input type="radio" name="format" value="hex" checked>
                                <span>HEX</span>
                            </label>
                            <label class="radio">
                                <input type="radio" name="format" value="utf8">
                                <span>UTF-8</span>
                            </label>
                        </div>
                    </div>
                    <div class="dialog-footer">
                        <button class="btn btn-secondary dialog-cancel">Cancel</button>
                        <button class="btn btn-primary dialog-confirm">Write</button>
                    </div>
                </div>
            </div>
        `;

        this.shadowRoot.querySelector('.dialog-close').addEventListener('click', () => this.close());
        this.shadowRoot.querySelector('.dialog-cancel').addEventListener('click', () => this.close());
        this.shadowRoot.querySelector('.dialog-confirm').addEventListener('click', () => this._handleWrite());

        // Also allow pressing "Enter" to submit
        this.shadowRoot.getElementById('writeDataInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this._handleWrite();
            }
        });
    }
}

customElements.define('write-dialog', WriteDialog);
