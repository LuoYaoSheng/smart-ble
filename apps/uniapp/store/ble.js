import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';

export const useBleStore = defineStore('ble', () => {
  // --- 状态(State) ---
  const isScanning = ref(false);
  const bleState = ref('off');
  
  // 发现的所有设备列表
  const scannedDevices = ref([]);
  
  // 已连接的设备集 (键为 deviceId)
  /**
   * {
   *   [deviceId]: {
   *     deviceId: string,
   *     name: string,
   *     RSSI: number,
   *     isConnected: boolean,
   *     services: Array,
   *     logs: Array
   *   }
   * }
   */
  const connectedDevicesMap = reactive({});
  
  // Getters
  const connectedDevicesList = computed(() => Object.values(connectedDevicesMap));

  // --- 动作(Actions) ---
  const setBleState = (state) => {
    bleState.value = state;
  };

  const addDeviceLog = (deviceId, type, message) => {
    if (!connectedDevicesMap[deviceId]) return;
    
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    if (message.includes('监听特征值')) {
      type = 'notify';
    }

    connectedDevicesMap[deviceId].logs.unshift({ time, type, message });
    if (connectedDevicesMap[deviceId].logs.length > 100) {
      connectedDevicesMap[deviceId].logs.pop();
    }
  };

  const initConnectedDevice = (device) => {
    if (!connectedDevicesMap[device.deviceId]) {
      connectedDevicesMap[device.deviceId] = {
        deviceId: device.deviceId,
        name: device.name || '未知设备',
        RSSI: device.RSSI || 0,
        isConnected: false,
        services: [],
        logs: []
      };
    }
    return connectedDevicesMap[device.deviceId];
  };

  const updateDeviceConnectionStatus = (deviceId, status) => {
    if (connectedDevicesMap[deviceId]) {
      connectedDevicesMap[deviceId].isConnected = status;
    }
  };

  const setDeviceServices = (deviceId, services) => {
    if (connectedDevicesMap[deviceId]) {
      connectedDevicesMap[deviceId].services = services;
    }
  };

  const removeConnectedDevice = (deviceId) => {
    if (connectedDevicesMap[deviceId]) {
      delete connectedDevicesMap[deviceId];
    }
  };

  // ----- 扫描相关逻辑 -----
  let scanStopTimer = null;
  let throttleTimeout = null;
  let deviceBuffer = [];
  const throttleInterval = 1000;
  
  // 转换ArrayBuffer为Hex
  const ab2hex = (buffer) => {
    if (!buffer) return '';
    const hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function(bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  };

  const processDeviceBuffer = () => {
    if (deviceBuffer.length === 0) {
      throttleTimeout = null;
      return;
    }
    
    const currentBuffer = [...deviceBuffer];
    deviceBuffer = [];
    
    // 使用 Map 去重/更新
    const deviceMap = new Map(scannedDevices.value.map(d => [d.deviceId, d]));
    
    currentBuffer.forEach(newDevice => {
      const deviceId = newDevice.deviceId;
      const advertisDataHex = ab2hex(newDevice.advertisData);
      const advertisServiceUUIDs = newDevice.advertisServiceUUIDs || [];
      
      const existingDevice = deviceMap.get(deviceId);
      let processedData;
      
      if (existingDevice) {
        processedData = {
          ...existingDevice,
          ...newDevice,
          advertisDataHex,
          advertisServiceUUIDs
        };
      } else {
        processedData = {
          ...newDevice,
          advertisDataHex,
          advertisServiceUUIDs,
          connected: false
        };
      }
      deviceMap.set(deviceId, processedData);
    });
    
    let sortedDevices = Array.from(deviceMap.values()).sort((a, b) => b.RSSI - a.RSSI);
    const displayLimit = 100;
    scannedDevices.value = sortedDevices.slice(0, displayLimit);
    
    throttleTimeout = null;
  };

  const startScan = (duration = 5000) => {
    if (isScanning.value) return;
    
    isScanning.value = true;
    scannedDevices.value = [];
    deviceBuffer = [];
    
    if (throttleTimeout) clearTimeout(throttleTimeout);
    if (scanStopTimer) clearTimeout(scanStopTimer);
    throttleTimeout = null;
    scanStopTimer = null;

    uni.openBluetoothAdapter({
      success: () => {
        uni.startBluetoothDevicesDiscovery({
          success: () => {
            uni.onBluetoothDeviceFound(res => {
              deviceBuffer.push(...res.devices);
              if (!throttleTimeout) {
                throttleTimeout = setTimeout(() => {
                  processDeviceBuffer();
                }, throttleInterval);
              }
            });
            
            scanStopTimer = setTimeout(() => {
              if (isScanning.value) {
                stopScan();
              }
            }, duration);
          },
          fail: err => {
            console.error('搜索设备失败:', err);
            isScanning.value = false;
          }
        });
      },
      fail: err => {
        console.error('初始化蓝牙适配器失败:', err);
        isScanning.value = false;
      }
    });
  };

  const stopScan = () => {
    if (scanStopTimer) {
      clearTimeout(scanStopTimer);
      scanStopTimer = null;
    }
    
    uni.stopBluetoothDevicesDiscovery({
      success: () => {
        isScanning.value = false;
        // #ifdef MP-WEIXIN
        wx.offBluetoothDeviceFound();
        // #endif
        processDeviceBuffer();
      },
      fail: err => {
        console.error('停止搜索失败:', err);
        isScanning.value = false;
      },
      complete: () => {
        isScanning.value = false;
      }
    });
  };

  const clearScannedDevices = () => {
    scannedDevices.value = [];
  };

  return {
    isScanning,
    bleState,
    scannedDevices,
    connectedDevicesMap,
    connectedDevicesList,
    setBleState,
    addDeviceLog,
    initConnectedDevice,
    updateDeviceConnectionStatus,
    setDeviceServices,
    removeConnectedDevice,
    startScan,
    stopScan,
    clearScannedDevices
  };
});
