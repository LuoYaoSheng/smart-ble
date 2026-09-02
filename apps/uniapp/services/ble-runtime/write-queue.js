/**
 * BLE Write Transaction Queue（纯 JS）。
 * - 同 deviceId 串行；不同 device 隔离并行
 * - timeout / cancel / failure 后继续后续
 * - chunkForMtu：ATT 有效载荷 = MTU−3（FEAT-030；非 OTA 分包）
 */

const STATES = Object.freeze({
  PENDING: 'PENDING',
  WRITING: 'WRITING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
  CANCELLED: 'CANCELLED',
});

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_DEPTH = 16;
const DEFAULT_MTU = 23;

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value)) return Uint8Array.from(value.map((b) => Number(b) & 0xff));
  return new Uint8Array(0);
}

/**
 * MTU 分包纯函数：chunkSize = max(1, mtu - 3)；最后一小块保留。
 * @param {Uint8Array|ArrayBuffer|number[]} data
 * @param {number} [mtu=23]
 * @returns {Uint8Array[]}
 */
export function chunkForMtu(data, mtu = DEFAULT_MTU) {
  const bytes = toUint8Array(data);
  const m = Number.isFinite(Number(mtu)) && Number(mtu) >= 23 ? Number(mtu) : DEFAULT_MTU;
  const chunkSize = Math.max(1, m - 3);
  if (!bytes.length) return [];
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(bytes.slice(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return chunks;
}

export const chunkBytes = chunkForMtu;

function errorMessage(error) {
  if (error == null) return null;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || String(error);
  return error.errMsg || error.message || error.code || String(error);
}

function publicTransaction(tx) {
  return {
    id: tx.id,
    deviceId: tx.deviceId,
    serviceId: tx.serviceId,
    characteristicId: tx.characteristicId,
    payload: tx.payload,
    mode: tx.mode,
    priority: tx.priority,
    timeout: tx.timeout,
    retryCount: tx.retryCount,
    attempts: tx.attempts,
    state: tx.state,
    createdAt: tx.createdAt,
    error: tx.error,
    length: tx.payload?.byteLength ?? tx.payload?.length ?? 0,
  };
}

/**
 * @param {{
 *   transport?: (tx: object) => Promise<any>,
 *   defaultTimeout?: number,
 *   maxDepth?: number,
 * }} [options]
 */
export function createWriteQueue(options = {}) {
  const transport = typeof options.transport === 'function'
    ? options.transport
    : async () => {
      throw new Error('write-queue transport not configured');
    };
  const defaultTimeout = Number.isFinite(options.defaultTimeout) ? options.defaultTimeout : DEFAULT_TIMEOUT_MS;
  const maxDepth = Number.isFinite(options.maxDepth) ? options.maxDepth : DEFAULT_MAX_DEPTH;

  /** @type {Map<string, { queue: object[], active: object|null, pumping: boolean }>} */
  const lanes = new Map();
  /** @type {Map<string, object>} */
  const byId = new Map();
  /** @type {Set<Function>} */
  const listeners = new Set();
  let seq = 0;
  let closed = false;

  function emit(type, tx, error = null) {
    const event = {
      type,
      transactionId: tx?.id ?? null,
      deviceId: tx?.deviceId ?? null,
      state: tx?.state ?? null,
      timestamp: Date.now(),
      error: error ? errorMessage(error) : (tx?.error || null),
    };
    for (const cb of [...listeners]) {
      try {
        cb(event);
      } catch {
        /* listener isolation */
      }
    }
    return event;
  }

  function getLane(deviceId) {
    const key = String(deviceId || '');
    if (!lanes.has(key)) {
      lanes.set(key, { queue: [], active: null, pumping: false });
    }
    return lanes.get(key);
  }

  function settle(tx, state, error = null) {
    if (tx._settled) return;
    tx._settled = true;
    tx.state = state;
    if (error) {
      tx.error = errorMessage(error);
      tx.errCode = error?.errCode ?? error?.code ?? null;
    }
    if (tx._timer) {
      clearTimeout(tx._timer);
      tx._timer = null;
    }
    const result = {
      ...publicTransaction(tx),
      ok: state === STATES.SUCCESS,
      errCode: tx.errCode ?? null,
    };
    if (state === STATES.SUCCESS) {
      tx._resolve?.(result);
    } else {
      const err = error instanceof Error ? error : new Error(tx.error || state);
      err.code = state;
      err.errMsg = tx.error;
      if (tx.errCode != null) err.errCode = tx.errCode;
      err.transaction = publicTransaction(tx);
      if (state === STATES.CANCELLED || state === STATES.TIMEOUT || state === STATES.FAILED) {
        tx._resolve?.(result);
      } else {
        tx._reject?.(err);
      }
    }
  }

  function depth() {
    let n = 0;
    for (const lane of lanes.values()) {
      n += lane.queue.length + (lane.active ? 1 : 0);
    }
    return n;
  }

  async function runTransport(tx) {
    tx.state = STATES.WRITING;
    tx.attempts += 1;
    emit('started', tx);

    const timeoutMs = Number.isFinite(tx.timeout) ? tx.timeout : defaultTimeout;
    let timedOut = false;

    const timeoutPromise = new Promise((resolve) => {
      tx._timer = setTimeout(() => {
        timedOut = true;
        resolve({ timedOut: true });
      }, Math.max(0, timeoutMs));
    });

    const work = Promise.resolve()
      .then(() => transport(tx))
      .then((value) => ({ timedOut: false, value }))
      .catch((error) => ({ timedOut: false, error }));

    const outcome = await Promise.race([work, timeoutPromise]);

    if (tx.cancelRequested && tx.state === STATES.WRITING) {
      // Wait for underlying to finish but mark cancelled
      await work.catch(() => {});
      if (tx._timer) clearTimeout(tx._timer);
      settle(tx, STATES.CANCELLED, new Error('CANCELLED'));
      emit('cancelled', tx);
      return;
    }

    if (timedOut || outcome.timedOut) {
      // Underlying may still complete later; ignore after settle
      work.catch(() => {});
      if (tx._timer) clearTimeout(tx._timer);
      settle(tx, STATES.TIMEOUT, new Error('TIMEOUT'));
      emit('timeout', tx, new Error('TIMEOUT'));
      return;
    }

    if (tx._timer) {
      clearTimeout(tx._timer);
      tx._timer = null;
    }

    if (outcome.error) {
      if (tx.retryCount > 0) {
        tx.retryCount -= 1;
        tx.state = STATES.PENDING;
        tx._settled = false;
        const lane = getLane(tx.deviceId);
        lane.queue.unshift(tx);
        emit('queued', tx);
        return;
      }
      settle(tx, STATES.FAILED, outcome.error);
      emit('failed', tx, outcome.error);
      return;
    }

    settle(tx, STATES.SUCCESS);
    emit('success', tx);
  }

  async function pump(deviceId) {
    const lane = getLane(deviceId);
    if (lane.pumping) return;
    lane.pumping = true;
    try {
      while (lane.queue.length && !closed) {
        const tx = lane.queue.shift();
        if (!tx || tx.cancelRequested) {
          if (tx && !tx._settled) {
            settle(tx, STATES.CANCELLED, new Error('CANCELLED'));
            emit('cancelled', tx);
          }
          continue;
        }
        lane.active = tx;
        byId.set(tx.id, tx);
        try {
          await runTransport(tx);
        } finally {
          if (lane.active === tx) lane.active = null;
        }
      }
    } finally {
      lane.pumping = false;
      if (lane.queue.length && !closed) {
        queueMicrotask(() => pump(deviceId));
      }
    }
  }

  function enqueueWrite(partial = {}) {
    if (closed) {
      return {
        id: null,
        promise: Promise.resolve({ ok: false, state: STATES.CANCELLED, error: 'queue closed' }),
        transaction: null,
      };
    }
    if (depth() >= maxDepth) {
      const error = new Error('WRITE_QUEUE_FULL');
      error.code = 'WRITE_QUEUE_FULL';
      return {
        id: null,
        promise: Promise.resolve({ ok: false, state: STATES.FAILED, error: error.message }),
        transaction: null,
      };
    }

    const id = partial.id || `wq-${Date.now().toString(36)}-${++seq}`;
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    // Prevent unhandled rejection if nobody awaits
    promise.catch(() => {});

    const tx = {
      id,
      deviceId: String(partial.deviceId || ''),
      serviceId: partial.serviceId ?? null,
      characteristicId: partial.characteristicId ?? null,
      payload: partial.payload instanceof Uint8Array
        ? partial.payload
        : (partial.payload != null ? toUint8Array(partial.payload) : new Uint8Array(0)),
      rawPayload: partial.rawPayload !== undefined ? partial.rawPayload : partial.payload,
      mode: partial.mode ?? null,
      priority: Number.isFinite(partial.priority) ? partial.priority : 0,
      timeout: Number.isFinite(partial.timeout) ? partial.timeout : defaultTimeout,
      retryCount: Number.isFinite(partial.retryCount) ? Math.max(0, partial.retryCount) : 0,
      attempts: 0,
      state: STATES.PENDING,
      createdAt: Date.now(),
      error: null,
      platformOptions: partial.platformOptions && typeof partial.platformOptions === 'object'
        ? partial.platformOptions
        : {},
      cancelRequested: false,
      _resolve: resolve,
      _reject: reject,
      _settled: false,
      _timer: null,
    };

    byId.set(id, tx);
    const lane = getLane(tx.deviceId);
    // Higher priority first; stable FIFO within same priority
    const idx = lane.queue.findIndex((item) => item.priority < tx.priority);
    if (idx === -1) lane.queue.push(tx);
    else lane.queue.splice(idx, 0, tx);

    emit('queued', tx);
    queueMicrotask(() => pump(tx.deviceId));

    return { id, promise, transaction: publicTransaction(tx) };
  }

  function cancelWrite(id) {
    const tx = byId.get(id);
    if (!tx) return false;
    if (tx.state === STATES.PENDING) {
      const lane = getLane(tx.deviceId);
      lane.queue = lane.queue.filter((item) => item.id !== id);
      settle(tx, STATES.CANCELLED, new Error('CANCELLED'));
      emit('cancelled', tx);
      return true;
    }
    if (tx.state === STATES.WRITING) {
      tx.cancelRequested = true;
      return true;
    }
    return false;
  }

  function cancelDeviceWrites(deviceId) {
    const lane = getLane(deviceId);
    const pending = [...lane.queue];
    lane.queue = [];
    for (const tx of pending) {
      settle(tx, STATES.CANCELLED, new Error('CANCELLED'));
      emit('cancelled', tx);
    }
    if (lane.active) {
      lane.active.cancelRequested = true;
    }
    return pending.length + (lane.active ? 1 : 0);
  }

  /**
   * 断线清理：PENDING → CANCELLED，WRITING → FAILED（不重发）。
   */
  function abortDeviceWrites(deviceId, message = 'DISCONNECTED') {
    const lane = getLane(deviceId);
    const error = new Error(message);
    error.code = 'DISCONNECTED';
    let count = 0;

    const pending = [...lane.queue];
    lane.queue = [];
    for (const tx of pending) {
      settle(tx, STATES.CANCELLED, error);
      emit('cancelled', tx);
      count += 1;
    }

    if (lane.active && !lane.active._settled) {
      const active = lane.active;
      active.cancelRequested = true;
      if (active._timer) {
        clearTimeout(active._timer);
        active._timer = null;
      }
      settle(active, STATES.FAILED, error);
      emit('failed', active, error);
      if (lane.active === active) lane.active = null;
      count += 1;
    }

    return count;
  }

  function clearQueue() {
    let count = 0;
    for (const deviceId of [...lanes.keys()]) {
      count += cancelDeviceWrites(deviceId);
    }
    return count;
  }

  function getQueueState() {
    const devices = {};
    for (const [deviceId, lane] of lanes.entries()) {
      devices[deviceId] = {
        pending: lane.queue.map(publicTransaction),
        active: lane.active ? publicTransaction(lane.active) : null,
        depth: lane.queue.length + (lane.active ? 1 : 0),
      };
    }
    return {
      depth: depth(),
      maxDepth,
      defaultTimeout,
      devices,
      transactions: [...byId.values()].map(publicTransaction),
    };
  }

  function onWriteEvent(callback) {
    if (typeof callback !== 'function') throw new Error('onWriteEvent callback must be a function');
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function close() {
    closed = true;
    clearQueue();
  }

  return {
    enqueueWrite,
    cancelWrite,
    cancelDeviceWrites,
    abortDeviceWrites,
    clearQueue,
    getQueueState,
    onWriteEvent,
    close,
    STATES,
  };
}

export { STATES as WRITE_STATES };
export const WriteQueue = createWriteQueue;
