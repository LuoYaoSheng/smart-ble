// tests/target/firmware/peripheral-target.test.mjs
// ESP32-PERIPHERAL-001 — peripheral fixture name/services/device info/test control/serial.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel) {
  const path = resolve(ROOT, rel);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const FW = [
  'hardware/esp32/LightBLE/src/main.cpp',
  'hardware/esp32/LightBLE/src/ble_peripheral.cpp',
  'hardware/esp32/LightBLE/src/device_info.cpp',
  'hardware/esp32/LightBLE/src/test_control.cpp',
  'hardware/esp32/LightBLE/src/serial_events.cpp',
  'hardware/esp32/LightBLE/src/permissions_demo.cpp',
  'hardware/esp32/LightBLE/src/ota_server.cpp',
  'hardware/esp32/LightBLE/include/fixture_config.h',
  'hardware/esp32/LightBLE/include/ota_server.h',
  'hardware/esp32/LightBLE/include/device_info.h',
  'hardware/esp32/LightBLE/include/test_control.h',
].map(read).join('\n');

const PIO = read('hardware/esp32/LightBLE/platformio.ini');
const HEADER = read('hardware/esp32/LightBLE/include/firmware_build_info.h');

test('1. BLE name exists', () => {
  assert.match(FW, /#define\s+DEVICE_NAME\s+"BLEToolkit-Server"/);
  assert.match(FW, /NimBLEDevice::init\("BLEToolkit-Server"\)/);
});

test('2. service UUID exists', () => {
  assert.match(FW, /4fafc201-1fb5-459e-8fcc-c5c9c331914b/i);
  assert.match(FW, /4fafc201-1fb5-459e-8fcc-c5c9c331914c/i);
});

test('3. OTA UUID exists', () => {
  assert.match(FW, /4fafc201-1fb5-459e-8fcc-c5c9c331914d/i);
  assert.match(FW, /beb5483e-36e1-4688-b7f5-ea07361b26c0/i);
  assert.match(FW, /beb5483e-36e1-4688-b7f5-ea07361b26c1/i);
  assert.match(FW, /beb5483e-36e1-4688-b7f5-ea07361b26c2/i);
});

test('4. device info exists', () => {
  assert.ok(existsSync(resolve(ROOT, 'hardware/esp32/LightBLE/src/device_info.cpp')));
  assert.match(FW, /firmware_version/);
  assert.match(FW, /hardware/);
  assert.match(FW, /uptime/);
  assert.match(FW, /fixture_role/);
});

test('5. test control exists', () => {
  assert.ok(existsSync(resolve(ROOT, 'hardware/esp32/LightBLE/src/test_control.cpp')));
  assert.match(FW, /FF00|0xFF00/);
  assert.match(FW, /FF01|0xFF01/);
  assert.match(FW, /cmd.*led|LED_ON|blink/i);
  assert.match(FW, /delayed_response/);
  assert.match(FW, /disconnect_on_write/);
});

test('6. advertisement metadata', () => {
  assert.match(FW, /setManufacturerData|MFG_PAYLOAD|LightBLE/);
  assert.match(FW, /addServiceUUID|SERVICE_UUID/);
  assert.match(FW, /setName\(DEVICE_NAME\)|setScanResponse/);
});

test('7. serial boot JSON', () => {
  assert.match(FW, /"type".*"boot"|type.*=.*"boot"/);
  assert.match(FW, /emitBootInfo/);
});

test('8. fixture_role=peripheral', () => {
  assert.match(FW, /FIXTURE_ROLE_PERIPHERAL\s+"peripheral"|fixture_role.*=.*"peripheral"/);
});

test('9. no hardcoded COM', () => {
  const active = PIO.split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('#');
    })
    .join('\n');
  assert.doesNotMatch(active, /upload_port\s*=\s*COM\d+/i);
  assert.doesNotMatch(active, /monitor_port\s*=\s*COM\d+/i);
  assert.doesNotMatch(active, /\/dev\/cu\./);
});

test('10. build metadata exists', () => {
  assert.ok(existsSync(resolve(ROOT, 'hardware/esp32/scripts/build-info.py')));
  assert.match(HEADER, /FW_VERSION/);
  assert.match(HEADER, /FW_GIT_SHA/);
});
