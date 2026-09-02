/**
 * Smart HID provisioning workflow engine (pure JS — Node-testable).
 * App code may import via workflow.js; tests import this module directly.
 */

import {
  createSessionRegistry,
  OWNER_TYPE,
  CONNECTION_STATE,
} from '../ble-runtime/session-registry.js';
import { createHidError, HID_ERROR_CODE } from './errors.js';
import {
  PROVISION_STATE,
  PROVISION_EVENT,
  TOKEN_TTL_MS,
  createMemoryTokenStore,
} from './provisioning.js';
import { runDiagnostic } from './diagnostic.js';

export {
  PROVISION_STATE,
  PROVISION_EVENT,
  TOKEN_TTL_MS,
  createMemoryTokenStore,
} from './provisioning.js';
export { HID_ERROR_CODE, createHidError } from './errors.js';
export { runDiagnostic } from './diagnostic.js';

const SENSITIVE_PROFILE_KEYS = Object.freeze([
  'token',
  'wifi_password',
  'wifiPassword',
  'password',
  'mqtt',
  'mqttPassword',
  'mqtt_password',
]);

/**
 * Device Profile store (non-sensitive metadata only).
 * Exported via profile.js as well.
 */
export function createDeviceProfileStore(options = {}) {
  const clock = options.now || (() => Date.now());
  const profiles = new Map();

  function sanitize(input = {}) {
    const id = String(input.deviceId || '').trim();
    if (!id) {
      throw createHidError(HID_ERROR_CODE.HID_PROFILE_INVALID, 'deviceId required');
    }
    for (const key of SENSITIVE_PROFILE_KEYS) {
      if (input[key] != null && String(input[key]).length > 0) {
        throw createHidError(
          HID_ERROR_CODE.HID_PROFILE_INVALID,
          `refusing to store sensitive field: ${key}`,
          { field: key },
        );
      }
    }
    const existing = profiles.get(id);
    const createdAt = existing?.createdAt || Number(input.createdAt) || clock();
    return {
      deviceId: id,
      name: String(input.name || 'Smart HID'),
      capabilities: Array.isArray(input.capabilities)
        ? [...input.capabilities]
        : (input.capabilities ? [String(input.capabilities)] : []),
      createdAt,
      updatedAt: clock(),
    };
  }

  function saveProfile(input) {
    const profile = sanitize(input);
    profiles.set(profile.deviceId, profile);
    return { ...profile, capabilities: [...profile.capabilities] };
  }

  function getProfile(id) {
    const profile = profiles.get(String(id || '').trim());
    return profile
      ? { ...profile, capabilities: [...profile.capabilities] }
      : null;
  }

  function removeProfile(id) {
    return profiles.delete(String(id || '').trim());
  }

  function listProfiles() {
    return [...profiles.values()].map((p) => ({
      ...p,
      capabilities: [...p.capabilities],
    }));
  }

  function clear() {
    profiles.clear();
  }

  return { saveProfile, getProfile, removeProfile, listProfiles, clear };
}

export function classifySmartHidStatus(status) {
  if (!status?.state) return { phase: 'unknown', terminal: false };
  if (status.error) return { phase: 'error', terminal: true, error: status.error };
  if (status.state === 'ready') return { phase: 'ready', terminal: true };
  if (status.state === 'recovery' || status.state === 'error') {
    return { phase: status.state, terminal: true };
  }
  return { phase: status.step || status.state, terminal: false };
}

export function smartHidRecoveryAction(status) {
  const code = typeof status === 'string' ? status : status?.error;
  switch (code) {
    case 'wifi_failed':
    case 'invalid_payload':
      return 'form';
    case 'pairing_invalid':
    case 'pairing_expired':
    case 'pairing_used':
    case 'controlhub_unreachable':
      return 'pairing';
    case 'mqtt_invalid':
      return 'diagnostics';
    default:
      return 'retry';
  }
}

export function describeSmartHidStatus(status) {
  if (!status) return '配网失败';
  if (status.error) return PROVISIONING_ERROR_HINTS[status.error] || `配网失败：${status.error}`;
  if (status.state === 'recovery') return '设备进入恢复模式，请检查配置后重试';
  return `配网未完成（${status.state || 'unknown'}）`;
}

