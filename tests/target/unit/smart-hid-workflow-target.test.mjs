// tests/target/unit/smart-hid-workflow-target.test.mjs
// SMART-HID-WORKFLOW-001 — provisioning workflow / token / owner / profile / diagnostic / errors.

import test from 'node:test';
import assert from 'node:assert/strict';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'SMART-HID-WORKFLOW-001';

async function loadWorkflow() {
  const m = await importTarget('apps/uniapp/services/smart-hid/workflow-engine.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  return m.module;
}

async function loadErrors() {
  const m = await importTarget('apps/uniapp/services/smart-hid/errors.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  return m.module;
}

test('1 state transition', async () => {
  const mod = await loadWorkflow();
  const events = [];
  const api = mod.createSmartHidWorkflow({
    discover: async () => ({ deviceId: 'HID-ABCD1234', name: 'SHID-ABCD' }),
    pair: async () => ({ paired: true }),
    verify: async () => ({ verified: true }),
  });
  api.onProvisionEvent((e) => events.push(e.type));
  assert.equal(api.getProvisionState(), 'IDLE');
  await api.startProvision({ token: 'a'.repeat(32) });
  assert.equal(api.getProvisionState(), 'PROVISIONED');
  assert.deepEqual(events, ['discovering', 'pairing', 'verifying', 'success']);
});

test('2 token create', async () => {
  const mod = await loadWorkflow();
  const api = mod.createSmartHidWorkflow({
    discover: async () => ({ deviceId: 'HID-TOK00001' }),
    pair: async () => ({ paired: true }),
    verify: async () => ({ verified: true }),
  });
  const token = 'b'.repeat(32);
  // create happens at start; inspect mid-flight via deps
  let seen = null;
  const mid = mod.createSmartHidWorkflow({
    discover: async () => {
      seen = mid.getToken();
      return { deviceId: 'HID-TOK00001' };
    },
    pair: async () => ({ paired: true }),
    verify: async () => ({ verified: true }),
  });
  await mid.startProvision({ token });
  assert.ok(seen);
  assert.equal(seen.token, token);
  assert.ok(seen.createdAt);
  assert.ok(seen.expiresAt > seen.createdAt);
  assert.equal(mid.getToken(), null); // cleared after success
});

test('3 token expiry', async () => {
  const mod = await loadWorkflow();
  let clock = 1_000_000;
  const api = mod.createSmartHidWorkflow({
    now: () => clock,
    tokenTtlMs: 1000,
    discover: async () => {
      clock += 2000;
      return { deviceId: 'HID-EXP00001' };
    },
    pair: async () => ({ paired: true }),
    verify: async () => ({ verified: true }),
  });
  await assert.rejects(
    () => api.startProvision({ token: 'c'.repeat(32) }),
    (error) => error.code === 'TOKEN_EXPIRED' || error.code === 'HID_TOKEN_EXPIRED',
  );
  assert.equal(api.getProvisionState(), 'FAILED');
});

test('4 token memory only', async () => {
  const mod = await loadWorkflow();
  const api = mod.createSmartHidWorkflow({
    discover: async () => ({ deviceId: 'HID-MEM00001' }),
    pair: async () => ({ paired: true }),
    verify: async () => ({ verified: true }),
  });
  const policy = api.getTokenStoragePolicy();
  assert.equal(policy.memoryOnly, true);
  assert.ok(policy.forbidden.includes('localStorage'));
  assert.ok(policy.forbidden.includes('storage'));
  assert.ok(policy.forbidden.includes('database'));
});

test('5 provisioning success', async () => {
  const mod = await loadWorkflow();
  const api = mod.createSmartHidWorkflow({
    discover: async () => ({ deviceId: 'HID-OK000001', name: 'ok' }),
    pair: async () => ({ paired: true }),
    verify: async () => ({ verified: true, capabilities: ['provisioning'] }),
  });
  const snap = await api.startProvision({ token: 'd'.repeat(32), saveProfile: true });
  assert.equal(snap.state, 'PROVISIONED');
  assert.equal(api.getProfile('HID-OK000001')?.deviceId, 'HID-OK000001');
});

test('6 provisioning cancel', async () => {
  const mod = await loadWorkflow();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const api = mod.createSmartHidWorkflow({
    discover: async () => {
      await gate;
      return { deviceId: 'HID-CAN00001' };
    },
    pair: async () => ({ paired: true }),
    verify: async () => ({ verified: true }),
  });
  const pending = api.startProvision({ token: 'e'.repeat(32) });
  // allow discovering to start
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(api.getProvisionState(), 'DISCOVERING');
  const cancelled = await api.cancelProvision();
  release();
  await pending.catch(() => {});
  assert.equal(cancelled.state, 'CANCELLED');
  assert.equal(api.getProvisionState(), 'CANCELLED');
});

test('7 provisioning failure', async () => {
  const mod = await loadWorkflow();
  const api = mod.createSmartHidWorkflow({
    discover: async () => ({ deviceId: 'HID-FAIL0001' }),
    pair: async () => {
      throw Object.assign(new Error('pair boom'), { code: 'HID_PAIR_FAILED' });
    },
    verify: async () => ({ verified: true }),
  });
  await assert.rejects(() => api.startProvision({ token: 'f'.repeat(32) }), (e) => e.code === 'HID_PAIR_FAILED');
  assert.equal(api.getProvisionState(), 'FAILED');
});

test('8 owner acquire', async () => {
  const mod = await loadWorkflow();
  let ownerDuringPair = null;
  const api = mod.createSmartHidWorkflow({
    discover: async () => ({ deviceId: 'HID-OWN00001' }),
    pair: async () => {
      ownerDuringPair = api.getSessionRegistry().getOwner('HID-OWN00001');
      return { paired: true };
    },
    verify: async () => ({ verified: true }),
  });
  await api.startProvision({ token: '1'.repeat(32) });
  assert.equal(ownerDuringPair?.type, 'WORKFLOW');
});

test('9 owner release', async () => {
  const mod = await loadWorkflow();
  const api = mod.createSmartHidWorkflow({
    discover: async () => ({ deviceId: 'HID-REL00001' }),
    pair: async () => ({ paired: true }),
    verify: async () => ({ verified: true }),
  });
  await api.startProvision({ token: '2'.repeat(32) });
  assert.equal(api.getSessionRegistry().getOwner('HID-REL00001'), null);
});

test('10 profile save', async () => {
  const mod = await loadWorkflow();
  const api = mod.createSmartHidWorkflow();
  const saved = api.saveProfile({
    deviceId: 'HID-PRF00001',
    name: 'Desk',
    capabilities: ['provisioning', 'diagnostics'],
  });
  assert.equal(saved.deviceId, 'HID-PRF00001');
  assert.deepEqual(api.getProfile('HID-PRF00001').capabilities, ['provisioning', 'diagnostics']);
  assert.throws(
    () => api.saveProfile({ deviceId: 'HID-PRF00001', token: 'secret' }),
    (e) => e.code === 'HID_PROFILE_INVALID',
  );
});

test('11 profile remove', async () => {
  const mod = await loadWorkflow();
  const api = mod.createSmartHidWorkflow();
  api.saveProfile({ deviceId: 'HID-RM000001', name: 'x' });
  assert.equal(api.removeProfile('HID-RM000001'), true);
  assert.equal(api.getProfile('HID-RM000001'), null);
});

test('12 diagnostic result', async () => {
  const mod = await loadWorkflow();
  const api = mod.createSmartHidWorkflow({
    discover: async () => ({ deviceId: 'HID-DIA00001' }),
    pair: async () => ({ paired: true }),
    verify: async () => ({ verified: true }),
  });
  await api.startProvision({ token: '3'.repeat(32) });
  // After success owner released but session may remain READY
  const reg = api.getSessionRegistry();
  reg.updateSession('HID-DIA00001', {
    services: [{ uuid: 'svc', characteristics: [{ uuid: 'c1' }] }],
    discovery: { ok: true },
  });
  const result = api.runDiagnostic({ deviceId: 'HID-DIA00001' });
  assert.equal(typeof result.passed, 'boolean');
  assert.ok(Array.isArray(result.items));
  assert.ok(result.items.some((i) => i.key === 'connection'));
  assert.ok(result.items.some((i) => i.key === 'session'));
});

test('13 error model', async () => {
  const err = await loadErrors();
  for (const code of [
    'HID_DEVICE_NOT_FOUND',
    'HID_PAIR_FAILED',
    'HID_TOKEN_EXPIRED',
    'HID_PROFILE_INVALID',
    'HID_SESSION_CONFLICT',
    'HID_TIMEOUT',
  ]) {
    assert.equal(err.HID_ERROR_CODE[code], code);
    const e = err.createHidError(code);
    assert.equal(e.code, code);
    assert.equal(e.details.code, code);
    assert.ok(e.details.message);
  }
  assert.equal(err.HID_ERROR_CODE.TOKEN_EXPIRED, 'TOKEN_EXPIRED');
});
