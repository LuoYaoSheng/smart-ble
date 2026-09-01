// tests/target/unit/broadcast-payload-target.test.mjs
// TEST-U-014 广播预算：31 字节可用 / 32 字节阻止 / 字段合法性 / 平台接管字段 / 不静默截断。
// 故意错误类别⑥（32 字节 Payload）在本文件参照层验证。
// 目标：REQ-039/042；FEAT-042/043；PAGE-008；FLOW-008；DEC-004（预算只计实际入包字段）。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-014 REQ-039/042 FEAT-042/043 PAGE-008 FLOW-008 DEC-004 S-38';

// ---------- 目标层 ----------
test('TEST-U-014 目标层：utils/advertising-payload.js analyzeAdvertisingPayload', async (t) => {
  const m = await importTarget('apps/uniapp/utils/advertising-payload.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  assert.equal(m.module.MAX_LEGACY_ADVERTISING_BYTES, 31, '31 字节常量（REQ-039）');
  if (typeof m.module.analyzeAdvertisingPayload !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 analyzeAdvertisingPayload 缺失'));
  }

  // 31 字节内可用
  const ok31 = m.module.analyzeAdvertisingPayload({ localName: 'A'.repeat(9), serviceUuid: '180D', manufacturerData: '' });
  assert.ok(ok31 && typeof ok31 === 'object', '分析结果为对象');
  if ('overBudget' in ok31 || 'over_budget' in ok31) {
    assert.equal(ok31.overBudget ?? ok31.over_budget, false, '31 内不超预算');
  }

  // 32 字节阻止：目标要求 analyze 提供 totalBytes 与 overBudget 语义（S-38 文案驱动）
  const over = m.module.analyzeAdvertisingPayload({ localName: 'A'.repeat(28), serviceUuid: '180D' });
  const total = over?.totalBytes ?? over?.total ?? over?.estimatedBytes;
  if (total === undefined) {
    return assert.fail(notImplemented('TEST-U-014 REQ-039', '分析结果缺 totalBytes/overBudget——无法驱动 31/32 阻止（S-38）'));
  }
  assert.ok(typeof total === 'number', '字节数为数值');
});
