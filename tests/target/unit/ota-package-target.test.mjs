// tests/target/unit/ota-package-target.test.mjs
// OTA-PACKAGE-001：Firmware Package Schema + Validator 单元覆盖。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const IDS = 'OTA-PACKAGE-001 ota-package';

const DEVICE = {
  target: 'lightble-peripheral',
  hardware: 'esp32-wroom-32',
};

async function loadValidator() {
  const m = await importTarget('apps/uniapp/services/ota/package-validator.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  return m.module;
}

async function loadModel() {
  const m = await importTarget('apps/uniapp/services/ota/firmware-package.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  return m.module;
}

async function manifestFor(bytes) {
  const { sha256Hex } = await loadValidator();
  const hash = await sha256Hex(bytes);
  return {
    format_version: 1,
    target: 'lightble-peripheral',
    hardware: 'esp32-wroom-32',
    firmware_version: '1.2.0',
    size: bytes.byteLength,
    sha256: hash,
  };
}

test('1 valid manifest', async () => {
  const { validateFirmwareManifest } = await loadValidator();
  const bytes = new Uint8Array([1, 2, 3]);
  const manifest = await manifestFor(bytes);
  const result = validateFirmwareManifest(manifest, { device: DEVICE });
  assert.equal(result.valid, true);
});

test('2 missing field', async () => {
  const { validateFirmwareManifest } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  delete manifest.sha256;
  const result = validateFirmwareManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.details?.field === 'sha256'));
});

test('3 extra field', async () => {
  const { validateFirmwareManifest } = await loadValidator();
  const manifest = { ...(await manifestFor(new Uint8Array([1]))), extra: true };
  const result = validateFirmwareManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.details?.field === 'extra'));
});

test('4 invalid format_version', async () => {
  const { validateFirmwareManifest } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  manifest.format_version = 2;
  const result = validateFirmwareManifest(manifest);
  assert.equal(result.valid, false);
});

test('5 peripheral target', async () => {
  const { validateFirmwareManifest } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  manifest.target = 'lightble-peripheral';
  assert.equal(validateFirmwareManifest(manifest).valid, true);
});

test('6 observer target', async () => {
  const { validateFirmwareManifest } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  manifest.target = 'lightble-observer';
  assert.equal(validateFirmwareManifest(manifest).valid, true);
});

test('7 wrong target', async () => {
  const { validateFirmwareManifest, ERROR_CODES } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  manifest.target = 'unknown-target';
  const result = validateFirmwareManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === ERROR_CODES.OTA_PACKAGE_INVALID));
});

test('8 hardware match', async () => {
  const { validateFirmwareManifest } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  assert.equal(validateFirmwareManifest(manifest, { device: DEVICE }).valid, true);
});

test('9 hardware mismatch', async () => {
  const { validateFirmwareManifest, ERROR_CODES } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  const result = validateFirmwareManifest(manifest, {
    device: { target: 'lightble-peripheral', hardware: 'esp32-s3' },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === ERROR_CODES.OTA_HARDWARE_MISMATCH));
});

test('10 valid semver', async () => {
  const { validateFirmwareManifest } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  manifest.firmware_version = '2.10.3';
  assert.equal(validateFirmwareManifest(manifest).valid, true);
});

test('11 invalid version', async () => {
  const { validateFirmwareManifest, ERROR_CODES } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  manifest.firmware_version = 'v1';
  const result = validateFirmwareManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === ERROR_CODES.OTA_VERSION_INVALID));
});

test('12 correct size', async () => {
  const { validateFirmwareBinary } = await loadValidator();
  const binary = new Uint8Array([9, 8, 7]);
  const manifest = await manifestFor(binary);
  const result = await validateFirmwareBinary(manifest, binary);
  assert.equal(result.valid, true);
});

test('13 wrong size', async () => {
  const { validateFirmwareBinary, ERROR_CODES } = await loadValidator();
  const binary = new Uint8Array([9, 8, 7]);
  const manifest = await manifestFor(binary);
  manifest.size = 99;
  const result = await validateFirmwareBinary(manifest, binary);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === ERROR_CODES.OTA_SIZE_MISMATCH));
});

test('14 correct sha', async () => {
  const { validateFirmwarePackage } = await loadValidator();
  const binary = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  const manifest = await manifestFor(binary);
  const result = await validateFirmwarePackage({ manifest, binary }, { device: DEVICE });
  assert.equal(result.valid, true);
});

test('15 wrong sha', async () => {
  const { validateFirmwarePackage, ERROR_CODES } = await loadValidator();
  const binary = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  const manifest = await manifestFor(binary);
  manifest.sha256 = 'f'.repeat(64);
  const result = await validateFirmwarePackage({ manifest, binary });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === ERROR_CODES.OTA_HASH_MISMATCH));
});

test('16 uppercase sha', async () => {
  const { validateFirmwareManifest } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  manifest.sha256 = manifest.sha256.toUpperCase();
  assert.equal(validateFirmwareManifest(manifest).valid, false);
});

test('17 Uint8Array binary', async () => {
  const { validateFirmwareBinary } = await loadValidator();
  const binary = new Uint8Array([1, 2]);
  const manifest = await manifestFor(binary);
  assert.equal((await validateFirmwareBinary(manifest, binary)).valid, true);
});

test('18 ArrayBuffer binary', async () => {
  const { validateFirmwareBinary } = await loadValidator();
  const binary = new Uint8Array([1, 2, 3]).buffer;
  const manifest = await manifestFor(new Uint8Array(binary));
  assert.equal((await validateFirmwareBinary(manifest, binary)).valid, true);
});

test('19 empty binary', async () => {
  const { validateFirmwareBinary, ERROR_CODES } = await loadValidator();
  const manifest = await manifestFor(new Uint8Array([1]));
  const result = await validateFirmwareBinary(manifest, new Uint8Array(0));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === ERROR_CODES.OTA_PACKAGE_INVALID));
});

test('20 deterministic hash', async () => {
  const { sha256Hex } = await loadValidator();
  const binary = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const a = await sha256Hex(binary);
  const b = await sha256Hex(binary);
  assert.equal(a, b);
  assert.equal(a, '7192385c3c0605de55bb9476ce1d90748190ecb32a8eed7f5207b30cf6a1fe89');
});

test('21 compatible package', async () => {
  const { isCompatibleFirmwarePackage } = await loadModel();
  const binary = new Uint8Array([1]);
  const manifest = await manifestFor(binary);
  const result = isCompatibleFirmwarePackage({ manifest, binary }, DEVICE);
  assert.equal(result.compatible, true);
});

test('22 incompatible package', async () => {
  const { isCompatibleFirmwarePackage } = await loadModel();
  const { ERROR_CODES } = await loadValidator();
  const binary = new Uint8Array([1]);
  const manifest = await manifestFor(binary);
  manifest.target = 'lightble-observer';
  const result = isCompatibleFirmwarePackage({ manifest, binary }, DEVICE);
  assert.equal(result.compatible, false);
  assert.equal(result.code, ERROR_CODES.OTA_TARGET_MISMATCH);
});

test('schema file exists', () => {
  const schemaPath = resolve(ROOT, 'contracts/target/ota-package.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required.sort(), [
    'firmware_version', 'format_version', 'hardware', 'sha256', 'size', 'target',
  ].sort());
});
