/**
 * BLE Reconnect Manager — 纯 JS；调度有限重连、backoff、Session/Queue 协同。
 */

import {
  shouldReconnect,
  MAX_RECONNECT_ATTEMPTS,
  BACKOFF_MS,
  DISCONNECT_REASON,
} from './reconnect-policy.js';

export const RECONNECT_TX_STATE = Object.freeze({
  IDLE: 'IDLE',
  SCHEDULED: 'SCHEDULED',
  RECONNECTING: 'RECONNECTING',
  SUCCESS: 'SUCCESS',
  EXHAUSTED: 'EXHAUSTED',
  CANCELLED: 'CANCELLED',
});

export { DISCONNECT_REASON, MAX_RECONNECT_ATTEMPTS, BACKOFF_MS };

function cloneTx(tx) {
  if (!tx) return null;
  return {
    deviceId: tx.deviceId,
    attempt: tx.attempt,
    maxAttempts: tx.maxAttempts,
    reason: tx.reason,
    state: tx.state,
    nextDelay: tx.nextDelay,
    createdAt: tx.createdAt,
    connectOptions: tx.connectOptions ? { ...tx.connectOptions } : {},
  };
}

/**
 * @param {{
 *   maxAttempts?: number,
 *   backoffMs?: number[],
 *   getSession?: (deviceId: string) => any,
 *   updateSession?: (deviceId: string, patch: object) => any,
 *   connect?: (deviceId: string, options?: object) => Promise<any>,
 *   onQueueDisconnect?: (deviceId: string, reason?: string) => void,
 *   shouldReconnect?: typeof shouldReconnect,
 *   now?: () => number,
 *   setTimeout?: typeof setTimeout,
 *   clearTimeout?: typeof clearTimeout,
 * }} [options]
 */
