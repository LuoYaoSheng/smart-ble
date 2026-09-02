// tests/target/firmware/fixture-contract.test.mjs
// TEST-E-001 TEST-C-012 PROTO-001 PROTO-002 PROTO-003 PROTO-004 PROTO-005
// 固件源码与 ble-fixture-target.json 契约一致性。只读静态检查（不构建、不烧写）。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const fixture = JSON.parse(readFileSync(`${ROOT}/contracts/target/ble-fixture-target.json`, 'utf8'));
const FW_PATHS = [
  'hardware/esp32/LightBLE/src/main.cpp',
  'hardware/esp32/LightBLE/src/ble_peripheral.cpp',
  'hardware/esp32/LightBLE/src/device_info.cpp',
  'hardware/esp32/LightBLE/src/test_control.cpp',
  'hardware/esp32/LightBLE/src/observer_main.cpp',
  'hardware/esp32/LightBLE/src/observer_scanner.cpp',
  'hardware/esp32/LightBLE/src/ota_server.cpp',
  'hardware/esp32/LightBLE/include/ota_server.h',
  'hardware/esp32/LightBLE/include/fixture_config.h',
];
const fw = FW_PATHS
  .map((rel) => {
    const path = `${ROOT}/${rel}`;
    return existsSync(path) ? readFileSync(path, 'utf8') : '';
  })
  .join('\n');

test('TEST-E-001 固件源码存在（夹具工程在位）', () => {
  assert.ok(fw.length > 0, 'hardware/esp32/LightBLE peripheral sources 存在');
});

test('TEST-E-001 夹具广播名称与契约一致（双夹具）', () => {
  if (!fw) assert.fail('固件源缺失');
  for (const mode of fixture.modes) {
    assert.ok(fw.includes(mode.advertised_name), `固件含广播名 ${mode.advertised_name}`);
  }
});

test('TEST-E-001 服务/特征 UUID 与契约一致', () => {
  if (!fw) assert.fail('固件源缺失');
  for (const svc of fixture.services) {
    assert.ok(fw.toLowerCase().includes(svc.uuid.toLowerCase()), `固件含服务 UUID ${svc.id}`);
    for (const ch of svc.characteristics || []) {
      const u = (ch.uuid || ch).toLowerCase();
      assert.ok(fw.toLowerCase().includes(u), `固件含特征 UUID ${String(u).slice(0, 13)}…（${svc.id}）`);
    }
  }
});

test('TEST-E-001 LED 指令表与契约一致', () => {
  if (!fw) assert.fail('固件源缺失');
  for (const cmd of fixture.led_commands) {
    if (cmd.hex) assert.ok(fw.toUpperCase().includes(String(cmd.hex).toUpperCase()), `固件含 LED 指令 ${cmd.hex}`);
  }
});
