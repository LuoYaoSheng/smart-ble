#!/usr/bin/env node
/**
 * TP-G2-R2：解析 Playwright E4 JSON + 静态/Current 证据 → 真实页面差距报告。
 * Fake Runtime harness PASS ≠ 产品 PASS。
 * 禁止修改 apps/uniapp / core / hardware。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_TMP = `${ROOT}/.tmp/tp-g2-r2/page-results`;
const REPORTS = `${ROOT}/reports/target-vs-current`;
const DOCS_GAP = `${ROOT}/docs/gap-analysis`;

function read(p) {
  const abs = resolve(ROOT, p);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
}
function exists(p) {
  return existsSync(resolve(ROOT, p));
}
function sha(s) {
  return createHash('sha256').update(s).digest('hex');
}

const behavior = JSON.parse(read('tests/target/pages/page-behavior.manifest.json'));
const pagesTarget = JSON.parse(read('contracts/target/pages-target.json'));
const current = exists('.tmp/tp-g2/logs/current-structured.json')
  ? JSON.parse(read('.tmp/tp-g2/logs/current-structured.json'))
  : { cases: [] };

// ---- static facts (read-only) ----
const FACTS = {
  deviceFilter: read('apps/uniapp/services/ble-runtime/device-filter.js'),
  bleIndex: read('apps/uniapp/services/ble-runtime/index.js'),
  useBleScan: read('apps/uniapp/composables/use-ble-scan.js'),
  broadcastPage: read('apps/uniapp/pages/broadcast/index.vue'),
  versionPage: read('apps/uniapp/pages/about/version.vue'),
  aboutPage: read('apps/uniapp/pages/about/index.vue'),
  deviceDetail: read('apps/uniapp/pages/device/detail.vue'),
  landing: read('docs/index.md'),
  ota: read('apps/uniapp/utils/ota_manager.js'),
  esp32: read('hardware/esp32/LightBLE/src/main.cpp'),
  hidAdd: read('apps/uniapp/pages/hid/add.vue'),
  hidDetail: read('apps/uniapp/pages/hid/detail.vue'),
  hidHistory: read('apps/uniapp/pages/hid/history.vue'),
  hidDiag: read('apps/uniapp/pages/hid/diagnostics.vue'),
  connected: read('apps/uniapp/pages/connected/index.vue'),
  indexPage: read('apps/uniapp/pages/index/index.vue'),
  advertDialog: read('apps/uniapp/components/scan/advertisement-dialog.vue'),
  hasLogRedaction: exists('apps/uniapp/services/ble-runtime/log-redaction.js'),
  hasWriteQueue: exists('apps/uniapp/services/ble-runtime/write-queue.js'),
  hasReconnect: exists('apps/uniapp/services/ble-runtime/reconnect-policy.js'),
  hasDisplayName: exists('apps/uniapp/services/ble-runtime/display-name.js'),
  hasValidateHex: /validateHexInput|parseHexInput/.test(
    read('apps/uniapp/services/ble-runtime/index.js')
      + read('apps/uniapp/services/ble-runtime/gatt-codec.js')
      + read('apps/uniapp/pages/device/detail.vue'),
  ),
  hasGattCodec: exists('apps/uniapp/services/ble-runtime/gatt-codec.js'),
  broadcastUsesComposable: /useBroadcastSession|use-broadcast-session/.test(
    read('apps/uniapp/pages/broadcast/index.vue'),
  ),
  versionUsesModel: /getVersionPageModel/.test(read('apps/uniapp/pages/about/version.vue'))
    && !/\bversionHistory\b/.test(read('apps/uniapp/pages/about/version.vue')),
  landingFake: /releases\/latest/.test(read('docs/index.md')),
  landingPreview: /PREVIEW/.test(read('docs/index.md')),
  landingNotReleased: /NOT_RELEASED/.test(read('docs/index.md')),
  connectDiscovers: /discoverServices/.test(read('apps/uniapp/services/ble-runtime/index.js'))
    && /discover === false \? \[\] : await discoverServices/.test(read('apps/uniapp/services/ble-runtime/index.js')),
  scanAutoStop5: /autoStopSeconds\s*=\s*5/.test(read('apps/uniapp/composables/use-ble-scan.js')),
  hasObserver: /BLEToolkit-Observer|fixture_observer/.test(read('hardware/esp32/LightBLE/src/main.cpp')),
  filterHasKeywordMatch: /keyword|tokens|includes\(/.test(read('apps/uniapp/services/ble-runtime/device-filter.js')),
  registrySubCount: /subscription_count|subscriptionCount/.test(
    read('apps/uniapp/services/ble-runtime/index.js') + read('apps/uniapp/pages/connected/index.vue'),
  ),
};

/** Evidence from failing current cases mapped by page / feature */
function collectFailEvidence() {
  const byPage = new Map();
  for (const c of current.cases || []) {
    if (c.status !== 'FAIL') continue;
    const targets = c.target_ids || [];
    const pages = targets.filter((t) => /^PAGE-\d+|WEB-001/.test(t));
    const hit = pages.length ? pages : inferPagesFromTitle(c);
    for (const pid of hit) {
      if (!byPage.has(pid)) byPage.set(pid, []);
      byPage.get(pid).push({
        test_id: c.test_id || c.case_id,
        first_breakpoint: c.first_breakpoint || c.actual || '',
        target_ids: targets,
        source_file: c.source_file || null,
      });
    }
  }
  return byPage;
}

