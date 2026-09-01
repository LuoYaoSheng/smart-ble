// tests/target/contract/target-contract.test.mjs
// TEST-C-001/002/003/008/010/011/014 —— 产品目标契约检查器测试。
// 双层结构：
//   A. 真实仓库 → checker 输出（当前含 1 项已知契约缺陷 FEAT-035，见断言注释）；
//   B. 故意错误 Fixture（内存副本）→ checker 必须 FAIL（类别 1：重复 ID 等）。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-contract.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';
import { snapshot, mutateJson, makeVirtualCtx } from '../lib/fixture-helper.mjs';

test('TEST-C-001 真实仓库：契约自检通过（仅允许已知缺陷 FEAT-035 优先级漂移）', () => {
  const r = run(makeCtx());
  const known = r.failures.filter((f) => f.message.includes('FEAT-035'));
  const others = r.failures.filter((f) => !f.message.includes('FEAT-035'));
  assert.strictEqual(others.length, 0, `未知契约失败：\n${others.map((x) => x.message).join('\n')}`);
  assert.strictEqual(known.length, 1, '已知缺陷恰为 FEAT-035 优先级 md↔json 漂移（TP-G1 不改 product-target.json，留 TP-G2）');
});

test('TEST-C-001 故意错误①：重复 REQ ID 必须被抓', () => {
  const files = mutateJson(snapshot('contract'), 'contracts/target/product-target.json', (d) => {
    d.requirements.push(JSON.parse(JSON.stringify(d.requirements[0]))); // 复制 REQ-001 → 重复 ID
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass, 'checker 必须失败');
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-001' && /REQ 重复/.test(f.message)), '失败点=REQ 重复');
});

test('TEST-C-003 故意错误：审批状态回退必须被抓', () => {
  const files = mutateJson(snapshot('contract'), 'contracts/target/product-target.json', (d) => {
    d.status = 'REVIEW';
    d.approved_by = null;
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-003' && /APPROVED\/user/.test(f.message)));
});

test('TEST-C-008 故意错误：FEAT 清空 planned_tests 必须被抓', () => {
  const files = mutateJson(snapshot('contract'), 'contracts/target/product-target.json', (d) => {
    d.features.find((f) => f.id === 'FEAT-081').planned_tests = [];
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-008' && f.message.includes('FEAT-081')));
});

test('TEST-C-002 故意错误：FEAT-081 从 Markdown 注销必须被抓（登记处一致性）', () => {
  const files = snapshot('contract');
  // 从 03 号目录移除 FEAT-081 标题（JSON 仍有 → 单向漂移）
  files['docs/target-product/03_TARGET_FEATURE_CATALOG.md'] =
    files['docs/target-product/03_TARGET_FEATURE_CATALOG.md'].replace(/####\s*FEAT-081[^\n]*\n/, '');
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-001' && f.message.includes('FEAT-081')));
});

test('TEST-C-014 故意错误：DEC-013 扫描时长从 10 秒改 30 秒必须被抓', () => {
  const files = snapshot('contract');
  files['docs/target-product/06_TARGET_USER_FLOWS.md'] =
    files['docs/target-product/06_TARGET_USER_FLOWS.md'].replace(/10\s*秒/g, '30 秒');
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-014' && /FLOW-002 扫描时长/.test(f.message)));
});
