// tests/target/integration/broadcast-observer-target.test.mjs
// PAGE-BROADCAST-001 — broadcast → observer advertisement → evidence match.

import test from 'node:test';
import assert from 'node:assert/strict';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'PAGE-BROADCAST-001 broadcast-observer integration';

test('15 broadcast → observer event → match', async () => {
  const sessionMod = await importTarget('apps/uniapp/services/broadcast/broadcast-session.js');
  const adapterMod = await importTarget('apps/uniapp/services/broadcast/broadcast-adapter.js');
  const evidenceMod = await importTarget('apps/uniapp/services/broadcast/observer-evidence-adapter.js');
  if (!sessionMod.ok) assert.fail(notImplemented(IDS, sessionMod.message));

  const fake = adapterMod.module.createFakeBroadcastAdapter();
  const api = sessionMod.module.createBroadcastSession({ adapter: fake });
  const owner = { type: 'PAGE', id: 'PAGE-008' };

  await api.startBroadcast({
    deviceName: 'SmartBLE',
    serviceUuid: 'FFE0',
    manufacturerId: '0001',
    manufacturerData: 'BLE',
  }, { owner });

  assert.equal(api.getBroadcastState(), 'ADVERTISING');

  // Observer serial event (task schema) — must not require changing Observer firmware
  const observerEvent = {
    type: 'advertisement',
    address: 'aa:bb:cc:dd:ee:ff',
    name: 'SmartBLE',
    rssi: -48,
    services: ['FFE0'],
    manufacturer: '0100424c45', // id LE 0001 + "BLE"
    timestamp: Date.now(),
    t: 'obs',
  };

  const evidence = api.ingestObserverEvent(observerEvent);
  assert.equal(evidence.matched, true, 'observer evidence should match active broadcast payload');
  assert.equal(evidence.rssi, -48);
  assert.ok(evidence.timestamp);

  const direct = evidenceMod.module.matchObserverEvidence(observerEvent, api.getBroadcastPayload());
  assert.equal(direct.matched, true);

  await api.stopBroadcast({ owner });
  assert.equal(api.getBroadcastState(), 'STOPPED');
});
