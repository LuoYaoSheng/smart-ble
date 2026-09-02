import {
  getSessionRegistry,
  CONNECTION_STATE,
} from './ble-runtime/session-registry.js';

export function createConnectedSessionRegistry(options = {}) {
  const { onDisconnect } = options;
  const entries = new Map();
  const registry = getSessionRegistry();

  const remove = (deviceId, expectedSession) => {
    const entry = entries.get(deviceId);
    if (!entry || (expectedSession && entry.session !== expectedSession)) return false;
    entries.delete(deviceId);
    entry.unsubscribe();
    return true;
  };

  const bind = (deviceId, session) => {
    if (!deviceId) throw new Error('deviceId is required');
    if (!session || typeof session.onDisconnect !== 'function') throw new Error('session.onDisconnect is required');
    if (session.dead) throw new Error('cannot bind a dead session');

    const existing = entries.get(deviceId);
    if (existing?.session === session) return session;
    if (existing) remove(deviceId, existing.session);

    let registrySession = registry.getSession(deviceId);
    if (!registrySession) {
      registrySession = registry.createSession({
        deviceId,
        runtime: session,
        services: session.services || [],
        connectionState: CONNECTION_STATE.READY,
      });
    } else {
      registry.updateSession(deviceId, {
        runtime: session,
        services: session.services || registrySession.services,
        connectionState: CONNECTION_STATE.READY,
      });
    }

    const unsubscribe = session.onDisconnect((reason) => {
      if (!remove(deviceId, session)) return;
      registry.updateSession(deviceId, { connectionState: CONNECTION_STATE.DISCONNECTED, runtime: null });
      registry.removeSession(deviceId);
      onDisconnect?.({ deviceId, session, reason });
    });
    entries.set(deviceId, {
      session,
      unsubscribe: typeof unsubscribe === 'function' ? unsubscribe : () => {},
    });
    return session;
  };

  const register = (session) => {
    const deviceId = session?.deviceId;
    if (!deviceId) throw new Error('deviceId is required');
    if (!registry.getSession(deviceId)) {
      registry.createSession({
        deviceId,
        runtime: session,
        connectionState: CONNECTION_STATE.READY,
      });
    }
    if (typeof session.onDisconnect === 'function') {
      return bind(deviceId, session);
    }
    return registry.getSession(deviceId);
  };

  const add = register;

  const snapshot = () => registry.listSessions({ excludeProvisioning: true });
  const list = snapshot;
  const sessions = snapshot;

  const markProvisioning = (deviceId, value = true) => registry.markProvisioning(deviceId, value);
  const isProvisioning = (deviceId) => registry.isProvisioning(deviceId);
  const exclude = (deviceId) => registry.exclude(deviceId);
  const registerProvisioning = (deviceId, partial = {}) => registry.registerProvisioning(deviceId, partial);

  return {
    bind,
    get: (deviceId) => entries.get(deviceId)?.session || null,
    remove,
    clear: () => {
      for (const deviceId of [...entries.keys()]) remove(deviceId);
    },
    register,
    add,
    snapshot,
    list,
    sessions,
    markProvisioning,
    isProvisioning,
    exclude,
    registerProvisioning,
    get size() {
      return entries.size;
    },
  };
}
