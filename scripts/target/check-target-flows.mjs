#!/usr/bin/env node
// scripts/target/check-target-flows.mjs
// TEST-C-009 —— 流程契约与流程↔测试映射：FLOW-001..014 完整、字段齐、引用闭合、06 号文档登记。

import { Checker, cliCtx, ID_PATTERNS } from './lib/check-utils.mjs';

export function run(ctx) {
  const c = new Checker('check-target-flows');
  const j = ctx.readJson('contracts/target/flows-target.json');
  c.assert('TEST-C-009', 'flows-target.json', j.ok, `flows-target.json 可解析${j.ok ? '' : '：' + j.error}`);
  if (!j.ok) return c.report();
  const flows = j.data.flows;

  const expected = Array.from({ length: 14 }, (_, i) => `FLOW-${String(i + 1).padStart(3, '0')}`);
  const ids = flows.map((f) => f.id);
  c.assert('TEST-C-009', 'FLOW 全体', JSON.stringify(ids) === JSON.stringify(expected), `FLOW-001..014 连续完整（实际 ${ids.join(',')}）`);

  const pj = ctx.readJson('contracts/target/pages-target.json');
  const pageIds = pj.ok ? pj.data.pages.map((p) => p.id) : [];

  const EXTERNAL_VIEW_FLOWS = ['FLOW-012', 'FLOW-013', 'FLOW-014']; // 浏览/发布流程可无前置条件
  for (const f of flows) {
    c.assert('TEST-C-009', f.id,
      (f.actors || []).length > 0 && (EXTERNAL_VIEW_FLOWS.includes(f.id) || (f.preconditions || []).length > 0) && (f.happy_path || []).length >= 3,
      `${f.id} actors/preconditions/happy_path 齐备`);
    c.assert('TEST-C-009', f.id, (f.error_paths || []).length > 0 || ['FLOW-013', 'FLOW-014'].includes(f.id),
      `${f.id} 有错误路径（Web 发布流程可豁免）`);
    c.assert('TEST-C-009', f.id, Array.isArray(f.cancel_and_cleanup) && f.cancel_and_cleanup.length > 0,
      `${f.id} 有取消与清理语义`);
    c.assert('TEST-C-009', f.id, Number.isInteger(f.mermaid_diagrams) && f.mermaid_diagrams >= 0, `${f.id} mermaid 登记为图数量`);
    c.assert('TEST-C-009', f.id, (f.planned_tests || []).length > 0, `${f.id} 有计划测试`);
    const badPages = (f.pages || []).filter((p) => !pageIds.includes(p));
    c.assert('TEST-C-009', f.id, badPages.length === 0, `${f.id} 引用页面均存在（坏引用 ${badPages.join(',')}）`);
  }

  // 主流程必须带时序图
  const diagramFlows = flows.filter((f) => f.mermaid_diagrams >= 1).map((f) => f.id);
  c.assert('TEST-C-009', 'FLOW 全体', diagramFlows.length >= 7, `≥7 条流程带 mermaid 时序图（实际 ${diagramFlows.length}）`);

  // 06 号文档登记一致性
  if (ctx.exists('docs/target-product/06_TARGET_USER_FLOWS.md')) {
    const t06 = ctx.read('docs/target-product/06_TARGET_USER_FLOWS.md');
    for (const f of flows) {
      c.assert('TEST-C-009', f.id, t06.includes(f.id), `06 号用户流程文档登记 ${f.id}`);
    }
    const mermaidBlocks = (t06.match(/```mermaid/g) || []).length;
    c.assert('TEST-C-009', 'FLOW 全体', mermaidBlocks >= 10, `06 号 mermaid 图 ≥10（实际 ${mermaidBlocks}）`);
  }

  // 计划测试 ID 形态
  for (const f of flows) {
    const bad = (f.planned_tests || []).filter((t) => !ID_PATTERNS.TEST.test(t));
    c.assert('TEST-C-009', f.id, bad.length === 0, `${f.id} planned_tests 形如 TEST-X-nnn（坏 ${bad.join(',')}）`);
  }

  return c.report();
}

if (process.argv[1] && process.argv[1].endsWith('check-target-flows.mjs')) {
  const ctx = await cliCtx(import.meta.url);
  const r = run(ctx);
  for (const x of r.results) console.log(`${x.pass ? 'ok  ' : 'FAIL'} : [${x.testId}] ${x.message}`);
  console.log(`\n${r.checker}: ${r.pass ? 'PASS' : 'FAIL'}（${r.total - r.failureCount}/${r.total}）`);
  process.exit(r.pass ? 0 : 1);
}
