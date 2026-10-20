import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { OtaManager, OTA_UUIDS } from '../../apps/uniapp/services/ota/ota-manager.js';
const firmware = new Uint8Array(47);
const manifest = { format_version: 1, target: 'lightble-peripheral', hardware: 'esp32-s3', firmware_version: '1.2.0', size: 47, sha256: createHash('sha256').update(firmware).digest('hex') };
function harness(opts = {}) {
  const writes = [], data = [];
  let listener, connected = true, rebooted = false;
  const emit = frame => listener?.(new TextEncoder().encode(JSON.stringify({ type: 'ota', ...frame })));
  const runtime = {
    getSession: () => connected ? { deviceId: 'd', mtu: 247 } : null,
    setMtu: async () => {}, setSessionOwner() {}, cancelReconnect() {},
    subscribe: async (_, __, ___, callback) => { listener = callback; return () => {}; },
    setNotifyEnabled: async () => {},
    readValue: async () => {
      if (!rebooted && opts.onPreflightRead) await opts.onPreflightRead();
      if (rebooted && opts.onVerificationRead) await opts.onVerificationRead();
      return new TextEncoder().encode(JSON.stringify({ type: 'system_info', target: 'lightble-peripheral', hardware: opts.hardware || 'esp32-s3', firmware_version: opts.sameVersion || rebooted && !opts.wrongVersion ? '1.2.0' : '1.1.0' }));
    },
    closeDevice: async () => { connected = false; },
    connectDevice: async () => { connected = true; rebooted = true; },
    writeValue: async (_, __, char, raw) => {
      if (char === OTA_UUIDS.CHAR_DATA) {
        data.push(new Uint8Array(raw));
        if (opts.prematureSuccess) emit({ status: 'success' });
        if (opts.abortDuringData) emit({ status: 'aborted', message: 'ready and success impossible' });
        return;
      }
      const payload = JSON.parse(new TextDecoder().decode(raw)); writes.push(payload);
      if (payload.op === 'start') emit({ status: 'ready', max_chunk: 7 });
      if (payload.op === 'commit' && !opts.noSuccess) { emit({ status: 'success' }); if (!opts.noReboot) connected = false; }
    },
  };
  return { manager: new OtaManager('d', null, { runtime, readyTimeoutMs: 20, confirmTimeoutMs: 20, delay: async () => {} }), writes, data };
}
test('UniApp raw binary or skipValidation cannot bypass mandatory manifest', async () => {
  for (const input of [firmware, { binary: firmware, manifest: {} }]) {
    const h = harness(); const outcome = await h.manager.startOta(input, null, null, null, { skipValidation: true, skipVerify: true });
    assert.equal(outcome.ok, false); assert.equal(h.writes.length, 0);
  }
});
test('UniApp hardware mismatch and same-version image reject before START', async () => {
  for (const option of [{ hardware: 'wrong' }, { sameVersion: true }]) {
    const h = harness(option); const outcome = await h.manager.startOta({ firmware, manifest });
    assert.equal(outcome.ok, false); assert.equal(h.writes.length, 0);
  }
});
test('UniApp start includes hardware and data respects both negotiated chunk limits', async () => {
  const h = harness(); const result = await h.manager.startOta({ firmware, manifest });
  assert.equal(result.ok, true); assert.equal(h.writes[0].hardware, manifest.hardware);
  assert.equal(h.writes[0].chunk_size, 180); assert.equal(h.writes[0].target_version, '1.2.0');
  assert.ok(h.data.every(bytes => bytes.length <= 7)); assert.deepEqual(h.writes.map(p => p.op), ['start', 'commit']);
});
test('UniApp skipVerify cannot accept a success receipt when actual running version differs', async () => {
  const h = harness({ wrongVersion: true }); const result = await h.manager.startOta({ firmware, manifest }, null, null, null, { skipVerify: true });
  assert.equal(result.ok, false); assert.equal(result.code, 'OTA_VERSION_MISMATCH');
});
test('UniApp aborted notification or premature success cannot commit successfully', async () => {
  for (const option of [{ abortDuringData: true }, { prematureSuccess: true, noSuccess: true }]) {
    const h = harness(option); const result = await h.manager.startOta({ firmware, manifest });
    assert.equal(result.ok, false); assert.equal(h.writes.at(-1).op, 'abort');
    if (option.abortDuringData) assert.equal(h.writes.some(p => p.op === 'commit'), false);
  }
});

test('UniApp cancellation during version read waits for cleanup and cannot later become success', async () => {
  let entered, release;
  const reached = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  const h = harness({ onVerificationRead: async () => { entered(); await blocked; } });
  const running = h.manager.startOta({ firmware, manifest });
  await reached;
  const cancelling = h.manager.cancelOta();
  const overlapping = await h.manager.startOta({ firmware, manifest });
  assert.equal(overlapping.code, 'OTA_BUSY');
  release();
  await cancelling;
  const result = await running;
  assert.equal(result.ok, false);
  assert.notEqual(h.manager.getOtaState(), 'SUCCESS');
  assert.equal(h.writes.filter(p => p.op === 'start').length, 1);
});

test('UniApp cancellation during preflight INFO cannot send a late START', async () => {
  let entered, release;
  const reached = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  const h = harness({ onPreflightRead: async () => { entered(); await blocked; } });
  const running = h.manager.startOta({ firmware, manifest });
  await reached;
  const cancelling = h.manager.cancelOta();
  release();
  const result = await running; await cancelling;
  assert.equal(result.ok, false); assert.deepEqual(h.writes, []);
});
test('UniApp success without a device reboot disconnect never becomes verified completion', async () => {
  const h = harness({ noReboot: true });
  const result = await h.manager.startOta({ firmware, manifest });
  assert.equal(result.ok, false); assert.equal(result.code, 'OTA_REBOOT_TIMEOUT');
  assert.notEqual(h.manager.getOtaState(), 'SUCCESS');
});
