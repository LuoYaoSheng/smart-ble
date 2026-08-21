import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { logger } from '../../../core/ble-core/utils/logger';
import {
  onDiscovery,
  openAdapter,
  startDiscovery as runtimeStartDiscovery,
  stopDiscovery as runtimeStopDiscovery
} from '../services/ble-runtime/index.js';

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
    if (message.includes('监听特征值')) {
      type = 'notify';
    }

    switch(type) {
      case '错误': logger.error(message, deviceId); break;
      case '成功': logger.success(message, deviceId); break;
      case '接收': logger.receive(message, deviceId); break;
      case '写入': logger.send(message, deviceId); break;
      default: logger.info(message, deviceId); break; // type is passed visually in UI, fallback to info
    }
  };

  const initConnectedDevice = (device) => {
    if (!connectedDevicesMap[device.deviceId]) {
      connectedDevicesMap[device.deviceId] = {
        deviceId: device.deviceId,
        name: device.name || '未知设备',
        RSSI: device.RSSI || 0,
        isConnected: false,
        services: []
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
  let stopDiscoveryListener = null;
  let scanCompletion = Promise.resolve([]);
  let resolveScanCompletion = null;
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

  const _openAdapterWithRetry = (retryCount = 0, maxRetries = 3) => {
    return openAdapter().catch((err) => {
      if (retryCount >= maxRetries) throw err;
      const delay = Math.pow(2, retryCount) * 1000;
      console.warn(`蓝牙适配器初始化失败，${delay}ms 后尝试重试... (${retryCount + 1}/${maxRetries})`);
      return new Promise((resolve) => setTimeout(resolve, delay))
        .then(() => _openAdapterWithRetry(retryCount + 1, maxRetries));
    });
  };

  const startScan = async (duration = 5000) => {
    if (isScanning.value) return;
    
    isScanning.value = true;
    scannedDevices.value = [];
    deviceBuffer = [];
    
    if (throttleTimeout) clearTimeout(throttleTimeout);
    if (scanStopTimer) clearTimeout(scanStopTimer);
    throttleTimeout = null;
    scanStopTimer = null;
    scanCompletion = new Promise((resolve) => { resolveScanCompletion = resolve; });

    try {
      await _openAdapterWithRetry();
      if (!stopDiscoveryListener) {
        stopDiscoveryListener = onDiscovery((devices) => {
          deviceBuffer.push(...devices);
          if (!throttleTimeout) {
            throttleTimeout = setTimeout(processDeviceBuffer, throttleInterval);
          }
        });
      }
      await runtimeStartDiscovery();
      scanStopTimer = setTimeout(() => {
        if (isScanning.value) stopScan();
      }, duration);
    } catch (err) {
      console.error('初始化蓝牙适配器失败:', err);
      isScanning.value = false;
      resolveScanCompletion?.(scannedDevices.value);
      resolveScanCompletion = null;
      return scannedDevices.value;
    }
  };

  const stopScan = async () => {
    if (scanStopTimer) {
      clearTimeout(scanStopTimer);
      scanStopTimer = null;
    }
    
    try {
      await runtimeStopDiscovery();
    } catch (err) {
      console.error('停止搜索失败:', err);
    } finally {
      isScanning.value = false;
      processDeviceBuffer();
      resolveScanCompletion?.(scannedDevices.value);
      resolveScanCompletion = null;
    }
  };

  const waitForScanComplete = () => scanCompletion;

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
    waitForScanComplete,
    clearScannedDevices
  };
});
