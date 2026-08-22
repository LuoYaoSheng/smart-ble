function call(target, method, options = {}) {
  return new Promise((resolve, reject) => {
    const api = target?.[method];
    if (typeof api !== 'function') {
      reject(new Error(`BLE peripheral server does not implement ${method}`));
      return;
    }
    api.call(target, { ...options, success: resolve, fail: reject });
  });
}

export function createWxPeripheralServerController({ platform }) {
  let server = null;
  let creating = null;
  let closing = null;
  let advertising = false;

  const ensureCreated = () => {
    if (closing) return closing.then(() => ensureCreated());
    if (server) return Promise.resolve(server);
    if (creating) return creating;
    creating = call(platform, 'createBLEPeripheralServer')
      .then((result) => {
        if (!result?.server) throw new Error('微信未返回 BLE 外围服务器实例');
        server = result.server;
        return server;
      })
      .finally(() => {
        creating = null;
      });
    return creating;
  };

  const start = async (advertiseRequest, powerLevel = 'medium') => {
    const activeServer = await ensureCreated();
    await call(activeServer, 'startAdvertising', { advertiseRequest, powerLevel });
    advertising = true;
    return { ok: true };
  };

  const stop = async () => {
    if (closing) {
      await closing;
      return { ok: true, reason: 'closed' };
    }
    if (!server) return { ok: true, reason: 'no_server' };
    await call(server, 'stopAdvertising');
    advertising = false;
    return { ok: true, reason: 'stopped' };
  };

  const close = () => {
    if (closing) return closing;
    const operation = (async () => {
      if (creating) await creating.catch(() => {});
      if (!server) return { ok: true, reason: 'no_server' };
      const activeServer = server;
      let stopError = null;
      if (advertising) {
        try {
          await call(activeServer, 'stopAdvertising');
        } catch (error) {
          stopError = error;
        }
      }
      await call(activeServer, 'close');
      if (server === activeServer) server = null;
      advertising = false;
      return { ok: true, reason: 'closed', stopError };
    })();
    const wrapped = operation.finally(() => {
      if (closing === wrapped) closing = null;
    });
    closing = wrapped;
    return wrapped;
  };

  return {
    ensureCreated,
    start,
    stop,
    close,
    invalidate() {
      server = null;
      creating = null;
      closing = null;
      advertising = false;
    },
    snapshot: () => ({ hasServer: Boolean(server), creating: Boolean(creating), closing: Boolean(closing), advertising })
  };
}
