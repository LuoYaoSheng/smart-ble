//
// AdvertisementSheet — 广播数据弹窗（P001 · F004 · R04 口径）
// 结构对齐 docs/specs/prototype/platform/desktop/high-fi/app.js p001-advdlg（.mask.sheetm/.sheet/.grip/.sh-h/.sh-b），
// 内容对齐 uniapp components/scan/advertisement-dialog.vue：kv 四行（设备 ID/名称/RSSI/profileMatch）
// + 深色 ad-sec 段（Service UUIDs / AD 结构逐段（平台解析字段重建）/ 厂商 ID / Service Data），
// 单字段缺失逐项标注「本轮平台 API 未提供此字段」。
// light DOM，样式走全局 prototype.css。
// 事件契约：copy { detail: { text } }（宿主写剪贴板并 toast「已复制」）；close。
// AD 分段重建算法镜像 uniapp services/ble-runtime/advertisement.js buildAdSegments（同口径，与 Flutter 一致）。
//
class AdvertisementSheet extends HTMLElement {
    constructor() {
        super();
        this._device = null;
    }

    connectedCallback() {
        this.render();
    }

    set device(val) {
        this._device = val;
        this.render();
    }

    get device() {
        return this._device;
    }

    show(device) {
        this._device = device;
        this.render();
        const overlay = this.querySelector('#advSheetOverlay');
        if (overlay) overlay.style.display = 'flex';
    }

