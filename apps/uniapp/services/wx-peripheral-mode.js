function callWx(platform, method, options = {}) {
  return new Promise((resolve, reject) => {
    const api = platform?.[method];
    if (typeof api !== 'function') {
      reject(new Error(`WeChat platform does not implement ${method}`));
      return;
    }
    api.call(platform, {
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

const isAlreadyOpenedError = (error) => /already opened/i.test(error?.errMsg || error?.message || '');

const createModeError = (code, message, cause) => Object.assign(new Error(message), { code, cause });

export function createWxPeripheralAdapterController({ platform, getConnectedCount = () => 0 }) {
  let ownsAdapter = false;
  let opening = null;
  let releasing = null;
  let releaseRequested = false;

  const closeOwnedAdapter = async () => {
    if (!ownsAdapter) return { ok: true, reason: 'not_owner' };
    if (getConnectedCount() > 0) return { ok: false, reason: 'active_connections' };

    try {
      await callWx(platform, 'closeBluetoothAdapter');
      ownsAdapter = false;
      return { ok: true, reason: 'released' };
    } catch (error) {
      return { ok: false, reason: 'close_failed', error };
    }
  };

  const openOnce = async () => {
    try {
      await callWx(platform, 'openBluetoothAdapter', { mode: 'peripheral' });
    } catch (error) {
      if (!isAlreadyOpenedError(error)) throw error;
      if (getConnectedCount() > 0) {
        throw createModeError('active_connections', '请先断开已连接设备，再使用广播功能。', error);
      }
      await callWx(platform, 'closeBluetoothAdapter');
      await callWx(platform, 'openBluetoothAdapter', { mode: 'peripheral' });
    }

    ownsAdapter = true;
    if (releaseRequested) {
      await closeOwnedAdapter();
      throw createModeError('released_during_open', '外围模式初始化已取消');
    }
    return { ok: true, reused: false };
  };

  const open = () => {
    if (releasing) return releasing.then(() => open());
    if (ownsAdapter) return Promise.resolve({ ok: true, reused: true });
    if (opening) return opening;

    releaseRequested = false;
    opening = openOnce().finally(() => {
      opening = null;
    });
    return opening;
  };

  const release = () => {
    if (releasing) return releasing;
    const operation = (async () => {
      releaseRequested = true;
      if (opening) await opening.catch(() => {});
      return closeOwnedAdapter();
    })();
    const wrapped = operation.finally(() => {
      if (releasing === wrapped) releasing = null;
    });
    releasing = wrapped;
    return wrapped;
  };

  return {
    open,
    release,
    snapshot: () => ({ ownsAdapter, opening: Boolean(opening), releasing: Boolean(releasing), releaseRequested })
  };
}
