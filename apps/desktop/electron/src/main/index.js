//
// SmartBLE Desktop - Main Process
// Multi-device concurrent connection support
//

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { queryWindowsAvailability, availabilityError } = require('./windows-bluetooth-availability');
const { SessionWriteQueue, callbackTransaction, READ_TIMEOUT_MS, CONNECT_TIMEOUT_MS } = require('./ble-transactions');
// F026：主进程日志统一脱敏（uniapp logger/log-redaction.js 的桌面锁定镜像，挂 globalThis）
let LOG_REDACTION = null;
try {
  require('../../public/log-redaction.js');
  LOG_REDACTION = globalThis.SmartBLELogRedaction || null;
} catch (_) { /* 脱敏镜像缺失时不阻断主进程 */ }
function debugLog(...args) {
  const msg = args.map(value => {
    try { return typeof value === 'object' ? JSON.stringify(value) : String(value); }
    catch (_) { return '[日志对象无法序列化]'; }
  }).join(' ');
  // 不主动落盘；所有输出通道都用同一脱敏字符串。组件缺失时禁止回退原始凭据。
  console.log(LOG_REDACTION
    ? LOG_REDACTION.sanitizeLogString(msg)
    : '[日志内容已隐藏：脱敏组件未就绪]');
}
debugLog('=== Electron Main Process Started ===');

let mainWindow = null;
let bleModule = null;
// 退出确认旗：渲染层确认后置 true，放行下一次 close（app.quit() 会再触发 close）
let exitConfirmed = false;

// 存储发现的设备
const discoveredDevices = new Map();
// 多设备并发连接 (deviceId -> peripheral)
const connectedPeripherals = new Map();
const connectionSessions = new Map();
const pendingConnections = new Map();

function retireSession(deviceId, session, emit = true) {
  if (connectionSessions.get(deviceId) !== session) return;
  session.queue.close();
  session.peripheral.removeListener('disconnect', session.onDisconnect);
  for (const service of session.peripheral.services || []) {
    for (const characteristic of service.characteristics || []) characteristic.removeAllListeners('data');
  }
  connectionSessions.delete(deviceId);
  connectedPeripherals.delete(deviceId);
  serviceDiscoveryCache.delete(deviceId);
  if (emit) sendToRenderer('ble:deviceDisconnected', { id: deviceId });
}

function characteristicFor(peripheral, serviceUuid, charUuid) {
  const service = (peripheral.services || []).find(s => matchBleUuid(s.uuid, serviceUuid));
  if (!service) return { error: 'Service not found' };
  const characteristic = (service.characteristics || []).find(c => matchBleUuid(c.uuid, charUuid));
  return characteristic ? { characteristic } : { error: 'Characteristic not found' };
}

function writeToSession(deviceId, serviceUuid, charUuid, buffer, withoutResponse) {
  const targetId = deviceId || connectedPeripherals.keys().next().value;
  const session = connectionSessions.get(targetId);
  if (!session) return Promise.resolve({ success: false, error: 'No device connected' });
  const { characteristic, error } = characteristicFor(session.peripheral, serviceUuid, charUuid);
  if (error) return Promise.resolve({ success: false, error });
  const props = characteristic.properties || [];
  const mode = typeof withoutResponse === 'boolean' ? withoutResponse : !props.includes('write');
  if (!props.includes(mode ? 'writeWithoutResponse' : 'write')) {
    return Promise.resolve({ success: false, error: 'Characteristic does not support requested write type' });
  }
  return session.queue.write(done => {
    characteristic.write(buffer, mode, error => done(error ? { success: false, error: error.message } : { success: true }));
  });
}
// 服务发现缓存：deviceId -> Promise<{success, services}>（防重入 + 防渲染端回环风暴）
const serviceDiscoveryCache = new Map();

// UUID 规范化匹配：noble 给无横线小写，调用方（OtaDialog 等）可能传带横线/大写
function normalizeBleUuid(uuid) {
  return (uuid || '').toLowerCase().replace(/-/g, '');
}
function matchBleUuid(a, b) {
  return normalizeBleUuid(a) === normalizeBleUuid(b);
}

