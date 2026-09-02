/**
 * Broadcast Session — single-owner advertising workflow (pure JS).
 */

import { buildBroadcastPayload, assertBroadcastPayload, PAYLOAD_ERROR } from './payload-builder.js';
import { createBroadcastAdapter } from './broadcast-adapter.js';
import { matchObserverEvidence } from './observer-evidence-adapter.js';

export const BROADCAST_STATE = Object.freeze({
  IDLE: 'IDLE',
  STARTING: 'STARTING',
  ADVERTISING: 'ADVERTISING',
  STOPPING: 'STOPPING',
  STOPPED: 'STOPPED',
  FAILED: 'FAILED',
});

export const BROADCAST_OWNER = Object.freeze({
  PAGE: 'PAGE',
  WORKFLOW: 'WORKFLOW',
  SYSTEM: 'SYSTEM',
});

export const BROADCAST_ERROR = Object.freeze({
  OWNER_BUSY: 'OWNER_BUSY',
  OWNER_MISMATCH: 'OWNER_MISMATCH',
  NOT_ADVERTISING: 'NOT_ADVERTISING',
  ADAPTER_FAILED: 'ADAPTER_FAILED',
  ...PAYLOAD_ERROR,
});

function createError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = { code, message, ...details };
  return error;
}

function normalizeOwner(owner) {
  if (!owner) return { type: BROADCAST_OWNER.PAGE, id: 'default' };
  if (typeof owner === 'string') return { type: owner, id: owner };
  return {
    type: owner.type || BROADCAST_OWNER.PAGE,
    id: owner.id || owner.type || 'default',
  };
}

function sameOwner(a, b) {
  if (!a || !b) return false;
  return a.type === b.type && String(a.id) === String(b.id);
}