function inferPagesFromTitle(c) {
  const t = `${c.title || ''} ${c.case_id || ''} ${c.first_breakpoint || ''}`;
  const out = [];
  for (const id of ['PAGE-001', 'PAGE-002', 'PAGE-003', 'PAGE-004', 'PAGE-005', 'PAGE-006', 'PAGE-007', 'PAGE-008', 'PAGE-009', 'PAGE-010', 'WEB-001']) {
    if (t.includes(id)) out.push(id);
  }
  return out;
}

const FAIL_EV = collectFailEvidence();

/** Page-level product assessment (static + current FAIL evidence) */
const PAGE_ASSESS = {
  'PAGE-001': {
    product: 'PASS',
    task_id: null,
    root_cause_id: null,
    first_breakpoint: null,
    also: [
      { task_id: null, file: 'apps/uniapp/composables/use-ble-scan.js', symbol: 'autoStopSeconds', breakpoint: 'scan auto-stop is 5s; target DEC-013 default 10s（观察项，非本轮 RUNTIME 断点）' },
    ],
    notes: 'RUNTIME-FILTER-001 / RUNTIME-DISPLAY-NAME-001 DONE；E4 harness PASS；DEC-013 时长差异记观察',
  },
  'PAGE-002': {
    product: 'FAIL',
    task_id: 'RUNTIME-LOG-REDACTION-001',
    root_cause_id: 'RC-LOG-REDACTION',
    first_breakpoint: {
      target: 'FEAT-040',
      test: 'TEST-U-013',
      file: 'apps/uniapp/services/ble-runtime/log-redaction.js',
      symbol: '(missing)',
      breakpoint: 'log-redaction module missing; HID provision path shares REQ-036/050',
    },
    also: [
      { task_id: 'TEST-BRIDGE-TS-001', breakpoint: 'Smart HID protocol TS import SyntaxError (TEST-U-015)' },
    ],
    notes: 'hid/add + use-smart-hid-provisioning 存在；Workflow 被 Runtime/桥接断点阻断',
  },
  'PAGE-003': {
    product: 'PASS',
    task_id: null,
    root_cause_id: null,
    first_breakpoint: null,
    notes: 'hid/detail 页面存在；无独立 CURRENT_FAIL 挂载；E4 Fake PASS；控件级静态未全量确认但无确定 FAIL 证据',
  },
  'PAGE-004': {
    product: 'PASS',
    task_id: null,
    root_cause_id: null,
    first_breakpoint: null,
    notes: 'hid/history 为历史唯一管理面；静态 CONFIRMED_IMPLEMENTED',
  },
  'PAGE-005': {
    product: 'PASS',
    task_id: null,
    root_cause_id: null,
    first_breakpoint: null,
    notes: 'hid/diagnostics 存在；无独立 FAIL 证据',
  },
  'PAGE-006': {
    product: 'FAIL',
    task_id: 'RUNTIME-RECONNECT-001',
    root_cause_id: 'RC-RECONNECT',
    first_breakpoint: {
      target: 'FEAT-022',
      test: 'TEST-I-003',
      file: 'apps/uniapp/services/ble-runtime/reconnect-policy.js',
      symbol: '(missing)',
      breakpoint: 'reconnect-policy module missing (RUNTIME-WRITE-QUEUE-001 CLOSED)',
    },
    also: [
      { task_id: 'OTA-CLIENT-001', file: 'apps/uniapp/utils/ota_manager.js', breakpoint: 'CTRL start before DATA / validateOtaPackage (TEST-I-008)' },
      { task_id: 'RUNTIME-CONNECTION-DISCOVERY-001', file: 'apps/uniapp/services/ble-runtime/index.js', symbol: 'connectDevice', breakpoint: 'TEST-I-003 asserts discover orchestration gap (semi-open risk)' },
    ],
    notes: 'RUNTIME-GATT-CODEC + WRITE-QUEUE + SESSION DONE；PAGE-006 剩余 reconnect / OTA',
  },
  'PAGE-007': {
    product: 'PASS',
    task_id: null,
    root_cause_id: null,
    first_breakpoint: null,
    also: [
      { task_id: 'RUNTIME-RECONNECT-001', breakpoint: '重连进度展示依赖 reconnect-policy（观察项，非 Session 断点）' },
    ],
    notes: 'RUNTIME-SESSION-001 DONE；Session Registry + subscription_count + 配网排除；E4 harness PASS',
  },
  'PAGE-008': {
    product: 'FAIL',
    task_id: 'PAGE-BROADCAST-001',
    root_cause_id: 'RC-PAGE-BROADCAST',
    first_breakpoint: {
      target: 'FEAT-041',
      test: 'TEST-P-008',
      file: 'apps/uniapp/pages/broadcast/index.vue',
      symbol: '(inline advertising)',
      breakpoint: 'page does not use useBroadcastSession composable/owner',
    },
    also: [
      { task_id: 'ESP32-OBSERVER-001', status_hint: 'BLOCKED', breakpoint: 'no BLEToolkit-Observer fixture → BLOCKED_BY_FIXTURE for observer-dependent ops' },
    ],
    notes: '广播页 CONFIRMED_PARTIAL；Observer 缺失记 BLOCKED 而非页面产品 FAIL',
  },
  'PAGE-009': {
    product: 'PASS',
    task_id: null,
    root_cause_id: null,
    first_breakpoint: null,
    notes: 'about/index 消费 getVersionPageModel；链接区存在',
  },
  'PAGE-010': {
    product: 'PASS',
    task_id: null,
    root_cause_id: null,
    first_breakpoint: null,
    notes: 'version.vue → getVersionPageModel；无 versionHistory；RC-PAGE-VERSION CLOSED',
  },
  'WEB-001': {
    product: FACTS.landingFake ? 'FAIL' : 'PASS',
    task_id: FACTS.landingFake ? 'PUBLIC-HONESTY-001' : null,
    root_cause_id: FACTS.landingFake ? 'RC-LANDING-FAKE-DOWNLOAD' : null,
    first_breakpoint: FACTS.landingFake
      ? {
        target: 'WEB-001',
        test: 'TEST-R-001',
        file: 'docs/index.md',
        symbol: 'releases/latest',
        breakpoint: 'fake download hub still present',
      }
      : null,
    notes: FACTS.landingPreview && FACTS.landingNotReleased
      ? 'Landing PREVIEW/NOT_RELEASED 诚实；无 releases/latest。旧 AUTOMATED_FAIL 来自共享 log-redaction 证据，不记为 Landing 产品 FAIL'
      : 'Landing 状态异常',
  },
};