export function createReconnectManager(options = {}) {
  const maxAttempts = Number.isFinite(options.maxAttempts) ? options.maxAttempts : MAX_RECONNECT_ATTEMPTS;
  const backoffMs = Array.isArray(options.backoffMs) && options.backoffMs.length ? options.backoffMs : BACKOFF_MS;
  const now = options.now ?? (() => Date.now());
  const scheduleTimer = options.setTimeout ?? setTimeout;
  const clearTimerFn = options.clearTimeout ?? clearTimeout;
  const getSession = options.getSession ?? (() => null);
  const updateSession = options.updateSession ?? (() => null);
  const connect = options.connect ?? (async () => { throw new Error('connect not configured'); });
  const onQueueDisconnect = options.onQueueDisconnect ?? (() => {});
  const policy = options.shouldReconnect ?? shouldReconnect;

  /** @type {Map<string, object>} */
  const transactions = new Map();
  /** @type {Map<string, ReturnType<typeof setTimeout>>} */
  const timers = new Map();

  function syncRegistryReconnectState(deviceId, reconnectState) {
    updateSession(deviceId, { reconnectState });
  }

  function delayForAttempt(attempt) {
    return backoffMs[Math.max(0, Math.min(attempt, backoffMs.length - 1))];
  }

  function clearTimer(deviceId) {
    const timer = timers.get(deviceId);
    if (timer != null) clearTimerFn(timer);
    timers.delete(deviceId);
  }

  function scheduleReconnect(deviceId, opts = {}) {
    if (!deviceId) throw new Error('deviceId is required');

    const reason = opts.reason ?? opts.disconnectReason ?? DISCONNECT_REASON.REMOTE_LOST;
    const policyResult = policy({ reason, attempt: opts.attempt ?? transactions.get(deviceId)?.attempt ?? 0, maxAttempts, backoffMs });
    if (!policyResult.reconnect) {
      const exhaustedTx = {
        deviceId,
        attempt: opts.attempt ?? transactions.get(deviceId)?.attempt ?? maxAttempts,
        maxAttempts,
        reason,
        state: RECONNECT_TX_STATE.EXHAUSTED,
        nextDelay: 0,
        createdAt: now(),
        connectOptions: opts.connectOptions ?? transactions.get(deviceId)?.connectOptions ?? {},
      };
      transactions.set(deviceId, exhaustedTx);
      syncRegistryReconnectState(deviceId, 'EXHAUSTED');
      return cloneTx(exhaustedTx);
    }

    let tx = transactions.get(deviceId);
    if (!tx) {
      tx = {
        deviceId,
        attempt: Number(opts.attempt) || 0,
        maxAttempts,
        reason,
        state: RECONNECT_TX_STATE.IDLE,
        nextDelay: delayForAttempt(0),
        createdAt: now(),
        connectOptions: opts.connectOptions ?? {},
      };
    } else {
      tx.reason = reason;
      if (opts.connectOptions) tx.connectOptions = { ...opts.connectOptions };
      if (tx.state === RECONNECT_TX_STATE.RECONNECTING) return cloneTx(tx);
    }

    tx.state = RECONNECT_TX_STATE.SCHEDULED;
    tx.nextDelay = policyResult.delay ?? delayForAttempt(tx.attempt);
    transactions.set(deviceId, tx);
    syncRegistryReconnectState(deviceId, 'SCHEDULED');
    onQueueDisconnect(deviceId, reason);

    clearTimer(deviceId);
    const timer = scheduleTimer(() => {
      executeReconnect(deviceId).catch(() => {});
    }, tx.nextDelay);
    timers.set(deviceId, timer);

    return cloneTx(tx);
  }

  async function executeReconnect(deviceId) {
    const tx = transactions.get(deviceId);
    if (!tx || tx.state === RECONNECT_TX_STATE.CANCELLED) return null;

    if (tx.reason === DISCONNECT_REASON.USER_REQUEST || tx.reason === 'user-disconnect') {
      cancelReconnect(deviceId);
      return null;
    }

    const session = getSession(deviceId);
    if (session && !session.owner) {
      cancelReconnect(deviceId);
      return null;
    }

    tx.state = RECONNECT_TX_STATE.RECONNECTING;
    syncRegistryReconnectState(deviceId, 'RECONNECTING');
    updateSession(deviceId, { connectionState: 'CONNECTING' });

    try {
      await connect(deviceId, { ...(tx.connectOptions || {}), reconnect: true });
      tx.state = RECONNECT_TX_STATE.SUCCESS;
      tx.attempt = 0;
      syncRegistryReconnectState(deviceId, 'SUCCESS');
      updateSession(deviceId, { connectionState: 'READY', disconnectReason: null });
      const result = cloneTx(tx);
      clearReconnect(deviceId);
      return result;
    } catch (error) {
      tx.attempt += 1;
      if (tx.attempt >= maxAttempts) {
        tx.state = RECONNECT_TX_STATE.EXHAUSTED;
        syncRegistryReconnectState(deviceId, 'EXHAUSTED');
        clearTimer(deviceId);
        return cloneTx(tx);
      }

      tx.state = RECONNECT_TX_STATE.SCHEDULED;
      tx.nextDelay = delayForAttempt(tx.attempt);
      syncRegistryReconnectState(deviceId, 'SCHEDULED');
      clearTimer(deviceId);
      const timer = scheduleTimer(() => {
        executeReconnect(deviceId).catch(() => {});
      }, tx.nextDelay);
      timers.set(deviceId, timer);
      return cloneTx(tx);
    }
  }

  function cancelReconnect(deviceId) {
    clearTimer(deviceId);
    const tx = transactions.get(deviceId);
    if (tx) tx.state = RECONNECT_TX_STATE.CANCELLED;
    syncRegistryReconnectState(deviceId, 'NONE');
  }

  function clearReconnect(deviceId) {
    clearTimer(deviceId);
    transactions.delete(deviceId);
  }

  function getReconnectState(deviceId) {
    return cloneTx(transactions.get(deviceId));
  }

  function reset() {
    for (const deviceId of [...timers.keys()]) clearTimer(deviceId);
    transactions.clear();
  }

  return {
    scheduleReconnect,
    cancelReconnect,
    executeReconnect,
    getReconnectState,
    clearReconnect,
    reset,
    RECONNECT_TX_STATE,
    DISCONNECT_REASON,
  };
}

let defaultManager = null;

export function getReconnectManager() {
  if (!defaultManager) defaultManager = createReconnectManager();
  return defaultManager;
}

export function resetReconnectManagerForTesting() {
  defaultManager?.reset();
  defaultManager = null;
}
