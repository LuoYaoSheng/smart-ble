//
// SmartBLE Desktop - Main Process
// Multi-device concurrent connection support
//

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Debug logging to file
const debugLogPath = '/tmp/electron-main-debug.log';
function debugLog(...args) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
  fs.appendFileSync(debugLogPath, new Date().toISOString() + ' ' + msg + '\n');
  console.log(...args);
}
debugLog('=== Electron Main Process Started ===');

let mainWindow = null;
let bleModule = null;

// 存储发现的设备
const discoveredDevices = new Map();
// 多设备并发连接 (deviceId -> peripheral)
const connectedPeripherals = new Map();

// 加载 BLE 模块
let bleModuleLoaded = false;

async function loadBLEModule() {
  const platform = process.platform;

  // 如果已经加载过，直接返回
  if (bleModuleLoaded) {
    debugLog('BLE module already loaded');
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

    // 主动发送当前状态
    debugLog('Sending initial state:', bleModule.state, 'to renderer');
    sendToRenderer('ble:stateChanged', { state: bleModule.state });

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
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false // 需要禁用沙箱以使用 BLE
    },
    title: 'SmartBLE - Desktop',
    backgroundColor: '#F2F2F7',
    show: false
  });

  const isDev = process.argv.includes('--dev');

  mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    debugLog('Window ready to show');
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// BLE 事件设置
function setupBLEEvents() {
  debugLog('Setting up BLE events');

  // 状态变化监听
  bleModule.on('stateChange', (state) => {
    debugLog('BLE State changed:', state);
    sendToRenderer('ble:stateChanged', { state });
  });

  // 发现设备
  bleModule.on('discover', (peripheral) => {
    // 存储设备（如果不存在或者需要更新）
    const existing = discoveredDevices.get(peripheral.id);
    if (!existing || peripheral.rssi !== existing.rssi) {
      discoveredDevices.set(peripheral.id, peripheral);
    }

    const adv = peripheral.advertisement || {};

    // 解析广播数据
    const device = {
      id: peripheral.id,
      name: adv.localName || '未知设备',
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
ipcMain.handle('ble:init', async () => {
  debugLog('IPC: ble:init called');
  const loaded = await loadBLEModule();
  debugLog('IPC: ble:init result:', loaded);
  return { success: loaded, platform: process.platform };
});

ipcMain.handle('ble:startScan', async () => {
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

ipcMain.handle('ble:startAdvertising', async (event, name, serviceUuids) => {
  // 检查平台支持
  if (process.platform !== 'linux') {
    return { success: false, error: `Advertising is not supported on ${process.platform}. Only Linux with bleno supports peripheral mode.` };
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

    debugLog('Starting advertising:', name, serviceUuids);

    // 创建广播服务
    const uuid = serviceUuids && serviceUuids.length > 0 ? serviceUuids[0] : 'FFF0';
    advertisingService = {
      uuid: uuid,
      characteristics: []
    };

    // 开始广播
    await new Promise((resolve, reject) => {
      bleModule.startAdvertising({
        name: name || 'SmartBLE',
        serviceUuids: [uuid]
      }, (error) => {
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

  return new Promise((resolve) => {
    const peripheral = getDevice(deviceId);

    if (!peripheral) {
      resolve({ success: false, error: 'Device not found' });
      return;
    }

    // 停止扫描
    bleModule.stopScanning();

    // 设置连接回调
    const onConnect = async (error) => {
      peripheral.removeListener('connect', onConnect);

      if (error) {
        console.error('Connection error:', error);
        resolve({ success: false, error: error.message });
      } else {
        // 存入多设备 Map
        connectedPeripherals.set(deviceId, peripheral);
        debugLog('Connected to:', peripheral.id);

        // 连接后先更新 peripheral 的状态，确保 noble 内部状态正确
        // 小延迟后再发送连接成功事件
        await new Promise(r => setTimeout(r, 200));

        sendToRenderer('ble:deviceConnected', { id: peripheral.id });
        resolve({ success: true });
      }
    };

    peripheral.once('connect', onConnect);
    peripheral.connect();
  });
});

ipcMain.handle('ble:disconnect', async (event, deviceId) => {
  if (!bleModule) return { success: false };

  return new Promise((resolve) => {
    // If no deviceId provided, disconnect first connected device
    let targetId = deviceId;
    if (!targetId && connectedPeripherals.size > 0) {
      targetId = connectedPeripherals.keys().next().value;
    }

    const peripheral = targetId ? connectedPeripherals.get(targetId) : null;
    if (!peripheral) {
      resolve({ success: true });
      return;
    }

    connectedPeripherals.delete(targetId);

    const onDisconnect = (error) => {
      peripheral.removeListener('disconnect', onDisconnect);
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        sendToRenderer('ble:deviceDisconnected', { id: peripheral.id });
        resolve({ success: true });
      }
    };

    peripheral.once('disconnect', onDisconnect);
    peripheral.disconnect();
  });
});

ipcMain.handle('ble:discoverServices', async (event, deviceId) => {
  // Look up from multi-device Map
  const targetPeripheral = deviceId ? connectedPeripherals.get(deviceId) : connectedPeripherals.values().next().value;

  if (!targetPeripheral) {
    debugLog('No peripheral connected for service discovery');
    return { success: false, services: [] };
  }

  debugLog('Starting service discovery for:', targetPeripheral.id);

  return new Promise((resolve) => {
    const peripheral = targetPeripheral;

    // 设置超时
    const timeout = setTimeout(() => {
      debugLog('Service discovery timeout');
      resolve({ success: false, services: [], error: 'Timeout discovering services' });
    }, 30000);

    // 直接使用回调方式
    const discoverWithCallback = () => {
      try {
        debugLog('Calling peripheral.discoverServices() with callback');
        peripheral.discoverServices([], async (error, services) => {
          clearTimeout(timeout);

          if (error) {
            debugLog('Service discovery error:', error);
            resolve({ success: false, services: [], error: error.message });
            return;
          }

          debugLog('Discovered', services?.length || 0, 'services');

          if (!services || services.length === 0) {
            debugLog('No services found');
            sendToRenderer('ble:servicesDiscovered', {
              deviceId: peripheral.id,
              services: []
            });
            resolve({ success: true, services: [] });
            return;
          }

          // 立即发送服务列表（不含特征值）
          const servicesData = services.map(service => ({
            uuid: service.uuid,
            name: getServiceName(service.uuid),
            characteristics: []
          }));

          // 保存服务引用
          if (!peripheral.services) {
            peripheral.services = [];
          }

          // 发送初始服务列表
          sendToRenderer('ble:servicesDiscovered', {
            deviceId: peripheral.id,
            services: servicesData
          });

          // 异步发现特征值
          for (let i = 0; i < services.length; i++) {
            const service = services[i];
            try {
              const characteristics = await discoverCharacteristics(service);
              debugLog('Service', service.uuid, 'has', characteristics.length, 'characteristics');

              // 更新服务数据
              const charData = characteristics.map(char => ({
                uuid: char.uuid,
                name: getCharacteristicName(char.uuid),
                properties: getCharacteristicProperties(char.properties)
              }));

              servicesData[i].characteristics = charData;
              service.characteristics = characteristics;
              peripheral.services.push(service);

              // 发送更新后的服务列表
              sendToRenderer('ble:servicesDiscovered', {
                deviceId: peripheral.id,
                services: [...servicesData] // 创建副本
              });
            } catch (charError) {
              debugLog('Characteristic discovery error for service', service.uuid, ':', charError);
            }
          }

          debugLog('Service discovery completed, total services:', servicesData.length);
          resolve({ success: true, services: servicesData });
        });
      } catch (e) {
        clearTimeout(timeout);
        debugLog('discoverServices() exception:', e);
        resolve({ success: false, services: [], error: e.message });
      }
    };

    // 延迟调用，确保连接稳定
    setTimeout(discoverWithCallback, 500);
  });
});

// 辅助函数：发现特征值
function discoverCharacteristics(service) {
  return new Promise((resolve) => {
    // 检查服务是否已有特征值（noble 有时会自动填充）
    if (service.characteristics && Array.isArray(service.characteristics) && service.characteristics.length > 0) {
      debugLog('Service', service.uuid, 'already has', service.characteristics.length, 'characteristics');
      resolve(service.characteristics);
      return;
    }

    const timeout = setTimeout(() => {
      debugLog('Characteristic discovery timeout for service:', service.uuid);
      resolve([]); // 超时返回空数组
    }, 5000); // 5秒超时

    try {
      // 使用空数组发现所有特征值
      service.discoverCharacteristics([], (error, characteristics) => {
        clearTimeout(timeout);
        if (error) {
          debugLog('Characteristic discovery error for service', service.uuid, ':', error.message || error);
          resolve([]);
        } else {
          const chars = characteristics || [];
          debugLog('Discovered', chars.length, 'characteristics for service:', service.uuid);
          resolve(chars);
        }
      });
    } catch (e) {
      clearTimeout(timeout);
      debugLog('discoverCharacteristics exception:', e.message || e);
      resolve([]);
    }
  });
}

ipcMain.handle('ble:readCharacteristic', async (event, deviceId, serviceUuid, charUuid) => {
  const targetPeripheral = deviceId ? connectedPeripherals.get(deviceId) : connectedPeripherals.values().next().value;

  if (!targetPeripheral) {
    return { success: false, error: 'No device connected' };
  }

  return new Promise((resolve) => {
    const service = targetPeripheral.services.find(s => s.uuid === serviceUuid);
    if (!service) {
      resolve({ success: false, error: 'Service not found' });
      return;
    }

    const characteristic = service.characteristics.find(c => c.uuid === charUuid);
    if (!characteristic) {
      resolve({ success: false, error: 'Characteristic not found' });
      return;
    }

    characteristic.read((error, data) => {
      if (error) {
        console.error('Read error:', error);
        resolve({ success: false, error: error.message });
      } else {
        const hexValue = data ? data.toString('hex').match(/.{2}/g).join(' ') : '';
        console.log('Read result:', hexValue);

        sendToRenderer('ble:characteristicValueChanged', {
          deviceId: targetPeripheral.id,
          serviceUuid,
          characteristicUuid: charUuid,
          value: hexValue
        });

        resolve({ success: true, value: hexValue });
      }
    });
  });
});

ipcMain.handle('ble:writeCharacteristic', async (event, deviceId, serviceUuid, charUuid, data, withoutResponse) => {
  const targetPeripheral = deviceId ? connectedPeripherals.get(deviceId) : connectedPeripherals.values().next().value;

  if (!targetPeripheral) {
    return { success: false, error: 'No device connected' };
  }

  return new Promise((resolve) => {
    const service = targetPeripheral.services.find(s => s.uuid === serviceUuid);
    if (!service) {
      resolve({ success: false, error: 'Service not found' });
      return;
    }

    const characteristic = service.characteristics.find(c => c.uuid === charUuid);
    if (!characteristic) {
      resolve({ success: false, error: 'Characteristic not found' });
      return;
    }

    const buffer = Buffer.from(data.replace(/\s/g, ''), 'hex');
    console.log('Writing:', data);

    characteristic.write(buffer, withoutResponse, (error) => {
      if (error) {
        console.error('Write error:', error);
        resolve({ success: false, error: error.message });
      } else {
        console.log('Write success');
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('ble:notifyCharacteristic', async (event, deviceId, serviceUuid, charUuid, notify) => {
  const targetPeripheral = deviceId ? connectedPeripherals.get(deviceId) : connectedPeripherals.values().next().value;

  if (!targetPeripheral) {
    return { success: false, error: 'No device connected' };
  }

  return new Promise((resolve) => {
    const service = targetPeripheral.services.find(s => s.uuid === serviceUuid);
    if (!service) {
      resolve({ success: false, error: 'Service not found' });
      return;
    }

    const characteristic = service.characteristics.find(c => c.uuid === charUuid);
    if (!characteristic) {
      resolve({ success: false, error: 'Characteristic not found' });
      return;
    }

    // 移除旧的监听器
    characteristic.removeAllListeners('data');

    // 如果启用通知，添加数据监听
    if (notify) {
      characteristic.on('data', (data) => {
        const hexValue = data.toString('hex').match(/.{2}/g).join(' ');
        console.log('Notification received:', hexValue);

        sendToRenderer('ble:characteristicValueChanged', {
          deviceId: targetPeripheral.id,
          serviceUuid,
          characteristicUuid: charUuid,
          value: hexValue
        });
      });
    }

    characteristic.subscribe(notify, (error) => {
      if (error) {
        console.error('Notify error:', error);
        resolve({ success: false, error: error.message });
      } else {
        console.log('Notify set to:', notify);
        resolve({ success: true });
      }
    });
  });
});

// UUID 辅助函数
function getServiceName(uuid) {
  const shortUuid = uuid.substring(4, 8);
  const services = {
    '1800': 'Generic Access',
    '1801': 'Generic Attribute',
    '180A': 'Device Information',
    '180F': 'Battery Service',
    '1812': 'HID',
    '180D': 'Device Information',
    '181C': 'User Data'
  };
  return services[shortUuid] || 'Unknown Service';
}

function getCharacteristicName(uuid) {
  const shortUuid = uuid.substring(4, 8);
  const characteristics = {
    '2A00': 'Device Name',
    '2A01': 'Appearance',
    '2A29': 'Manufacturer Name',
    '2A24': 'Model Number',
    '2A25': 'Serial Number',
    '2A27': 'Hardware Revision',
    '2A26': 'Firmware Revision',
    '2A28': 'Software Revision',
    '2A19': 'Battery Level',
    '2A04': 'PPP Central',
    '2A05': 'PPP Peripheral'
  };
  return characteristics[shortUuid] || 'Unknown Characteristic';
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
  if (bleModule) {
    bleModule.stopScanning();
    // Disconnect all connected devices
    for (const [id, peripheral] of connectedPeripherals) {
      peripheral.disconnect();
    }
    connectedPeripherals.clear();
  }
});