// 加载 BLE 模块
let bleModuleLoaded = false;
let bluetoothState = 'unknown';
let availabilityRevision = 0;
function publishBluetoothState(state) { bluetoothState = state; sendToRenderer('ble:stateChanged', { state }); }
async function currentBluetoothState() {
  if (process.platform !== 'win32') return bleModule?.state || 'unavailable';
  const hardware = await queryWindowsAvailability();
  if (hardware !== 'poweredOn') return hardware;
  return bleModule?.state === 'poweredOn' ? 'poweredOn' : (bleModule?.state === 'unauthorized' ? 'unauthorized' : 'unavailable');
}
async function requireBluetoothReady() {
  const state = await currentBluetoothState();
  publishBluetoothState(state);
  return state === 'poweredOn' ? null : { success: false, state, error: availabilityError(state) };
}

async function loadBLEModule() {
  const platform = process.platform;

  // 如果已经加载过，直接返回
  if (bleModuleLoaded) {
    debugLog('BLE module already loaded');
    // 渲染层重载后二次 init：noble 不会再发 stateChange，补发当前态，防状态芯片卡「初始化中…」
    publishBluetoothState(await currentBluetoothState());
    return true;
  }

  try {
    debugLog('Loading noble module...');
    const noble = require('@abandonware/noble');
    bleModule = noble;
    bleModuleLoaded = true;
    debugLog('Noble loaded, state:', bleModule.state);

    // 先设置事件监听，再获取状态
    setupBLEEvents();

    // 延迟获取状态，确保监听器已设置
    await new Promise(resolve => setTimeout(resolve, 200));

    // Windows startup resilience (Task 6)
    if (process.platform === 'win32' && (bleModule.state === 'unknown' || bleModule.state === 'poweredOff')) {
       debugLog('Windows BLE state is unknown/poweredOff. Waiting to see if module wakes up...');
       for (let i = 0; i < 10; i++) {
           await new Promise(resolve => setTimeout(resolve, 1000));
           if (bleModule.state === 'poweredOn') {
               debugLog(`BLE recovered after retry ${i + 1}`);
               break;
           }
           debugLog(`Retry ${i + 1}, state is still ${bleModule.state}`);
       }
    }

    // 主动发送当前状态
    debugLog('Sending initial state:', bleModule.state, 'to renderer');
    publishBluetoothState(await currentBluetoothState());

    return true;
  } catch (error) {
    debugLog('Failed to load BLE module:', error.message);
    return false;
  }
}

