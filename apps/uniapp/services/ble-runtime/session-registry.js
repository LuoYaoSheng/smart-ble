/**
 * BLE Session Registry — 纯 JS，无 Vue/uni/wx/plus 依赖。
 * 统一管理连接状态、所有权、订阅生命周期与多设备隔离。
 */

export const CONNECTION_STATE = Object.freeze({
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCOVERING: 'DISCOVERING',
  READY: 'READY',
  DISCONNECTING: 'DISCONNECTING',
  DISCONNECTED: 'DISCONNECTED',
  FAILED: 'FAILED',
});

export const RECONNECT_STATE = Object.freeze({
  NONE: 'NONE',
  SCHEDULED: 'SCHEDULED',
  RECONNECTING: 'RECONNECTING',
  SUCCESS: 'SUCCESS',
  EXHAUSTED: 'EXHAUSTED',
});

export const OWNER_TYPE = Object.freeze({
  PAGE: 'PAGE',
  WORKFLOW: 'WORKFLOW',
  BACKGROUND: 'BACKGROUND',
  SYSTEM: 'SYSTEM',
});

const now = () => Date.now();

function subscriptionKey(serviceId, characteristicId) {
  return `${String(serviceId).toLowerCase()}|${String(characteristicId).toLowerCase()}`;
}

function syncSubscriptionCount(session) {
  session.subscription_count = session.subscriptions.filter((entry) => entry.enabled).length;
}

function ownerKey(owner) {
  if (!owner) return '';
  if (typeof owner === 'string') return owner;
  return `${owner.type || ''}:${owner.id || ''}`;
}

function flattenCharacteristics(services = []) {
  const characteristics = [];
  for (const service of services) {
    for (const characteristic of service.characteristics || []) {
      characteristics.push({
        serviceId: service.uuid,
        characteristicId: characteristic.uuid,
        ...characteristic,
      });
    }
  }
  return characteristics;
}

function createEmptySession(deviceId, partial = {}) {
  const ts = now();
  return {
    deviceId,
    deviceInfo: partial.deviceInfo ?? null,
    connectionState: partial.connectionState ?? CONNECTION_STATE.IDLE,
    services: partial.services ?? [],
    characteristics: partial.characteristics ?? flattenCharacteristics(partial.services ?? []),
    discovery: partial.discovery ?? null,
    capabilities: partial.capabilities ?? null,
    subscriptions: [],
    owner: partial.owner ?? null,
    createdAt: partial.createdAt ?? ts,
    updatedAt: partial.updatedAt ?? ts,
    reconnectState: partial.reconnectState ?? RECONNECT_STATE.NONE,
    disconnectReason: partial.disconnectReason ?? null,
    metadata: partial.metadata ? { ...partial.metadata } : {},
    runtime: partial.runtime ?? null,
    borrowRefs: new Set(),
    provisioning: Boolean(partial.provisioning),
    subscription_count: 0,
  };
}

function snapshotSession(session) {
  syncSubscriptionCount(session);
  return {
    deviceId: session.deviceId,
    deviceInfo: session.deviceInfo,
    connectionState: session.connectionState,
    services: session.services,
    characteristics: session.characteristics,
    discovery: session.discovery,
    capabilities: session.capabilities,
    subscriptions: session.subscriptions.map((entry) => ({ ...entry })),
    owner: session.owner,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    reconnectState: session.reconnectState,
    disconnectReason: session.disconnectReason,
    metadata: { ...session.metadata },
    subscription_count: session.subscription_count,
    provisioning: session.provisioning,
  };
}

