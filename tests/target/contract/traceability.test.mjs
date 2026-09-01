// tests/target/contract/traceability.test.mjs
// TEST-C-008/009 —— 追踪闭合测试（真实 PASS + 故意错误类别 2：坏引用；类别 3：缺 Must Test）。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-traceability.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';
import { snapshot, mutateJson, makeVirtualCtx } from '../lib/fixture-helper.mjs';

test('TEST-C-009 真实仓库：追踪闭合自检通过', () => {
  const r = run(makeCtx());
  assert.ok(r.pass, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
});

test('TEST-C-009 故意错误②：测试引用不存在的 REQ-999 必须被抓', () => {
  const files = mutateJson(snapshot('traceability'), 'contracts/target/test-traceability.json', (d) => {
    d.tests.find((t) => t.id === 'TEST-U-001').requirements.push('REQ-999');
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /悬空/.test(f.message) && /REQ-999/.test(f.message)));
});

test('TEST-C-008 故意错误③：Must FEAT-081 失去全部测试必须被抓', () => {
  const files = mutateJson(snapshot('traceability'), 'contracts/target/test-traceability.json', (d) => {
    for (const t of d.tests) t.features = (t.features || []).filter((f) => f !== 'FEAT-081');
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /Must FEAT 100%/.test(f.message) && /FEAT-081/.test(f.message)));
});

test('TEST-C-009 故意错误：套件计数与实算不一致必须被抓', () => {
  const files = mutateJson(snapshot('traceability'), 'contracts/target/test-traceability.json', (d) => {
    d.tests = d.tests.slice(0, 100); // 删一条但不动 suites → 计数漂移
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /套件|计数之和/.test(f.message)));
});

test('TEST-C-009 故意错误：CLAIM-031 孤儿（无测试覆盖）必须被抓', () => {
  const files = mutateJson(snapshot('traceability'), 'contracts/target/test-traceability.json', (d) => {
    d.tests.find((t) => t.id === 'TEST-R-011').claims = [];
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /CLAIM 无孤立/.test(f.message) && /CLAIM-031/.test(f.message)));
});
