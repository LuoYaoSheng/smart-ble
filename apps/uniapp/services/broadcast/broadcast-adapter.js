/**
 * Broadcast platform adapter — abstracts start/stop advertising.
 * Pages must not call platform discovery/advertise APIs directly.
 */

export function createBroadcastAdapter(deps = {}) {
  const startAdvertising = deps.startAdvertising;
  const stopAdvertising = deps.stopAdvertising;
  const getPlatformState = deps.getState;
  const platform = deps.platform || 'unknown';

  if (typeof startAdvertising !== 'function') {
    throw new Error('startAdvertising is required');
  }
  if (typeof stopAdvertising !== 'function') {
    throw new Error('stopAdvertising is required');
  }

  let lastState = 'idle';

  return {
    platform,

    async startAdvertising(payload, options = {}) {
      lastState = 'starting';
      try {
        const result = await startAdvertising(payload, options);
        lastState = 'advertising';
        return result ?? { ok: true };
      } catch (error) {
        lastState = 'failed';
        throw error;
      }
    },

    async stopAdvertising(options = {}) {
      lastState = 'stopping';
      try {
        const result = await stopAdvertising(options);
        lastState = 'stopped';
        return result ?? { ok: true };
      } catch (error) {
        lastState = 'failed';
        throw error;
      }
    },

    getState() {
      if (typeof getPlatformState === 'function') {
        return getPlatformState() ?? lastState;
      }
      return lastState;
    },
  };
}

/** In-memory fake adapter for unit/integration tests */
export function createFakeBroadcastAdapter(script = {}) {
  const calls = [];
  let advertising = false;
  const adapter = createBroadcastAdapter({
    platform: script.platform || 'fake',
    async startAdvertising(payload) {
      calls.push({ m: 'start', payload });
      if (script.failStart) throw script.failStart;
      advertising = true;
      script.onStart?.(payload);
      return { ok: true };
    },
    async stopAdvertising() {
      calls.push({ m: 'stop' });
      if (script.failStop) throw script.failStop;
      advertising = false;
      script.onStop?.();
      return { ok: true };
    },
    getState() {
      return advertising ? 'advertising' : 'idle';
    },
  });
  adapter.__calls = calls;
  adapter.__isAdvertising = () => advertising;
  return adapter;
}
