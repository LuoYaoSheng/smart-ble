// tests/target/contract/pages-target.test.mjs
// TEST-C-005 —— 真实仓库页面/路由契约测试。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-pages.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';

test('TEST-C-005 真实仓库：页面契约自检通过', () => {
  const r = run(makeCtx());
  assert.strictEqual(r.pass, true, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
  assert.strictEqual(r.failureCount, 0);
});
