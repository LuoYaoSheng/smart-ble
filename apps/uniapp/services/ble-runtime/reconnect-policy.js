/**
 * BLE 重连纯策略（有限重连、主动断开不重连、backoff）。
 * reconnect-manager 与 reconnect-state 目标测试共用。
 */

export const MAX_RECONNECT_ATTEMPTS = 3;
export const maxAttempts = MAX_RECONNECT_ATTEMPTS;

export const BACKOFF_MS = Object.freeze([1000, 3000, 5000]);

export const DISCONNECT_REASON = Object.freeze({
  USER_REQUEST: 'USER_REQUEST',
  REMOTE_LOST: 'REMOTE_LOST',
  TIMEOUT: 'TIMEOUT',
  ERROR: 'ERROR',
});

const NO_RECONNECT_REASONS = new Set([
  DISCONNECT_REASON.USER_REQUEST,
  'user-disconnect',
  'USER_REQUEST',
  '主动关闭',
  'BLE 连接已主动关闭',
]);

const RECONNECT_REASONS = new Set([
  DISCONNECT_REASON.REMOTE_LOST,
  DISCONNECT_REASON.TIMEOUT,
  'peer-lost',
  'remote-lost',
  'timeout',
  'TIMEOUT',
]);

function normalizeReason(reason) {
  return String(reason || '').trim();
}

function backoffForAttempt(attempt, backoff = BACKOFF_MS) {
  const index = Math.max(0, Math.min(Number(attempt) || 0, backoff.length - 1));
  return backoff[index];
}

/**
 * @param {{ reason?: string, attempt?: number, maxAttempts?: number, backoffMs?: number[] }} input
 * @returns {{ reconnect: boolean, delay?: number, exhausted?: boolean }}
 */
export function shouldReconnect(input = {}) {
  const reason = normalizeReason(input.reason);
  const attempt = Number(input.attempt) || 0;
  const limit = Number(input.maxAttempts ?? input.max ?? MAX_RECONNECT_ATTEMPTS);
  const backoff = Array.isArray(input.backoffMs) && input.backoffMs.length ? input.backoffMs : BACKOFF_MS;

  if (NO_RECONNECT_REASONS.has(reason)) {
    return { reconnect: false };
  }

  if (attempt >= limit) {
    return { reconnect: false, exhausted: true };
  }

  if (
    RECONNECT_REASONS.has(reason)
    || reason === DISCONNECT_REASON.ERROR
    || reason === 'ERROR'
    || reason.includes('断开')
    || reason.includes('lost')
  ) {
    return { reconnect: true, delay: backoffForAttempt(attempt, backoff) };
  }

  return { reconnect: false };
}

export function reconnectPolicy(input) {
  return shouldReconnect(input);
}

export function getBackoffDelay(attempt, backoffMs = BACKOFF_MS) {
  return backoffForAttempt(attempt, backoffMs);
}
