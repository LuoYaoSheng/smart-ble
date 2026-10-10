// F004 广播数据弹窗冒烟（E-WIN 前端真渲染）：点击扫描卡本体 → 弹窗 + kv + AD 段 + miss 口径 + 复制
// 用法: node ewin-f004-advdlg-smoke.mjs <port> <outPng>
// 注：仓库无 ws 包且 Node20 无 global WebSocket —— 内嵌极简 WS 客户端（net+crypto 握手，支持分片）
import * as net from 'node:net';
import * as crypto from 'node:crypto';

class MiniWs {
  constructor(url) {
    const u = new URL(url);
    this.socket = net.connect({ host: u.hostname, port: +u.port });
    this.socket.on('error', (e) => { throw e; });
    const key = crypto.randomBytes(16).toString('base64');
    const req = `GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`;
    this.open = new Promise((res, rej) => {
      let buf = Buffer.alloc(0);
      this.socket.once('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        const idx = buf.indexOf('\r\n\r\n');
        if (idx < 0 || !buf.slice(0, idx).toString().includes('101')) return rej(new Error('WS_HANDSHAKE_FAIL'));
        this.socket.unshift(buf.slice(idx + 4));
        this._startRead();
        res();
      });
      this.socket.write(req);
    });
    this.handlers = { message: [] };
  }
  _startRead() {
    let pending = Buffer.alloc(0);
    let assembled = null; // {opcode, chunks}
    this.socket.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      for (;;) {
        if (pending.length < 2) break;
        const fin = (pending[0] & 0x80) !== 0;
        const opcode = pending[0] & 0x0f;
        let len = pending[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (pending.length < 4) break;
          len = pending.readUInt16BE(2); off = 4;
        } else if (len === 127) {
          if (pending.length < 10) break;
          len = Number(pending.readBigUInt64BE(2)); off = 10;
        }
        if (pending.length < off + len) break;
        const payload = pending.slice(off, off + len);
        pending = pending.slice(off + len);
        if (opcode === 8) { this.socket.end(); return; }
        if (opcode === 1 || opcode === 2 || opcode === 0) {
          if (!assembled) assembled = { opcode: opcode || 1, chunks: [] };
          assembled.chunks.push(payload);
          if (fin) {
            const text = Buffer.concat(assembled.chunks).toString();
            assembled = null;
            for (const h of this.handlers.message) h(text);
          }
        }
      }
    });
  }
  on(event, handler) { if (event === 'message') this.handlers.message.push(handler); }
  send(text) {
    const payload = Buffer.from(text);
    const mask = crypto.randomBytes(4);
    let header;
    if (payload.length < 126) {
      header = Buffer.from([0x81, 0x80 | payload.length]);
    } else if (payload.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    const masked = Buffer.from(payload);
    for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i % 4];
    this.socket.write(Buffer.concat([header, mask, masked]));
  }
}

const port = process.argv[2] || '9233';
const outPng = process.argv[3] || 'ewin-f004-advdlg.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 20; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    break;
  } catch {
    await sleep(1000);
  }
}
if (!targets) {
  console.error('CDP_NOT_READY');
  process.exit(2);
}
const page = targets.find((t) => t.type === 'page');
if (!page) {
  console.error('NO_PAGE_TARGET');
  process.exit(2);
}
console.log('TARGET title=[' + page.title + ']');

const ws = new MiniWs(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const send = (method, params = {}) =>
  Promise.race([
    new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params }));
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('CDP_TIMEOUT_' + method)), 8000)),
  ]);
ws.on('message', (text) => {
  const m = JSON.parse(text);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m.result);
});
await ws.open;
await send('Runtime.enable');
await send('Page.enable');
await sleep(1500);

// 准备：注入一台带完整 advertisement 的设备（noble 形状投影：mfg 整段 hex 小端厂商 ID）
await send('Runtime.evaluate', {
  expression: `(() => {
    window.appInstance.onDeviceDiscovered({
      id: 'MOCK-ADV-FULL', name: 'Adv-Full', rssi: -50,
      advertisement: {
        serviceUuids: ['FFE0', '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'],
        manufacturerData: '424c',  // 小端厂商 ID 0x4c42, payload 空
        serviceData: [{ uuid: 'FFE1', data: '48656c6c6f' }]
      }
    });
    return true;
  })()`,
});
await sleep(600);

