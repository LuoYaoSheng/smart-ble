// P3 · WIN-008 T-WIN（Tauri/WebView2）OTA 全链复验
const port = process.argv[2] || '9238';
const EVID = 'E:/project/xf/smart-ble/verification/windows-plan-v1/20260921-P3-HARDWARE/ota';
const BIN = 'E:/project/xf/smart-ble/hardware/esp32/LightBLE/.pio/build/fixture_peripheral_s3_cdc/firmware.bin';
const MANIFEST = EVID + '/ota-target-manifest.json';
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
await send('DOM.enable');
await sleep(1200);
const ev = (expression) => send('Runtime.evaluate', { returnByValue: true, expression });
const shot = async (name) => {
  try {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${EVID}/${name}.png`, Buffer.from(s.data, 'base64'));
  } catch (e) { console.log('shot fail (non-fatal):', e.message); }
};

// 1. 扫描
const scan = await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('开始扫描')); if (!b) return 'NO_BTN'; b.click(); return 'OK'; })()`);
console.log('scan:', scan.result.value);
await sleep(7000);

// 2. 连接 BLEToolkit
const conn = await ev(`(() => {
  const cards = [...document.querySelectorAll('device-card')];
  const t = cards.find(c => (c.device?.name || c.textContent).includes('BLEToolkit'));
  if (!t) return 'NO_CARD: ' + cards.map(c => (c.device?.name || '?')).join('|');
  const b = t.querySelector('#connectBtn') || [...t.querySelectorAll('button')].find(x => /连接/.test(x.textContent));
  if (!b) return 'NO_CONN_BTN';
  b.click(); return 'CONN_CLICKED';
})()`);
console.log('connect:', conn.result.value);
await sleep(9000);

// 3. OTA 入口（P006 右上 dl 图标）
const otaOpen = await ev(`(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(x => (x.getAttribute('aria-label') || '').includes('OTA') || (x.querySelector('use') && /dl|download|update/i.test(x.querySelector('use').getAttribute('href') || '')));
  if (!b) return 'NO_OTA_BTN: ' + btns.length;
  b.click(); return 'OTA_OPENED';
})()`);
console.log('ota-open:', otaOpen.result.value);
await sleep(1500);
await shot('ota-t-01-dialog');

// 4. 注入文件
async function setFile(selector, path) {
  const doc = await send('DOM.getDocument');
  const node = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
  if (!node.nodeId) return 'NO_NODE_' + selector;
  await send('DOM.setFileInputFiles', { files: [path], nodeId: node.nodeId });
  return 'FILE_SET_' + selector;
}
console.log(await (await setFile('#fileInput', BIN)));
await sleep(500);
console.log(await (await setFile('#manifestInput', MANIFEST)));
await sleep(1500);
await shot('ota-t-02-file-selected');

// 5. 开始升级
const start = await ev(`(() => {
  const b = document.getElementById('startBtn');
  if (!b) return 'NO_START';
  if (b.disabled) return 'START_DISABLED';
  b.click(); return 'STARTED';
})()`);
console.log('start:', start.result.value);
if (start.result.value !== 'STARTED') { await shot('ota-t-02b-start-blocked'); process.exit(1); }

// 6. 轮询（10 分钟）
let last = '';
for (let i = 0; i < 300; i++) {
  await sleep(2000);
  const st = await ev(`(() => {
    const t = document.getElementById('phaseTitle');
    const s = document.getElementById('statusText');
    const bar = document.getElementById('progressFill');
    return JSON.stringify({ phase: t ? t.textContent : '', status: s ? s.textContent.slice(0, 120) : '', pct: bar ? bar.style.width : '' });
  })()`);
  const text = st.result.value;
  if (text !== last) { console.log(`[${i * 2}s]`, text.slice(0, 160)); last = text; }
  if (/成功|完成|success|重启/.test(text)) { await shot('ota-t-03-success'); console.log('OTA_TWIN=SUCCESS'); process.exit(0); }
  if (/❌|失败|错误|fault/i.test(text)) { await shot('ota-t-03-failed'); console.log('OTA_TWIN=FAILED'); process.exit(2); }
}
await shot('ota-t-04-timeout');
console.log('OTA_TWIN=TIMEOUT');
