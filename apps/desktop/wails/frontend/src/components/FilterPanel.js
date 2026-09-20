//
// FilterPanel — 扫描筛选面板（P001）
// 结构对齐 docs/specs/prototype/platform/desktop/high-fi/pages/p001-scan.js filter 块：
//   最弱信号预设（-40 强 / -60 较好 / -70 一般 / -85 弱）+ 阈值滑杆（-100..-40 step5）
//   + 名称前缀 + 隐藏无名开关 + 重置过滤。light DOM，样式走全局 prototype.css。
// 事件契约保持：filter-change { detail: { rssi, namePrefix, hideUnnamed } }。
//
class FilterPanel extends HTMLElement {
    constructor() {
        super();
        this._filters = { rssi: -100, namePrefix: '', hideUnnamed: false };
    }

    set filters(val) {
        this._filters = { ...this._filters, ...val };
        this.render();
    }

    get filters() {
        return this._filters;
    }

    connectedCallback() {
        this.style.display = 'block';
        this.render();
    }

    updateFilter(key, value) {
        this._filters[key] = value;
        this.dispatchEvent(new CustomEvent('filter-change', {
            detail: this._filters,
            bubbles: true,
            composed: true
        }));
    }

    resetFilters() {
        this._filters = { rssi: -100, namePrefix: '', hideUnnamed: false };
        this.dispatchEvent(new CustomEvent('filter-change', {
            detail: this._filters,
            bubbles: true,
            composed: true
        }));
        this.render();
    }

    render() {
        const f = this._filters;
        const presets = [['-40', '强 [-40]'], ['-60', '较好 [-60]'], ['-70', '一般 [-70]'], ['-85', '弱 [-85]']];
        this.innerHTML = `
            <div class="filter">
                <div class="row">
                    <span class="lb">最弱信号</span>
                    ${presets.map(([v, label]) =>
                        `<button class="pre ${f.rssi === +v ? 'on' : ''}" data-pre="${v}">${label}</button>`).join('')}
                </div>
                <div class="row">
                    <span class="lb" data-role="rssi-lb">阈值 ${f.rssi} dBm</span>
                    <input type="range" class="slider" min="-100" max="-40" step="5" value="${f.rssi}" data-role="rssi">
                </div>
                <div class="row">
                    <span class="lb">名称前缀</span>
                    <input style="flex:1;background:var(--c-fill);border:none;border-radius:8px;height:34px;padding:0 10px;font-family:var(--font);outline:none" placeholder="如 SHID / LightBLE" value="${f.namePrefix.replace(/"/g, '&quot;')}" data-role="prefix">
                </div>
                <div class="row">
                    <span class="lb">隐藏无名</span>
                    <button class="switch ${f.hideUnnamed ? 'on' : ''}" data-role="hide" aria-label="隐藏无名设备"></button>
                    <div style="flex:1"></div>
                    <button class="btn soft sm" data-role="reset">重置过滤</button>
                </div>
            </div>`;

        this.querySelectorAll('[data-pre]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this._filters.rssi = +btn.dataset.pre;
                this.render();
                this.updateFilter('rssi', this._filters.rssi);
            });
        });
        const slider = this.querySelector('[data-role="rssi"]');
        slider?.addEventListener('input', () => {
            this._filters.rssi = +slider.value;
            const lb = this.querySelector('[data-role="rssi-lb"]');
            if (lb) lb.textContent = `阈值 ${this._filters.rssi} dBm`;
            this.querySelectorAll('[data-pre]').forEach((b) =>
                b.classList.toggle('on', this._filters.rssi === +b.dataset.pre));
            this.updateFilter('rssi', this._filters.rssi);
        });
        const prefix = this.querySelector('[data-role="prefix"]');
        prefix?.addEventListener('input', () => {
            this.updateFilter('namePrefix', prefix.value);
        });
        const hide = this.querySelector('[data-role="hide"]');
        hide?.addEventListener('click', () => {
            this._filters.hideUnnamed = !this._filters.hideUnnamed;
            hide.classList.toggle('on', this._filters.hideUnnamed);
            this.updateFilter('hideUnnamed', this._filters.hideUnnamed);
        });
        this.querySelector('[data-role="reset"]')?.addEventListener('click', () => {
            this.resetFilters();
        });
    }
}

customElements.define('filter-panel', FilterPanel);
