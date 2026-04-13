class LogPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._logs = [];
    }

    addLog(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        this._logs.unshift({ type, message, timestamp });
        this.render();
    }

    clearLogs() {
        this._logs = [];
        this.render();
    }

    exportLogs() {
        if (this._logs.length === 0) {
            this.addLog('error', 'No logs to export');
            return;
        }

        const lines = [
            'SmartBLE Operation Log',
            `Exported: ${new Date().toISOString()}`,
            `Total entries: ${this._logs.length}`,
            '-------------------',
            ''
        ];

        this._logs.forEach(log => {
            const typeIcon = {
                'success': '✓',
                'error': '✗',
                'info': 'ℹ',
                'warning': '⚠'
            }[log.type] || '•';

            lines.push(`[${log.timestamp}] ${typeIcon} [${log.type.toUpperCase()}] ${log.message}`);
        });

        const content = lines.join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartble-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.addLog('success', 'Logs exported');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.style.display = 'flex';
        
        if (this._logs.length === 0) {
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: flex;
                        flex-direction: column;
                        background: #f8f9fa;
                        border-radius: 12px;
                        border: 1px solid rgba(0,0,0,0.05);
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        margin-top: 20px;
                        min-height: 120px;
                    }
                    .empty-state {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        flex: 1;
                        color: #8e8e93;
                        font-size: 13px;
                    }
                    .empty-state img { width: 48px; height: 48px; opacity: 0.5; margin-bottom: 8px; }
                </style>
                <div class="empty-state">
                    <img src="placeholders/empty_log.svg" alt="no logs">
                    <div>No log entries yet</div>
                </div>
            `;
            return;
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    background: #f8f9fa;
                    border-radius: 12px;
                    border: 1px solid rgba(0,0,0,0.05);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    margin-top: 20px;
                    max-height: 300px;
                }
                .log-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    font-weight: 600;
                    color: #1c1c1e;
                    background: #f2f2f7;
                    border-radius: 12px 12px 0 0;
                }
                .log-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .log-count {
                    font-size: 11px;
                    color: #8e8e93;
                    font-weight: normal;
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
                .log-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                }
                .log-entry {
                    font-size: 12px;
                    padding: 6px 8px;
                    margin-bottom: 4px;
                    border-radius: 6px;
                    display: flex;
                    gap: 8px;
                    font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
                    word-break: break-word;
                }
                .log-entry:last-child { margin-bottom: 0; }
                .log-time {
                    color: #8e8e93;
                    white-space: nowrap;
                    font-size: 11px;
                }
                .log-entry.info { color: #1c1c1e; }
                .log-entry.success { color: #34c759; background: rgba(52, 199, 89, 0.05); }
                .log-entry.error { color: #ff3b30; background: rgba(255, 59, 48, 0.05); }
                .log-entry.warning { color: #ff9500; background: rgba(255, 149, 0, 0.05); }
            </style>
            <div class="log-header">
                <span>Operation Log</span>
                <div class="log-actions">
                    <span class="log-count">${this._logs.length} entries</span>
                    <button id="exportLogsBtn" class="btn-mini">Export</button>
                    <button id="clearLogsBtn" class="btn-mini">Clear</button>
                </div>
            </div>
            <div class="log-list">
                ${this._logs.slice(0, 100).map(log => `
                    <div class="log-entry ${log.type}">
                        <span class="log-time">[${log.timestamp}]</span>
                        <span class="log-message">${this.escapeHtml(log.message)}</span>
                    </div>
                `).join('')}
            </div>
        `;

        this.shadowRoot.getElementById('clearLogsBtn').addEventListener('click', () => this.clearLogs());
        this.shadowRoot.getElementById('exportLogsBtn').addEventListener('click', () => this.exportLogs());
    }
}

customElements.define('log-panel', LogPanel);
