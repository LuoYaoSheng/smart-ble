class ServicePanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._services = [];
    }

    set services(val) {
        this._services = val || [];
        this.render();
    }

    get services() {
        return this._services;
    }

    updateCharacteristicValue(serviceUuid, charUuid, value) {
        const charItem = this.shadowRoot.querySelector(`[data-service-uuid="${serviceUuid}"][data-char-uuid="${charUuid}"]`);
        if (!charItem) return;

        let valueDiv = charItem.querySelector('.characteristic-value');
        if (!valueDiv) {
            valueDiv = document.createElement('div');
            valueDiv.className = 'characteristic-value';
            charItem.insertBefore(valueDiv, charItem.querySelector('.characteristic-actions'));
        }
        valueDiv.textContent = value || '(empty)';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (!this._services || this._services.length === 0) {
            this.shadowRoot.innerHTML = `
                <style>
                    .empty-state { text-align: center; padding: 40px 20px; color: #8e8e93; }
                </style>
                <div class="empty-state">No services found or connect to discover</div>
            `;
            return;
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .service-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid rgba(0,0,0,0.05);
                    margin-bottom: 12px;
                    overflow: hidden;
                }
                .service-header {
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    background: #f8f9fa;
                    user-select: none;
                }
                .service-header:hover { background: #f2f2f7; }
                .service-info h4 {
                    margin: 0 0 4px 0;
                    font-size: 15px;
                    color: #1c1c1e;
                }
                .service-uuid {
                    font-size: 12px;
                    color: #8e8e93;
                    font-family: monospace;
                }
                .service-expand {
                    color: #8e8e93;
                    transition: transform 0.2s;
                }
                .characteristics-list {
                    border-top: 1px solid rgba(0,0,0,0.05);
                    display: none;
                }
                .service-card.expanded .characteristics-list { display: block; }
                .service-card.expanded .service-expand { transform: rotate(180deg); }
                
                .characteristic-item {
                    padding: 16px;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                }
                .characteristic-item:last-child { border-bottom: none; }
                .characteristic-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 12px;
                }
                .characteristic-name {
                    font-weight: 500;
                    font-size: 14px;
                    color: #1c1c1e;
                    margin-bottom: 4px;
                }
                .characteristic-uuid {
                    font-size: 12px;
                    color: #8e8e93;
                    font-family: monospace;
                }
                .char-props {
                    display: flex;
                    gap: 4px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }
                .prop-badge {
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: #e5e5ea;
                    color: #48484a;
                    text-transform: uppercase;
                }
                .characteristic-value {
                    font-family: monospace;
                    font-size: 13px;
                    padding: 8px 12px;
                    background: #f2f2f7;
                    border-radius: 6px;
                    margin-bottom: 12px;
                    word-break: break-all;
                }
                .characteristic-actions {
                    display: flex;
                    gap: 8px;
                }
                .btn {
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                }
                .btn-primary { background: #007aff; color: white; }
                .btn-secondary { background: #f2f2f7; color: #007aff; }
                .btn:active { opacity: 0.8; }
                .btn.active { background: #34c759; color: white; }
            </style>
            ${this._services.map((service, sIdx) => `
                <div class="service-card expanded" data-service-idx="${sIdx}">
                    <div class="service-header">
                        <div class="service-info">
                            <h4>${this.escapeHtml(service.name || 'Unknown Service')}</h4>
                            <div class="service-uuid">${this.escapeHtml(service.uuid)}</div>
                        </div>
                        <span class="service-expand">▼</span>
                    </div>
                    <div class="characteristics-list">
                        ${service.characteristics && service.characteristics.length > 0
                            ? service.characteristics.map(char => this.renderCharacteristic(service.uuid, char)).join('')
                            : '<div style="padding:16px;color:#8e8e93;font-size:13px;text-align:center;">No characteristics</div>'
                        }
                    </div>
                </div>
            `).join('')}
        `;

        this.shadowRoot.querySelectorAll('.service-header').forEach(header => {
            header.addEventListener('click', () => {
                const card = header.closest('.service-card');
                card.classList.toggle('expanded');
                const expandIcon = card.querySelector('.service-expand');
                expandIcon.textContent = card.classList.contains('expanded') ? '▼' : '▶';
            });
        });

        this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const charItem = e.target.closest('.characteristic-item');
                const serviceUuid = charItem.dataset.serviceUuid;
                const charUuid = charItem.dataset.charUuid;
                const action = e.target.dataset.action;

                this.dispatchEvent(new CustomEvent('char-action', {
                    detail: { serviceUuid, charUuid, action, btn: e.target },
                    bubbles: true,
                    composed: true
                }));
            });
        });
    }

    renderCharacteristic(serviceUuid, char) {
        const props = char.properties || [];
        const propBadges = props.map(p => `<span class="prop-badge">${this.escapeHtml(p)}</span>`).join('');

        return `
            <div class="characteristic-item" data-service-uuid="${serviceUuid}" data-char-uuid="${char.uuid}">
                <div class="characteristic-header">
                    <div>
                        <div class="characteristic-name">${this.escapeHtml(char.name || 'Unknown Characteristic')}</div>
                        <div class="characteristic-uuid">${this.escapeHtml(char.uuid)}</div>
                    </div>
                    <div class="char-props">${propBadges}</div>
                </div>
                ${char.value ? `<div class="characteristic-value">${this.escapeHtml(char.value)}</div>` : ''}
                <div class="characteristic-actions">
                    ${props.includes('read') ? `<button class="btn btn-secondary" data-action="read">Read</button>` : ''}
                    ${props.includes('write') || props.includes('writeWithoutResponse') ? `<button class="btn btn-primary" data-action="write">Write</button>` : ''}
                    ${props.includes('notify') || props.includes('indicate') ? `<button class="btn btn-secondary" data-action="notify">Notify</button>` : ''}
                </div>
            </div>
        `;
    }
}

customElements.define('service-panel', ServicePanel);
