// E-WIN 干净安装首扫 CDP 证据（P4 / WIN-009）
// 用法: node ewin-firstscan-cdp.mjs <port> <outPng>
// 依赖 node>=22 全局 WebSocket（本机用 nvm v23.8.0）
const port = process.argv[2] || '9223';
const outPng = process.argv[3] || 'ewin-firstscan.png';
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
  console.error('NO_PAGE_TARGET', JSON.stringify(targets.map((t) => t.type)));
  process.exit(2);
}
console.log('TARGET title=[' + page.title + '] url=' + page.url);

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

const click = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('开始扫描'));
    if (!b) return 'NO_BUTTON: ' + document.body.innerText.replace(/\\s+/g, ' ').slice(0, 200);
    b.click();
    return 'CLICKED';
  })()`,
});
console.log('CLICK:', click.result.value);

await sleep(9000);
const state = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `JSON.stringify({ url: location.href, text: document.body.innerText.replace(/\\n+/g, ' | ').slice(0, 800) })`,
});
console.log('STATE:', state.result.value);

const shot = await send('Page.captureScreenshot', { format: 'png' });
const { writeFileSync } = await import('node:fs');
writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
console.log('SHOT', outPng);
ws.close();
process.exit(0);
