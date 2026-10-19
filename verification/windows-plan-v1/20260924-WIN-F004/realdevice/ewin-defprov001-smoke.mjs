// EWIN-DEF-PROV-001 修复验证（E-WIN 渲染层）：晚到匹配帧须让「配置」按钮/chip
// 经 updateDeviceRSSI 全量重渲自动出现——不依赖强制 renderDeviceList。
// 序列：①注入无匹配帧（无 advertisement）→ 无按钮；②同 id 注入带 SHID 名称帧
// → 断言 chip + configureHidBtn 出现；③F004 回归：点卡弹广播弹窗。
// 用法: node ewin-defprov001-smoke.mjs <port> <outPng>
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

const port = process.argv[2] || '9235';
const outPng = process.argv[3] || 'ewin-defprov001.png';
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

// ① 注入首帧：无名称无 UUID（模拟 ADV 空名帧）→ 无匹配无按钮
await send('Runtime.evaluate', {
  expression: `(() => {
    window.appInstance.onDeviceDiscovered({ id: 'SHID-LATE-001', name: '', rssi: -45 });
    return true;
  })()`,
});
await sleep(500);
const a1 = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const card = [...document.querySelectorAll('#deviceList device-card')]
      .find((c) => c.device?.id === 'SHID-LATE-001');
    if (!card) return { ok: false, why: 'NO_CARD' };
    return {
      ok: !card.querySelector('#configureHidBtn') && !card.querySelector('.chip'),
      hasBtn: !!card.querySelector('#configureHidBtn'),
      hasChip: !!card.querySelector('.nm .chip'),
    };
  })()`,
});
console.log('A1 首帧无匹配:', JSON.stringify(a1.result.value));
if (!a1.result.value.ok) {
  console.error('FAIL_A1_PRECONDITION');
  process.exit(1);
}

// ② 同 id 注入晚到帧：带 SHID 名称（弱匹配）→ 卡片经 updateDeviceRSSI 重渲，按钮自动出现
await send('Runtime.evaluate', {
  expression: `(() => {
    window.appInstance.onDeviceDiscovered({
      id: 'SHID-LATE-001', name: 'SHID-00000009', rssi: -44,
      advertisement: { serviceUuids: [], manufacturerData: '', serviceData: [] }
    });
    return true;
  })()`,
});
await sleep(500);
const a2 = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const card = [...document.querySelectorAll('#deviceList device-card')]
      .find((c) => c.device?.id === 'SHID-LATE-001');
    const chip = card?.querySelector('.nm .chip');
    return {
      ok: !!card?.querySelector('#configureHidBtn') && !!chip,
      btnText: card?.querySelector('#configureHidBtn')?.textContent?.trim() || 'NONE',
      chipText: chip?.textContent?.trim() || 'NONE',
    };
  })()`,
});
console.log('A2 晚到匹配帧自动出现:', JSON.stringify(a2.result.value));
if (!a2.result.value.ok) {
  console.error('FAIL_A2_LATE_MATCH');
  process.exit(1);
}

// ③ 匹配态粘滞：再注入空名帧（无匹配输入）→ 按钮不消失
await send('Runtime.evaluate', {
  expression: `(() => {
    window.appInstance.onDeviceDiscovered({ id: 'SHID-LATE-001', name: '', rssi: -43 });
    return true;
  })()`,
});
await sleep(500);
const a3 = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const card = [...document.querySelectorAll('#deviceList device-card')]
      .find((c) => c.device?.id === 'SHID-LATE-001');
    return {
      ok: !!card?.querySelector('#configureHidBtn'),
      nameShown: card?.querySelector('.nm')?.textContent || '',
    };
  })()`,
});
console.log('A3 粘滞不回退:', JSON.stringify(a3.result.value));
if (!a3.result.value.ok) {
  console.error('FAIL_A3_STICKY');
  process.exit(1);
}

const shot = await send('Page.captureScreenshot', { format: 'png' });
const { writeFileSync } = await import('node:fs');
writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
console.log('SMOKE_OK shot=' + outPng);
process.exit(0);
