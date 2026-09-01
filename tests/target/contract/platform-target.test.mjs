// tests/target/contract/platform-target.test.mjs
// TEST-C-004 —— 真实仓库平台契约测试。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-platforms.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';

test('TEST-C-004 真实仓库：平台契约自检通过', () => {
  const r = run(makeCtx());
  assert.strictEqual(r.pass, true, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
  assert.strictEqual(r.failureCount, 0);
});