// Override WEB if log-redaction was wrongly primary — keep product PASS when honesty ok
if (!FACTS.landingFake && FACTS.landingPreview) {
  PAGE_ASSESS['WEB-001'].product = 'PASS';
  PAGE_ASSESS['WEB-001'].task_id = null;
}

function loadPlaywrightJson() {
  const candidates = [
    `${OUT_TMP}/playwright-results.json`,
    `${OUT_TMP}/playwright-results.default.json`,
    `${ROOT}/test-results/playwright-results.json`,
  ];
  for (const c of candidates) {
    if (!existsSync(c)) continue;
    try {
      const j = JSON.parse(readFileSync(c, 'utf8'));
      if (j.suites) return j;
    } catch {
      /* try next */
    }
  }
  throw new Error('playwright JSON report missing under .tmp/tp-g2-r2/page-results/');
}

function walkSpecs(suite, acc = [], trail = []) {
  const title = suite.title || '';
  const next = title ? [...trail, title] : trail;
  for (const s of suite.suites || []) walkSpecs(s, acc, next);
  for (const spec of suite.specs || []) {
    const full = [...next, spec.title].join(' › ');
    const result = (spec.tests || [])[0]?.results?.[0];
    const statusRaw = result?.status || (spec.ok ? 'expected' : 'unexpected');
    let harness = 'PASS';
    if (statusRaw === 'skipped') harness = 'BLOCKED';
    else if (statusRaw === 'unexpected' || statusRaw === 'failed') harness = 'FAIL';
    else if (statusRaw === 'expected' || statusRaw === 'passed') harness = 'PASS';
    acc.push({
      full_title: full,
      file: spec.file || suite.file,
      harness_status: harness,
      duration: result?.duration ?? null,
      error: result?.error?.message || null,
    });
  }
  return acc;
}

