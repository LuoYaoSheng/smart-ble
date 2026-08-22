import assert from 'node:assert/strict';
import { mergeDeviceCollection } from '../../apps/uniapp/services/ble-runtime/device-collection.js';

const run = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('[device collection]');

run('deduplicates by deviceId and keeps the latest advertisement fields', () => {
  const result = mergeDeviceCollection(
    [{ deviceId: 'A', name: 'first', RSSI: -70, localName: 'old' }],
    [
      { deviceId: 'A', RSSI: -60, localName: 'new' },
      { deviceId: 'A', RSSI: -45, advertisDataHex: 'A1B2' }
    ]
  );

  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    deviceId: 'A',
    name: 'first',
    RSSI: -45,
    localName: 'new',
    advertisDataHex: 'A1B2',
    connected: false
  });
});

run('preserves connection state unless an explicit Store state overrides it', () => {
  const connected = mergeDeviceCollection(
    [{ deviceId: 'A', RSSI: -50, connected: true }],
    [{ deviceId: 'A', RSSI: -40, connected: false }]
  );
  assert.equal(connected[0].connected, true);

  const disconnected = mergeDeviceCollection(
    [{ deviceId: 'A', RSSI: -50, connected: true }],
    [{ deviceId: 'A', RSSI: -40 }],
    { connectionStates: { A: false } }
  );
  assert.equal(disconnected[0].connected, false);
});

run('sorts finite RSSI first and keeps missing RSSI devices deterministically', () => {
  const result = mergeDeviceCollection([], [
    { deviceId: 'missing' },
    { deviceId: 'weak', RSSI: -80 },
    { deviceId: 'strong', RSSI: -20 },
    { deviceId: 'invalid', RSSI: Number.NaN }
  ]);

  assert.deepEqual(result.map(({ deviceId }) => deviceId), ['strong', 'weak', 'missing', 'invalid']);
});

run('ignores invalid identities and caps the result at 100 strongest devices', () => {
  const incoming = Array.from({ length: 105 }, (_, index) => ({
    deviceId: `D${String(index).padStart(3, '0')}`,
    RSSI: -index
  }));
  incoming.push({ deviceId: '', RSSI: 10 }, { RSSI: 20 });

  const result = mergeDeviceCollection([], incoming);
  assert.equal(result.length, 100);
  assert.equal(result[0].deviceId, 'D000');
  assert.equal(result.at(-1).deviceId, 'D099');
});
