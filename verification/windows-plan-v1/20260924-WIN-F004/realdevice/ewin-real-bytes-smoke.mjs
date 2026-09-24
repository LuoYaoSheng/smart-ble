// E-WIN F004 真机字节渲染冒烟：注入 SHID-00000001 真实广播（noble 合并投影形状，
// 数据源=20260924 bleak/WinRT 双基准），点击扫描卡 → 断言弹窗含真机原始字节。
// 用法: node ewin-real-bytes-smoke.mjs <port> <outPng>
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
    let assembled = null;
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
const outPng = process.argv[3] || 'ewin-f004-real-bytes.png';
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

// 注入 SHID-00000001 真实数据（noble 合并投影形状：名称+UUID 来自不同帧合并，mfg/sd 空）
await send('Runtime.evaluate', {
  expression: `(() => {
    window.appInstance.onDeviceDiscovered({
      id: '10:B4:1D:CD:23:8E', name: 'SHID-00000001', rssi: -37,
      advertisement: {
        serviceUuids: ['9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'],
        manufacturerData: '',
        serviceData: []
      }
    });
    return true;
  })()`,
});
await sleep(600);

// A1：点击扫描卡 → 弹层 + 真机标题与 kv
await send('Runtime.evaluate', {
  expression: `(() => {
    const card = [...document.querySelectorAll('#deviceList device-card')]
      .find((c) => c.device?.id === '10:B4:1D:CD:23:8E');
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
    const kvs = [...o.querySelectorAll('.sh-b .kv')].map((kv) => kv.textContent.replace(/\\s+/g, ' ').trim());
    return {
      ok: getComputedStyle(o).display === 'flex' && title.includes('SHID-00000001'),
      title,
      kvCount: kvs.length,
      idKv: kvs.find((t) => t.includes('10:B4:1D:CD:23:8E')) || 'NO_ID_KV',
    };
  })()`,
});
console.log('A1 弹层:', JSON.stringify(a1.result.value));
if (!a1.result.value.ok) {
  console.error('FAIL_A1');
  process.exit(1);
}

// A2：AD 段重建须含真机字节（0x09 名称段 / 0x07 UUID 段，与 WinRT 原始 dump 逐字节一致）
const a2 = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const o = document.getElementById('advSheetOverlay');
    const hexes = [...o.querySelectorAll('.ad-sec .hex')].map((h) => h.textContent.replace(/\\s+/g, '').toLowerCase());
    const mfgKv = [...o.querySelectorAll('.sh-b .kv')].map((kv) => kv.textContent.replace(/\\s+/g, ' ')).find((t) => t.includes('厂商 ID')) || 'NONE';
    return {
      hexes,
      hasNameSeg: hexes.some((h) => h.includes('0e09534849442d3030303030303031')),
      hasUuidSeg: hexes.some((h) => h.includes('1107041c8a5e0b6f2a9d8f4c3be701101d9f')),
      mfgKv,
    };
  })()`,
});
console.log('A2 真机字节:', JSON.stringify(a2.result.value));
if (!a2.result.value.hasNameSeg || !a2.result.value.hasUuidSeg) {
  console.error('FAIL_A2_BYTES');
  process.exit(1);
}

const shot = await send('Page.captureScreenshot', { format: 'png' });
const { writeFileSync } = await import('node:fs');
writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
console.log('SMOKE_OK shot=' + outPng);
process.exit(0);
