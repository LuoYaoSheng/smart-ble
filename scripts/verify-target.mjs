#!/usr/bin/env node
// scripts/verify-target.mjs —— Smart BLE 目标测试统一入口（TP-G1-R3）。
// 模式：system | current | all；--format=json|text
// Current PASS/FAIL 由 current.cases[] 聚合；SyntaxError → TEST_INFRA_FAIL。

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildCaseRecord, parseFileHeaderMeta } from '../tests/target/lib/case-meta.mjs';

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

function runNodeTestTap(files, layer) {
  const resolved = files.filter((f) => existsSync(f));
  if (!resolved.length) {
    return { pass: 0, fail: 0, skipped: 0, cases: [], failures: [], blocked: [], raw: '', exitCode: 0, infra_fail: 0 };
  }

  // Syntax precheck → TEST_INFRA_FAIL
  const infra = [];
  for (const f of resolved) {
    const chk = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (chk.status !== 0) {
      infra.push({
        file: f.replace(`${ROOT}/`, ''),
        message: (chk.stderr || chk.stdout || 'SyntaxError').slice(0, 300),
      });
    }
  }
  if (infra.length) {
    const cases = infra.map((x) => buildCaseRecord({
      name: 'TEST_INFRA_PARSE',
      file: x.file,
      layer,
      status: 'FAIL',
      error: `TEST_INFRA: ${x.message}`,
      headerMeta: {},
    }));
    return {
      pass: 0,
      fail: 0,
      skipped: 0,
      cases,
      failures: cases,
      blocked: [],
      raw: infra.map((x) => x.message).join('\n'),
      exitCode: 1,
      infra_fail: infra.length,
    };
  }

  const r = spawnSync(process.execPath, ['--test', '--test-reporter', 'tap', ...resolved], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = r.stdout + r.stderr;
  const headerCache = new Map();
  function headerFor(fileAbs) {
    const key = fileAbs;
    if (!headerCache.has(key)) {
      try {
        headerCache.set(key, parseFileHeaderMeta(readFileSync(fileAbs, 'utf8')));
      } catch {
        headerCache.set(key, {});
      }
    }
    return headerCache.get(key);
  }

  const cases = [];
  // TAP: ok/not ok N - name
  // Optional YAML diagnostic with duration_ms / error
  const lines = out.split(/\r?\n/);
  let currentFile = resolved[0]?.replace(`${ROOT}/`, '') || '';
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fileMark = line.match(/^#\s+(.+\.test\.m?js)\s*$/);
    if (fileMark) {
      const cand = fileMark[1];
      const abs = resolved.find((f) => f.endsWith(cand) || f.replace(`${ROOT}/`, '') === cand);
      if (abs) currentFile = abs.replace(`${ROOT}/`, '');
      continue;
    }
    const m = line.match(/^(ok|not ok) (\d+) - (.+)$/);
    if (!m) continue;
    const ok = m[1] === 'ok';
    const name = m[3].replace(/ #.+$/, '').trim();
    let duration = 0;
    let error = '';
    // peek YAML block
    if (lines[i + 1]?.trim() === '---') {
      let j = i + 2;
      const yaml = [];
      while (j < lines.length && lines[j].trim() !== '...') {
        yaml.push(lines[j]);
        j += 1;
      }
      const blob = yaml.join('\n');
      const dur = blob.match(/duration_ms:\s*([0-9.]+)/);
      if (dur) duration = Number(dur[1]);
      const loc = blob.match(/location:\s*'([^']+)'/) || blob.match(/location:\s*([^\n]+)/);
      if (loc) {
        const p = loc[1].replace(/:\d+:\d+\s*$/, '').trim();
        if (p.includes('tests/target/')) {
          currentFile = p.includes(ROOT) ? p.replace(`${ROOT}/`, '') : p.replace(/^.*?tests\/target\//, 'tests/target/');
        }
      }
      const err = blob.match(/error:\s*"([^"]*)"/) || blob.match(/error:\s*'([^']*)'/);
      if (err) error = String(err[1]).trim();
      if (!error) {
        const ft = blob.match(/failureType:\s*'([^']+)'/);
        if (ft) error = ft[1];
      }
    }
    const abs = `${ROOT}/${currentFile}`;
    const rec = buildCaseRecord({
      name,
      file: currentFile,
      layer,
      status: ok ? 'PASS' : 'FAIL',
      duration_ms: duration,
      error: ok ? '' : (error || name),
      headerMeta: headerFor(abs),
    });
    cases.push(rec);
  }

  // Fallback counts from TAP summary if cases empty
  const passSum = Number((out.match(/^# pass (\d+)/m) || [])[1] ?? cases.filter((c) => c.status === 'PASS').length);
  const failSum = Number((out.match(/^# fail (\d+)/m) || [])[1] ?? cases.filter((c) => c.status === 'FAIL' || c.status === 'TEST_INFRA_FAIL').length);
  const skipped = Number((out.match(/^# skip(?:ped)? (\d+)/m) || [])[1] ?? 0);

  const infraCases = cases.filter((c) => c.status === 'TEST_INFRA_FAIL');
  const failCases = cases.filter((c) => c.status === 'FAIL');
  const passCases = cases.filter((c) => c.status === 'PASS');

  return {
    pass: passCases.length || (infraCases.length ? 0 : passSum),
    fail: failCases.length || (infraCases.length ? 0 : failSum),
    skipped,
    cases,
    failures: [...failCases, ...infraCases],
    blocked: [],
    raw: out,
    exitCode: r.status ?? 0,
    infra_fail: infraCases.length,
  };
}

function runNodeTest(targets, layer = 'target') {
  const files = Array.isArray(targets) ? targets : [targets];
  const resolved = files.flatMap((t) => {
    if (t.endsWith('.test.mjs') || t.endsWith('.test.js')) {
      return [t.startsWith('/') ? t : resolve(ROOT, t)];
    }
    return listTestFiles(String(t).replace(`${ROOT}/`, '').replace(/^\.\//, ''));
  }).filter((f) => existsSync(f));
  // 逐文件执行，保证 PASS Case 也能绑定正确 source_file（TAP PASS 无 location）
  const merged = {
    pass: 0, fail: 0, skipped: 0, cases: [], failures: [], blocked: [], raw: '', exitCode: 0, infra_fail: 0,
  };
  for (const f of resolved) {
    const one = runNodeTestTap([f], layer);
    merged.pass += one.pass;
    merged.fail += one.fail;
    merged.skipped += one.skipped;
    merged.cases.push(...one.cases);
    merged.failures.push(...one.failures);
    merged.raw += one.raw + '\n';
    merged.infra_fail += one.infra_fail || 0;
    if (one.exitCode) merged.exitCode = one.exitCode;
  }
  return merged;
}

function isPlaywrightAvailable() {
  try {
    require.resolve('@playwright/test');
    return true;
  } catch {
    return false;
  }
}

function isPlaywrightConfigPresent() {
  return existsSync(`${ROOT}/playwright.config.js`) || existsSync(`${ROOT}/playwright.config.mjs`) || existsSync(`${ROOT}/playwright.config.ts`);
}

function isChromiumPresent() {
  try {
    const { chromium } = require('playwright');
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

function assessPageEnvironment() {
  const playwright = isPlaywrightAvailable();
  const config = isPlaywrightConfigPresent();
  const browser = isChromiumPresent();
  const testDir = existsSync(`${ROOT}/tests/target/pages/specs`)
    || existsSync(`${ROOT}/tests/target/pages`);
  const driver = hasTargetDriver();
  const baseURL = Boolean(process.env.TARGET_PAGE_BASE_URL);
  const toolchainReady = playwright && config && browser && testDir;
  return {
    playwright,
    browser,
    config,
    testDir,
    driver_env: process.env.TARGET_PAGE_DRIVER === '1',
    driver_runtime: existsSync(`${ROOT}/tests/target/pages/driver/page-driver-runtime.js`),
    base_url_set: baseURL,
    status: toolchainReady ? 'READY_FOR_PAGE_E4' : 'BLOCKED_BY_TOOLCHAIN',
    page_execution: !toolchainReady
      ? 'BLOCKED_BY_TOOLCHAIN'
      : (driver ? 'RUNNABLE' : 'BLOCKED_BY_TARGET_DRIVER'),
  };
}

function hasTargetDriver() {
  if (process.env.TARGET_PAGE_DRIVER === '0') return false;
  if (process.env.TARGET_PAGE_DRIVER === '1') return true;
  return existsSync(`${ROOT}/tests/target/pages/driver/page-driver-runtime.js`);
}

function hasTargetDriverEnv() {
  return hasTargetDriver();
}

function listSpecs() {
  const dir = `${ROOT}/tests/target/pages/specs`;
  if (existsSync(dir)) {
    return readdirSync(dir).filter((f) => f.endsWith('.spec.js')).map((f) => `${dir}/${f}`);
  }
  const legacy = `${ROOT}/tests/target/pages`;
  return readdirSync(legacy).filter((f) => f.endsWith('.spec.js')).map((f) => `${legacy}/${f}`);
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
      pass: 0, fail: 0, skipped: 0, failures: [], cases: [],
      blocked: specs.map((s) => ({ testId: s.split('/').pop(), reason: 'BLOCKED_BY_TOOLCHAIN', count: 1, layer: 'current', source: s })),
      blockedSummary: { BLOCKED_BY_TOOLCHAIN: specs.length },
      pages: { ...counts, blocked_specs: specs.length, blocked_cases: blockedCases, reason: 'BLOCKED_BY_TOOLCHAIN' },
      notExecuted: true,
      blockers: ['BLK-TOOL-PLAYWRIGHT', 'BLK-TEST-PAGE-DRIVER'],
    };
  }
  if (!hasTargetDriver()) {
    return {
      pass: 0, fail: 0, skipped: 0, failures: [], cases: [],
      blocked: specs.map((s) => ({ testId: s.split('/').pop(), reason: 'BLOCKED_BY_TARGET_DRIVER', count: 1, layer: 'current', source: s })),
      blockedSummary: { BLOCKED_BY_TARGET_DRIVER: specs.length },
      pages: { ...counts, blocked_specs: specs.length, blocked_cases: blockedCases, reason: 'BLOCKED_BY_TARGET_DRIVER' },
      notExecuted: true,
      blockers: ['BLK-TEST-PAGE-DRIVER'],
    };
  }
  const r = spawnSync('npx', ['playwright', 'test', 'tests/target/pages/specs'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = r.stdout + r.stderr;
  const pass = Number((out.match(/(\d+) passed/) || [])[1] ?? 0);
  const fail = Number((out.match(/(\d+) failed/) || [])[1] ?? 0);
  const skipped = Number((out.match(/(\d+) skipped/) || [])[1] ?? 0);
  return {
    pass, fail, skipped,
    failures: fail ? [{ testId: 'playwright', actual: out.slice(-500), layer: 'current', source: 'tests/target/pages' }] : [],
    cases: [],
    blocked: [], blockedSummary: {},
    pages: { ...counts, blocked_specs: 0, blocked_cases: 0, reason: null },
    raw: out, exitCode: r.status ?? 0, notExecuted: false, blockers: [],
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
  for (const b of items) summary[b.reason] = (summary[b.reason] || 0) + 1;
  return summary;
}

function firstBreakpointsFrom(cases) {
  const seen = new Set();
  return cases.filter((c) => c.status === 'FAIL' || c.status === 'TEST_INFRA_FAIL').filter((c) => {
    const key = `${c.case_id}:${(c.first_breakpoint || '').slice(0, 60)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30).map((c) => ({
    testId: c.test_id || c.case_id,
    targetIds: c.target_ids || [],
    expected: c.expected,
    actual: c.actual,
    firstBreakpoint: c.first_breakpoint,
    layer: c.layer,
    source: c.source_file,
  }));
}

const { mode, format } = parseArgs();
const result = {
  mode,
  system: { pass: 0, fail: 0, checkers: [], contract: null, pages_contract: null },
  harness: { pass: 0, fail: 0 },
  current: { pass: 0, fail: 0, layers: [], cases: [] },
  pages: null,
  blocked: {},
  first_breakpoints: [],
  TARGET_CONTRACT_FAIL: 0,
  TEST_INFRA_FAIL: 0,
  SYSTEM_PASS: 0,
  SYSTEM_FAIL: 0,
  HARNESS_PASS: 0,
  HARNESS_FAIL: 0,
  CURRENT_PASS: 0,
  CURRENT_FAIL: 0,
};

const allFailures = [];
const allBlocked = [];
let infraFail = 0;

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
  infraFail += contractR.infra_fail || 0;

  const pagesContract = `${ROOT}/tests/target/pages/pages-contract.test.mjs`;
  const pagesR = runNodeTest([pagesContract], 'system');
  result.system.pages_contract = { pass: pagesR.pass, fail: pagesR.fail };
  result.system.pass += pagesR.pass;
  result.system.fail += pagesR.fail;
  infraFail += pagesR.infra_fail || 0;

  const harnessFiles = listTestFiles('tests/target/harness');
  const harnessR = runNodeTest(harnessFiles, 'harness');
  result.harness.pass = harnessR.pass;
  result.harness.fail = harnessR.fail;
  infraFail += harnessR.infra_fail || 0;

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
    result.current.layers.push({
      name: d.name,
      pass: r.pass,
      fail: r.fail,
      skipped: r.skipped,
      case_count: r.cases.length,
      infra_fail: r.infra_fail || 0,
    });
    result.current.cases.push(...r.cases.map((c) => ({ ...c, layer: d.name })));
    result.current.pass += r.pass;
    result.current.fail += r.fail;
    infraFail += r.infra_fail || 0;
    if (format === 'text') {
      process.stdout.write(`\n===== Current ${d.name} =====\n`);
      process.stdout.write(`PASS ${r.pass} / FAIL ${r.fail} / CASES ${r.cases.length}\n`);
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
    blockers: pageR.blockers || [],
  });
  result.current.pass += pageR.pass;
  result.current.fail += pageR.fail;
  allBlocked.push(...pageR.blocked);
  if (pageR.notExecuted && pageR.blockedSummary) {
    for (const [k, v] of Object.entries(pageR.blockedSummary)) {
      result.blocked[k] = (result.blocked[k] || 0) + v;
    }
  }

  // Recompute from cases (authoritative for unit/integration/...)；页面 Playwright 另计
  const realCases = result.current.cases;
  const passFromCases = realCases.filter((c) => c.status === 'PASS').length;
  const failFromCases = realCases.filter((c) => c.status === 'FAIL').length;
  const infraFromCases = realCases.filter((c) => c.status === 'TEST_INFRA_FAIL').length;
  if (realCases.length) {
    result.CURRENT_PASS = passFromCases + (pageR.pass || 0);
    result.CURRENT_FAIL = failFromCases + (pageR.fail || 0);
    result.current.pass = result.CURRENT_PASS;
    result.current.fail = result.CURRENT_FAIL;
  } else {
    result.CURRENT_PASS = result.current.pass;
    result.CURRENT_FAIL = result.current.fail;
  }
  result.pages = {
    ...(pageR.pages || loadPageCaseCounts()),
    pass: pageR.pass || 0,
    fail: pageR.fail || 0,
    skipped: pageR.skipped || 0,
    notExecuted: !!pageR.notExecuted,
  };
  // infraFail already counted from --check; add only case-level TEST_INFRA not already counted
  if (infraFromCases) infraFail = Math.max(infraFail, infraFromCases);
}

result.TEST_INFRA_FAIL = infraFail;
result.blocked = { ...result.blocked, ...aggregateBlocked(allBlocked) };
result.first_breakpoints = firstBreakpointsFrom(result.current.cases || []);

// Persist structured current for gap generator (ignored path preferred)
try {
  mkdirSync(`${ROOT}/.tmp/tp-g2/logs`, { recursive: true });
  writeFileSync(`${ROOT}/.tmp/tp-g2/logs/current-structured.json`, JSON.stringify({
    CURRENT_PASS: result.CURRENT_PASS,
    CURRENT_FAIL: result.CURRENT_FAIL,
    TEST_INFRA_FAIL: result.TEST_INFRA_FAIL,
    cases: result.current.cases,
    layers: result.current.layers,
    pages: result.pages,
    blocked: result.blocked,
    first_breakpoints: result.first_breakpoints,
  }, null, 2));
} catch {
  // ignore
}

if (format === 'json') {
  console.log(JSON.stringify({
    system: result.system,
    harness: result.harness,
    current: result.current,
    pages: result.pages,
    blocked: result.blocked,
    page_environment: assessPageEnvironment(),
    first_breakpoints: result.first_breakpoints,
    SYSTEM_PASS: result.SYSTEM_PASS,
    SYSTEM_FAIL: result.SYSTEM_FAIL,
    HARNESS_PASS: result.HARNESS_PASS,
    HARNESS_FAIL: result.HARNESS_FAIL,
    CURRENT_PASS: result.CURRENT_PASS,
    CURRENT_FAIL: result.CURRENT_FAIL,
    TARGET_CONTRACT_FAIL: result.TARGET_CONTRACT_FAIL,
    TEST_INFRA_FAIL: result.TEST_INFRA_FAIL,
  }, null, 2));
} else {
  console.log('\n================ TARGET VERIFY SUMMARY ================');
  if (mode === 'system' || mode === 'all') {
    console.log(`SYSTEM  pass=${result.SYSTEM_PASS} fail=${result.SYSTEM_FAIL} TARGET_CONTRACT_FAIL=${result.TARGET_CONTRACT_FAIL}`);
    console.log(`HARNESS pass=${result.HARNESS_PASS} fail=${result.HARNESS_FAIL}`);
    console.log(`TEST_INFRA_FAIL=${result.TEST_INFRA_FAIL}`);
  }
  console.log(`PAGE_ENV ${JSON.stringify(assessPageEnvironment())}`);
  if (mode === 'current' || mode === 'all') {
    console.log(`CURRENT pass=${result.CURRENT_PASS} fail=${result.CURRENT_FAIL} cases=${result.current.cases.length}`);
  }
  if (result.pages) console.log(`PAGES  ${JSON.stringify(result.pages)}`);
  console.log(`BLOCKED ${JSON.stringify(result.blocked)}`);
  console.log('\n第一断点预览（Current only，前 10）：');
  result.first_breakpoints.slice(0, 10).forEach((b, i) => console.log(`${i + 1}. [${b.testId}] ${b.firstBreakpoint}`));
}

const exitCode = (() => {
  if (mode === 'system') {
    return (result.SYSTEM_FAIL + result.HARNESS_FAIL + result.TARGET_CONTRACT_FAIL + result.TEST_INFRA_FAIL) === 0 ? 0 : 1;
  }
  if (mode === 'current') return (result.CURRENT_FAIL + result.TEST_INFRA_FAIL) === 0 ? 0 : 1;
  const sysOk = (result.SYSTEM_FAIL + result.HARNESS_FAIL + result.TARGET_CONTRACT_FAIL + result.TEST_INFRA_FAIL) === 0;
  return sysOk ? (result.CURRENT_FAIL === 0 ? 0 : 1) : 1;
})();
process.exit(exitCode);
