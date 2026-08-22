export function createConnectedSessionRegistry(options = {}) {
  const { onDisconnect } = options;
  const entries = new Map();

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

    const unsubscribe = session.onDisconnect((reason) => {
      if (!remove(deviceId, session)) return;
      onDisconnect?.({ deviceId, session, reason });
    });
    entries.set(deviceId, {
      session,
      unsubscribe: typeof unsubscribe === 'function' ? unsubscribe : () => {}
    });
    return session;
  };

  return {
    bind,
    get: (deviceId) => entries.get(deviceId)?.session || null,
    remove,
    clear: () => {
      for (const deviceId of [...entries.keys()]) remove(deviceId);
    },
    get size() {
      return entries.size;
    }
  };
}