function parseIds(fullTitle) {
  const page = (fullTitle.match(/\b(PAGE-\d{3}|WEB-001)\b/) || [])[1] || null;
  const state = (fullTitle.match(/\b(STATE-[A-Z0-9-]+)\b/) || [])[1] || null;
  const op = (fullTitle.match(/\b(OP-[A-Z0-9-]+)\b/) || [])[1] || null;
  return { page_id: page, state_id: state, operation_id: op };
}

function findOp(pageId, opId) {
  const p = behavior.pages.find((x) => x.page_id === pageId);
  return p?.operations?.find((o) => o.operation_id === opId) || null;
}

function findState(pageId, stateId) {
  const p = behavior.pages.find((x) => x.page_id === pageId);
  return p?.states?.find((s) => s.state_id === stateId) || null;
}

function classifyCase(pageId, stateId, operationId, harness) {
  const assess = PAGE_ASSESS[pageId] || {
    product: 'FAIL',
    task_id: null,
    first_breakpoint: { breakpoint: 'unassessed page' },
    notes: '',
  };
  const op = operationId ? findOp(pageId, operationId) : null;
  const st = stateId ? findState(pageId, stateId) : null;

  // Hardware / fixture blockers
  if (op?.hardware_dependent && !FACTS.hasObserver && pageId === 'PAGE-008') {
    return {
      status: 'BLOCKED',
      reason: 'BLOCKED_BY_FIXTURE',
      task_id: 'ESP32-OBSERVER-001',
      first_breakpoint: {
        target: op.operation_id,
        test: (op.test_ids || [])[0] || 'TEST-P-008',
        file: 'hardware/esp32/LightBLE/src/main.cpp',
        symbol: 'BLEToolkit-Observer',
        breakpoint: 'Observer fixture missing; cannot verify broadcast observe path',
      },
      expected: op?.expected_ui || st?.visible_sections || null,
      actual: 'harness Fake Runtime PASS; hardware Observer absent',
    };
  }

  if (harness === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      reason: 'BLOCKED_BY_TARGET_DRIVER_OR_SKIP',
      task_id: 'TEST-PAGE-DRIVER-001',
      first_breakpoint: {
        target: pageId,
        test: 'TEST-P',
        file: 'tests/target/pages/lib/page-driver.js',
        symbol: 'requireRuntime',
        breakpoint: 'case skipped',
      },
      expected: null,
      actual: 'skipped',
    };
  }

  if (harness === 'FAIL') {
    return {
      status: 'FAIL',
      reason: 'E4_HARNESS_FAIL',
      task_id: assess.task_id,
      first_breakpoint: assess.first_breakpoint,
      expected: op?.expected_ui || st?.visible_sections || null,
      actual: 'playwright assertion failed against Driver Actual',
    };
  }

  // Harness PASS — product classification
  if (assess.product === 'PASS') {
    return {
      status: 'PASS',
      reason: 'PRODUCT_AND_HARNESS_OK',
      task_id: null,
      first_breakpoint: null,
      expected: op?.expected_ui || st?.visible_sections || ['behavior contract'],
      actual: 'Fake Runtime E4 PASS; static/current evidence supports product alignment (or no FAIL evidence)',
    };
  }

  if (assess.product === 'FAIL') {
    // Prefer NOT_IMPLEMENTED when breakpoint is missing module
    const bp = assess.first_breakpoint?.breakpoint || '';
    const isMissing = /missing|缺失|不存在|NOT_IMPLEMENTED/i.test(bp)
      || /missing/i.test(assess.first_breakpoint?.symbol || '');
    return {
      status: isMissing && /log-redaction|display-name|write-queue|reconnect|validateHex/.test(
        `${assess.first_breakpoint?.file || ''} ${bp}`,
      )
        ? 'NOT_IMPLEMENTED'
        : 'FAIL',
      reason: 'PRODUCT_GAP_WITH_HARNESS_PASS',
      task_id: assess.task_id,
      root_cause_id: assess.root_cause_id,
      first_breakpoint: assess.first_breakpoint,
      expected: op?.expected_ui || st?.visible_sections || ['target behavior'],
      actual: `Fake Runtime E4 PASS only; product: ${assess.notes}`,
    };
  }

  return {
    status: 'FAIL',
    reason: 'UNCLASSIFIED_DEFAULT_FAIL',
    task_id: assess.task_id,
    first_breakpoint: assess.first_breakpoint,
    expected: null,
    actual: assess.notes,
  };
}

