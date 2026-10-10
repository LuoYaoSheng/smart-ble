// P3 · 配网收尾：新 token parse → 提交 → 七步轮询（无截图防挂起）
const port = process.argv[2] || '9235';
const TOKEN = process.argv[3];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const ev = (expression) => send('Runtime.evaluate', { returnByValue: true, expression });
const PAYLOAD = `shid://pair?token=${TOKEN}&host=192.168.21.77&port=17892`;

// 1. 关闭当前模态（关闭/取消按钮）
await ev(`(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => !b.hidden && b.closest('[class*=mask],[class*=modal],.sheet,.modal'));
  const b = btns.find(x => /关闭|取消/.test(x.textContent));
  if (b) b.click();
  return 'closed';
})()`);
await sleep(600);

// 2. 重开 QR → fallback → paste → parse
const big = await ev(`(() => { const b = document.getElementById('hidQrBigact'); if (!b) return 'NO_BIGACT'; b.click(); return 'OK'; })()`);
console.log('bigact:', big.result.value);
await sleep(1000);
const fb = await ev(`(() => { const b = document.getElementById('hidQrFallbackBtn'); if (!b) return 'NO_FB'; b.click(); return 'OK'; })()`);
console.log('fallback:', fb.result.value);
await sleep(700);
await ev(`(() => { const i = document.getElementById('hidQrPasteInput'); if (!i) return 'NO_INPUT'; i.value = ${JSON.stringify(PAYLOAD)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 'SET'; })()`);
const parse = await ev(`(() => { const b = [...document.querySelectorAll('button')].filter(b => !b.hidden).find(x => x.textContent.includes('解析并回填')); if (!b) return 'NO_PARSE'; b.click(); return 'OK'; })()`);
console.log('parse:', parse.result.value);
await sleep(900);

// 3. 提交
const submit = await ev(`(() => { const b = document.getElementById('hidSubmitButton'); if (!b) return 'NO_SUBMIT'; if (b.disabled) return 'SUBMIT_DISABLED'; b.click(); return 'SUBMITTED'; })()`);
console.log('submit:', submit.result.value);
if (submit.result.value !== 'SUBMITTED') process.exit(1);

// 4. 轮询（evaluate only）
let last = '';
for (let i = 0; i < 60; i++) {
  await sleep(1500);
  const st = await ev(`(() => { const v = document.getElementById('hidProvisionView'); return v ? v.innerText.replace(/\\s+/g, ' ').slice(0, 500) : ''; })()`);
  const text = st.result.value;
  if (text !== last) {
    console.log(`[${(i * 1.5) | 0}s]`, text.slice(0, 250));
    last = text;
  }
  if (/Ready|配对完成/.test(text)) { console.log('OUTCOME=READY'); process.exit(0); }
  if (/失败|wifi_failed|pairing_expired|mqtt_invalid|unreachable/.test(text)) { console.log('OUTCOME=FAILED'); process.exit(2); }
}
console.log('OUTCOME=TIMEOUT');
