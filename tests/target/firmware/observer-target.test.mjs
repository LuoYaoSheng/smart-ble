// tests/target/firmware/observer-target.test.mjs
// ESP32-OBSERVER-001 — Observer env/role/scan/parser/match/isolation.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  parseAdvertisementPayload,
  buildAdvertisementEvent,
  buildAdStructure,
  concatAds,
  encodeUuid128Le,
  FIXTURE_UUIDS,
  computeFixtureMatch,
  matchesOtaService,
} from './lib/observer-ad-parser.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel) {
  const path = resolve(ROOT, rel);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const OBS = [
  'hardware/esp32/LightBLE/src/observer_main.cpp',
  'hardware/esp32/LightBLE/src/observer_scanner.cpp',
  'hardware/esp32/LightBLE/src/observer_parser.cpp',
  'hardware/esp32/LightBLE/src/observer_events.cpp',
  'hardware/esp32/LightBLE/include/observer_scanner.h',
  'hardware/esp32/LightBLE/include/observer_parser.h',
  'hardware/esp32/LightBLE/include/observer_events.h',
  'hardware/esp32/LightBLE/include/fixture_config.h',
].map(read).join('\n');

const PIO = read('hardware/esp32/LightBLE/platformio.ini');
const HEADER = read('hardware/esp32/LightBLE/include/firmware_build_info.h');
const PERIPH = read('hardware/esp32/LightBLE/src/ble_peripheral.cpp')
  + read('hardware/esp32/LightBLE/src/main.cpp');

test('1. fixture_observer env', () => {
  assert.match(PIO, /\[env:fixture_observer\]/);
  assert.match(PIO, /observer_main\.cpp/);
  assert.match(PIO, /observer_scanner\.cpp/);
});

test('2. role=observer', () => {
  assert.match(OBS, /FIXTURE_ROLE_OBSERVER\s+"observer"/);
  assert.match(OBS, /fixture_role.*=.*FIXTURE_ROLE_OBSERVER|fixture_role.*"observer"/);
  assert.match(OBS, /NimBLEDevice::init\(DEVICE_OBSERVER_NAME\)|BLEToolkit-Observer/);
});

test('3. scan event', () => {
  assert.match(OBS, /observerEmitScanEvent\("started"\)|"event".*"started"/);
  assert.match(OBS, /type.*=.*"scan"|"type":"scan"/);
});

test('4. advertisement event', () => {
  assert.match(OBS, /"type".*"advertisement"|type.*=.*"advertisement"/);
  assert.match(OBS, /observerEmitAdvertisement/);
});

test('5. name 0x09', () => {
  const name = Buffer.from('BLEToolkit-Server', 'utf8');
  const ad = concatAds(buildAdStructure(0x09, name));
  const parsed = parseAdvertisementPayload(ad);
  assert.equal(parsed.hasCompleteName, true);
  assert.equal(parsed.name, 'BLEToolkit-Server');
});

test('6. short name 0x08', () => {
  const name = Buffer.from('BLETool', 'utf8');
  const ad = concatAds(buildAdStructure(0x08, name));
  const parsed = parseAdvertisementPayload(ad);
  assert.equal(parsed.hasShortName, true);
  assert.equal(parsed.name, 'BLETool');
});

test('7. UUID parse', () => {
  const uuidBytes = encodeUuid128Le(FIXTURE_UUIDS.MAIN_UUID);
  const ad = concatAds(buildAdStructure(0x07, uuidBytes));
  const parsed = parseAdvertisementPayload(ad);
  assert.equal(parsed.services.length, 1);
  assert.equal(parsed.services[0].toLowerCase(), FIXTURE_UUIDS.MAIN_UUID.toLowerCase());
});

test('8. manufacturer parse', () => {
  const mfg = Uint8Array.from([0xe0, 0x00, ...Buffer.from('LightBLE', 'utf8')]);
  const ad = concatAds(buildAdStructure(0xff, mfg));
  const parsed = parseAdvertisementPayload(ad);
  assert.ok(parsed.manufacturerHex.startsWith('e000'));
  assert.match(parsed.manufacturerHex, /4c69676874424c45/); // LightBLE ascii hex
});

test('9. schema valid', () => {
  const ad = concatAds(
    buildAdStructure(0x09, Buffer.from('Phone', 'utf8')),
    buildAdStructure(0xff, Uint8Array.from([0x4c, 0x00, 0x01])),
  );
  const parsed = parseAdvertisementPayload(ad);
  const event = buildAdvertisementEvent('aa:bb:cc:dd:ee:ff', -42, parsed);
  assert.equal(event.type, 'advertisement');
  assert.equal(event.t, 'obs');
  assert.ok(Array.isArray(event.services));
  assert.ok(Array.isArray(event.uuids));
});

test('10. required fields', () => {
  const parsed = parseAdvertisementPayload(concatAds(buildAdStructure(0x09, Buffer.from('X', 'utf8'))));
  const event = buildAdvertisementEvent('11:22:33:44:55:66', -55, parsed);
  for (const key of ['type', 'address', 'name', 'rssi', 'services', 'manufacturer', 'timestamp', 'fixture_match']) {
    assert.ok(key in event, `missing ${key}`);
  }
});

test('11. BLEToolkit-Server match', () => {
  const ad = concatAds(buildAdStructure(0x09, Buffer.from(FIXTURE_UUIDS.PERIPHERAL_NAME, 'utf8')));
  const parsed = parseAdvertisementPayload(ad);
  assert.equal(computeFixtureMatch(parsed), true);
  assert.equal(buildAdvertisementEvent('a', -40, parsed).fixture_match, true);
});

test('12. OTA service match', () => {
  const uuidBytes = encodeUuid128Le(FIXTURE_UUIDS.OTA_UUID);
  const ad = concatAds(buildAdStructure(0x07, uuidBytes));
  const parsed = parseAdvertisementPayload(ad);
  assert.equal(matchesOtaService(parsed.services), true);
  assert.equal(buildAdvertisementEvent('a', -40, parsed).ota_service_match, true);
});

test('13. observer does not expose peripheral service', () => {
  assert.doesNotMatch(OBS, /createService\(SERVICE_UUID\)/);
  assert.doesNotMatch(OBS, /createCharacteristic\(/);
  assert.match(PIO, /fixture_observer[\s\S]*observer_main\.cpp/);
  assert.match(PIO, /-<ble_peripheral\.cpp>/);
  // peripheral still present in other env
  assert.match(PERIPH, /blePeripheralBegin|NimBLEDevice::init\("BLEToolkit-Server"\)/);
});

test('14. firmware metadata', () => {
  assert.ok(existsSync(resolve(ROOT, 'hardware/esp32/scripts/build-info.py')));
  assert.match(HEADER, /FW_VERSION/);
  assert.match(HEADER, /FW_GIT_SHA/);
  assert.match(OBS, /FW_VERSION|firmware_version/);
});
