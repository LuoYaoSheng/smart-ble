// T-WIN MSI 提权安装实例 · CDP 真首扫冒烟（20260921-T-MSI-ELEV）
const port = process.argv[2] || '9225';
const outPng = 'E:/project/xf/smart-ble/verification/windows-plan-v1/20260921-T-MSI-ELEV/tmsi-firstscan.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((t) => t.type === 'page');
if (!page) {
  console.error('NO_PAGE_TARGET');
  process.exit(2);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const send = (m, p = {}) =>
  new Promise((res) => {
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
await sleep(1200);

const click = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('开始扫描'));
    if (!b) return 'NO_BUTTON';
    b.click();
    return 'CLICKED';
  })()`,
});
console.log('scan-click:', click.result.value);
if (click.result.value !== 'CLICKED') process.exit(1);

await sleep(7000);
const state = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const devs = [...document.querySelectorAll('.dev, .device-card, .dev-row')].length;
    const hint = document.body.innerText.match(/发现 \\d+ 台|扫描中|未扫描/);
    const shid = document.body.innerText.includes('SHID');
    return JSON.stringify({ devCount: devs, hint: hint ? hint[0] : null, shidSeen: shid });
  })()`,
});
console.log('state:', state.result.value);

const shot = await send('Page.captureScreenshot', { format: 'png' });
const { writeFileSync } = await import('node:fs');
writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
console.log('SHOT_OK');
