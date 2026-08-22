import assert from 'node:assert/strict';

import { createFakeBlePlatform } from './ble-fixture.mjs';
import {
  closeDevice,
  connectDevice,
  getBleRuntimeSnapshotForTesting,
  getSession,
  onDiscovery,
  openAdapter,
  readValue,
  setNotifyEnabled,
  subscribe,
  resetBleRuntimeForTesting,
  setBlePlatformForTesting,
  writeValue
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

await run('opening an already-open adapter is idempotent while real open errors remain visible', async () => {
  resetBleRuntimeForTesting();
  const originalOpen = platform.openBluetoothAdapter;
  platform.openBluetoothAdapter = (options) => queueMicrotask(() => options.fail?.({
    errMsg: 'openBluetoothAdapter:fail already opened'
  }));
  await assert.doesNotReject(openAdapter());

  platform.openBluetoothAdapter = (options) => queueMicrotask(() => options.fail?.({
    errCode: 10001,
    errMsg: 'not available'
  }));
  await assert.rejects(openAdapter(), (error) => error.errCode === 10001);
  platform.openBluetoothAdapter = originalOpen;
});

await run('read timeout removes its one-shot value listener', async () => {
  const b = await connectDevice('device-b');
  const listenersBefore = getBleRuntimeSnapshotForTesting().valueListenerKeys;
  await assert.rejects(readValue(b, SERVICE, CHAR, 5), /超时/);
  assert.equal(getBleRuntimeSnapshotForTesting().valueListenerKeys, listenersBefore);
});

await run('missing expected service closes the half-open connection', async () => {
  platform.setServices('device-missing', []);
  await assert.rejects(connectDevice('device-missing', { expectedServiceUuid: SERVICE }), /expected service not found/);
  assert.ok(platform.calls.some((call) => call.type === 'close' && call.deviceId === 'device-missing'));
});

await run('reopening a connected device reuses its active runtime session', async () => {
  const connectCallsBefore = platform.calls.filter((call) => call.type === 'connect' && call.deviceId === 'device-b').length;
  const first = await connectDevice('device-b');
  const second = await connectDevice('device-b');
  const connectCallsAfter = platform.calls.filter((call) => call.type === 'connect' && call.deviceId === 'device-b').length;

  assert.equal(second, first);
  assert.equal(connectCallsAfter, connectCallsBefore);
});

await run('reused sessions still enforce a caller expected service requirement', async () => {
  resetBleRuntimeForTesting();
  const otherService = '00000000-0000-0000-0000-000000000099';
  platform.setServices('device-requirement', [{ uuid: otherService }]);
  platform.setCharacteristics('device-requirement', otherService, [{ uuid: CHAR }]);
  const genericSession = await connectDevice('device-requirement');

  await assert.rejects(
    connectDevice('device-requirement', { expectedServiceUuid: SERVICE }),
    /expected service not found/
  );
  assert.equal(getSession('device-requirement'), genericSession);
  assert.equal(genericSession.dead, false);
});

await run('active and passive disconnects invalidate the session exactly once', async () => {
  platform.setServices('device-c', [{ uuid: SERVICE }]);
  platform.setCharacteristics('device-c', SERVICE, [{ uuid: CHAR }]);
  const activeSession = await connectDevice('device-c');
  let activeDisconnects = 0;
  activeSession.onDisconnect(() => { activeDisconnects += 1; });
  await closeDevice('device-c');
  platform.emitConnection({ deviceId: 'device-c', connected: false });

  assert.equal(activeDisconnects, 1);
  assert.equal(activeSession.dead, true);
  assert.equal(getSession('device-c'), null);

  const passiveSession = await connectDevice('device-c');
  let passiveDisconnects = 0;
  passiveSession.onDisconnect(() => { passiveDisconnects += 1; });
  platform.emitConnection({ deviceId: 'device-c', connected: false });

  assert.equal(passiveDisconnects, 1);
  assert.equal(passiveSession.dead, true);
  assert.equal(getSession('device-c'), null);
});

await run('concurrent same-device connects share one platform attempt and one session', async () => {
  resetBleRuntimeForTesting();
  platform.setServices('device-concurrent', [{ uuid: SERVICE }]);
  platform.setCharacteristics('device-concurrent', SERVICE, [{ uuid: CHAR }]);
  const originalConnect = platform.createBLEConnection;
  const pendingConnections = [];
  platform.createBLEConnection = (opts) => {
    platform.calls.push({ type: 'connect', ...opts });
    pendingConnections.push(opts);
  };

  const first = connectDevice('device-concurrent');
  const second = connectDevice('device-concurrent');
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (const options of pendingConnections) options.success?.({});
  const [firstSession, secondSession] = await Promise.all([first, second]);
  platform.createBLEConnection = originalConnect;

  assert.equal(pendingConnections.length, 1);
  assert.equal(firstSession, secondSession);
  assert.equal(getSession('device-concurrent'), firstSession);
});

await run('a rejected platform connect clears the pending attempt so retry can succeed', async () => {
  resetBleRuntimeForTesting();
  platform.setServices('device-retry', [{ uuid: SERVICE }]);
  platform.setCharacteristics('device-retry', SERVICE, [{ uuid: CHAR }]);
  const originalConnect = platform.createBLEConnection;
  let attempts = 0;
  platform.createBLEConnection = (opts) => {
    platform.calls.push({ type: 'connect', ...opts });
    attempts += 1;
    queueMicrotask(() => {
      if (attempts === 1) opts.fail?.({ errCode: 10003, errMsg: 'connection fail' });
      else opts.success?.({});
    });
  };

  await assert.rejects(connectDevice('device-retry'), (error) => error.errCode === 10003);
  assert.equal(getSession('device-retry'), null);
  const session = await connectDevice('device-retry');
  platform.createBLEConnection = originalConnect;

  assert.equal(attempts, 2);
  assert.equal(getSession('device-retry'), session);
});

await run('read resolves the matching value and ignores a late value after timeout', async () => {
  resetBleRuntimeForTesting();
  platform.setServices('device-read', [{ uuid: SERVICE }]);
  platform.setCharacteristics('device-read', SERVICE, [{ uuid: CHAR }]);
  const session = await connectDevice('device-read');
  const expected = Uint8Array.from([1, 2, 3]).buffer;
  const firstRead = readValue(session, SERVICE, CHAR, 100);
  platform.emitValue({ deviceId: 'device-read', serviceId: SERVICE, characteristicId: CHAR, value: expected });
  assert.equal(await firstRead, expected);

  await assert.rejects(readValue(session, SERVICE, CHAR, 5), /超时/);
  platform.emitValue({ deviceId: 'device-read', serviceId: SERVICE, characteristicId: CHAR, value: new ArrayBuffer(0) });
  assert.equal(getBleRuntimeSnapshotForTesting().valueListenerKeys, 0);
});

await run('disconnect rejects a pending read immediately and removes its listener', async () => {
  resetBleRuntimeForTesting();
  platform.setServices('device-read-disconnect', [{ uuid: SERVICE }]);
  platform.setCharacteristics('device-read-disconnect', SERVICE, [{ uuid: CHAR }]);
  const session = await connectDevice('device-read-disconnect');
  const pendingRead = readValue(session, SERVICE, CHAR, 500);
  platform.emitConnection({ deviceId: 'device-read-disconnect', connected: false });

  await assert.rejects(pendingRead, /断开/);
  assert.equal(getBleRuntimeSnapshotForTesting().valueListenerKeys, 0);
});

await run('write sends one exact payload and exposes platform rejection or dead session', async () => {
  resetBleRuntimeForTesting();
  platform.setServices('device-write', [{ uuid: SERVICE }]);
  platform.setCharacteristics('device-write', SERVICE, [{ uuid: CHAR }]);
  const session = await connectDevice('device-write');
  const payload = Uint8Array.from([0xAA, 0x55]).buffer;
  const writesBefore = platform.calls.filter((call) => call.type === 'write' && call.deviceId === 'device-write').length;
  await writeValue(session, SERVICE, CHAR, payload, { writeType: 'writeNoResponse' });
  const writes = platform.calls.filter((call) => call.type === 'write' && call.deviceId === 'device-write');
  assert.equal(writes.length, writesBefore + 1);
  assert.equal(writes.at(-1).value, payload);
  assert.equal(writes.at(-1).writeType, 'writeNoResponse');

  const originalWrite = platform.writeBLECharacteristicValue;
  platform.writeBLECharacteristicValue = (opts) => queueMicrotask(() => opts.fail?.({ errCode: 10008, errMsg: 'system error' }));
  await assert.rejects(writeValue(session, SERVICE, CHAR, payload), (error) => error.errCode === 10008);
  platform.writeBLECharacteristicValue = originalWrite;

  await closeDevice('device-write');
  await assert.rejects(writeValue(session, SERVICE, CHAR, payload), /断开/);
});

await run('notify routes while subscribed and cleans up on disable or disconnect', async () => {
  resetBleRuntimeForTesting();
  platform.setServices('device-notify', [{ uuid: SERVICE }]);
  platform.setCharacteristics('device-notify', SERVICE, [{ uuid: CHAR }]);
  const session = await connectDevice('device-notify');
  let delivered = 0;
  const unsubscribe = await subscribe(session, SERVICE, CHAR, () => { delivered += 1; });
  platform.emitValue({ deviceId: 'device-notify', serviceId: SERVICE, characteristicId: CHAR, value: new ArrayBuffer(0) });
  assert.equal(delivered, 1);

  await setNotifyEnabled(session, SERVICE, CHAR, false);
  unsubscribe();
  platform.emitValue({ deviceId: 'device-notify', serviceId: SERVICE, characteristicId: CHAR, value: new ArrayBuffer(0) });
  assert.equal(delivered, 1);
  assert.equal(getBleRuntimeSnapshotForTesting().valueListenerKeys, 0);

  await subscribe(session, SERVICE, CHAR, () => { delivered += 1; });
  platform.emitConnection({ deviceId: 'device-notify', connected: false });
  platform.emitValue({ deviceId: 'device-notify', serviceId: SERVICE, characteristicId: CHAR, value: new ArrayBuffer(0) });
  assert.equal(delivered, 1);
  assert.equal(getBleRuntimeSnapshotForTesting().valueListenerKeys, 0);
});
