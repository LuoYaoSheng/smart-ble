// Electron 线 UI 捕获脚本 —— 裸 CDP（WebSocket）驱动，规避 playwright-core 与 Electron 118 的
// Browser.setDownloadBehavior 兼容问题。
// 前置：cd apps/desktop/electron && npx electron . --remote-debugging-port=9222
// 运行：node verification/ui-parity-20260912/scripts/electron-capture.mjs
import fs from 'node:fs';

const OUT = new URL('../electron/', import.meta.url).pathname;
const log = [];
const errs = [];

const list = await (await fetch('http://localhost:9222/json/list')).json();
const target = list.find((t) => t.type === 'page');
if (!target) throw new Error('no page target');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const evl = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || '').slice(0, 200));
  return r.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true });
  fs.writeFileSync(OUT + name + '.png', Buffer.from(r.data, 'base64'));
  log.push(name);
};

const bootUrl = target.url;
log.push('boot=' + bootUrl.slice(0, 70));
await send('Page.navigate', { url: bootUrl.split('?')[0] + '?mock=true' });
await sleep(2500);
log.push('mock=' + (await evl('window.appInstance?.USE_MOCK_BLE === true')));

await shot('01-deviceList-idle');

await evl('window.appInstance.startScan()');
await sleep(1500);
await shot('02-deviceList-scanned');
log.push('cards=' + (await evl("document.querySelectorAll('.device-card, [data-device-id], .device-item').length")));

const clicked = await evl("(() => { const b = document.querySelector('.device-card button, [data-device-id] button, .device-item button'); if (b) { b.click(); return true; } return false; })()");
await sleep(1800);
await evl("window.appInstance.switchTab('connected')");
await sleep(800);
await shot('03-connected');
log.push('connect-click=' + clicked);

await evl("window.appInstance.switchTab('scan')");
await sleep(500);
const sel = await evl("(() => { const c = document.querySelector('.device-card, [data-device-id], .device-item'); if (!c) return null; const id = c.dataset.deviceId || c.getAttribute('data-id'); if (id) window.appInstance.selectDevice(id); return id; })()");
await sleep(1500);
await shot('04-deviceDetail');
log.push('detail-sel=' + sel);

await evl("window.appInstance.switchTab('broadcast')");
await sleep(800);
await shot('05-broadcast-idle');

await evl("window.appInstance.switchTab('about')");
await sleep(800);
await shot('06-about');
log.push('about=' + JSON.stringify(await evl("({ promo: document.body.innerText.includes('更多小程序'), toolkit: document.body.innerText.includes('BLE Toolkit+') })")));

await evl("window.appInstance.switchTab('versions')");
await sleep(800);
await shot('07-versions');

for (const [view, name] of [['hidProvisionView', '08-hidProvision'], ['hidDetailView', '09-hidDetail'], ['hidDiagnosticsView', '10-hidDiagnostics']]) {
  await evl(`(() => { try { window.appInstance.showHidView('${view}'); } catch (e) {} })()`);
  await sleep(700);
  await shot(name);
}

console.log(JSON.stringify({ log, errs }, null, 1));
ws.close();
process.exit(0);
