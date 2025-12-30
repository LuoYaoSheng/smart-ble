//
// SmartBLE Desktop - Main Process
//

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let bleModule = null;

// 存储发现的设备
const discoveredDevices = new Map();
// 当前连接的设备
let connectedPeripheral = null;

// 加载 BLE 模块
async function loadBLEModule() {
  const platform = process.platform;

  try {
    const noble = require('@abandonware/noble');
    bleModule = noble;

    if (bleModule) {
      setupBLEEvents();
    }

    return true;
  } catch (error) {
    console.error('Failed to load BLE module:', error.message);
    return false;
  }
}

// 创建主窗口
function createWindow() {
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
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// BLE 事件设置
function setupBLEEvents() {
  // 状态变化 - 立即发送当前状态
  const sendState = (state) => {
    console.log('BLE State:', state);
    sendToRenderer('ble:stateChanged', { state });
  };

  // 监听状态变化
  bleModule.on('stateChange', sendState);

  // 立即发送当前状态（避免错过初始状态）
  if (bleModule.state) {
    setTimeout(() => sendState(bleModule.state), 100);
  }

  // 发现设备
  bleModule.on('discover', (peripheral) => {
    // 存储设备
    if (!discoveredDevices.has(peripheral.id)) {
      discoveredDevices.set(peripheral.id, peripheral);
    }

    const device = {
      id: peripheral.id,
      name: peripheral.advertisement.localName || '未知设备',
      rssi: peripheral.rssi,
      address: peripheral.address,
      connectionState: peripheral.state === 'connected' ? 'connected' : 'disconnected'
    };

    sendToRenderer('ble:deviceDiscovered', device);
  });

  // 连接警告处理
  bleModule.on('warning', (message) => {
    console.log('BLE Warning:', message);
    sendToRenderer('ble:warning', { message });
  });
}

// 发送消息到渲染进程
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// 获取存储的设备
function getDevice(deviceId) {
  return discoveredDevices.get(deviceId);
}

// IPC 处理器
ipcMain.handle('ble:init', async () => {
  const loaded = await loadBLEModule();

  // 等待一小段时间确保 noble 状态已初始化
  await new Promise(resolve => setTimeout(resolve, 200));

  // 发送当前状态
  if (bleModule && bleModule.state) {
    sendToRenderer('ble:stateChanged', { state: bleModule.state });
  }

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
    const onConnect = (error) => {
      peripheral.removeListener('connect', onConnect);

      if (error) {
        console.error('Connection error:', error);
        resolve({ success: false, error: error.message });
      } else {
        connectedPeripheral = peripheral;
        console.log('Connected to:', peripheral.id);
        sendToRenderer('ble:deviceConnected', { id: peripheral.id });
        resolve({ success: true });
      }
    };

    peripheral.once('connect', onConnect);
    peripheral.connect();
  });
});

ipcMain.handle('ble:disconnect', async () => {
  if (!bleModule) return { success: false };

  return new Promise((resolve) => {
    if (!connectedPeripheral) {
      resolve({ success: true });
      return;
    }

    const peripheral = connectedPeripheral;
    connectedPeripheral = null;

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

ipcMain.handle('ble:discoverServices', async (event) => {
  if (!connectedPeripheral) {
    return { success: false, services: [] };
  }

  return new Promise((resolve) => {
    const peripheral = connectedPeripheral;

    const onServicesDiscovered = async (error, services) => {
      peripheral.removeListener('servicesDiscovered', onServicesDiscovered);

      if (error) {
        console.error('Service discovery error:', error);
        resolve({ success: false, services: [] });
        return;
      }

      console.log('Discovered', services.length, 'services');

      const servicesData = [];

      for (const service of services) {
        const serviceData = {
          uuid: service.uuid,
          name: getServiceName(service.uuid),
          characteristics: []
        };

        // 发现特征值
        try {
          const characteristics = await discoverCharacteristics(service);

          for (const char of characteristics) {
            serviceData.characteristics.push({
              uuid: char.uuid,
              name: getCharacteristicName(char.uuid),
              properties: getCharacteristicProperties(char.properties)
            });
          }
        } catch (charError) {
          console.error('Characteristic discovery error:', charError);
        }

        servicesData.push(serviceData);
      }

      sendToRenderer('ble:servicesDiscovered', {
        deviceId: peripheral.id,
        services: servicesData
      });

      resolve({ success: true, services: servicesData });
    };

    peripheral.once('servicesDiscovered', onServicesDiscovered);
    peripheral.discoverServices();
  });
});

// 辅助函数：发现特征值
function discoverCharacteristics(service) {
  return new Promise((resolve, reject) => {
    service.discoverCharacteristics((error, characteristics) => {
      if (error) {
        reject(error);
      } else {
        resolve(characteristics || []);
      }
    });
  });
}

ipcMain.handle('ble:readCharacteristic', async (event, serviceUuid, charUuid) => {
  if (!connectedPeripheral) {
    return { success: false, error: 'No device connected' };
  }

  return new Promise((resolve) => {
    const service = connectedPeripheral.services.find(s => s.uuid === serviceUuid);
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
          serviceUuid,
          characteristicUuid: charUuid,
          value: hexValue
        });

        resolve({ success: true, value: hexValue });
      }
    });
  });
});

ipcMain.handle('ble:writeCharacteristic', async (event, serviceUuid, charUuid, data, withoutResponse) => {
  if (!connectedPeripheral) {
    return { success: false, error: 'No device connected' };
  }

  return new Promise((resolve) => {
    const service = connectedPeripheral.services.find(s => s.uuid === serviceUuid);
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

ipcMain.handle('ble:notifyCharacteristic', async (event, serviceUuid, charUuid, notify) => {
  if (!connectedPeripheral) {
    return { success: false, error: 'No device connected' };
  }

  return new Promise((resolve) => {
    const service = connectedPeripheral.services.find(s => s.uuid === serviceUuid);
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
  loadBLEModule();

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
    if (connectedPeripheral) {
      connectedPeripheral.disconnect();
    }
  }
});
