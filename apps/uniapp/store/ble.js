import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { logger } from '../../../core/ble-core/utils/logger';
import {
  onDiscovery,
  onAdapterState,
  openAdapter,
  closeDevice as runtimeCloseDevice,
  startDiscovery as runtimeStartDiscovery,
  stopDiscovery as runtimeStopDiscovery
} from '../services/ble-runtime/index.js';
import { createScanSessionController } from '../services/ble-runtime/scan-session.js';
import { normalizeAdvertisement } from '../services/ble-runtime/advertisement.js';
import { mergeDeviceCollection } from '../services/ble-runtime/device-collection.js';
import { createConnectedSessionRegistry } from '../services/connected-session-registry.js';

export const useBleStore = defineStore('ble', () => {
  // --- 状态(State) ---
  const isScanning = ref(false);
  const scanState = ref('idle'); // idle | starting | scanning | stopping | failed
  const scanError = ref(null);
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
  const connectedDevicesList = computed(() => Object.values(connectedDevicesMap).filter((device) => device.isConnected));

  const syncScannedDeviceConnectionStatus = (deviceId, status) => {
    const next = scannedDevices.value.map((device) =>
      device.deviceId === deviceId ? { ...device, connected: status } : device
    );
    scannedDevices.value = next;
  };

  // --- 动作(Actions) ---
  const setBleState = (state) => {
    bleState.value = state;
  };

  onAdapterState((res) => setBleState(res?.available ? 'on' : 'off'));

  const addDeviceLog = (deviceId, type, message) => {
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
    syncScannedDeviceConnectionStatus(deviceId, status);
  };

  const runtimeSessions = createConnectedSessionRegistry({
    onDisconnect: ({ deviceId }) => updateDeviceConnectionStatus(deviceId, false)
  });

  const clearRuntimeSessionBinding = (deviceId) => runtimeSessions.remove(deviceId);

  const setDeviceServices = (deviceId, services) => {
    if (connectedDevicesMap[deviceId]) {
      connectedDevicesMap[deviceId].services = services;
    }
  };

  const removeConnectedDevice = (deviceId) => {
    if (connectedDevicesMap[deviceId]) {
      delete connectedDevicesMap[deviceId];
    }
    clearRuntimeSessionBinding(deviceId);
    syncScannedDeviceConnectionStatus(deviceId, false);
  };

  const bindConnectedSession = (device, session, services = session?.services || []) => {
    if (!device?.deviceId || !session) return;

    initConnectedDevice(device);

    runtimeSessions.bind(device.deviceId, session);

    setDeviceServices(device.deviceId, services);
    updateDeviceConnectionStatus(device.deviceId, true);
  };

  const getRuntimeSession = (deviceId) => runtimeSessions.get(deviceId);

  const disconnectConnectedDevice = async (deviceId, options = {}) => {
    const { remove = false } = options;
    await runtimeCloseDevice(deviceId);
    if (remove) {
      removeConnectedDevice(deviceId);
      return;
    }
    updateDeviceConnectionStatus(deviceId, false);
  };

  // ----- 扫描相关逻辑 -----
  let throttleTimeout = null;
  let deviceBuffer = [];
  let stopDiscoveryListener = null;
  let scanCompletion = Promise.resolve([]);
  const throttleInterval = 1000;
  
  const processDeviceBuffer = () => {
    if (deviceBuffer.length === 0) {
      throttleTimeout = null;
      return;
    }
    
    const currentBuffer = [...deviceBuffer];
    deviceBuffer = [];
    
    const normalizedDevices = currentBuffer.map((newDevice) => {
      const advertisement = normalizeAdvertisement(newDevice);
      return {
        ...newDevice,
        advertisement,
        advertisDataHex: advertisement.advertisData.hex,
        advertisServiceUUIDs: advertisement.serviceUUIDs
      };
    });

    const connectionStates = Object.fromEntries(
      Object.entries(connectedDevicesMap).map(([deviceId, device]) => [deviceId, device.isConnected])
    );
    scannedDevices.value = mergeDeviceCollection(scannedDevices.value, normalizedDevices, { connectionStates });
    
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

  const scanController = createScanSessionController({
    open: _openAdapterWithRetry,
    start: runtimeStartDiscovery,
    stop: runtimeStopDiscovery,
    onState: (state, session, error) => {
      scanState.value = state;
      isScanning.value = state === 'starting' || state === 'scanning' || state === 'stopping';
      if (state === 'starting') {
        scanError.value = null;
        scannedDevices.value = [];
        deviceBuffer = [];
        if (throttleTimeout) clearTimeout(throttleTimeout);
        throttleTimeout = null;
      }
      if (error) {
        scanError.value = {
          code: error?.errCode ?? error?.code ?? 'scan_failed',
          message: error?.errMsg || error?.message || '扫描失败',
          sessionId: session.id
        };
      }
    },
    onBeforeFinish: () => processDeviceBuffer()
  });

  if (!stopDiscoveryListener) {
    stopDiscoveryListener = onDiscovery((devices) => {
      deviceBuffer.push(...devices);
      if (!throttleTimeout) throttleTimeout = setTimeout(processDeviceBuffer, throttleInterval);
    });
  }

  const startScan = (duration = 5000, owner = 'generic') => {
    scanCompletion = scanController.start({ owner, duration, discovery: { allowDuplicatesKey: true, interval: 0 } });
    return scanCompletion;
  };

  const stopScan = (reason = 'user') => scanController.stop(reason);

  const waitForScanComplete = () => scanCompletion;

  const clearScannedDevices = () => {
    scannedDevices.value = [];
  };

  return {
    isScanning,
    scanState,
    scanError,
    bleState,
    scannedDevices,
    connectedDevicesMap,
    connectedDevicesList,
    bindConnectedSession,
    getRuntimeSession,
    disconnectConnectedDevice,
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
