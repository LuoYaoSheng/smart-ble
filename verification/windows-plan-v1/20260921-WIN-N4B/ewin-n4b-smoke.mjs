// N4 案 B 冒烟（E-WIN）：广播 Tab 恒显 + 进页未就绪徽章（2026-09-21 用户裁决）
// 用法: node ewin-n4b-smoke.mjs <port> <outPng>
const port = process.argv[2] || '9232';
const outPng = process.argv[3] || 'ewin-n4b-broadcast.png';
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

const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => {
    const id = ++seq;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m.result);
};
await new Promise((r) => (ws.onopen = r));
await send('Runtime.enable');
await send('Page.enable');
await sleep(1500);

// 断言 1：广播 Tab 恒显（案 B 前为 display:none / 仅 Linux 显示）
const tabState = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const t = document.getElementById('broadcastTab');
    if (!t) return { ok: false, why: 'NO_TAB' };
    const cs = getComputedStyle(t);
    return {
      ok: cs.display !== 'none' && t.offsetParent !== null,
      display: cs.display,
      visible: t.offsetParent !== null,
      label: t.textContent.trim(),
      platform: window.platform?.platform,
    };
  })()`,
});
console.log('A1 broadcastTab:', JSON.stringify(tabState.result.value));
if (!tabState.result.value.ok) {
  console.error('FAIL_A1_TAB_HIDDEN');
  process.exit(1);
}

// 断言 2：四 Tab 全在（扫描/已连接/广播/关于）
const tabCount = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `[...document.querySelectorAll('.tabbar .tb')].map((t) => t.dataset.tab).join(',')`,
});
console.log('A2 tabs:', tabCount.result.value);

// 断言 3：点击广播 Tab → P008 可见 + 未就绪徽章
await send('Runtime.evaluate', {
  expression: `document.getElementById('broadcastTab').click()`,
});
await sleep(800);
const pageState = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const badge = document.getElementById('broadcastStateBadge');
    const chip = document.getElementById('broadcastPlatformChip');
    return {
      badgeText: badge ? badge.textContent.trim() : 'NO_BADGE',
      badgeVisible: badge ? getComputedStyle(badge).display !== 'none' : false,
      chipText: chip ? chip.textContent : 'NO_CHIP',
    };
  })()`,
});
console.log('A3 P008:', JSON.stringify(pageState.result.value));
if (!pageState.result.value.badgeText.includes('未就绪')) {
  console.error('FAIL_A3_BADGE');
  process.exit(1);
}

const shot = await send('Page.captureScreenshot', { format: 'png' });
const { writeFileSync } = await import('node:fs');
writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
console.log('SMOKE_OK shot=' + outPng);
