#!/usr/bin/env node
// scripts/verify-target.mjs —— Smart BLE 目标测试统一入口（TP-G1-R1）。
// 模式：
//   --mode=system   Approved Target Contract + Harness + 定义完整性（TP-G1 门禁）
//   --mode=current  当前实现对目标测试（允许 FAIL/NOT_IMPLEMENTED）
//   --mode=all      system + current
//   --format=json   机器可读输出

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function parseArgs() {
  const mode = (process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1] || 'all');
  const format = process.argv.includes('--format=json') ? 'json' : 'text';
  if (!['system', 'current', 'all'].includes(mode)) {
    console.error('用法: node scripts/verify-target.mjs --mode=system|current|all [--format=json]');
    process.exit(2);
  }
  return { mode, format };
}

const CHECKERS = [
  { id: 'TEST-C-contract', script: 'scripts/target/check-target-contract.mjs' },
  { id: 'TEST-C-pages', script: 'scripts/target/check-target-pages.mjs' },
  { id: 'TEST-C-flows', script: 'scripts/target/check-target-flows.mjs' },
  { id: 'TEST-C-platforms', script: 'scripts/target/check-target-platforms.mjs' },
  { id: 'TEST-C-protocols', script: 'scripts/target/check-target-protocols.mjs' },
  { id: 'TEST-C-traceability', script: 'scripts/target/check-target-traceability.mjs' },
  { id: 'TEST-C-landing', script: 'scripts/target/check-target-landing-claims.mjs' },
];

function runChecker(script) {
  const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = r.stdout + r.stderr;
  const pass = (out.match(/^ok  /gm) || []).length;
  const fail = (out.match(/^FAIL/gm) || []).length;
  const failures = [...out.matchAll(/^FAIL : \[([^\]]+)\] (.+)$/gm)].map((m) => ({
    testId: m[1],
    message: m[2],
    layer: 'system',
    source: script,
  }));
  return { pass, fail, exitCode: r.status ?? 1, failures, raw: out };
}

function listTestFiles(dirRel) {
  const full = `${ROOT}/${dirRel}`;
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => f.endsWith('.test.mjs') || f.endsWith('.test.js'))
    .map((f) => `${full}/${f}`);
}

