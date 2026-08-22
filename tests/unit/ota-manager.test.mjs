import assert from 'node:assert/strict';
import { OtaManager, OTA_UUIDS } from '../../apps/uniapp/utils/ota_manager.js';

function createHarness(overrides = {}) {
  const calls = [];
  const session = { deviceId: 'ota-device', dead: false };
  const runtime = {
    getSession: () => session,
    setMtu: async (_session, mtu) => calls.push(['mtu', mtu]),
    subscribe: async () => {
      calls.push(['subscribe']);
      return () => calls.push(['unsubscribe']);
    },
    setNotifyEnabled: async (_session, serviceId, characteristicId, enabled) => {
      calls.push(['notify', serviceId, characteristicId, enabled]);
    },
    writeValue: async (_session, serviceId, characteristicId, value, options) => {
      calls.push(['write', serviceId, characteristicId, value.byteLength, options?.writeType]);
    },
    ...overrides
  };
  return { calls, session, runtime };
}

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('[OTA manager]');

await run('rejects missing or empty firmware before MTU, Notify, or transfer', async () => {
  const { calls, runtime } = createHarness();
  const errors = [];
  const manager = new OtaManager('ota-device', null, { runtime, delay: async () => {} });
  await manager.startOta(new ArrayBuffer(0), null, (message) => errors.push(message));
  assert.match(errors[0], /firmware/i);
  assert.deepEqual(calls, []);
});

await run('chunks transfer, bounds progress, and disables status Notify on completion', async () => {
  const { calls, runtime } = createHarness();
  const progress = [];
  let completed = 0;
  const manager = new OtaManager('ota-device', null, { runtime, delay: async () => {} });
  await manager.startOta(new ArrayBuffer(181), (sent, total) => progress.push([sent, total]), null, () => { completed += 1; });

  assert.deepEqual(progress, [[180, 181], [181, 181]]);
  assert.equal(completed, 1);
  assert.deepEqual(calls.filter(([type]) => type === 'write').map(([, service, char, bytes, writeType]) => [service, char, bytes, writeType]), [
    [OTA_UUIDS.SERVICE_OTA, OTA_UUIDS.CHAR_DATA, 180, 'writeNoResponse'],
    [OTA_UUIDS.SERVICE_OTA, OTA_UUIDS.CHAR_DATA, 1, 'writeNoResponse']
  ]);
  assert.deepEqual(calls.slice(-2).map(([type]) => type), ['notify', 'unsubscribe']);
});

await run('cancel before transfer and write rejection stop safely without success', async () => {
  let releaseMtu;
  const cancelled = createHarness({
    setMtu: () => new Promise((resolve) => { releaseMtu = resolve; })
  });
  const cancelErrors = [];
  let cancelSuccess = 0;
  const cancelManager = new OtaManager('ota-device', null, { runtime: cancelled.runtime, delay: async () => {} });
  const cancelling = cancelManager.startOta(new ArrayBuffer(20), null, (message) => cancelErrors.push(message), () => { cancelSuccess += 1; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  cancelManager.cancel();
  releaseMtu({ mtu: 247 });
  await cancelling;
  assert.match(cancelErrors[0], /cancel/i);
  assert.equal(cancelSuccess, 0);
  assert.equal(cancelled.calls.some(([type]) => type === 'write'), false);

  let writes = 0;
  const failed = createHarness({
    writeValue: async () => {
      writes += 1;
      throw new Error('link lost');
    }
  });
  const transferErrors = [];
  let transferSuccess = 0;
  const failedManager = new OtaManager('ota-device', null, { runtime: failed.runtime, delay: async () => {} });
  await failedManager.startOta(new ArrayBuffer(400), null, (message) => transferErrors.push(message), () => { transferSuccess += 1; });
  assert.equal(writes, 1);
  assert.match(transferErrors[0], /link lost/);
  assert.equal(transferSuccess, 0);
});
