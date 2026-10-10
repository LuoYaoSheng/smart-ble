//
// WriteDialog — 写入弹窗（P006 · C9 写入分段）
// 结构对齐 docs/specs/prototype/platform/desktop/high-fi/app.js p006-wd 弹窗（.mask/.modal/.seg/.ta/.btns），
// 桌面超集保留：数据类型 HEX/UTF-8 + 发送模式 单次/批量（每行一条）/循环（次数×间隔，0=∞）。
// light DOM，样式走全局 prototype.css。
// 事件契约：write { detail: { serviceUuid, charUuid, data, format, mode, lines?, loopCount?, intervalMs? } }；
//           close（关闭即派发——循环模式靠它中止，修复历史缺失）。
//
class WriteDialog extends HTMLElement {
    constructor() {
        super();
        this._serviceUuid = null;
        this._charUuid = null;
        this._format = 'hex';
        this._mode = 'single';
    }

    connectedCallback() {
        this.render();
    }

    show(serviceUuid, charUuid) {
        this._serviceUuid = serviceUuid;
        this._charUuid = charUuid;
        const overlay = this.querySelector('#writeDialogOverlay');
        const label = this.querySelector('#writeCharLabel');
        const uuidLine = this.querySelector('#writeCharUuid');
        const input = this.querySelector('#writeDataInput');

        if (label) label.textContent = '写入数据';
        if (uuidLine) uuidLine.textContent = charUuid || '';
        if (input) {
            input.value = '';
            input.focus();
        }
        if (overlay) overlay.style.display = 'flex';
    }

    close() {
        this._serviceUuid = null;
        this._charUuid = null;
        const overlay = this.querySelector('#writeDialogOverlay');
        if (overlay) overlay.style.display = 'none';
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    _setSeg(segEl, value) {
        segEl?.querySelectorAll('button').forEach((b) => {
            b.classList.toggle('on', b.dataset.v === value);
        });
    }

    _handleWrite() {
        if (!this._charUuid) return;
        const input = this.querySelector('#writeDataInput');
        const data = input ? input.value.trim() : '';
        if (!data) return;

        const detail = {
            serviceUuid: this._serviceUuid,
            charUuid: this._charUuid,
            data,
            format: this._format,
            mode: this._mode,
        };

        if (this._mode === 'batch') {
            detail.lines = data.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
            if (detail.lines.length === 0) return;
        } else if (this._mode === 'loop') {
            const loopNode = this.querySelector('#loopCountInput');
            const intervalNode = this.querySelector('#loopIntervalInput');
            const loopCount = Math.max(0, parseInt(loopNode ? loopNode.value : '0', 10) || 0);
            const intervalMs = Math.max(0, parseInt(intervalNode ? intervalNode.value : '1000', 10) || 1000);
            detail.loopCount = loopCount;
            detail.intervalMs = intervalMs;
        }

        this.dispatchEvent(new CustomEvent('write', {
            detail,
            bubbles: true,
            composed: true
        }));
    }

    render() {
        this.innerHTML = `
            <div id="writeDialogOverlay" class="mask" style="display: none;">
                <div class="modal" style="max-width:400px">
                    <div class="t" id="writeCharLabel">写入数据</div>
                    <div class="mono" id="writeCharUuid" style="font-size:var(--fs-micro);color:var(--c-mut);text-align:center;margin:-6px 0 12px;word-break:break-all"></div>

                    <div class="seg" id="formatSeg" style="margin-bottom:10px">
                        <button data-v="hex">HEX</button>
                        <button data-v="utf8">UTF-8</button>
                    </div>

                    <textarea class="ta" id="writeDataInput" placeholder="FF 01 02（批量模式每行一条）" rows="3"></textarea>

                    <div class="seg" id="modeSeg" style="margin-top:12px">
                        <button data-v="single">单次</button>
                        <button data-v="batch">批量</button>
                        <button data-v="loop">循环</button>
                    </div>

                    <div id="loopParams" hidden style="margin-top:10px">
                        <div style="display:flex;gap:8px">
                            <div class="field" style="flex:1;margin-bottom:0">
                                <label>次数（0 = 无限，关闭弹窗即停止）</label>
                                <div class="inp"><input type="number" id="loopCountInput" value="3" min="0"></div>
                            </div>
                            <div class="field" style="flex:1;margin-bottom:0">
                                <label>间隔 ms</label>
                                <div class="inp"><input type="number" id="loopIntervalInput" value="1000" min="0"></div>
                            </div>
                        </div>
                    </div>

                    <div class="btns" style="margin-top:14px">
                        <button class="btn soft" data-role="cancel"><span>取消</span></button>
                        <button class="btn primary" data-role="confirm"><svg class="ic sm" aria-hidden="true"><use href="#i-send"/></svg><span>确认写入</span></button>
                    </div>
                </div>
            </div>`;

        this._setSeg(this.querySelector('#formatSeg'), this._format);
        this._setSeg(this.querySelector('#modeSeg'), this._mode);

        this.querySelector('#formatSeg')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-v]');
            if (!btn) return;
            this._format = btn.dataset.v;
            this._setSeg(this.querySelector('#formatSeg'), this._format);
        });
        this.querySelector('#modeSeg')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-v]');
            if (!btn) return;
            this._mode = btn.dataset.v;
            this._setSeg(this.querySelector('#modeSeg'), this._mode);
            const params = this.querySelector('#loopParams');
            if (params) params.hidden = this._mode !== 'loop';
        });

        this.querySelector('[data-role="cancel"]')?.addEventListener('click', () => this.close());
        this.querySelector('[data-role="confirm"]')?.addEventListener('click', () => this._handleWrite());

        // Enter 提交（Shift+Enter 换行）
        this.querySelector('#writeDataInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._handleWrite();
            }
        });
    }
}

customElements.define('write-dialog', WriteDialog);
