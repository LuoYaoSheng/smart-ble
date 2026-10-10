import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const mainURL = new URL('../../apps/desktop/electron/src/main/index.js', import.meta.url);
const require = createRequire(mainURL);
const {parseAvailability, availabilityError} = require('./windows-bluetooth-availability');

test('WinRT availability parser fails closed for malformed or unknown query responses', () => {
  for (const state of ['poweredOn', 'poweredOff', 'noAdapter', 'unsupportedAdapter', 'unauthorized', 'unavailable']) assert.equal(parseAvailability(JSON.stringify({state})), state);
  for (const raw of ['', '{}', '{"state":"ready"}', 'Access denied']) assert.equal(parseAvailability(raw), 'unavailable');
});

test('Electron production IPC refuses init, scan and broadcast before native loading when no adapter exists', async () => {
  const handlers = new Map(); let nativeLoaded = false;
  const electron = {app: {whenReady: () => new Promise(() => {}), on() {}}, ipcMain: {handle: (name, fn) => handlers.set(name, fn)}, BrowserWindow: class {}};
  const context = vm.createContext({require: name => {
    if(name === 'electron') return electron;
    if(name === './windows-bluetooth-availability') return {queryWindowsAvailability: async () => 'noAdapter', availabilityError};
    if(name === '@abandonware/noble') {nativeLoaded = true; assert.fail('adapter absent: native initialization reached');}
    return require(name);
  }, process: {...process, platform: 'win32'}, __dirname: new URL('./',mainURL).pathname, Buffer, console, setTimeout, clearTimeout, AbortController});
  vm.runInContext(readFileSync(mainURL,'utf8'), context);
  for(const method of ['init','startScan','startAdvertising']) {
    const result = await handlers.get('ble:' + method)(null, '', [], '', '', false);
    assert.equal(result.success, false); assert.equal(result.state, 'noAdapter'); assert.match(result.error, /^NO_ADAPTER:/);
  }
  assert.equal(nativeLoaded, false);
});

function frontend(lane, result) {
  const nodes = new Map(); const noop = () => {};
  const get = id => {if(!nodes.has(id)) nodes.set(id,{style:{},classList:{toggle:noop,add:noop},value:'',innerHTML:'',textContent:'',disabled:false,addLog:noop,addEventListener:noop});return nodes.get(id);};
  const calls = [];
  const window = {location:{search:''}, platform:{platform:'win32'}, navigator:{userAgent:'Windows'}, addEventListener:noop, bleAPI:{init:async()=>result,startScan:async()=>{calls.push('scan');return {success:true};},startAdvertising:async()=>{calls.push('advertising');return {success:true};}}};
  const context = vm.createContext({window,navigator:window.navigator,document:{getElementById:get,querySelector:selector=>get(selector),querySelectorAll:()=>[],addEventListener:noop},console:{log:noop,error:noop,warn:noop},setTimeout,clearTimeout,TextEncoder});
  const paths={electron:'apps/desktop/electron/public/app.js',wails:'apps/desktop/wails/frontend/src/app.js',tauri:'apps/desktop/tauri/src/app.js'};
  vm.runInContext(readFileSync(new URL('../../'+paths[lane],import.meta.url),'utf8'),context);
  if(lane==='tauri') {
    context.invokeStub=async name=>{if(name==='init_ble')return result;calls.push(name);return {success:true};};
    vm.runInContext('invoke = invokeStub;',context);
  } else vm.runInContext("app = Object.create(App.prototype); app.isScanning=false; app.isBroadcasting=false; app.bluetoothReady=false; app.showError=()=>{}; app.showToast=()=>{}; app.bLog=()=>{};",context);
  return {nodes,calls,run:code=>vm.runInContext(code,context)};
}
for(const lane of ['electron','wails','tauri']) {
  for(const [error,label] of [['NO_ADAPTER: absent','未发现蓝牙适配器'],['BLUETOOTH_OFF: off','蓝牙未开启'],['BLUETOOTH_UNAUTHORIZED: denied','蓝牙权限未授权'],['UNSUPPORTED_ADAPTER: legacy','适配器不支持 BLE'],['BLUETOOTH_UNAVAILABLE: query failed','蓝牙状态未确认']]) {
    test(`${lane} production UI: ${error.split(':')[0]} never reports ready or invokes scan/broadcast`,async()=>{
      const view=frontend(lane,{success:false,error});
      await view.run(lane==='tauri'?'initBluetooth()':'app.initBLE()');
      assert.equal(view.nodes.get('btWord').textContent,label);
      assert.equal(view.nodes.get('scanButton').disabled,true);
      await view.run(lane==='tauri'?'checkBroadcastSupport()':'app.checkBroadcastSupport()');
      assert.doesNotMatch(view.nodes.get('broadcastStateBadge').innerHTML,/已就绪/);
      assert.equal(view.nodes.get('startBroadcastButton').disabled,true);
      await view.run(lane==='tauri'?'startScan()':'app.startScan()');
      await view.run(lane==='tauri'?'startAdvertising()':'app.startBroadcast()');
      assert.deepEqual(view.calls,[]);
    });
  }
  test(`${lane} an enabled adapter enables scanning; broadcasting readiness still requires a supported implementation`,async()=>{
    const view=frontend(lane,{success:true,state:'poweredOn'});
    await view.run(lane==='tauri'?'initBluetooth()':'app.initBLE()');
    assert.equal(view.nodes.get('btWord').textContent,'蓝牙就绪');
    assert.equal(view.nodes.get('scanButton').disabled,false);
    await view.run(lane==='tauri'?'checkBroadcastSupport()':'app.checkBroadcastSupport()');
    assert.match(view.nodes.get('broadcastStateBadge').innerHTML,/已就绪/);
  });
}
