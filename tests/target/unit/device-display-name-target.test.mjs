// tests/target/unit/device-display-name-target.test.mjs
// RUNTIME-DISPLAY-NAME-001：统一 displayName 解析（AD 0x09/0x08、fallback、确定性）。
// 目标：REQ-013；FEAT-013；PAGE-001；FLOW-002。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-006 REQ-013 FEAT-013 PAGE-001 FLOW-002 RUNTIME-DISPLAY-NAME-001';

async function load() {
  const m = await importTarget('apps/uniapp/services/ble-runtime/device-display-name.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  const {
    resolveDeviceDisplayName,
    extractLocalNameFromAdvertisement,
    normalizeDisplayName,
    attachDeviceDisplayName,
  } = m.module;
  if (typeof resolveDeviceDisplayName !== 'function') {
    assert.fail(notImplemented(IDS, 'resolveDeviceDisplayName 缺失'));
  }
  return {
    resolveDeviceDisplayName,
    extractLocalNameFromAdvertisement,
    normalizeDisplayName,
    attachDeviceDisplayName,
  };
}

function adBytes(type, text) {
  const encoded = new TextEncoder().encode(text);
  const out = new Uint8Array(2 + encoded.length);
  out[0] = 1 + encoded.length;
  out[1] = type;
  out.set(encoded, 2);
  return out;
}

function adHex(type, text) {
  return [...adBytes(type, text)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

test('TEST-U-006-DN-01 0x09 Complete Local Name', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({
    deviceId: 'D1',
    advertisementData: [{ type: 0x09, value: 'ESP32-BLE-Server' }],
  });
  assert.equal(r.displayName, 'ESP32-BLE-Server');
  assert.equal(r.source, 'localName');
  assert.equal(r.confidence, 'high');
});

test('TEST-U-006-DN-02 0x08 Short Local Name', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({
    deviceId: 'D2',
    advertisementData: [{ type: 0x08, value: 'ESP32' }],
  });
  assert.equal(r.displayName, 'ESP32');
  assert.equal(r.source, 'shortLocalName');
  assert.equal(r.confidence, 'medium');
});

test('TEST-U-006-DN-03 device.name fallback', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({ deviceId: 'D3', name: 'PlatformName' });
  assert.equal(r.displayName, 'PlatformName');
  assert.equal(r.source, 'deviceName');
  assert.equal(r.confidence, 'medium');
});

test('TEST-U-006-DN-04 manufacturer fallback', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({ deviceId: 'D4', manufacturer: 'AcmeCorp' });
  assert.equal(r.displayName, 'AcmeCorp');
  assert.equal(r.source, 'manufacturer');
  assert.equal(r.confidence, 'low');
});

test('TEST-U-006-DN-05 device id fallback', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({ deviceId: 'AA:BB:CC:A83F' });
  assert.match(r.displayName, /^未命名 BLE · /);
  assert.match(r.displayName, /A83F$/i);
  assert.equal(r.source, 'deviceId');
  assert.equal(r.confidence, 'low');
  assert.notEqual(r.displayName, '');
  assert.doesNotMatch(r.displayName, /Unknown Device|BLE Device/i);
});

test('TEST-U-006-DN-06 UTF-8', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({
    deviceId: 'D6',
    advertisData: adBytes(0x09, '蓝牙设备'),
  });
  assert.equal(r.displayName, '蓝牙设备');
});

test('TEST-U-006-DN-07 empty localName skips', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({
    deviceId: 'D7ABCD',
    localName: '   ',
    name: '',
  });
  assert.match(r.displayName, /未命名 BLE/);
});

test('TEST-U-006-DN-08 invalid bytes no throw', async () => {
  const { resolveDeviceDisplayName, extractLocalNameFromAdvertisement } = await load();
  assert.doesNotThrow(() => resolveDeviceDisplayName({ deviceId: 'D8', advertisData: [0xff] }));
  assert.doesNotThrow(() => extractLocalNameFromAdvertisement({ advertisData: null }));
  const r = resolveDeviceDisplayName({ deviceId: 'D8XXXX', advertisData: [0xff] });
  assert.match(r.displayName, /未命名 BLE/);
});

test('TEST-U-006-DN-09 hex string advertisement', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({
    deviceId: 'D9',
    advertisData: adHex(0x09, 'HexName'),
  });
  assert.equal(r.displayName, 'HexName');
  assert.equal(r.source, 'localName');
});

test('TEST-U-006-DN-10 Uint8Array', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({
    deviceId: 'D10',
    advertisData: adBytes(0x09, 'U8Name'),
  });
  assert.equal(r.displayName, 'U8Name');
});

