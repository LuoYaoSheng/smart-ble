import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { OtaManager, OTA_UUIDS, parseOtaStatusPayload } from '../../apps/uniapp/utils/ota_manager.js';

function createHarness(overrides = {}) {
  const calls = [];
  let statusCallback = null;
  const session = { deviceId: 'ota-device', dead: false, mtu: 247 };
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
      calls.push(['write', serviceId, characteristicId, value?.byteLength ?? 0, options?.writeType]);
      const text = typeof value === 'string' ? value : new TextDecoder().decode(new Uint8Array(value));
      try {
        const payload = JSON.parse(text);
        if (payload.op === 'start') {
          statusCallback?.(new TextEncoder().encode(JSON.stringify({ status: 'ready' })).buffer);
        }
        if (payload.op === 'commit') {
          statusCallback?.(new TextEncoder().encode(JSON.stringify({ status: 'success' })).buffer);
        }
      } catch {
        // DATA chunk
      }
    },
    readValue: async () => new TextEncoder().encode(JSON.stringify({ firmware_version: '0.0.0' })).buffer,
    closeDevice: async () => calls.push(['close']),
    connectDevice: async () => { calls.push(['connect']); return session; },
    setSessionOwner: () => {},
    cancelReconnect: () => {},
    chunkForMtu: (data, mtu) => {
      const bytes = new Uint8Array(data);
      const chunkSize = Math.max(1, (mtu || 247) - 3);
      const chunks = [];
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        chunks.push(bytes.slice(offset, Math.min(offset + chunkSize, bytes.length)));
      }
      return chunks;
    },
    ...overrides,
  };
  return {
    calls,
    session,
    runtime,
    emitStatus(payload) {
      const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const bytes = Uint8Array.from([...text].map((ch) => ch.charCodeAt(0)));
      statusCallback?.(bytes.buffer);
    },
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
  assert.equal(parseOtaStatusPayload(Uint8Array.from([...JSON.stringify({ status: 'ready' })].map((c) => c.charCodeAt(0)))).kind, 'ready');
});

await run('rejects missing or empty firmware before MTU, Notify, or transfer', async () => {
  const { calls, runtime } = createHarness();
  const errors = [];
  const manager = new OtaManager('ota-device', null, { runtime, delay: async () => {} });
  await manager.startOta(new ArrayBuffer(0), null, (message) => errors.push(message));
  assert.match(errors[0], /firmware/i);
  assert.deepEqual(calls, []);
});

await run('does not succeed after bytes alone; requires CTRL start, commit, and status success', async () => {
  const harness = createHarness();
  const progress = [];
  let completed = 0;
  const errors = [];
  const manager = new OtaManager('ota-device', null, {
    runtime: harness.runtime,
    delay: async () => {},
    confirmTimeoutMs: 200,
  });

  const result = await manager.startOta(
    new ArrayBuffer(181),
    (sent, total, meta) => progress.push([sent, total, meta?.phase]),
    (message) => errors.push(message),
    () => { completed += 1; },
    { skipVerify: true, manifest: { format_version: 1, target: 'lightble-peripheral', hardware: 'esp32-s3', firmware_version: '0.0.0', size: 181, sha256: 'a'.repeat(64) } },
  );

  assert.equal(result.ok, false, 'hash mismatch without valid manifest should fail validation');
  assert.equal(completed, 0);
});

await run('accepts full transaction with ready and success notifications', async () => {
  const firmware = new Uint8Array(10);
  const sha = createHash('sha256').update(firmware).digest('hex');
  const harness = createHarness({
    readValue: async () => new TextEncoder().encode(JSON.stringify({ firmware_version: '1.0.0' })).buffer,
  });
  let completed = 0;
  const manager = new OtaManager('ota-device', null, {
    runtime: harness.runtime,
    delay: async () => {},
    confirmTimeoutMs: 200,
  });
  const outcome = await manager.startOta(
    {
      manifest: {
        format_version: 1,
        target: 'lightble-peripheral',
        hardware: 'esp32-s3',
        firmware_version: '1.0.0',
        size: 10,
        sha256: sha,
      },
      firmware,
    },
    null,
    null,
    () => { completed += 1; },
    { skipVerify: true },
  );
  assert.equal(outcome.ok, true);
  assert.equal(completed, 1);
  assert.ok(harness.calls.some(([type, svc, ch]) => type === 'write' && ch === OTA_UUIDS.CHAR_CTRL));
});