// A1：点击扫描卡本体 → 弹层可见 + 标题 + kv 四行
await send('Runtime.evaluate', {
  expression: `(() => {
    const card = [...document.querySelectorAll('#deviceList device-card')]
      .find((c) => c.device?.id === 'MOCK-ADV-FULL');
    if (!card) return 'NO_CARD';
    card.querySelector('.dev')?.click();
    return 'CLICKED';
  })()`,
});
await sleep(600);
const a1 = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const o = document.getElementById('advSheetOverlay');
    if (!o) return { ok: false, why: 'NO_OVERLAY' };
    const title = o.querySelector('.sh-h .t')?.textContent || '';
    const kvs = [...o.querySelectorAll('.sh-b .kv .k')].map((k) => k.textContent);
    return {
      ok: getComputedStyle(o).display === 'flex' && title.includes('广播数据'),
      display: getComputedStyle(o).display,
      title,
      kvKeys: kvs.join('|'),
      hasMiss: o.textContent.includes('本轮平台 API 未提供此字段'),
    };
  })()`,
});
console.log('A1 弹层:', JSON.stringify(a1.result.value));
if (!a1.result.value.ok) {
  console.error('FAIL_A1');
  process.exit(1);
}

// A2：AD 段重建（Service UUIDs + 0x03/0x07 + Service Data 0x16；mfg payload 空不建段但厂商 ID kv 应缺省）
const a2 = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const o = document.getElementById('advSheetOverlay');
    const heads = [...o.querySelectorAll('.ad-sec > .hd > span:first-child')].map((s) => s.textContent);
    const hexes = [...o.querySelectorAll('.ad-sec .hex')].map((h) => h.textContent);
    const mfgKv = [...o.querySelectorAll('.sh-b .kv')].map((kv) => kv.textContent).find((t) => t.includes('厂商 ID'));
    return { heads: heads.join('|'), hexCount: hexes.length, mfgKv: mfgKv || 'NONE' };
  })()`,
});
console.log('A2 AD 段:', JSON.stringify(a2.result.value));
const a2v = a2.result.value;
if (!a2v.heads.includes('Service UUIDs') || !a2v.heads.includes('AD 结构')) {
  console.error('FAIL_A2_SECTIONS');
  process.exit(1);
}

// A3：关闭 → 注入无 advertisement 的设备 → 点击 → miss 口径
await send('Runtime.evaluate', { expression: `document.getElementById('advSheetCloseBtn2').click()` });
await sleep(300);
const a3 = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    window.appInstance.onDeviceDiscovered({ id: 'MOCK-PLAIN', name: 'Plain', rssi: -60 });
    const card = [...document.querySelectorAll('#deviceList device-card')]
      .find((c) => c.device?.id === 'MOCK-PLAIN');
    card?.querySelector('.dev')?.click();
    const o = document.getElementById('advSheetOverlay');
    return {
      visible: o && getComputedStyle(o).display === 'flex',
      missCount: o ? [...o.querySelectorAll('.miss')].length : 0,
      title: o?.querySelector('.sh-h .t')?.textContent || '',
    };
  })()`,
});
await sleep(300);
console.log('A3 miss 口径:', JSON.stringify(a3.result.value));
if (!a3.result.value.visible || a3.result.value.missCount < 2) {
  console.error('FAIL_A3_MISS');
  process.exit(1);
}

// A4：复制按钮 → toast 已复制
const a4 = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    document.querySelector('#advSheetOverlay #advSheetCopyBtn')?.click();
    return true;
  })()`,
});
await sleep(400);
const toastState = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `[...document.querySelectorAll('#toasts .toast')].map((t) => t.textContent).join('|')`,
});
console.log('A4 toast:', toastState.result.value);
if (!String(toastState.result.value).includes('已复制')) {
  console.error('FAIL_A4_TOAST');
  process.exit(1);
}

const shot = await send('Page.captureScreenshot', { format: 'png' });
const { writeFileSync } = await import('node:fs');
writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
console.log('SMOKE_OK shot=' + outPng);
process.exit(0);
