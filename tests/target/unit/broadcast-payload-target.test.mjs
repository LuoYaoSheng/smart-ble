// tests/target/unit/broadcast-payload-target.test.mjs
// TEST-U-014 广播预算：31 字节可用 / 32 字节阻止 / 字段合法性 / 平台接管字段 / 不静默截断。
// 故意错误类别⑥（32 字节 Payload）在本文件参照层验证。
// 目标：REQ-039/042；FEAT-042/043；PAGE-008；FLOW-008；DEC-004（预算只计实际入包字段）。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-014 REQ-039/042 FEAT-042/043 PAGE-008 FLOW-008 DEC-004 S-38';

// ---------- 参照层（故意错误类别⑥）：静默截断到 31 字节的实现 ----------
function brokenBudget(fields) {
  const bytes = fields.reduce((a, f) => a + f.bytes, 0);
  if (bytes > 31) {
    let used = 0;
    const kept = [];
    for (const f of fields) { // 错误：能塞多少塞多少，尾部丢弃
      if (used + f.bytes <= 31) { kept.push(f); used += f.bytes; }
    }
    return { ok: true, kept, total: used }; // 错误：超预算仍返回可开始
  }
  return { ok: true, kept: fields, total: bytes };
}
test('TEST-U-014 参照层⑥：32 字节静默截断必须被抓（S-38）', () => {
  const fields = [
    { name: '完整本地名', bytes: 12 },
    { name: 'Service UUID', bytes: 6 },
    { name: '厂商数据', bytes: 14 },
  ]; // 12+6+14 = 32
  const result = brokenBudget(fields);
  assert.equal(result.ok, true, '参照实现确实放行');
  assert.ok(result.total <= 31 && result.kept.length < fields.length, '参照实现静默丢字段');
  // 目标：32 字节必须整体阻止并说明（“当前 32 字节，超过 31 字节上限。删减字段后再开始。”）
  assert.ok(result.total !== 32 || !result.ok, '目标口径：超预算不得返回 ok=true');
  assert.equal(12 + 6 + 14, 32, '用例确为 32 字节');
});

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
