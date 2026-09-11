//
// ServicePanel — GATT 服务/特征树（P006）
// 结构对齐 docs/specs/prototype/platform/desktop/high-fi/pages/p006-gatt.js ready 面板：
//   sec-t（服务与特征 + N/M chip + 全部展开/收起）+ .svc/.svc-h/.svc-b/.char 树
//   （OTA 服务红 dl 图标区分）+ read/write/notify chips + 读取/写入/监听按钮。
// light DOM，样式走全局 prototype.css。
// 事件契约保持：char-action { detail: { serviceUuid, charUuid, action, btn } }。
//
class ServicePanel extends HTMLElement {
    constructor() {
        super();
        this._services = [];
        this._expanded = { 0: true }; // 正典默认：首个服务展开
    }

    set services(val) {
        this._services = val || [];
        this._expanded = { 0: true };
        this.render();
    }

    get services() {
        return this._services;
    }

    updateCharacteristicValue(serviceUuid, charUuid, value) {
        const charItem = this.querySelector(`[data-service-uuid="${serviceUuid}"][data-char-uuid="${charUuid}"]`);
        if (!charItem) return;

        let valueDiv = charItem.querySelector('.char-value');
        if (!valueDiv) {
            valueDiv = document.createElement('div');
            valueDiv.className = 'char-value';
            charItem.insertBefore(valueDiv, charItem.querySelector('.r2'));
        }
        valueDiv.textContent = value || '(empty)';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    ic(name, cls = '') {
        return `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
    }

    connectedCallback() {
        this.style.display = 'block';
        this.render();
    }

    render() {
        if (!this._services || this._services.length === 0) {
            this.innerHTML = '';
            return;
        }

        const normalizeUuid = (u) => (u || '').toLowerCase().replace(/-/g, '');
        const otaServiceUuid = '4fafc2011fb5459e8fccc5c9c331914d';
        const charCount = this._services.reduce((n, s) => n + ((s.characteristics && s.characteristics.length) || 0), 0);

        const tree = this._services.map((service, sIdx) => {
            const isOta = normalizeUuid(service.uuid) === otaServiceUuid;
            const chars = (service.characteristics || []);
            return `
            <div class="svc ${this._expanded[sIdx] ? 'open' : ''}" data-svc-idx="${sIdx}">
                <div class="svc-h" data-role="fold" data-idx="${sIdx}">
                    <span style="color:${isOta ? 'var(--c-danger)' : 'var(--c-primary)'};display:flex">${this.ic(isOta ? 'dl' : 'chip', 'sm')}</span>
                    <span class="nm">${this.escapeHtml(service.name || 'Unknown Service')}</span>
                    <span class="chip neutral mono">${this.escapeHtml((service.uuid || '').slice(0, 8))}…</span>
                    <span class="chev">${this.ic('chev-r', 'sm')}</span>
                </div>
                <div class="svc-b">
                    ${chars.length ? chars.map((ch) => this.renderCharacteristic(service.uuid, ch)).join('')
                        : '<div style="padding:12px 14px;color:var(--c-mut);font-size:var(--fs-cap);text-align:center">无特征</div>'}
                </div>
            </div>`;
        }).join('');

        this.innerHTML = `
            <div class="sec-t" style="margin-top:12px">
                <div class="t">${this.ic('chip')} 服务与特征 <span class="chip neutral">${this._services.length} 服务 / ${charCount} 特征</span></div>
                <span style="display:flex;gap:4px">
                    <button class="txtlink" data-role="expand">全部展开</button>
                    <button class="txtlink" data-role="collapse">全部收起</button>
                </span>
            </div>
            ${tree}`;

        this.querySelectorAll('[data-role="fold"]').forEach((h) => {
            h.addEventListener('click', () => {
                const i = +h.dataset.idx;
                this._expanded[i] = !this._expanded[i];
                const card = h.closest('.svc');
                if (card) card.classList.toggle('open', !!this._expanded[i]);
            });
        });
        this.querySelector('[data-role="expand"]')?.addEventListener('click', () => {
            this._expanded = {};
            this._services.forEach((_, i) => { this._expanded[i] = true; });
            this.querySelectorAll('.svc').forEach((c) => c.classList.add('open'));
        });
        this.querySelector('[data-role="collapse"]')?.addEventListener('click', () => {
            this._expanded = {};
            this.querySelectorAll('.svc').forEach((c) => c.classList.remove('open'));
        });
        this.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const charItem = e.target.closest('.char');
                const serviceUuid = charItem.dataset.serviceUuid;
                const charUuid = charItem.dataset.charUuid;
                const action = e.target.dataset.action;
                if (action === 'notify') {
                    // 监听按钮自翻转（正典：开始监听/停止监听）
                    const on = btn.classList.toggle('listening');
                    btn.querySelector('span').textContent = on ? '停止监听' : '开始监听';
                    btn.classList.toggle('on', on);
                }
                this.dispatchEvent(new CustomEvent('char-action', {
                    detail: { serviceUuid, charUuid, action, btn: e.target },
                    bubbles: true, composed: true
                }));
            });
        });
    }

    renderCharacteristic(serviceUuid, ch) {
        const props = ch.properties || [];
        const has = (p) => props.includes(p);
        const hasRead = has('read');
        const hasWrite = has('write') || has('writeWithoutResponse');
        const hasNotify = has('notify') || has('indicate');

        const chip = (cond, label, tone) => (cond ? `<span class="chip ${tone}">${label}</span>` : '');

        return `
            <div class="char" data-service-uuid="${this.escapeHtml(serviceUuid)}" data-char-uuid="${this.escapeHtml(ch.uuid)}">
                <div class="r1">
                    <span class="nm">${this.escapeHtml(ch.name || 'Unknown Characteristic')}</span>
                    ${chip(hasRead, 'read', 'primary')}
                    ${chip(hasWrite, 'write', 'success')}
                    ${chip(hasNotify, 'notify', 'warning')}
                </div>
                ${ch.value ? `<div class="char-value">${this.escapeHtml(ch.value)}</div>` : ''}
                <div class="r2">
                    ${hasRead ? `<button class="btn soft sm" data-action="read"><span>读取</span></button>` : ''}
                    ${hasWrite ? `<button class="btn soft sm" data-action="write"><span>写入</span></button>` : ''}
                    ${hasNotify ? `<button class="btn ghost sm" data-action="notify"><span>开始监听</span></button>` : ''}
                </div>
            </div>`;
    }
}

customElements.define('service-panel', ServicePanel);
