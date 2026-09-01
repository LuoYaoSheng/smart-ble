#!/usr/bin/env node
// scripts/target/check-target-pages.mjs
// TEST-C-005 —— 页面/路由/参数契约：PAGE-001~010 + WEB-001 完整、四 Tab、路由与参数合法性。

import { Checker, cliCtx } from './lib/check-utils.mjs';

const TAB_PAGES = ['PAGE-001', 'PAGE-007', 'PAGE-008', 'PAGE-009'];
const EXPECTED_PAGES = Array.from({ length: 10 }, (_, i) => `PAGE-${String(i + 1).padStart(3, '0')}`).concat(['WEB-001']);

export function run(ctx) {
  const c = new Checker('check-target-pages');
  const j = ctx.readJson('contracts/target/pages-target.json');
  c.assert('TEST-C-005', 'pages-target.json', j.ok, `pages-target.json 可解析${j.ok ? '' : '：' + j.error}`);
  if (!j.ok) return c.report();
  const pages = j.data.pages;

  // 完整性：PAGE-001..010 + WEB-001，编号连续
  const ids = pages.map((p) => p.id);
  c.assert('TEST-C-005', 'PAGE 全体', JSON.stringify(ids.slice().sort()) === JSON.stringify(EXPECTED_PAGES.slice().sort()),
    `页面集合 = PAGE-001..010 + WEB-001（实际 ${ids.join(',')}）`);

  // 四 Tab：恰好 4 个 type=tab 且为约定四页
  const tabs = pages.filter((p) => p.type === 'tab').map((p) => p.id).sort();
  c.assert('TEST-C-005', 'PAGE-001/007/008/009', JSON.stringify(tabs) === JSON.stringify([...TAB_PAGES].sort()),
    `四 Tab 恰为 ${TAB_PAGES.join('/')}（实际 ${tabs.join('/')}）`);

  // 路由：非空、唯一、App 页 pages/ 前缀、WEB 根路由
  const routes = pages.map((p) => p.route);
  c.assert('TEST-C-005', 'ROUTE 全体', new Set(routes).size === routes.length && routes.every(Boolean), '路由非空且唯一');
  c.assert('TEST-C-005', 'ROUTE 全体',
    pages.filter((p) => p.id.startsWith('PAGE-')).every((p) => p.route.startsWith('pages/')),
    'App 页面路由必须以 pages/ 开头');
  const web = pages.find((p) => p.id === 'WEB-001');
  c.assert('TEST-C-005', 'WEB-001', web && web.route === '/', 'WEB-001 路由为 /');

  // 参数契约：required ∩ forbidden = ∅；页面文档存在且登记一致
  for (const p of pages) {
    const req = p.required_params || [];
    const forbid = p.forbidden_params || [];
    const clash = req.filter((x) => forbid.includes(x));
    c.assert('TEST-C-005', p.id, clash.length === 0, `${p.id} required/forbidden 参数不冲突（冲突 ${clash.join(',')}）`);
    c.assert('TEST-C-005', p.id, (p.states || []).length > 0 && (p.planned_tests || []).length > 0,
      `${p.id} 有状态与计划测试登记`);
    if (p.id.startsWith('PAGE-')) {
      const doc = `docs/target-product/pages/${p.id}_`;
      const hit = ['SCAN', 'HID_PROVISION', 'HID_DETAIL', 'HID_HISTORY', 'HID_DIAGNOSTICS', 'DEVICE_DETAIL', 'CONNECTED', 'BROADCAST', 'ABOUT', 'VERSION']
        .some((s) => ctx.exists(doc + s + '.md'));
      c.assert('TEST-C-005', p.id, hit, `${p.id} 存在目标页面文档`);
    }
  }

  // 废弃操作不得同时出现在册操作中（编号不复用）
  for (const p of pages) {
    const ops = (p.operations || []).map((o) => (typeof o === 'string' ? o : o.id));
    const dep = (p.deprecated_operations || []).map((o) => (typeof o === 'string' ? o : o.id));
    const clash = dep.filter((d) => ops.includes(d));
    c.assert('TEST-C-005', p.id, clash.length === 0, `${p.id} 废弃操作不在册（冲突 ${clash.join(',')}）`);
  }

  // 关键页面规模下限（目标契约要点）
  const byId = Object.fromEntries(pages.map((p) => [p.id, p]));
  c.assert('TEST-C-005', 'PAGE-001', (byId['PAGE-001'].states || []).length >= 10, 'PAGE-001 ≥10 状态（含 5 个独立错误/空态）');
  c.assert('TEST-C-005', 'PAGE-002', (byId['PAGE-002'].states || []).length >= 12, 'PAGE-002 ≥12 状态（四步进度+八类错误）');
  c.assert('TEST-C-005', 'PAGE-006', (byId['PAGE-006'].operations || []).length >= 14, 'PAGE-006 ≥14 在册操作（GATT 工作台）');
  c.assert('TEST-C-005', 'PAGE-008', (byId['PAGE-008'].states || []).length >= 12, 'PAGE-008 ≥12 状态');

  // 路由必须出现在 04 号信息架构文档中
  if (ctx.exists('docs/target-product/04_INFORMATION_ARCHITECTURE_AND_NAVIGATION.md')) {
    const t04 = ctx.read('docs/target-product/04_INFORMATION_ARCHITECTURE_AND_NAVIGATION.md');
    for (const p of pages.filter((x) => x.id.startsWith('PAGE-'))) {
      c.assert('TEST-C-005', p.id, t04.includes(p.route), `04 号信息架构登记路由 ${p.route}`);
    }
  }

  return c.report();
}

if (process.argv[1] && process.argv[1].endsWith('check-target-pages.mjs')) {
  const ctx = await cliCtx(import.meta.url);
  const r = run(ctx);
  for (const x of r.results) console.log(`${x.pass ? 'ok  ' : 'FAIL'} : [${x.testId}] ${x.message}`);
  console.log(`\n${r.checker}: ${r.pass ? 'PASS' : 'FAIL'}（${r.total - r.failureCount}/${r.total}）`);
  process.exit(r.pass ? 0 : 1);
}
