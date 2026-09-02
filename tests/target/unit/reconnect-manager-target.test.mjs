// tests/target/unit/reconnect-manager-target.test.mjs
// RUNTIME-RECONNECT-001：Reconnect Manager 单元覆盖。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'RUNTIME-RECONNECT-001 reconnect-manager';

async function loadManager() {
  const m = await importTarget('apps/uniapp/services/ble-runtime/reconnect-manager.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  return m.module;
}

test('1 schedule', async () => {
  const { createReconnectManager, RECONNECT_TX_STATE, DISCONNECT_REASON } = await loadManager();
  const updates = [];
  const mgr = createReconnectManager({
    setTimeout: () => 1,
    clearTimeout: () => {},
    updateSession: (id, patch) => updates.push({ id, patch }),
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
  });
  const tx = mgr.scheduleReconnect('D1', { reason: DISCONNECT_REASON.REMOTE_LOST });
  assert.equal(tx.state, RECONNECT_TX_STATE.SCHEDULED);
  assert.ok(updates.some((u) => u.patch.reconnectState === 'SCHEDULED'));
});

test('2 attempt count', async () => {
  const { createReconnectManager } = await loadManager();
  let attempt = 0;
  const mgr = createReconnectManager({
    maxAttempts: 3,
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    connect: async () => {
      attempt += 1;
      throw new Error('fail');
    },
    updateSession: () => {},
  });
  mgr.scheduleReconnect('D2', { reason: 'peer-lost' });
  await mgr.executeReconnect('D2');
  assert.equal(attempt, 1);
  assert.equal(mgr.getReconnectState('D2').attempt, 1);
});

test('3 backoff 1s', async () => {
  const { createReconnectManager } = await loadManager();
  const mgr = createReconnectManager({
    backoffMs: [1000, 3000, 5000],
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    updateSession: () => {},
  });
  const tx = mgr.scheduleReconnect('D3', { reason: 'peer-lost', attempt: 0 });
  assert.equal(tx.nextDelay, 1000);
});

test('4 backoff 3s', async () => {
  const { createReconnectManager } = await loadManager();
  const mgr = createReconnectManager({
    backoffMs: [1000, 3000, 5000],
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    updateSession: () => {},
  });
  const tx = mgr.scheduleReconnect('D4', { reason: 'peer-lost', attempt: 1 });
  assert.equal(tx.nextDelay, 3000);
});

test('5 backoff 5s', async () => {
  const { createReconnectManager } = await loadManager();
  const mgr = createReconnectManager({
    backoffMs: [1000, 3000, 5000],
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    updateSession: () => {},
  });
  const tx = mgr.scheduleReconnect('D5', { reason: 'peer-lost', attempt: 2 });
  assert.equal(tx.nextDelay, 5000);
});

test('6 success reset', async () => {
  const { createReconnectManager, RECONNECT_TX_STATE } = await loadManager();
  const mgr = createReconnectManager({
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    connect: async () => ({ deviceId: 'D6' }),
    updateSession: () => {},
  });
  mgr.scheduleReconnect('D6', { reason: 'peer-lost' });
  const result = await mgr.executeReconnect('D6');
  assert.equal(result.state, RECONNECT_TX_STATE.SUCCESS);
  assert.equal(mgr.getReconnectState('D6'), null);
});

test('7 exhausted', async () => {
  const { createReconnectManager, RECONNECT_TX_STATE } = await loadManager();
  const mgr = createReconnectManager({
    maxAttempts: 3,
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    connect: async () => { throw new Error('fail'); },
    updateSession: () => {},
  });
  mgr.scheduleReconnect('D7', { reason: 'peer-lost' });
  await mgr.executeReconnect('D7');
  await mgr.executeReconnect('D7');
  const last = await mgr.executeReconnect('D7');
  assert.equal(last.state, RECONNECT_TX_STATE.EXHAUSTED);
});

test('8 cancel', async () => {
  const { createReconnectManager } = await loadManager();
  const updates = [];
  const mgr = createReconnectManager({
    setTimeout: () => 99,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    updateSession: (id, patch) => updates.push(patch),
  });
  mgr.scheduleReconnect('D8', { reason: 'peer-lost' });
  mgr.cancelReconnect('D8');
  assert.ok(updates.some((p) => p.reconnectState === 'NONE'));
});

test('9 USER_REQUEST no reconnect', async () => {
  const { createReconnectManager, DISCONNECT_REASON, RECONNECT_TX_STATE } = await loadManager();
  const mgr = createReconnectManager({
    setTimeout: () => { throw new Error('should not schedule'); },
    clearTimeout: () => {},
    updateSession: () => {},
  });
  const tx = mgr.scheduleReconnect('D9', { reason: DISCONNECT_REASON.USER_REQUEST });
  assert.equal(tx.state, RECONNECT_TX_STATE.EXHAUSTED);
});

test('10 REMOTE_LOST reconnect', async () => {
  const { createReconnectManager, DISCONNECT_REASON, RECONNECT_TX_STATE } = await loadManager();
  const mgr = createReconnectManager({
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    updateSession: () => {},
  });
  const tx = mgr.scheduleReconnect('D10', { reason: DISCONNECT_REASON.REMOTE_LOST });
  assert.equal(tx.state, RECONNECT_TX_STATE.SCHEDULED);
});

test('11 TIMEOUT reconnect', async () => {
  const { createReconnectManager, DISCONNECT_REASON } = await loadManager();
  const mgr = createReconnectManager({
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    updateSession: () => {},
  });
  const tx = mgr.scheduleReconnect('D11', { reason: DISCONNECT_REASON.TIMEOUT });
  assert.equal(tx.nextDelay, 1000);
});

test('12 queue cleanup', async () => {
  const { createReconnectManager } = await loadManager();
  const queueEvents = [];
  const mgr = createReconnectManager({
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    updateSession: () => {},
    onQueueDisconnect: (deviceId, reason) => queueEvents.push({ deviceId, reason }),
  });
  mgr.scheduleReconnect('D12', { reason: 'peer-lost' });
  assert.equal(queueEvents.length, 1);
  assert.equal(queueEvents[0].deviceId, 'D12');
});

test('13 session integration', async () => {
  const rt = (await importTarget('apps/uniapp/services/ble-runtime/index.js')).module;
  const { createFakePlatform } = await import('../lib/fake-runtime.mjs');
  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    await rt.connectDevice('INT-1');
    platform.__listeners.conn.forEach((cb) => cb({ deviceId: 'INT-1', connected: false }));
    await new Promise((r) => setTimeout(r, 5));
    const snap = rt.getSessionRegistrySnapshot('INT-1');
    assert.equal(snap?.disconnectReason, 'REMOTE_LOST');
    assert.equal(snap?.reconnectState, 'SCHEDULED');
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('14 no infinite retry', async () => {
  const { createReconnectManager } = await loadManager();
  let connects = 0;
  const mgr = createReconnectManager({
    maxAttempts: 3,
    backoffMs: [1, 1, 1],
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: () => ({ owner: { type: 'SYSTEM', id: 'x' } }),
    connect: async () => { connects += 1; throw new Error('fail'); },
    updateSession: () => {},
  });
  mgr.scheduleReconnect('D14', { reason: 'peer-lost' });
  await mgr.executeReconnect('D14');
  await mgr.executeReconnect('D14');
  await mgr.executeReconnect('D14');
  assert.equal(connects, 3);
  assert.equal(mgr.getReconnectState('D14').state, 'EXHAUSTED');
});

test('15 multi-device isolation', async () => {
  const { createReconnectManager } = await loadManager();
  const mgr = createReconnectManager({
    setTimeout: () => 1,
    clearTimeout: () => {},
    getSession: (id) => ({ owner: { type: 'SYSTEM', id }, deviceId: id }),
    updateSession: () => {},
  });
  mgr.scheduleReconnect('ISO-A', { reason: 'peer-lost' });
  mgr.cancelReconnect('ISO-A');
  mgr.scheduleReconnect('ISO-B', { reason: 'peer-lost' });
  assert.equal(mgr.getReconnectState('ISO-A').state, 'CANCELLED');
  assert.equal(mgr.getReconnectState('ISO-B').state, 'SCHEDULED');
});
