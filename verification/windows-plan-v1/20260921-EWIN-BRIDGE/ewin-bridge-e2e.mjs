// E-WIN WIN-BRIDGE 端到端验证（20260921-EWIN-BRIDGE，裁决项 #3）
// E-WIN CDP 驱动开播/停播 + 华为 A-AND logcat 空口观察者（同 FWIN-BROADCAST 口径）
const port = process.argv[2] || '9234';
const EVID = 'E:/project/xf/smart-ble/verification/windows-plan-v1/20260921-EWIN-BRIDGE';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { execFileSync } = await import('node:child_process');
const { writeFileSync } = await import('node:fs');

function adb(args) {
  return execFileSync('adb', args, { encoding: 'utf-8', shell: false });
}

async function phoneScan() {
  adb(['shell', 'am', 'start', '-n', 'com.smartble.android/com.smartble.ui.MainActivity']);
  await sleep(2500);
  const now = adb(['shell', 'date', '+%m-%dT%H:%M:%S']).trim().replace('T', ' ');
  adb(['shell', 'input', 'tap', '884', '395']);
  console.log(`  phone-scan tapped at ${now}`);
  return now;
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((t) => t.type === 'page');
if (!page) { console.error('NO_PAGE'); process.exit(2); }
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
await sleep(1500);

const ev = (expression) => send('Runtime.evaluate', { returnByValue: true, expression });
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${EVID}/${name}.png`, Buffer.from(s.data, 'base64'));
};

adb(['logcat', '-c']);

// A1 切广播 Tab + 开播
const t1 = await ev(`(() => {
  const tb = document.querySelector('[data-tab="broadcast"]');
  tb.click();
  return 'tab-clicked';
})()`);
console.log('A1', t1.result.value);
await sleep(900);
await shot('01-broadcast-form');

const t2 = await ev(`(() => {
  const b = document.getElementById('startBroadcastButton');
  if (!b || b.style.display === 'none') return 'NO_START_BTN';
  b.click();
  return 'start-clicked';
})()`);
console.log('A1', t2.result.value);
if (t2.result.value !== 'start-clicked') process.exit(1);
await sleep(2500);
const t3 = await ev(`(() => {
  const stop = document.getElementById('stopBroadcastButton');
  const badge = document.getElementById('broadcastStateBadge');
  return JSON.stringify({
    stopVisible: stop && stop.style.display !== 'none',
    badge: badge ? badge.textContent.trim() : null,
  });
})()`);
console.log('A1 state:', t3.result.value);
await shot('02-advertising');

// A2 手机收厂商块
const tap1 = await phoneScan();
await sleep(8000);
const log1 = adb(['logcat', '-s', 'BleManager', '-d']);
writeFileSync(`${EVID}/phone-phaseA.log`, log1);
const hits = log1.split('\n').filter((l) => /adv=06ff0100424c45/i.test(l));
let mac = null;
if (hits.length) {
  mac = (hits[0].match(/onScanResult: ([0-9A-F:]{17})/) || [])[1] || null;
  console.log(`A2_PHONE_SAW hits=${hits.length} mac=${mac}`);
  console.log('  ', hits[0].slice(0, 150));
} else {
  console.log('A2_FAIL_NO_VENDOR_BLOCK');
}

// A3 停播对照
await ev(`document.getElementById('stopBroadcastButton').click()`);
await sleep(2200);
const t4 = await ev(`(() => {
  const stop = document.getElementById('stopBroadcastButton');
  const badge = document.getElementById('broadcastStateBadge');
  return JSON.stringify({ stopVisible: stop && stop.style.display !== 'none', badge: badge ? badge.textContent.trim() : null });
})()`);
console.log('A3 stopped state:', t4.result.value);
await shot('03-stopped');
const tap2 = await phoneScan();
await sleep(8000);
const log2 = adb(['logcat', '-s', 'BleManager', '-d']);
writeFileSync(`${EVID}/phone-stopB.log`, log2);
if (mac) {
  const after = log2.split('\n').filter((l) => mac.includes('') && l.includes(mac) && l.slice(0, 15) >= tap2);
  console.log(`A3_STOP_CONTRAST after=${after.length}`);
  if (after.length) console.log('  ', after[0].slice(0, 130));
}

// A4 进程退出后空口静默（证明包源=E-WIN 边车）
console.log('A4 closing E-WIN ...');
await ev(`window.close()`);
await sleep(2500);
const tap3 = await phoneScan();
await sleep(8000);
const log3 = adb(['logcat', '-s', 'BleManager', '-d']);
writeFileSync(`${EVID}/phone-exitC.log`, log3);
if (mac) {
  const after3 = log3.split('\n').filter((l) => l.includes(mac) && l.slice(0, 15) >= tap3);
  console.log(`A4_AFTER_EXIT hits=${after3}`);
  process.exit(after3.length ? 1 : 0);
}
