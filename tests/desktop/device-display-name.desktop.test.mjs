/**
 * F005 显示名批准链桌面镜像测试（E-WIN / T-WIN）
 *
 * 镜像源：apps/uniapp/services/ble-runtime/device-display-name.js（批准链正典纯函数）。
 * 锁定：
 * 1. 两线 device-display-name.js 逐字节一致；
 * 2. 批准链七跳语义（name → localName → AD 0x09 → AD 0x08 → profile → manufacturer → 未命名兜底）；
 * 3. 数据层不污染：空名设备不再显示「未知设备/Unknown」。
 *
 * Run: node --test tests/desktop/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(import.meta.url);

function loadLine(relDir) {
  global.window = {};
  require_(resolve(ROOT, relDir, 'device-display-name.js'));
  const api = global.window.SmartBLEDisplayName;
  delete global.window;
  return api;
}

const electron = loadLine('apps/desktop/electron/public');
const tauri = loadLine('apps/desktop/tauri/src');

const R = electron.resolveDeviceDisplayName;

test('mirror: device-display-name.js 在两线间逐字节一致', () => {
  const a = readFileSync(resolve(ROOT, 'apps/desktop/electron/public/device-display-name.js'), 'utf8');
  const b = readFileSync(resolve(ROOT, 'apps/desktop/tauri/src/device-display-name.js'), 'utf8');
  assert.equal(a, b);
});

test('链 1: device.name 命中（GAP 名）', () => {
  const r = R({ name: 'My Device', deviceId: 'AA:BB:CC:DD:EE:FF' });
  assert.equal(r.displayName, 'My Device');
  assert.equal(r.source, 'deviceName');
});

test('链 2: localName 投影（noble/btleplug 主路径：name 为空时走广播名）', () => {
  const r = R({ name: '', localName: 'BLEToolkit-Server', deviceId: '10:B4:1D:CD:23:8D' });
  assert.equal(r.displayName, 'BLEToolkit-Server');
  assert.equal(r.source, 'localName');
  assert.equal(r.confidence, 'high');
});

test('链 3/4: AD 结构 0x09/0x08 解析', () => {
  // raw AD: len=8 type=09 "SHID-AB1" + len=3 type=02 flags
  const adv = new Uint8Array([
    0x08, 0x09, 0x53, 0x48, 0x49, 0x44, 0x2d, 0x41, 0x42,
    0x02, 0x01, 0x06,
  ]);
  const hex = Array.from(adv).map((b) => b.toString(16).padStart(2, '0')).join('');
  const r = R({ name: '', rawAdvertisement: hex, deviceId: 'xx-1234' });
  assert.equal(r.displayName, 'SHID-AB');
  assert.equal(r.source, 'localName');
});

test('链 5: profile 名兜底（Smart HID 接入后主路径）', () => {
  const r = R({ name: '', profileName: 'Smart HID', deviceId: 'd-9012' });
  assert.equal(r.displayName, 'Smart HID');
  assert.equal(r.source, 'profile');
});

test('链 7: 未命名兜底 = 「未命名 BLE · ID后四位」（不显示 Unknown/未知设备）', () => {
  const r = R({ name: '', deviceId: '10:B4:1D:CD:23:8F' });
  assert.equal(r.displayName, '未命名 BLE · 238F');
  assert.equal(r.source, 'deviceId');
  const r2 = R({});
  assert.equal(r2.displayName, '未命名 BLE · ----');
});

test('attachDeviceDisplayName: 不修改入参、附加投影字段', () => {
  const device = { name: '', localName: 'X', deviceId: 'ab-9911' };
  const out = electron.attachDeviceDisplayName(device);
  assert.equal(out.displayName, 'X');
  assert.equal(device.displayName, undefined, '入参不得被污染');
});

test('T-WIN 线 API 行为与 E-WIN 一致', () => {
  assert.equal(
    tauri.resolveDeviceDisplayName({ name: '', deviceId: '10:B4:1D:CD:23:8D' }).displayName,
    electron.resolveDeviceDisplayName({ name: '', deviceId: '10:B4:1D:CD:23:8D' }).displayName,
  );
});
