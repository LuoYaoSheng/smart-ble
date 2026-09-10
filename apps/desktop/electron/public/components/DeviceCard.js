//
// DeviceCard — 设备卡（P001 扫描 / P007 已连接两变体）
// 结构对齐 docs/specs/prototype/platform/desktop/high-fi/components/components.js C1 devCard：
//   scan 变体 = .dev > .top(.ava + .mid(.nm/.id/.meta(.sig+.dbm))) + .acts(连接)
//   conn 变体 = .dev.conn > .top(.ava(+on 角标) + .mid(.nm/.id/.meta)) + 断开
// light DOM（样式走全局 prototype.css，与正典单一样式源一致）。
// F005 显示名批准链保持：name → localName → AD 0x09/0x08 → Profile → 未命名 BLE · ID后四位。
//
class DeviceCard extends HTMLElement {
    constructor() {
        super();
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

    connectedCallback() {
        this.style.display = 'block';
        this.render();
    }

    set device(val) {
        this._device = val;
        this.render();
    }

    get device() {
        return this._device;
    }

    // 扫描卡「已连接」态由宿主注入（连接注册表在 App 实例，不在设备对象上）
    set connectedHint(v) {
        this._connectedHint = !!v;
        this.render();
    }

    esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
        }[c]));
    }

    ic(name, cls = '') {
        return `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
    }

    // 正典信号档位：≥-60 q4 / ≥-70 q3 / ≥-80 q2 / 其余 q1
    sigQuality(rssi) {
        const r = Number(rssi);
        if (Number.isNaN(r)) return 1;
        return r >= -60 ? 4 : r >= -70 ? 3 : r >= -80 ? 2 : 1;
    }

    sigHtml(rssi) {
        if (rssi == null || rssi === undefined) return '';
        return `<span class="sig q${this.sigQuality(rssi)}"><i></i><i></i><i></i><i></i></span><span class="dbm">${this.esc(rssi)} dBm</span>`;
    }

    render() {
        if (!this._device) {
            this.innerHTML = '';
            return;
        }
        const device = this._device;

        // F005 显示名批准链
        const resolved = window.SmartBLEDisplayName?.resolveDeviceDisplayName(device);
        const displayName = resolved ? resolved.displayName : (device.name || '未命名 BLE 设备');
        const nameInitial = ((displayName || '?').trim()[0] || '?').toUpperCase();

        if (this._isConnectionTab) {
            // P007 conn 变体：ava + 在线角标 + 名称/ID + 信号 + 「已连接 · 可进行 GATT 调试」+ 断开
            this.innerHTML = `
                <div class="dev conn">
                    <div class="top">
                        <div class="ava">${this.esc(nameInitial)}<span class="on">${this.ic('check', 'xs')}</span></div>
                        <div class="mid">
                            <div class="nm">${this.esc(displayName)}</div>
                            <div class="id mono">${this.esc(device.id)}</div>
                            <div class="meta">${this.sigHtml(device.rssi)}<span style="font-size:var(--fs-mini);color:var(--c-mut)">已连接 · 可进行 GATT 调试</span></div>
                        </div>
                        <div><button class="btn soft danger-t sm" id="disconnectBtn">${this.ic('x', 'sm')}<span>断开</span></button></div>
                    </div>
                </div>`;

            this.querySelector('#disconnectBtn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('disconnect', { detail: { id: device.id }, bubbles: true, composed: true }));
            });
            this.querySelector('.dev')?.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('show-detail', { detail: { id: device.id }, bubbles: true, composed: true }));
            });
        } else {
            // P001 scan 变体：ava + 名称/ID（未命名标注）/信号 + 连接按钮；整卡可点进详情
            const unnamed = !displayName || displayName.startsWith('未命名');
            const idLine = unnamed ? `${this.esc(device.id)}（未命名）` : this.esc(device.id);
            const connected = this._connectedHint || false;
            this.innerHTML = `
                <div class="dev">
                    <div class="top">
                        <div class="ava">${this.esc(nameInitial)}</div>
                        <div class="mid">
                            <div class="nm">${this.esc(displayName)}</div>
                            <div class="id mono">${idLine}</div>
                            <div class="meta">${this.sigHtml(device.rssi)}</div>
                        </div>
                    </div>
                    <div class="acts">
                        <button class="btn ${connected ? 'soft' : 'primary'} sm" id="connectBtn" ${connected ? 'disabled' : ''}>
                            ${this.ic('link', 'sm')}<span>${connected ? '已连接' : '连接'}</span>
                        </button>
                    </div>
                </div>`;

            this.querySelector('#connectBtn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (connected) return;
                this.dispatchEvent(new CustomEvent('connect', { detail: { id: device.id }, bubbles: true, composed: true }));
            });
            this.querySelector('.dev')?.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('show-detail', { detail: { id: device.id }, bubbles: true, composed: true }));
            });
        }
    }
}

customElements.define('device-card', DeviceCard);
