// 诊断 SHID 匹配失败原因
const port = process.argv[2] || '9235';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
await sleep(500);
const r = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const cards = [...document.querySelectorAll('device-card')];
    if (!cards.length) return 'NO_CARDS';
    const target = cards.find(c => (c.device?.name || '').includes('SHID'));
    if (!target) return 'NO_SHID_CARD: ' + cards.map(c => c.device?.name).join('|');
    const d = target.device;
    const adv = d.advertisement || {};
    // 强制重渲染设备列表后查按钮
    if (window.app && window.app.renderDeviceList) { try { window.app.renderDeviceList(); } catch (e) {} }
    const cardEl = [...document.querySelectorAll('device-card')].find(c => (c.device?.name || '').includes('SHID'));
    return JSON.stringify({
      cardHasConfigureBtn: cardEl ? !!cardEl.querySelector('#configureHidBtn') : 'NO_CARD_EL',
      cardChipText: cardEl ? (cardEl.textContent.match(/匹配/g) || []).length : -1,
      id: d.id,
      name: d.name,
      profileMatch: d.profileMatch,
      advKeys: Object.keys(adv),
      serviceUuids: adv.serviceUuids,
      localName: adv.localName,
      matchResult: window.SmartHidDesktop ? window.SmartHidDesktop.matchScannedDevice(d) : 'NO_SmartHidDesktop',
    }, null, 1);
  })()`,
});
console.log(r.result.value);
