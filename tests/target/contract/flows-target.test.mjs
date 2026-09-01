// tests/target/contract/flows-target.test.mjs
// TEST-C-009 —— 流程契约测试（真实 PASS + 坏页面引用/取消语义缺失被抓）。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-flows.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';
import { snapshot, mutateJson, makeVirtualCtx } from '../lib/fixture-helper.mjs';

test('TEST-C-009 真实仓库：流程契约自检通过', () => {
  const r = run(makeCtx());
  assert.ok(r.pass, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
});

test('TEST-C-009 故意错误②a：FLOW 引用不存在的页面必须被抓', () => {
  const files = mutateJson(snapshot('flows'), 'contracts/target/flows-target.json', (d) => {
    d.flows.find((f) => f.id === 'FLOW-002').pages.push('PAGE-099');
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /坏引用/.test(f.message)));
});

test('TEST-C-009 故意错误：清空 cancel_and_cleanup 必须被抓', () => {
  const files = mutateJson(snapshot('flows'), 'contracts/target/flows-target.json', (d) => {
    d.flows.find((f) => f.id === 'FLOW-009').cancel_and_cleanup = [];
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /取消与清理/.test(f.message)));
});

test('TEST-C-009 故意错误：删除 FLOW-007 造成编号断裂必须被抓', () => {
  const files = mutateJson(snapshot('flows'), 'contracts/target/flows-target.json', (d) => {
    d.flows = d.flows.filter((f) => f.id !== 'FLOW-007');
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /FLOW-001..014/.test(f.message)));
});
