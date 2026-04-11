//
// SmartBLE Desktop - Preload Script
//

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('bleAPI', {
  // 初始化
  init: () => ipcRenderer.invoke('ble:init'),

  // 扫描
  startScan: () => ipcRenderer.invoke('ble:startScan'),
  stopScan: () => ipcRenderer.invoke('ble:stopScan'),

  // 连接
  connect: (deviceId) => ipcRenderer.invoke('ble:connect', deviceId),
  disconnect: (deviceId) => ipcRenderer.invoke('ble:disconnect', deviceId),

  // 服务
  discoverServices: (deviceId) => ipcRenderer.invoke('ble:discoverServices', deviceId),

  // 特征值操作
  readCharacteristic: (deviceId, serviceUuid, charUuid) =>
    ipcRenderer.invoke('ble:readCharacteristic', deviceId, serviceUuid, charUuid),

  writeCharacteristic: (deviceId, serviceUuid, charUuid, data, withoutResponse) =>
    ipcRenderer.invoke('ble:writeCharacteristic', deviceId, serviceUuid, charUuid, data, withoutResponse),

  notifyCharacteristic: (deviceId, serviceUuid, charUuid, notify) =>
    ipcRenderer.invoke('ble:notifyCharacteristic', deviceId, serviceUuid, charUuid, notify),

  // 广播
  startAdvertising: (name, serviceUuids, manufacturerId, manufacturerData, includeName) =>
    ipcRenderer.invoke('ble:startAdvertising', name, serviceUuids, manufacturerId, manufacturerData, includeName),
  stopAdvertising: () =>
    ipcRenderer.invoke('ble:stopAdvertising'),

  // 事件监听
  onStateChange: (callback) => {
    const listener = (event, data) => {
      console.log('[Preload] ble:stateChanged received:', data);
      callback(data);
    };
    ipcRenderer.on('ble:stateChanged', listener);
    console.log('[Preload] onStateChange listener registered');
    return () => ipcRenderer.removeListener('ble:stateChanged', listener);
  },

  onDeviceDiscovered: (callback) => {
    const listener = (event, device) => callback(device);
    ipcRenderer.on('ble:deviceDiscovered', listener);
    return () => ipcRenderer.removeListener('ble:deviceDiscovered', listener);
  },

  onDeviceConnected: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ble:deviceConnected', listener);
    return () => ipcRenderer.removeListener('ble:deviceConnected', listener);
  },

  onDeviceDisconnected: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ble:deviceDisconnected', listener);
    return () => ipcRenderer.removeListener('ble:deviceDisconnected', listener);
  },

  onServicesDiscovered: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ble:servicesDiscovered', listener);
    return () => ipcRenderer.removeListener('ble:servicesDiscovered', listener);
  },

  onCharacteristicValueChanged: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ble:characteristicValueChanged', listener);
    return () => ipcRenderer.removeListener('ble:characteristicValueChanged', listener);
  },

  onWarning: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ble:warning', listener);
    return () => ipcRenderer.removeListener('ble:warning', listener);
  }
});

// 暴露平台信息
contextBridge.exposeInMainWorld('platform', {
  platform: process.platform,
  arch: process.arch
});
