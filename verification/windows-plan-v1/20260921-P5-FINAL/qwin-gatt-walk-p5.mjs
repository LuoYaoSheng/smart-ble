// Q-WIN 真机走查驱动（TCP seam，与 G-WIN gwin-fullui-walk.mjs 同思路）
// 用法：node qwin-gatt-walk.mjs   （需真机 SHID-00000001 在广播）
// 断言：扫描→连接→GATT 树→INFO 读→STATUS 订阅/退订→INPUT 写护栏→
//       P007 会话管理→busy 退出确认→全断→广播/关于→常驻退出。
// 铁律：全程不向 INPUT 特征发真实写（护栏验证=发送后拦截，零设备风险）。

import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..', '..', '..', 'apps', 'desktop', 'qt');
const PORT = 9341;
const shots = join(HERE, 'evidence');
mkdirSync(shots, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const child = spawn('E:/project/xf/smart-ble/apps/desktop/qt/.venv-pkg/Scripts/python.exe', ['main.py'], {
  cwd: APP,
  env: { ...process.env, SMARTBLE_AUTOMATION_PORT: String(PORT), PYTHONIOENCODING: 'utf-8' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let appLog = '';
child.stdout.on('data', (d) => { appLog += d.toString(); });
child.stderr.on('data', (d) => { appLog += d.toString(); });
child.on('exit', (code) => { console.log(`[app] exit code=${code}`); });

// ── seam 客户端（响应乱序，按 id 对账）──
let sock;
const pending = new Map();
let nextId = 1;
let rxBuf = '';

async function connectSeam(deadlineMs = 30000) {
  const end = Date.now() + deadlineMs;
  while (Date.now() < end) {
    try {
      sock = await new Promise((res, rej) => {
        const s = createConnection({ host: '127.0.0.1', port: PORT }, () => res(s));
        s.on('error', rej);
        s.on('data', (buf) => {
          // 行缓冲重组：大响应（PNG base64）会跨多个 TCP 段到达
          rxBuf += buf.toString('utf8');
          let idx;
          while ((idx = rxBuf.indexOf('\n')) >= 0) {
            const line = rxBuf.slice(0, idx);
            rxBuf = rxBuf.slice(idx + 1);
            if (!line.trim()) continue;
            try {
              const r = JSON.parse(line);
              pending.set(r.id, r);
            } catch { /* 行未完/残包，留在 rxBuf 由下段补齐后整体丢弃该行 */ }
          }
        });
      });
      return;
    } catch {
      await sleep(400);
    }
  }
  throw new Error('seam not reachable in 30s');
}

async function call(cmd, args = {}, timeoutMs = 60000) {
  const id = nextId++;
  sock.write(JSON.stringify({ id, cmd, args }) + '\n');
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (pending.has(id)) return pending.get(id);
    await sleep(150);
  }
  throw new Error(`timeout waiting response: ${cmd}`);
}

function fire(cmd, args = {}) {  // 不等响应（模态挂起命令）
  sock.write(JSON.stringify({ id: nextId++, cmd, args }) + '\n');
}

async function st() { return (await call('state')).v; }

async function waitFor(label, pred, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs;
  let last;
  while (Date.now() < end) {
    last = await st();
    if (pred(last)) return last;
    await sleep(300);
  }
  throw new Error(`waitFor failed: ${label} | last=${JSON.stringify(last).slice(0, 500)}`);
}

async function snap(name, modal = false) {
  const r = await call('snap', { modal });
  if (!r.ok) throw new Error(`snap ${name} failed: ${r.err}`);
  writeFileSync(join(shots, `${name}.png`), Buffer.from(r.v, 'base64'));
}

// ── 断言记录 ──
const results = [];
let currentStep = '';
function step(name, pass, detail) {
  results.push({ step: name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 220)}`);
}

const fatal = (msg) => {
  results.push({ step: currentStep || 'fatal', pass: false, detail: { fatal: msg } });
  finish(1);
};

async function finish(code) {
  writeFileSync(join(HERE, 'qwin-gatt-walk.json'),
    JSON.stringify({ results, pass: results.filter((r) => r.pass).length,
                     total: results.length, fatal: code !== 0 ? true : false,
                     appLogTail: appLog.slice(-800) }, null, 2));
  try { child.kill(); } catch { /* already gone */ }
  await sleep(300);
  process.exit(code);
}

try {
  // ─── 1. 启动 ───
  currentStep = 'boot';
  await connectSeam();
  const pong = await call('ping');
  const s0 = await st();
  step('boot', pong.ok && pong.v === 'pong' && s0.tab === 0
      && s0.scanStatus === '待开始扫描' && s0.version === 'v1.0.5',
      { version: s0.version, scanStatus: s0.scanStatus });
  await snap('01-boot');

  // ─── 2. P001 真机扫描 ───
  currentStep = 'P001-real-scan';
  await call('scan');
  const sScan = await waitFor('scan done',
    (s) => /^扫描完成 · 发现 \d+ 台/.test(s.scanStatus), 20000);
  const devices = sScan.devices;
  const shid = devices.find((d) => (d.name || '').startsWith('SHID-'));
  step('P001-real-scan', devices.length >= 3 && !!shid,
      { found: devices.length, shid: shid ? `${shid.name} ${shid.rssi}dBm ${shid.address}` : null });
  await snap('02-scan');
  if (!shid) fatal('SHID device absent');

  // ─── 3. 连接 + GATT 树 ───
  currentStep = 'connect-gatt-tree';
  await call('select_scan_row', { row: devices.indexOf(shid) });
  await call('connect_selected');
  const sConn = await waitFor('detail open with services',
    (s) => s.detail.visible && s.detail.services.length >= 1, 25000);
  const svc = sConn.detail.services.find((x) => x.uuid.startsWith('9f1d1001'));
  const actionSurface = svc ? svc.chars.map((c) => [...c.props].sort().join('+')) : [];
  step('connect-gatt-tree', !!svc && svc.chars.length === 3
      && sConn.detail.status.includes('已连接'),
      { title: sConn.detail.title, status: sConn.detail.status,
        services: sConn.detail.services.length, chars: svc && svc.chars.length,
        actionSurface });
  await snap('03-gatt-tree');

  // ─── 4. P006 INFO 读（真机身份）───
  currentStep = 'P006-info-read';
  const idxInfo = svc.chars.findIndex((c) => c.uuid.startsWith('9f1d1002'));
  await call('select_char_row', { row: idxInfo });
  const sSel = await st();
  await call('char_read');
  const sRead = await waitFor('read result in log',
    (s) => /读取成功 · 设备信息 \(INFO\)/.test(s.detail.log), 15000);
  const logLine = sRead.detail.log.split('\n').find((l) => l.includes('读取成功'));
  step('P006-info-read', sSel.detail.actions.read === true
      && /firmware.{2,8}1\.2\.0/.test(logLine) && /unprovisioned/.test(logLine),
      { readEnabled: sSel.detail.actions.read, logLine });
  await snap('04-info-read');

  // ─── 5. P006 STATUS 订阅开/关 ───
  currentStep = 'P006-status-notify';
  const idxStatus = svc.chars.findIndex((c) => c.uuid.startsWith('9f1d1004'));
  await call('select_char_row', { row: idxStatus });
  await call('char_notify');
  await waitFor('notify on', (s) => /订阅成功 · 设备状态 \(STATUS\)/.test(s.detail.log), 15000);
  const sOn = await st();
  await call('char_notify');
  const sOff = await waitFor('notify off',
    (s) => /已取消订阅 · 设备状态 \(STATUS\)/.test(s.detail.log), 15000);
  step('P006-status-notify', sOn.detail.actions.notifyLabel === '取消订阅'
      && sOff.detail.actions.notifyLabel === '订阅通知',
      { onLabel: sOn.detail.actions.notifyLabel, offLabel: sOff.detail.actions.notifyLabel,
        note: '未配对态 STATUS 仅状态变化推送（探针 8s 零事件），按订阅态断言' });
  await snap('05-status-notify');

  // ─── 6. P006 写弹窗 + INPUT 护栏（零设备风险）───
  currentStep = 'P006-write-guard';
  const idxInput = svc.chars.findIndex((c) => c.uuid.startsWith('9f1d1003'));
  await call('select_char_row', { row: idxInput });
  const sInput = await st();
  await call('char_write');
  const sDlg = await waitFor('write dialog open',
    (s) => s.detail.writeDialogVisible, 5000);
  await snap('06-write-dialog', true);
  await call('write_dialog', { mode: 'hex', value: '0 G 3', action: 'send' });
  const sBadHex = await waitFor('bad hex rejected',
    (s) => /HEX 格式非法/.test(s.detail.log), 5000);
  await call('char_write');
  await waitFor('write dialog open 2', (s) => s.detail.writeDialogVisible, 5000);
  await call('write_dialog', { mode: 'text', value: 'TEST', action: 'send' });
  const sGuard = await waitFor('input write blocked',
    (s) => /SHID-FW-LOCK-001/.test(s.detail.log), 5000);
  await call('char_write');
  await waitFor('write dialog open 3', (s) => s.detail.writeDialogVisible, 5000);
  await call('write_dialog', { action: 'cancel' });
  const sCancel = await waitFor('write cancelled',
    (s) => /写入已取消/.test(s.detail.log), 5000);
  step('P006-write-guard', sInput.detail.actions.write === true && sDlg.detail.writeDialogVisible
      && /HEX 格式非法/.test(sBadHex.detail.log)
      && /INPUT 特征写入已被禁用/.test(sGuard.detail.log)
      && /写入已取消/.test(sCancel.detail.log),
      { writeEnabled: sInput.detail.actions.write,
        guard: sGuard.detail.log.split('\n').find((l) => l.includes('SHID-FW-LOCK-001')) });
  await snap('07-write-guard-log');

  // ─── 7. P007 会话管理 ───
  currentStep = 'P007-connected';
  const sPre = await st();   // 此刻仍在详情页（tab=detail / tabs 隐藏）
  await call('back');
  const sList = await waitFor('connected page',
    (s) => s.tab === 1 && s.tabsVisible, 5000);
  await call('open_detail_row', { row: 0 });
  const sReopen = await waitFor('detail reopen', (s) => s.detail.visible, 5000);
  await call('back');
  const sP7 = await waitFor('back to list again',
    (s) => s.tab === 1 && s.tabsVisible, 5000);
  step('P007-connected', sPre.tab === 'detail' && sPre.tabsVisible === false
      && sList.tab === 1 && sReopen.detail.visible && sP7.connectedCount === 1
      && /SHID-00000001/.test(sP7.connectedList.join('|')),
      { connectedCount: sP7.connectedCount, list: sP7.connectedList });
  await snap('08-connected');

  // ─── 8. busy 退出确认（连接 1 台）───
  currentStep = 'exit-busy';
  fire('close_win');
  await sleep(1000);
  const sModal = await st();
  await snap('09-exit-busy-modal', true);
  const stay = await call('confirm_exit', { btn: '继续使用' });
  const sAlive = await waitFor('still alive after stay',
    (s) => s.exitModal === null && s.tab === 1, 8000);
  step('exit-busy', !!sModal.exitModal
      && sModal.exitModal.title === '退出确认'
      && /当前连接设备：1 台/.test(sModal.exitModal.text)
      && stay.ok && !!sAlive,
      { modalText: sModal.exitModal && sModal.exitModal.text });

  // ─── 9. 全断 ───
  currentStep = 'disconnect-all';
  await call('disconnect_all');
  const sZero = await waitFor('zero connected', (s) => s.connectedCount === 0, 10000);
  step('disconnect-all', sZero.connectedCount === 0 && sZero.connectedList.length === 0,
      { connectedCount: sZero.connectedCount, list: sZero.connectedList });
  await snap('10-disconnected');

  // ─── 10. P008 广播降级 ───
  currentStep = 'P008-broadcast';
  await call('tab', { index: 2 });
  const sBc = await st();
  step('P008-broadcast', sBc.tab === 2 && /暂不支持外设模式/.test(sBc.broadcastTip),
      { tip: sBc.broadcastTip });
  await snap('11-broadcast');

  // ─── 11. P009 关于 ───
  currentStep = 'P009-about';
  await call('tab', { index: 3 });
  const sAbout = await st();
  step('P009-about', sAbout.about['当前环境'] === 'Desktop · Windows'
      && sAbout.about['设备型号'] === 'PC · X64' && sAbout.version === 'v1.0.5',
      sAbout.about);
  await snap('12-about');

  // ─── 12. 常驻退出（0 连接）───
  currentStep = 'exit-final';
  await call('tab', { index: 0 });
  fire('close_win');
  await sleep(1000);
  const sModal2 = await st();
  await snap('13-exit-final-modal', true);
  fire('confirm_exit', { btn: '退出' });
  const exited = await new Promise((res) => {
    const t = setTimeout(() => res(false), 15000);
    child.on('exit', (code) => { clearTimeout(t); res(code === 0); });
  });
  step('exit-final', !!sModal2.exitModal && /常驻/.test(sModal2.exitModal.text)
      && exited, { modalText: sModal2.exitModal && sModal2.exitModal.text,
                   processExitedClean: exited });

  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n=== ${passCount}/${results.length} PASS ===`);
  await finish(passCount === results.length ? 0 : 1);
} catch (err) {
  console.error('[walk] FATAL:', err.message);
  fatal(err.message);
}
