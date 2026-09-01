// tests/target/contract/protocol-target.test.mjs
// TEST-C-012/013 —— 真实仓库协议契约测试。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-protocols.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';

test('TEST-C-012 真实仓库：协议契约自检通过', () => {
  const r = run(makeCtx());
  assert.strictEqual(r.pass, true, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
  assert.strictEqual(r.failureCount, 0);
});
