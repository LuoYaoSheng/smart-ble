// 快查页面状态（模态/表单值/按钮）
const port = process.argv[2] || '9235';
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const send = (m, p = {}) => new Promise((res) => {
  const id = ++seq;
  pending.set(id, res);
  ws.send(JSON.stringify({ id, method: m, params: p }));
});
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m.result);
};
await new Promise((r) => (ws.onopen = r));
await send('Runtime.enable');
const r = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const g = (id) => { const e = document.getElementById(id); return e ? e.value : null; };
    const modal = document.querySelector('.modal, [class*=mask], [class*=modal]');
    return JSON.stringify({
      ssid: g('hidSsidInput'), pwd: g('hidPwdInput') ? '(len ' + g('hidPwdInput').length + ')' : null,
      hub: g('hidHubInput'),
      pasteVal: g('hidQrPasteInput'),
      modalOpen: !!modal,
      qrBadge: (document.getElementById('hidQrBadge') || {}).textContent || null,
    });
  })()`,
});
console.log(r.result.value);
