#!/usr/bin/env node
// scripts/target/check-target-traceability.mjs
// TEST-C-008/009 覆盖口径 —— 追踪闭合：套件计数、ID 形态、Must FEAT 100% 有测试、
// REQ/PAGE/FLOW/CLAIM 无孤儿、测试无悬空引用、coverage 数字与实算一致。

import { Checker, cliCtx, ID_PATTERNS } from './lib/check-utils.mjs';

export function run(ctx) {
  const c = new Checker('check-target-traceability');
  const t = ctx.readJson('contracts/target/test-traceability.json');
  c.assert('TEST-C-009', 'test-traceability.json', t.ok, `test-traceability.json 可解析${t.ok ? '' : '：' + t.error}`);
  const p = ctx.readJson('contracts/target/product-target.json');
  const pg = ctx.readJson('contracts/target/pages-target.json');
  const fl = ctx.readJson('contracts/target/flows-target.json');
  const lg = ctx.readJson('contracts/target/landing-target.json');
  if (!t.ok || !p.ok) return c.report();

  const tests = t.data.tests || [];
  const ids = tests.map((x) => x.id);
  c.assert('TEST-C-009', 'TEST 全体', ids.every((id) => ID_PATTERNS.TEST.test(id)), 'TEST ID 形如 TEST-[CUIPEAWHR]-nnn');
  c.assert('TEST-C-009', 'TEST 全体', new Set(ids).size === ids.length, 'TEST ID 唯一');

  // 套件计数一致
  for (const s of t.data.suites || []) {
    const actual = ids.filter((id) => id.startsWith(s.prefix)).length;
    c.assert('TEST-C-009', s.prefix, actual === s.count, `套件 ${s.prefix} 计数 ${s.count}（实算 ${actual}）`);
  }
  c.assert('TEST-C-009', 'TEST 全体', (t.data.suites || []).reduce((a, s) => a + s.count, 0) === tests.length,
    '九套件计数之和 = 测试总数');

  // 引用闭合：测试引用的目标必须存在
  const known = {
    requirements: p.data.requirements.map((r) => r.id),
    features: p.data.features.map((f) => f.id),
    pages_or_flows: [...(pg.ok ? pg.data.pages.map((x) => x.id) : []), ...(fl.ok ? fl.data.flows.map((x) => x.id) : [])],
    claims: lg.ok ? lg.data.claims.map((x) => x.id) : [],
  };
  const dangling = [];
  for (const tt of tests) {
    for (const [k, all] of Object.entries(known)) {
      for (const ref of tt[k] || []) if (!all.includes(ref)) dangling.push(`${tt.id}→${ref}`);
    }
  }
  c.assert('TEST-C-009', 'TEST 全体', dangling.length === 0, `测试引用无悬空（坏引用 ${dangling.slice(0, 6).join(',')}）`);

  // 非元测试必须有目标映射
  const orphan = tests.filter((x) => x.scope !== 'meta' &&
    !(x.requirements || []).length && !(x.features || []).length && !(x.pages_or_flows || []).length && !(x.claims || []).length);
  c.assert('TEST-C-009', 'TEST 全体', orphan.length === 0,
    `每条测试映射目标（未映射且非 meta：${orphan.map((x) => x.id).slice(0, 8).join(',')}）`);

  // Must FEAT 100% 覆盖
  const coveredFeats = new Set(tests.flatMap((x) => x.features || []));
  const mustFeats = p.data.features.filter((f) => f.priority === 'Must').map((f) => f.id);
  const mustMissing = mustFeats.filter((f) => !coveredFeats.has(f));
  c.assert('TEST-C-008', 'FEAT-Must', mustMissing.length === 0,
    `Must FEAT 100% 有测试（缺 ${mustMissing.slice(0, 8).join(',')}；${mustFeats.length - mustMissing.length}/${mustFeats.length}）`);

  // REQ 覆盖：直接或经 FEAT 链
  const coveredReqs = new Set(tests.flatMap((x) => x.requirements || []));
  const featToTests = new Map(p.data.features.map((f) => [f.id, (f.planned_tests || [])]));
  const reqMissing = p.data.requirements
    .map((r) => r.id)
    .filter((rid) => {
      if (coveredReqs.has(rid)) return false;
      const r = p.data.requirements.find((x) => x.id === rid);
      return !(r.features || []).some((fid) => (featToTests.get(fid) || []).length > 0);
    });
  c.assert('TEST-C-008', 'REQ 全体', reqMissing.length === 0, `每条 REQ 直接或经 FEAT 覆盖（缺 ${reqMissing.slice(0, 8).join(',')}）`);

  // PAGE/WEB/FLOW/CLAIM 无孤儿
  for (const [label, all, key] of [
    ['PAGE/WEB/FLOW', known.pages_or_flows, 'pages_or_flows'],
    ['CLAIM', known.claims, 'claims'],
  ]) {
    const covered = new Set(tests.flatMap((x) => x[key] || []));
    const missing = all.filter((x) => !covered.has(x));
    c.assert('TEST-C-009', label, missing.length === 0, `${label} 无孤立目标（缺 ${missing.slice(0, 8).join(',')}）`);
  }

  // coverage 数字与实算一致
  const cov = t.data.coverage || {};
  c.assert('TEST-C-009', 'coverage', Number(cov.requirements_total) === p.data.requirements.length,
    `coverage.requirements_total=${cov.requirements_total} 与实算 ${p.data.requirements.length} 一致`);
  c.assert('TEST-C-009', 'coverage', Number(cov.must_features_total) === mustFeats.length,
    `coverage.must_features_total=${cov.must_features_total} 与实算 ${mustFeats.length} 一致`);

  return c.report();
}

if (process.argv[1] && process.argv[1].endsWith('check-target-traceability.mjs')) {
  const ctx = await cliCtx(import.meta.url);
  const r = run(ctx);
  for (const x of r.results) console.log(`${x.pass ? 'ok  ' : 'FAIL'} : [${x.testId}] ${x.message}`);
  console.log(`\n${r.checker}: ${r.pass ? 'PASS' : 'FAIL'}（${r.total - r.failureCount}/${r.total}）`);
  process.exit(r.pass ? 0 : 1);
}
