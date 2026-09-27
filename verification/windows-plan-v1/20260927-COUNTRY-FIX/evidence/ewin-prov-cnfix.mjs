// COUNTRY-FIX · E-WIN P002 配网全链一体化驱动（20260927 信道13国家码修复验证）
// 复刻 20260921-P3-HARDWARE 分步脚本为单次运行 + 显式退出（ws 挂事件循环坑）。
// 用法：node --experimental-websocket ewin-prov-cnfix.mjs <port> <token>
const port = process.argv[2] || '9235';
const TOKEN = process.argv[3] || '';
const EVID = 'E:/project/xf/smart-ble/verification/windows-plan-v1/20260927-COUNTRY-FIX/evidence';
const HUB = '192.168.21.77:17892';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync(EVID, { recursive: true });

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
const ev = (expression) => send('Runtime.evaluate', { returnByValue: true, expression });
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${EVID}/${name}.png`, Buffer.from(s.data, 'base64'));
  console.log('shot', name);
};
const setInput = (id, value) => `(() => {
  const el = document.getElementById('${id}');
  if (!el) return 'NO_${id}';
  el.value = ${JSON.stringify(value)};
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'SET_${id}';
})()`;

const log = (s) => console.log(s);

// 1. 开始扫描 → SHID 卡 → 配置
let r = await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('开始扫描'));
  if (!b) return 'NO_BTN';
  b.click(); return 'SCAN_CLICKED';
})()`);
log('scan: ' + r.result.value);
await sleep(7000);
r = await ev(`(() => {
  const shid = [...document.querySelectorAll('.dev')].find(d => d.textContent.includes('SHID'));
  if (!shid) return 'NO_SHID_CARD';
  const prov = [...shid.querySelectorAll('button')].find(b => (b.textContent.includes('配置') || b.textContent.includes('配网')));
  if (!prov) return 'NO_PROV_BTN';
  prov.click(); return 'PROV_CLICKED';
})()`);
log('enter: ' + r.result.value);
await sleep(6000);

// 2. 填表：SSID / 密码(来自环境变量，不落脚本) / hub
const PWD = process.env.PROV_WIFI_PWD || '';
for (const [id, val] of [['hidSsidInput', 'HJWY'], ['hidPwdInput', PWD], ['hidHubInput', HUB]]) {
  const rr = await ev(setInput(id, val));
  log(rr.result.value);
}

// 3. QR 大图 → 兜底粘贴 → 解析回填 token
r = await ev(`(() => { const b = document.getElementById('hidQrBigact'); if (!b) return 'NO_BIGACT'; b.click(); return 'QR_SHEET_OPENED'; })()`);
log('bigact: ' + r.result.value);
await sleep(1200);
r = await ev(`(() => { const b = document.getElementById('hidQrFallbackBtn'); if (!b) return 'NO_FALLBACK_BTN'; b.click(); return 'FALLBACK_OPENED'; })()`);
log('fallback: ' + r.result.value);
await sleep(600);
const PAYLOAD = `shid://pair?token=${TOKEN}&host=192.168.21.77&port=17892`;
r = await ev(setInput('hidQrPasteInput', PAYLOAD));
log(r.result.value);
r = await ev(`(() => {
  const b = [...document.querySelectorAll('button')].filter(x => !x.hidden).find(x => x.textContent.includes('解析并回填'));
  if (!b) return 'NO_PARSE_BTN';
  b.click(); return 'PARSE_CLICKED';
})()`);
log('parse: ' + r.result.value);
await sleep(1000);

// 4. 关模态 → 提交
r = await ev(`(() => {
  const btns = [...document.querySelectorAll('button')].filter(x => !x.hidden && x.closest('[class*=mask],[class*=modal],.sheet,.modal'));
  const b = btns.find(x => /关闭|取消/.test(x.textContent));
  if (b) b.click();
  return 'MODAL_CLOSED';
})()`);
log('modal: ' + r.result.value);
await sleep(600);
r = await ev(`(() => { const b = document.getElementById('hidSubmitButton'); if (!b) return 'NO_SUBMIT'; if (b.disabled) return 'SUBMIT_DISABLED'; b.click(); return 'SUBMITTED'; })()`);
log('submit: ' + r.result.value);
if (r.result.value !== 'SUBMITTED') { ws.close(); process.exit(1); }

// 5. 轮询七步至终态（最长 120s）
let last = '';
let final = '';
for (let i = 0; i < 80; i++) {
  await sleep(1500);
  const st = await ev(`(() => { const v = document.getElementById('hidProvisionView'); return v ? v.innerText.replace(/\\s+/g, ' ').slice(0, 500) : ''; })()`);
  const text = st.result.value;
  if (text && text !== last) {
    console.log(`[${(i * 1.5) | 0}s] ` + text.slice(0, 260));
    last = text;
    final = text;
  }
  if (/READY|配网完成|wifi_failed|pairing_invalid|controlhub_unreachable|mqtt_invalid|连接失败/.test(text)) {
        break;
  }
}
console.log('FINAL_STATE: ' + (/READY|配网完成/.test(final) ? 'SUCCESS' : 'NOT_READY'));
ws.close();
process.exit(0);
