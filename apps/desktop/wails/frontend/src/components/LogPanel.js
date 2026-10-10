//
// LogPanel — 通信日志面板（P006 dock / P008 cardv 两变体）
// 结构对齐 docs/specs/prototype/platform/desktop/high-fi/components/components.js C5 logPanel：
//   .logwrap(.dock 深色控制台) > .logbar（标题 + 清空/导出）+ .loglist（.logrow 六色 chip）。
// light DOM，样式走全局 prototype.css。
// API 保持：addLog(type, message) / clearLogs() / exportLogs()。
// 类型映射：info→sys系统 · error→err错误 · success→ok成功 · receive→recv接收 · warning→sys系统。
//
class LogPanel extends HTMLElement {
    constructor() {
        super();
        this._logs = [];
        this._variant = 'dock';
    }

    static get observedAttributes() {
        return ['variant'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'variant') {
            this._variant = newValue === 'cardv' ? 'cardv' : 'dock';
            this.render();
        }
    }

    static get TYPE_MAP() {
        return {
            info: 'sys', error: 'err', success: 'ok', receive: 'recv', warning: 'sys',
            sys: 'sys', err: 'err', ok: 'ok', recv: 'recv', read: 'read', write: 'write',
        };
    }

    static get TYPE_WORD() {
        return { sys: '系统', err: '错误', read: '读取', write: '写入', recv: '接收', ok: '成功' };
    }

    nowT() {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }

    addLog(type, message) {
        this._logs.unshift({ type, message, time: this.nowT() });
        if (this._logs.length > 200) this._logs.pop();
        this.render();
    }

    clearLogs() {
        this._logs = [];
        this.render();
    }

    exportLogs() {
        if (this._logs.length === 0) {
            this.addLog('error', '暂无日志可导出');
            return;
        }

        const lines = [
            'SmartBLE Operation Log',
            `Exported: ${new Date().toISOString()}`,
            `Total entries: ${this._logs.length}`,
            '-------------------',
            ''
        ];

        this._logs.forEach((log) => {
            const typeIcon = { ok: '✓', err: '✗', sys: 'ℹ', read: '⇤', write: '⇥', recv: '⇠' }[log.type] || '•';
            lines.push(`[${log.time}] ${typeIcon} [${log.type.toUpperCase()}] ${log.message}`);
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

        this.addLog('success', '日志已导出');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    connectedCallback() {
        this.style.display = 'block';
        this.render();
    }

    render() {
        const rows = this._logs.length
            ? this._logs.map((log) => {
                const key = LogPanel.TYPE_MAP[log.type] || 'sys';
                return `<div class="logrow"><span class="tm">${log.time}</span>
                    <span class="logchip lc-${key}">${LogPanel.TYPE_WORD[key]}</span>
                    <span class="msg">${this.escapeHtml(log.message)}</span></div>`;
            }).join('')
            : '<div class="logempty">暂无日志</div>';

        this.innerHTML = `
            <div class="logwrap ${this._variant}">
                <div class="logbar">
                    <span class="t"><svg class="ic xs" aria-hidden="true"><use href="#i-log"/></svg> 通信日志</span>
                    <button class="btn ghost danger-t sm" data-role="clear"><span>清空</span></button>
                    <button class="btn ghost sm" data-role="export"><svg class="ic sm" aria-hidden="true"><use href="#i-copy"/></svg><span>导出</span></button>
                </div>
                <div class="loglist">${rows}</div>
            </div>`;

        this.querySelector('[data-role="clear"]')?.addEventListener('click', () => this.clearLogs());
        this.querySelector('[data-role="export"]')?.addEventListener('click', () => this.exportLogs());
    }
}

customElements.define('log-panel', LogPanel);
