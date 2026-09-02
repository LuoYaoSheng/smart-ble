// tests/target/unit/ota-state-target.test.mjs
// TEST-U-016 OTA 固件包校验纯函数（DEC-016）：六项传输前校验；错误包不进 BLE 事务。

import test from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-016 REQ-066 FEAT-081 DEC-016 FLOW-009 STATE-OTA-01..10';

const BIN = new Uint8Array(1024);
const SHA = createHash('sha256').update(BIN).digest('hex');

const GOOD_MANIFEST = {
  format_version: 1,
  target: 'lightble-peripheral',
  hardware: 'esp32-s3',
  firmware_version: '1.2.0',
  size: 1024,
  sha256: SHA,
};

test('TEST-U-016 目标层：utils/ota_manager.js 包校验目标接口', async () => {
  const m = await importTarget('apps/uniapp/utils/ota_manager.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));

  if (typeof m.module.parseOtaStatusPayload !== 'function') {
    assert.fail(notImplemented('TEST-U-016 FEAT-047', '目标接口 parseOtaStatusPayload 缺失'));
  }

  const fn = m.module.validateOtaPackage || m.module.validateFirmwarePackage;
  if (typeof fn !== 'function') {
    return assert.fail(notImplemented('TEST-U-016 REQ-066 FEAT-081 DEC-016', '目标接口 validateOtaPackage 缺失（六项传输前校验）'));
  }

  const good = await fn({ manifest: GOOD_MANIFEST, firmware: BIN });
  assert.equal(good?.ok, true, '六项全符 → ok');

  for (const [patch, opts] of [
    [{ target: 'other-device' }, {}],
    [{ hardware: '' }, {}],
    [{ firmware_version: '' }, {}],
    [{ size: 2048 }, {}],
    [{ sha256: 'b'.repeat(64) }, {}],
    [{ hardware: 'esp32-wroom-32' }, { device: { target: 'lightble-peripheral', hardware: 'esp32-s3' } }],
  ]) {
    const r = await fn({ manifest: { ...GOOD_MANIFEST, ...patch }, firmware: BIN }, opts);
    assert.equal(r?.ok, false, `坏包（${Object.keys(patch)}）必须被拒`);
    assert.ok(r.reason || r.error || r.code, '拒绝原因结构化输出');
  }

  const missing = await fn({ firmware: BIN });
  assert.equal(missing?.ok, false, '缺 manifest 拒绝');
});