// 创建主窗口
function createWindow() {
  debugLog('Creating main window...');
  mainWindow = new BrowserWindow({
    // 基础窗口高度以 P008 广播页完全显示为准：页面内容 786px + 底部 TabBar 64px = 850px 视口，
    // 加窗口标题栏后取 900（旧值 800 会在首屏裁掉广播日志面板约 50px）
    width: 1200,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true // BLE runs in the main process; renderer needs only the IPC preload
    },
    title: '蓝析BLE工具箱',
    backgroundColor: '#F2F2F7',
    show: false
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());

  const isDev = process.argv.includes('--dev');

  mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    debugLog('Window ready to show');
    mainWindow.show();
  });

  // 退出确认（10_platform §4 生命周期：常驻，退出确认；原型 desktop.js dwin-quit 同口径）
  // X/Alt+F4 → 拦截 close → 通知渲染层弹应用内模态（正典 modal 形态）→ 确认后置旗放行
  mainWindow.on('close', (event) => {
    if (exitConfirmed) return;
    event.preventDefault();
    const connected = connectedPeripherals.size;
    debugLog(`Close requested -> exit confirm (connected=${connected})`);
    mainWindow.webContents.send('app:confirm-exit', { connected });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// BLE 事件设置
function setupBLEEvents() {
  debugLog('Setting up BLE events');

  // 状态变化监听
  bleModule.on('stateChange', async (state) => {
    const revision = ++availabilityRevision;
    const confirmed = process.platform === 'win32' ? await currentBluetoothState() : state;
    if (revision !== availabilityRevision) return;
    debugLog('BLE State changed:', confirmed);
    publishBluetoothState(confirmed);
  });

  // 发现设备
  bleModule.on('discover', (peripheral) => {
    // EWIN-DEF-PROV-001：跨帧合并再投影——SHID 真机 20260924 实证服务 UUID 在 ADV 帧、
    // 名称在 Extended/SCAN_RSP 帧，逐帧投影会让匹配态/显示名随帧漂移（首渲无「配置」按钮）
    const existing = discoveredDevices.get(peripheral.id);
    const mergedAdv = mergeAdvertisement(existing, peripheral);
    discoveredDevices.set(peripheral.id, peripheral);

    const adv = mergedAdv;

    // 解析广播数据
    // F005 显示名批准链：name 投影广播 localName，空名保持空串（渲染层批准链兜底，
    // 不在数据层污染为「未知设备」——批准链正典见 uniapp device-display-name.js）
    const device = {
      id: peripheral.id,
      name: adv.localName || '',
      localName: adv.localName || '',
      rssi: peripheral.rssi,
      address: peripheral.address,
      connectionState: peripheral.state === 'connected' ? 'connected' : 'disconnected',
      // 广播数据
      advertisement: {
        txPowerLevel: adv.txPowerLevel,
        serviceUuids: adv.serviceUuids || [],
        serviceData: (adv.serviceData || []).map(sd => ({
          uuid: sd.uuid,
          data: sd.data ? sd.data.toString('hex') : null
        })),
        manufacturerData: adv.manufacturerData ? adv.manufacturerData.toString('hex') : null,
        // 标志位
        solicitedServiceUuids: adv.solicitedServiceUuids || [],
        // 其他数据
        connectable: adv.connectable !== false,
        scannable: adv.scannable !== false
      }
    };

    sendToRenderer('ble:deviceDiscovered', device);
  });

  // 连接警告处理
  bleModule.on('warning', (message) => {
    debugLog('BLE Warning:', message);
    sendToRenderer('ble:warning', { message });
  });
}

// EWIN-DEF-PROV-001 跨帧广播合并：名称非空沿新、UUID 并集、厂商/ServiceData 沿最新非空。
// 输入为 noble 原始 advertisement（manufacturerData 为 Buffer）；返回合并投影形状。
function mergeAdvertisement(existing, fresh) {
  const fa = (fresh && fresh.advertisement) || {};
  const ea = (existing && existing.advertisement) || null;
  if (!ea) {
    return {
      localName: fa.localName || '',
      txPowerLevel: fa.txPowerLevel,
      serviceUuids: fa.serviceUuids || [],
      serviceData: fa.serviceData || [],
      manufacturerData: fa.manufacturerData,
      solicitedServiceUuids: fa.solicitedServiceUuids || [],
      connectable: fa.connectable !== false,
      scannable: fa.scannable !== false
    };
  }
  return {
    localName: fa.localName || ea.localName || '',
    txPowerLevel: fa.txPowerLevel != null ? fa.txPowerLevel : ea.txPowerLevel,
    serviceUuids: [...new Set([...(ea.serviceUuids || []), ...(fa.serviceUuids || [])])],
    serviceData: (fa.serviceData && fa.serviceData.length) ? fa.serviceData : (ea.serviceData || []),
    manufacturerData: (fa.manufacturerData && fa.manufacturerData.length)
      ? fa.manufacturerData
      : ea.manufacturerData,
    solicitedServiceUuids: [...new Set([...(ea.solicitedServiceUuids || []), ...(fa.solicitedServiceUuids || [])])],
    connectable: fa.connectable !== false,
    scannable: fa.scannable !== false
  };
}

// 发送消息到渲染进程
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    debugLog(`[Main -> Renderer] ${channel}:`, data);
    try {
      mainWindow.webContents.send(channel, data);
    } catch (e) {
      debugLog(`[Main -> Renderer] Send error:`, e.message);
    }
  } else {
    debugLog(`[Main -> Renderer] Failed: window not available for ${channel}`);
  }
}

