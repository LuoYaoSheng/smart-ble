// P3 · WIN-007 E-WIN P002 配网 E2E 驱动（分步执行版）
const port = process.argv[2] || '9235';
const step = process.argv[3] || 'scan';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EVID = 'E:/project/xf/smart-ble/verification/windows-plan-v1/20260921-P3-HARDWARE/evidence';

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((t) => t.type === 'page');
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
await sleep(800);
const ev = (expression) => send('Runtime.evaluate', { returnByValue: true, expression });
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`${EVID}/${name}.png`, Buffer.from(s.data, 'base64'));
  console.log('shot', name);
};

if (step === 'scan') {
  const r = await ev(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('开始扫描'));
    if (!b) return 'NO_BTN';
    b.click(); return 'CLICKED';
  })()`);
  console.log(r.result.value);
  await sleep(7000);
  const st = await ev(`(() => {
    const shid = [...document.querySelectorAll('.dev')].find(d => d.textContent.includes('SHID'));
    if (!shid) return 'NO_SHID_CARD';
    const prov = [...shid.querySelectorAll('button')].find(b => (b.textContent.includes('配置') || b.textContent.includes('配网')));
    return prov ? 'PROV_BTN_READY' : 'CARD_NO_PROV: ' + shid.textContent.slice(0, 80);
  })()`);
  console.log(st.result.value);
  await shot('prov-01-scanned');
} else if (step === 'enter') {
  const r = await ev(`(() => {
    const shid = [...document.querySelectorAll('.dev')].find(d => d.textContent.includes('SHID'));
    if (!shid) return 'NO_SHID_CARD';
    const prov = [...shid.querySelectorAll('button')].find(b => (b.textContent.includes('配置') || b.textContent.includes('配网')));
    if (!prov) return 'NO_PROV_BTN';
    prov.click(); return 'PROV_CLICKED';
  })()`);
  console.log(r.result.value);
  await sleep(6000);
  const st = await ev(`(() => {
    const view = document.getElementById('hidProvisionView');
    const phase = document.getElementById('hidProvConnectPhase');
    const form = document.getElementById('hidSsidInput');
    return JSON.stringify({
      viewVisible: view && view.style.display !== 'none',
      connectPhase: phase ? !phase.hidden : null,
      formReady: !!form,
      bodyHint: (document.body.innerText.match(/连接失败|身份|已连接|配置|Wi-Fi/g) || []).slice(0, 5),
    });
  })()`);
  console.log(st.result.value);
  await shot('prov-02-phase');
} else if (step === 'dom') {
  const st = await ev(`(() => {
    const inputs = [...document.querySelectorAll('#hidProvisionView input')].map(i => ({ id: i.id, type: i.type, ph: i.placeholder }));
    const btns = [...document.querySelectorAll('#hidProvisionView button')].map(b => ({ id: b.id, t: b.textContent.trim().slice(0, 12), hidden: b.hidden }));
    return JSON.stringify({ inputs, btns: btns.filter(b => !b.hidden) }, null, 1);
  })()`);
  console.log(st.result.value);
}
