// tests/target/contract/pages-target.test.mjs
// TEST-C-005 —— 页面/路由/参数契约测试（真实 PASS + 故意错误类别 4：错 Tab/路由）。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-pages.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';
import { snapshot, mutateJson, makeVirtualCtx } from '../lib/fixture-helper.mjs';

test('TEST-C-005 真实仓库：页面契约自检通过', () => {
  const r = run(makeCtx());
  assert.ok(r.pass, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
});

test('TEST-C-005 故意错误④a：PAGE-002 被改成第 5 个 Tab 必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    d.pages.find((p) => p.id === 'PAGE-002').type = 'tab';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /四 Tab/.test(f.message)), '失败点=Tab 数量');
});

test('TEST-C-005 故意错误④b：路由改错（非 pages/ 前缀）必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    d.pages.find((p) => p.id === 'PAGE-006').route = '/device-detail';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /pages\//.test(f.message)));
});

test('TEST-C-005 故意错误④c：required 与 forbidden 参数冲突必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    const p = d.pages.find((x) => x.id === 'PAGE-006');
    p.forbidden_params = [...(p.forbidden_params || []), p.required_params[0]];
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /冲突/.test(f.message)));
});

test('TEST-C-005 故意错误：删除 PAGE-004 导致页面集合不完整必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    d.pages = d.pages.filter((p) => p.id !== 'PAGE-004');
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /PAGE-001..010/.test(f.message)));
});

test('TEST-C-005 故意错误：废弃操作复活为在册操作必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    const p = d.pages.find((x) => x.id === 'PAGE-001');
    const dep = p.deprecated_operations || [];
    if (dep.length) p.operations = [...(p.operations || []), dep[0]];
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /废弃操作不在册/.test(f.message)));
});