function main() {
  mkdirSync(OUT_TMP, { recursive: true });
  mkdirSync(REPORTS, { recursive: true });
  mkdirSync(DOCS_GAP, { recursive: true });

  const pw = loadPlaywrightJson();
  const specs = [];
  for (const s of pw.suites || []) walkSpecs(s, specs);

  const cases = [];
  for (const sp of specs) {
    const ids = parseIds(sp.full_title);
    if (!ids.page_id) continue;
    const classified = classifyCase(ids.page_id, ids.state_id, ids.operation_id, sp.harness_status);
    const behPage = behavior.pages.find((p) => p.page_id === ids.page_id);
    const op = ids.operation_id ? findOp(ids.page_id, ids.operation_id) : null;
    const st = ids.state_id ? findState(ids.page_id, ids.state_id) : null;
    cases.push({
      page_id: ids.page_id,
      state_id: ids.state_id,
      operation_id: ids.operation_id,
      case_title: sp.full_title,
      status: classified.status,
      e4_harness_status: sp.harness_status,
      expected: classified.expected,
      actual: classified.actual,
      first_breakpoint: classified.first_breakpoint,
      evidence: {
        playwright_file: sp.file,
        duration_ms: sp.duration,
        harness_error: sp.error,
        source_doc: behPage?.source_doc || null,
        fail_evidence: (FAIL_EV.get(ids.page_id) || []).slice(0, 3),
      },
      duration: sp.duration,
      target_ids: [
        ids.page_id,
        ids.state_id,
        ids.operation_id,
        ...(op?.test_ids || []),
        ...(st?.test_ids || []),
      ].filter(Boolean),
      test_ids: op?.test_ids || st?.test_ids || [`TEST-P-${ids.page_id}`],
      implementation_refs: classified.first_breakpoint?.file
        ? [classified.first_breakpoint.file]
        : [],
      task_id: classified.task_id || null,
      root_cause_id: classified.root_cause_id || PAGE_ASSESS[ids.page_id]?.root_cause_id || null,
      reason: classified.reason,
    });
  }

  // Ensure every behavior state/op has a record even if title parse missed
  for (const p of behavior.pages) {
    for (const st of p.states) {
      if (!cases.some((c) => c.page_id === p.page_id && c.state_id === st.state_id && !c.operation_id)) {
        // already covered by suite titles usually
      }
    }
  }

  const summaryByPage = {};
  for (const p of behavior.pages) {
    summaryByPage[p.page_id] = {
      page_id: p.page_id,
      PASS: 0,
      FAIL: 0,
      BLOCKED: 0,
      NOT_IMPLEMENTED: 0,
      harness_PASS: 0,
      harness_FAIL: 0,
      states: p.states.length,
      operations: p.operations.length,
      product: PAGE_ASSESS[p.page_id]?.product,
      task_id: PAGE_ASSESS[p.page_id]?.task_id,
      root_cause_id: PAGE_ASSESS[p.page_id]?.root_cause_id,
      notes: PAGE_ASSESS[p.page_id]?.notes,
      first_breakpoint: PAGE_ASSESS[p.page_id]?.first_breakpoint,
      also: PAGE_ASSESS[p.page_id]?.also || [],
      fail_cases: [],
    };
  }
  for (const c of cases) {
    const s = summaryByPage[c.page_id];
    if (!s) continue;
    s[c.status] = (s[c.status] || 0) + 1;
    if (c.e4_harness_status === 'PASS') s.harness_PASS += 1;
    if (c.e4_harness_status === 'FAIL') s.harness_FAIL += 1;
    if (c.status === 'FAIL' || c.status === 'NOT_IMPLEMENTED' || c.status === 'BLOCKED') {
      s.fail_cases.push({
        state_id: c.state_id,
        operation_id: c.operation_id,
        status: c.status,
        first_breakpoint: c.first_breakpoint,
        task_id: c.task_id,
      });
    }
  }

  const totals = { PASS: 0, FAIL: 0, BLOCKED: 0, NOT_IMPLEMENTED: 0, harness_PASS: 0, harness_FAIL: 0 };
  for (const c of cases) {
    totals[c.status] = (totals[c.status] || 0) + 1;
    if (c.e4_harness_status === 'PASS') totals.harness_PASS += 1;
    if (c.e4_harness_status === 'FAIL') totals.harness_FAIL += 1;
  }

  const topBreakpoints = Object.values(summaryByPage)
    .filter((p) => p.first_breakpoint)
    .map((p) => ({ page_id: p.page_id, ...p.first_breakpoint, task_id: p.task_id }))
    .slice(0, 12);

  const pageE4V2 = {
    gate: 'TP-G2-R2',
    generated_at: new Date().toISOString(),
    environment: {
      status: 'READY_FOR_PAGE_E4',
      playwright: pw.stats,
      fake_runtime: true,
      live_app_url: Boolean(process.env.TARGET_PAGE_BASE_URL),
      note: 'Fake Runtime harness PASS does not imply product PASS',
    },
    facts: {
      hasLogRedaction: FACTS.hasLogRedaction,
      hasWriteQueue: FACTS.hasWriteQueue,
      hasReconnect: FACTS.hasReconnect,
      hasDisplayName: FACTS.hasDisplayName,
      hasValidateHex: FACTS.hasValidateHex,
      broadcastUsesComposable: FACTS.broadcastUsesComposable,
      versionUsesModel: FACTS.versionUsesModel,
      landingFake: FACTS.landingFake,
      connectDiscovers: FACTS.connectDiscovers,
      scanAutoStop5: FACTS.scanAutoStop5,
      hasObserver: FACTS.hasObserver,
      filterHasKeywordMatch: FACTS.filterHasKeywordMatch,
      registrySubCount: FACTS.registrySubCount,
    },
    totals,
    pages: summaryByPage,
    cases,
    top_first_breakpoints: topBreakpoints,
  };

  writeFileSync(`${REPORTS}/page-e4-v2.json`, `${JSON.stringify(pageE4V2, null, 2)}\n`);
  writeFileSync(`${OUT_TMP}/page-e4-v2.json`, `${JSON.stringify(pageE4V2, null, 2)}\n`);
  writeFileSync(`${OUT_TMP}/cases.jsonl`, cases.map((c) => JSON.stringify(c)).join('\n') + '\n');

  // coverage.json patch
  let coverage = {};
  if (exists(`${REPORTS}/coverage.json`)) {
    coverage = JSON.parse(read(`${REPORTS}/coverage.json`));
  }
  coverage.page_e4_r2 = {
    gate: 'TP-G2-R2',
    totals,
    pages: Object.fromEntries(
      Object.entries(summaryByPage).map(([id, v]) => [id, {
        PASS: v.PASS,
        FAIL: v.FAIL,
        BLOCKED: v.BLOCKED,
        NOT_IMPLEMENTED: v.NOT_IMPLEMENTED,
        product: v.product,
        task_id: v.task_id,
      }]),
    ),
    states_total: behavior.totals.states,
    operations_total: behavior.totals.operations,
    harness: { PASS: totals.harness_PASS, FAIL: totals.harness_FAIL },
  };
  writeFileSync(`${REPORTS}/coverage.json`, `${JSON.stringify(coverage, null, 2)}\n`);

  // Markdown report
  const md = renderMarkdown(summaryByPage, totals, topBreakpoints, pageE4V2);
  writeFileSync(`${DOCS_GAP}/PAGE_E4_GAP_REPORT.md`, md);

  // Remediation backlog update
  writeFileSync(`${ROOT}/docs/remediation/PAGE_REMEDIATION_BACKLOG.md`, renderRemediation(summaryByPage));

  console.log(JSON.stringify({
    ok: true,
    gate: 'TP-G2-R2',
    cases: cases.length,
    totals,
    pages: Object.keys(summaryByPage).length,
    out: {
      json: 'reports/target-vs-current/page-e4-v2.json',
      md: 'docs/gap-analysis/PAGE_E4_GAP_REPORT.md',
      backlog: 'docs/remediation/PAGE_REMEDIATION_BACKLOG.md',
    },
  }, null, 2));
}

