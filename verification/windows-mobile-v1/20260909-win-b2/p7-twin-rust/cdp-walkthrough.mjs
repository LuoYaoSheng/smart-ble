// P7 T-WIN 运行级走查（WebView2 CDP）
// 用法：先以 WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9444 启动 Tauri exe，
// 再以 nvm node 23.8 运行本脚本。每项检查输出 PASS/FAIL，退出码=FAIL 数。
const PORT = process.argv[2] || '9444';
const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 1. 发现页面目标
  let targets;
  for (let i = 0; i < 20; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      if (targets.some((t) => t.type === 'page')) break;
    } catch {}
    await sleep(500);
  }
  const page = targets?.find((t) => t.type === 'page');
  if (!page) { console.log('FAIL  CDP page target not found'); process.exit(1); }
  record('CDP 目标发现', true, page.url);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push((msg.params.args || []).map((a) => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('EXC ' + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || ''));
    }
  };
  const evalJs = async (expr, awaitPromise = false) => {
    const id = ++seq;
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise } }));
    const msg = await new Promise((res) => pending.set(id, res));
    if (msg.error) return { error: JSON.stringify(msg.error) };
    const r = msg.result;
    if (r.exceptionDetails) return { error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
    return { value: r.result?.value };
  };
  await ws.send(JSON.stringify({ id: ++seq, method: 'Runtime.enable' }));

  // 2. 脚本链与全局挂载
  record('SmartHid bundle 挂载', (await evalJs("typeof window.SmartHid")).value === 'object');
  record('SmartHidDesktop 挂载', (await evalJs("typeof window.SmartHidDesktop")).value === 'object');
  record('hid-service 先于 app.js', (await evalJs(
    "(() => { const s=[...document.scripts].map(x=>x.src); return s.indexOf(location.origin+'/hid-service.js')>=0 && s.indexOf(location.origin+'/smart-hid.bundle.js')>=0 && s.indexOf(location.origin+'/hid-service.js')>s.indexOf(location.origin+'/smart-hid.bundle.js') && s.indexOf(location.origin+'/app.js')>s.indexOf(location.origin+'/hid-service.js'); })()"
  )).value === true);
  record('__TAURI__ 注入(withGlobalTauri)', (await evalJs("typeof window.__TAURI__")).value === 'object');

  // 3. 五 Tab + 版本二级视图可达
  for (const [tab, view] of [['scan','deviceListView'],['connected','connectedView'],['broadcast','broadcastView'],['about','aboutView']]) {
    await evalJs(`switchTab('${tab}')`);
    const ok = (await evalJs(`document.getElementById('${view}')?.classList.contains('active')`)).value === true;
    record(`Tab ${tab} 激活 ${view}`, ok);
  }
  await evalJs("switchTab('versions')");
  record('版本二级视图可达(versionsView)', (await evalJs("document.getElementById('versionsView')?.classList.contains('active')")).value === true);
  record('版本页渲染非空(renderVersionsPage)', (await evalJs(
    "(() => { const b=document.getElementById('versionsBody'); return !!b && b.innerHTML.length > 200; })()"
  )).value === true);
  const verChip = await evalJs("document.getElementById('aboutVersionChip')?.textContent || ''");
  record('P009 版本 chip 投影', typeof verChip.value === 'string' && verChip.value.length > 0, verChip.value);

  // 4. Smart HID 三视图
  for (const v of ['hidProvisionView', 'hidDetailView', 'hidDiagnosticsView']) {
    await evalJs(`showHidView('${v}')`);
    const ok = (await evalJs(`document.getElementById('${v}')?.classList.contains('active')`)).value === true;
    record(`HID 视图 ${v} 激活`, ok);
  }
  // 配网向导：真实入口 openHidProvision（末尾自动 hidConnect → 真实 IPC → 假设备优雅失败）
  const wiz = await evalJs("(() => { const ids=['hidProvStepper','hidProvDevName','hidProvDevId','hidProvConnectPhase','hidProvConfigurePhase','hidProvStatusPhase']; return ids.filter(i=>document.getElementById(i)); })()");
  record('P002 向导六锚点齐备', Array.isArray(wiz.value) && wiz.value.length === 6, JSON.stringify(wiz.value));
  await evalJs("openHidProvision({ id: 'FAKE-DEV-001', name: 'SHID-FAKE' })");
  const stepper = await evalJs("document.getElementById('hidProvStepper')?.innerHTML?.length || 0");
  record('P002 stepper 渲染', Number(stepper.value) > 0, `len=${stepper.value}`);
  const devName = await evalJs("document.getElementById('hidProvDevName')?.textContent || ''");
  record('P002 设备名投影', devName.value === 'SHID-FAKE', devName.value);
  await sleep(3000);
  const connState = await evalJs("(() => { const err=document.getElementById('hidProvConnError'); const c=document.getElementById('hidProvConnecting'); const code=document.getElementById('hidProvConnErrorCode'); return { err: (err?.textContent||'').trim().slice(0,80), errShown: !!err && !err.hidden && err.textContent.trim().length>0, connecting: !!c && !c.hidden && c.style.display!=='none', codeHidden: !code || (!code.textContent && code.style.display==='none') || code.style.display==='none' }; })()");
  record('P002 假设备连接优雅失败（真实 IPC 往返）',
    connState.value && connState.value.errShown && !connState.value.connecting,
    JSON.stringify(connState.value).slice(0, 220));
  record('P002 传输级错误无协议码片（code chip 隐藏）', connState.value?.codeHidden === true, JSON.stringify(connState.value?.codeHidden));

  // 5. 诊断页五项（真实入口 openHidDiagnostics → offline 态默认五行）
  const diag = await evalJs("(() => { openHidDiagnostics('HID-TESTDEV1'); const b=document.getElementById('hidDiagBody'); const t=b?b.textContent:''; return ['BLE 链路','Wi-Fi 连接','ControlHub','控制连接','Ready'].filter(l=>t.includes(l)).length; })()");
  record('P005 诊断页五项渲染', diag.value === 5, `labels=${diag.value}/5`);

  // 6. F023 红线：无持久化、DOM 无 32hex token
  record('F023 localStorage 空', (await evalJs("(() => { try { return Object.keys(localStorage).length===0; } catch(e){ return true; } })()")).value === true);
  record('F023 sessionStorage 空', (await evalJs("(() => { try { return Object.keys(sessionStorage).length===0; } catch(e){ return true; } })()")).value === true);
  const dom = (await evalJs("document.documentElement.outerHTML")).value || '';
  record('F023 DOM 无 32hex token', !/[0-9a-f]{32}/.test(dom.replace(/release-metadata|generated/gi, '')));

  // 7. 真实 BLE：init_ble + 短扫描 + 停止（WinRT 后端；0 设备也 PASS，看优雅性与无崩溃）
  const init = await evalJs("window.__TAURI__.invoke('init_ble')", true);
  record('init_ble 真实调用', !(init.error), init.error ? init.error.slice(0, 120) : JSON.stringify(init.value)?.slice(0, 120));
  if (!init.error) {
    const scan = await evalJs("window.__TAURI__.invoke('start_scan')", true);
    record('start_scan 真实调用', !(scan.error), scan.error ? scan.error.slice(0, 120) : 'started');
    await sleep(4000);
    const devCount = await evalJs("(() => state.devices.size)()");
    record('扫描窗口 4s 设备计数读取', typeof devCount.value === 'number', `devices=${devCount.value}`);
    const stop = await evalJs("window.__TAURI__.invoke('stop_scan')", true);
    record('stop_scan 优雅停止', !(stop.error));
    await sleep(800);
  }
  // U-REC-001 痕迹：attach 注入的 ownsDevice 守卫在位
  record('ownsDevice 守卫注入(attach)', (await evalJs("typeof window.SmartHidService?.ownsDevice")).value === 'function');

  // 8. 页面异常汇总
  await sleep(600);
  record('无页面 JS 异常', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ').slice(0, 300));

  ws.close();
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n== P7 T-WIN CDP walkthrough: ${results.length - fails}/${results.length} PASS ==`);
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(2); });