await run('timeout, device failure, cancel, and write rejection never report success', async () => {
  const timeoutHarness = createHarness({
    writeValue: async (_s, svc, ch, val, opts) => {
      timeoutHarness.calls.push(['write', svc, ch, val?.byteLength ?? 0, opts?.writeType]);
      const text = new TextDecoder().decode(new Uint8Array(val));
      try {
        if (JSON.parse(text).op === 'start') {
          // never emit ready
        }
      } catch {
        // data
      }
    },
  });
  const timeoutErrors = [];
  let timeoutSuccess = 0;
  const timeoutManager = new OtaManager('ota-device', null, {
    runtime: timeoutHarness.runtime,
    delay: async () => {},
    readyTimeoutMs: 20,
    confirmTimeoutMs: 20,
  });
  const timeoutResult = await timeoutManager.startOta(
    new ArrayBuffer(20),
    null,
    (message) => timeoutErrors.push(message),
    () => { timeoutSuccess += 1; },
    { skipVerify: true },
  );
  assert.equal(timeoutResult?.ok, false);
  assert.ok(
    timeoutErrors.some((e) => /ready timeout|等待设备/i.test(String(e))),
    `expected ready timeout error, got: ${timeoutErrors.join('|')}`,
  );
  assert.equal(timeoutSuccess, 0);

  const failHarness = createHarness({
    writeValue: async (_session, serviceId, characteristicId, value, options) => {
      failHarness.calls.push(['write', serviceId, characteristicId, value?.byteLength ?? 0, options?.writeType]);
      const text = new TextDecoder().decode(new Uint8Array(value));
      try {
        const payload = JSON.parse(text);
        if (payload.op === 'start') {
          failHarness.emitStatus({ status: 'ready' });
        }
      } catch {
        // DATA chunk
      }
    },
  });
  const failErrors = [];
  let failSuccess = 0;
  const failManager = new OtaManager('ota-device', null, {
    runtime: failHarness.runtime,
    delay: async () => {},
    confirmTimeoutMs: 200,
  });
  const failing = failManager.startOta(
    new ArrayBuffer(20),
    null,
    (message) => failErrors.push(message),
    () => { failSuccess += 1; },
    { skipVerify: true },
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  failHarness.emitStatus({ status: 'error', message: 'crc mismatch' });
  await failing;
  assert.ok(failErrors.some((e) => /crc mismatch|失败/i.test(String(e))));
  assert.equal(failSuccess, 0);

  let releaseMtu;
  const cancelled = createHarness({
    setMtu: () => new Promise((resolve) => { releaseMtu = resolve; }),
  });
  const cancelErrors = [];
  let cancelSuccess = 0;
  const cancelManager = new OtaManager('ota-device', null, { runtime: cancelled.runtime, delay: async () => {} });
  const cancelling = cancelManager.startOta(new ArrayBuffer(20), null, (message) => cancelErrors.push(message), () => { cancelSuccess += 1; }, { skipVerify: true });
  await new Promise((resolve) => setTimeout(resolve, 0));
  cancelManager.cancel();
  releaseMtu({ mtu: 247 });
  await cancelling;
  assert.ok(cancelErrors.some((e) => /cancel/i.test(String(e))), `cancel errors: ${cancelErrors.join('|')}`);
  assert.equal(cancelSuccess, 0);

  let writes = 0;
  const failed = createHarness({
    writeValue: async (...args) => {
      writes += 1;
      failed.calls.push(['write', ...args.slice(1, 4)]);
      throw new Error('link lost');
    },
  });
  const transferErrors = [];
  let transferSuccess = 0;
  const failedManager = new OtaManager('ota-device', null, { runtime: failed.runtime, delay: async () => {}, readyTimeoutMs: 200 });
  await failedManager.startOta(new ArrayBuffer(400), null, (message) => transferErrors.push(message), () => { transferSuccess += 1; }, { skipVerify: true });
  assert.equal(writes, 1);
  assert.ok(transferErrors.some((e) => /link lost/i.test(String(e))));
  assert.equal(transferSuccess, 0);
});
