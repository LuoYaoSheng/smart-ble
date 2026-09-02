// tests/target/unit/broadcast-payload-target.test.mjs
// TEST-U-014 + PAGE-BROADCAST-001 payload builder：31/32、manufacturer/service data、禁止截断。

import test from 'node:test';
import assert from 'node:assert/strict';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-014 REQ-039/042 FEAT-042/043 PAGE-008 FLOW-008 DEC-004 S-38';

test('TEST-U-014 目标层：utils/advertising-payload.js analyzeAdvertisingPayload', async () => {
  const m = await importTarget('apps/uniapp/utils/advertising-payload.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  assert.equal(m.module.MAX_LEGACY_ADVERTISING_BYTES, 31, '31 字节常量（REQ-039）');
  if (typeof m.module.analyzeAdvertisingPayload !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 analyzeAdvertisingPayload 缺失'));
  }

  const ok31 = m.module.analyzeAdvertisingPayload({ localName: 'A'.repeat(9), serviceUuid: '180D', manufacturerData: '' });
  assert.ok(ok31 && typeof ok31 === 'object', '分析结果为对象');
  if ('overBudget' in ok31 || 'over_budget' in ok31) {
    assert.equal(ok31.overBudget ?? ok31.over_budget, false, '31 内不超预算');
  }

  const over = m.module.analyzeAdvertisingPayload({ localName: 'A'.repeat(28), serviceUuid: '180D' });
  const total = over?.totalBytes ?? over?.total ?? over?.estimatedBytes;
  if (total === undefined) {
    return assert.fail(notImplemented('TEST-U-014 REQ-039', '分析结果缺 totalBytes/overBudget——无法驱动 31/32 阻止（S-38）'));
  }
  assert.ok(typeof total === 'number', '字节数为数值');
});

async function loadBuilder() {
  const m = await importTarget('apps/uniapp/services/broadcast/payload-builder.js');
  if (!m.ok) assert.fail(notImplemented('PAGE-BROADCAST-001 payload-builder', m.message));
  return m.module;
}

test('9 manufacturer data', async () => {
  const builder = await loadBuilder();
  const payload = builder.buildBroadcastPayload({
    deviceName: 'A',
    serviceUuid: 'FFE0',
    manufacturerId: '00E0',
    manufacturerData: 'LightBLE',
  }, { includeDeviceName: false });
  assert.ok(payload.manufacturer);
  assert.equal(payload.manufacturer.id, 0x00e0);
  assert.equal(payload.manufacturer.data, 'LightBLE');
});

test('10 service data', async () => {
  const builder = await loadBuilder();
  const payload = builder.buildBroadcastPayload({
    deviceName: '',
    serviceUuid: '',
    serviceDataUuid: 'FFE0',
    serviceData: 'AB',
  }, { includeDeviceName: false, includeServiceUuid: false });
  assert.ok(payload.serviceDataBlock);
  assert.equal(payload.serviceDataUuid, 'FFE0');
  assert.ok(payload.parts.serviceData > 0);
});

test('11 31 bytes', async () => {
  const builder = await loadBuilder();
  const payload = builder.buildBroadcastPayload({
    deviceName: 'SmartBLE',
    serviceUuid: 'FFE0',
    manufacturerId: '0001',
    manufacturerData: 'BLE',
  });
  assert.ok(payload.totalBytes <= 31);
  assert.equal(payload.valid, true);
  assert.equal(payload.overBudget, false);
});

test('12 32 bytes', async () => {
  const builder = await loadBuilder();
  // Force a 32-byte pack with allow32
  const bigName = 'N'.repeat(28);
  const denied = builder.buildBroadcastPayload({
    deviceName: bigName,
    serviceUuid: '180D',
  });
  assert.ok(denied.totalBytes >= 32 || denied.overBudget);
  assert.equal(denied.valid, false);
  assert.equal(denied.error?.code, 'PAYLOAD_TOO_LARGE');

  const allowed = builder.buildBroadcastPayload({
    deviceName: bigName,
    serviceUuid: '180D',
  }, { allow32: true, maxBytes: 32 });
  if (allowed.totalBytes === 32) {
    assert.equal(allowed.valid, true);
  } else {
    assert.ok(allowed.totalBytes > 32 ? allowed.valid === false : true);
  }
});

test('13 overflow', async () => {
  const builder = await loadBuilder();
  const payload = builder.buildBroadcastPayload({
    deviceName: 'X'.repeat(40),
    serviceUuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
    manufacturerId: 'ffff',
    manufacturerData: 'OVERFLOW-DATA',
  });
  assert.equal(payload.valid, false);
  assert.equal(payload.overBudget, true);
  assert.equal(payload.error.code, 'PAYLOAD_TOO_LARGE');
});

test('14 no truncate', async () => {
  const builder = await loadBuilder();
  const input = {
    deviceName: 'TRUNCATE-TEST-NAME',
    serviceUuid: 'FFE0',
    manufacturerId: '0001',
    manufacturerData: 'ABCDEFGHIJKLMNOP',
  };
  const payload = builder.buildBroadcastPayload(input);
  assert.equal(payload.deviceName, input.deviceName);
  assert.equal(payload.manufacturerData, input.manufacturerData);
  assert.ok(payload.overBudget || payload.valid);
  if (payload.overBudget) {
    assert.notEqual(payload.manufacturerData.length, 0, '不得静默截断厂商数据');
  }
});