export function createBroadcastSession(deps = {}) {
  const adapter = deps.adapter || createBroadcastAdapter({
    startAdvertising: async () => ({}),
    stopAdvertising: async () => ({}),
  });

  let session = {
    state: BROADCAST_STATE.IDLE,
    owner: null,
    payload: null,
    startedAt: null,
    stoppedAt: null,
    platform: adapter.platform || 'unknown',
    lastError: null,
    lastEvidence: null,
  };

  const listeners = new Set();

  function emit() {
    const snap = getSession();
    for (const listener of listeners) {
      try { listener(snap); } catch { /* ignore */ }
    }
  }

  function getSession() {
    return {
      state: session.state,
      owner: session.owner ? { ...session.owner } : null,
      payload: session.payload ? { ...session.payload } : null,
      startedAt: session.startedAt,
      stoppedAt: session.stoppedAt,
      platform: session.platform,
      lastError: session.lastError,
      lastEvidence: session.lastEvidence,
    };
  }

  function getBroadcastState() {
    return session.state;
  }

  function getBroadcastPayload() {
    return session.payload ? { ...session.payload } : null;
  }

  function updatePayload(input, options = {}) {
    if (session.state === BROADCAST_STATE.ADVERTISING || session.state === BROADCAST_STATE.STARTING) {
      throw createError(
        BROADCAST_ERROR.OWNER_BUSY,
        'cannot update payload while advertising',
        { state: session.state },
      );
    }
    const payload = buildBroadcastPayload(input, options);
    session.payload = payload;
    emit();
    return payload;
  }

  async function startBroadcast(input, options = {}) {
    const owner = normalizeOwner(options.owner);
    if (
      session.owner
      && (session.state === BROADCAST_STATE.ADVERTISING || session.state === BROADCAST_STATE.STARTING)
      && !sameOwner(session.owner, owner)
    ) {
      throw createError(
        BROADCAST_ERROR.OWNER_BUSY,
        `broadcast owned by ${session.owner.type}:${session.owner.id}`,
        { owner: session.owner },
      );
    }
    if (session.state === BROADCAST_STATE.ADVERTISING && sameOwner(session.owner, owner)) {
      throw createError(
        BROADCAST_ERROR.OWNER_BUSY,
        'duplicate start rejected',
        { owner: session.owner, state: session.state },
      );
    }

    const payload = input?.valid != null && input?.normalized
      ? input
      : assertBroadcastPayload(input || session.payload?.normalized || {}, options.payloadOptions || {});

    if (!payload.valid) {
      throw payload.error || createError(
        BROADCAST_ERROR.PAYLOAD_TOO_LARGE,
        payload.errors?.[0] || 'invalid payload',
      );
    }

    session.state = BROADCAST_STATE.STARTING;
    session.owner = owner;
    session.payload = payload;
    session.lastError = null;
    emit();

    try {
      await adapter.startAdvertising(payload, options);
      session.state = BROADCAST_STATE.ADVERTISING;
      session.startedAt = Date.now();
      session.stoppedAt = null;
      emit();
      return getSession();
    } catch (error) {
      session.state = BROADCAST_STATE.FAILED;
      session.lastError = {
        code: error?.code || BROADCAST_ERROR.ADAPTER_FAILED,
        message: error?.message || String(error),
      };
      session.owner = null;
      emit();
      throw createError(
        session.lastError.code,
        session.lastError.message,
        { cause: error },
      );
    }
  }

  async function stopBroadcast(options = {}) {
    const owner = options.owner ? normalizeOwner(options.owner) : session.owner;
    if (
      session.state !== BROADCAST_STATE.ADVERTISING
      && session.state !== BROADCAST_STATE.STARTING
      && session.state !== BROADCAST_STATE.FAILED
    ) {
      if (session.state === BROADCAST_STATE.STOPPED || session.state === BROADCAST_STATE.IDLE) {
        return getSession();
      }
      throw createError(
        BROADCAST_ERROR.NOT_ADVERTISING,
        `cannot stop from state ${session.state}`,
        { state: session.state },
      );
    }

    if (session.owner && owner && !sameOwner(session.owner, owner) && !options.force) {
      throw createError(
        BROADCAST_ERROR.OWNER_MISMATCH,
        'only owner can stop broadcast',
        { owner: session.owner, requester: owner },
      );
    }

    session.state = BROADCAST_STATE.STOPPING;
    emit();
    try {
      await adapter.stopAdvertising(options);
      session.state = BROADCAST_STATE.STOPPED;
      session.stoppedAt = Date.now();
      session.owner = null;
      emit();
      return getSession();
    } catch (error) {
      session.state = BROADCAST_STATE.FAILED;
      session.lastError = {
        code: error?.code || BROADCAST_ERROR.ADAPTER_FAILED,
        message: error?.message || String(error),
      };
      emit();
      throw error;
    }
  }

  async function cleanup(options = {}) {
    if (
      session.state === BROADCAST_STATE.ADVERTISING
      || session.state === BROADCAST_STATE.STARTING
      || session.state === BROADCAST_STATE.STOPPING
    ) {
      await stopBroadcast({ ...options, force: true }).catch(() => {});
    }
    session.owner = null;
    if (session.state !== BROADCAST_STATE.FAILED) {
      session.state = BROADCAST_STATE.IDLE;
    }
    emit();
    return getSession();
  }

  function ingestObserverEvent(observerEvent) {
    const evidence = matchObserverEvidence(observerEvent, session.payload);
    session.lastEvidence = evidence;
    emit();
    return evidence;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new Error('listener must be a function');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    startBroadcast,
    stopBroadcast,
    getBroadcastState,
    updatePayload,
    getBroadcastPayload,
    getSession,
    cleanup,
    ingestObserverEvent,
    subscribe,
    BROADCAST_STATE,
    BROADCAST_OWNER,
  };
}

export {
  buildBroadcastPayload,
  assertBroadcastPayload,
  PAYLOAD_ERROR,
  createBroadcastAdapter,
  matchObserverEvidence,
};
