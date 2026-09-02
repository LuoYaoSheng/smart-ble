// tests/target/unit/broadcast-session-target.test.mjs
// PAGE-BROADCAST-001 — Broadcast Session owner/state/cleanup.

import test from 'node:test';
import assert from 'node:assert/strict';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'PAGE-BROADCAST-001 broadcast-session';

async function load() {
  const m = await importTarget('apps/uniapp/services/broadcast/broadcast-session.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  const adapterMod = await importTarget('apps/uniapp/services/broadcast/broadcast-adapter.js');
  return { session: m.module, adapter: adapterMod.module };
}

test('1 start', async () => {
  const { session, adapter } = await load();
  const fake = adapter.createFakeBroadcastAdapter();
  const api = session.createBroadcastSession({ adapter: fake });
  const snap = await api.startBroadcast({
    deviceName: 'SmartBLE',
    serviceUuid: 'FFE0',
    manufacturerId: '0001',
    manufacturerData: 'BLE',
  }, { owner: { type: 'PAGE', id: 'P1' } });
  assert.equal(snap.state, 'ADVERTISING');
  assert.equal(api.getBroadcastState(), 'ADVERTISING');
  assert.ok(fake.__calls.some((c) => c.m === 'start'));
});

test('2 stop', async () => {
  const { session, adapter } = await load();
  const fake = adapter.createFakeBroadcastAdapter();
  const api = session.createBroadcastSession({ adapter: fake });
  const owner = { type: 'PAGE', id: 'P1' };
  await api.startBroadcast({
    deviceName: 'SmartBLE', serviceUuid: 'FFE0', manufacturerId: '0001', manufacturerData: 'BLE',
  }, { owner });
  const snap = await api.stopBroadcast({ owner });
  assert.equal(snap.state, 'STOPPED');
  assert.equal(snap.owner, null);
});

test('3 owner', async () => {
  const { session, adapter } = await load();
  const fake = adapter.createFakeBroadcastAdapter();
  const api = session.createBroadcastSession({ adapter: fake });
  await api.startBroadcast({
    deviceName: 'SmartBLE', serviceUuid: 'FFE0', manufacturerId: '0001', manufacturerData: 'A',
  }, { owner: { type: 'PAGE', id: 'A' } });
  await assert.rejects(
    () => api.startBroadcast({
      deviceName: 'SmartBLE', serviceUuid: 'FFE0', manufacturerId: '0001', manufacturerData: 'B',
    }, { owner: { type: 'PAGE', id: 'B' } }),
    (error) => error.code === 'OWNER_BUSY',
  );
});

test('4 duplicate start', async () => {
  const { session, adapter } = await load();
  const fake = adapter.createFakeBroadcastAdapter();
  const api = session.createBroadcastSession({ adapter: fake });
  const owner = { type: 'PAGE', id: 'P1' };
  await api.startBroadcast({
    deviceName: 'SmartBLE', serviceUuid: 'FFE0', manufacturerId: '0001', manufacturerData: 'BLE',
  }, { owner });
  await assert.rejects(
    () => api.startBroadcast({
      deviceName: 'SmartBLE', serviceUuid: 'FFE0', manufacturerId: '0001', manufacturerData: 'BLE',
    }, { owner }),
    (error) => error.code === 'OWNER_BUSY',
  );
});

test('5 cleanup', async () => {
  const { session, adapter } = await load();
  const fake = adapter.createFakeBroadcastAdapter();
  const api = session.createBroadcastSession({ adapter: fake });
  await api.startBroadcast({
    deviceName: 'SmartBLE', serviceUuid: 'FFE0', manufacturerId: '0001', manufacturerData: 'BLE',
  }, { owner: { type: 'PAGE', id: 'P1' } });
  const snap = await api.cleanup();
  assert.equal(snap.state, 'IDLE');
  assert.equal(snap.owner, null);
  assert.equal(fake.__isAdvertising(), false);
});

test('6 payload update', async () => {
  const { session, adapter } = await load();
  const fake = adapter.createFakeBroadcastAdapter();
  const api = session.createBroadcastSession({ adapter: fake });
  const payload = api.updatePayload({
    deviceName: 'SmartBLE', serviceUuid: 'FFE0', manufacturerId: '0001', manufacturerData: 'X',
  });
  assert.equal(payload.valid, true);
  assert.equal(api.getBroadcastPayload().deviceName, 'SmartBLE');
});

test('7 state transition', async () => {
  const { session, adapter } = await load();
  const fake = adapter.createFakeBroadcastAdapter();
  const api = session.createBroadcastSession({ adapter: fake });
  const states = [];
  api.subscribe((snap) => states.push(snap.state));
  const owner = { type: 'WORKFLOW', id: 'W1' };
  await api.startBroadcast({
    deviceName: 'SmartBLE', serviceUuid: 'FFE0', manufacturerId: '0001', manufacturerData: 'BLE',
  }, { owner });
  await api.stopBroadcast({ owner });
  assert.ok(states.includes('STARTING'));
  assert.ok(states.includes('ADVERTISING'));
  assert.ok(states.includes('STOPPING'));
  assert.ok(states.includes('STOPPED'));
});

test('8 error', async () => {
  const { session, adapter } = await load();
  const fake = adapter.createFakeBroadcastAdapter({ failStart: new Error('adapter boom') });
  const api = session.createBroadcastSession({ adapter: fake });
  await assert.rejects(
    () => api.startBroadcast({
      deviceName: 'SmartBLE', serviceUuid: 'FFE0', manufacturerId: '0001', manufacturerData: 'BLE',
    }, { owner: { type: 'SYSTEM', id: 'S' } }),
    /boom|ADAPTER_FAILED/i,
  );
  assert.equal(api.getBroadcastState(), 'FAILED');
  assert.equal(api.getSession().owner, null);
});
