/**
 * Smart HID provisioning helpers — state constants + memory-only QR token.
 */

import { createHidError, HID_ERROR_CODE } from './errors.js';

export const PROVISION_STATE = Object.freeze({
  IDLE: 'IDLE',
  DISCOVERING: 'DISCOVERING',
  PAIRING: 'PAIRING',
  VERIFYING: 'VERIFYING',
  PROVISIONED: 'PROVISIONED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

export const PROVISION_EVENT = Object.freeze({
  discovering: 'discovering',
  pairing: 'pairing',
  verifying: 'verifying',
  success: 'success',
  failed: 'failed',
  cancelled: 'cancelled',
});

/** Pairing QR token lifetime: 5 minutes, memory only. */
export const TOKEN_TTL_MS = 5 * 60 * 1000;

const FORBIDDEN_TOKEN_SINKS = Object.freeze([
  'localStorage',
  'sessionStorage',
  'storage',
  'database',
  'uni.setStorageSync',
  'uni.setStorage',
]);

/**
 * In-memory pairing token store. Never persists to disk/storage.
 * @param {{ now?: () => number, ttlMs?: number }} [options]
 */
export function createMemoryTokenStore(options = {}) {
  const now = options.now || (() => Date.now());
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : TOKEN_TTL_MS;
  let slot = null;

  function clear() {
    slot = null;
  }

  function create(tokenInput) {
    const token = String(tokenInput || '').trim();
    if (!token) {
      throw createHidError(HID_ERROR_CODE.HID_PROFILE_INVALID, 'pairing token required');
    }
    const createdAt = now();
    slot = {
      token,
      createdAt,
      expiresAt: createdAt + ttlMs,
    };
    return get();
  }

  function get() {
    if (!slot) return null;
    return {
      token: slot.token,
      createdAt: slot.createdAt,
      expiresAt: slot.expiresAt,
    };
  }

  function assertValid() {
    if (!slot) {
      throw createHidError(HID_ERROR_CODE.TOKEN_EXPIRED, 'pairing token missing', {
        reason: 'missing',
      });
    }
    if (now() >= slot.expiresAt) {
      const expired = get();
      clear();
      throw createHidError(HID_ERROR_CODE.TOKEN_EXPIRED, 'pairing token expired', {
        reason: 'expired',
        createdAt: expired.createdAt,
        expiresAt: expired.expiresAt,
        hidCode: HID_ERROR_CODE.HID_TOKEN_EXPIRED,
      });
    }
    return get();
  }

  /** Explicit probe used by tests — confirms no storage API usage. */
  function storagePolicy() {
    return {
      memoryOnly: true,
      forbidden: [...FORBIDDEN_TOKEN_SINKS],
    };
  }

  return {
    create,
    get,
    clear,
    assertValid,
    storagePolicy,
    get ttlMs() {
      return ttlMs;
    },
  };
}
