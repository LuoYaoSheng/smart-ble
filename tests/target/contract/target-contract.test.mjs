// tests/target/contract/target-contract.test.mjs
// TEST-C-001/002/003/008/010/011/014 —— 真实仓库契约检查（零容忍，无 known failure 白名单）。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-contract.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';

test('TEST-C-001 真实仓库：契约自检通过', () => {
  const r = run(makeCtx());
  assert.strictEqual(r.pass, true, `契约失败：\n${r.failures.map((x) => x.message).join('\n')}`);
  assert.strictEqual(r.failureCount, 0, `failureCount 应为 0，实际 ${r.failureCount}`);
});
