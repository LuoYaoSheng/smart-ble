/**
 * BLE Runtime：uni-app 全局 BLE 回调的唯一所有者。
 *
 * 页面、通用调试器和设备 Profile 都只能经由这里读写/订阅特征，避免全局
 * uni.onBLECharacteristicValueChange 被多个页面覆盖。
 */

import { getBlePlatform, resetBlePlatformForTesting, setBlePlatformForTesting as setPlatform } from './platform.js';
import { normalizeBleError } from './errors.js';
import { attachDeviceDisplayName } from './display-name.js';
import {
  validateHexInput,
  parseHexInput,
  encodeTextInput,
  decodeBytes,
  formatReadValue,
  normalizeGattPayload,
} from './gatt-codec.js';
import { createWriteQueue, chunkForMtu, chunkBytes } from './write-queue.js';
import {
  createSessionRegistry,
  getSessionRegistry,
  resetSessionRegistryForTesting,
  CONNECTION_STATE,
  RECONNECT_STATE,
  OWNER_TYPE,
} from './session-registry.js';
import {
  createReconnectManager,
  resetReconnectManagerForTesting,
} from './reconnect-manager.js';
import { DISCONNECT_REASON } from './reconnect-policy.js';
import { createLogger } from '../logger/log-redaction.js';
import {
  createConnectionDiscovery,
  createDiscoveryError,
  DISCOVERY_ERROR,
  buildCapabilityMap,
  resetConnectionDiscoveryForTesting,
} from './connection-discovery.js';

const log = createLogger('ble-runtime');

// let：resetBleRuntimeForTesting 会重建 registry 单例，需重绑（否则 reset 后 index 静默持有死实例）
let registry = getSessionRegistry();
let reconnectManager = null;
let connectionDiscovery = null;

function ensureConnectionDiscovery() {
  if (connectionDiscovery) return connectionDiscovery;
  connectionDiscovery = createConnectionDiscovery({
    callPlatform: (method, args) => call(ensureCallbacks(), method, args),
  });
  return connectionDiscovery;
}

function ensureReconnectManager() {
  if (reconnectManager) return reconnectManager;
  reconnectManager = createReconnectManager({
    getSession: (deviceId) => registry.getSession(deviceId),
    updateSession: (deviceId, patch) => registry.updateSession(deviceId, patch),
    connect: (deviceId, options) => connectDevice(deviceId, options),
    onQueueDisconnect: (deviceId) => {
      ensureWriteQueue().abortDeviceWrites(deviceId, 'DISCONNECTED');
    },
  });
  return reconnectManager;
}

const state = {
  platform: null,
  callbacksRegistered: false,
  connectionAttempts: new Map(),
  valueListeners: new Map(),
  disconnectListeners: new Map(),
  pendingLocalDisconnects: new Map(),
  discoveryListeners: new Set(),
  adapterStateListeners: new Set(),
  writeQueue: null,
};

const normalize = (value) => String(value || '').toLowerCase();
const isAlreadyOpenedError = (error) => /already opened|already open/i.test(error?.errMsg || error?.message || '');
const valueKey = (deviceId, serviceId, characteristicId) => [deviceId, serviceId, characteristicId].map(normalize).join('|');
const serviceKey = (deviceId, serviceId) => [deviceId, serviceId].map(normalize).join('|');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getRegistrySession(deviceId) {
  return registry.getSession(deviceId);
}

export function getRuntimeSession(deviceId) {
  const entry = getRegistrySession(deviceId);
  const runtime = entry?.runtime;
  if (!runtime || runtime.dead) return null;
  return runtime;
}