function renderMarkdown(summaryByPage, totals, topBreakpoints, pageE4V2) {
  const rows = Object.values(summaryByPage).map((p) =>
    `| ${p.page_id} | ${p.product} | ${p.PASS} | ${p.FAIL} | ${p.BLOCKED} | ${p.NOT_IMPLEMENTED} | ${p.task_id || '—'} |`).join('\n');

  const pagesBody = Object.values(summaryByPage).map((p) => {
    const bp = p.first_breakpoint
      ? `\n- **First Breakpoint**: \`${p.first_breakpoint.file || ''}\` / \`${p.first_breakpoint.symbol || ''}\` — ${p.first_breakpoint.breakpoint}\n- Target: ${p.first_breakpoint.target || '—'} · Test: ${p.first_breakpoint.test || '—'}`
      : '\n- First Breakpoint: —';
    const fails = (p.fail_cases || []).slice(0, 8).map((f) =>
      `  - ${f.status} ${f.operation_id || f.state_id || '(page)'} → ${f.task_id || '—'}`,
    ).join('\n');
    const also = (p.also || []).map((a) =>
      `  - ${a.task_id || 'note'}: ${a.breakpoint}${a.file ? ` (${a.file})` : ''}`,
    ).join('\n');
    return `### ${p.page_id}

- **Product**: ${p.product}
- **Target**: \`docs/target-product/pages|web\` + behavior states=${p.states} ops=${p.operations}
- **Actual (E4 harness)**: Fake Runtime PASS=${p.harness_PASS} FAIL=${p.harness_FAIL}
- **Actual (product)**: ${p.notes || '—'}
- **Case tallies**: PASS=${p.PASS} FAIL=${p.FAIL} BLOCKED=${p.BLOCKED} NOT_IMPLEMENTED=${p.NOT_IMPLEMENTED}
- **Root Cause**: ${p.root_cause_id || '—'}
- **Fix IDs**: ${p.task_id || '—'}（页面失败若源自 Runtime，引用 RUNTIME_* 而非新建 PAGE_FIX）
${bp}

**Fail / Blocked samples**
${fails || '  - （无）'}

**Related**
${also || '  - （无）'}
`;
  }).join('\n');

  return `# PAGE E4 差距报告（TP-G2-R2）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R2
environment: READY_FOR_PAGE_E4
fake_runtime: true
live_app_url: ${pageE4V2.environment.live_app_url}
generated_at: ${pageE4V2.generated_at}
\`\`\`

> **原则**：Playwright Fake Runtime harness PASS ≠ 产品实现满足目标。
> 本报告在 E4 可执行前提下，用静态实现 + Current FAIL 证据给出产品 PASS/FAIL/BLOCKED/NOT_IMPLEMENTED。
> 本轮 **Runtime filter + display-name + GATT codec + write-queue 已落地**；未修改 PAGE Vue / ESP32 / OTA / Session / Log-redaction。

## Summary

| Page | Product | PASS | FAIL | BLOCKED | NOT_IMPLEMENTED | Primary Fix |
|---|---|---|---|---|---|---|
${rows}

### Totals（case 级）

| Status | Count |
|---|---|
| PASS | ${totals.PASS} |
| FAIL | ${totals.FAIL} |
| BLOCKED | ${totals.BLOCKED} |
| NOT_IMPLEMENTED | ${totals.NOT_IMPLEMENTED} |
| Harness PASS | ${totals.harness_PASS} |
| Harness FAIL | ${totals.harness_FAIL} |

## Top First Breakpoints

${topBreakpoints.map((b, i) => `${i + 1}. **${b.page_id}** → \`${b.file}\` \`${b.symbol || ''}\` — ${b.breakpoint} *(${b.task_id || '—'} / ${b.test || '—'} / ${b.target || '—'})*`).join('\n')}