// 获取存储的设备
function getDevice(deviceId) {
  return discoveredDevices.get(deviceId);
}

// IPC 处理器
// F027 版本元数据：运行时渠道版本（package.json version，与仓库根 VERSION 单源同步）
ipcMain.handle('app:getVersion', () => app.getVersion());

// 退出确认回执：渲染层模态「退出」→ quit=true（「继续使用」不发消息，直接关模态）
ipcMain.handle('app:confirm-exit', (_event, quit) => {
  if (quit === true) {
    exitConfirmed = true;
    debugLog('Exit confirmed by user -> quitting');
    app.quit();
  }
  return true;
});

ipcMain.handle('ble:init', async () => {
  debugLog('IPC: ble:init called');
  if (process.platform === 'win32') {
    const hardware = await queryWindowsAvailability();
    if (hardware !== 'poweredOn') {
      publishBluetoothState(hardware);
      return { success: false, platform: process.platform, state: hardware, error: availabilityError(hardware) };
    }
  }
  const loaded = await loadBLEModule();
  const state = loaded ? await currentBluetoothState() : 'unavailable';
  publishBluetoothState(state);
  return { success: loaded && state === 'poweredOn', platform: process.platform, state, ...(state !== 'poweredOn' ? { error: availabilityError(state) } : {}) };
});

ipcMain.handle('ble:startScan', async () => {
  const unavailable = await requireBluetoothReady();
  if (unavailable) return unavailable;
  if (!bleModule) return { success: false, error: 'BLE module not loaded' };

  try {
    // 清空之前的设备
    discoveredDevices.clear();

    if (bleModule.state === 'poweredOn') {
      bleModule.startScanning([], true);
      return { success: true };
    } else {
      return { success: false, error: 'Bluetooth not ready, state: ' + bleModule.state };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ble:stopScan', async () => {
  if (!bleModule) return { success: false };

  try {
    bleModule.stopScanning();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 广播状态
let advertisingService = null;

// ── Win32 广播边车（WIN-BRIDGE 模板，2026-09-21 裁决项 #3）──
// PowerShell 直呼 WinRT BluetoothLEAdvertisementPublisher（仅厂商块 0xFF，
// 平台事实见 20260921-XDEV-BROADCAST）；行协议见 win-broadcast-bridge.ps1 头注。
let winBridge = null; // { proc, waiters: Map<event, resolve[]>, buffer }

function emitWinBridge(event, payload) {
  if (winBridge) {
    (winBridge.waiters.get(event) || []).forEach((resolve) => resolve(payload));
    winBridge.waiters.set(event, []);
  }
}

function ensureWinBridge() {
  if (winBridge && winBridge.proc.exitCode === null) {
    return winBridge;
  }
  const { spawn } = require('child_process');
  const proc = spawn('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
    path.join(__dirname, 'win-broadcast-bridge.ps1')
  ], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });

  winBridge = { proc, waiters: new Map(), buffer: '' };
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    winBridge.buffer += chunk;
    let idx;
    while ((idx = winBridge.buffer.indexOf('\n')) >= 0) {
      const line = winBridge.buffer.slice(0, idx).trim();
      winBridge.buffer = winBridge.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        debugLog('win-bridge event:', msg);
        if (msg.event === 'error') {
          emitWinBridge('started', { success: false, error: msg.message });
          emitWinBridge('stopped', { success: false, error: msg.message });
        } else {
          emitWinBridge(msg.event, { success: true, detail: msg });
        }
      } catch (e) {
        debugLog('win-bridge unparsable line:', line);
      }
    }
  });
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (d) => debugLog('win-bridge stderr:', String(d).trim()));
  proc.on('exit', (code) => {
    debugLog('win-bridge exited:', code);
    emitWinBridge('started', { success: false, error: `bridge exited (${code})` });
    emitWinBridge('stopped', { success: false, error: `bridge exited (${code})` });
    if (winBridge && winBridge.proc === proc) winBridge = null;
  });
  return winBridge;
}