function trackSubscription(deviceId, serviceId, characteristicId, enabled = true) {
  if (enabled) {
    registry.addSubscription(deviceId, { serviceId, characteristicId, enabled: true });
    return;
  }
  registry.removeSubscription(deviceId, { serviceId, characteristicId });
}

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
  if (state.callbacksRegistered && state.platform !== platform && registry.listSessions().length) {
    throw new Error('BLE platform cannot change while sessions are active');
  }

  platform.onBLECharacteristicValueChange?.((res) => {
    const callbacks = state.valueListeners.get(valueKey(res.deviceId, res.serviceId, res.characteristicId));
    if (!callbacks) return;
    for (const callback of [...callbacks]) {
      try {
        callback(res.value, res);
      } catch (error) {
        log.error('characteristic callback failed', error);
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
    handlePassiveDisconnect(res.deviceId, DISCONNECT_REASON.REMOTE_LOST);
  });

  platform.onBluetoothDeviceFound?.((res) => {
    const devices = (res.devices || []).map((device) => attachDeviceDisplayName(device));
    for (const callback of [...state.discoveryListeners]) {
      try {
        callback(devices);
      } catch (error) {
        log.error('discovery callback failed', error);
      }
    }
  });

  platform.onBluetoothAdapterStateChange?.((res) => {
    for (const callback of [...state.adapterStateListeners]) {
      try {
        callback(res);
      } catch (error) {
        log.error('adapter state callback failed', error);
      }
    }
  });

  state.platform = platform;
  state.callbacksRegistered = true;
  return platform;
}

function cleanupRuntimeSession(session, reason) {
  if (!session || session.dead) return;
  session.dead = true;
  for (const callback of [...session.disconnectCallbacks]) {
    try {
      callback(reason);
    } catch (error) {
      log.error('disconnect callback failed', error);
    }
  }
  session.disconnectCallbacks.clear();
  for (const cleanup of [...session.cleanups]) cleanup();
  session.cleanups.clear();
}

function handleUserDisconnect(session, reason = 'BLE 连接已主动关闭') {
  if (!session) return;
  const { deviceId } = session;
  cleanupRuntimeSession(session, reason);
  ensureWriteQueue().abortDeviceWrites(deviceId, 'DISCONNECTED');
  ensureReconnectManager().cancelReconnect(deviceId);
  registry.updateSession(deviceId, {
    connectionState: CONNECTION_STATE.DISCONNECTED,
    runtime: null,
    disconnectReason: DISCONNECT_REASON.USER_REQUEST,
    reconnectState: RECONNECT_STATE.NONE,
  });
  registry.clearSubscriptions(deviceId);
  registry.removeSession(deviceId);
}

function handlePassiveDisconnect(deviceId, disconnectReason = DISCONNECT_REASON.REMOTE_LOST) {
  const session = getRuntimeSession(deviceId);
  if (!session && !registry.getSession(deviceId)) return;

  if (session) cleanupRuntimeSession(session, 'BLE 连接已断开');

  const entry = registry.getSession(deviceId);
  if (!entry) return;

  ensureWriteQueue().abortDeviceWrites(deviceId, 'DISCONNECTED');
  registry.clearSubscriptions(deviceId);
  registry.updateSession(deviceId, {
    connectionState: CONNECTION_STATE.DISCONNECTED,
    runtime: null,
    disconnectReason,
  });

  ensureReconnectManager().scheduleReconnect(deviceId, {
    reason: disconnectReason,
    connectOptions: entry.metadata?.connectOptions ?? {},
  });
}

function invalidateSession(session, reason) {
  handleUserDisconnect(session, reason);
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

async function runConnectionDiscovery(deviceId, options) {
  return ensureConnectionDiscovery().runDiscovery(deviceId, {
    expectedServiceUuid: options.expectedServiceUuid,
    timeoutMs: options.discoveryTimeoutMs,
  });
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
  const connectOptions = {
    timeout: options.timeout,
    expectedServiceUuid: options.expectedServiceUuid,
    mtu: options.mtu,
    discover: options.discover,
    owner: options.owner,
    deviceInfo: options.deviceInfo,
    metadata: options.metadata,
  };
  const owner = options.owner ?? { type: OWNER_TYPE.SYSTEM, id: 'ble-runtime' };
  registry.createSession({
    deviceId,
    deviceInfo: options.deviceInfo ?? null,
    owner,
    metadata: {
      ...(options.metadata ?? {}),
      connectOptions,
    },
    connectionState: CONNECTION_STATE.CONNECTING,
  });
  try {
    await call(platform, 'createBLEConnection', { deviceId, timeout: options.timeout || 10000 });
  } catch (error) {
    registry.updateSession(deviceId, { connectionState: CONNECTION_STATE.FAILED });
    registry.removeSession(deviceId);
    throw normalizeBleError(error, 'BLE 连接失败');
  }
  registry.updateSession(deviceId, { connectionState: CONNECTION_STATE.CONNECTED });
  let discoveryResult;
  try {
    registry.updateSession(deviceId, { connectionState: CONNECTION_STATE.DISCOVERING });
    discoveryResult = await runConnectionDiscovery(deviceId, options);
  } catch (error) {
    registry.updateSession(deviceId, { connectionState: CONNECTION_STATE.FAILED });
    registry.removeSession(deviceId);
    markLocalDisconnect(deviceId);
    await call(platform, 'closeBLEConnection', { deviceId }).catch(() => {});
    if (error?.code && Object.values(DISCOVERY_ERROR).includes(error.code)) {
      throw error;
    }
    throw normalizeBleError(error, 'BLE 服务发现失败');
  }

  const services = discoveryResult.services.map((service) => ({
    uuid: service.uuid,
    characteristics: (service.characteristics || []).map((characteristic) => ({
      uuid: characteristic.uuid,
      properties: characteristic.properties,
      notifying: false,
    })),
  }));
  const capabilities = discoveryResult.capabilities ?? buildCapabilityMap(discoveryResult);

  if (!services.length || !discoveryResult.characteristics?.length) {
    registry.updateSession(deviceId, { connectionState: CONNECTION_STATE.FAILED });
    registry.removeSession(deviceId);
    markLocalDisconnect(deviceId);
    await call(platform, 'closeBLEConnection', { deviceId }).catch(() => {});
    throw createDiscoveryError(
      DISCOVERY_ERROR.DISCOVERY_FAILED,
      'discovery produced no characteristics',
      { deviceId },
    );
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
      registry.updateSession(this.deviceId, { connectionState: CONNECTION_STATE.DISCONNECTING });
      markLocalDisconnect(this.deviceId);
      handleUserDisconnect(this, 'BLE 连接已主动关闭');
      await call(platform, 'closeBLEConnection', { deviceId: this.deviceId }).catch(() => {});
    }
  };
  registry.updateSession(deviceId, {
    connectionState: CONNECTION_STATE.READY,
    services,
    discovery: discoveryResult,
    capabilities,
    runtime: session,
    owner,
    metadata: {
      ...(options.metadata ?? {}),
      connectOptions,
    },
  });

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

export function getDeviceCapabilities(deviceId) {
  const session = registry.getSession(deviceId);
  return session?.capabilities ?? ensureConnectionDiscovery().getCapabilityMap(deviceId);
}

export function getDeviceDiscovery(deviceId) {
  const session = registry.getSession(deviceId);
  return session?.discovery ?? ensureConnectionDiscovery().getDiscoveryResult(deviceId);
}

export async function connectDevice(deviceId, options = {}) {
  const existing = getRuntimeSession(deviceId);
  if (existing) {
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

export async function closeDevice(deviceId, options = {}) {
  const session = getRuntimeSession(deviceId);
  if (session) {
    if (options.owner) {
      const decision = registry.canDisconnect(deviceId, options.owner);
      if (!decision.allowed) {
        if (decision.action === 'release_only') {
          registry.releaseReference(deviceId, options.owner);
          return { released: true };
        }
        const error = new Error('disconnect denied: caller is not session owner');
        error.code = 'SESSION_OWNER_MISMATCH';
        throw error;
      }
    }
    return session.close();
  }
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
  trackSubscription(session.deviceId, target.serviceId, target.characteristicId, true);
  const unsubscribe = callback ? addValueListener(session, target.serviceId, target.characteristicId, callback) : () => {};
  return () => {
    unsubscribe();
    trackSubscription(session.deviceId, target.serviceId, target.characteristicId, false);
  };
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
  trackSubscription(session.deviceId, target.serviceId, target.characteristicId, Boolean(enabled));
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

/**
 * Read + format（Codec 层）。默认返回原始 bytes；options.format 时返回展示字符串。
 */
export async function readCharacteristic(session, serviceId, characteristicId, options = {}) {
  const timeoutMs = options.timeoutMs ?? options.timeout ?? 3000;
  const raw = await readValue(session, serviceId, characteristicId, timeoutMs);
  if (options.format) {
    return {
      bytes: raw,
      display: formatReadValue(raw, options.format),
      text: decodeBytes(raw),
      hex: formatReadValue(raw, 'hex'),
    };
  }
  return raw;
}

export async function writeValue(session, serviceId, characteristicId, value, options = {}) {
  if (session.dead) throw new Error('BLE 连接已断开');
  const target = charFor(session, serviceId, characteristicId);

  let payload = value;
  if (options.mode === 'hex' || options.mode === 'text' || (typeof value === 'string' && options.mode)) {
    const normalized = normalizeGattPayload(value, options.mode);
    if (!normalized.ok) {
      const error = new Error(normalized.error || 'INVALID_HEX');
      error.code = normalized.code || normalized.error || 'INVALID_HEX';
      error.ok = false;
      throw error;
    }
    payload = normalized.bytes;
  } else if (typeof value === 'string' && options.encode !== false) {
    const normalized = normalizeGattPayload(value, 'hex');
    if (!normalized.ok) {
      const error = new Error(normalized.error || 'INVALID_HEX');
      error.code = normalized.code || normalized.error || 'INVALID_HEX';
      error.ok = false;
      throw error;
    }
    payload = normalized.bytes;
  }

  const {
    mode: _mode,
    encode: _encode,
    format: _format,
    timeoutMs,
    timeout,
    skipQueue,
    direct,
    priority,
    retryCount,
    ...platformOptions
  } = options;

  // 直接写（队列 transport / 测试旁路）
  if (skipQueue || direct) {
    const platform = ensureCallbacks();
    await call(platform, 'writeBLECharacteristicValue', {
      ...platformOptions,
      deviceId: session.deviceId,
      serviceId: target.serviceId,
      characteristicId: target.characteristicId,
      value: payload,
    });
    return;
  }

  const queue = ensureWriteQueue();
  const enqueued = queue.enqueueWrite({
    deviceId: session.deviceId,
    serviceId: target.serviceId,
    characteristicId: target.characteristicId,
    payload,
    rawPayload: payload,
    mode: options.mode || null,
    priority,
    retryCount,
    timeout: timeoutMs ?? timeout,
    platformOptions,
  });
  const result = await enqueued.promise;
  if (!result?.ok) {
    const error = new Error(result?.error || result?.state || 'WRITE_FAILED');
    error.code = result?.state || 'WRITE_FAILED';
    error.errMsg = result?.error || result?.state || 'WRITE_FAILED';
    if (result?.errCode != null) error.errCode = result.errCode;
    error.transaction = result;
    throw error;
  }
}

/** Write via Codec → Write Queue → transport；非法 HEX 不入队、不调用平台 */
export async function writeCharacteristic(session, serviceId, characteristicId, input, options = {}) {
  const mode = options.mode || 'hex';
  const normalized = normalizeGattPayload(input, mode);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error, code: normalized.code, length: 0, wrote: false };
  }
  const queue = ensureWriteQueue();
  const target = charFor(session, serviceId, characteristicId);
  const events = [];
  const stop = queue.onWriteEvent((ev) => {
    if (ev.deviceId === session.deviceId) events.push(ev);
  });
  try {
    const enqueued = queue.enqueueWrite({
      deviceId: session.deviceId,
      serviceId: target.serviceId,
      characteristicId: target.characteristicId,
      payload: normalized.bytes,
      mode,
      priority: options.priority,
      retryCount: options.retryCount,
      timeout: options.timeoutMs ?? options.timeout,
    });
    const result = await enqueued.promise;
    if (!result?.ok) {
      return {
        ok: false,
        error: result?.error || result?.state,
        code: result?.state,
        length: normalized.length,
        wrote: false,
        transactionId: enqueued.id,
        events,
      };
    }
    return {
      ok: true,
      bytes: normalized.bytes,
      length: normalized.length,
      wrote: true,
      transactionId: enqueued.id,
      events,
    };
  } finally {
    stop?.();
  }
}

function ensureWriteQueue() {
  if (state.writeQueue) return state.writeQueue;
  state.writeQueue = createWriteQueue({
    defaultTimeout: 5000,
    maxDepth: 16,
    transport: async (tx) => {
      const platform = ensureCallbacks();
      try {
        await call(platform, 'writeBLECharacteristicValue', {
          ...(tx.platformOptions || {}),
          deviceId: tx.deviceId,
          serviceId: tx.serviceId,
          characteristicId: tx.characteristicId,
          value: tx.rawPayload !== undefined ? tx.rawPayload : tx.payload,
        });
      } catch (error) {
        const normalized = normalizeBleError(error, 'BLE 写入失败');
        throw normalized;
      }
    },
  });
  return state.writeQueue;
}

export function getWriteQueueState() {
  return ensureWriteQueue().getQueueState();
}

export function onWriteQueueEvent(callback) {
  return ensureWriteQueue().onWriteEvent(callback);
}

export function cancelWrite(id) {
  return ensureWriteQueue().cancelWrite(id);
}

export function cancelDeviceWrites(deviceId) {
  return ensureWriteQueue().cancelDeviceWrites(deviceId);
}

export async function setMtu(session, mtu) {
  if (session.dead) throw new Error('BLE 连接已断开');
  const response = await call(ensureCallbacks(), 'setBLEMTU', { deviceId: session.deviceId, mtu });
  session.mtu = Number(response?.mtu || mtu);
  return session.mtu;
}

export function getSession(deviceId) {
  return getRuntimeSession(deviceId);
}

export function listSessions(options = {}) {
  return registry.listSessions(options);
}

export function getSessionRegistrySnapshot(deviceId) {
  const entry = registry.getSession(deviceId);
  return entry
    ? {
      deviceId: entry.deviceId,
      connectionState: entry.connectionState,
      services: entry.services,
      discovery: entry.discovery,
      capabilities: entry.capabilities,
      subscription_count: entry.subscription_count,
      owner: entry.owner,
      reconnectState: entry.reconnectState,
      disconnectReason: entry.disconnectReason,
      metadata: { ...entry.metadata },
    }
    : null;
}

export function borrowSession(deviceId, borrower) {
  return registry.borrowReference(deviceId, borrower);
}

export function releaseSessionReference(deviceId, borrower) {
  return registry.releaseReference(deviceId, borrower);
}

export function setSessionOwner(deviceId, owner) {
  return registry.setOwner(deviceId, owner);
}

export function getSessionOwner(deviceId) {
  return registry.getOwner(deviceId);
}

export function getReconnectState(deviceId) {
  return ensureReconnectManager().getReconnectState(deviceId);
}

export function cancelReconnect(deviceId) {
  return ensureReconnectManager().cancelReconnect(deviceId);
}

export function scheduleReconnect(deviceId, options = {}) {
  return ensureReconnectManager().scheduleReconnect(deviceId, options);
}

// API_SPEC §7 subscribeConnectionState（F006/F012）：listener → unsubscribe，重复注册可检测（同 listener 复用同一订阅）。
// 事件源 = session-registry 变更；被动断线重连（含 backoff）由 reconnect-manager 独占，页面经此订阅感知恢复/耗尽。
const connectionStateSubscriptions = new Map();

export function subscribeConnectionState(listener) {
  if (typeof listener !== 'function') throw new Error('connection state listener must be a function');
  const existing = connectionStateSubscriptions.get(listener);
  if (existing) return existing;

  const unsubscribe = registry.subscribe((session, phase) => {
    listener({
      deviceId: session.deviceId,
      connectionState: session.connectionState,
      reconnectState: session.reconnectState,
      disconnectReason: session.disconnectReason,
      phase,
    });
  });
  const teardown = () => {
    connectionStateSubscriptions.delete(listener);
    unsubscribe();
  };
  connectionStateSubscriptions.set(listener, teardown);
  return teardown;
}

export function getBleRuntimeSnapshotForTesting() {
  return {
    sessions: registry.listSessions().length,
    connectionAttempts: state.connectionAttempts.size,
    valueListenerKeys: state.valueListeners.size,
    discoveryListeners: state.discoveryListeners.size
  };
}

export function setBlePlatformForTesting(platform) {
  setPlatform(platform);
}

export function resetBleRuntimeForTesting() {
  state.writeQueue?.close?.();
  state.writeQueue = null;
  resetReconnectManagerForTesting();
  reconnectManager = null;
  for (const teardown of [...connectionStateSubscriptions.values()]) teardown();
  connectionStateSubscriptions.clear();
  resetConnectionDiscoveryForTesting(connectionDiscovery);
  connectionDiscovery = null;
  state.platform = null;
  state.callbacksRegistered = false;
  resetSessionRegistryForTesting();
  registry = getSessionRegistry();
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

export {
  validateHexInput,
  parseHexInput,
  encodeTextInput,
  decodeBytes,
  formatReadValue,
  normalizeGattPayload,
};

export { createWriteQueue, chunkForMtu, chunkBytes };

export {
  createSessionRegistry,
  getSessionRegistry,
  resetSessionRegistryForTesting,
  CONNECTION_STATE,
  RECONNECT_STATE,
  OWNER_TYPE,
};

export {
  createReconnectManager,
  resetReconnectManagerForTesting,
};

export { DISCONNECT_REASON, shouldReconnect, MAX_RECONNECT_ATTEMPTS, BACKOFF_MS } from './reconnect-policy.js';

export {
  createConnectionDiscovery,
  createDiscoveryError,
  DISCOVERY_ERROR,
  buildCapabilityMap,
  KNOWN_SERVICE_UUIDS,
} from './connection-discovery.js';
