class FilterPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._filters = {
            rssi: -100,
            namePrefix: '',
            hideUnnamed: false
        };
    }

    set filters(val) {
        this._filters = { ...this._filters, ...val };
        this.render();
    }

    get filters() {
        return this._filters;
    }

    connectedCallback() {
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
        this._filters = {
            rssi: -100,
            namePrefix: '',
            hideUnnamed: false
        };
        this.dispatchEvent(new CustomEvent('filter-change', {
            detail: this._filters,
            bubbles: true,
            composed: true
        }));
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .filter-panel {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 20px;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .filter-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    font-weight: 600;
                    color: #1c1c1e;
                }
                .filter-item {
                    margin-bottom: 12px;
                }
                .filter-item label {
                    display: block;
                    font-size: 13px;
                    color: #8e8e93;
                    margin-bottom: 8px;
                }
                .slider {
                    width: 100%;
                    margin-bottom: 8px;
                }
                .filter-presets {
                    display: flex;
                    gap: 8px;
                }
                .btn-mini {
                    padding: 4px 10px;
                    font-size: 11px;
                    border-radius: 6px;
                    background: #e5e5ea;
                    border: none;
                    color: #1c1c1e;
                    cursor: pointer;
                }
                .btn-mini:hover { background: #d1d1d6; }
                .input {
                    width: 100%;
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px solid #d1d1d6;
                    box-sizing: border-box;
                    font-size: 14px;
                }
                .checkbox {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    color: #1c1c1e;
                }
                .checkbox input {
                    margin: 0;
                    width: 16px;
                    height: 16px;
                }
            </style>
            <div class="filter-panel">
                <div class="filter-header">
                    <span>过滤设置 (Filter)</span>
                    <button id="resetFilterButton" class="btn-mini">重置</button>
                </div>
                <div class="filter-item">
                    <label>最大信号衰减 (RSSI): <span id="rssiValue">${this._filters.rssi}</span> dBm</label>
                    <input type="range" id="rssiFilter" class="slider" min="-100" max="-30" value="${this._filters.rssi}">
                    <div class="filter-presets">
                        <button class="btn-mini preset-btn" data-value="-100">全部</button>
                        <button class="btn-mini preset-btn" data-value="-90">-90</button>
                        <button class="btn-mini preset-btn" data-value="-70">-70</button>
                        <button class="btn-mini preset-btn" data-value="-50">-50</button>
                    </div>
                </div>
                <div class="filter-item">
                    <label>设备名称包含规则</label>
                    <input type="text" id="namePrefixFilter" class="input" placeholder="按设备名查找..." value="${this._filters.namePrefix}">
                </div>
                <div class="filter-item">
                    <label class="checkbox">
                        <input type="checkbox" id="hideUnnamedFilter" ${this._filters.hideUnnamed ? 'checked' : ''}>
                        <span>隐藏无名设备</span>
                    </label>
                </div>
            </div>
        `;

        // Attach event listeners
        this.shadowRoot.getElementById('rssiFilter').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.shadowRoot.getElementById('rssiValue').textContent = val;
            this.updateFilter('rssi', val);
        });

        this.shadowRoot.getElementById('namePrefixFilter').addEventListener('input', (e) => {
            this.updateFilter('namePrefix', e.target.value);
        });

        this.shadowRoot.getElementById('hideUnnamedFilter').addEventListener('change', (e) => {
            this.updateFilter('hideUnnamed', e.target.checked);
        });

        this.shadowRoot.getElementById('resetFilterButton').addEventListener('click', () => {
            this.resetFilters();
        });

        this.shadowRoot.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = parseInt(e.target.dataset.value);
                this.shadowRoot.getElementById('rssiFilter').value = val;
                this.shadowRoot.getElementById('rssiValue').textContent = val;
                this.updateFilter('rssi', val);
            });
        });
    }
}

customElements.define('filter-panel', FilterPanel);