function waitWinBridge(event, timeoutMs) {
  return new Promise((resolve) => {
    const bridge = winBridge;
    if (!bridge) return resolve({ success: false, error: 'bridge not running' });
    const list = bridge.waiters.get(event) || [];
    list.push(resolve);
    bridge.waiters.set(event, list);
    setTimeout(() => {
      const pending = bridge.waiters.get(event) || [];
      const i = pending.indexOf(resolve);
      if (i >= 0) {
        pending.splice(i, 1);
        resolve({ success: false, error: `bridge ${event} timeout (${timeoutMs}ms)` });
      }
    }, timeoutMs);
  });
}

function killWinBridge() {
  if (!winBridge) return;
  const bridge = winBridge;
  winBridge = null;
  try {
    bridge.proc.stdin.write(JSON.stringify({ cmd: 'exit' }) + '\n');
    bridge.proc.stdin.end();
    setTimeout(() => { try { bridge.proc.kill(); } catch (_) {} }, 1500);
  } catch (_) {
    try { bridge.proc.kill(); } catch (_) {}
  }
}

ipcMain.handle('ble:startAdvertising', async (event, name, serviceUuids, manufacturerId, manufacturerData, includeName) => {
  // 检查平台支持
  if (process.platform === 'win32') {
    const unavailable = await requireBluetoothReady();
    if (unavailable) return unavailable;
    // WIN-BRIDGE：WinRT 仅厂商块可发（LocalName/ServiceUuids 被平台拒绝，
    // 见 20260921-XDEV-BROADCAST 平台事实）——name/uuid 参数在此路径忽略。
    try {
      const bridge = ensureWinBridge();
      const idStr = String(manufacturerId || '0001').replace(/^0x/i, '');
      const companyId = parseInt(idStr, 16) || 1;
      const dataStr = typeof manufacturerData === 'string' && manufacturerData.length > 0
        ? manufacturerData : 'BLE';
      const data = Array.from(Buffer.from(dataStr, 'ascii'));
      bridge.proc.stdin.write(JSON.stringify({ cmd: 'start', companyId, data }) + '\n');
      // 首次调用含边车冷启动（PS 起 + csc 首编译 ~3s），超时余量放宽
      const result = await waitWinBridge('started', 8000);
      if (result.success) debugLog('win advertising started:', { companyId, bytes: data.length });
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  if (process.platform !== 'linux') {
    return { success: false, error: `Advertising is not supported on ${process.platform}. True peripheral mode requires native apps (e.g., macOS SmartBLE) or Linux with bleno.` };
  }

  if (!bleModule) return { success: false, error: 'BLE module not loaded' };

  try {
    // 检查 noble 是否支持广播
    if (typeof bleModule.startAdvertising !== 'function') {
      return { success: false, error: 'BLE module does not support advertising. Use bleno on Linux.' };
    }

    // 先停止扫描
    bleModule.stopScanning();

    // 停止现有广播
    if (advertisingService) {
      await bleModule.stopAdvertising();
      advertisingService = null;
    }

    debugLog('Starting advertising:', { name, serviceUuids, manufacturerId, manufacturerData, includeName });

    // 创建广播服务
    const uuid = serviceUuids && serviceUuids.length > 0 ? serviceUuids[0] : 'FFF0';
    advertisingService = {
      uuid: uuid,
      characteristics: []
    };

    // 构建广播配置 (适配支持的底层库)
    const advConfig = {
        name: includeName ? (name || '蓝析BLE工具箱') : undefined,
        serviceUuids: [uuid]
    };
    if (manufacturerId && manufacturerData) {
        // 部分底层库支持通过 buffer 传输 ManufacturerData
        advConfig.manufacturerData = Buffer.from(manufacturerId.replace('0x', '') + manufacturerData, 'hex').toString() !== 'Invalid' ? 
                                     Buffer.from(manufacturerId.replace('0x', '') + Buffer.from(manufacturerData).toString('hex'), 'hex') : null;
    }

    // 开始广播
    await new Promise((resolve, reject) => {
      bleModule.startAdvertising(advConfig, (error) => {
        if (error) {
          debugLog('Advertising error:', error);
          reject(error);
        } else {
          debugLog('Advertising started');
          resolve();
        }
      });
    });

    return { success: true };
  } catch (error) {
    debugLog('Start advertising failed:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ble:stopAdvertising', async () => {
  if (process.platform === 'win32') {
    if (!winBridge) return { success: true };
    try {
      winBridge.proc.stdin.write(JSON.stringify({ cmd: 'stop' }) + '\n');
      return await waitWinBridge('stopped', 3000);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  if (process.platform !== 'linux') {
    return { success: false, error: `Advertising is not supported on ${process.platform}` };
  }

  if (!bleModule) return { success: false };

  try {
    if (advertisingService && typeof bleModule.stopAdvertising === 'function') {
      await bleModule.stopAdvertising();
      advertisingService = null;
      debugLog('Advertising stopped');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ble:connect', async (event, deviceId) => {
  if (!bleModule) return { success: false, error: 'BLE module not loaded' };
  if (connectionSessions.has(deviceId)) return { success: true };
  if (pendingConnections.has(deviceId)) return pendingConnections.get(deviceId).promise;
  const peripheral = getDevice(deviceId);
  if (!peripheral) return { success: false, error: 'Device not found' };
  bleModule.stopScanning();
  const attempt = { controller: new AbortController() };
  pendingConnections.set(deviceId, attempt);
  attempt.promise = callbackTransaction(done => {
    const onConnect = error => done(error ? { success: false, error: error.message } : { success: true });
    peripheral.once('connect', onConnect);
    peripheral.connect();
    return () => peripheral.removeListener('connect', onConnect);
  }, {
    timeoutMs: CONNECT_TIMEOUT_MS, signal: attempt.controller.signal, label: 'Connect',
    onTimeout: () => { try { peripheral.disconnect(); } catch (_) {} },
  }).then(result => {
    if (pendingConnections.get(deviceId) !== attempt || attempt.controller.signal.aborted) return { success: false, error: 'Connection cancelled' };
    pendingConnections.delete(deviceId);
    if (!result.success) return result;
    const session = { peripheral, notifyListeners: new Map(), notifyChanges: new Map() };
    session.queue = new SessionWriteQueue({ onTimeout: () => {
      retireSession(deviceId, session);
      try { peripheral.disconnect(); } catch (_) {}
    } });
    session.onDisconnect = () => {
      if (peripheral.state !== 'connected') retireSession(deviceId, session);
    };
    peripheral.on('disconnect', session.onDisconnect);
    connectionSessions.set(deviceId, session);
    connectedPeripherals.set(deviceId, peripheral);
    sendToRenderer('ble:deviceConnected', { id: deviceId });
    return result;
  });
  return attempt.promise;
});

ipcMain.handle('ble:disconnect', async (event, deviceId) => {
  const targetId = deviceId || connectedPeripherals.keys().next().value;
  const pending = pendingConnections.get(targetId);
  if (pending) {
    pendingConnections.delete(targetId);
    pending.controller.abort();
    try { getDevice(targetId)?.disconnect(); } catch (_) {}
  }
  const session = connectionSessions.get(targetId);
  if (!session) return { success: true };
  retireSession(targetId, session);
  return callbackTransaction(done => {
    const onDisconnect = error => done(error ? { success: false, error: error.message } : { success: true });
    session.peripheral.once('disconnect', onDisconnect);
    session.peripheral.disconnect();
    return () => session.peripheral.removeListener('disconnect', onDisconnect);
  }, { timeoutMs: CONNECT_TIMEOUT_MS, label: 'Disconnect' });
});

ipcMain.handle('ble:discoverServices', async (event, deviceId) => {
  const targetId = deviceId || connectedPeripherals.keys().next().value;
  const session = connectionSessions.get(targetId);
  if (!session) return { success: false, services: [], error: 'No device connected' };
  const cached = serviceDiscoveryCache.get(targetId);
  if (cached) return cached;
  const discovery = (async () => {
    const result = await callbackTransaction(done => {
      session.peripheral.discoverServices([], (error, services) => done(error
        ? { success: false, error: error.message }
        : { success: true, services: [...(services || [])] }));
    }, { timeoutMs: CONNECT_TIMEOUT_MS, signal: session.queue.signal, label: 'Service discovery' });
    if (!result.success) return { ...result, services: [] };
    const services = [];
    for (const service of result.services) {
      const chars = await callbackTransaction(done => {
        service.discoverCharacteristics([], (error, characteristics) => done(error
          ? { success: false, error: error.message }
          : { success: true, characteristics: characteristics || [] }));
      }, { timeoutMs: READ_TIMEOUT_MS, signal: session.queue.signal, label: 'Characteristic discovery' });
      if (!chars.success) return { ...chars, services: [] };
      service.characteristics = chars.characteristics;
      services.push({ uuid: service.uuid, name: getServiceName(service.uuid), characteristics: chars.characteristics.map(char => ({ uuid: char.uuid, name: getCharacteristicName(char.uuid), properties: getCharacteristicProperties(char.properties || []) })) });
    }
    if (connectionSessions.get(targetId) !== session) return { success: false, services: [], error: 'Device disconnected' };
    session.peripheral.services = result.services;
    sendToRenderer('ble:servicesDiscovered', { deviceId: targetId, services });
    return { success: true, services };
  })();
  serviceDiscoveryCache.set(targetId, discovery);
  const result = await discovery;
  if (!result.success && serviceDiscoveryCache.get(targetId) === discovery) serviceDiscoveryCache.delete(targetId);
  return result;
});

ipcMain.handle('ble:readCharacteristic', async (event, deviceId, serviceUuid, charUuid) => {
  const targetId = deviceId || connectedPeripherals.keys().next().value;
  const session = connectionSessions.get(targetId);
  if (!session) return { success: false, error: 'No device connected' };
  const { characteristic, error } = characteristicFor(session.peripheral, serviceUuid, charUuid);
  if (error) return { success: false, error };
  const result = await callbackTransaction(done => {
    characteristic.read((error, data) => done(error
      ? { success: false, error: error.message }
      : { success: true, value: [...(data || [])].map(b => b.toString(16).padStart(2, '0')).join(' ') }));
  }, { timeoutMs: READ_TIMEOUT_MS, signal: session.queue.signal, label: 'Read' });
  if (result.success && connectionSessions.get(targetId) === session) {
    sendToRenderer('ble:characteristicValueChanged', { deviceId: targetId, serviceUuid, characteristicUuid: charUuid, value: result.value });
  }
  return result;
});

ipcMain.handle('ble:writeCharacteristic', async (event, deviceId, serviceUuid, charUuid, data, format, withoutResponse) => {
  let buffer;
  if (format === 'utf8') buffer = Buffer.from(data, 'utf8');
  else {
    const clean = String(data).replace(/[\s-]/g, '');
    if (clean.length % 2 || !/^[0-9a-f]*$/i.test(clean)) return { success: false, error: 'Invalid hex' };
    buffer = Buffer.from(clean, 'hex');
  }
  return writeToSession(deviceId, serviceUuid, charUuid, buffer, withoutResponse);
});

// OTA and generic writes share a connection queue, including capacity and timeout.
ipcMain.handle('ble:writeRaw', async (event, deviceId, serviceUuid, charUuid, data, withoutResponse) => {
  if (!Array.isArray(data) || data.some(b => !Number.isInteger(b) || b < 0 || b > 255)) return { success: false, error: 'Invalid byte array' };
  return writeToSession(deviceId, serviceUuid, charUuid, Buffer.from(data), withoutResponse);
});

ipcMain.handle('ble:notifyCharacteristic', async (event, deviceId, serviceUuid, charUuid, notify) => {
  const targetId = deviceId || connectedPeripherals.keys().next().value;
  const session = connectionSessions.get(targetId);
  if (!session) return { success: false, error: 'No device connected' };
  const { characteristic, error } = characteristicFor(session.peripheral, serviceUuid, charUuid);
  if (error) return { success: false, error };
  const key = `${normalizeBleUuid(serviceUuid)}::${normalizeBleUuid(charUuid)}`;
  // Toggle races are serialized per characteristic, independently of devices.
  const operation = (session.notifyChanges.get(key) || Promise.resolve()).then(async () => {
    if (connectionSessions.get(targetId) !== session) return { success: false, error: 'Device disconnected' };
    let listener = session.notifyListeners.get(key);
    if (notify && listener) return { success: true };
    if (notify) {
      listener = (data, isNotification) => {
        if (isNotification === false || connectionSessions.get(targetId) !== session) return;
        const value = [...(data || [])].map(b => b.toString(16).padStart(2, '0')).join(' ');
        sendToRenderer('ble:characteristicValueChanged', { deviceId: targetId, serviceUuid, characteristicUuid: charUuid, value });
      };
      // Listen before enabling CCCD: the device can notify before the driver's
      // subscription acknowledgement (Smart HID status must not be lost).
      characteristic.on('data', listener);
      session.notifyListeners.set(key, listener);
    }
    const result = await callbackTransaction(done => {
      characteristic[notify ? 'subscribe' : 'unsubscribe'](error => done(error ? { success: false, error: error.message } : { success: true }));
    }, { timeoutMs: READ_TIMEOUT_MS, signal: session.queue.signal, label: 'Notify' });
    if ((notify && !result.success) || (!notify && result.success)) {
      if (listener) characteristic.removeListener('data', listener);
      session.notifyListeners.delete(key);
    }
    return result;
  });
  session.notifyChanges.set(key, operation);
  try { return await operation; }
  finally { if (session.notifyChanges.get(key) === operation) session.notifyChanges.delete(key); }
});

// T07: UUID 辅助函数（中文名称，对齐 Android BleUuids）
function getServiceName(uuid) {
  const uuidUpper = uuid.toUpperCase();
  const short = (uuidUpper.length === 4 ? uuidUpper : uuidUpper.substring(4, 8));
  const services = {
    '1800': '通用访问',
    '1801': '通用属性',
    '180A': '设备信息',
    '180F': '电池服务',
    '1812': '人机界面(HID)',
    '180D': '心率服务',
    '1809': '健康温度计',
    '181C': '用户数据',
  };
  if (uuidUpper.startsWith('4FAFC201')) {
    return 'OTA 升级服务';
  }
  return services[short] || '未知服务';
}

function getCharacteristicName(uuid) {
  const uuidUpper = uuid.toUpperCase();
  const short = (uuidUpper.length === 4 ? uuidUpper : uuidUpper.substring(4, 8));
  const characteristics = {
    '2A00': '设备名称',
    '2A01': '外观',
    '2A02': '隐私标志',
    '2A03': '重连地址',
    '2A04': '连接参数',
    '2A05': '服务变更',
    '2A19': '电池电量',
    '2A23': '系统标识符',
    '2A24': '型号',
    '2A25': '序列号',
    '2A26': '固件版本',
    '2A27': '硬件版本',
    '2A28': '软件版本',
    '2A29': '制造商',
    '2A37': '心率测量',
    '2A38': '身体传感器位置',
  };
  if (uuidUpper.startsWith('BEB5') || uuidUpper.startsWith('BEB5483E')) {
    return 'OTA 控制';
  }
  return characteristics[short] || '未知特征值';
}


function getCharacteristicProperties(props) {
  const properties = [];
  if (props.includes('read')) properties.push('read');
  if (props.includes('write')) properties.push('write');
  if (props.includes('writeWithoutResponse')) properties.push('writeWithoutResponse');
  if (props.includes('notify')) properties.push('notify');
  if (props.includes('indicate')) properties.push('indicate');
  return properties;
}

// App 事件
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 清理
app.on('before-quit', () => {
  killWinBridge();
  if (bleModule) {
    bleModule.stopScanning();
    for (const [id, session] of connectionSessions) {
      retireSession(id, session, false);
      try { session.peripheral.disconnect(); } catch (_) {}
    }
    for (const attempt of pendingConnections.values()) attempt.controller.abort();
    pendingConnections.clear();
  }
});
