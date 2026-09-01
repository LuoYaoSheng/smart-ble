// tests/target/contract/flows-target.test.mjs
// TEST-C-009 —— 真实仓库流程契约测试。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-flows.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';

test('TEST-C-009 真实仓库：流程契约自检通过', () => {
  const r = run(makeCtx());
  assert.strictEqual(r.pass, true, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
  assert.strictEqual(r.failureCount, 0);
});
