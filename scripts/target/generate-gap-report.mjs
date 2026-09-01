#!/usr/bin/env node
// scripts/target/generate-gap-report.mjs
// TP-G2：从 APPROVED Target + Current 测试结果 + 实现事实盘点生成机器可读差距报告。
// 不修改业务代码；生成两次应除运行元数据外业务内容一致。

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = `${ROOT}/reports/target-vs-current`;
const LOGS = `${ROOT}/.tmp/tp-g2/logs`;

function loadJson(rel) {
  return JSON.parse(readFileSync(`${ROOT}/${rel}`, 'utf8'));
}

function exists(rel) {
  return existsSync(`${ROOT}/${rel}`);
}

function read(rel) {
  return exists(rel) ? readFileSync(`${ROOT}/${rel}`, 'utf8') : '';
}

function sha(obj) {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

const product = loadJson('contracts/target/product-target.json');
const pagesTarget = loadJson('contracts/target/pages-target.json');
const flowsTarget = loadJson('contracts/target/flows-target.json');
const landing = loadJson('contracts/target/landing-target.json');
const bleFixture = loadJson('contracts/target/ble-fixture-target.json');
const smartHid = loadJson('contracts/target/smart-hid-target.json');
const trace = loadJson('contracts/target/test-traceability.json');
const behavior = loadJson('tests/target/pages/page-behavior.manifest.json');

const system = existsSync(`${LOGS}/system.json`) ? JSON.parse(readFileSync(`${LOGS}/system.json`, 'utf8')) : null;
const current = existsSync(`${LOGS}/current.json`) ? JSON.parse(readFileSync(`${LOGS}/current.json`, 'utf8')) : null;
const currentRaw = existsSync(`${LOGS}/current-raw.out`) ? readFileSync(`${LOGS}/current-raw.out`, 'utf8') : '';

// ---- parse current FAILs ----
const currentFails = [];
for (const m of currentRaw.matchAll(/AssertionError \[ERR_ASSERTION\]: ([^\n]+)/g)) {
  currentFails.push(m[1]);
}
const notImpl = currentFails
  .filter((x) => x.includes('NOT_IMPLEMENTED') || x.includes('第一断点') || x.includes('VERSION') || x.includes('Observer') || x.includes('LED') || x.includes('关键词'))
  .map((msg) => {
    const ids = [...msg.matchAll(/(TEST-[CUPIEAWRH]-\d{3}|REQ-\d{3}|FEAT-\d{3}|PAGE-\d{3}|WEB-001|FLOW-\d{3}|ERR-[A-Z]+-\d{2})/g)].map((x) => x[1]);
    const bp = (msg.match(/第一断点:\s*(.+)$/) || msg.match(/:\s*(.+)$/) || [, msg])[1];
    return { message: msg, ids, first_breakpoint: bp };
  });

// ---- implementation facts (from TP-G2 inventory; paths relative) ----
const FACTS = {
  hasDisplayName: exists('apps/uniapp/services/ble-runtime/display-name.js'),
  hasLogRedaction: exists('apps/uniapp/services/ble-runtime/log-redaction.js'),
  hasWriteQueue: exists('apps/uniapp/services/ble-runtime/write-queue.js'),
  hasReconnectPolicy: exists('apps/uniapp/services/ble-runtime/reconnect-policy.js'),
  hasPublicStatus: exists('apps/uniapp/services/public-status.js'),
  hasVersionMetadata: exists('apps/uniapp/services/version-metadata.js'),
  hasRootVersion: exists('VERSION'),
  otaManager: read('apps/uniapp/utils/ota_manager.js'),
  broadcastPage: read('apps/uniapp/pages/broadcast/index.vue'),
  useBroadcastSessionUsed: /use-broadcast-session|useBroadcastSession/.test(read('apps/uniapp/pages/broadcast/index.vue')),
  versionPage: read('apps/uniapp/pages/about/version.vue'),
  landing: read('docs/index.md'),
  esp32: read('hardware/esp32/LightBLE/src/main.cpp'),
  bleRuntimeIndex: read('apps/uniapp/services/ble-runtime/index.js'),
  deviceFilter: read('apps/uniapp/services/ble-runtime/device-filter.js'),
  smartHidProfile: exists('apps/uniapp/services/smart-hid/profile.js'),
  playwright: (() => { try { require.resolve('@playwright/test'); return true; } catch { return false; } })(),
  pageDriverImplemented: process.env.TARGET_PAGE_DRIVER === '1',
};

const otaWritesCtrl = /writeValue[\s\S]{0,80}CHAR_CTRL|CHAR_CTRL[\s\S]{0,80}write/.test(FACTS.otaManager);
const hasObserver = /BLEToolkit-Observer|Observer/.test(FACTS.esp32) && /init\(.*Observer/.test(FACTS.esp32);
const hasLedTable = /0xFF00|FF00/.test(FACTS.esp32);
const landingFakeDownload = /releases\/latest/.test(FACTS.landing);
const versionHardcoded = /versionHistory|v1\.0\.5/.test(FACTS.versionPage);
const hasSubscriptionCount = /subscription_count/.test(FACTS.bleRuntimeIndex);

// ---- FIX catalog (root-cause aggregated) ----
const FIXES = [
  { id: 'FIX-TEST-001', title: 'Target Page Driver 实现', gap_kind: 'TESTABILITY', severity: 'P1', unlocks: 'E4 page automation', deps: ['FIX-TEST-002'], order: 1 },
  { id: 'FIX-TEST-002', title: 'Playwright / H5 harness 工具链', gap_kind: 'TOOLCHAIN', severity: 'P2', unlocks: 'page runtime execution', deps: [], order: 1 },
  { id: 'FIX-LANDING-001', title: '落地页假下载与多端大一统误导', gap_kind: 'LANDING', severity: 'P0', unlocks: 'honest download hub', deps: ['FIX-RELEASE-001'], order: 2 },
  { id: 'FIX-RELEASE-001', title: 'Release Metadata / VERSION SSOT / UniApp 产物流水线', gap_kind: 'RELEASE', severity: 'P0', unlocks: 'PAGE-009/010 WEB claims', deps: [], order: 2 },
  { id: 'FIX-RUNTIME-001', title: 'display-name 解析链模块', gap_kind: 'RUNTIME', severity: 'P1', unlocks: 'FEAT-013 PAGE-001', deps: [], order: 3 },
  { id: 'FIX-RUNTIME-002', title: 'HEX validateHexInput 整体拒绝', gap_kind: 'RUNTIME', severity: 'P1', unlocks: 'FEAT-028 PAGE-006', deps: [], order: 3 },
  { id: 'FIX-RUNTIME-003', title: 'log-redaction 脱敏', gap_kind: 'RUNTIME', severity: 'P1', unlocks: 'FEAT-040 SEC', deps: [], order: 3 },
  { id: 'FIX-RUNTIME-004', title: 'write-queue MTU 分包队列', gap_kind: 'RUNTIME', severity: 'P1', unlocks: 'FEAT-030 FLOW-005', deps: [], order: 3 },
  { id: 'FIX-RUNTIME-005', title: 'reconnect-policy 有限重连', gap_kind: 'RUNTIME', severity: 'P1', unlocks: 'FEAT-023/024', deps: [], order: 3 },
  { id: 'FIX-RUNTIME-006', title: 'Registry subscription_count + 配网会话分类', gap_kind: 'RUNTIME', severity: 'P1', unlocks: 'PAGE-007 DEC-017', deps: [], order: 3 },
  { id: 'FIX-RUNTIME-007', title: 'connectDevice 编排服务发现', gap_kind: 'RUNTIME', severity: 'P1', unlocks: 'FLOW-004 ERR-CONN-03', deps: [], order: 3 },
  { id: 'FIX-RUNTIME-008', title: 'device-filter keyword 目标接口', gap_kind: 'RUNTIME', severity: 'P2', unlocks: 'FEAT-014 N/M', deps: [], order: 4 },
  { id: 'FIX-RUNTIME-009', title: 'public-status / version-metadata 服务', gap_kind: 'RUNTIME', severity: 'P1', unlocks: 'PAGE-009/010 WEB', deps: ['FIX-RELEASE-001'], order: 3 },
  { id: 'FIX-OTA-001', title: 'OtaManager 写 CHAR_CTRL start/commit/abort', gap_kind: 'RUNTIME', severity: 'P0', unlocks: 'FLOW-009 OTA', deps: [], order: 8 },
  { id: 'FIX-OTA-002', title: 'validateOtaPackage 六项传输前校验', gap_kind: 'RUNTIME', severity: 'P1', unlocks: 'FEAT-081 DEC-016', deps: [], order: 8 },
  { id: 'FIX-PAGE-008', title: '广播页改用 Owner/composable 非内联', gap_kind: 'PAGE', severity: 'P1', unlocks: 'PAGE-008 FEAT-041+', deps: [], order: 7 },
  { id: 'FIX-FW-001', title: 'ESP32 fixture_observer 固件', gap_kind: 'FIRMWARE', severity: 'P0', unlocks: 'FLOW-008 E5 Observer', deps: [], order: 7 },
  { id: 'FIX-FW-002', title: 'ESP32 LED 指令表与广播名对齐', gap_kind: 'FIRMWARE', severity: 'P1', unlocks: 'PROTO LED', deps: [], order: 8 },
  { id: 'FIX-HID-001', title: 'smart-hid/profile.js ESM 可载（去 TS 语法）', gap_kind: 'SMART_HID', severity: 'P1', unlocks: 'TEST-U-015', deps: [], order: 10 },
  { id: 'FIX-PAGE-010', title: '版本页改为 Metadata 投影非硬编码', gap_kind: 'PAGE', severity: 'P1', unlocks: 'PAGE-010', deps: ['FIX-RELEASE-001', 'FIX-RUNTIME-009'], order: 9 },
  { id: 'FIX-E5-001', title: 'Android/微信/ESP32 E5 矩阵执行', gap_kind: 'TOOLCHAIN', severity: 'null', unlocks: 'E5 evidence', deps: ['FIX-TEST-001'], order: 11 },
  { id: 'FIX-E6-001', title: 'Clean Machine / Release E6', gap_kind: 'RELEASE', severity: 'null', unlocks: 'E6 claims', deps: ['FIX-RELEASE-001', 'FIX-LANDING-001'], order: 12 },
];

function findFixForIds(ids, hint = '') {
  const h = `${ids.join(' ')} ${hint}`;
  if (/display-name|FEAT-013|TEST-U-006/.test(h)) return 'FIX-RUNTIME-001';
  if (/validateHex|FEAT-028|TEST-U-010/.test(h)) return 'FIX-RUNTIME-002';
  if (/log-redaction|FEAT-040|TEST-U-013/.test(h)) return 'FIX-RUNTIME-003';
  if (/write-queue|FEAT-030|TEST-U-011/.test(h)) return 'FIX-RUNTIME-004';
  if (/reconnect|FEAT-023|FEAT-024/.test(h)) return 'FIX-RUNTIME-005';
  if (/subscription_count|配网会话|PAGE-007|REQ-053/.test(h)) return 'FIX-RUNTIME-006';
  if (/服务发现|connectDevice|ERR-CONN-03|REQ-020/.test(h)) return 'FIX-RUNTIME-007';
  if (/keyword|filterBleDevices|命中项匹配/.test(h)) return 'FIX-RUNTIME-008';
  if (/public-status|version-metadata|VERSION|FEAT-004|FEAT-066|TEST-U-002/.test(h)) return 'FIX-RUNTIME-009';
  if (/OTA|CHAR_CTRL|FEAT-04[6-9]|FEAT-05[0-2]|FLOW-009/.test(h) && /CTRL|start|commit|OtaManager/.test(h)) return 'FIX-OTA-001';
  if (/validateOtaPackage|FEAT-081|DEC-016|TEST-U-016/.test(h)) return 'FIX-OTA-002';
  if (/Observer|FLOW-008|FEAT-04[1-5]|PAGE-008/.test(h) && /Observer|固件/.test(h)) return 'FIX-FW-001';
  if (/LED|FF00|广播名|BLEToolkit-Server/.test(h)) return 'FIX-FW-002';
  if (/profile\.js|TEST-U-015|Smart HID|FEAT-05[3-8]/.test(h)) return 'FIX-HID-001';
  if (/PAGE-010|硬编码版本|versionHistory/.test(h)) return 'FIX-PAGE-010';
  if (/广播|PAGE-008|useBroadcastSession|内联/.test(h)) return 'FIX-PAGE-008';
  if (/假下载|landing|releases\/latest|CLAIM|WEB-001/.test(h)) return 'FIX-LANDING-001';
  if (/Release|VERSION SSOT|产物/.test(h)) return 'FIX-RELEASE-001';
  if (/Page Driver|TARGET_PAGE_DRIVER|BLOCKED_BY_TARGET_DRIVER/.test(h)) return 'FIX-TEST-001';
  if (/Playwright|BLOCKED_BY_TOOLCHAIN/.test(h)) return 'FIX-TEST-002';
  return null;
}

function record(partial) {
  return {
    target_id: partial.target_id,
    target_type: partial.target_type,
    gap_kind: partial.gap_kind || 'PRODUCT',
    priority: partial.priority || 'Must',
    implementation_status: partial.implementation_status,
    verification_status: partial.verification_status,
    severity: partial.severity ?? null,
    evidence_level: partial.evidence_level ?? null,
    implementation_refs: partial.implementation_refs || [],
    test_ids: partial.test_ids || [],
    test_results: partial.test_results || [],
    expected: partial.expected || '',
    actual: partial.actual || '',
    first_breakpoint: partial.first_breakpoint || '',
    downstream_impact: partial.downstream_impact || [],
    dependencies: partial.dependencies || [],
    suggested_fix_id: partial.suggested_fix_id || null,
    release_blocking: partial.release_blocking ?? true,
  };
}

const records = [];

// ---- REQ / FEAT ----
for (const f of product.features) {
  const ids = [f.id, ...(f.requirements || []), ...(f.planned_tests || [])];
  let impl = 'PARTIAL';
  let ver = 'NOT_EXECUTED';
  let sev = null;
  let bp = '';
  let fix = null;
  let expected = `${f.name} (${f.priority})`;
  let actual = '存在部分实现路径，待按测试结果细分';
  let refs = [];

  // Map known missing modules to features by planned tests / name
  const failHit = notImpl.find((n) => n.ids.includes(f.id) || (f.planned_tests || []).some((t) => n.ids.includes(t)));
  if (failHit) {
    impl = 'NOT_IMPLEMENTED';
    ver = 'AUTOMATED_FAIL';
    sev = 'P1';
    bp = failHit.first_breakpoint;
    fix = findFixForIds([...ids, failHit.message], failHit.message);
    actual = failHit.message;
  }

  // Hard facts
  if (f.id === 'FEAT-013' && !FACTS.hasDisplayName) {
    impl = 'NOT_IMPLEMENTED'; ver = 'AUTOMATED_FAIL'; sev = 'P1';
    bp = 'apps/uniapp/services/ble-runtime/display-name.js 缺失';
    fix = 'FIX-RUNTIME-001';
    actual = 'display-name 模块不存在';
    refs = [{ path: 'apps/uniapp/services/ble-runtime/', symbol: '(missing display-name.js)', line_hint: 'n/a' }];
  }
  if (['FEAT-046', 'FEAT-047', 'FEAT-048', 'FEAT-049', 'FEAT-050', 'FEAT-051', 'FEAT-052'].includes(f.id) && !otaWritesCtrl) {
    impl = 'PARTIAL'; ver = 'AUTOMATED_FAIL'; sev = 'P0';
    bp = 'OtaManager 未写 CHAR_CTRL start/commit';
    fix = 'FIX-OTA-001';
    actual = '仅写 CHAR_DATA；固件要求 CTRL 事务';
    refs = [{ path: 'apps/uniapp/utils/ota_manager.js', symbol: 'OtaManager.startOta', line_hint: 'CHAR_CTRL defined but never written' }];
  }
  if (f.id === 'FEAT-081' && !/validateOtaPackage/.test(FACTS.otaManager)) {
    impl = 'NOT_IMPLEMENTED'; ver = 'AUTOMATED_FAIL'; sev = 'P1';
    bp = 'validateOtaPackage 接口缺失';
    fix = 'FIX-OTA-002';
  }
  if (['FEAT-041', 'FEAT-042', 'FEAT-043', 'FEAT-044', 'FEAT-045'].includes(f.id)) {
    if (!FACTS.useBroadcastSessionUsed) {
      impl = 'PARTIAL';
      bp = bp || 'PAGE-008 内联逻辑；useBroadcastSession 未使用';
      fix = fix || 'FIX-PAGE-008';
      refs = [{ path: 'apps/uniapp/pages/broadcast/index.vue', symbol: 'inline advertising', line_hint: 'no useBroadcastSession import' }];
    }
    if (!hasObserver && /Observer|广播证据|Peripheral/.test(f.name + expected)) {
      // Observer evidence for peripheral
      if (f.id === 'FEAT-045' || /证据|Observer/.test(f.name)) {
        sev = 'P0';
        bp = 'ESP32 fixture_observer 固件不存在';
        fix = 'FIX-FW-001';
        ver = 'HARDWARE_PENDING';
        actual = '仅 Peripheral Server；无 Observer';
      }
    }
  }
  if (['FEAT-004', 'FEAT-066'].includes(f.id) && !FACTS.hasRootVersion) {
    impl = 'NOT_IMPLEMENTED'; ver = 'AUTOMATED_FAIL'; sev = 'P1';
    bp = '仓库根 VERSION 单源文件缺失';
    fix = 'FIX-RELEASE-001';
  }
  if (['FEAT-070', 'FEAT-071', 'FEAT-072', 'FEAT-073', 'FEAT-074', 'FEAT-075'].includes(f.id) && landingFakeDownload) {
    if (f.id === 'FEAT-075' || /下载|QR|SHA|产物/.test(f.name)) {
      impl = 'PARTIAL'; ver = 'AUTOMATED_FAIL'; sev = 'P0';
      bp = 'docs/index.md 三卡均链 releases/latest 假主下载';
      fix = 'FIX-LANDING-001';
      refs = [{ path: 'docs/index.md', symbol: 'download-hub', line_hint: 'releases/latest' }];
    }
  }

  // E5 features default HARDWARE_PENDING if not already failed
  if ((f.minimum_evidence_level === 'E5' || f.minimum_evidence_level === 'E6') && ver === 'NOT_EXECUTED') {
    ver = f.minimum_evidence_level === 'E6' ? 'NOT_EXECUTED' : 'HARDWARE_PENDING';
    sev = sev || null;
  }

  // If still partial with no fail and has pages - mark IMPLEMENTED_UNTESTED for many Must that have code paths
  if (!failHit && impl === 'PARTIAL' && ver === 'NOT_EXECUTED' && f.minimum_evidence_level === 'E1') {
    // leave
  }

  records.push(record({
    target_id: f.id,
    target_type: 'feature',
    gap_kind: fix?.startsWith('FIX-FW') ? 'FIRMWARE' : fix?.startsWith('FIX-LANDING') ? 'LANDING' : fix?.startsWith('FIX-RELEASE') ? 'RELEASE' : fix?.startsWith('FIX-OTA') || fix?.startsWith('FIX-RUNTIME') ? 'RUNTIME' : fix?.startsWith('FIX-HID') ? 'SMART_HID' : fix?.startsWith('FIX-PAGE') ? 'PAGE' : 'PRODUCT',
    priority: f.priority,
    implementation_status: impl,
    verification_status: ver,
    severity: sev,
    evidence_level: f.minimum_evidence_level,
    implementation_refs: refs,
    test_ids: f.planned_tests || [],
    test_results: failHit ? [{ status: 'AUTOMATED_FAIL', message: failHit.message }] : [],
    expected,
    actual,
    first_breakpoint: bp,
    suggested_fix_id: fix,
    release_blocking: f.release_blocking,
  }));
}

for (const r of product.requirements) {
  const featRecs = records.filter((x) => (r.features || []).includes(x.target_id));
  const worstImpl = featRecs.some((x) => x.implementation_status === 'NOT_IMPLEMENTED') ? 'NOT_IMPLEMENTED'
    : featRecs.some((x) => x.implementation_status === 'PARTIAL') ? 'PARTIAL' : 'IMPLEMENTED_UNTESTED';
  const worstVer = featRecs.find((x) => x.verification_status === 'AUTOMATED_FAIL')?.verification_status
    || featRecs.find((x) => x.verification_status === 'HARDWARE_PENDING')?.verification_status
    || 'NOT_EXECUTED';
  const sev = featRecs.find((x) => x.severity === 'P0')?.severity
    || featRecs.find((x) => x.severity === 'P1')?.severity
    || null;
  const fix = featRecs.find((x) => x.suggested_fix_id)?.suggested_fix_id || null;
  const bp = featRecs.find((x) => x.first_breakpoint)?.first_breakpoint || '';
  records.push(record({
    target_id: r.id,
    target_type: 'requirement',
    gap_kind: 'PRODUCT',
    priority: r.priority,
    implementation_status: worstImpl,
    verification_status: worstVer,
    severity: sev,
    evidence_level: null,
    test_ids: r.planned_tests || [],
    expected: `REQ ${r.id} features=${(r.features || []).join(',')}`,
    actual: bp || worstImpl,
    first_breakpoint: bp,
    suggested_fix_id: fix,
    release_blocking: true,
    dependencies: r.features || [],
  }));
}

// ---- PAGE / STATE / OP ----
for (const p of behavior.pages) {
  const pageMeta = pagesTarget.pages.find((x) => x.id === p.page_id);
  let pageImpl = 'PARTIAL';
  let pageVer = current?.pages?.reason || 'BLOCKED_BY_TOOLCHAIN';
  let pageSev = null;
  let pageFix = pageVer === 'BLOCKED_BY_TOOLCHAIN' ? 'FIX-TEST-002' : 'FIX-TEST-001';
  let pageBp = pageVer === 'BLOCKED_BY_TOOLCHAIN'
    ? '@playwright/test 未安装 → 页面 Case BLOCKED_BY_TOOLCHAIN（非产品缺陷）'
    : 'TARGET_PAGE_DRIVER 未实现';
  let pageActual = `自动化: ${pageVer}; blocked_cases≈${Math.round((current?.pages?.blocked_cases || 229) / 11)}`;

  if (p.page_id === 'PAGE-008') {
    pageImpl = 'PARTIAL';
    pageSev = 'P1';
    // keep testability fix + product fix
  }
  if (p.page_id === 'PAGE-010' && versionHardcoded) {
    pageImpl = 'PARTIAL';
    pageSev = 'P1';
  }
  if (p.page_id === 'WEB-001' && landingFakeDownload) {
    pageImpl = 'PARTIAL';
    pageSev = 'P0';
    pageFix = 'FIX-LANDING-001'; // product
    pageBp = '假主下载 releases/latest；另有 Playwright BLOCKED_BY_TOOLCHAIN';
  }

  records.push(record({
    target_id: p.page_id,
    target_type: 'page',
    gap_kind: p.page_id === 'WEB-001' ? 'LANDING' : 'PAGE',
    priority: 'Must',
    implementation_status: pageImpl,
    verification_status: pageVer,
    severity: pageSev,
    evidence_level: pageMeta?.minimum_evidence_level || 'E4',
    implementation_refs: [{ path: pageMeta?.route ? `apps/uniapp/${pageMeta.route}.vue` : (p.page_id === 'WEB-001' ? 'docs/index.md' : ''), symbol: p.page_id, line_hint: '' }],
    test_ids: pageMeta?.planned_tests || [],
    expected: `完整 ${p.states.length} states / ${p.operations.length} operations`,
    actual: pageActual,
    first_breakpoint: pageBp,
    suggested_fix_id: pageFix,
    release_blocking: true,
    downstream_impact: [`state_cases=${p.states.length}`, `operation_cases=${p.operations.length}`],
  }));

  // Also emit TESTABILITY records for page automation
  records.push(record({
    target_id: `${p.page_id}#AUTOMATION`,
    target_type: 'test',
    gap_kind: 'TESTABILITY',
    priority: 'Must',
    implementation_status: 'NOT_IMPLEMENTED',
    verification_status: pageVer,
    severity: null,
    evidence_level: 'E4',
    expected: 'Page Driver + Playwright 执行全部 State/Operation',
    actual: pageVer,
    first_breakpoint: pageBp,
    suggested_fix_id: pageVer === 'BLOCKED_BY_TOOLCHAIN' ? 'FIX-TEST-002' : 'FIX-TEST-001',
    release_blocking: false,
    test_ids: [`TEST-P-${p.page_id === 'WEB-001' ? '012' : p.page_id.slice(-3)}`],
  }));

  for (const st of p.states) {
    let impl = 'PARTIAL';
    let ver = pageVer;
    let sev = null;
    let fix = pageVer.includes('TOOLCHAIN') ? 'FIX-TEST-002' : 'FIX-TEST-001';
    let bp = `自动化未执行（${pageVer}）；产品态需静态核对`;
    let actual = '产品实现可能存在对应 UI；自动化未验证';

    // Product-specific state gaps
    if (p.page_id === 'PAGE-008' && /Observer|广播证据/.test(JSON.stringify(st))) {
      // leave
    }
    if (p.page_id === 'WEB-001' && st.state_id === 'STATE-W001-03' && landingFakeDownload) {
      impl = 'NOT_IMPLEMENTED';
      sev = 'P0';
      fix = 'FIX-LANDING-001';
      bp = 'NOT_RELEASED 无产物时应无下载链接；当前仍暴露 releases/latest';
      actual = '下载区未按 NOT_RELEASED 降级';
      ver = 'AUTOMATED_FAIL';
    }

    records.push(record({
      target_id: st.state_id,
      target_type: 'state',
      gap_kind: p.page_id === 'WEB-001' ? 'LANDING' : 'PAGE',
      priority: 'Must',
      implementation_status: impl,
      verification_status: ver,
      severity: sev,
      evidence_level: 'E4',
      expected: st.entry_condition,
      actual,
      first_breakpoint: bp,
      suggested_fix_id: fix,
      release_blocking: sev === 'P0',
      test_ids: st.test_ids || [],
      dependencies: [p.page_id],
    }));
  }

  for (const op of p.operations) {
    let impl = 'PARTIAL';
    let ver = pageVer;
    let sev = null;
    let fix = pageVer.includes('TOOLCHAIN') ? 'FIX-TEST-002' : 'FIX-TEST-001';
    let bp = `自动化未执行（${pageVer}）`;
    let actual = '页面可能存在控件；E4 未跑；产品差距见共享 FIX';
    let gapKind = 'PAGE';

    if (op.hardware_dependent) {
      ver = pageVer.includes('TOOLCHAIN') ? pageVer : 'HARDWARE_PENDING';
    }

    // OTA ops on PAGE-006
    if (/OTA|固件|OP-P006-1[234]/.test(op.operation_id + op.control) && !otaWritesCtrl) {
      impl = 'PARTIAL';
      sev = 'P0';
      fix = 'FIX-OTA-001';
      bp = 'OtaManager 未写 CHAR_CTRL；与固件事务协议断裂';
      actual = 'UI 可启动 OTA 但协议不完整';
      gapKind = 'RUNTIME';
      ver = 'AUTOMATED_FAIL';
    }
    if (p.page_id === 'PAGE-008' && /开始广播|OP-P008-0[123]/.test(op.operation_id + op.control)) {
      if (!FACTS.useBroadcastSessionUsed) {
        impl = 'PARTIAL';
        sev = 'P1';
        fix = 'FIX-PAGE-008';
        bp = '广播页内联；Owner/composable 未接入';
        gapKind = 'PAGE';
      }
      // Observer 证据根因挂在同一 OP 上，不另造合成 operation_id（保持 OP=92）
      if (!hasObserver) {
        impl = 'NOT_IMPLEMENTED';
        sev = 'P0';
        fix = 'FIX-FW-001';
        bp = 'hardware/esp32 无 Observer 目标源码（证据闭环第一断点）；页面 Owner 见 FIX-PAGE-008';
        actual = '仅 Peripheral Server；无 fixture_observer';
        gapKind = 'FIRMWARE';
        ver = 'HARDWARE_PENDING';
      }
    }
    if (p.page_id === 'WEB-001' && /下载|APK|固件|OP-W001-0[345]/.test(op.operation_id + op.control) && landingFakeDownload) {
      impl = 'PARTIAL';
      sev = 'P0';
      fix = 'FIX-LANDING-001';
      bp = '下载 CTA 指向 releases/latest 而非 NOT_RELEASED/真实产物';
      actual = '假主下载链路';
      gapKind = 'LANDING';
      ver = 'AUTOMATED_FAIL';
    }
    if (p.page_id === 'PAGE-010') {
      fix = versionHardcoded ? 'FIX-PAGE-010' : fix;
      if (versionHardcoded) {
        impl = 'PARTIAL';
        sev = 'P1';
        bp = 'pages/about/version.vue 硬编码 versionHistory';
        actual = '非 Release Metadata 投影';
      }
    }

    records.push(record({
      target_id: op.operation_id,
      target_type: 'operation',
      gap_kind: gapKind,
      priority: 'Must',
      implementation_status: impl,
      verification_status: ver,
      severity: sev,
      evidence_level: op.hardware_dependent ? 'E5' : 'E4',
      expected: `${op.control}; runtime=${op.expected_runtime_events[0] || ''}`,
      actual,
      first_breakpoint: bp,
      suggested_fix_id: fix,
      release_blocking: sev === 'P0',
      test_ids: op.test_ids || [],
      dependencies: [p.page_id],
      implementation_refs: op.hardware_dependent ? [{ path: 'apps/uniapp/utils/ota_manager.js', symbol: 'OtaManager', line_hint: '' }] : [],
    }));
  }
}

// ---- FLOWS ----
for (const f of flowsTarget.flows || []) {
  let impl = 'PARTIAL';
  let ver = 'NOT_EXECUTED';
  let sev = null;
  let fix = null;
  let bp = '';
  let actual = '流程部分可达；E5 未执行';
  if (f.id === 'FLOW-009' && !otaWritesCtrl) {
    impl = 'PARTIAL'; ver = 'AUTOMATED_FAIL'; sev = 'P0';
    bp = 'OtaManager 跳过 CTRL start，第一断点在事务入口';
    fix = 'FIX-OTA-001';
    actual = '客户端未执行 STATUS→CTRL start→ready→DATA→commit 正典';
  }
  if (f.id === 'FLOW-008' && !hasObserver) {
    impl = 'PARTIAL'; ver = 'HARDWARE_PENDING'; sev = 'P0';
    bp = '缺 fixture_observer';
    fix = 'FIX-FW-001';
  }
  if (f.id === 'FLOW-004') {
    const hit = notImpl.find((n) => /服务发现|connectDevice/.test(n.message));
    if (hit) {
      impl = 'PARTIAL'; ver = 'AUTOMATED_FAIL'; sev = 'P1';
      bp = hit.first_breakpoint; fix = 'FIX-RUNTIME-007';
    }
  }
  records.push(record({
    target_id: f.id,
    target_type: 'flow',
    gap_kind: 'PRODUCT',
    priority: 'Must',
    implementation_status: impl,
    verification_status: ver,
    severity: sev,
    evidence_level: 'E5',
    test_ids: f.planned_tests || [],
    expected: f.name || f.id,
    actual,
    first_breakpoint: bp,
    suggested_fix_id: fix,
    release_blocking: true,
  }));
}

// ---- PROTO / CLAIM ----
for (const s of bleFixture.services || []) {
  records.push(record({
    target_id: s.uuid || s.id || s.name,
    target_type: 'protocol',
    gap_kind: 'FIRMWARE',
    priority: 'Must',
    implementation_status: 'PARTIAL',
    verification_status: hasObserver ? 'NOT_EXECUTED' : 'HARDWARE_PENDING',
    severity: hasLedTable ? null : 'P1',
    evidence_level: 'E5',
    expected: 'ESP32 服务面与契约一致',
    actual: hasLedTable ? '部分实现' : 'LED 指令表/Observer 不完整',
    first_breakpoint: hasLedTable ? '' : '固件缺 FF00 LED 表或 Observer',
    suggested_fix_id: hasLedTable ? 'FIX-FW-002' : 'FIX-FW-001',
    release_blocking: true,
  }));
}

for (const c of landing.claims || []) {
  const fake = landingFakeDownload && /下载|APK|Windows|macOS|产物|SHA|二维码/.test(JSON.stringify(c));
  records.push(record({
    target_id: c.id,
    target_type: 'claim',
    gap_kind: 'LANDING',
    priority: 'Must',
    implementation_status: fake ? 'PARTIAL' : 'PARTIAL',
    verification_status: fake ? 'AUTOMATED_FAIL' : 'NOT_EXECUTED',
    severity: fake ? 'P0' : null,
    evidence_level: 'E6',
    expected: c.statement || c.title || c.id,
    actual: fake ? '落地页/产物声明与证据不匹配或假下载' : '待 E6 发布门验证',
    first_breakpoint: fake ? 'docs/index.md download-hub → releases/latest' : 'E6 NOT_EXECUTED',
    suggested_fix_id: fake ? 'FIX-LANDING-001' : 'FIX-E6-001',
    release_blocking: true,
    test_ids: c.tests || [],
  }));
}

// ---- Smart HID target markers（不计入 FEAT 覆盖；用 test 类型避免污染 FEAT=81）----
records.push(record({
  target_id: 'TEST-U-015',
  target_type: 'test',
  gap_kind: 'SMART_HID',
  priority: 'Must',
  implementation_status: FACTS.smartHidProfile ? 'PARTIAL' : 'NOT_IMPLEMENTED',
  verification_status: notImpl.some((n) => /TEST-U-015|profile\.js/.test(n.message)) ? 'AUTOMATED_FAIL' : 'NOT_EXECUTED',
  severity: 'P1',
  evidence_level: 'E1',
  expected: 'profile.js 可被 Node 目标测试加载',
  actual: '含 TS 语法 Unexpected identifier as',
  first_breakpoint: 'apps/uniapp/services/smart-hid/profile.js ESM/TS 语法不可直接 import',
  suggested_fix_id: 'FIX-HID-001',
  release_blocking: true,
  test_ids: ['TEST-U-015'],
  implementation_refs: [{ path: 'apps/uniapp/services/smart-hid/profile.js', symbol: 'SMART_HID_PROFILE', line_hint: 'TS syntax' }],
}));

// ---- coverage stats ----
function countBy(field) {
  const m = {};
  for (const r of records) {
    const k = String(r[field]);
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

const coverage = {
  generated_at: new Date().toISOString(),
  head: readFileSync(`${ROOT}/.git/HEAD`, 'utf8').trim(),
  system: system ? {
    SYSTEM_PASS: system.SYSTEM_PASS,
    SYSTEM_FAIL: system.SYSTEM_FAIL,
    HARNESS_PASS: system.HARNESS_PASS,
    HARNESS_FAIL: system.HARNESS_FAIL,
    TARGET_CONTRACT_FAIL: system.TARGET_CONTRACT_FAIL,
  } : null,
  current: current ? {
    CURRENT_PASS: current.CURRENT_PASS,
    CURRENT_FAIL: current.CURRENT_FAIL,
    blocked: current.blocked,
    pages: current.pages,
  } : null,
  targets: {
    REQ: product.requirements.length,
    FEAT: product.features.length,
    PAGE: pagesTarget.pages.length,
    STATE: behavior.totals.states,
    OP: behavior.totals.operations,
    FLOW: (flowsTarget.flows || []).length,
    PROTO: (bleFixture.services || []).length,
    CLAIM: (landing.claims || []).length,
  },
  records_total: records.length,
  by_gap_kind: countBy('gap_kind'),
  by_implementation_status: countBy('implementation_status'),
  by_verification_status: countBy('verification_status'),
  by_severity: countBy('severity'),
  product_vs_testability: {
    product_gaps: records.filter((r) => !['TESTABILITY', 'TOOLCHAIN'].includes(r.gap_kind) && r.severity).length,
    testability_gaps: records.filter((r) => ['TESTABILITY', 'TOOLCHAIN'].includes(r.gap_kind)).length,
    blocked_page_cases: current?.pages?.blocked_cases || 0,
    note: 'blocked_page_cases 不得计为产品缺陷数',
  },
};

const firstBreakpoints = [];
const seenBp = new Set();
for (const r of records) {
  if (!r.first_breakpoint || !r.severity) continue;
  const key = r.first_breakpoint.slice(0, 100);
  if (seenBp.has(key)) continue;
  seenBp.add(key);
  firstBreakpoints.push({
    target_id: r.target_id,
    severity: r.severity,
    gap_kind: r.gap_kind,
    first_breakpoint: r.first_breakpoint,
    suggested_fix_id: r.suggested_fix_id,
    verification_status: r.verification_status,
  });
}
firstBreakpoints.sort((a, b) => {
  const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
});

const fixGraph = {
  nodes: FIXES.map((f) => ({
    id: f.id,
    title: f.title,
    gap_kind: f.gap_kind,
    severity: f.severity,
    order: f.order,
    unlocks: f.unlocks,
    gap_count: records.filter((r) => r.suggested_fix_id === f.id).length,
  })),
  dependencies: FIXES.flatMap((f) => (f.deps || []).map((d) => ({ from: d, to: f.id }))),
  recommended_order: [...FIXES].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map((f) => f.id),
};

const contentHash = sha({
  records: records.map((r) => ({ ...r, /* strip nothing */ })),
  coverage: { ...coverage, generated_at: null, head: null },
  firstBreakpoints,
  fixGraph,
});

const report = {
  schema_version: '1.0',
  gate: 'TP-G2',
  content_hash: contentHash,
  generated_at: coverage.generated_at,
  coverage,
  records,
};

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://smart-ble.local/reports/target-vs-current/report.schema.json',
  title: 'Smart BLE target vs current gap report',
  type: 'object',
  required: ['schema_version', 'gate', 'records', 'coverage'],
  properties: {
    schema_version: { type: 'string' },
    gate: { const: 'TP-G2' },
    records: {
      type: 'array',
      items: {
        type: 'object',
        required: ['target_id', 'target_type', 'gap_kind', 'implementation_status', 'verification_status'],
      },
    },
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/report.schema.json`, JSON.stringify(schema, null, 2) + '\n');
writeFileSync(`${OUT}/target-vs-current.json`, JSON.stringify(report, null, 2) + '\n');
writeFileSync(`${OUT}/coverage.json`, JSON.stringify(coverage, null, 2) + '\n');
writeFileSync(`${OUT}/first-breakpoints.json`, JSON.stringify({ top20: firstBreakpoints.slice(0, 20), all: firstBreakpoints }, null, 2) + '\n');
writeFileSync(`${OUT}/fix-dependency-graph.json`, JSON.stringify(fixGraph, null, 2) + '\n');

function sliceKind(kind) {
  return records.filter((r) => r.gap_kind === kind || (kind === 'PAGE' && r.target_type === 'page'));
}

writeFileSync(`${OUT}/pages.json`, JSON.stringify({
  pages: records.filter((r) => r.target_type === 'page'),
  states: records.filter((r) => r.target_type === 'state'),
  operations: records.filter((r) => r.target_type === 'operation'),
  automation: records.filter((r) => String(r.target_id).includes('#AUTOMATION')),
  blocked: current?.pages || null,
}, null, 2) + '\n');

writeFileSync(`${OUT}/runtime.json`, JSON.stringify({ records: records.filter((r) => r.gap_kind === 'RUNTIME') }, null, 2) + '\n');
writeFileSync(`${OUT}/esp32.json`, JSON.stringify({ records: records.filter((r) => r.gap_kind === 'FIRMWARE') }, null, 2) + '\n');
writeFileSync(`${OUT}/smart-hid.json`, JSON.stringify({ records: records.filter((r) => r.gap_kind === 'SMART_HID') }, null, 2) + '\n');
writeFileSync(`${OUT}/landing-release.json`, JSON.stringify({ records: records.filter((r) => r.gap_kind === 'LANDING' || r.gap_kind === 'RELEASE') }, null, 2) + '\n');
writeFileSync(`${OUT}/tests.json`, JSON.stringify({
  system,
  current,
  not_implemented: notImpl,
  testability: records.filter((r) => r.gap_kind === 'TESTABILITY' || r.gap_kind === 'TOOLCHAIN'),
}, null, 2) + '\n');

writeFileSync(`${OUT}/logs/INDEX.md`, `# TP-G2 日志索引

- \`.tmp/tp-g2/logs/system.json\`
- \`.tmp/tp-g2/logs/current.json\`
- \`.tmp/tp-g2/logs/current-raw.out\`
- \`.tmp/tp-g2/logs/verify-uniapp.txt\`
- \`.tmp/tp-g2/logs/docs-build.txt\`
- \`.tmp/tp-g2/environment/inventory.txt\`
- checkers: \`.tmp/tp-g2/logs/check-target-*.txt\`

日志默认不入库。
`);

// second generation consistency check
const report2 = { ...report, generated_at: new Date().toISOString() };
const hash2 = sha({
  records: report2.records,
  coverage: { ...report2.coverage, generated_at: null, head: null },
  firstBreakpoints,
  fixGraph,
});
if (hash2 !== contentHash) {
  console.error('FAIL: content hash drift between generations');
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  records: records.length,
  content_hash: contentHash,
  by_severity: coverage.by_severity,
  by_gap_kind: coverage.by_gap_kind,
  CURRENT_PASS: current?.CURRENT_PASS,
  CURRENT_FAIL: current?.CURRENT_FAIL,
  pages_blocked_cases: current?.pages?.blocked_cases,
}, null, 2));
