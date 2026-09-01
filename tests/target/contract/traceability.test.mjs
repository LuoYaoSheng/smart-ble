// tests/target/contract/traceability.test.mjs
// TEST-C-008/009 —— 真实仓库追踪闭合测试。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-traceability.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';

test('TEST-C-009 真实仓库：追踪闭合自检通过', () => {
  const r = run(makeCtx());
  assert.strictEqual(r.pass, true, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
  assert.strictEqual(r.failureCount, 0);
});
