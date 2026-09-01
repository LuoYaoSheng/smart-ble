// tests/target/harness/contract-priority-drift.test.mjs
// HARNESS-C-001 —— 优先级漂移故意错误验证（内存 Fixture，不影响真实契约）。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-contract.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';
import { snapshot, mutateJson, makeVirtualCtx } from '../lib/fixture-helper.mjs';

test('HARNESS-C-001 真实仓库：FEAT-035 优先级已对齐 Must', () => {
  const r = run(makeCtx());
  const drift = r.failures.filter((f) => f.message.includes('FEAT-035'));
  assert.strictEqual(drift.length, 0, '真实契约不得存在 FEAT-035 漂移');
  assert.strictEqual(r.pass, true);
});

test('HARNESS-C-001 故意错误：FEAT-035 JSON priority=Should 必须被抓', () => {
  const files = mutateJson(snapshot('contract'), 'contracts/target/product-target.json', (d) => {
    d.features.find((f) => f.id === 'FEAT-035').priority = 'Should';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass, 'checker 必须失败');
  assert.ok(r.failures.some((f) => f.message.includes('FEAT-035')), '失败点含 FEAT-035 漂移');
});
