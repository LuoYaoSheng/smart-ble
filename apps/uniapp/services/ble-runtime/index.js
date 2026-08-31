/**
 * BLE Runtime：uni-app 全局 BLE 回调的唯一所有者。
 *
 * 页面、通用调试器和设备 Profile 都只能经由这里读写/订阅特征，避免全局
 * uni.onBLECharacteristicValueChange 被多个页面覆盖。
 */

import { getBlePlatform, resetBlePlatformForTesting, setBlePlatformForTesting as setPlatform } from './platform.js';
import { normalizeBleError } from './errors.js';

const state = {
  platform: null,
  callbacksRegistered: false,
  sessions: new Map(),
  connectionAttempts: new Map(),
  valueListeners: new Map(),
  disconnectListeners: new Map(),
  pendingLocalDisconnects: new Map(),
  discoveryListeners: new Set(),
  adapterStateListeners: new Set()
};

const normalize = (value) => String(value || '').toLowerCase();
const isAlreadyOpenedError = (error) => /already opened|already open/i.test(error?.errMsg || error?.message || '');
const valueKey = (deviceId, serviceId, characteristicId) => [deviceId, serviceId, characteristicId].map(normalize).join('|');
const serviceKey = (deviceId, serviceId) => [deviceId, serviceId].map(normalize).join('|');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function markLocalDisconnect(deviceId) {
  const marker = { expiresAt: Date.now() + 2000 };
  state.pendingLocalDisconnects.set(deviceId, marker);
  setTimeout(() => {
    if (state.pendingLocalDisconnects.get(deviceId) === marker) state.pendingLocalDisconnects.delete(deviceId);
  }, 2100);
}

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

  platform.onBLECharacteristicValueChange?.((res) => {
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

  platform.onBLEConnectionStateChange?.((res) => {
    if (res.connected !== false) return;
    const pending = state.pendingLocalDisconnects.get(res.deviceId);
    if (pending && pending.expiresAt >= Date.now()) {
      state.pendingLocalDisconnects.delete(res.deviceId);
      return;
    }
    const session = state.sessions.get(res.deviceId);
    if (!session) return;
    invalidateSession(session, 'BLE 连接已断开');
  });

  platform.onBluetoothDeviceFound?.((res) => {
    for (const callback of [...state.discoveryListeners]) {
      try {
        callback(res.devices || []);
      } catch (error) {
        console.error('[ble-runtime] discovery callback failed', error);
      }
    }
  });

  platform.onBluetoothAdapterStateChange?.((res) => {
    for (const callback of [...state.adapterStateListeners]) {
      try {
        callback(res);
      } catch (error) {
        console.error('[ble-runtime] adapter state callback failed', error);
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

async function createDeviceSession(deviceId, options) {
  const platform = ensureCallbacks();
  try {
    await call(platform, 'createBLEConnection', { deviceId, timeout: options.timeout || 10000 });
  } catch (error) {
    throw normalizeBleError(error, 'BLE 连接失败');
  }
  let services = [];
  const expectedServiceUuid = normalize(options.expectedServiceUuid);
  try {
    const discoveryAttempts = expectedServiceUuid ? 3 : 1;
    for (let attempt = 0; attempt < discoveryAttempts; attempt++) {
      if (attempt > 0) await sleep(400);
      services = options.discover === false ? [] : await discoverServices(platform, deviceId);
      if (!expectedServiceUuid || services.some((service) => normalize(service.uuid) === expectedServiceUuid)) break;
    }
    if (expectedServiceUuid && !services.some((service) => normalize(service.uuid) === expectedServiceUuid)) {
      throw new Error(`expected service not found: ${options.expectedServiceUuid}`);
    }
  } catch (error) {
    markLocalDisconnect(deviceId);
    await call(platform, 'closeBLEConnection', { deviceId }).catch(() => {});
    throw error;
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
      markLocalDisconnect(this.deviceId);
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

async function enforceSessionRequirements(session, options) {
  const expectedServiceUuid = normalize(options.expectedServiceUuid);
  if (expectedServiceUuid && !session.services.some((service) => normalize(service.uuid) === expectedServiceUuid)) {
    throw new Error(`expected service not found: ${options.expectedServiceUuid}`);
  }
  if (options.mtu && session.mtu < options.mtu) {
    await setMtu(session, options.mtu).catch(() => {});
  }
  return session;
}

export async function connectDevice(deviceId, options = {}) {
  const existing = state.sessions.get(deviceId);
  if (existing && !existing.dead) {
    return enforceSessionRequirements(existing, options);
  }

  const pending = state.connectionAttempts.get(deviceId);
  if (pending) {
    const session = await pending;
    return enforceSessionRequirements(session, options);
  }

  const attempt = createDeviceSession(deviceId, options);
  state.connectionAttempts.set(deviceId, attempt);
  try {
    return await attempt;
  } finally {
    if (state.connectionAttempts.get(deviceId) === attempt) {
      state.connectionAttempts.delete(deviceId);
    }
  }
}

export function onDiscovery(callback) {
  if (typeof callback !== 'function') throw new Error('discovery callback must be a function');
  ensureCallbacks();
  state.discoveryListeners.add(callback);
  return () => state.discoveryListeners.delete(callback);
}

export function onAdapterState(callback) {
  if (typeof callback !== 'function') throw new Error('adapter state callback must be a function');
  ensureCallbacks();
  state.adapterStateListeners.add(callback);
  return () => state.adapterStateListeners.delete(callback);
}

export async function openAdapter() {
  try {
    return await call(ensureCallbacks(), 'openBluetoothAdapter');
  } catch (error) {
    if (isAlreadyOpenedError(error)) return { alreadyOpened: true };
    throw normalizeBleError(error, '蓝牙适配器初始化失败');
  }
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
  markLocalDisconnect(deviceId);
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

export function listen(session, serviceId, characteristicId, callback) {
  if (session.dead) throw new Error('BLE 连接已断开');
  const target = charFor(session, serviceId, characteristicId);
  return addValueListener(session, target.serviceId, target.characteristicId, callback);
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
    let timer = null;
    let unsubscribeValue = () => {};
    let unsubscribeDisconnect = () => {};
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribeValue();
      unsubscribeDisconnect();
      fn(value);
    };
    unsubscribeValue = addValueListener(session, target.serviceId, target.characteristicId, (value) => settle(resolve, value));
    unsubscribeDisconnect = session.onDisconnect((reason) => settle(reject, new Error(reason || 'BLE 连接已断开')));
    timer = setTimeout(() => settle(reject, new Error(`readValue 超时（${timeoutMs}ms）`)), timeoutMs);
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
    connectionAttempts: state.connectionAttempts.size,
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
  state.connectionAttempts.clear();
  state.valueListeners.clear();
  state.disconnectListeners.clear();
  state.pendingLocalDisconnects.clear();
  state.discoveryListeners.clear();
  state.adapterStateListeners.clear();
}

export function resetBlePlatformAndRuntimeForTesting() {
  resetBleRuntimeForTesting();
  resetBlePlatformForTesting();
}

export { serviceKey };