    close() {
        const overlay = this.querySelector('#advSheetOverlay');
        if (overlay) overlay.style.display = 'none';
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
        }[c]));
    }

    ic(name, cls = '') {
        return `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
    }

    // ---- 广播字段投影（noble/btleplug 形状 → 弹窗展示形状） ------------------

    // 输入两种形状：{id, hex} 投影对象（btleplug 壳投影）；noble 整段 hex 串（前 2 字节小端厂商 ID）
    manufacturerEntry(adv) {
        const mfg = adv?.manufacturerData;
        if (mfg && typeof mfg === 'object') {
            const hex = typeof mfg.hex === 'string' ? mfg.hex.replace(/\s+/g, '').toLowerCase() : '';
            if (!hex || !/^(?:[0-9a-f]{2})+$/.test(hex)) return null;
            const id = Number(mfg.id);
            return { id: Number.isFinite(id) ? id : null, hex };
        }
        const hex = typeof mfg === 'string' ? mfg.replace(/\s+/g, '') : '';
        if (!hex || !/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
        const id = parseInt(hex.slice(2, 4) + hex.slice(0, 2), 16);
        return { id: Number.isFinite(id) ? id : null, hex: hex.slice(4).toLowerCase() };
    }

    profileMatchText(device) {
        const level = Number(device?.profileMatch) || 0;
        if (level >= 2) return `STRONG · ${window.SmartHidDesktop?.smartHidProfile?.id || 'smart-hid'}`;
        if (level === 1) return `WEAK · ${window.SmartHidDesktop?.smartHidProfile?.id || 'smart-hid'}`;
        return '—';
    }

    // ---- AD 结构逐段（平台解析字段重建，算法镜像 uniapp buildAdSegments） ------

    utf8Bytes(value) {
        const encoded = encodeURIComponent(value);
        const bytes = [];
        for (let index = 0; index < encoded.length; index++) {
            if (encoded[index] === '%') {
                bytes.push(parseInt(encoded.slice(index + 1, index + 3), 16));
                index += 2;
            } else {
                bytes.push(encoded.charCodeAt(index));
            }
        }
        return bytes;
    }

    hexToBytes(hex) {
        const out = [];
        for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
        return out;
    }

    buildAdSegments(device) {
        const adv = device?.advertisement || {};
        const segments = [];
        const add = (type, name, payload) => {
            const frame = [payload.length + 1, parseInt(type.slice(2), 16), ...payload];
            segments.push({
                type,
                name,
                frameLength: frame.length,
                hex: frame.map((byte) => byte.toString(16).padStart(2, '0')).join('')
            });
        };

        const name = device?.localName || device?.name;
        if (name) add('0x09', '完整本地名称', [...this.utf8Bytes(name)]);

        const shorts = [];
        const fulls = [];
        for (const raw of adv.serviceUuids || []) {
            const v = String(raw).trim().toLowerCase().replaceAll('-', '');
            if (v.length === 4) shorts.push(parseInt(v, 16));
            else if (v.length === 32) fulls.push(v);
        }
        if (shorts.length) {
            // 16 位 UUID 列表按小端序拼负载
            const payload = [];
            for (const id of shorts) payload.push(id & 0xff, (id >> 8) & 0xff);
            add('0x03', '16 位 Service UUID 列表', payload);
        }
        if (fulls.length) {
            // 128 位 UUID 列表每 UUID 按小端字节序
            const payload = [];
            for (const v of fulls) {
                for (let i = v.length; i > 0; i -= 2) payload.push(parseInt(v.slice(i - 2, i), 16));
            }
            add('0x07', '128 位 Service UUID 列表', payload);
        }

        const mfg = this.manufacturerEntry(adv);
        if (mfg && mfg.id != null) add('0xFF', '厂商数据', [mfg.id & 0xff, (mfg.id >> 8) & 0xff, ...this.hexToBytes(mfg.hex)]);

        for (const sd of adv.serviceData || []) {
            const hex = typeof sd?.data === 'string' ? sd.data.replace(/\s+/g, '').toLowerCase() : '';
            if (!/^(?:[0-9a-f]{2})+$/.test(hex) || !hex.length) continue;
            const v = String(sd.uuid || '').trim().toLowerCase().replaceAll('-', '');
            if (v.length !== 4) continue;
            const id = parseInt(v, 16);
            add('0x16', 'Service Data', [id & 0xff, (id >> 8) & 0xff, ...this.hexToBytes(hex)]);
        }

        return segments;
    }

    // ---- 复制文本（对齐 uniapp advertisement-dialog copyText） ----------------

    copyText(device) {
        const adv = device?.advertisement || {};
        const lines = [
            `设备 ID: ${device.id}`,
            `名称: ${device.localName || device.name || '（未命名）'}`,
            `RSSI: ${device.rssi} dBm`,
            `profileMatch: ${this.profileMatchText(device)}`
        ];
        if (adv.serviceUuids?.length) {
            lines.push('Service UUIDs:', ...adv.serviceUuids);
        }
        const segments = this.buildAdSegments(device);
        if (segments.length) {
            lines.push('AD 结构（平台解析字段重建）:');
            for (const seg of segments) {
                lines.push(`${seg.type} · ${seg.name} (${seg.frameLength} B): ${seg.hex}`);
            }
        }
        const mfg = this.manufacturerEntry(adv);
        if (mfg && mfg.id != null) lines.push(`厂商 ID: 0x${mfg.id.toString(16).padStart(4, '0').toUpperCase()}`);
        for (const sd of adv.serviceData || []) {
            if (sd?.data) lines.push(`Service Data ${sd.uuid || ''}: ${sd.data}`);
        }
        return lines.join('\n');
    }

    render() {
        const device = this._device;
        const overlayId = 'advSheetOverlay';
        if (!device) {
            this.innerHTML = `<div class="mask sheetm" id="${overlayId}" style="display:none"></div>`;
            return;
        }

        const adv = device.advertisement || {};
        const miss = '<div class="miss">本轮平台 API 未提供此字段</div>';
        const section = (label, right, inner) =>
            `<div class="ad-sec"><div class="hd"><span>${label}</span><span>${right || ''}</span></div>${inner}</div>`;

        const serviceUuids = Array.isArray(adv.serviceUuids) ? adv.serviceUuids : [];
        const uuidSection = section('Service UUIDs', serviceUuids.length ? `${serviceUuids.length} 项` : '—',
            serviceUuids.length ? serviceUuids.map((u) => `<div class="hex">${this.esc(u)}</div>`).join('') : miss);

        const segments = this.buildAdSegments(device);
        const adStructSection = section(
            `AD 结构 · 逐段（${segments.length ? segments.length + ' 段' : '—'}）`,
            '平台解析字段重建',
            (segments.length
                ? segments.map((g) =>
                    `<div class="hd" style="margin-top:5px"><span>${this.esc(g.type)} · ${this.esc(g.name)}</span><span>${g.frameLength} B</span></div><div class="hex">${this.esc(g.hex)}</div>`).join('')
                : miss)
            + '<div class="hd" style="margin-top:7px"><span>整包 hex</span><span>—</span></div>' + miss
        );

        const mfg = this.manufacturerEntry(adv);
        const mfgBlock = mfg && mfg.id != null
            ? `<div class="kv"><span class="k">厂商 ID（Manufacturer Data）</span><span class="v mono">0x${mfg.id.toString(16).padStart(4, '0').toUpperCase()}</span></div>`
            : section('Manufacturer Data', '—', miss);

        const sdList = (Array.isArray(adv.serviceData) ? adv.serviceData : [])
            .filter((sd) => sd && typeof sd.data === 'string' && sd.data.length);
        const serviceDataSection = section('Service Data',
            sdList.length ? `${sdList.length} 项` : '—',
            sdList.length
                ? sdList.map((sd) => {
                    const hex = sd.data.replace(/\s+/g, '').toLowerCase();
                    return `<div class="hd" style="margin-top:5px"><span>${this.esc(sd.uuid || '未知 UUID')}</span><span>${hex.length / 2} B</span></div><div class="hex">${this.esc(hex)}</div>`;
                }).join('')
                : miss);

        const resolved = window.SmartBLEDisplayName?.resolveDeviceDisplayName(device);
        const displayName = resolved ? resolved.displayName : (device.name || '');
        const titleName = displayName || String(device.id).slice(-6);

        this.innerHTML = `
            <div class="mask sheetm" id="${overlayId}" style="display:none">
                <div class="sheet">
                    <div class="grip"></div>
                    <div class="sh-h">
                        <span class="t">广播数据 · ${this.esc(titleName)}</span>
                        <button class="btn soft sm" id="advSheetCloseBtn">${this.ic('x', 'sm')}<span>关闭</span></button>
                    </div>
                    <div class="sh-b">
                        <div class="kv"><span class="k">设备 ID</span><span class="v mono">${this.esc(device.id)}</span></div>
                        <div class="kv"><span class="k">名称</span><span class="v">${this.esc(displayName || '（未命名）')}</span></div>
                        <div class="kv"><span class="k">RSSI</span><span class="v mono">${this.esc(device.rssi)} dBm</span></div>
                        <div class="kv"><span class="k">profileMatch</span><span class="v mono">${this.esc(this.profileMatchText(device))}</span></div>
                        ${uuidSection}
                        ${adStructSection}
                        ${mfgBlock}
                        ${serviceDataSection}
                        <div style="display:flex;gap:9px;margin-top:14px">
                            <button class="btn primary sm" id="advSheetCopyBtn">${this.ic('copy', 'sm')}<span>复制数据</span></button>
                            <button class="btn soft sm" id="advSheetCloseBtn2"><span>关闭</span></button>
                        </div>
                    </div>
                </div>
            </div>`;

        this.querySelector('#advSheetCloseBtn')?.addEventListener('click', () => this.close());
        this.querySelector('#advSheetCloseBtn2')?.addEventListener('click', () => this.close());
        this.querySelector('#advSheetOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.close();
        });
        this.querySelector('#advSheetCopyBtn')?.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('copy', { detail: { text: this.copyText(this._device) }, bubbles: true, composed: true }));
        });
    }
}

customElements.define('advertisement-sheet', AdvertisementSheet);