export function createSmartHidStatusWaiters(options = {}) {
  const setTimer = options.setTimer || setTimeout;
  const clearTimer = options.clearTimer || clearTimeout;
  const waiters = new Set();

  const remove = (waiter) => {
    if (!waiters.delete(waiter)) return false;
    clearTimer(waiter.timer);
    return true;
  };

  const waitFor = (predicate, timeoutMs = 60000) => {
    if (typeof predicate !== 'function') throw new Error('status predicate must be a function');
    let waiter;
    const promise = new Promise((resolve, reject) => {
      waiter = { predicate, resolve, reject, timer: null };
      waiter.timer = setTimer(() => {
        if (!remove(waiter)) return;
        reject(new Error(`等待设备状态超时（${timeoutMs}ms）`));
      }, timeoutMs);
      waiters.add(waiter);
    });
    promise.cancel = (reason = '等待已取消') => {
      if (!remove(waiter)) return;
      waiter.reject(new Error(reason));
    };
    promise.catch(() => {});
    return promise;
  };

  const emit = (status) => {
    for (const waiter of [...waiters]) {
      let matched = false;
      try {
        matched = waiter.predicate(status);
      } catch {
        matched = false;
      }
      if (!matched || !remove(waiter)) continue;
      waiter.resolve(status);
    }
  };

  const failAll = (reason) => {
    for (const waiter of [...waiters]) {
      if (!remove(waiter)) continue;
      waiter.reject(new Error(reason));
    }
  };

  return {
    waitFor,
    emit,
    failAll,
    get size() {
      return waiters.size;
    }
  };
}

const WORKFLOW_OWNER = Object.freeze({
  type: OWNER_TYPE.WORKFLOW,
  id: 'smart-hid-provision',
});

function normalizeOwner(owner) {
  if (!owner) return { ...WORKFLOW_OWNER };
  if (typeof owner === 'string') return { type: owner, id: owner };
  return {
    type: owner.type || OWNER_TYPE.WORKFLOW,
    id: owner.id || 'smart-hid-provision',
  };
}

/**
 * Smart HID first-party provisioning workflow.
 *
 * API: startProvision / cancelProvision / getProvisionState / onProvisionEvent
 */
