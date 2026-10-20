import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const lanes = ['electron/public', 'tauri/src', 'wails/frontend/src'];
function fixture(lane, options = {}) {
  const listeners = new Set(), disconnects = new Set(), writes = [], waits = new Map(); let timer = 0;
  const bytes = Uint8Array.from([1, 2, 3, 4]);
  const hash = 'a'.repeat(64);
  const nodes = new Map();
  const element = () => ({ style: {}, classList: { remove() {} }, addEventListener() {}, disabled: false, textContent: '', click() {} });
  class HTMLElement {
    querySelector(key) { if (!nodes.has(key)) nodes.set(key, element()); return nodes.get(key); }
  }
  let dialog;
  const notify = text => { for (const fn of [...listeners]) fn({ deviceId: 'device', serviceUuid: dialog.otaServiceUuid, characteristicUuid: dialog.charStatusUuid, value: [...new TextEncoder().encode(text)].map(byte => byte.toString(16).padStart(2, '0')).join(' ') }); };
  let rebooted = false;
  const hex = text => [...new TextEncoder().encode(text)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const api = {
    connect: async () => { rebooted = true; return { success: true }; },
    discoverServices: async () => ({ success: true }),
    readCharacteristic: async () => ({ success: true, value: hex(JSON.stringify({ type: 'system_info', target: 'lightble-peripheral', hardware: options.wrongHardware ? 'different' : 'esp32s3', firmware_version: options.sameVersion || (rebooted && !options.wrongReadback) ? '1.0.5' : '1.0.4' })) }),
    notifyCharacteristic: async (_, __, ___, enabled) => enabled && options.subscriptionFails ? { success: false, error: 'subscribe failed' } : { success: true },
    onCharacteristicValueChanged: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    onDeviceDisconnected: fn => { disconnects.add(fn); return () => disconnects.delete(fn); },
    disconnect: async () => { for (const fn of [...disconnects]) fn({ id: 'device' }); return { success: true }; },
    writeRaw: async (device, service, char, data, withoutResponse) => {
      const entry = { device, service, char, data, withoutResponse };
      if (char === dialog.charControlUuid) entry.op = JSON.parse(new TextDecoder().decode(Uint8Array.from(data))).op;
      writes.push(entry);
      if (entry.op === 'start') {
        if (options.startAck) await options.startAck;
        if (!options.noReady) notify('{"type":"ota","status":"ready"}');
        if (options.startFails) return { success: false, error: 'start write failed' };
      }
      if (char === dialog.charDataUuid && options.dataAck) await options.dataAck;
      if (char === dialog.charDataUuid && options.dataFails) return { success: false, error: 'data write failed' };
      if (entry.op === 'commit') {
        notify('{"type":"ota","status":"success","rebooting":true}');
        if (options.commitFails) return { success: false, error: 'commit write failed' };
        if (!options.noReboot) for (const fn of [...disconnects]) fn({ id: 'device' });
      }
      if (entry.op === 'abort' && options.abortFails) return { success: false, error: 'abort write failed' };
      return { success: true };
    },
  };
  const window = { location: { search: '' } };
  if (lane === 'tauri/src') {
    window.__TAURI__ = { tauri: { invoke: async (name, args) => {
      if (name === 'notify_characteristic') return api.notifyCharacteristic(args.deviceId, args.serviceUuid, args.charUuid, args.notify);
      if (name === 'write_raw') return api.writeRaw(args.deviceId, args.serviceUuid, args.charUuid, args.data, !args.writeWithResponse);
      if (name === 'disconnect') return api.disconnect(args.deviceId);
      if (name === 'connect') return api.connect(args.deviceId);
      if (name === 'discover_services') return api.discoverServices(args.deviceId);
      if (name === 'read_characteristic') return api.readCharacteristic(args.deviceId);
      throw new Error(`unexpected command ${name}`);
    } }, event: { listen: async (name, callback) => {
      if (name === 'notification-received') return api.onCharacteristicValueChanged(data => callback({ payload: { deviceId: data.deviceId, serviceUuid: data.serviceUuid, charUuid: data.characteristicUuid, value: data.value } }));
      if (name === 'device-disconnected') return api.onDeviceDisconnected(data => callback({ payload: { deviceId: data.id } }));
      throw new Error(`unexpected event ${name}`);
    } } };
  } else window.bleAPI = api;
  const context = vm.createContext({ window, HTMLElement, customElements: { define() {} }, TextEncoder, TextDecoder, crypto: webcrypto, console, setTimeout(fn, ms) { if (ms === 30000) { waits.set(++timer, fn); return timer; } return setTimeout(fn, 0); }, clearTimeout(id) { waits.delete(id); clearTimeout(id); }, FileReader: class {
    readAsArrayBuffer(file) { queueMicrotask(() => this.onload({ target: { result: file.bytes.buffer } })); }
    readAsText(file) { queueMicrotask(() => this.onload({ target: { result: file.text } })); }
  } });
  vm.runInContext(readFileSync(new URL(`../../apps/desktop/${lane}/ota-contract.js`, import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL(`../../apps/desktop/${lane}/components/OtaDialog.js`, import.meta.url), 'utf8'), context);
  dialog = vm.runInContext('new OtaDialog()', context); dialog.connectedCallback(); dialog.show('device');
  dialog.fileBuffer = bytes; dialog.fileSha256 = hash; dialog.chunkSize = 2;
  dialog.manifestJson = { format_version: 1, target: 'lightble-peripheral', hardware: 'esp32s3', firmware_version: '1.0.5', size: bytes.length, sha256: hash };
  return { dialog, api, writes, notify, listeners, waits, disconnects, context };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
for (const lane of lanes) {
  test(`${lane} missing/incomplete/mismatched manifest cannot start or enable BLE`, async () => {
    for (const manifest of [null, {}, { target: 'lightble-peripheral', version: '1.0.5' }]) {
      const run = fixture(lane); run.dialog.manifestJson = manifest;
      await run.dialog._startOta();
      assert.equal(run.writes.length, 0); assert.equal(run.listeners.size, 0); assert.equal(run.dialog.startBtn.disabled, true);
    }
    const run = fixture(lane); run.dialog.manifestJson.sha256 = 'b'.repeat(64);
    await run.dialog._startOta(); assert.equal(run.writes.length, 0); assert.match(run.dialog.statusText.textContent, /hash_mismatch/);
  });
  test(`${lane} subscription failure stops before START and cleans event listeners`, async () => {
    const run = fixture(lane, { subscriptionFails: true });
    await run.dialog._startOta(); assert.equal(run.writes.length, 0);
    assert.match(run.dialog.statusText.textContent, /subscribe failed/);
    assert.equal(run.listeners.size, 0); assert.equal(run.disconnects.size, 0);
  });
  test(`${lane} early READY/SUCCESS before native write completion are retained; every write requests ATT response`, async () => {
    const run = fixture(lane, { reboot: true }); await run.dialog._startOta();
    assert.deepEqual(run.writes.map(entry => entry.op || 'DATA'), ['start', 'DATA', 'DATA', 'commit']);
    assert.ok(run.writes.every(entry => entry.withoutResponse === false));
    assert.equal(run.dialog._phase, 'done'); assert.match(run.dialog.statusText.textContent, /实际固件版本已核验/);
    assert.equal(run.listeners.size, 0); assert.equal(run.waits.size, 0);
  });
  test(`${lane} failed START/DATA/COMMIT acknowledgements terminate instead of reporting success`, async () => {
    for (const option of ['startFails', 'dataFails', 'commitFails']) {
      const run = fixture(lane, { [option]: true }); await run.dialog._startOta();
      assert.equal(run.dialog._phase, 'idle'); assert.equal(run.listeners.size, 0);
      if (option !== 'commitFails') assert.equal(run.writes.some(entry => entry.op === 'commit'), false);
      else assert.match(run.dialog.statusText.textContent, /结果未确认/);
    }
  });
  test(`${lane} disconnect while waiting cannot be mistaken for firmware reboot success`, async () => {
    const run = fixture(lane, { noReady: true }); const pending = run.dialog._startOta(); await flush();
    await run.api.disconnect('device'); await pending;
    assert.equal(run.dialog._phase, 'idle'); assert.match(run.dialog.statusText.textContent, /结果未确认/);
    assert.equal(run.writes.filter(entry => !entry.op).length, 0);
  });
  test(`${lane} timeout tears down the old transaction and never resumes DATA`, async () => {
    const run = fixture(lane, { noReady: true }); const pending = run.dialog._startOta(); await flush();
    assert.equal(run.waits.size, 1); [...run.waits.values()][0](); await pending;
    assert.match(run.dialog.statusText.textContent, /超时/); assert.equal(run.listeners.size, 0);
    run.notify('{"type":"ota","status":"ready"}'); assert.equal(run.writes.filter(entry => !entry.op).length, 0);
  });
  test(`${lane} cancellation rejects the old waiter; stale READY cannot restart it`, async () => {
    const run = fixture(lane, { noReady: true }); const pending = run.dialog._startOta(); await flush();
    const oldCallback = [...run.listeners][0]; await run.dialog._cancel(); await pending;
    oldCallback({ deviceId: 'device', characteristicUuid: run.dialog.charStatusUuid, value: '72 65 61 64 79' });
    assert.deepEqual(run.writes.map(entry => entry.op), ['start', 'abort']); assert.equal(run.listeners.size, 0);
    assert.equal(run.dialog.overlay.style.display, 'none');
  });
  test(`${lane} failed abort stays visible and never says abort was delivered`, async () => {
    const run = fixture(lane, { noReady: true, abortFails: true }); const pending = run.dialog._startOta(); await flush();
    await run.dialog._cancel(); await pending;
    assert.match(run.dialog.statusText.textContent, /取消未确认/); assert.equal(run.dialog.overlay.style.display, 'flex');
    assert.equal(run.dialog.statusText.textContent.includes('已发送'), false);
  });
  test(`${lane} preflight hardware and same-version rejection have no START`, async () => {
    for (const option of ['wrongHardware', 'sameVersion']) {
      const run = fixture(lane, { [option]: true }); await run.dialog._startOta();
      assert.equal(run.writes.length, 0); assert.equal(run.dialog._phase, 'idle');
    }
  });
  test(`${lane} success receipt with wrong actual version never reports 100% completion`, async () => {
    const run = fixture(lane, { wrongReadback: true }); await run.dialog._startOta();
    assert.equal(run.dialog._phase, 'idle'); assert.match(run.dialog.statusText.textContent, /实际版本不符/);
    assert.notEqual(run.dialog.progressFill.style.width, '100%');
  });
  test(`${lane} changing firmware cannot re-enable a rejected manifest`, async () => {
    const run = fixture(lane); run.dialog.manifestJson.sha256 = 'b'.repeat(64);
    await run.dialog._handleFile({ name: 'firmware.bin', bytes: Uint8Array.from([9, 8]) });
    assert.equal(run.dialog.startBtn.disabled, true); assert.equal(run.dialog.manifestTarget, null);
  });
}

for (const lane of lanes) {
  test(`${lane} a DATA acknowledgement arriving after cancellation cannot continue chunks or overwrite a reopened dialog`, async () => {
    let finishData;
    const dataAck = new Promise(resolve => { finishData = resolve; });
    const run = fixture(lane, { dataAck });
    const pending = run.dialog._startOta(); await flush();
    assert.equal(run.writes.filter(entry => !entry.op).length, 1);
    await run.dialog._cancel();
    run.dialog.show('other-device');
    const message = run.dialog.statusText.textContent;
    finishData(); await pending;
    assert.equal(run.writes.filter(entry => !entry.op).length, 1);
    assert.equal(run.writes.some(entry => entry.op === 'commit'), false);
    assert.equal(run.dialog.deviceId, 'other-device');
    assert.equal(run.dialog.statusText.textContent, message);
  });
}

test('desktop OTA implementation and strict manifest contract are identical across all three shells', () => {
  for (const name of ['components/OtaDialog.js', 'ota-contract.js']) {
    const sources = lanes.map(lane => readFileSync(new URL(`../../apps/desktop/${lane}/${name}`, import.meta.url), 'utf8'));
    assert.equal(sources[0], sources[1]); assert.equal(sources[1], sources[2]);
  }
});

for (const lane of lanes) {
  test(`${lane} success receipt without a device reboot disconnect cannot verify completion`, async () => {
    const run = fixture(lane, { noReboot: true });
    await run.dialog._startOta();
    assert.equal(run.dialog._phase, 'idle');
    assert.match(run.dialog.statusText.textContent, /未断开重启/);
    assert.notEqual(run.dialog.progressFill.style.width, '100%');
  });
}
