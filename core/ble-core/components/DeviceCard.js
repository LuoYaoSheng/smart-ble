class DeviceCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._device = null;
        this._isConnectionTab = false;
    }

    static get observedAttributes() {
        return ['is-connection-tab'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'is-connection-tab') {
            this._isConnectionTab = newValue !== null && newValue !== 'false';
            this.render();
        }
    }

    set device(val) {
        this._device = val;
        this.render();
    }

    get device() {
        return this._device;
    }

    // Utility methods
    formatShortUuid(uuid) {
        if (!uuid) return '';
        return uuid.length > 8 ? uuid.substring(0, 8) + '...' : uuid;
    }

    parseManufacturerData(hex) {
        if (hex && hex.length >= 4) {
            const companyId = parseInt(hex.substring(2, 4) + hex.substring(0, 2), 16);
            const companies = {
                0x004C: 'Apple',
                0x00E0: 'Google',
                0x006D: 'Microsoft',
                0x0087: 'Garmin',
                0x00D6: 'Cyble',
                0xFFFF: 'Test'
            };
            return companies[companyId] || `0x${companyId.toString(16).toUpperCase().padStart(4, '0')}`;
        }
        return 'Unknown';
    }

    getRssiClass(rssi) {
        if (rssi >= -50) return 'excellent';
        if (rssi >= -70) return 'good';
        if (rssi >= -90) return 'fair';
        return 'weak';
    }

    getSignalBars(rssi) {
        const bars = 4;
        const activeBars = Math.min(4, Math.max(0, Math.ceil((100 + rssi) / 20)));
        let html = '';
        for (let i = 0; i < bars; i++) {
            const active = i < activeBars ? 'active' : '';
            html += `<div class="signal-bar ${active}"></div>`;
        }
        return html;
    }

    render() {
        if (!this._device) return;
        const device = this._device;

        // Base styles shared across platforms
        const style = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .device-card {
                    background: white;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }
                .device-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border-color: rgba(0,122,255,0.3);
                }
                .device-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: rgba(0, 122, 255, 0.1);
                    color: #007aff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                }
                .connection-icon {
                    background: rgba(52, 199, 89, 0.1);
                    color: #34c759;
                    font-size: 16px;
                }
                .device-info {
                    flex: 1;
                    min-width: 0;
                }
                .device-name {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1c1c1e;
                    margin-bottom: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .device-id {
                    font-size: 13px;
                    color: #8e8e93;
                    font-family: monospace;
                }
                .device-services, .device-manufacturer {
                    font-size: 11px;
                    color: #8e8e93;
                    margin-top: 4px;
                }
                .device-meta {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .rssi-indicator {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 4px;
                }
                .signal-bars {
                    display: flex;
                    gap: 2px;
                    align-items: flex-end;
                    height: 12px;
                }
                .signal-bar {
                    width: 3px;
                    background: #e5e5ea;
                    border-radius: 1px;
                }
                .signal-bar:nth-child(1) { height: 4px; }
                .signal-bar:nth-child(2) { height: 7px; }
                .signal-bar:nth-child(3) { height: 10px; }
                .signal-bar:nth-child(4) { height: 12px; }
                
                .signal-bars.excellent .signal-bar.active { background: #34c759; }
                .signal-bars.good .signal-bar.active { background: #32ade6; }
                .signal-bars.fair .signal-bar.active { background: #ffcc00; }
                .signal-bars.weak .signal-bar.active { background: #ff3b30; }
                
                .rssi-text {
                    font-size: 11px;
                    color: #8e8e93;
                    font-weight: 500;
                }
                .btn {
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                }
                .btn-icon {
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    border-radius: 16px;
                    background: #f2f2f7;
                    color: #007aff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    transition: background 0.2s;
                }
                .btn-icon:hover { background: #e5e5ea; }
                .btn-secondary { background: #f2f2f7; color: #1c1c1e; }
                .btn-danger { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
                button:active { opacity: 0.7; }
            </style>
        `;

        if (this._isConnectionTab) {
            this.shadowRoot.innerHTML = `
                ${style}
                <div class="device-card" style="box-shadow: none; border-color: rgba(0,0,0,0.05); cursor: default;">
                    <div class="device-icon connection-icon">●</div>
                    <div class="device-info">
                        <div class="device-name">${device.name || 'Unknown Device'}</div>
                        <div class="device-id">${device.id}</div>
                    </div>
                    <button class="btn btn-secondary" id="detailBtn">详情</button>
                    <button class="btn btn-danger" id="disconnectBtn">断开</button>
                </div>
            `;
            
            this.shadowRoot.getElementById('detailBtn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('show-detail', { detail: { id: device.id }, bubbles: true, composed: true }));
            });
            this.shadowRoot.getElementById('disconnectBtn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('disconnect', { detail: { id: device.id }, bubbles: true, composed: true }));
            });
        } else {
            const rssiClass = this.getRssiClass(device.rssi);
            const adv = device.advertisement || {};

            let serviceInfo = '';
            if (adv.serviceUuids && adv.serviceUuids.length > 0) {
                serviceInfo = `<div class="device-services">${adv.serviceUuids.map(uuid => this.formatShortUuid(uuid)).join(' · ')}</div>`;
            }

            let manufacturerInfo = '';
            if (adv.manufacturerData) {
                const companyCode = this.parseManufacturerData(adv.manufacturerData);
                manufacturerInfo = `<div class="device-manufacturer">厂商: ${companyCode} · ${adv.manufacturerData.substring(0, 8)}...</div>`;
            }

            this.shadowRoot.innerHTML = `
                ${style}
                <div class="device-card" id="cardContainer">
                    <div class="device-icon">📡</div>
                    <div class="device-info">
                        <div class="device-name">${device.name || '未知设备'}</div>
                        <div class="device-id">${this.formatShortUuid(device.id)}</div>
                        ${serviceInfo}
                        ${manufacturerInfo}
                    </div>
                    <div class="device-meta">
                        <div class="rssi-indicator">
                            <div class="signal-bars ${rssiClass}">
                                ${this.getSignalBars(device.rssi)}
                            </div>
                            <span class="rssi-text">${device.rssi || 0} dBm</span>
                        </div>
                        <button class="btn btn-icon" id="connectBtn" title="连接设备">→</button>
                    </div>
                </div>
            `;

            this.shadowRoot.getElementById('connectBtn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('connect', { detail: { id: device.id }, bubbles: true, composed: true }));
            });

            this.shadowRoot.getElementById('cardContainer').addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('show-detail', { detail: { id: device.id, card: this }, bubbles: true, composed: true }));
            });
        }
    }
}

customElements.define('device-card', DeviceCard);