export function createSmartHidWorkflow(deps = {}) {
  const now = deps.now || (() => Date.now());
  const sessionRegistry = deps.sessionRegistry || createSessionRegistry();
  const tokenStore = deps.tokenStore || createMemoryTokenStore({ now, ttlMs: deps.tokenTtlMs });
  const profileStore = deps.profileStore || createDeviceProfileStore({ now });
  const workflowOwner = normalizeOwner(deps.owner || WORKFLOW_OWNER);

  const discover = deps.discover || (async (input) => {
    if (!input?.deviceId) {
      throw createHidError(HID_ERROR_CODE.HID_DEVICE_NOT_FOUND, 'deviceId required for discover');
    }
    return { deviceId: input.deviceId, name: input.name || 'Smart HID' };
  });

  const pair = deps.pair || (async (ctx) => ({
    deviceId: ctx.deviceId,
    paired: true,
  }));

  const verify = deps.verify || (async (ctx) => ({
    deviceId: ctx.deviceId,
    verified: true,
    product: 'smart-hid',
  }));

  let state = PROVISION_STATE.IDLE;
  let deviceId = null;
  let lastError = null;
  let lastResult = null;
  let cancelRequested = false;
  let generation = 0;
  const listeners = new Set();

  function snapshot() {
    return {
      state,
      deviceId,
      owner: deviceId ? sessionRegistry.getOwner(deviceId) : null,
      token: tokenStore.get(),
      lastError,
      lastResult,
    };
  }

  function emitEvent(type, payload = {}) {
    const event = { type, state, ...payload, at: now() };
    for (const listener of listeners) {
      try { listener(event); } catch { /* ignore */ }
    }
  }

  function setState(next) {
    state = next;
  }

  function onProvisionEvent(listener) {
    if (typeof listener !== 'function') throw new Error('listener must be a function');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getProvisionState() {
    return state;
  }

  function getToken() {
    return tokenStore.get();
  }

  function getTokenStoragePolicy() {
    return tokenStore.storagePolicy();
  }

  function acquireSession(id, partial = {}) {
    const existing = sessionRegistry.getSession(id);
    if (
      existing?.owner
      && existing.owner.type
      && (existing.owner.type !== workflowOwner.type || existing.owner.id !== workflowOwner.id)
      && existing.connectionState !== CONNECTION_STATE.DISCONNECTED
      && existing.connectionState !== CONNECTION_STATE.FAILED
    ) {
      throw createHidError(
        HID_ERROR_CODE.HID_SESSION_CONFLICT,
        'session owned by another owner',
        { owner: existing.owner, requested: workflowOwner },
      );
    }
    const session = sessionRegistry.registerProvisioning(id, {
      ...partial,
      connectionState: CONNECTION_STATE.CONNECTING,
      owner: workflowOwner,
      provisioning: true,
    });
    sessionRegistry.setOwner(id, workflowOwner);
    sessionRegistry.markProvisioning(id, true);
    return session;
  }

  function releaseOwner(id = deviceId) {
    if (!id) return false;
    const owner = sessionRegistry.getOwner(id);
    if (owner && owner.type === workflowOwner.type && owner.id === workflowOwner.id) {
      sessionRegistry.setOwner(id, null);
    }
    sessionRegistry.markProvisioning(id, false);
    return true;
  }

  function borrowSession(id, borrower) {
    if (!id) return false;
    const pageOwner = typeof borrower === 'string'
      ? { type: OWNER_TYPE.PAGE, id: borrower }
      : (borrower || { type: OWNER_TYPE.PAGE, id: 'page' });
    return sessionRegistry.borrowReference(id, pageOwner);
  }

  function releaseBorrow(id, borrower) {
    if (!id) return false;
    const pageOwner = typeof borrower === 'string'
      ? { type: OWNER_TYPE.PAGE, id: borrower }
      : (borrower || { type: OWNER_TYPE.PAGE, id: 'page' });
    return sessionRegistry.releaseReference(id, pageOwner);
  }

  async function startProvision(input = {}) {
    if (
      state === PROVISION_STATE.DISCOVERING
      || state === PROVISION_STATE.PAIRING
      || state === PROVISION_STATE.VERIFYING
    ) {
      throw createHidError(
        HID_ERROR_CODE.HID_SESSION_CONFLICT,
        'provisioning already in progress',
        { state },
      );
    }

    cancelRequested = false;
    lastError = null;
    lastResult = null;
    const runId = ++generation;

    const tokenValue = input.token || input.pairingToken;
    if (tokenValue) {
      tokenStore.create(tokenValue);
    } else if (!tokenStore.get()) {
      // allow discover-only starts without token when tests inject later
      tokenStore.create(`auto-${now().toString(16).padStart(32, '0').slice(-32)}`);
    }

    try {
      tokenStore.assertValid();

      setState(PROVISION_STATE.DISCOVERING);
      emitEvent(PROVISION_EVENT.discovering, { input });
      if (cancelRequested || runId !== generation) {
        return finalizeCancel();
      }

      const discovered = await discover(input);
      if (!discovered?.deviceId) {
        throw createHidError(HID_ERROR_CODE.HID_DEVICE_NOT_FOUND, 'discover returned no device');
      }
      deviceId = discovered.deviceId;
      acquireSession(deviceId, {
        deviceInfo: discovered,
        connectionState: CONNECTION_STATE.CONNECTING,
      });

      if (cancelRequested || runId !== generation) {
        releaseOwner(deviceId);
        return finalizeCancel();
      }

      setState(PROVISION_STATE.PAIRING);
      emitEvent(PROVISION_EVENT.pairing, { deviceId });
      tokenStore.assertValid();
      sessionRegistry.updateSession(deviceId, { connectionState: CONNECTION_STATE.CONNECTED });
      const paired = await pair({ ...input, ...discovered, deviceId, token: tokenStore.get() });
      if (paired?.paired === false) {
        throw createHidError(HID_ERROR_CODE.HID_PAIR_FAILED, 'pair step returned paired=false');
      }

      if (cancelRequested || runId !== generation) {
        releaseOwner(deviceId);
        return finalizeCancel();
      }

      setState(PROVISION_STATE.VERIFYING);
      emitEvent(PROVISION_EVENT.verifying, { deviceId });
      tokenStore.assertValid();
      sessionRegistry.updateSession(deviceId, { connectionState: CONNECTION_STATE.DISCOVERING });
      const verified = await verify({ ...input, ...discovered, ...paired, deviceId });
      if (verified?.verified === false) {
        throw createHidError(HID_ERROR_CODE.HID_PAIR_FAILED, 'verify step failed');
      }

      if (cancelRequested || runId !== generation) {
        releaseOwner(deviceId);
        return finalizeCancel();
      }

      sessionRegistry.updateSession(deviceId, {
        connectionState: CONNECTION_STATE.READY,
        deviceInfo: { ...(discovered || {}), ...(verified || {}) },
      });

      if (input.saveProfile !== false) {
        profileStore.saveProfile({
          deviceId,
          name: discovered.name || verified?.name || 'Smart HID',
          capabilities: verified?.capabilities || ['provisioning'],
        });
      }

      releaseOwner(deviceId);
      tokenStore.clear();
      setState(PROVISION_STATE.PROVISIONED);
      lastResult = { deviceId, discovered, paired, verified };
      emitEvent(PROVISION_EVENT.success, { deviceId, result: lastResult });
      return snapshot();
    } catch (error) {
      if (cancelRequested || runId !== generation) {
        releaseOwner(deviceId);
        return finalizeCancel();
      }
      const hidError = error?.code
        ? error
        : createHidError(HID_ERROR_CODE.HID_PAIR_FAILED, error?.message || 'provision failed');
      lastError = {
        code: hidError.code,
        message: hidError.message,
        details: hidError.details || { code: hidError.code, message: hidError.message },
      };
      releaseOwner(deviceId);
      tokenStore.clear();
      setState(PROVISION_STATE.FAILED);
      emitEvent(PROVISION_EVENT.failed, { error: lastError, deviceId });
      throw hidError;
    }
  }

  function finalizeCancel() {
    releaseOwner(deviceId);
    tokenStore.clear();
    setState(PROVISION_STATE.CANCELLED);
    emitEvent(PROVISION_EVENT.cancelled, { deviceId });
    return snapshot();
  }

  async function cancelProvision() {
    if (
      state === PROVISION_STATE.IDLE
      || state === PROVISION_STATE.PROVISIONED
      || state === PROVISION_STATE.FAILED
      || state === PROVISION_STATE.CANCELLED
    ) {
      if (state !== PROVISION_STATE.CANCELLED) {
        setState(PROVISION_STATE.CANCELLED);
        emitEvent(PROVISION_EVENT.cancelled, { deviceId });
      }
      tokenStore.clear();
      releaseOwner(deviceId);
      return snapshot();
    }
    cancelRequested = true;
    generation += 1;
    return finalizeCancel();
  }

  function saveProfile(input) {
    return profileStore.saveProfile(input);
  }

  function getProfile(id) {
    return profileStore.getProfile(id);
  }

  function removeProfile(id) {
    return profileStore.removeProfile(id);
  }

  function diagnostic(input = {}) {
    const session = sessionRegistry.getSession(input.deviceId || deviceId);
    return runDiagnostic({
      session: session ? {
        deviceId: session.deviceId,
        connectionState: session.connectionState,
        services: session.services,
        characteristics: session.characteristics,
        discovery: session.discovery,
      } : null,
      connection: {
        connected: Boolean(session && session.connectionState !== CONNECTION_STATE.DISCONNECTED),
        deviceId: session?.deviceId || deviceId,
        owner: session?.owner,
      },
      ...input,
    });
  }

  return {
    startProvision,
    cancelProvision,
    getProvisionState,
    onProvisionEvent,
    getToken,
    getTokenStoragePolicy,
    acquireSession,
    releaseOwner,
    borrowSession,
    releaseBorrow,
    saveProfile,
    getProfile,
    removeProfile,
    runDiagnostic: diagnostic,
    getSessionRegistry: () => sessionRegistry,
    getSnapshot: snapshot,
    WORKFLOW_OWNER: workflowOwner,
  };
}