function runNodeTest(targets, layer = 'target') {
  const files = Array.isArray(targets) ? targets : [targets];
  const resolved = files.flatMap((t) => {
    if (t.endsWith('.test.mjs') || t.endsWith('.test.js')) {
      return [t.startsWith('/') ? t : resolve(ROOT, t)];
    }
    const rel = String(t).replace(`${ROOT}/`, '').replace(/^\.\//, '');
    return listTestFiles(rel);
  }).filter((f) => existsSync(f));
  if (!resolved.length) return { pass: 0, fail: 0, skipped: 0, failures: [], blocked: [], raw: '', exitCode: 0 };
  const args = ['--test', ...resolved];
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = r.stdout + r.stderr;
  const pass = Number((out.match(/^# pass (\d+)/m) || out.match(/^ℹ pass (\d+)/m) || [])[1] ?? 0);
  const fail = Number((out.match(/^# fail (\d+)/m) || out.match(/^ℹ fail (\d+)/m) || [])[1] ?? 0);
  const skipped = Number((out.match(/^# skipped (\d+)/m) || out.match(/^ℹ skipped (\d+)/m) || [])[1] ?? 0);
  const failures = [];
  const blocked = [];
  const sourceLabel = resolved.map((f) => f.replace(`${ROOT}/`, '')).join(',');
  for (const m of out.matchAll(/not ok \d+ - ([^\n]+)\n[\s\S]*?(?:error: '([^']+)'|skip: '([^']+)')/g)) {
    const testId = m[1].trim();
    const msg = m[2] || m[3] || '';
    if (/BLOCKED_BY_TOOLCHAIN/.test(msg)) blocked.push({ testId, reason: 'BLOCKED_BY_TOOLCHAIN', message: msg, layer, source: sourceLabel });
    else if (/BLOCKED_BY_TARGET_DRIVER/.test(msg)) blocked.push({ testId, reason: 'BLOCKED_BY_TARGET_DRIVER', message: msg, layer, source: sourceLabel });
    else if (/NOT_IMPLEMENTED/.test(msg)) failures.push({ testId, actual: msg, layer: 'current', source: sourceLabel });
    else if (m[2]) failures.push({ testId, actual: msg, layer, source: sourceLabel });
  }
  const notImpl = [...out.matchAll(/error: '(NOT_IMPLEMENTED:[^']{0,200})/g)].map((m) => m[1]);
  for (const msg of notImpl) {
    if (!failures.some((f) => f.actual === msg)) {
      failures.push({ testId: 'unknown', actual: msg, layer: 'current', source: sourceLabel });
    }
  }
  return { pass, fail, skipped, failures, blocked, raw: out, exitCode: r.status ?? (fail ? 1 : 0) };
}

function isPlaywrightAvailable() {
  try {
    require.resolve('@playwright/test');
    return true;
  } catch {
    return false;
  }
}

function hasTargetDriverEnv() {
  return process.env.TARGET_PAGE_DRIVER === '1';
}

function listSpecs() {
  const dir = `${ROOT}/tests/target/pages`;
  return readdirSync(dir).filter((f) => f.endsWith('.spec.js')).map((f) => `${dir}/${f}`);
}

function loadPageCaseCounts() {
  try {
    const behavior = JSON.parse(readFileSync(`${ROOT}/tests/target/pages/page-behavior.manifest.json`, 'utf8'));
    let stateCases = 0;
    let operationCases = 0;
    let assertionCases = 0;
    for (const p of behavior.pages) {
      stateCases += p.states.length;
      operationCases += p.operations.length;
      assertionCases += p.operations.length * 6 + p.states.length * 3 + 8;
      if (p.web_extra) assertionCases += 8;
    }
    return {
      specs: behavior.pages.length,
      state_cases: stateCases,
      operation_cases: operationCases,
      assertion_cases: assertionCases,
      totals: behavior.totals,
    };
  } catch {
    return { specs: 11, state_cases: 0, operation_cases: 0, assertion_cases: 0 };
  }
}

function runPageSpecs() {
  const specs = listSpecs();
  const counts = loadPageCaseCounts();
  // Approximate parameterized cases: contract + states + ops + 5 page-level + web extras
  const casesPerSpec = (pageId) => {
    try {
      const behavior = JSON.parse(readFileSync(`${ROOT}/tests/target/pages/page-behavior.manifest.json`, 'utf8'));
      const p = behavior.pages.find((x) => pageId.startsWith(x.page_id));
      if (!p) return 8;
      return 1 + p.states.length + p.operations.length + 5 + (p.web_extra ? 4 : 0);
    } catch {
      return 8;
    }
  };
  const blockedCases = specs.reduce((n, s) => n + casesPerSpec(s.split('/').pop()), 0);

  if (!isPlaywrightAvailable()) {
    return {
      pass: 0, fail: 0, skipped: 0, failures: [],
      blocked: specs.map((s) => ({ testId: s.split('/').pop(), reason: 'BLOCKED_BY_TOOLCHAIN', count: 1, layer: 'current', source: s })),
      blockedSummary: { BLOCKED_BY_TOOLCHAIN: specs.length },
      pages: {
        ...counts,
        blocked_specs: specs.length,
        blocked_cases: blockedCases,
        reason: 'BLOCKED_BY_TOOLCHAIN',
      },
      notExecuted: true,
    };
  }
  if (!hasTargetDriverEnv()) {
    return {
      pass: 0, fail: 0, skipped: 0, failures: [],
      blocked: specs.map((s) => ({ testId: s.split('/').pop(), reason: 'BLOCKED_BY_TARGET_DRIVER', count: 1, layer: 'current', source: s })),
      blockedSummary: { BLOCKED_BY_TARGET_DRIVER: specs.length },
      pages: {
        ...counts,
        blocked_specs: specs.length,
        blocked_cases: blockedCases,
        reason: 'BLOCKED_BY_TARGET_DRIVER',
      },
      notExecuted: true,
    };
  }
  const r = spawnSync('npx', ['playwright', 'test', 'tests/target/pages'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = r.stdout + r.stderr;
  const pass = Number((out.match(/(\d+) passed/) || [])[1] ?? 0);
  const fail = Number((out.match(/(\d+) failed/) || [])[1] ?? 0);
  const skipped = Number((out.match(/(\d+) skipped/) || [])[1] ?? 0);
  return {
    pass, fail, skipped,
    failures: fail ? [{ testId: 'playwright', actual: out.slice(-500), layer: 'current', source: 'tests/target/pages' }] : [],
    blocked: [], blockedSummary: {},
    pages: { ...counts, blocked_specs: 0, blocked_cases: 0, reason: null },
    raw: out, exitCode: r.status ?? 0, notExecuted: false,
  };
}

function aggregateBlocked(items) {
  const summary = {
    BLOCKED_BY_TOOLCHAIN: 0,
    BLOCKED_BY_TARGET_DRIVER: 0,
    BLOCKED_BY_FIXTURE: 0,
    BLOCKED_BY_CREDENTIAL: 0,
    NOT_EXECUTED: 0,
  };
  for (const b of items) {
    summary[b.reason] = (summary[b.reason] || 0) + 1;
  }
  return summary;
}

function firstBreakpointsFrom(failures) {
  const seen = new Set();
  return failures.filter((f) => f.layer === 'current').filter((f) => {
    const key = `${f.testId}:${(f.actual || f.message || '').slice(0, 60)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20).map((f) => ({
    testId: f.testId,
    targetIds: f.targetIds || [],
    expected: f.expected || 'target contract',
    actual: f.actual || f.message,
    firstBreakpoint: (f.actual || f.message || '').replace(/^NOT_IMPLEMENTED:\s*/, '').slice(0, 120),
    layer: f.layer,
    source: f.source,
  }));
}

const { mode, format } = parseArgs();
const result = {
  mode,
  system: { pass: 0, fail: 0, checkers: [], contract: null, pages_contract: null },
  harness: { pass: 0, fail: 0 },
  current: { pass: 0, fail: 0, layers: [] },
  pages: null,
  blocked: {},
  first_breakpoints: [],
  TARGET_CONTRACT_FAIL: 0,
  SYSTEM_PASS: 0,
  SYSTEM_FAIL: 0,
  HARNESS_PASS: 0,
  HARNESS_FAIL: 0,
  CURRENT_PASS: 0,
  CURRENT_FAIL: 0,
};

const allFailures = [];
const allBlocked = [];

if (mode === 'system' || mode === 'all') {
  for (const c of CHECKERS) {
    const r = runChecker(c.script);
    result.system.checkers.push({ id: c.id, pass: r.pass, fail: r.fail });
    result.system.pass += r.pass;
    result.system.fail += r.fail;
    allFailures.push(...r.failures);
    if (format === 'text') {
      process.stdout.write(`\n===== Checker ${c.id} =====\n`);
      process.stdout.write(r.raw.split('\n').filter((l) => /^ok |^FAIL|^check-/.test(l)).join('\n') + '\n');
    }
  }
  result.TARGET_CONTRACT_FAIL = result.system.fail;

  const contractFiles = listTestFiles('tests/target/contract');
  const contractR = runNodeTest(contractFiles, 'system');
  result.system.contract = { pass: contractR.pass, fail: contractR.fail };
  result.system.pass += contractR.pass;
  result.system.fail += contractR.fail;
  allFailures.push(...contractR.failures);

  const pagesContract = `${ROOT}/tests/target/pages/pages-contract.test.mjs`;
  const pagesR = runNodeTest([pagesContract], 'system');
  result.system.pages_contract = { pass: pagesR.pass, fail: pagesR.fail };
  result.system.pass += pagesR.pass;
  result.system.fail += pagesR.fail;

  const harnessFiles = listTestFiles('tests/target/harness');
  const harnessR = runNodeTest(harnessFiles, 'harness');
  result.harness.pass = harnessR.pass;
  result.harness.fail = harnessR.fail;
  allFailures.push(...harnessR.failures.filter((f) => f.layer !== 'current'));

  result.SYSTEM_PASS = result.system.pass;
  result.SYSTEM_FAIL = result.system.fail;
  result.HARNESS_PASS = result.harness.pass;
  result.HARNESS_FAIL = result.harness.fail;
}

if (mode === 'current' || mode === 'all') {
  const currentDirs = [
    { name: 'unit', path: 'tests/target/unit' },
    { name: 'integration', path: 'tests/target/integration' },
    { name: 'firmware', path: 'tests/target/firmware' },
    { name: 'release', path: 'tests/target/release' },
  ];
  for (const d of currentDirs) {
    const r = runNodeTest(d.path, 'current');
    result.current.layers.push({ name: d.name, pass: r.pass, fail: r.fail, skipped: r.skipped });
    result.current.pass += r.pass;
    result.current.fail += r.fail;
    allFailures.push(...r.failures);
    if (format === 'text') {
      process.stdout.write(`\n===== Current ${d.name} =====\n`);
      process.stdout.write(`PASS ${r.pass} / FAIL ${r.fail}${r.skipped ? ` / SKIPPED ${r.skipped}` : ''}\n`);
    }
  }

  const pageR = runPageSpecs();
  result.pages = pageR.pages || loadPageCaseCounts();
  result.current.layers.push({
    name: 'pages-playwright',
    pass: pageR.pass,
    fail: pageR.fail,
    skipped: pageR.skipped,
    blocked: pageR.blockedSummary,
    pages: pageR.pages,
    notExecuted: pageR.notExecuted,
  });
  result.current.pass += pageR.pass;
  result.current.fail += pageR.fail;
  allBlocked.push(...pageR.blocked);
  if (pageR.notExecuted && pageR.blockedSummary) {
    for (const [k, v] of Object.entries(pageR.blockedSummary)) {
      result.blocked[k] = (result.blocked[k] || 0) + v;
    }
  }

  result.CURRENT_PASS = result.current.pass;
  result.CURRENT_FAIL = result.current.fail;
}

result.blocked = { ...result.blocked, ...aggregateBlocked(allBlocked) };
result.first_breakpoints = firstBreakpointsFrom(allFailures);

if (format === 'json') {
  console.log(JSON.stringify({
    system: result.system,
    harness: result.harness,
    current: result.current,
    pages: result.pages,
    blocked: result.blocked,
    first_breakpoints: result.first_breakpoints,
    SYSTEM_PASS: result.SYSTEM_PASS,
    SYSTEM_FAIL: result.SYSTEM_FAIL,
    HARNESS_PASS: result.HARNESS_PASS,
    HARNESS_FAIL: result.HARNESS_FAIL,
    CURRENT_PASS: result.CURRENT_PASS,
    CURRENT_FAIL: result.CURRENT_FAIL,
    TARGET_CONTRACT_FAIL: result.TARGET_CONTRACT_FAIL,
  }, null, 2));
} else {
  console.log('\n================ TARGET VERIFY SUMMARY ================');
  if (mode === 'system' || mode === 'all') {
    console.log(`SYSTEM  pass=${result.SYSTEM_PASS} fail=${result.SYSTEM_FAIL} TARGET_CONTRACT_FAIL=${result.TARGET_CONTRACT_FAIL}`);
    console.log(`HARNESS pass=${result.HARNESS_PASS} fail=${result.HARNESS_FAIL}`);
  }
  if (mode === 'current' || mode === 'all') {
    console.log(`CURRENT pass=${result.CURRENT_PASS} fail=${result.CURRENT_FAIL}`);
  }
  if (result.pages) console.log(`PAGES  ${JSON.stringify(result.pages)}`);
  console.log(`BLOCKED ${JSON.stringify(result.blocked)}`);
  console.log('\n第一断点预览（Current only，前 10）：');
  result.first_breakpoints.slice(0, 10).forEach((b, i) => console.log(`${i + 1}. [${b.testId}] ${b.firstBreakpoint}`));
}

const exitCode = (() => {
  if (mode === 'system') return (result.SYSTEM_FAIL + result.HARNESS_FAIL + result.TARGET_CONTRACT_FAIL) === 0 ? 0 : 1;
  if (mode === 'current') return result.CURRENT_FAIL === 0 ? 0 : 1;
  const sysOk = (result.SYSTEM_FAIL + result.HARNESS_FAIL + result.TARGET_CONTRACT_FAIL) === 0;
  return sysOk ? (result.CURRENT_FAIL === 0 ? 0 : 1) : 1;
})();
process.exit(exitCode);
