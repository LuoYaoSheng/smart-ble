// G-WIN 全页走查驱动（WIN-013 收口）——automation seam 版：
//   wails v2.16 Go loader 封死外部 CDP（WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS 被清零），
//   故走应用内缝：SMARTBLE_AUTOMATION_PORT=9330 起 TCP 行协议，eval 经 automation-shim.js
//   执行，screenshot 走 Win32 PrintWindow(PW_RENDERFULLCONTENT)。
//   E-WIN 16/16 正典步骤镜像 + G-WIN 专有断言（桥接契约/embed VERSION/win32 广播降级）。
//   真实优先：真机扫描+连接+读取+监听+向导（只读到令牌门，不下发）。
//   设备缺席兜底：results.flavor='device-absent-sim'，注入 seam，明确标注。
// 运行：nvm v23.8.0 node（本驱动只用 net/fs，WebSocket 不再需要）。
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import net from 'node:net';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXE = 'E:\\project\\xf\\smart-ble\\apps\\desktop\\wails\\build\\bin\\smartble.exe';
const PORT = 9330;
const HID_SVC = '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04';
const TOKEN32 = '0123456789abcdef0123456789abcdef';
const VALID_PAIR = `shid://pair?token=${TOKEN32}&host=192.168.1.8&port=17892`;
const IDENTITY_JSON = '{"product":"smart-hid","protocol":"1.0","device_id":"HID-00000001","firmware":"1.2.0"}';

