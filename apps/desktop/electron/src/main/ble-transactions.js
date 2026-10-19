'use strict';

const WRITE_QUEUE_DEPTH = 16;
const WRITE_TIMEOUT_MS = 5000;
const READ_TIMEOUT_MS = 3000;
const CONNECT_TIMEOUT_MS = 10000;

// Callback settlement, cancellation and timer cleanup live together. Late native
// callbacks cannot settle an operation or update a replacement session.
function callbackTransaction(start, { timeoutMs, signal, label = 'BLE operation', onTimeout } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let cleanup;
    let timer;
    const finish = (result) => {
      if (settled) return false;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      cleanup?.();
      resolve(result);
      return true;
    };
    const abort = () => finish({ success: false, error: 'Device disconnected' });
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => {
      if (finish({ success: false, error: `${label} timed out` })) onTimeout?.();
    }, timeoutMs);
    try {
      cleanup = start(finish);
      // A synchronous callback can settle before start returns its cleanup.
      if (settled) cleanup?.();
    } catch (error) { finish({ success: false, error: error.message || String(error) }); }
  });
}

class SessionWriteQueue {
  constructor({ depth = WRITE_QUEUE_DEPTH, timeoutMs = WRITE_TIMEOUT_MS, onTimeout } = {}) {
    this.depth = depth;
    this.timeoutMs = timeoutMs;
    this.onTimeout = onTimeout;
    this.controller = new AbortController();
    this.pending = [];
    this.running = false;
  }
  get signal() { return this.controller.signal; }
  get size() { return this.pending.length + Number(this.running); }
  close() {
    this.controller.abort();
    for (const entry of this.pending.splice(0)) entry.resolve({ success: false, error: 'Device disconnected' });
  }
  write(start) {
    if (this.signal.aborted) return Promise.resolve({ success: false, error: 'Device disconnected' });
    if (this.size >= this.depth) return Promise.resolve({ success: false, error: `Write queue full (${this.depth})` });
    return new Promise((resolve) => { this.pending.push({ start, resolve }); this.drain(); });
  }
  async drain() {
    if (this.running || this.signal.aborted) return;
    const entry = this.pending.shift();
    if (!entry) return;
    this.running = true;
    const result = await callbackTransaction(entry.start, {
      timeoutMs: this.timeoutMs, signal: this.signal, label: 'Write',
      onTimeout: () => { this.close(); this.onTimeout?.(); },
    });
    this.running = false;
    entry.resolve(result);
    this.drain();
  }
}

module.exports = { SessionWriteQueue, callbackTransaction, WRITE_QUEUE_DEPTH, WRITE_TIMEOUT_MS, READ_TIMEOUT_MS, CONNECT_TIMEOUT_MS };
