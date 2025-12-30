//
// SmartBLE Desktop - Main Process
//

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// BLE 模块 (需要根据平台加载)
let bleModule = null;

// 加载平台特定的 BLE 模块
async function loadBLEModule() {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // Windows: 使用 noble-uwp
      const noble = require('noble-uwp');
      bleModule = noble;
    } else if (platform === 'darwin') {
      // macOS: 使用 @abandonware/noble
      const noble = require('@abandonware/noble');
      bleModule = noble;
    } else if (platform === 'linux') {
      // Linux: 使用 @abandonware/noble
      const noble = require('@abandonware/noble');
      bleModule = noble;
    }

    if (bleModule) {
      setupBLEEvents();
    }

    return !!bleModule;
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
      sandbox: true
    },
    title: 'SmartBLE - Desktop',
    backgroundColor: '#F2F2F7',
    show: false
  });

  // 开发模式加载本地文件，生产模式加载打包后的文件
  const isDev = process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// BLE 事件处理
function setupBLEEvents() {
  if (!bleModule) return;

  // 状态变化
  bleModule.on('stateChange', (state) => {
    sendToRenderer('ble:stateChanged', { state });
  });

  // 发现设备
  bleModule.on('discover', (peripheral) => {
    const device = {
      id: peripheral.id,
      name: peripheral.advertisement.localName || 'Unknown Device',
      rssi: peripheral.rssi,
      address: peripheral.address,
      connectionState: 'disconnected'
    };
    sendToRenderer('ble:deviceDiscovered', device);
  });

  // 连接状态变化
  bleModule.on('connect', (peripheral) => {
    sendToRenderer('ble:deviceConnected', { id: peripheral.id });
  });

  bleModule.on('disconnect', (peripheral) => {
    sendToRenderer('ble:deviceDisconnected', { id: peripheral.id });
  });
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// IPC 处理
ipcMain.handle('ble:init', async () => {
  const loaded = await loadBLEModule();
  return { success: loaded, platform: process.platform };
});

ipcMain.handle('ble:startScan', async () => {
  if (!bleModule) return { success: false, error: 'BLE module not loaded' };

  try {
    if (bleModule.state === 'poweredOn') {
      bleModule.startScanning([], true); // allowDuplicates
      return { success: true };
    } else {
      return { success: false, error: 'Bluetooth not ready' };
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
  if (!bleModule) return { success: false };

  return new Promise((resolve) => {
    const peripheral = bleModule.peripherals.find(p => p.id === deviceId);

    if (!peripheral) {
      resolve({ success: false, error: 'Device not found' });
      return;
    }

    peripheral.connect((error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('ble:disconnect', async (event, deviceId) => {
  if (!bleModule) return { success: false };

  return new Promise((resolve) => {
    const peripheral = bleModule.peripherals?.find(p => p.id === deviceId);

    if (!peripheral) {
      resolve({ success: false, error: 'Device not found' });
      return;
    }

    peripheral.disconnect((error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('ble:discoverServices', async (event, deviceId) => {
  if (!bleModule) return { success: false, services: [] };

  return new Promise((resolve) => {
    const peripheral = bleModule.peripherals?.find(p => p.id === deviceId);

    if (!peripheral) {
      resolve({ success: false, services: [] });
      return;
    }

    peripheral.discoverServices([], (error, services) => {
      if (error) {
        resolve({ success: false, services: [] });
      } else {
        const servicesData = services.map(service => ({
          uuid: service.uuid,
          name: getServiceName(service.uuid),
          characteristics: []
        }));

        // 发现特征值
        services.forEach((service, i) => {
          service.discoverCharacteristics([], (charError, characteristics) => {
            if (!charError && characteristics) {
              characteristics.forEach(char => {
                servicesData[i].characteristics.push({
                  uuid: char.uuid,
                  name: getCharacteristicName(char.uuid),
                  properties: char.properties
                });
              });

              // 发送服务更新
              sendToRenderer('ble:servicesDiscovered', {
                deviceId,
                services: servicesData
              });
            }
          });
        });

        resolve({ success: true, services: servicesData });
      }
    });
  });
});

ipcMain.handle('ble:readCharacteristic', async (event, deviceId, serviceUuid, charUuid) => {
  if (!bleModule) return { success: false };

  return new Promise((resolve) => {
    const peripheral = bleModule.peripherals?.find(p => p.id === deviceId);

    if (!peripheral) {
      resolve({ success: false, error: 'Device not found' });
      return;
    }

    const service = peripheral.services.find(s => s.uuid === serviceUuid);
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
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true, value: data?.toString('hex') || '' });
        sendToRenderer('ble:characteristicValueChanged', {
          serviceUuid,
          characteristicUuid: charUuid,
          value: data?.toString('hex') || ''
        });
      }
    });
  });
});

ipcMain.handle('ble:writeCharacteristic', async (event, deviceId, serviceUuid, charUuid, data, withoutResponse) => {
  if (!bleModule) return { success: false };

  return new Promise((resolve) => {
    const peripheral = bleModule.peripherals?.find(p => p.id === deviceId);

    if (!peripheral) {
      resolve({ success: false, error: 'Device not found' });
      return;
    }

    const service = peripheral.services?.find(s => s.uuid === serviceUuid);
    if (!service) {
      resolve({ success: false, error: 'Service not found' });
      return;
    }

    const characteristic = service.characteristics?.find(c => c.uuid === charUuid);
    if (!characteristic) {
      resolve({ success: false, error: 'Characteristic not found' });
      return;
    }

    const buffer = Buffer.from(data.replace(/\s/g, ''), 'hex');

    characteristic.write(buffer, withoutResponse, (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('ble:notifyCharacteristic', async (event, deviceId, serviceUuid, charUuid, notify) => {
  if (!bleModule) return { success: false };

  return new Promise((resolve) => {
    const peripheral = bleModule.peripherals?.find(p => p.id === deviceId);

    if (!peripheral) {
      resolve({ success: false, error: 'Device not found' });
      return;
    }

    const service = peripheral.services?.find(s => s.uuid === serviceUuid);
    if (!service) {
      resolve({ success: false, error: 'Service not found' });
      return;
    }

    const characteristic = service.characteristics?.find(c => c.uuid === charUuid);
    if (!characteristic) {
      resolve({ success: false, error: 'Characteristic not found' });
      return;
    }

    characteristic.subscribe(notify, (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

// 蓝牙权限请求 (macOS)
ipcMain.handle('ble:requestPermissions', async () => {
  // macOS 12+ 需要在 Info.plist 中声明权限
  // 这里只做检查
  return { success: true };
});

// UUID 辅助函数
function getServiceName(uuid) {
  const shortUuid = uuid.substring(4, 8);
  const services = {
    '1800': 'Generic Access',
    '1801': 'Generic Attribute',
    '180A': 'Device Information',
    '180F': 'Battery Service',
    '1812': 'HID'
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
    '2A19': 'Battery Level'
  };
  return characteristics[shortUuid] || 'Unknown Characteristic';
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

// 特征值变化监听 (在连接后设置)
function setupCharacteristicNotification(peripheral) {
  peripheral.on('servicesDiscovered', () => {
    // 处理服务发现完成
  });
}