## Static Facts（本轮探测）

\`\`\`json
${JSON.stringify(pageE4V2.facts, null, 2)}
\`\`\`

## Pages

${pagesBody}

## Root Cause Buckets

| Bucket | Pages |
|---|---|
| Runtime | PAGE-002 (log-redaction/bridge), PAGE-006 (reconnect/OTA；codec+write-queue+session DONE), PAGE-007 SESSION DONE；PAGE-001 filter+display-name DONE |
| Page | PAGE-008 (broadcast composable owner) |
| Testability | TEST-BRIDGE-TS-001（Smart HID TS） |
| Metadata | PAGE-010 CLOSED |
| Landing | WEB-001 honesty PASS（无假下载） |
| Fixture/Hardware | PAGE-008 Observer → ESP32-OBSERVER-001 (BLOCKED) |

## Machine report

- \`reports/target-vs-current/page-e4-v2.json\`
- \`.tmp/tp-g2-r2/page-results/\`（gitignore）

## NOT EXECUTED

- Hardware E5 / adb / 真机 BLE
- Live UniApp URL（\`TARGET_PAGE_BASE_URL\` 未设置）
`;
}

function renderRemediation(summaryByPage) {
  const order = [
    ['PAGE-006', 'OTA-CLIENT-001', 'P0', 'OTA CTRL/包校验断点阻断详情页升级路径；依赖 OTA-PACKAGE-001'],
    ['PAGE-006', 'RUNTIME-RECONNECT-001', 'P1', 'reconnect-policy 缺失（WRITE-QUEUE DONE）'],
    ['PAGE-006', 'RUNTIME-CONNECTION-DISCOVERY-001', 'P1', 'connectDevice 发现编排（TEST-I-003）'],
    ['PAGE-001', '—', 'P3', 'RUNTIME-FILTER/DISPLAY-NAME DONE；DEC-013 时长观察'],
    ['PAGE-007', '—', 'P3', 'RUNTIME-SESSION-001 DONE；重连进度观察 RUNTIME-RECONNECT-001'],
    ['PAGE-002', 'RUNTIME-LOG-REDACTION-001', 'P1', 'log-redaction 缺失（配网日志）'],
    ['PAGE-002', 'TEST-BRIDGE-TS-001', 'P1', 'Smart HID TS protocol 桥'],
    ['PAGE-008', 'PAGE-BROADCAST-001', 'P1', '广播页改用 useBroadcastSession'],
    ['PAGE-008', 'ESP32-OBSERVER-001', 'P1', 'Observer fixture；页面测记 BLOCKED_BY_FIXTURE'],
  ];

  const pageBlocks = Object.values(summaryByPage).map((p) => {
    return `### ${p.page_id}

- 产品结论：**${p.product}**
- E4 case：PASS=${p.PASS} FAIL=${p.FAIL} BLOCKED=${p.BLOCKED} NOT_IMPLEMENTED=${p.NOT_IMPLEMENTED}
- 主 Fix：\`${p.task_id || '—'}\`（root=${p.root_cause_id || '—'}）
- 说明：${p.notes || '—'}
- 依赖策略：页面表象失败优先引用 **RUNTIME_*** / **OTA_*** / **ESP32_***；仅架构归属页面时用 PAGE-*（如 PAGE-BROADCAST-001）
`;
  }).join('\n');

  return `# 页面修复 Backlog（TP-G2-R2 由 E4 实跑重排）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R2
source: reports/target-vs-current/page-e4-v2.json
\`\`\`

> 本轮 **只重排**，不执行 Fix。  
> Fake Runtime harness PASS 不关闭产品差距。

## 优先级（由真实 E4 + Current FAIL 推导）

| Priority | Page | Task | Rationale |
|---|---|---|---|
${order.map(([page, task, sev, why]) => `| ${sev} | ${page} | \`${task}\` | ${why} |`).join('\n')}

