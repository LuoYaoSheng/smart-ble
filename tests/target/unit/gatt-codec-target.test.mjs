// tests/target/unit/gatt-codec-target.test.mjs
// TEST-U-009 属性约束（读/写/订阅操作必须与 Characteristic properties 匹配）
// TEST-U-010 HEX 编码校验（非法输入拒绝，不静默修正）
// 目标：REQ-024/026；FEAT-026/028；PAGE-006；FLOW-005。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-009/010 REQ-024/026 FEAT-026/028 PAGE-006 FLOW-005';

// ---------- 目标层 ----------
test('TEST-U-009/010 目标层：utils/ble-utils.js + 属性约束目标接口', async (t) => {
  const m = await importTarget('apps/uniapp/utils/ble-utils.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));

  // HEX 校验目标接口（REQ-026：TEXT/HEX 写）
  const hexFn = m.module.validateHexInput || m.module.parseHexInput || m.module.isValidHex;
  if (typeof hexFn !== 'function') {
    assert.fail(notImplemented('TEST-U-010 REQ-026 FEAT-028', '目标接口 validateHexInput/parseHexInput 缺失'));
  } else {
    assert.ok(hexFn('AABBCC') === true || hexFn('AABBCC') !== false, '合法 HEX 通过');
    const bad = hexFn('AA ZZ');
    assert.ok(bad === false || bad === null || (bad && bad.ok === false), '非法 HEX 必须整体拒绝（不静默修正）');
  }

  // 属性约束目标接口（REQ-024）
  const propFn = m.module.validateCharacteristicProperties || m.module.canOperate;
  if (typeof propFn !== 'function') {
    assert.fail(notImplemented('TEST-U-009 REQ-024 FEAT-026', '目标接口 validateCharacteristicProperties 缺失'));
  } else {
    assert.equal(propFn(['read', 'write'], 'write'), true);
    assert.equal(propFn(['read'], 'write'), false);
    assert.equal(propFn(['notify'], 'subscribe'), true);
    assert.equal(propFn(['read'], 'subscribe'), false);
  }
});
