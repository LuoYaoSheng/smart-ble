// Electron 线补拍 v2：真实设备驱动 已连接/GATT 详情
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
const evl = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception?.description || '').slice(0, 250)); return r.result?.value; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true }); fs.writeFileSync(OUT + name + '.png', Buffer.from(r.data, 'base64')); log.push(name); };

const dev = await evl("(() => { const first = [...window.appInstance.devices.entries()][0]; return first ? { id: first[0], name: first[1].name } : null; })()");
log.push('target=' + JSON.stringify(dev));

// 真实连接
await evl(`window.appInstance.connectToDevice(${JSON.stringify(dev)})`);
await sleep(3000);
const connCount = await evl('window.appInstance.connectedDevices ? window.appInstance.connectedDevices.size : -1');
log.push('connected-size=' + connCount);
await evl("window.appInstance.switchTab('connected')");
await sleep(800);
await shot('03-connected-real');

// 真实 GATT 详情
await evl("window.appInstance.switchTab('scan')");
await sleep(400);
await evl(`window.appInstance.selectDevice(${JSON.stringify(dev.id)})`);
await sleep(2500);
log.push('detail-active=' + (await evl("document.getElementById('deviceDetailView')?.classList.contains('active')")));
await shot('04-deviceDetail-real');

console.log(JSON.stringify({ log }, null, 1));
ws.close();
process.exit(0);
