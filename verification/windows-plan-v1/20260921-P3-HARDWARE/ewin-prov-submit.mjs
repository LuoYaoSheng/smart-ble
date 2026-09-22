// P3 · WIN-007 配网下发全链（fill → submit → STATUS 七步轮询）
const port = process.argv[2] || '9235';
const EVID = 'E:/project/xf/smart-ble/verification/windows-plan-v1/20260921-P3-HARDWARE/evidence';
const TOKEN = process.argv[3] || '';
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
await send('Page.enable');
await sleep(500);
const ev = (expression) => send('Runtime.evaluate', { returnByValue: true, expression });
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`${EVID}/${name}.png`, Buffer.from(s.data, 'base64'));
};
const setInput = (id, value) => `(() => {
  const el = document.getElementById('${id}');
  if (!el) return 'NO_${id}';
  el.value = ${JSON.stringify(value)};
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'SET_${id}';
})()`;

// 1. 查 QR/配对码面板结构
const qr = await ev(`(() => {
  const view = document.getElementById('hidProvisionView');
  const inputs = [...view.querySelectorAll('input')].map(i => ({ id: i.id, ph: i.placeholder || '' }));
  const btns = [...view.querySelectorAll('button')].filter(b => !b.hidden).map(b => ({ id: b.id, t: b.textContent.trim().slice(0, 14) }));
  return JSON.stringify({ inputs, btns }, null, 1);
})()`);
console.log('FORM_DOM:', qr.result.value);

// 2. 填 WiFi + hub
for (const [id, val] of [['hidSsidInput', 'HJWY'], ['hidPwdInput', 'hjwy1888'], ['hidHubInput', '192.168.21.77:17892']]) {
  const r = await ev(setInput(id, val));
  console.log(r.result.value);
}

// 3. 配对码：QR 兜底面板（hidQrFallbackBtn → hidQrPasteInput → 解析并回填）
const PAYLOAD = 'shid://pair?token=' + TOKEN + '&host=192.168.21.77&port=17892';
// 打开 QR 模态（bigact）→ 点兜底按钮
const big = await ev(`(() => {
  const b = document.getElementById('hidQrBigact');
  if (!b) return 'NO_BIGACT';
  b.click(); return 'QR_SHEET_OPENED';
})()`);
console.log(big.result.value);
await sleep(1200);
const fb = await ev(`(() => {
  const b = document.getElementById('hidQrFallbackBtn');
  if (!b) return 'NO_FALLBACK_BTN';
  b.click(); return 'FALLBACK_OPENED';
})()`);
console.log(fb.result.value);
await sleep(600);
const paste = await ev(setInput('hidQrPasteInput', PAYLOAD));
console.log(paste.result.value);
const parse = await ev(`(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => !b.hidden);
  const b = btns.find(x => x.textContent.includes('解析并回填'));
  if (!b) return 'NO_PARSE_BTN';
  b.click(); return 'PARSE_CLICKED';
})()`);
console.log(parse.result.value);
await sleep(800);

await shot('prov-03-form-filled');
await sleep(600);

// 4. 下发配置
const submit = await ev(`(() => {
  const btns = [...document.querySelectorAll('#hidProvisionView button')].filter(b => !b.hidden);
  const b = btns.find(x => /下发|提交/.test(x.textContent));
  if (!b) return 'NO_SUBMIT: ' + btns.map(x => x.textContent.trim()).join('|');
  b.click(); return 'SUBMITTED';
})()`);
console.log(submit.result.value);
if (submit.result.value !== 'SUBMITTED') process.exit(1);

// 5. 轮询状态（最长 90s）
let last = '';
for (let i = 0; i < 45; i++) {
  await sleep(2000);
  const st = await ev(`(() => {
    const view = document.getElementById('hidProvisionView');
    const t = view ? view.innerText.replace(/\\s+/g, ' ').slice(0, 400) : '';
    return t;
  })()`);
  const text = st.result.value;
  if (text !== last) {
    console.log(`[${(i * 2)}s]`, text.slice(0, 220));
    last = text;
  }
  if (/Ready|就绪|成功/.test(text) && /配对完成|已连接 ControlHub|Ready/.test(text)) {
    await shot('prov-04-ready');
    console.log('OUTCOME=READY');
    process.exit(0);
  }
  if (/失败|wifi_failed|pairing_expired|mqtt_invalid|unreachable/.test(text)) {
    await shot('prov-04-failed');
    console.log('OUTCOME=FAILED');
    process.exit(2);
  }
}
await shot('prov-04-timeout');
console.log('OUTCOME=TIMEOUT');