const results = { flavor: 'real', steps: [], consoleErrors: [] };
let currentStep = '(boot)';
const step = (name, ok, detail) => {
  results.steps.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 200)}`);
};

try { execSync('taskkill /IM smartble.exe /F', { stdio: 'ignore', shell: true }); } catch { }
await new Promise(r => setTimeout(r, 2500)); // WinRT 适配器 watcher 在进程死后仍占位数秒（坑位账 #6 变体）——清场后缓启

const child = spawn(EXE, [], {
  env: { ...process.env, SMARTBLE_AUTOMATION_PORT: String(PORT) },
  stdio: 'ignore',
  // 勿设 windowsHide：SW_HIDE 启动提示会让 wails 主窗全程不显示，PrintWindow 全黑
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── TCP 缝客户端（严格串行请求-应答）───
async function connectSeam(port, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const s = net.connect(port, '127.0.0.1');
      await new Promise((res, rej) => { s.once('connect', res); s.once('error', rej); setTimeout(() => rej(new Error('slow')), 1500); });
      return s;
    } catch { await sleep(500); }
  }
  throw new Error('automation seam not reachable on ' + port);
}
const sock = await connectSeam(PORT);
let rxBuf = '';
const replyWaiters = [];
sock.on('data', d => {
  rxBuf += d.toString('utf8');
  let nl;
  while ((nl = rxBuf.indexOf('\n')) >= 0) {
    const line = rxBuf.slice(0, nl); rxBuf = rxBuf.slice(nl + 1);
    if (!line.trim()) continue;
    try {
      const w = replyWaiters.shift();
      if (w) w.resolve(JSON.parse(line));
    } catch (e) { const w = replyWaiters.shift(); if (w) w.resolve({ ok: false, error: 'badjson' }); }
  }
});
async function cmd(kind, expr) {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  const p = new Promise(resolve => replyWaiters.push({ resolve }));
  sock.write(JSON.stringify({ id, kind, expr }) + '\n');
  return await Promise.race([p, sleep(95000).then(() => ({ ok: false, error: 'driver timeout' }))]);
}

// ─── eval/等待/点击/截图 工具（全部经 automation seam）───
async function evRaw(expr) {
  const r = await cmd('eval', `(async()=>{ try { const v = await (${expr}); return {ok:true, v: v===undefined?null:v}; } catch(e){ return {ok:false, err:String(e)}; } })()`);
  if (!r.ok) return { ok: false, err: r.error || 'seam error' };
  return r.result;
}
async function ev(expr) { return evRaw(expr); }
async function waitFor(desc, expr, timeoutMs = 15000, pollMs = 350) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await evRaw(expr);
    if (r && r.ok && r.v) return r.v;
    await sleep(pollMs);
  }
  throw new Error('waitFor timeout: ' + desc);
}
async function click(findExpr) {
  const r = await evRaw(`(()=>{ const el = ${findExpr}; if(!el) return {found:false}; el.scrollIntoView({block:'center'}); el.click(); return {found:true, txt:(el.textContent||'').trim().slice(0,50)}; })()`);
  if (!r.ok) return { ok: false, why: r.err };
  return r.v && r.v.found ? { ok: true, txt: r.v.txt } : { ok: false, why: 'element not found' };
}
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
async function snap(name) {
  const r = await cmd('screenshot');
  if (r.ok) writeFileSync(join(HERE, name + '.png'), Buffer.from(r.result, 'base64'));
  else console.log('SNAP-FAIL', name, r.error);
}
function closeMainWindow() {
  execSync(`powershell.exe -NoProfile -Command "(Get-Process -Id ${child.pid}).CloseMainWindow()"`, { shell: true, stdio: 'ignore' });
}

try {
  // ═══ R 阶段：真实桥 + 真机 ═══
  currentStep = 'boot';
  await waitFor('app boot', `document.readyState==='complete' && document.getElementById('btWord') && document.getElementById('btWord').textContent!=='初始化中…'`, 45000);
  await waitFor('bt ready', `document.getElementById('btWord').textContent==='蓝牙就绪'`, 30000).catch(async e => {
    const w = (await ev(`document.getElementById('btWord').textContent`)).v;
    throw new Error(`bt chip not ready, actual="${w}"`);
  });
  const title = (await ev('document.title')).v;
  const tabs = (await ev(`[...document.querySelectorAll('#tabbar .tb')].map(b=>({tab:b.dataset.tab, text:b.textContent.trim(), visible:b.offsetParent!==null}))`)).v;
  await snap('01-boot');
  step('boot', title === 'BLE Toolkit+', { title, tabs });

  currentStep = 'bridge-contract';
  const ver = await ev(`window.bleAPI ? await window.bleAPI.getAppVersion() : null`);
  const plat = await ev(`window.platform || null`);
  step('bridge+embed-version', ver.ok && ver.v === '1.0.5' && plat.v && plat.v.platform === 'win32',
    { version: ver.v, platform: plat.v });

  currentStep = 'broadcast-degrade';
  const adv = await ev(`window.bleAPI.startAdvertising('T',['FFE0'],'0001','41',true)`);
  const advStop = await ev(`window.bleAPI.stopAdvertising()`);
  step('P008-win32-broadcast-degrade',
    adv.ok && adv.v && adv.v.success === false && /not supported on win32/.test(adv.v.error || ''),
    { start: adv.v, stop: advStop.v });

  // ─── 真机扫描 ───
  currentStep = 'scan';
  await click(q('#scanButton'));
  await waitFor('device cards', `document.querySelectorAll('#deviceList device-card').length>0`, 25000);
  await waitFor('scan done word', `document.getElementById('scanStatusLabel').textContent.includes('扫描完成')`, 30000);
  await sleep(600); // 渲染收敛后再采样（首跑竞态：状态词 9 台但卡片只采到 1 张）
  // SHID 识别双谓词：名字优先，地址兜底（tinygo 对该机 LocalName 间歇为空——
  // 17:32 轮出名为 SHID-00000001，其后各轮同址未命名，10:B4:1D:CD:23:8E 稳定在场）
  const names = (await ev(`[...document.querySelectorAll('#deviceList device-card')].map(c=>c.textContent.trim().slice(0,80))`)).v;
  const hasShid = names.some(t => t.includes('SHID-00000001') || t.includes('238E'));
  const scanWord = (await ev(`document.getElementById('scanStatusLabel').textContent`)).v;
  await snap('02-scan-real');
  step('P001-real-scan', names.length > 0 && scanWord.includes('发现'), { cards: names.length, scanWord, hasShid, names: names.slice(0, 6) });

  // 设备缺席 → 模拟兜底（明确标注）
  if (!hasShid) {
    results.flavor = 'device-absent-sim';
    await ev(`window.appInstance.onDeviceDiscovered({ id:'AA:BB:CC:DD:EE:FF', name:'SHID-00000001', localName:'SHID-00000001', rssi:-45, address:'AA:BB:CC:DD:EE:FF', connectionState:'disconnected', advertisement:{ serviceUuids:['${HID_SVC}'], connectable:true, scannable:true } })`);
    await waitFor('sim card', `[...document.querySelectorAll('#deviceList device-card')].some(c=>c.textContent.includes('SHID-00000001'))`, 5000);
    await ev(`(async()=>{
      const b = window.bleAPI;
      const _disc = b.discoverServices.bind(b);
      const _read = b.readCharacteristic.bind(b);
      b.connect = async (id)=>{ setTimeout(()=>window.appInstance.onDeviceConnected(id), 400); return { success:true }; };
      b.disconnect = async (id)=>{ setTimeout(()=>window.appInstance.onDeviceDisconnected(id), 150); return { success:true }; };
      b.notifyCharacteristic = async ()=>({ success:true });
      b.writeCharacteristic = async ()=>({ success:true });
      b.discoverServices = async (id)=>{
        // 全合成（不得回落真 _disc：模拟设备未连接，真调必败）
        const list = [
          { uuid:'180a', name:'设备信息', characteristics:[{ uuid:'2a29', name:'制造商', properties:['read'] }] },
          { uuid:'${HID_SVC}', name:'Smart HID 配网', characteristics:[
            { uuid:'9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04', name:'INFO', properties:['read'] },
            { uuid:'9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04', name:'INPUT', properties:['write','writeWithoutResponse'] },
            { uuid:'9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04', name:'STATUS', properties:['notify'] },
          ]},
        ];
        const r = { success:true, services:list };
        window.appInstance.onServicesDiscovered({ deviceId:id, services:list });
        return r;
      };
      const hexFull = ${JSON.stringify(IDENTITY_JSON)}.split('').map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ');
      b.readCharacteristic = async (id,s,c)=>({ success:true, value: hexFull });
      return true;
    })()`);
  }

  const shidCardBtn = (btnId) => `(()=>{ const cards=[...document.querySelectorAll('#deviceList device-card')]; const c=cards.find(c=>c.textContent.includes('SHID-00000001')||c.textContent.includes('238E')); return c? c.querySelector('#${btnId}') : null; })()`;

  // ─── P002 向导（真机只读到令牌门；不下发）───
  currentStep = 'P002-wizard';
  const cfgClick = await click(shidCardBtn('configureHidBtn'));
  if (!cfgClick.ok) throw new Error('configureHidBtn not found: ' + JSON.stringify(cfgClick));
  try {
    await waitFor('wizard configure phase', `!document.getElementById('hidProvConfigurePhase').hidden`, 60000);
  } catch (e) {
    const diag = (await ev(`({
      viewActive: document.getElementById('hidProvisionView').classList.contains('active'),
      connectPhaseHidden: document.getElementById('hidProvConnectPhase').hidden,
      connectingHidden: document.getElementById('hidProvConnecting').hidden,
      connErrCode: document.getElementById('hidProvConnErrorCode').textContent,
      connErrText: (document.getElementById('hidProvConnErrorText')||{textContent:''}).textContent.trim().slice(0,200),
      logs: (document.querySelector('log-panel')||{textContent:''}).textContent.slice(-300),
    })`)).v;
    await snap('x3-wizard-stall');
    throw new Error('wizard stall: ' + JSON.stringify(diag));
  }
  const wizard = (await ev(`({
    stepper: document.getElementById('hidProvStepper').textContent.trim(),
    devName: document.getElementById('hidProvDevName').textContent,
    devId: document.getElementById('hidProvDevId').textContent,
    connWord: document.getElementById('hidProvConnWord').textContent,
    submitDisabled: document.getElementById('hidSubmitButton').disabled,
  })`)).v;
  await snap('03-hidprov-form');
  step('P002-provision-form', /连接设备/.test(wizard.stepper) && wizard.connWord === '已连接' && wizard.submitDisabled === true, wizard);

  // ─── P002 二维码弹层 + 粘贴兜底 ───
  currentStep = 'P002-qr';
  await click(q('#hidQrBigact'));
  await waitFor('qr sheet', `!!document.getElementById('hidQrVfStatus')`, 8000);
  await sleep(6000); // 摄像头 5s 竞速超时（WebView2 不处理 PermissionRequested 时悬挂→正典降级文案）
  const cam = (await ev(`({
    camStatus: document.getElementById('hidQrVfStatus').textContent.trim(),
    videoVisible: (()=>{const v=document.getElementById('hidQrVideo'); return v ? getComputedStyle(v).display!=='none' : false;})(),
    sheetOpen: !!document.getElementById('hidQrVf'),
  })`)).v;
  await snap('04-qr-sheet');
  step('P002-qr-sheet', cam.sheetOpen, cam);

  currentStep = 'P002-paste';
  // 先填 SSID（submit 亮灯条件 = ssid + 有效配对码，E-WIN 证据同口径）
  await ev(`(function(){ const i=document.getElementById('hidSsidInput'); if(i){ i.value='TestNet'; i.dispatchEvent(new Event('input',{bubbles:true})); } return !!i; })()`);
  const fbClick = await click(q('#hidQrFallbackBtn')); // 「无法扫码？粘贴 / 手输配对码 →」
  await waitFor('paste sheet', `!!document.getElementById('hidQrPasteInput')`, 6000);
  await ev(`(function(){ const i=document.getElementById('hidQrPasteInput'); i.value='not-a-code'; i.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  const invRes = await ev(`window.appInstance.hidParseQrInput()`);
  const invErr = (await ev(`(document.getElementById('hidQrPasteErr')||{}).textContent || ''`)).v;
  await ev(`(function(){ const i=document.getElementById('hidQrPasteInput'); i.value=${JSON.stringify(VALID_PAIR)}; i.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  const valRes = await ev(`window.appInstance.hidParseQrInput()`);
  await sleep(600);
  const after = (await ev(`({
    submitEnabled: !document.getElementById('hidSubmitButton').disabled,
    hub: document.getElementById('hidHubInput').value,
    ssid: document.getElementById('hidSsidInput').value,
  })`)).v;
  await snap('05-paste-filled');
  step('P002-paste-fallback', invRes.v === false && /未识别到有效配对码/.test(invErr) && after.submitEnabled && after.hub === '192.168.1.8:17892',
    { invalidRejected: invRes.v === false, errText: invErr, validParsed: valRes.v === true, ...after });
  await ev(`window.appInstance.hidCloseModal && window.appInstance.hidCloseModal(); true`);

  // ─── P002 返回（DESKTOP-LEAVE-001：未下发返回应清会话）───
  currentStep = 'P002-back';
  await click(q('#hidProvBackButton'));
  await sleep(700);
  const leaveModal1 = (await ev(`!!document.querySelector('.modal-mask, [class*=modal-card]')`)).v;
  if (leaveModal1) {
    await click(`[...document.querySelectorAll('.modal-mask button, [class*=modal] button')].find(b=>/离开|确定/.test(b.textContent))`);
    await sleep(700);
  }
  const backState = (await ev(`({
    backOnScan: document.getElementById('deviceListView').classList.contains('active'),
    leaveModal: !!document.getElementById('exitConfirmBody') || !!document.querySelector('.modal-mask'),
  })`)).v;
  step('P002-back-clean', backState.backOnScan === true && backState.leaveModal === false, { ...backState, hadLeaveModal: leaveModal1 });

  // ─── P006 GATT 直连 + 读 + 监听（真机只读，绝不写）───
  currentStep = 'P006-gatt';
  await sleep(1500); // 向导返回后链路释放缓冲（DESKTOP-LEAVE-001 断开 → WinRT 快速重连竞态）
  const connClick = await click(shidCardBtn('connectBtn'));
  if (!connClick.ok) throw new Error('connectBtn not found');
  try {
    // OBS：tinygo WinRT Uncached 枚举未配对会话仅回 9f1d 一个服务（探针复现，延迟/重试不变）
    await waitFor('detail view + services', `document.getElementById('deviceDetailView').offsetParent!==null && document.querySelectorAll('service-panel .svc').length>=1`, 45000);
    await waitFor('char actions rendered', `document.querySelectorAll('service-panel [data-action]').length>=3`, 20000);
  } catch (e) {
    const diag = (await ev(`({
      detailVisible: document.getElementById('deviceDetailView').offsetParent!==null,
      svcCount: document.querySelectorAll('service-panel .svc').length,
      connectedCount: document.getElementById('connectedCount').textContent,
      connBadge: document.getElementById('connectedBadge').style.display,
      toasts: [...document.querySelectorAll('#toasts *')].map(t=>t.textContent.trim()).join('|').slice(0,200),
      logs: (document.querySelector('log-panel')||{textContent:''}).textContent.replace(/\\u00a0/g,' ').slice(-400),
    })`)).v;
    await snap('x6-connect-stall');
    throw new Error('connect stall: ' + JSON.stringify(diag));
  }
  const svcNames = (await ev(`[...document.querySelectorAll('service-panel .svc-h .nm')].map(e=>e.textContent.trim())`)).v;
  const actions = (await ev(`[...document.querySelectorAll('service-panel [data-action]')].map(b=>b.dataset.action)`)).v;
  await snap('06-gatt-detail');
  step('P006-gatt-tree', svcNames.length >= 1 && actions.includes('read') && actions.includes('notify'), { svcNames, actions: actions.slice(0, 10), note: 'tinygo Uncached 枚举=1 服务（9f1d 配网），E-WIN 缓存枚举见 2+' });

  currentStep = 'P006-read';
  await click(`[...document.querySelectorAll('service-panel [data-action="read"]')][0]`);
  // T-WIN 同款坑：日志文案「读取成功」中 NBSP 断言不可见——统一归一化后命中
  const readLog = await waitFor('read log', `(()=>{ const lp=document.querySelector('#deviceDetailView log-panel')||document.querySelector('log-panel'); const t=(lp?lp.textContent:'').replace(/\\u00a0/g,' '); return t.includes('读取成功')||t.includes('Read:')? t.slice(-400):false; })()`, 15000);
  step('P006-char-read', !!readLog, { readLog: String(readLog).replace(/\u00a0/g, ' ').slice(-260) });

  currentStep = 'P006-notify';
  const nOn = await click(`[...document.querySelectorAll('service-panel [data-action="notify"]')][0]`);
  await sleep(2500);
  const nWord = (await ev(`([...document.querySelectorAll('service-panel [data-action="notify"]')][0]||{textContent:''}).textContent.trim()`)).v;
  const nOff = await click(`[...document.querySelectorAll('service-panel [data-action="notify"]')][0]`);
  await sleep(900);
  const nWord2 = (await ev(`([...document.querySelectorAll('service-panel [data-action="notify"]')][0]||{textContent:''}).textContent.trim()`)).v;
  step('P006-notify-toggle', nOn.ok && /停止监听/.test(nWord) && /开始监听/.test(nWord2), { on: nWord, off: nWord2 });

  // ─── P007 已连接页 ───
  currentStep = 'P007';
  await click(`[...document.querySelectorAll('#tabbar .tb')].find(b=>b.dataset.tab==='connected')`);
  await waitFor('connected view', `document.getElementById('connectedView').offsetParent!==null`, 5000);
  const connState = (await ev(`({
    count: document.getElementById('connectedCount').textContent,
    cards: [...document.querySelectorAll('#connectedDeviceList device-card')].map(c=>c.textContent.trim().slice(0,100)),
    hasDisconnectAll: !!document.getElementById('disconnectAllBtn'),
  })`)).v;
  await snap('07-connected');
  step('P007-connected', connState.count === '1' && connState.hasDisconnectAll, connState);

  // ─── 退出确认（busy 态文案需真连接计数：sim 模式 Go 侧恒 0，只验机制）───
  currentStep = 'exit-confirm-busy';
  closeMainWindow();
  await waitFor('exit modal', `!!document.getElementById('exitConfirmBody')`, 6000);
  const exitModal = (await ev(`({
    connected: document.getElementById('exitConfirmBody').dataset.connected,
    text: (document.getElementById('exitConfirmBody').closest('[class*=modal], .modal')||{textContent:''}).textContent.trim().slice(0,300),
  })`)).v;
  await snap('08-exit-busy');
  const stay = await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='继续使用')`);
  await sleep(900);
  const modalGone = (await ev(`!document.getElementById('exitConfirmBody')`)).v;
  const busyOk = results.flavor === 'real'
    ? (exitModal.connected === '1' && /当前连接设备：1 台/.test(exitModal.text))
    : exitModal.connected === '0';
  step('exit-confirm-busy', busyOk && modalGone && stay.ok,
    { ...exitModal, stayClicked: stay.ok, modalGone, note: results.flavor === 'real' ? '' : 'sim 模式 Go 计数恒 0，busy 文案留真机窗口补验' });

  // ─── 断开全部 ───
  currentStep = 'disconnect-all';
  await click(`[...document.querySelectorAll('#tabbar .tb')].find(b=>b.dataset.tab==='connected')`);
  await click(q('#disconnectAllBtn'));
  await waitFor('count zero', `document.getElementById('connectedCount').textContent==='0'`, 15000);
  const zero = (await ev(`document.getElementById('connectedCount').textContent`)).v;
  step('disconnect-all', zero === '0', { count: zero });

  // ═══ M 阶段：mock 全 UI（写入弹窗等纯 UI 面）═══
  currentStep = 'mock-nav';
  // pushState+reload（直接 location.href 同页带参疑似被 WebView2 拒绝）
  await ev(`(function(){ try { history.pushState(null,'','/?mock=true'); } catch(e){} location.reload(); return true; })()`);
  await sleep(2500);
  try {
    await waitFor('mock reload', `document.readyState==='complete' && window.appInstance && window.appInstance.USE_MOCK_BLE===true`, 20000);
  } catch (e) {
    const diag = (await ev(`({ href: location.href, search: location.search, ready: document.readyState, hasApp: !!window.appInstance, mock: window.appInstance? window.appInstance.USE_MOCK_BLE : null, errs: (window.__automationErrors||[]).slice(0,5) })`)).v;
    throw new Error('mock reload fail: ' + JSON.stringify(diag));
  }
  const mockReady = (await ev(`({ mock: window.appInstance.USE_MOCK_BLE, search: location.search })`)).v;
  step('mock-mode-enter', mockReady.mock === true, mockReady);

  currentStep = 'mock-cards';
  const mkDev = (i, name, rssi, svc) => `window.appInstance.onDeviceDiscovered({ id:'SIM-${i}', name:${JSON.stringify(name)}, localName:${JSON.stringify(name)}, rssi:${rssi}, address:'SIM-${i}', connectionState:'disconnected', advertisement:{ serviceUuids:${svc}, connectable:true, scannable:true } })`;
  await ev(`(async()=>{ ${mkDev(1, 'SIM-A1', -41, `['${HID_SVC}']`)}; ${mkDev(2, 'SIM-B2', -55, '[]')}; ${mkDev(3, '', -67, '[]')}; ${mkDev(4, 'SIM-D4', -72, '[]')}; return true; })()`);
  await waitFor('sim cards', `document.querySelectorAll('#deviceList device-card').length>=4`, 5000);
  const mockCards = (await ev(`({
    count: document.querySelectorAll('#deviceList device-card').length,
    chip: document.getElementById('deviceCount').textContent,
  })`)).v;
  step('mock-device-cards', mockCards.count >= 4, mockCards);

  currentStep = 'mock-filter';
  await click(q('#filterToggle'));
  await waitFor('filter open', `!document.getElementById('mainFilterPanel').hidden`, 4000);
  const resetClick = await click(`[...document.querySelectorAll('#mainFilterPanel button')].find(b=>/重置/.test(b.textContent))`);
  await click(q('#filterToggle'));
  await sleep(300);
  const fpClosed = (await ev(`document.getElementById('mainFilterPanel').hidden`)).v;
  step('filter-panel', resetClick.ok && fpClosed, { resetClicked: resetClick.ok, closed: fpClosed });

  currentStep = 'mock-write-dialog';
  // mock discoverServices 补一个可写特征（原生 mock 面板 read-only，写弹窗需 write 特征）
  await ev(`(async()=>{
    const b = window.bleAPI;
    const _disc = b.discoverServices.bind(b);
    b.discoverServices = async (id)=>{
      const r = await _disc(id);
      if (r && r.data) {
        r.data.push({ uuid:'ffe1', name:'测试服务', characteristics:[{ uuid:'ffe2', name:'测试写特征', properties:['read','write','writeWithoutResponse','notify'] }] });
        window.appInstance.onServicesDiscovered({ deviceId:id, services:r.data });
      }
      return r;
    };
    return true;
  })()`);
  await click(`(()=>{ const c=[...document.querySelectorAll('#deviceList device-card')].find(c=>c.textContent.includes('SIM-A1')); return c? c.querySelector('#connectBtn'):null; })()`);
  await waitFor('mock services', `document.querySelectorAll('service-panel .svc').length>=1`, 20000);
  await click(`[...document.querySelectorAll('service-panel [data-role="expand"]')][0]`);
  await sleep(400);
  const wClick = await click(`[...document.querySelectorAll('service-panel [data-action="write"]')][0]`);
  await waitFor('write dialog', `!!document.querySelector('write-dialog') && document.querySelector('write-dialog').offsetParent!==null`, 5000);
  await ev(`(function(){ const wd=document.querySelector('write-dialog'); const inp=wd.querySelector('textarea, input[type=text]'); if(inp){ inp.value='hi-gwin'; inp.dispatchEvent(new Event('input',{bubbles:true})); } return !!inp; })()`);
  await snap('09-write-dialog');
  const sendClick = await click(`[...document.querySelectorAll('write-dialog button')].find(b=>/写入|发送/.test(b.textContent))`);
  await sleep(900);
  const wState = (await ev(`(()=>{
    const lp=document.querySelector('#deviceDetailView log-panel')||document.querySelector('log-panel');
    return { dialogGone: !document.querySelector('write-dialog') || document.querySelector('write-dialog').offsetParent===null, log: lp? lp.textContent.slice(-160):'' };
  })()`)).v;
  step('P005-write-dialog', wClick.ok && sendClick.ok && (wState.dialogGone || /成功|写入/.test(wState.log.replace(/ /g,' '))), { wClick: wClick.ok, sendClick: sendClick.txt, ...wState });

  // ─── P008 广播页 UI ───
  currentStep = 'P008-broadcast';
  await ev(`window.appInstance.switchTab('broadcast'); true`);
  await sleep(600);
  // mock 下支持检查异步回藏视图（真机降级路径已由 R3 实测）——UI 结构核验强制显示
  await ev(`(function(){ const v=document.getElementById('broadcastView'); v.style.display='block'; v.classList.add('active'); return true; })()`);
  await sleep(200);
  const bc = (await ev(`({
    visible: getComputedStyle(document.getElementById('broadcastView')).display!=='none',
    badge: document.getElementById('broadcastStateBadge').textContent.trim(),
    platform: document.getElementById('broadcastPlatformChip').textContent.trim(),
    byteTotal: document.getElementById('broadcastByteTotal').textContent,
  })`)).v;
  await snap('10-broadcast');
  step('P008-broadcast-ui', bc.visible && bc.badge === '未就绪' && /Desktop/.test(bc.platform), bc);

  // ─── P009/P010 ───
  currentStep = 'P009-about';
  await click(`[...document.querySelectorAll('#tabbar .tb')].find(b=>b.dataset.tab==='about')`);
  await waitFor('about view', `document.getElementById('aboutView').offsetParent!==null`, 5000);
  const about = (await ev(`({
    versionChip: document.getElementById('aboutVersionChip').textContent.trim(),
    versionLine: document.getElementById('aboutVersionLine').textContent.trim(),
    env: document.getElementById('aboutEnvValue').textContent.trim(),
  })`)).v;
  await snap('11-about');
  step('P009-about', about.versionChip.length > 0 && about.versionChip !== '版本读取中…', about);

  currentStep = 'P010-versions';
  await click(q('#goVersionsLink'));
  await waitFor('versions view', `document.getElementById('versionsView').offsetParent!==null`, 5000);
  const versions = (await ev(`document.getElementById('versionsBody').textContent.trim().slice(0,120)`)).v;
  await snap('12-versions');
  const backOk = await click(q('#versionsBackButton'));
  await sleep(300);
  const backAbout = (await ev(`document.getElementById('aboutView').offsetParent!==null`)).v;
  step('P010-versions', /当前版本/.test(versions) && backOk.ok && backAbout, { versions });

  // ─── 最终退出（先切回真实桥：mock 多态缺 onConfirmExit/confirmExit，设计内）───
  currentStep = 'exit-final';
  await ev(`(function(){ try { history.pushState(null,'','/'); } catch(e){} location.reload(); return true; })()`);
  await sleep(2500);
  await waitFor('real bridge back', `document.readyState==='complete' && window.bleAPI && typeof window.bleAPI.confirmExit==='function' && document.getElementById('btWord') && document.getElementById('btWord').textContent==='蓝牙就绪'`, 30000);
  const cnt = (await ev(`document.getElementById('connectedCount').textContent`)).v;
  if (cnt !== '0') {
    await ev(`window.appInstance.switchTab('connected'); true`);
    await click(q('#disconnectAllBtn'));
    await waitFor('zero before exit', `document.getElementById('connectedCount').textContent==='0'`, 10000);
  }
  closeMainWindow();
  await waitFor('exit modal 2', `!!document.getElementById('exitConfirmBody')`, 6000);
  const exit2 = (await ev(`({
    connected: document.getElementById('exitConfirmBody').dataset.connected,
    text: (document.getElementById('exitConfirmBody').closest('[class*=modal], .modal')||{textContent:''}).textContent.trim().slice(0,120),
  })`)).v;
  await snap('13-exit-final');
  const quitClick = await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='退出')`);
  const exited = await new Promise(res => {
    const t = setTimeout(() => res(false), 12000);
    child.on('exit', () => { clearTimeout(t); res(true); });
  });
  step('exit-final-quit', exit2.connected === '0' && /常驻/.test(exit2.text) && quitClick.ok && exited, { ...exit2, quitClicked: quitClick.ok, processExited: exited });

  // console.error 缓冲收尾（shim 提供）
  currentStep = 'console-errors';
  const errs = (await ev(`window.__automationErrors || []`)).v || [];
  results.consoleErrors = errs;
  step('console-clean', errs.length === 0, { count: errs.length, sample: errs.slice(0, 5) });

} catch (e) {
  results.fatal = { step: currentStep, error: String(e && e.message || e) };
  console.error('FATAL at', currentStep, e);
} finally {
  const pass = results.steps.filter(s => s.ok).length;
  results.summary = { pass: pass, total: results.steps.length, fatal: !!results.fatal };
  writeFileSync(join(HERE, 'gwin-fullui-walk.json'), JSON.stringify(results, null, 1));
  console.log(`\n==== G-WIN FULL-UI WALK: ${pass}/${results.steps.length}${results.fatal ? ' +FATAL@' + results.fatal.step : ''} flavor=${results.flavor} ====`);
  try { child.kill(); } catch { }
  try { execSync('taskkill /IM smartble.exe /F', { stdio: 'ignore', shell: true }); } catch { }
  try { sock.destroy(); } catch { }
  process.exit(results.fatal || results.steps.some(s => !s.ok) ? 1 : 0);
}
