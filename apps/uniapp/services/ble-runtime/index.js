/**
 * BLE Runtime：uni-app 全局 BLE 回调的唯一所有者。
 *
 * 页面、通用调试器和设备 Profile 都只能经由这里读写/订阅特征，避免全局
 * uni.onBLECharacteristicValueChange 被多个页面覆盖。
 */

import { getBlePlatform, resetBlePlatformForTesting, setBlePlatformForTesting as setPlatform } from './platform.js';

const state = {
  platform: null,
  callbacksRegistered: false,
  sessions: new Map(),
  valueListeners: new Map(),
  disconnectListeners: new Map(),
  pendingLocalDisconnects: new Map(),
  discoveryListeners: new Set()
};

const normalize = (value) => String(value || '').toLowerCase();
const valueKey = (deviceId, serviceId, characteristicId) => [deviceId, serviceId, characteristicId].map(normalize).join('|');
const serviceKey = (deviceId, serviceId) => [deviceId, serviceId].map(normalize).join('|');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function call(platform, method, options = {}) {
  return new Promise((resolve, reject) => {
    const api = platform?.[method];
    if (typeof api !== 'function') {
      reject(new Error(`BLE platform does not implement ${method}`));
      return;
    }
    api.call(platform, {
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

function ensureCallbacks() {
  const platform = getBlePlatform();
  if (state.callbacksRegistered && state.platform === platform) return platform;
  if (state.callbacksRegistered && state.platform !== platform && state.sessions.size) {
    throw new Error('BLE platform cannot change while sessions are active');
  }

  platform.onBLECharacteristicValueChange((res) => {
    const callbacks = state.valueListeners.get(valueKey(res.deviceId, res.serviceId, res.characteristicId));
    if (!callbacks) return;
    for (const callback of [...callbacks]) {
      try {
        callback(res.value, res);
      } catch (error) {
        console.error('[ble-runtime] characteristic callback failed', error);
      }
    }
  });

  platform.onBLEConnectionStateChange((res) => {
    if (res.connected !== false) return;
    const pending = state.pendingLocalDisconnects.get(res.deviceId) || 0;
    if (pending > 0) {
      state.pendingLocalDisconnects.set(res.deviceId, pending - 1);
      return;
    }
    const session = state.sessions.get(res.deviceId);
    if (!session) return;
    invalidateSession(session, 'BLE 连接已断开');
  });

  platform.onBluetoothDeviceFound((res) => {
    for (const callback of [...state.discoveryListeners]) {
      try {
        callback(res.devices || []);
      } catch (error) {
        console.error('[ble-runtime] discovery callback failed', error);
      }
    }
  });

  state.platform = platform;
  state.callbacksRegistered = true;
  return platform;
}

function invalidateSession(session, reason) {
  if (session.dead) return;
  session.dead = true;
  state.sessions.delete(session.deviceId);
  for (const callback of [...session.disconnectCallbacks]) {
    try {
      callback(reason);
    } catch (error) {
      console.error('[ble-runtime] disconnect callback failed', error);
    }
  }
  session.disconnectCallbacks.clear();
  for (const cleanup of [...session.cleanups]) cleanup();
  session.cleanups.clear();
}

function addValueListener(session, serviceId, characteristicId, callback) {
  if (typeof callback !== 'function') throw new Error('BLE value callback must be a function');
  const key = valueKey(session.deviceId, serviceId, characteristicId);
  let callbacks = state.valueListeners.get(key);
  if (!callbacks) {
    callbacks = new Set();
    state.valueListeners.set(key, callbacks);
  }
  callbacks.add(callback);
  const cleanup = () => {
    const active = state.valueListeners.get(key);
    if (!active) return;
    active.delete(callback);
    if (!active.size) state.valueListeners.delete(key);
  };
  session.cleanups.add(cleanup);
  return () => {
    session.cleanups.delete(cleanup);
    cleanup();
  };
}

function charFor(session, serviceId, characteristicId) {
  const service = session.servicesById.get(normalize(serviceId));
  const characteristic = service?.characteristicsById.get(normalize(characteristicId));
  if (!characteristic) throw new Error(`characteristic not found: ${characteristicId}`);
  return { serviceId: service.uuid, characteristicId: characteristic.uuid };
}

async function discoverServices(platform, deviceId) {
  const response = await call(platform, 'getBLEDeviceServices', { deviceId });
  const services = [];
  for (const service of response.services || []) {
    const chars = await call(platform, 'getBLEDeviceCharacteristics', { deviceId, serviceId: service.uuid });
    services.push({
      ...service,
      characteristics: (chars.characteristics || []).map((characteristic) => ({ ...characteristic, notifying: false }))
    });
  }
  return services;
}

function indexServices(services) {
  const byId = new Map();
  for (const service of services) {
    byId.set(normalize(service.uuid), {
      ...service,
      characteristicsById: new Map((service.characteristics || []).map((characteristic) => [normalize(characteristic.uuid), characteristic]))
    });
  }
  return byId;
}

export async function connectDevice(deviceId, options = {}) {
  const platform = ensureCallbacks();
  const existing = state.sessions.get(deviceId);
  if (existing && !existing.dead) return existing;

  await call(platform, 'createBLEConnection', { deviceId, timeout: options.timeout || 10000 });
  let services = [];
  const expectedServiceUuid = normalize(options.expectedServiceUuid);
  const discoveryAttempts = expectedServiceUuid ? 3 : 1;
  for (let attempt = 0; attempt < discoveryAttempts; attempt++) {
    if (attempt > 0) await sleep(400);
    services = options.discover === false ? [] : await discoverServices(platform, deviceId);
    if (!expectedServiceUuid || services.some((service) => normalize(service.uuid) === expectedServiceUuid)) break;
  }
  const session = {
    deviceId,
    services,
    servicesById: indexServices(services),
    mtu: 23,
    dead: false,
    disconnectCallbacks: new Set(),
    cleanups: new Set(),
    onDisconnect(callback) {
      if (typeof callback !== 'function') throw new Error('disconnect callback must be a function');
      this.disconnectCallbacks.add(callback);
      return () => this.disconnectCallbacks.delete(callback);
    },
    async close() {
      if (this.dead) return;
      state.pendingLocalDisconnects.set(this.deviceId, (state.pendingLocalDisconnects.get(this.deviceId) || 0) + 1);
      invalidateSession(this, 'BLE 连接已主动关闭');
      await call(platform, 'closeBLEConnection', { deviceId: this.deviceId }).catch(() => {});
    }
  };
  state.sessions.set(deviceId, session);

  if (options.mtu) {
    try {
      const mtu = await call(platform, 'setBLEMTU', { deviceId, mtu: options.mtu });
      session.mtu = Number(mtu?.mtu || options.mtu);
    } catch {
      session.mtu = 23;
    }
  }
  return session;
}

export function onDiscovery(callback) {
  if (typeof callback !== 'function') throw new Error('discovery callback must be a function');
  ensureCallbacks();
  state.discoveryListeners.add(callback);
  return () => state.discoveryListeners.delete(callback);
}

export async function openAdapter() {
  return call(ensureCallbacks(), 'openBluetoothAdapter');
}

export async function startDiscovery(options = {}) {
  return call(ensureCallbacks(), 'startBluetoothDevicesDiscovery', options);
}

export async function stopDiscovery() {
  return call(ensureCallbacks(), 'stopBluetoothDevicesDiscovery');
}

export async function closeDevice(deviceId) {
  const session = state.sessions.get(deviceId);
  if (session) return session.close();
  state.pendingLocalDisconnects.set(deviceId, (state.pendingLocalDisconnects.get(deviceId) || 0) + 1);
  return call(ensureCallbacks(), 'closeBLEConnection', { deviceId });
}

export async function subscribe(session, serviceId, characteristicId, callback) {
  if (session.dead) throw new Error('BLE 连接已断开');
  const platform = ensureCallbacks();
  const target = charFor(session, serviceId, characteristicId);
  await call(platform, 'notifyBLECharacteristicValueChange', {
    deviceId: session.deviceId,
    serviceId: target.serviceId,
    characteristicId: target.characteristicId,
    state: true
  });
  const characteristic = session.servicesById.get(normalize(target.serviceId)).characteristicsById.get(normalize(target.characteristicId));
  characteristic.notifying = true;
  return callback ? addValueListener(session, target.serviceId, target.characteristicId, callback) : () => {};
}

export async function setNotifyEnabled(session, serviceId, characteristicId, enabled) {
  if (session.dead) throw new Error('BLE 连接已断开');
  const platform = ensureCallbacks();
  const target = charFor(session, serviceId, characteristicId);
  await call(platform, 'notifyBLECharacteristicValueChange', {
    deviceId: session.deviceId,
    serviceId: target.serviceId,
    characteristicId: target.characteristicId,
    state: Boolean(enabled)
  });
  const characteristic = session.servicesById.get(normalize(target.serviceId)).characteristicsById.get(normalize(target.characteristicId));
  characteristic.notifying = Boolean(enabled);
}

export function readValue(session, serviceId, characteristicId, timeoutMs = 3000) {
  if (session.dead) return Promise.reject(new Error('BLE 连接已断开'));
  const platform = ensureCallbacks();
  const target = charFor(session, serviceId, characteristicId);
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      fn(value);
    };
    const unsubscribe = addValueListener(session, target.serviceId, target.characteristicId, (value) => settle(resolve, value));
    const timer = setTimeout(() => settle(reject, new Error(`readValue 超时（${timeoutMs}ms）`)), timeoutMs);
    call(platform, 'readBLECharacteristicValue', {
      deviceId: session.deviceId,
      serviceId: target.serviceId,
      characteristicId: target.characteristicId
    }).catch((error) => settle(reject, error));
  });
}

export async function writeValue(session, serviceId, characteristicId, value, options = {}) {
  if (session.dead) throw new Error('BLE 连接已断开');
  const platform = ensureCallbacks();
  const target = charFor(session, serviceId, characteristicId);
  await call(platform, 'writeBLECharacteristicValue', {
    deviceId: session.deviceId,
    serviceId: target.serviceId,
    characteristicId: target.characteristicId,
    value,
    ...options
  });
}

export async function setMtu(session, mtu) {
  if (session.dead) throw new Error('BLE 连接已断开');
  const response = await call(ensureCallbacks(), 'setBLEMTU', { deviceId: session.deviceId, mtu });
  session.mtu = Number(response?.mtu || mtu);
  return session.mtu;
}

export function getSession(deviceId) {
  return state.sessions.get(deviceId) || null;
}

export function getBleRuntimeSnapshotForTesting() {
  return {
    sessions: state.sessions.size,
    valueListenerKeys: state.valueListeners.size,
    discoveryListeners: state.discoveryListeners.size
  };
}

export function setBlePlatformForTesting(platform) {
  setPlatform(platform);
}

export function resetBleRuntimeForTesting() {
  state.platform = null;
  state.callbacksRegistered = false;
  state.sessions.clear();
  state.valueListeners.clear();
  state.disconnectListeners.clear();
  state.pendingLocalDisconnects.clear();
  state.discoveryListeners.clear();
}

export function resetBlePlatformAndRuntimeForTesting() {
  resetBleRuntimeForTesting();
  resetBlePlatformForTesting();
}

export { serviceKey };
