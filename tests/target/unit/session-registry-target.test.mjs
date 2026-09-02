// tests/target/unit/session-registry-target.test.mjs
// RUNTIME-SESSION-001：Session Registry 单元覆盖。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'RUNTIME-SESSION-001 session-registry';

test('1 create session', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const { createSessionRegistry, CONNECTION_STATE } = m.module;
  const reg = createSessionRegistry();
  const session = reg.createSession({ deviceId: 'A1', deviceInfo: { name: 'Dev' } });
  assert.equal(session.deviceId, 'A1');
  assert.equal(session.connectionState, CONNECTION_STATE.IDLE);
});

test('2 update state', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry, CONNECTION_STATE } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('A2');
  reg.updateSession('A2', { connectionState: CONNECTION_STATE.CONNECTING });
  assert.equal(reg.getSession('A2').connectionState, CONNECTION_STATE.CONNECTING);
});

test('3 remove session', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('A3');
  assert.ok(reg.removeSession('A3'));
  assert.equal(reg.getSession('A3'), null);
});

test('4 owner', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry, OWNER_TYPE } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('A4');
  const owner = { type: OWNER_TYPE.WORKFLOW, id: 'hid-1' };
  reg.setOwner('A4', owner);
  assert.deepEqual(reg.getOwner('A4'), owner);
});

test('5 borrow', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry, OWNER_TYPE } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('A5');
  reg.setOwner('A5', { type: OWNER_TYPE.WORKFLOW, id: 'wf' });
  const borrower = { type: OWNER_TYPE.PAGE, id: 'page-006' };
  assert.ok(reg.borrowReference('A5', borrower));
  const decision = reg.canDisconnect('A5', borrower);
  assert.equal(decision.action, 'release_only');
});

test('6 subscription add', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('A6');
  reg.addSubscription('A6', { serviceId: 'svc', characteristicId: 'chr' });
  assert.equal(reg.getSession('A6').subscription_count, 1);
});

test('7 subscription remove', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('A7');
  const entry = reg.addSubscription('A7', { serviceId: 'svc', characteristicId: 'chr' });
  assert.ok(reg.removeSubscription('A7', entry));
  assert.equal(reg.getSession('A7').subscription_count, 0);
});

test('8 clear subscriptions', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('A8');
  reg.addSubscription('A8', { serviceId: 's1', characteristicId: 'c1' });
  reg.addSubscription('A8', { serviceId: 's2', characteristicId: 'c2' });
  reg.clearSubscriptions('A8');
  assert.equal(reg.getSession('A8').subscription_count, 0);
});

test('9 two devices isolation', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('DEV-A');
  reg.createSession('DEV-B');
  reg.addSubscription('DEV-A', { serviceId: 'svc', characteristicId: 'chr' });
  assert.equal(reg.getSession('DEV-A').subscription_count, 1);
  assert.equal(reg.getSession('DEV-B').subscription_count, 0);
});

test('10 reset', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('X1');
  reg.reset();
  assert.equal(reg.listSessions().length, 0);
});

test('11 state transitions', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry, CONNECTION_STATE } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('ST1');
  const states = [
    CONNECTION_STATE.CONNECTING,
    CONNECTION_STATE.CONNECTED,
    CONNECTION_STATE.DISCOVERING,
    CONNECTION_STATE.READY,
    CONNECTION_STATE.DISCONNECTING,
    CONNECTION_STATE.DISCONNECTED,
  ];
  for (const state of states) reg.updateSession('ST1', { connectionState: state });
  assert.equal(reg.getSession('ST1').connectionState, CONNECTION_STATE.DISCONNECTED);
});

test('12 no cross device leakage', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  reg.createSession('ISO-A');
  reg.createSession('ISO-B');
  reg.removeSession('ISO-A');
  assert.ok(reg.getSession('ISO-B'));
});

test('13 timestamps', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  const session = reg.createSession('TS1');
  const createdAt = session.createdAt;
  reg.updateSession('TS1', { metadata: { note: 'x' } });
  assert.ok(reg.getSession('TS1').updatedAt >= createdAt);
});

test('14 metadata preserve', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  reg.createSession({ deviceId: 'MD1', metadata: { profile: 'hid' } });
  reg.updateSession('MD1', { metadata: { page: '006' } });
  assert.deepEqual(reg.getSession('MD1').metadata, { profile: 'hid', page: '006' });
});

test('15 invalid device handling', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/session-registry.js');
  const { createSessionRegistry } = m.module;
  const reg = createSessionRegistry();
  assert.throws(() => reg.createSession({}), /deviceId/);
  assert.equal(reg.getSession(''), null);
  assert.equal(reg.updateSession('missing', { connectionState: 'READY' }), null);
  assert.equal(reg.removeSubscription('missing', { serviceId: 's', characteristicId: 'c' }), false);
});
