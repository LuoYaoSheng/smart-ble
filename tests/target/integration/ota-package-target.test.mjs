// tests/target/integration/ota-package-target.test.mjs
// OTA-PACKAGE-001：package → validator → metadata（无 BLE transport）。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const IDS = 'OTA-PACKAGE-001 integration';

const EXAMPLE_DIR = resolve(ROOT, 'release/ota/lightble-peripheral-example');

test('release example package validates end-to-end', async () => {
  const validator = (await importTarget('apps/uniapp/services/ota/package-validator.js')).module;
  const model = (await importTarget('apps/uniapp/services/ota/firmware-package.js')).module;
  if (!validator || !model) assert.fail(notImplemented(IDS, 'ota services missing'));

  const manifest = JSON.parse(readFileSync(resolve(EXAMPLE_DIR, 'manifest.json'), 'utf8'));
  const binary = new Uint8Array(readFileSync(resolve(EXAMPLE_DIR, 'firmware.bin')));

  const parsed = model.parseFirmwarePackage({ manifest, binary });
  assert.ok(parsed.manifest);
  assert.equal(parsed.binary.byteLength, 6);

  const metadata = model.getFirmwareMetadata(parsed);
  assert.equal(metadata.target, 'lightble-peripheral');
  assert.equal(metadata.firmware_version, '1.0.0');

  const compatibility = model.isCompatibleFirmwarePackage(parsed, {
    target: 'lightble-peripheral',
    hardware: 'esp32-wroom-32',
  });
  assert.equal(compatibility.compatible, true);

  const validation = await validator.validateFirmwarePackage(parsed, {
    device: { target: 'lightble-peripheral', hardware: 'esp32-wroom-32' },
  });
  assert.equal(validation.valid, true, validation.errors?.map((e) => e.message).join('; '));
  assert.equal(validation.sha256, manifest.sha256);
});

test('invalid release tamper is rejected before metadata use', async () => {
  const validator = (await importTarget('apps/uniapp/services/ota/package-validator.js')).module;
  const model = (await importTarget('apps/uniapp/services/ota/firmware-package.js')).module;

  const manifest = JSON.parse(readFileSync(resolve(EXAMPLE_DIR, 'manifest.json'), 'utf8'));
  const binary = new Uint8Array(readFileSync(resolve(EXAMPLE_DIR, 'firmware.bin')));
  binary[0] = 0xff;

  const parsed = model.parseFirmwarePackage({ manifest, binary });
  const validation = await validator.validateFirmwarePackage(parsed);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((e) => e.code === 'OTA_HASH_MISMATCH'));
});