export function createSessionRegistry() {
  const sessions = new Map();
  const changeListeners = new Set();
  let nextCallbackId = 1;

  function notifyChange(session, phase) {
    if (!session || changeListeners.size === 0) return;
    const snapshot = snapshotSession(session);
    for (const listener of [...changeListeners]) {
      try {
        listener(snapshot, phase);
      } catch {
        // 订阅方异常不得影响 registry 事实源
      }
    }
  }

  function createSession(deviceOrPartial) {
    const partial = typeof deviceOrPartial === 'string' ? { deviceId: deviceOrPartial } : { ...deviceOrPartial };
    const { deviceId } = partial;
    if (!deviceId) throw new Error('deviceId is required');

    const existing = sessions.get(deviceId);
    if (
      existing
      && existing.connectionState !== CONNECTION_STATE.DISCONNECTED
      && existing.connectionState !== CONNECTION_STATE.FAILED
    ) {
      return existing;
    }

    const session = createEmptySession(deviceId, partial);
    if (partial.services?.length) {
      session.characteristics = flattenCharacteristics(partial.services);
    }
    syncSubscriptionCount(session);
    sessions.set(deviceId, session);
    notifyChange(session, 'created');
    return session;
  }

  function getSession(deviceId) {
    if (!deviceId) return null;
    return sessions.get(deviceId) ?? null;
  }

  function updateSession(deviceId, patch = {}) {
    const session = sessions.get(deviceId);
    if (!session) return null;

    if (patch.deviceInfo !== undefined) session.deviceInfo = patch.deviceInfo;
    if (patch.connectionState !== undefined) session.connectionState = patch.connectionState;
    if (patch.services !== undefined) {
      session.services = patch.services;
      session.characteristics = flattenCharacteristics(patch.services);
    }
    if (patch.discovery !== undefined) session.discovery = patch.discovery;
    if (patch.capabilities !== undefined) session.capabilities = patch.capabilities;
    if (patch.characteristics !== undefined) session.characteristics = patch.characteristics;
    if (patch.reconnectState !== undefined) session.reconnectState = patch.reconnectState;
    if (patch.disconnectReason !== undefined) session.disconnectReason = patch.disconnectReason;
    if (patch.owner !== undefined) session.owner = patch.owner;
    if (patch.runtime !== undefined) session.runtime = patch.runtime;
    if (patch.provisioning !== undefined) session.provisioning = Boolean(patch.provisioning);
    if (patch.metadata) session.metadata = { ...session.metadata, ...patch.metadata };

    session.updatedAt = now();
    syncSubscriptionCount(session);
    notifyChange(session, 'updated');
    return session;
  }

  function removeSession(deviceId) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.connectionState = CONNECTION_STATE.DISCONNECTED;
    session.subscriptions = [];
    session.borrowRefs.clear();
    session.runtime = null;
    syncSubscriptionCount(session);
    sessions.delete(deviceId);
    notifyChange(session, 'removed');
    return true;
  }

  /**
   * 订阅会话变更（created/updated/removed），返回取消函数。
   * API_SPEC §7 subscribeConnectionState 的数据源；重复注册同一 listener 自动去重。
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') throw new Error('session change listener must be a function');
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  }

  function listSessions(options = {}) {
    const { excludeProvisioning = false } = options;
    const rows = [];
    for (const session of sessions.values()) {
      if (excludeProvisioning && session.provisioning) continue;
      if (session.connectionState === CONNECTION_STATE.DISCONNECTED) continue;
      rows.push(snapshotSession(session));
    }
    return rows;
  }

  function setOwner(deviceId, owner) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.owner = owner;
    session.updatedAt = now();
    return true;
  }

  function getOwner(deviceId) {
    return sessions.get(deviceId)?.owner ?? null;
  }

  function borrowReference(deviceId, borrower) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.borrowRefs.add(ownerKey(borrower));
    session.updatedAt = now();
    return true;
  }

  function releaseReference(deviceId, borrower) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.borrowRefs.delete(ownerKey(borrower));
    session.updatedAt = now();
    return true;
  }

  function canDisconnect(deviceId, callerOwner) {
    const session = sessions.get(deviceId);
    if (!session) return { allowed: false, reason: 'no_session' };
    if (!callerOwner) return { allowed: false, reason: 'no_owner' };
    if (
      session.owner
      && session.owner.type === callerOwner.type
      && session.owner.id === callerOwner.id
    ) {
      return { allowed: true, mode: 'owner' };
    }
    if (session.borrowRefs.has(ownerKey(callerOwner))) {
      return { allowed: false, action: 'release_only', mode: 'borrow' };
    }
    return { allowed: false, reason: 'not_owner' };
  }

  function addSubscription(deviceId, subscription = {}) {
    const session = sessions.get(deviceId);
    if (!session) return null;

    const entry = {
      serviceId: subscription.serviceId,
      characteristicId: subscription.characteristicId,
      enabled: subscription.enabled !== false,
      callbackId: subscription.callbackId ?? `cb-${nextCallbackId++}`,
      createdAt: subscription.createdAt ?? now(),
    };
    const key = subscriptionKey(entry.serviceId, entry.characteristicId);
    const index = session.subscriptions.findIndex(
      (item) => subscriptionKey(item.serviceId, item.characteristicId) === key,
    );
    if (index >= 0) session.subscriptions[index] = entry;
    else session.subscriptions.push(entry);

    session.updatedAt = now();
    syncSubscriptionCount(session);
    return entry;
  }

  function removeSubscription(deviceId, subscription) {
    const session = sessions.get(deviceId);
    if (!session) return false;

    const before = session.subscriptions.length;
    if (typeof subscription === 'string') {
      session.subscriptions = session.subscriptions.filter((item) => item.callbackId !== subscription);
    } else {
      const key = subscriptionKey(subscription.serviceId, subscription.characteristicId);
      session.subscriptions = session.subscriptions.filter(
        (item) => subscriptionKey(item.serviceId, item.characteristicId) !== key,
      );
    }

    session.updatedAt = now();
    syncSubscriptionCount(session);
    return session.subscriptions.length < before;
  }

  function clearSubscriptions(deviceId) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.subscriptions = [];
    session.updatedAt = now();
    syncSubscriptionCount(session);
    return true;
  }

  function markProvisioning(deviceId, value = true) {
    const session = sessions.get(deviceId);
    if (!session) return false;
    session.provisioning = Boolean(value);
    session.updatedAt = now();
    return true;
  }

  function isProvisioning(deviceId) {
    return Boolean(sessions.get(deviceId)?.provisioning);
  }

  function exclude(deviceId) {
    return markProvisioning(deviceId, true);
  }

  function registerProvisioning(deviceId, partial = {}) {
    return createSession({ deviceId, ...partial, provisioning: true });
  }

  function reset() {
    sessions.clear();
    changeListeners.clear();
    nextCallbackId = 1;
  }

  return {
    createSession,
    getSession,
    updateSession,
    removeSession,
    listSessions,
    subscribe,
    setOwner,
    getOwner,
    addSubscription,
    removeSubscription,
    clearSubscriptions,
    reset,
    borrowReference,
    releaseReference,
    canDisconnect,
    markProvisioning,
    isProvisioning,
    exclude,
    registerProvisioning,
    snapshot: () => listSessions(),
    CONNECTION_STATE,
    RECONNECT_STATE,
    OWNER_TYPE,
  };
}

let defaultRegistry = null;

export function getSessionRegistry() {
  if (!defaultRegistry) defaultRegistry = createSessionRegistry();
  return defaultRegistry;
}

export function resetSessionRegistryForTesting() {
  defaultRegistry?.reset();
  defaultRegistry = null;
}
