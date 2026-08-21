import assert from 'node:assert/strict';

import { createFakeBlePlatform } from './ble-fixture.mjs';
import {
  connectDevice,
  getBleRuntimeSnapshotForTesting,
  onDiscovery,
  openAdapter,
  readValue,
  subscribe,
  resetBleRuntimeForTesting,
  setBlePlatformForTesting
} from '../../apps/uniapp/services/ble-runtime/index.js';

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

const SERVICE = '00000000-0000-0000-0000-000000000001';
const CHAR = '00000000-0000-0000-0000-000000000002';

const platform = createFakeBlePlatform();
setBlePlatformForTesting(platform);
resetBleRuntimeForTesting();

for (const deviceId of ['device-a', 'device-b']) {
  platform.setServices(deviceId, [{ uuid: SERVICE }]);
  platform.setCharacteristics(deviceId, SERVICE, [{ uuid: CHAR }]);
}

console.log('[ble runtime]');

await run('routes equal characteristic UUIDs by device and service identity', async () => {
  const a = await connectDevice('device-a');
  const b = await connectDevice('device-b');
  const received = [];
  await subscribe(a, SERVICE, CHAR, () => received.push('a'));
  await subscribe(b, SERVICE, CHAR, () => received.push('b'));

  platform.emitValue({ deviceId: 'device-a', serviceId: SERVICE, characteristicId: CHAR, value: new ArrayBuffer(0) });
  assert.deepEqual(received, ['a']);
});

await run('disconnecting one device leaves another device subscription alive', async () => {
  const b = await connectDevice('device-b');
  let delivered = 0;
  await subscribe(b, SERVICE, CHAR, () => { delivered += 1; });
  platform.emitConnection({ deviceId: 'device-a', connected: false });
  platform.emitValue({ deviceId: 'device-b', serviceId: SERVICE, characteristicId: CHAR, value: new ArrayBuffer(0) });
  assert.equal(delivered, 1);
});

await run('routes discovery through the single BLE runtime listener', async () => {
  let discovered = [];
  const unsubscribe = onDiscovery((devices) => { discovered = devices; });
  await openAdapter();
  platform.emitDiscovery([{ deviceId: 'device-c' }]);
  assert.deepEqual(discovered, [{ deviceId: 'device-c' }]);
  unsubscribe();
});

await run('read timeout removes its one-shot value listener', async () => {
  const b = await connectDevice('device-b');
  await assert.rejects(readValue(b, SERVICE, CHAR, 5), /超时/);
  assert.equal(getBleRuntimeSnapshotForTesting().valueListenerKeys, 1);
});