test('TEST-U-006-DN-11 Array of bytes', async () => {
  const { resolveDeviceDisplayName } = await load();
  const r = resolveDeviceDisplayName({
    deviceId: 'D11',
    advertisData: [...adBytes(0x08, 'ArrShort')],
  });
  assert.equal(r.displayName, 'ArrShort');
  assert.equal(r.source, 'shortLocalName');
});

test('TEST-U-006-DN-12 priority order (REQ-013)', async () => {
  const { resolveDeviceDisplayName } = await load();
  assert.equal(
    resolveDeviceDisplayName({
      deviceId: 'P',
      name: 'N',
      localName: 'L',
      advertisementData: [{ type: 0x09, value: 'AD09' }],
    }).displayName,
    'N',
  );
  assert.equal(
    resolveDeviceDisplayName({
      deviceId: 'P',
      localName: 'L',
      advertisementData: [{ type: 0x09, value: 'AD09' }, { type: 0x08, value: 'AD08' }],
    }).displayName,
    'L',
  );
  assert.equal(
    resolveDeviceDisplayName({
      deviceId: 'P',
      advertisementData: [{ type: 0x09, value: 'AD09' }, { type: 0x08, value: 'AD08' }],
    }).displayName,
    'AD09',
  );
  assert.equal(
    resolveDeviceDisplayName({
      deviceId: 'P',
      advertisementData: [{ type: 0x08, value: 'AD08' }],
      manufacturer: 'Mfg',
    }).displayName,
    'AD08',
  );
});

test('TEST-U-006-DN-13 source correct', async () => {
  const { resolveDeviceDisplayName } = await load();
  assert.equal(resolveDeviceDisplayName({ deviceId: 'S', name: 'N' }).source, 'deviceName');
  assert.equal(resolveDeviceDisplayName({ deviceId: 'S', localName: 'L' }).source, 'localName');
  assert.equal(
    resolveDeviceDisplayName({ deviceId: 'S', advertisementData: [{ type: 0x09, value: 'C' }] }).source,
    'localName',
  );
  assert.equal(
    resolveDeviceDisplayName({ deviceId: 'S', advertisementData: [{ type: 0x08, value: 'S' }] }).source,
    'shortLocalName',
  );
});

test('TEST-U-006-DN-14 confidence correct', async () => {
  const { resolveDeviceDisplayName } = await load();
  assert.equal(resolveDeviceDisplayName({ deviceId: 'C', localName: 'L' }).confidence, 'high');
  assert.equal(resolveDeviceDisplayName({ deviceId: 'C', name: 'N' }).confidence, 'medium');
  assert.equal(resolveDeviceDisplayName({ deviceId: 'C', manufacturer: 'M' }).confidence, 'low');
  assert.equal(resolveDeviceDisplayName({ deviceId: 'CXXXX' }).confidence, 'low');
});

test('TEST-U-006-DN-15 no mutation', async () => {
  const { resolveDeviceDisplayName, attachDeviceDisplayName } = await load();
  const raw = { deviceId: 'M1', name: 'Keep', localName: 'L' };
  const snapshot = JSON.stringify(raw);
  resolveDeviceDisplayName(raw);
  attachDeviceDisplayName(raw);
  assert.equal(JSON.stringify(raw), snapshot);
});

test('TEST-U-006-DN-16 deterministic', async () => {
  const { resolveDeviceDisplayName } = await load();
  const input = { deviceId: 'DET1234', advertisData: adHex(0x09, 'Same') };
  const a = resolveDeviceDisplayName(input);
  const b = resolveDeviceDisplayName(input);
  assert.deepEqual(a, b);
});

test('TEST-U-006-DN-17 normalizeDisplayName keeps case and separators', async () => {
  const { normalizeDisplayName } = await load();
  assert.equal(normalizeDisplayName('  ESP32-BLE_Server  '), 'ESP32-BLE_Server');
  assert.equal(normalizeDisplayName(''), '');
  assert.equal(normalizeDisplayName(null), '');
});

test('TEST-U-006-DN-18 attachDeviceDisplayName fields', async () => {
  const { attachDeviceDisplayName } = await load();
  const out = attachDeviceDisplayName({ deviceId: 'ATT1', name: 'Named' });
  assert.equal(out.displayName, 'Named');
  assert.equal(out.displayNameSource, 'deviceName');
  assert.equal(out.displayNameConfidence, 'medium');
  assert.equal(out.name, 'Named');
});
