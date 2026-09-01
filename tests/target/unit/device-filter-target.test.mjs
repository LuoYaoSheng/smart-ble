// tests/target/unit/device-filter-target.test.mjs
// TEST-U-007 设备过滤器：筛选命中/不命中，N/M 双数口径（S-02 筛选空态）。
// 目标：REQ-014；FEAT-014；PAGE-001；FLOW-002。
// RUNTIME-FILTER-001：keyword 跨 name/localName/id/manufacturer/serviceUUID。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-007 REQ-014 FEAT-014 PAGE-001 FLOW-002 S-02';

async function loadFilter() {
  const m = await importTarget('apps/uniapp/services/ble-runtime/device-filter.js');
  if (!m.ok) {
    assert.fail(notImplemented(IDS, m.message));
  }
  if (typeof m.module.filterBleDevices !== 'function') {
    assert.fail(notImplemented(IDS, '目标接口 filterBleDevices 缺失'));
  }
  return m.module;
}

test('TEST-U-007 目标层：services/ble-runtime/device-filter.js filterBleDevices', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [
    { deviceId: 'F1', name: 'LightBLE-Server', RSSI: -50 },
    { deviceId: 'F2', name: 'SmartHID-Dev', RSSI: -70 },
    { deviceId: 'F3', name: '', RSSI: -80 },
  ];
  const all = filterBleDevices(devices, {});
  assert.equal(all.length, devices.length, '无筛选条件=全集（S-02 的 M）');
  const hit = filterBleDevices(devices, { keyword: 'LightBLE' });
  assert.ok(hit.length >= 1 && hit.length <= devices.length, '筛选结果 N 介于 1..M');
  assert.ok(hit.every((d) => String(d.name).includes('LightBLE')), '命中项匹配关键词');
  const none = filterBleDevices(devices, { keyword: '不存在的名字' });
  assert.equal(none.length, 0, '全不命中返回空数组（触发 S-02 文案而非清空 M）');
});

test('TEST-U-007-01 name match', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{ deviceId: '1', name: 'ESP32-BLE-Server', RSSI: -40 }];
  const hit = filterBleDevices(devices, { keyword: 'esp32' });
  assert.equal(hit.length, 1);
  assert.equal(hit[0].deviceId, '1');
});

test('TEST-U-007-02 localName match', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{ deviceId: '2', name: '', localName: 'SHID-AABB', RSSI: -40 }];
  const hit = filterBleDevices(devices, { keyword: 'shid' });
  assert.equal(hit.length, 1);
});

test('TEST-U-007-03 id match', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{ deviceId: 'AA:BB:CC:11', name: 'X', RSSI: -40 }];
  const hit = filterBleDevices(devices, { keyword: 'bb:cc' });
  assert.equal(hit.length, 1);
});

test('TEST-U-007-04 service UUID match', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{ deviceId: '3', name: 'Svc', serviceUUIDs: ['0000FFE0-0000-1000-8000-00805F9B34FB'], RSSI: -40 }];
  const hit = filterBleDevices(devices, { keyword: 'ffe0' });
  assert.equal(hit.length, 1);
});

test('TEST-U-007-05 manufacturer match', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{ deviceId: '4', name: 'Mfg', manufacturer: 'AcmeCorp', RSSI: -40 }];
  const hit = filterBleDevices(devices, { keyword: 'acme' });
  assert.equal(hit.length, 1);
});

test('TEST-U-007-06 case insensitive', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{ deviceId: '5', name: 'ESP32-BLE-Server', RSSI: -40 }];
  assert.equal(filterBleDevices(devices, { keyword: 'ESP32' }).length, 1);
  assert.equal(filterBleDevices(devices, { keyword: 'esp32' }).length, 1);
  assert.equal(filterBleDevices(devices, { keyword: 'EsP32' }).length, 1);
});

test('TEST-U-007-07 trim keyword', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{ deviceId: '6', name: 'LightBLE', RSSI: -40 }];
  assert.equal(filterBleDevices(devices, { keyword: '  LightBLE  ' }).length, 1);
});

test('TEST-U-007-08 empty keyword returns all (after other filters)', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [
    { deviceId: 'a', name: 'A', RSSI: -40 },
    { deviceId: 'b', name: 'B', RSSI: -40 },
  ];
  assert.equal(filterBleDevices(devices, { keyword: '' }).length, 2);
  assert.equal(filterBleDevices(devices, { keyword: '   ' }).length, 2);
  assert.equal(filterBleDevices(devices, {}).length, 2);
});

test('TEST-U-007-09 undefined fields safe', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [
    { deviceId: 'u1', RSSI: -40 },
    null,
    undefined,
    { deviceId: 'u2', name: 'ok', RSSI: -40 },
  ];
  const hit = filterBleDevices(devices, { keyword: 'ok' });
  assert.equal(hit.length, 1);
  assert.equal(hit[0].deviceId, 'u2');
});

test('TEST-U-007-10 multiple devices subset', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [
    { deviceId: 'm1', name: 'ESP32-A', RSSI: -40 },
    { deviceId: 'm2', name: 'Other', RSSI: -40 },
    { deviceId: 'm3', localName: 'esp32-b', RSSI: -40 },
  ];
  const hit = filterBleDevices(devices, { keyword: 'esp32' });
  assert.equal(hit.length, 2);
  assert.deepEqual(hit.map((d) => d.deviceId).sort(), ['m1', 'm3']);
});

test('TEST-U-007-11 no mutation', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [
    { deviceId: 'n1', name: 'Alpha', RSSI: -40 },
    { deviceId: 'n2', name: 'Beta', RSSI: -40 },
  ];
  const snapshot = structuredClone(devices);
  filterBleDevices(devices, { keyword: 'alpha' });
  assert.deepEqual(devices, snapshot);
});

test('TEST-U-007-12 unicode keyword', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{ deviceId: 'c1', name: '智能灯-客厅', RSSI: -40 }];
  assert.equal(filterBleDevices(devices, { keyword: '客厅' }).length, 1);
  assert.equal(filterBleDevices(devices, { keyword: '卧室' }).length, 0);
});

test('TEST-U-007-13 duplicate deviceId not duplicated', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [
    { deviceId: 'dup', name: 'Same', RSSI: -40 },
    { deviceId: 'dup', name: 'Same', RSSI: -41 },
  ];
  const hit = filterBleDevices(devices, { keyword: 'same' });
  assert.equal(hit.length, 1);
});

test('TEST-U-007-14 service UUID case insensitive', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{ deviceId: 's1', name: 'S', serviceUUIDs: ['FFE0'], RSSI: -40 }];
  assert.equal(filterBleDevices(devices, { keyword: 'ffe0' }).length, 1);
  assert.equal(filterBleDevices(devices, { keyword: 'FFE0' }).length, 1);
});

test('TEST-U-007-15 manufacturer hex bytes', async () => {
  const { filterBleDevices } = await loadFilter();
  const devices = [{
    deviceId: 'h1',
    name: 'HexDev',
    manufacturerData: new Uint8Array([0x01, 0xab, 0xcd]),
    RSSI: -40,
  }];
  assert.equal(filterBleDevices(devices, { keyword: 'abcd' }).length, 1);
  assert.equal(filterBleDevices(devices, { keyword: '9999' }).length, 0);
});
