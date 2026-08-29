import assert from 'node:assert/strict';
import { OtaManager, OTA_UUIDS, parseOtaStatusPayload } from '../../apps/uniapp/utils/ota_manager.js';

function createHarness(overrides = {}) {
  const calls = [];
  let statusCallback = null;
  const session = { deviceId: 'ota-device', dead: false };
  const runtime = {
    getSession: () => session,
    setMtu: async (_session, mtu) => calls.push(['mtu', mtu]),
    subscribe: async (_session, _service, _char, callback) => {
      calls.push(['subscribe']);
      statusCallback = callback;
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
  return {
    calls,
    session,
    runtime,
    emitStatus(payload) {
      const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const bytes = Uint8Array.from([...text].map((ch) => ch.charCodeAt(0)));
      statusCallback?.(bytes.buffer);
    }
  };
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

await run('parses documented JSON status payloads and ignores non-JSON', async () => {
  assert.equal(parseOtaStatusPayload(Uint8Array.from([...JSON.stringify({ status: 'success' })].map((c) => c.charCodeAt(0)))).kind, 'success');
  assert.equal(parseOtaStatusPayload(Uint8Array.from([...JSON.stringify({ type: 'ota', status: 'error', message: 'crc' })].map((c) => c.charCodeAt(0)))).kind, 'failure');
  assert.equal(parseOtaStatusPayload(Uint8Array.from([1, 2, 3])).kind, 'ignored');
});

await run('rejects missing or empty firmware before MTU, Notify, or transfer', async () => {
  const { calls, runtime } = createHarness();
  const errors = [];
  const manager = new OtaManager('ota-device', null, { runtime, delay: async () => {} });
  await manager.startOta(new ArrayBuffer(0), null, (message) => errors.push(message));
  assert.match(errors[0], /firmware/i);
  assert.deepEqual(calls, []);
});

await run('does not succeed after bytes alone; requires status success notification', async () => {
  const harness = createHarness();
  const progress = [];
  let completed = 0;
  const errors = [];
  const manager = new OtaManager('ota-device', null, {
    runtime: harness.runtime,
    delay: async () => {},
    confirmTimeoutMs: 50
  });

  const result = manager.startOta(
    new ArrayBuffer(181),
    (sent, total, meta) => progress.push([sent, total, meta?.phase]),
    (message) => errors.push(message),
    () => { completed += 1; }
  );

  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(completed, 0);
  assert.ok(progress.some((entry) => entry[2] === 'confirm'));

  harness.emitStatus({ status: 'success' });
  const outcome = await result;
  assert.equal(outcome.ok, true);
  assert.equal(completed, 1);
  assert.equal(errors.length, 0);
  assert.deepEqual(progress.filter((entry) => entry[2] === 'transfer'), [[180, 181, 'transfer'], [181, 181, 'transfer']]);
  assert.deepEqual(harness.calls.filter(([type]) => type === 'write').map(([, service, char, bytes, writeType]) => [service, char, bytes, writeType]), [
    [OTA_UUIDS.SERVICE_OTA, OTA_UUIDS.CHAR_DATA, 180, 'writeNoResponse'],
    [OTA_UUIDS.SERVICE_OTA, OTA_UUIDS.CHAR_DATA, 1, 'writeNoResponse']
  ]);
  assert.deepEqual(harness.calls.slice(-2).map(([type]) => type), ['notify', 'unsubscribe']);
});

await run('accepts success status that arrives before the confirm wait starts', async () => {
  let statusCallback = null;
  const calls = [];
  const session = { deviceId: 'ota-device', dead: false };
  const runtime = {
    getSession: () => session,
    setMtu: async () => {},
    subscribe: async (_s, _svc, _ch, callback) => {
      statusCallback = callback;
      return () => calls.push(['unsubscribe']);
    },
    setNotifyEnabled: async () => { calls.push(['notify']); },
    writeValue: async () => {
      const text = JSON.stringify({ status: 'success' });
      const bytes = Uint8Array.from([...text].map((ch) => ch.charCodeAt(0)));
      statusCallback?.(bytes.buffer);
    }
  };
  let completed = 0;
  const manager = new OtaManager('ota-device', null, { runtime, delay: async () => {}, confirmTimeoutMs: 200 });
  const outcome = await manager.startOta(new ArrayBuffer(10), null, null, () => { completed += 1; });
  assert.equal(outcome.ok, true);
  assert.equal(completed, 1);
});

await run('timeout, device failure, cancel, and write rejection never report success', async () => {
  const timeoutHarness = createHarness();
  const timeoutErrors = [];
  let timeoutSuccess = 0;
  const timeoutManager = new OtaManager('ota-device', null, {
    runtime: timeoutHarness.runtime,
    delay: async () => {},
    confirmTimeoutMs: 20
  });
  await timeoutManager.startOta(
    new ArrayBuffer(20),
    null,
    (message) => timeoutErrors.push(message),
    () => { timeoutSuccess += 1; }
  );
  assert.match(timeoutErrors[0], /超时/);
  assert.equal(timeoutSuccess, 0);

  const failHarness = createHarness();
  const failErrors = [];
  let failSuccess = 0;
  const failManager = new OtaManager('ota-device', null, {
    runtime: failHarness.runtime,
    delay: async () => {},
    confirmTimeoutMs: 200
  });
  const failing = failManager.startOta(
    new ArrayBuffer(20),
    null,
    (message) => failErrors.push(message),
    () => { failSuccess += 1; }
  );
  await new Promise((resolve) => setTimeout(resolve, 5));
  failHarness.emitStatus({ status: 'error', message: 'crc mismatch' });
  await failing;
  assert.match(failErrors[0], /crc mismatch/);
  assert.equal(failSuccess, 0);

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