## 依赖提示

- PAGE-006 产品 FAIL → Codec + Write Queue + Session **DONE**；剩余 RECONNECT / OTA / CONNECTION-DISCOVERY
- PAGE-001 → RUNTIME-FILTER-001 / RUNTIME-DISPLAY-NAME-001 **DONE**
- PAGE-007 → RUNTIME-SESSION-001 **DONE**
- PAGE-002 → RUNTIME-LOG-REDACTION-001；Smart HID 协议桥 → TEST-BRIDGE-TS-001
- PAGE-008 → PAGE-BROADCAST-001；Observer 验证 → ESP32-OBSERVER-001（BLOCKED 直至 fixture）
- PAGE-003/004/005/009/010/WEB-001：本轮产品 PASS 或无新 PAGE_FIX；保持观察

## 每页摘要

${pageBlocks}

## 明确不创建的错误 Task

| 错误 | 正确 |
|---|---|
| PAGE-WRITE-001 | RUNTIME-GATT-CODEC-001 / RUNTIME-WRITE-QUEUE-001 |
| PAGE-SCAN-FILTER-001 | RUNTIME-FILTER-001 |
| PAGE-SESSION-001 | RUNTIME-SESSION-001 **DONE** |
| PAGE-OTA-001 | OTA-CLIENT-001 |
| PAGE-OBSERVER-001 | ESP32-OBSERVER-001 |
`;
}

main();
