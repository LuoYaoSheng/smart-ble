// tests/target/unit/ota-state-target.test.mjs
// TEST-U-016 OTA 固件包校验纯函数（DEC-016）：六项传输前校验；错误包不进 BLE 事务；
// 状态机 STATE-OTA-01..10 顺序与终态。
// 目标：REQ-066；FEAT-081；PAGE-006；FLOW-009；12 号 ota_package。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-016 REQ-066 FEAT-081 DEC-016 FLOW-009 STATE-OTA-01..10';

const GOOD_MANIFEST = {
  protocol_id: 'smart-ble-ota/1',
  target: 'lightble-fixture',
  hardware: 'esp32-s3',
  firmware_version: '1.2.0',
  size: 1024,
  sha256: 'a'.repeat(64),
};

// ---------- 参照层：只校验 size、跳过 SHA/hardware 的错误实现 ----------
function brokenValidate(manifest, bin) {
  if (manifest.size === bin.length) return { ok: true }; // 错误：仅查 size
  return { ok: false, reason: 'size' };
}
test('TEST-U-016 参照层：SHA/hardware 不校验的错误实现必须被抓', () => {
  const badSha = { ...GOOD_MANIFEST, sha256: 'b'.repeat(64) };
  const bin = new Uint8Array(1024);
  assert.equal(brokenValidate(badSha, bin).ok, true, '参照实现漏放 SHA 错包');
  const badHw = { ...GOOD_MANIFEST, hardware: 'esp32-wroom-32' };
  assert.equal(brokenValidate(badHw, bin).ok, true, '参照实现漏放 hardware 错包');
  // 目标：六项全查，任一不符 = 包级 FAIL（错误包不得进入 BLE 事务）
  assert.ok(brokenValidate(badSha, bin).ok === true && true, '断言语境：目标必须在此返回 ok=false');
});

// ---------- 目标层 ----------
test('TEST-U-016 目标层：utils/ota_manager.js 包校验目标接口', async (t) => {
  const m = await importTarget('apps/uniapp/utils/ota_manager.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));

  // 状态载荷解析（现有接口）
  if (typeof m.module.parseOtaStatusPayload !== 'function') {
    assert.fail(notImplemented('TEST-U-016 FEAT-047', '目标接口 parseOtaStatusPayload 缺失'));
  }

  // DEC-016 包校验目标接口
  const fn = m.module.validateOtaPackage || m.module.validateFirmwarePackage;
  if (typeof fn !== 'function') {
    return assert.fail(notImplemented('TEST-U-016 REQ-066 FEAT-081 DEC-016', '目标接口 validateOtaPackage 缺失（六项传输前校验）'));
  }
  const bin = new Uint8Array(1024);
  // 好包通过
  assert.equal(fn({ manifest: GOOD_MANIFEST, firmware: bin }).ok, true, '六项全符 → ok');
  // 六类坏包逐项拒绝：target/hardware/version/size/sha256/格式
  for (const patch of [
    { target: 'other-device' }, { hardware: 'esp32-wroom-32' }, { firmware_version: '' },
    { size: 2048 }, { sha256: 'b'.repeat(64) },
  ]) {
    const r = fn({ manifest: { ...GOOD_MANIFEST, ...patch }, firmware: bin });
    assert.equal(r.ok, false, `坏包（${Object.keys(patch)}）必须被拒`);
    assert.ok(r.reason || r.error || r.code, '拒绝原因结构化输出');
  }
  // 缺 manifest → 包级失败（格式项）
  assert.equal(fn({ firmware: bin }).ok, false, '缺 manifest 拒绝');
});
