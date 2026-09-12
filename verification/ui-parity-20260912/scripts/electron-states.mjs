// Electron 线补拍：真实 mock 会话的 已连接 / GATT 详情 两态
import fs from 'node:fs';
const OUT = new URL('../electron/', import.meta.url).pathname;
const log = [];

const list = await (await fetch('http://localhost:9222/json/list')).json();
const target = list.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evl = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception?.description || '').slice(0, 200)); return r.result?.value; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true }); fs.writeFileSync(OUT + name + '.png', Buffer.from(r.data, 'base64')); log.push(name); };

log.push('cards=' + (await evl("document.querySelectorAll('device-card').length")));
log.push('devices=' + JSON.stringify(await evl("[...window.appInstance.devices.keys()]")));

// 已连接态：直连 mock 设备
await evl("window.appInstance.connectToDevice({ id: 'MOCK-11:22:33:44:55:66', name: 'Dummy-BLE-01' })");
await sleep(2000);
await evl("window.appInstance.switchTab('connected')");
await sleep(800);
await shot('03-connected-real');

// GATT 详情态：selectDevice 真设备
await evl("window.appInstance.switchTab('scan')");
await sleep(400);
await evl("window.appInstance.selectDevice('MOCK-11:22:33:44:55:66')");
await sleep(2000);
await shot('04-deviceDetail-real');
log.push('detail-view-active=' + (await evl("document.getElementById('deviceDetailView')?.classList.contains('active')")));

console.log(JSON.stringify({ log }, null, 1));
ws.close();
process.exit(0);
