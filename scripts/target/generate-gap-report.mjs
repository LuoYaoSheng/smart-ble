#!/usr/bin/env node
/**
 * TP-G2-R1: regenerate machine-readable target-vs-current gap report (schema v2).
 * - Reads structured current.cases from .tmp/tp-g2/logs/current-structured.json
 *   (fallback: current-r3d.json). NEVER parses AssertionError raw text.
 * - Dual independent child processes for content-hash determinism.
 * - Does not modify business / target-product / contracts product semantics.
 */
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync, execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = `${ROOT}/reports/target-vs-current`;
const LOGS = `${ROOT}/.tmp/tp-g2/logs`;
const ARGV = new Set(process.argv.slice(2));
const IS_CHILD = ARGV.has('--child-emit');
const CHILD_OUT = (() => {
  const i = process.argv.indexOf('--out');
  return i >= 0 ? process.argv[i + 1] : OUT;
})();

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
  return createHash('sha256').update(stableStringify(obj)).digest('hex');
}
function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const keys = Object.keys(v).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}
function writeJson(path, obj) {
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`);
}
function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}
function extractIds(text, pattern) {
  return [...new Set((text.match(new RegExp(pattern, 'g')) || []))].sort();
}
function readDoc(rel) {
  return read(rel);
}

// ---------------------------------------------------------------------------
// Load contracts / docs / structured current
// ---------------------------------------------------------------------------
const product = loadJson('contracts/target/product-target.json');
const pagesTarget = loadJson('contracts/target/pages-target.json');
const flowsTarget = loadJson('contracts/target/flows-target.json');
const landing = loadJson('contracts/target/landing-target.json');
const bleFixture = loadJson('contracts/target/ble-fixture-target.json');
const smartHid = loadJson('contracts/target/smart-hid-target.json');
const trace = loadJson('contracts/target/test-traceability.json');
const behavior = loadJson('tests/target/pages/page-behavior.manifest.json');

function loadStructuredCurrent() {
  const candidates = [
    `${LOGS}/current-structured.json`,
    `${LOGS}/current-r3e.json`,
    `${LOGS}/current-r3d.json`,
    `${LOGS}/current-r3c.json`,
    `${LOGS}/current-r3.json`,
  ];
  for (const p of candidates) {
    if (existsSync(p)) return { path: p, data: JSON.parse(readFileSync(p, 'utf8')) };
  }
  return { path: null, data: null };
}
const structured = loadStructuredCurrent();
const rawCurrent = structured.data;
const current = rawCurrent && Array.isArray(rawCurrent.cases)
  ? rawCurrent
  : (rawCurrent?.current && Array.isArray(rawCurrent.current.cases)
    ? {
        ...rawCurrent.current,
        cases: rawCurrent.current.cases,
        CURRENT_PASS: rawCurrent.CURRENT_PASS ?? rawCurrent.current.pass,
        CURRENT_FAIL: rawCurrent.CURRENT_FAIL ?? rawCurrent.current.fail,
        TEST_INFRA_FAIL: rawCurrent.TEST_INFRA_FAIL ?? 0,
        pages: rawCurrent.pages,
        blocked: rawCurrent.blocked,
        first_breakpoints: rawCurrent.first_breakpoints,
      }
    : null);
const system = existsSync(`${LOGS}/system-r3d.json`)
  ? JSON.parse(readFileSync(`${LOGS}/system-r3d.json`, 'utf8'))
  : (existsSync(`${LOGS}/system.json`) ? JSON.parse(readFileSync(`${LOGS}/system.json`, 'utf8')) : null);

if (!current || !Array.isArray(current.cases)) {
  console.error('FAIL: structured current.cases missing; expected .tmp/tp-g2/logs/current-structured.json');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Implementation facts (static inventory; no business code edits)
// ---------------------------------------------------------------------------
const FACTS = {
  hasDisplayName: exists('apps/uniapp/services/ble-runtime/display-name.js'),
  hasLogRedaction: exists('apps/uniapp/services/ble-runtime/log-redaction.js'),
  hasWriteQueue: exists('apps/uniapp/services/ble-runtime/write-queue.js'),
  hasReconnectPolicy: exists('apps/uniapp/services/ble-runtime/reconnect-policy.js'),
  hasReconnectManager: exists('apps/uniapp/services/ble-runtime/reconnect-manager.js'),
  hasPublicStatus: exists('apps/uniapp/services/public-status.js'),
  hasVersionMetadata: exists('apps/uniapp/services/version-metadata.js'),
  hasRootVersion: exists('VERSION'),
  otaManager: read('apps/uniapp/utils/ota_manager.js'),
  broadcastPage: read('apps/uniapp/pages/broadcast/index.vue'),
  versionPage: read('apps/uniapp/pages/about/version.vue'),
  landing: read('docs/index.md'),
  esp32: read('hardware/esp32/LightBLE/src/main.cpp'),
  pio: read('hardware/esp32/LightBLE/platformio.ini'),
  bleRuntimeIndex: read('apps/uniapp/services/ble-runtime/index.js'),
  deviceFilter: read('apps/uniapp/services/ble-runtime/device-filter.js'),
  smartHidProfile: read('apps/uniapp/services/smart-hid/profile.js'),
  releaseWorkflow: read('.github/workflows/release-build.yml'),
  playwright: (() => { try { require.resolve('@playwright/test'); return true; } catch { return false; } })(),
  pageDriverImplemented: process.env.TARGET_PAGE_DRIVER === '1'
    || exists('tests/target/pages/driver/page-driver-runtime.js'),
};
const filterHasKeywordMatch = /opts\.keyword|settings\.keyword|buildDeviceSearchableText|matchesKeyword/.test(FACTS.deviceFilter)
  && /includes\(/.test(FACTS.deviceFilter);

const otaWritesCtrl = /writeValue[\s\S]{0,120}CHAR_CTRL|CHAR_CTRL[\s\S]{0,120}writeValue/.test(FACTS.otaManager);
const hasValidateOta = /validateOtaPackage|validatePackage/.test(FACTS.otaManager);
const hasObserver = /BLEToolkit-Observer/.test(FACTS.esp32);
const hasLedTable = /\bFF00\b|\b0xFF00\b/.test(FACTS.esp32);
const landingFakeDownload = /releases\/latest/.test(FACTS.landing);
const versionSsotReady = FACTS.hasRootVersion
  && FACTS.hasVersionMetadata
  && FACTS.hasPublicStatus
  && exists('release/release-manifest.json')
  && exists('docs/public/release/latest.json');
const versionHardcoded = /\bversionHistory\b/.test(FACTS.versionPage)
  || /['"`]v?1\.0\.\d+['"`]/.test(FACTS.versionPage)
  || !/getVersionPageModel/.test(FACTS.versionPage);
const pageVersionReady = !versionHardcoded && /getVersionPageModel/.test(FACTS.versionPage);
const useBroadcastSession = /useBroadcastSession|use-broadcast-session/.test(FACTS.broadcastPage);
const smartHidImportsTs = /hid-provisioning-protocol\.ts/.test(FACTS.smartHidProfile);
const deviceNameMacro = (FACTS.esp32.match(/#define\s+DEVICE_NAME\s+"([^"]+)"/) || [])[1] || null;
const nimbleInitName = (FACTS.esp32.match(/NimBLEDevice::init\("([^"]+)"\)/) || [])[1] || null;
const pioEnvs = [...FACTS.pio.matchAll(/\[env:([^\]]+)\]/g)].map((m) => m[1]);
const uploadPort = (FACTS.pio.match(/upload_port\s*=\s*(\S+)/) || [])[1] || null;
const otaUsesAction = /"action"/.test(FACTS.esp32) && !/"op"\s*:/.test(FACTS.esp32);
const releaseBuildsFlutter = /flutter/i.test(FACTS.releaseWorkflow);
const releaseBuildsTauri = /tauri/i.test(FACTS.releaseWorkflow);
const releaseBuildsUniapp = /uniapp|uni-app/i.test(FACTS.releaseWorkflow);
const hasSubscriptionCount = /subscription_count/.test(FACTS.bleRuntimeIndex);
const hasSessionRegistry = exists('apps/uniapp/services/ble-runtime/session-registry.js');
const hasProvisioningClassify = /registerProvisioning|markProvisioning/.test(
  read('apps/uniapp/services/connected-session-registry.js') + read('apps/uniapp/services/ble-runtime/session-registry.js'),
);
const sessionRegistryDone = hasSessionRegistry && hasSubscriptionCount && hasProvisioningClassify;
const reconnectReady = FACTS.hasReconnectPolicy && FACTS.hasReconnectManager;

// ---------------------------------------------------------------------------
// Target inventory extraction
// ---------------------------------------------------------------------------
const docCorpus = [
  'docs/target-product/07_INTERACTION_STATE_AND_ERROR_MODEL.md',
  'docs/target-product/09_DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY.md',
  'docs/target-product/11_BLE_GATT_PROTOCOL_CONTRACT.md',
  'docs/target-product/14_OBSERVABILITY_LOGGING_AND_EVIDENCE.md',
  'docs/target-product/15_SECURITY_AND_THREAT_MODEL.md',
  'docs/target-product/16_NON_FUNCTIONAL_REQUIREMENTS.md',
  'docs/target-product/21_RISK_REGISTER_AND_DECISION_LOG.md',
  'docs/target-tests/02_REQUIREMENT_TO_TEST_TRACEABILITY.md',
].map(readDoc).join('\n');

const PROTO_IDS = Array.from({ length: 11 }, (_, i) => `PROTO-${String(i + 1).padStart(3, '0')}`);
const ERR_IDS = extractIds(docCorpus, String.raw`ERR-[A-Z]+-\d{2}`).filter((x) => x !== 'ERR-XXX-00');
const DATA_IDS = extractIds(docCorpus, String.raw`DATA-\d{3}`);
const SEC_IDS = extractIds(docCorpus, String.raw`SEC-\d{3}`);
const NFR_IDS = extractIds(docCorpus, String.raw`NFR-\d{3}`);
const DEC_IDS = extractIds(docCorpus, String.raw`DEC-\d{3}`);
const EVID_IDS = extractIds(docCorpus, String.raw`EVID-\d{3}`);
const TEST_IDS = extractIds(
  `${docCorpus}\n${JSON.stringify(trace)}\n${JSON.stringify(product)}`,
  String.raw`TEST-[A-Z]+-\d{3}`,
).slice(0, 200);
// Prefer canonical TEST count 103 from traceability doc
const TEST_CANON = extractIds(readDoc('docs/target-tests/02_REQUIREMENT_TO_TEST_TRACEABILITY.md'), String.raw`TEST-[A-Z]+-\d{3}`);

const PAGE_IDS = pagesTarget.pages.map((p) => p.id).filter((id) => id.startsWith('PAGE-'));
const WEB_IDS = pagesTarget.pages.map((p) => p.id).filter((id) => id.startsWith('WEB-'));
const STATE_IDS = behavior.pages.flatMap((p) => p.states.map((s) => s.state_id));
const OP_IDS = behavior.pages.flatMap((p) => p.operations.map((o) => o.operation_id));
const FLOW_IDS = (flowsTarget.flows || []).map((f) => f.id);
const REQ_IDS = product.requirements.map((r) => r.id);
const FEAT_IDS = product.features.map((f) => f.id);
const CLAIM_IDS = (landing.claims || []).map((c) => c.id);

const EXPECTED_TOTALS = {
  REQ: 66, FEAT: 81, PAGE: 10, WEB: 1, STATE: 67, OP: 92, FLOW: 14,
  ERR: 68, DATA: 13, PROTO: 11, SEC: 19, NFR: 24, CLAIM: 31, DEC: 17, EVID: 8, TEST: 103,
};

// ---------------------------------------------------------------------------
// Case → target evidence map
// ---------------------------------------------------------------------------
/** @type {Map<string, {pass: object[], fail: object[]}>} */
const evidenceByTarget = new Map();
function touch(id) {
  if (!evidenceByTarget.has(id)) evidenceByTarget.set(id, { pass: [], fail: [] });
  return evidenceByTarget.get(id);
}
for (const c of current.cases) {
  const ids = Array.isArray(c.target_ids) ? c.target_ids : [];
  for (const id of ids) {
    const bucket = touch(id);
    if (c.status === 'PASS') bucket.pass.push(c);
    else if (c.status === 'FAIL') bucket.fail.push(c);
  }
}

function evidenceFor(id) {
  return evidenceByTarget.get(id) || { pass: [], fail: [] };
}

function firstFailBp(ev) {
  const f = ev.fail[0];
  if (!f) return '';
  return f.first_breakpoint || f.actual || '';
}

// ---------------------------------------------------------------------------
// Root causes & tasks
// ---------------------------------------------------------------------------
const ROOT_CAUSES = [
  { id: 'RC-OTA-CTRL-START', severity: 'P0', title: 'OtaManager 在第一个 DATA 写之前未发送 CTRL start', domain: 'runtime' },
  { id: 'RC-LANDING-FAKE-DOWNLOAD', severity: 'P0', title: '落地页 releases/latest 假主下载 / 未诚实 NOT_RELEASED', domain: 'landing' },
  { id: 'RC-RELEASE-PIPELINE', severity: 'P0', title: 'Release 构建 Flutter/Tauri 而非 UniApp+双固件', domain: 'release' },
  { id: 'RC-VERSION-SSOT', severity: 'P1', title: '根 VERSION / version-metadata / public-status 缺失', domain: 'release' },
  { id: 'RC-DISPLAY-NAME', severity: 'P1', title: 'display-name.js 模块缺失', domain: 'runtime' },
  { id: 'RC-DEVICE-FILTER', severity: 'P1', title: 'device-filter 关键词命中项匹配不符合目标', domain: 'runtime' },
  { id: 'RC-GATT-HEX', severity: 'P1', title: 'validateHexInput/parseHexInput 缺失', domain: 'runtime' },
  { id: 'RC-WRITE-QUEUE', severity: 'P1', title: 'write-queue.js 缺失', domain: 'runtime' },
  { id: 'RC-LOG-REDACTION', severity: 'P1', title: 'log-redaction.js 缺失', domain: 'runtime' },
  { id: 'RC-RECONNECT', severity: 'P1', title: 'reconnect-policy.js 缺失', domain: 'runtime' },
  { id: 'RC-SESSION-REGISTRY', severity: 'P1', title: 'Registry 缺 subscription_count / 配网会话分类', domain: 'runtime' },
  { id: 'RC-CONN-DISCOVERY', severity: 'P1', title: 'connectDevice 未编排服务发现', domain: 'runtime' },
  { id: 'RC-OTA-PACKAGE', severity: 'P1', title: 'validateOtaPackage 六项传输前校验缺失', domain: 'runtime' },
  { id: 'RC-PAGE-BROADCAST', severity: 'P1', title: 'PAGE-008 内联广播逻辑，未用 composable/Owner', domain: 'pages' },
  { id: 'RC-ESP32-BUILD', severity: 'P1', title: '仅 env:esp32dev + 固定 COM3，无 fixture_observer', domain: 'esp32' },
  { id: 'RC-ESP32-LED-NAME', severity: 'P1', title: 'LED FF00 表缺失；DEVICE_NAME 宏与 NimBLE init 名不一致', domain: 'esp32' },
  { id: 'RC-ESP32-OBSERVER', severity: 'P1', title: 'Observer 夹具源码/广播名缺失', domain: 'esp32' },
  { id: 'RC-ESP32-SERIAL', severity: 'P1', title: '串口 JSON / Observer 字段 / emit 覆盖不足', domain: 'esp32' },
  { id: 'RC-ESP32-OTA-ACTION', severity: 'P1', title: '固件 OTA 使用 action 而非目标 op 字段', domain: 'esp32' },
  { id: 'RC-TEST-BRIDGE-TS', severity: 'P1', title: 'Node 测试桥无法 import .ts Smart HID protocol', domain: 'testability' },
  { id: 'RC-PLAYWRIGHT', severity: 'P2', title: '@playwright/test 未安装', domain: 'environment' },
  { id: 'RC-PAGE-DRIVER', severity: 'P2', title: 'TARGET_PAGE_DRIVER 未实现', domain: 'testability' },
  { id: 'RC-PAGE-VERSION', severity: 'P1', title: 'PAGE-010 硬编码 versionHistory', domain: 'pages' },
];

const TASKS = [
  { task_id: 'TEST-CURRENT-INTEGRITY-001', task_type: 'TESTABILITY', title: 'Current 度量完整性（TP-G1-R3 已完成）', root_cause_id: null, severity: null, deps: [], order_hint: 0, status: 'DONE' },
  { task_id: 'ENV-PLAYWRIGHT-001', task_type: 'ENVIRONMENT', title: '安装并锁定 Playwright / H5 harness', root_cause_id: 'RC-PLAYWRIGHT', severity: 'P2', deps: [], order_hint: 1, status: FACTS.playwright ? 'DONE' : 'PLANNED' },
  { task_id: 'TEST-PAGE-DRIVER-001', task_type: 'TESTABILITY', title: '实现 Target Page Driver', root_cause_id: 'RC-PAGE-DRIVER', severity: 'P2', deps: ['ENV-PLAYWRIGHT-001'], order_hint: 2, status: FACTS.pageDriverImplemented ? 'DONE' : 'PLANNED' },
  { task_id: 'PUBLIC-HONESTY-001', task_type: 'SOURCE_FIX', title: '落地页立即诚实降级（假下载/6+/错误主线→PREVIEW/NOT_RELEASED）', root_cause_id: 'RC-LANDING-FAKE-DOWNLOAD', severity: 'P0', deps: [], order_hint: 3, status: landingFakeDownload ? 'PLANNED' : 'DONE' },
  { task_id: 'VERSION-METADATA-001', task_type: 'SOURCE_FIX', title: '根 VERSION + Release Metadata + Public Status', root_cause_id: 'RC-VERSION-SSOT', severity: 'P1', deps: [], order_hint: 4, status: versionSsotReady ? 'DONE' : 'PLANNED' },
  { task_id: 'RELEASE-PIPELINE-001', task_type: 'RELEASE', title: 'UniApp + Peripheral/Observer 双固件 Release Pipeline', root_cause_id: 'RC-RELEASE-PIPELINE', severity: 'P0', deps: ['VERSION-METADATA-001'], order_hint: 5 },
  { task_id: 'RUNTIME-DISPLAY-NAME-001', task_type: 'SOURCE_FIX', title: '实现 display-name 解析链', root_cause_id: 'RC-DISPLAY-NAME', severity: 'P1', deps: [], order_hint: 10, status: FACTS.hasDisplayName ? 'DONE' : 'PLANNED' },
  { task_id: 'RUNTIME-FILTER-001', task_type: 'SOURCE_FIX', title: 'device-filter 关键词命中项匹配对齐目标', root_cause_id: 'RC-DEVICE-FILTER', severity: 'P1', deps: [], order_hint: 11, status: filterHasKeywordMatch ? 'DONE' : 'PLANNED' },
  { task_id: 'RUNTIME-GATT-CODEC-001', task_type: 'SOURCE_FIX', title: 'validateHexInput/parseHexInput', root_cause_id: 'RC-GATT-HEX', severity: 'P1', deps: [], order_hint: 12, status: exists('apps/uniapp/services/ble-runtime/gatt-codec.js') ? 'DONE' : 'PLANNED' },
  { task_id: 'RUNTIME-WRITE-QUEUE-001', task_type: 'SOURCE_FIX', title: 'write-queue MTU 分包队列', root_cause_id: 'RC-WRITE-QUEUE', severity: 'P1', deps: [], order_hint: 13, status: FACTS.hasWriteQueue ? 'DONE' : 'PLANNED' },
  { task_id: 'RUNTIME-LOG-REDACTION-001', task_type: 'SOURCE_FIX', title: 'log-redaction 脱敏', root_cause_id: 'RC-LOG-REDACTION', severity: 'P1', deps: [], order_hint: 14 },
  { task_id: 'RUNTIME-RECONNECT-001', task_type: 'SOURCE_FIX', title: 'reconnect-policy 有限重连', root_cause_id: 'RC-RECONNECT', severity: 'P1', deps: [], order_hint: 15, status: reconnectReady ? 'DONE' : 'PLANNED' },
  { task_id: 'RUNTIME-SESSION-001', task_type: 'SOURCE_FIX', title: 'Registry subscription_count + 配网会话分类', root_cause_id: 'RC-SESSION-REGISTRY', severity: 'P1', deps: [], order_hint: 16, status: sessionRegistryDone ? 'DONE' : 'PLANNED' },
  { task_id: 'RUNTIME-CONNECTION-DISCOVERY-001', task_type: 'SOURCE_FIX', title: 'connectDevice 编排服务发现', root_cause_id: 'RC-CONN-DISCOVERY', severity: 'P1', deps: [], order_hint: 17 },
  { task_id: 'OTA-PACKAGE-001', task_type: 'SOURCE_FIX', title: '客户端 Firmware Package 六项校验', root_cause_id: 'RC-OTA-PACKAGE', severity: 'P1', deps: [], order_hint: 20 },
  { task_id: 'OTA-CLIENT-001', task_type: 'SOURCE_FIX', title: '客户端完整 OTA 事务（CTRL start→ready→DATA→commit）', root_cause_id: 'RC-OTA-CTRL-START', severity: 'P0', deps: ['OTA-PACKAGE-001'], order_hint: 21 },
  { task_id: 'OTA-FIRMWARE-001', task_type: 'SOURCE_FIX', title: '固件 OTA op/target/hardware/SHA/max_chunk/commit 校验', root_cause_id: 'RC-ESP32-OTA-ACTION', severity: 'P1', deps: ['ESP32-BUILD-001'], order_hint: 22 },
  { task_id: 'ESP32-BUILD-001', task_type: 'SOURCE_FIX', title: '两环境、无固定 COM、模块化入口', root_cause_id: 'RC-ESP32-BUILD', severity: 'P1', deps: [], order_hint: 30 },
  { task_id: 'ESP32-PERIPHERAL-001', task_type: 'SOURCE_FIX', title: '服务/特征/名称/LED/Device Info 对齐契约', root_cause_id: 'RC-ESP32-LED-NAME', severity: 'P1', deps: ['ESP32-BUILD-001'], order_hint: 31 },
  { task_id: 'ESP32-OBSERVER-001', task_type: 'SOURCE_FIX', title: '实现 fixture_observer', root_cause_id: 'RC-ESP32-OBSERVER', severity: 'P1', deps: ['ESP32-BUILD-001'], order_hint: 32 },
  { task_id: 'ESP32-FAULT-001', task_type: 'SOURCE_FIX', title: 'Fault Injection + Serial JSON', root_cause_id: 'RC-ESP32-SERIAL', severity: 'P1', deps: ['ESP32-PERIPHERAL-001'], order_hint: 33 },
  { task_id: 'PAGE-BROADCAST-001', task_type: 'SOURCE_FIX', title: 'PAGE-008 改用 composable/adapter/service', root_cause_id: 'RC-PAGE-BROADCAST', severity: 'P1', deps: [], order_hint: 40 },
  { task_id: 'PAGE-VERSION-001', task_type: 'SOURCE_FIX', title: 'PAGE-010 改为 Metadata 投影', root_cause_id: 'RC-PAGE-VERSION', severity: 'P1', deps: ['VERSION-METADATA-001'], order_hint: 41, status: pageVersionReady ? 'DONE' : 'PLANNED' },
  { task_id: 'TEST-BRIDGE-TS-001', task_type: 'TESTABILITY', title: 'Node 测试桥支持 TS protocol import（Smart HID）', root_cause_id: 'RC-TEST-BRIDGE-TS', severity: 'P1', deps: [], order_hint: 50 },
  { task_id: 'VERIFY-ANDROID-001', task_type: 'VERIFY_E5', title: 'Android 真机矩阵', root_cause_id: null, severity: null, deps: ['TEST-PAGE-DRIVER-001', 'OTA-CLIENT-001'], order_hint: 90 },
  { task_id: 'VERIFY-WECHAT-001', task_type: 'VERIFY_E5', title: '微信真机矩阵', root_cause_id: null, severity: null, deps: ['TEST-PAGE-DRIVER-001'], order_hint: 91 },
  { task_id: 'VERIFY-ESP32-001', task_type: 'VERIFY_E5', title: 'ESP32 E5 夹具矩阵', root_cause_id: null, severity: null, deps: ['ESP32-OBSERVER-001', 'ESP32-FAULT-001'], order_hint: 92 },
  { task_id: 'VERIFY-SMART-HID-001', task_type: 'VERIFY_E5', title: 'Smart HID E5 端到端', root_cause_id: null, severity: null, deps: ['TEST-BRIDGE-TS-001'], order_hint: 93 },
  { task_id: 'VERIFY-E6-001', task_type: 'VERIFY_E6', title: 'Clean Machine / Release E6', root_cause_id: null, severity: null, deps: ['PUBLIC-HONESTY-001', 'RELEASE-PIPELINE-001', 'VERSION-METADATA-001'], order_hint: 94 },
];

function topoSort(tasks) {
  const byId = new Map(tasks.map((t) => [t.task_id, t]));
  const indeg = new Map(tasks.map((t) => [t.task_id, 0]));
  const adj = new Map(tasks.map((t) => [t.task_id, []]));
  for (const t of tasks) {
    for (const d of t.deps || []) {
      if (!byId.has(d)) continue;
      adj.get(d).push(t.task_id);
      indeg.set(t.task_id, indeg.get(t.task_id) + 1);
    }
  }
  const q = tasks
    .filter((t) => indeg.get(t.task_id) === 0)
    .sort((a, b) => (a.order_hint ?? 99) - (b.order_hint ?? 99) || a.task_id.localeCompare(b.task_id))
    .map((t) => t.task_id);
  const out = [];
  while (q.length) {
    const id = q.shift();
    out.push(id);
    for (const nxt of adj.get(id) || []) {
      indeg.set(nxt, indeg.get(nxt) - 1);
      if (indeg.get(nxt) === 0) {
        q.push(nxt);
        q.sort((a, b) => {
          const ta = byId.get(a); const tb = byId.get(b);
          return (ta.order_hint ?? 99) - (tb.order_hint ?? 99) || a.localeCompare(b);
        });
      }
    }
  }
  if (out.length !== tasks.length) {
    throw new Error(`task dependency cycle detected: missing ${tasks.filter((t) => !out.includes(t.task_id)).map((t) => t.task_id).join(',')}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Record builder
// ---------------------------------------------------------------------------
function makeRecord(partial) {
  return {
    target_id: partial.target_id,
    target_type: partial.target_type,
    dimension: partial.dimension || partial.target_type,
    gap_kind: partial.gap_kind || 'PRODUCT',
    priority: partial.priority || 'Must',
    implementation_status: partial.implementation_status || 'UNASSESSED',
    verification_status: partial.verification_status || 'NOT_EXECUTED',
    static_implementation: partial.static_implementation ?? null,
    e4_verification: partial.e4_verification ?? null,
    e5_verification: partial.e5_verification ?? null,
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
    root_cause_id: partial.root_cause_id ?? null,
    task_id: partial.task_id ?? null,
    release_blocking: partial.release_blocking ?? false,
  };
}

function applyCaseEvidence(base, targetId) {
  const ev = evidenceFor(targetId);
  const test_results = [
    ...ev.pass.map((c) => ({ test_id: c.test_id, status: 'PASS', case_id: c.case_id, first_breakpoint: null })),
    ...ev.fail.map((c) => ({ test_id: c.test_id, status: 'FAIL', case_id: c.case_id, first_breakpoint: c.first_breakpoint || c.actual || null })),
  ];
  if (ev.fail.length) {
    return {
      ...base,
      verification_status: 'AUTOMATED_FAIL',
      actual: ev.fail[0].actual || base.actual,
      first_breakpoint: firstFailBp(ev) || base.first_breakpoint,
      test_results,
      test_ids: [...new Set([...(base.test_ids || []), ...test_results.map((t) => t.test_id).filter(Boolean)])],
    };
  }
  if (ev.pass.length) {
    return {
      ...base,
      verification_status: 'AUTOMATED_PASS',
      implementation_status: base.implementation_status === 'UNASSESSED' ? 'IMPLEMENTED_UNTESTED' : base.implementation_status,
      // if only pass evidence and no static gap, prefer CONFIRMED_IMPLEMENTED when we had no negative facts
      actual: base.actual || 'structured current PASS',
      test_results,
      test_ids: [...new Set([...(base.test_ids || []), ...test_results.map((t) => t.test_id).filter(Boolean)])],
    };
  }
  return { ...base, test_results };
}

const records = [];
const recordKey = new Set();
function pushRecord(partial) {
  const r = makeRecord(partial);
  const key = `${r.target_id}::${r.dimension}`;
  if (recordKey.has(key)) return;
  recordKey.add(key);
  records.push(applyCaseEvidence(r, r.target_id));
}

function mapFailToTask(bp, ids) {
  const h = `${bp} ${ids.join(' ')}`;
  if (/CTRL start|OtaManager 在第一个 DATA/.test(h)) return { rc: 'RC-OTA-CTRL-START', task: 'OTA-CLIENT-001', sev: 'P0', kind: 'RUNTIME' };
  if (/validateOtaPackage|validatePackage|六项/.test(h)) return { rc: 'RC-OTA-PACKAGE', task: 'OTA-PACKAGE-001', sev: 'P1', kind: 'RUNTIME' };
  if (/display-name/.test(h)) return { rc: 'RC-DISPLAY-NAME', task: 'RUNTIME-DISPLAY-NAME-001', sev: 'P1', kind: 'RUNTIME' };
  if (/命中项匹配关键词|filterBleDevices|keyword/.test(h)) return { rc: 'RC-DEVICE-FILTER', task: 'RUNTIME-FILTER-001', sev: 'P1', kind: 'RUNTIME' };
  if (/validateHexInput|parseHexInput/.test(h)) return { rc: 'RC-GATT-HEX', task: 'RUNTIME-GATT-CODEC-001', sev: 'P1', kind: 'RUNTIME' };
  if (/write-queue/.test(h)) return { rc: 'RC-WRITE-QUEUE', task: 'RUNTIME-WRITE-QUEUE-001', sev: 'P1', kind: 'RUNTIME' };
  if (/log-redaction/.test(h)) return { rc: 'RC-LOG-REDACTION', task: 'RUNTIME-LOG-REDACTION-001', sev: 'P1', kind: 'RUNTIME' };
  if (/reconnect-policy/.test(h)) return { rc: 'RC-RECONNECT', task: 'RUNTIME-RECONNECT-001', sev: 'P1', kind: 'RUNTIME' };
  if (/subscription_count|配网会话/.test(h)) return { rc: 'RC-SESSION-REGISTRY', task: 'RUNTIME-SESSION-001', sev: 'P1', kind: 'RUNTIME' };
  if (/服务发现|connectDevice/.test(h)) return { rc: 'RC-CONN-DISCOVERY', task: 'RUNTIME-CONNECTION-DISCOVERY-001', sev: 'P1', kind: 'RUNTIME' };
  if (/Unexpected identifier 'as'|hid-provisioning-protocol\.ts|SyntaxError/.test(h) && /FEAT-05[3-9]|Smart HID|TEST-U-015|REQ-047|REQ-049/.test(h)) {
    return { rc: 'RC-TEST-BRIDGE-TS', task: 'TEST-BRIDGE-TS-001', sev: 'P1', kind: 'TESTABILITY' };
  }
  if (/VERSION|version-metadata|public-status/.test(h)) return { rc: 'RC-VERSION-SSOT', task: 'VERSION-METADATA-001', sev: 'P1', kind: 'RELEASE' };
  if (/releases\/latest|6\+|假下载|下载全部平台|Mobile Mainline/.test(h) || (landingFakeDownload && /NOT_RELEASED/.test(h))) {
    return { rc: 'RC-LANDING-FAKE-DOWNLOAD', task: 'PUBLIC-HONESTY-001', sev: 'P0', kind: 'LANDING' };
  }
  if (/BLEToolkit-Observer|Observer/.test(h)) return { rc: 'RC-ESP32-OBSERVER', task: 'ESP32-OBSERVER-001', sev: 'P1', kind: 'FIRMWARE' };
  if (/FF00|LED/.test(h)) return { rc: 'RC-ESP32-LED-NAME', task: 'ESP32-PERIPHERAL-001', sev: 'P1', kind: 'FIRMWARE' };
  if (/Observer 字段|emit 覆盖|serial/i.test(h)) return { rc: 'RC-ESP32-SERIAL', task: 'ESP32-FAULT-001', sev: 'P1', kind: 'FIRMWARE' };
  if (/cancel.*abort|firmware_version/.test(h)) return { rc: 'RC-OTA-CTRL-START', task: 'OTA-CLIENT-001', sev: 'P0', kind: 'RUNTIME' };
  return null;
}

// ---- FEAT ----
for (const f of product.features) {
  let impl = 'UNASSESSED';
  let ver = 'NOT_EXECUTED';
  let sev = null;
  let rc = null;
  let task = null;
  let bp = '';
  let actual = '';
  let kind = 'PRODUCT';
  let refs = [];
  const ev = evidenceFor(f.id);
  const mapped = ev.fail.length ? mapFailToTask(firstFailBp(ev), [f.id, ...(f.planned_tests || []), firstFailBp(ev)]) : null;

  // Smart HID FEAT-053..059: TS bridge only → TESTABILITY, not NOT_IMPLEMENTED
  if (/^FEAT-05[3-9]$/.test(f.id) && smartHidImportsTs) {
    const bridgeFail = ev.fail.some((c) => /Unexpected identifier|SyntaxError|\.ts/.test(`${c.first_breakpoint || ''} ${c.actual || ''}`));
    if (bridgeFail || (ev.fail.length && mapped?.task === 'TEST-BRIDGE-TS-001')) {
      impl = 'IMPLEMENTED_UNTESTED';
      ver = 'AUTOMATED_FAIL';
      sev = 'P1';
      rc = 'RC-TEST-BRIDGE-TS';
      task = 'TEST-BRIDGE-TS-001';
      kind = 'TESTABILITY';
      bp = 'Node test bridge cannot import core/protocols/hid-provisioning-protocol.ts';
      actual = 'profile.js exists; failure is TESTABILITY import bridge, not confirmed product absence';
      refs = [{ path: 'apps/uniapp/services/smart-hid/profile.js', symbol: 'import ... hid-provisioning-protocol.ts', line_hint: '1-12' }];
    }
  }

  if (!task && mapped) {
    rc = mapped.rc; task = mapped.task; sev = mapped.sev; kind = mapped.kind;
    bp = firstFailBp(ev);
    actual = ev.fail[0].actual || bp;
    if (mapped.task === 'TEST-BRIDGE-TS-001') {
      impl = 'IMPLEMENTED_UNTESTED';
    } else if (/NOT_IMPLEMENTED|目标模块缺失|目标接口/.test(actual)) {
      impl = 'NOT_IMPLEMENTED';
    } else {
      impl = 'CONFIRMED_PARTIAL';
    }
    ver = 'AUTOMATED_FAIL';
  }

  // Static OTA facts
  if (['FEAT-046', 'FEAT-047', 'FEAT-048', 'FEAT-049', 'FEAT-050', 'FEAT-051', 'FEAT-052'].includes(f.id) && !otaWritesCtrl) {
    impl = 'CONFIRMED_PARTIAL';
    ver = ev.fail.length ? 'AUTOMATED_FAIL' : ver;
    sev = 'P0';
    rc = 'RC-OTA-CTRL-START';
    task = 'OTA-CLIENT-001';
    kind = 'RUNTIME';
    bp = bp || 'OtaManager 在第一个 DATA 写之前未发送 CTRL start';
    actual = actual || 'CHAR_CTRL defined but start/commit/abort not written before DATA';
    refs = [{ path: 'apps/uniapp/utils/ota_manager.js', symbol: 'OtaManager.startOta', line_hint: 'CHAR_CTRL never written' }];
  }
  if (f.id === 'FEAT-081' && !hasValidateOta) {
    impl = 'NOT_IMPLEMENTED';
    ver = ev.fail.length ? 'AUTOMATED_FAIL' : 'AUTOMATED_FAIL';
    sev = 'P1';
    rc = 'RC-OTA-PACKAGE';
    task = 'OTA-PACKAGE-001';
    kind = 'RUNTIME';
    bp = bp || 'validateOtaPackage 接口缺失';
  }
  if (f.id === 'FEAT-013' && !FACTS.hasDisplayName) {
    impl = 'NOT_IMPLEMENTED'; ver = 'AUTOMATED_FAIL'; sev = 'P1';
    rc = 'RC-DISPLAY-NAME'; task = 'RUNTIME-DISPLAY-NAME-001'; kind = 'RUNTIME';
    bp = '目标模块缺失：apps/uniapp/services/ble-runtime/display-name.js';
    refs = [{ path: 'apps/uniapp/services/ble-runtime/', symbol: '(missing display-name.js)', line_hint: 'n/a' }];
  }
  if (['FEAT-041', 'FEAT-042', 'FEAT-043', 'FEAT-044', 'FEAT-045'].includes(f.id) && !useBroadcastSession) {
    if (!task || task === 'ESP32-OBSERVER-001') {
      // keep observer mapping if present; also note page structure
      if (!rc) {
        rc = 'RC-PAGE-BROADCAST'; task = 'PAGE-BROADCAST-001'; sev = sev || 'P1'; kind = 'PAGE';
        impl = 'CONFIRMED_PARTIAL';
        bp = bp || 'PAGE-008 内联广告逻辑；useBroadcastSession 未使用';
        refs = [{ path: 'apps/uniapp/pages/broadcast/index.vue', symbol: 'inline advertising', line_hint: 'no useBroadcastSession import' }];
      }
    }
  }
  if (['FEAT-004', 'FEAT-066'].includes(f.id) && !versionSsotReady) {
    impl = 'NOT_IMPLEMENTED'; ver = 'AUTOMATED_FAIL'; sev = 'P1';
    rc = 'RC-VERSION-SSOT'; task = 'VERSION-METADATA-001'; kind = 'RELEASE';
    bp = bp || (!FACTS.hasRootVersion
      ? '仓库根 VERSION 单源文件缺失'
      : (!FACTS.hasVersionMetadata
        ? '目标模块缺失：apps/uniapp/services/version-metadata.js'
        : 'Release Metadata / public-status 尚未建立'));
  }
  if (f.id === 'FEAT-009' && !FACTS.hasPublicStatus) {
    impl = 'NOT_IMPLEMENTED'; ver = 'AUTOMATED_FAIL'; sev = 'P1';
    rc = 'RC-VERSION-SSOT'; task = 'VERSION-METADATA-001'; kind = 'RELEASE';
    bp = bp || '目标模块缺失：apps/uniapp/services/public-status.js';
  }
  if (['FEAT-070', 'FEAT-071', 'FEAT-072', 'FEAT-073', 'FEAT-074', 'FEAT-075'].includes(f.id) && landingFakeDownload) {
    if (/下载|QR|SHA|产物|入口|落地|公开/.test(f.name) || ['FEAT-070', 'FEAT-075'].includes(f.id)) {
      impl = 'CONFIRMED_PARTIAL';
      ver = ev.fail.length ? 'AUTOMATED_FAIL' : ver;
      sev = 'P0';
      rc = 'RC-LANDING-FAKE-DOWNLOAD';
      task = 'PUBLIC-HONESTY-001';
      kind = 'LANDING';
      bp = bp || 'docs/index.md download-hub → releases/latest';
      refs = [{ path: 'docs/index.md', symbol: 'download-hub', line_hint: 'releases/latest' }];
    }
  }

  if (ev.pass.length && !ev.fail.length && impl === 'UNASSESSED') {
    impl = 'IMPLEMENTED_UNTESTED';
    ver = 'AUTOMATED_PASS';
    actual = 'structured current PASS on related cases';
  }
  if ((f.minimum_evidence_level === 'E5' || f.minimum_evidence_level === 'E6') && ver === 'NOT_EXECUTED') {
    ver = f.minimum_evidence_level === 'E5' ? 'HARDWARE_PENDING' : 'NOT_EXECUTED';
  }

  pushRecord({
    target_id: f.id,
    target_type: 'feature',
    gap_kind: kind,
    priority: f.priority,
    implementation_status: impl,
    verification_status: ver,
    severity: sev,
    evidence_level: f.minimum_evidence_level || null,
    implementation_refs: refs,
    test_ids: f.planned_tests || [],
    expected: `${f.name} (${f.priority})`,
    actual,
    first_breakpoint: bp,
    root_cause_id: rc,
    task_id: task,
    release_blocking: !!f.release_blocking || sev === 'P0',
  });
}

// ---- REQ ----
for (const r of product.requirements) {
  const featRecs = records.filter((x) => (r.features || []).includes(x.target_id));
  const worstImpl = featRecs.some((x) => x.implementation_status === 'NOT_IMPLEMENTED') ? 'NOT_IMPLEMENTED'
    : featRecs.some((x) => x.implementation_status === 'CONFIRMED_PARTIAL' || x.implementation_status === 'CONFIRMED_MISSING') ? 'CONFIRMED_PARTIAL'
      : featRecs.some((x) => x.implementation_status === 'IMPLEMENTED_UNTESTED' || x.verification_status === 'AUTOMATED_PASS') ? 'IMPLEMENTED_UNTESTED'
        : 'UNASSESSED';
  const failFeat = featRecs.find((x) => x.verification_status === 'AUTOMATED_FAIL');
  const pendingFeat = featRecs.find((x) => x.verification_status === 'HARDWARE_PENDING');
  const passFeat = featRecs.find((x) => x.verification_status === 'AUTOMATED_PASS');
  const ver = failFeat?.verification_status
    || pendingFeat?.verification_status
    || passFeat?.verification_status
    || 'NOT_EXECUTED';
  const sev = featRecs.find((x) => x.severity === 'P0')?.severity
    || featRecs.find((x) => x.severity === 'P1')?.severity
    || null;
  pushRecord({
    target_id: r.id,
    target_type: 'requirement',
    gap_kind: 'PRODUCT',
    priority: r.priority,
    implementation_status: worstImpl,
    verification_status: ver,
    severity: sev,
    test_ids: r.planned_tests || [],
    expected: `REQ ${r.id}`,
    actual: failFeat?.actual || '',
    first_breakpoint: failFeat?.first_breakpoint || '',
    root_cause_id: failFeat?.root_cause_id || null,
    task_id: failFeat?.task_id || null,
    release_blocking: true,
    dependencies: r.features || [],
  });
}

// ---- PAGE / STATE / OP ----
const pageBlockedReason = current.pages?.reason || 'BLOCKED_BY_TOOLCHAIN';
const playwrightBlocked = !FACTS.playwright;
const driverBlocked = !FACTS.pageDriverImplemented;

for (const p of behavior.pages) {
  const pageMeta = pagesTarget.pages.find((x) => x.id === p.page_id);
  const isWeb = p.page_id === 'WEB-001';
  let staticImpl = 'UNASSESSED';
  let e4 = playwrightBlocked
    ? 'BLOCKED_BY_TOOLCHAIN'
    : (driverBlocked ? 'BLOCKED_BY_TARGET_DRIVER' : 'EXECUTED');
  let e5 = 'HARDWARE_PENDING';
  let sev = null;
  let rc = null;
  let task = playwrightBlocked
    ? 'ENV-PLAYWRIGHT-001'
    : (driverBlocked ? 'TEST-PAGE-DRIVER-001' : null);
  let kind = isWeb ? 'LANDING' : 'PAGE';
  let bp = playwrightBlocked
    ? 'BLK-TOOL-PLAYWRIGHT: @playwright/test 未安装'
    : (driverBlocked
      ? 'BLK-TEST-PAGE-DRIVER: TARGET_PAGE_DRIVER 未实现'
      : 'Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task');
  let actual = driverBlocked
    ? `E4 blocked; blocked_cases≈${current.pages?.blocked_cases || 229} (not product defects)`
    : `E4 executed via Page Driver; pass=${current.pages?.pass ?? '—'} fail=${current.pages?.fail ?? '—'}`;
  let impl = 'UNASSESSED';
  let ver = e4;

  const ev = evidenceFor(p.page_id);
  if (p.page_id === 'PAGE-008' && !useBroadcastSession) {
    staticImpl = 'CONFIRMED_PARTIAL';
    impl = 'CONFIRMED_PARTIAL';
    sev = 'P1';
    rc = 'RC-PAGE-BROADCAST';
    task = 'PAGE-BROADCAST-001';
    bp = '广播页内联；Owner/composable 未接入';
    kind = 'PAGE';
  }
  if (p.page_id === 'PAGE-010' && versionHardcoded) {
    staticImpl = 'CONFIRMED_PARTIAL';
    impl = 'CONFIRMED_PARTIAL';
    sev = 'P1';
    rc = 'RC-PAGE-VERSION';
    task = 'PAGE-VERSION-001';
    bp = 'pages/about/version.vue 硬编码 versionHistory';
  }
  if (isWeb && landingFakeDownload) {
    staticImpl = 'CONFIRMED_PARTIAL';
    impl = 'CONFIRMED_PARTIAL';
    sev = 'P0';
    rc = 'RC-LANDING-FAKE-DOWNLOAD';
    task = 'PUBLIC-HONESTY-001';
    kind = 'LANDING';
    bp = '假主下载 releases/latest；另有 Playwright BLOCKED';
    ver = ev.fail.length ? 'AUTOMATED_FAIL' : ver;
  }
  if (ev.fail.length) {
    ver = 'AUTOMATED_FAIL';
    const m = mapFailToTask(firstFailBp(ev), [p.page_id, firstFailBp(ev)]);
    if (m) { rc = m.rc; task = m.task; sev = m.sev || sev; kind = m.kind; bp = firstFailBp(ev); }
  } else if (ev.pass.length && staticImpl === 'UNASSESSED') {
    staticImpl = 'CONFIRMED_IMPLEMENTED';
    impl = 'IMPLEMENTED_UNTESTED';
    // keep e4 blocked for page automation
  }

  pushRecord({
    target_id: p.page_id,
    target_type: isWeb ? 'web' : 'page',
    gap_kind: kind,
    priority: 'Must',
    implementation_status: impl,
    verification_status: ver,
    static_implementation: staticImpl,
    e4_verification: e4,
    e5_verification: e5,
    severity: sev,
    evidence_level: pageMeta?.minimum_evidence_level || 'E4',
    implementation_refs: [{
      path: isWeb ? 'docs/index.md' : (pageMeta?.route ? `apps/uniapp/${pageMeta.route}.vue` : ''),
      symbol: p.page_id,
      line_hint: '',
    }],
    test_ids: pageMeta?.planned_tests || [],
    expected: `${p.states.length} states / ${p.operations.length} operations`,
    actual,
    first_breakpoint: bp,
    root_cause_id: rc,
    task_id: task,
    release_blocking: sev === 'P0',
    downstream_impact: [`state_cases=${p.states.length}`, `operation_cases=${p.operations.length}`],
  });

  // Explicit dual blockers as testability records (both always registered)
  pushRecord({
    target_id: `${p.page_id}#BLK-TOOL-PLAYWRIGHT`,
    target_type: 'test',
    dimension: 'blocker',
    gap_kind: 'TESTABILITY',
    priority: 'Must',
    implementation_status: playwrightBlocked ? 'NOT_IMPLEMENTED' : 'CONFIRMED_IMPLEMENTED',
    verification_status: playwrightBlocked ? 'BLOCKED_BY_TOOLCHAIN' : 'AUTOMATED_PASS',
    severity: null,
    evidence_level: 'E4',
    expected: 'Playwright toolchain available',
    actual: playwrightBlocked ? 'BLK-TOOL-PLAYWRIGHT' : 'playwright resolvable',
    first_breakpoint: playwrightBlocked ? '@playwright/test 未安装' : '',
    root_cause_id: playwrightBlocked ? 'RC-PLAYWRIGHT' : null,
    task_id: 'ENV-PLAYWRIGHT-001',
    release_blocking: false,
    test_ids: [],
  });
  pushRecord({
    target_id: `${p.page_id}#BLK-TEST-PAGE-DRIVER`,
    target_type: 'test',
    dimension: 'blocker',
    gap_kind: 'TESTABILITY',
    priority: 'Must',
    implementation_status: driverBlocked ? 'NOT_IMPLEMENTED' : 'CONFIRMED_IMPLEMENTED',
    verification_status: driverBlocked ? 'BLOCKED_BY_TARGET_DRIVER' : 'AUTOMATED_PASS',
    severity: null,
    evidence_level: 'E4',
    expected: 'Page Driver Runtime 已落地（或 TARGET_PAGE_DRIVER=1）',
    actual: driverBlocked ? 'BLK-TEST-PAGE-DRIVER' : 'driver enabled (runtime present)',
    first_breakpoint: driverBlocked ? 'TARGET_PAGE_DRIVER 未实现' : '',
    root_cause_id: driverBlocked ? 'RC-PAGE-DRIVER' : null,
    task_id: 'TEST-PAGE-DRIVER-001',
    release_blocking: false,
    test_ids: [],
  });

  for (const st of p.states) {
    let sImpl = 'UNASSESSED';
    let sVer = e4;
    let sSev = null;
    let sRc = null;
    let sTask = playwrightBlocked
      ? 'ENV-PLAYWRIGHT-001'
      : (driverBlocked ? 'TEST-PAGE-DRIVER-001' : null);
    let sBp = driverBlocked
      ? `E4 未执行（${e4}）；静态态未单独确认 → UNASSESSED`
      : `E4 已由 Page Driver 执行（${e4}）；产品态差距另见业务 Task`;
    let sActual = driverBlocked
      ? 'no static confirmation; automation blocked'
      : 'page driver executed; product gap may remain';
    let sKind = isWeb ? 'LANDING' : 'PAGE';
    const sevEv = evidenceFor(st.state_id);

    if (isWeb && st.state_id === 'STATE-W001-03' && landingFakeDownload) {
      sImpl = 'CONFIRMED_MISSING';
      sSev = 'P0';
      sRc = 'RC-LANDING-FAKE-DOWNLOAD';
      sTask = 'PUBLIC-HONESTY-001';
      sBp = 'NOT_RELEASED 无产物时应无下载链接；当前仍暴露 releases/latest';
      sActual = '下载区未按 NOT_RELEASED 降级';
      sVer = 'AUTOMATED_FAIL';
      sKind = 'LANDING';
    }
    if (sevEv.fail.length) {
      sVer = 'AUTOMATED_FAIL';
      sBp = firstFailBp(sevEv);
      const m = mapFailToTask(sBp, [st.state_id, sBp]);
      if (m) { sRc = m.rc; sTask = m.task; sSev = m.sev; sKind = m.kind; sImpl = 'CONFIRMED_PARTIAL'; }
    } else if (sevEv.pass.length) {
      sVer = 'AUTOMATED_PASS';
      sImpl = 'IMPLEMENTED_UNTESTED';
    }

    pushRecord({
      target_id: st.state_id,
      target_type: 'state',
      gap_kind: sKind,
      priority: 'Must',
      implementation_status: sImpl,
      verification_status: sVer,
      static_implementation: sImpl === 'UNASSESSED' ? 'UNASSESSED' : sImpl,
      e4_verification: e4,
      e5_verification: 'NOT_EXECUTED',
      severity: sSev,
      evidence_level: 'E4',
      expected: st.entry_condition || st.state_id,
      actual: sActual,
      first_breakpoint: sBp,
      root_cause_id: sRc,
      task_id: sTask,
      release_blocking: sSev === 'P0',
      test_ids: st.test_ids || [],
      dependencies: [p.page_id],
    });
  }

  for (const op of p.operations) {
    let oImpl = 'UNASSESSED';
    let oVer = e4;
    let oSev = null;
    let oRc = null;
    let oTask = playwrightBlocked
      ? 'ENV-PLAYWRIGHT-001'
      : (driverBlocked ? 'TEST-PAGE-DRIVER-001' : null);
    let oBp = driverBlocked ? `E4 未执行（${e4}）` : `E4 已执行（${e4}）；产品操作差距另见业务 Task`;
    let oActual = driverBlocked
      ? '控件存在性未静态确认 → UNASSESSED'
      : 'page driver executed; product gap may remain';
    let oKind = isWeb ? 'LANDING' : 'PAGE';
    const oEv = evidenceFor(op.operation_id);

    if (op.hardware_dependent) {
      oVer = playwrightBlocked ? e4 : 'HARDWARE_PENDING';
    }
    if (/OTA|固件|OP-P006-1[234]/.test(op.operation_id + (op.control || '')) && !otaWritesCtrl) {
      oImpl = 'CONFIRMED_PARTIAL';
      oSev = 'P0';
      oRc = 'RC-OTA-CTRL-START';
      oTask = 'OTA-CLIENT-001';
      oBp = 'OtaManager 在第一个 DATA 写之前未发送 CTRL start';
      oActual = 'UI 可启动 OTA 但协议不完整';
      oKind = 'RUNTIME';
      oVer = 'AUTOMATED_FAIL';
    }
    if (p.page_id === 'PAGE-008' && /开始广播|OP-P008-0[123]/.test(op.operation_id + (op.control || ''))) {
      if (!useBroadcastSession) {
        oImpl = 'CONFIRMED_PARTIAL';
        oSev = 'P1';
        oRc = 'RC-PAGE-BROADCAST';
        oTask = 'PAGE-BROADCAST-001';
        oBp = '广播页内联；Owner/composable 未接入';
        oKind = 'PAGE';
      }
      if (!hasObserver) {
        // Observer missing = P1 (not P0)
        oImpl = 'CONFIRMED_MISSING';
        oSev = 'P1';
        oRc = 'RC-ESP32-OBSERVER';
        oTask = 'ESP32-OBSERVER-001';
        oBp = 'hardware/esp32 无 Observer 目标源码';
        oActual = '仅 Peripheral Server；无 fixture_observer';
        oKind = 'FIRMWARE';
        oVer = 'BLOCKED_BY_FIXTURE';
      }
    }
    if (isWeb && /下载|APK|固件|OP-W001-0[345]/.test(op.operation_id + (op.control || '')) && landingFakeDownload) {
      oImpl = 'CONFIRMED_PARTIAL';
      oSev = 'P0';
      oRc = 'RC-LANDING-FAKE-DOWNLOAD';
      oTask = 'PUBLIC-HONESTY-001';
      oBp = '下载 CTA 指向 releases/latest';
      oKind = 'LANDING';
      oVer = 'AUTOMATED_FAIL';
    }
    if (p.page_id === 'PAGE-010' && versionHardcoded) {
      oImpl = 'CONFIRMED_PARTIAL';
      oSev = 'P1';
      oRc = 'RC-PAGE-VERSION';
      oTask = 'PAGE-VERSION-001';
      oBp = 'pages/about/version.vue 硬编码 versionHistory';
    }
    if (oEv.fail.length) {
      oVer = 'AUTOMATED_FAIL';
      oBp = firstFailBp(oEv) || oBp;
      const m = mapFailToTask(oBp, [op.operation_id, oBp]);
      if (m) { oRc = m.rc; oTask = m.task; oSev = m.sev || oSev; oKind = m.kind; }
    } else if (oEv.pass.length && oImpl === 'UNASSESSED') {
      oVer = 'AUTOMATED_PASS';
      oImpl = 'IMPLEMENTED_UNTESTED';
    }

    pushRecord({
      target_id: op.operation_id,
      target_type: 'operation',
      gap_kind: oKind,
      priority: 'Must',
      implementation_status: oImpl,
      verification_status: oVer,
      static_implementation: oImpl === 'UNASSESSED' ? 'UNASSESSED' : oImpl,
      e4_verification: e4,
      e5_verification: op.hardware_dependent ? 'HARDWARE_PENDING' : 'NOT_EXECUTED',
      severity: oSev,
      evidence_level: op.hardware_dependent ? 'E5' : 'E4',
      expected: `${op.control || op.operation_id}`,
      actual: oActual,
      first_breakpoint: oBp,
      root_cause_id: oRc,
      task_id: oTask,
      release_blocking: oSev === 'P0',
      test_ids: op.test_ids || [],
      dependencies: [p.page_id],
    });
  }
}

// ---- FLOWS ----
for (const f of flowsTarget.flows || []) {
  let impl = 'UNASSESSED';
  let ver = 'NOT_EXECUTED';
  let sev = null;
  let rc = null;
  let task = null;
  let bp = '';
  let actual = '';
  let kind = 'PRODUCT';
  const ev = evidenceFor(f.id);
  if (f.id === 'FLOW-009' && !otaWritesCtrl) {
    impl = 'CONFIRMED_PARTIAL'; ver = 'AUTOMATED_FAIL'; sev = 'P0';
    rc = 'RC-OTA-CTRL-START'; task = 'OTA-CLIENT-001'; kind = 'RUNTIME';
    bp = 'OtaManager 在第一个 DATA 写之前未发送 CTRL start';
    actual = '客户端未执行 STATUS→CTRL start→ready→DATA→commit';
  }
  if (f.id === 'FLOW-008' && !hasObserver) {
    impl = 'CONFIRMED_PARTIAL'; ver = 'BLOCKED_BY_FIXTURE'; sev = 'P1';
    rc = 'RC-ESP32-OBSERVER'; task = 'ESP32-OBSERVER-001'; kind = 'FIRMWARE';
    bp = '缺 fixture_observer';
    actual = 'Observer 缺失（P1 / release_blocking；无公开危害证据故非 P0）';
  }
  if (ev.fail.length) {
    ver = 'AUTOMATED_FAIL';
    const m = mapFailToTask(firstFailBp(ev), [f.id, firstFailBp(ev)]);
    if (m) {
      rc = m.rc; task = m.task; sev = m.sev; kind = m.kind; bp = firstFailBp(ev);
      impl = impl === 'UNASSESSED' ? 'CONFIRMED_PARTIAL' : impl;
    }
  } else if (ev.pass.length && impl === 'UNASSESSED') {
    impl = 'IMPLEMENTED_UNTESTED'; ver = 'AUTOMATED_PASS';
  }
  pushRecord({
    target_id: f.id,
    target_type: 'flow',
    gap_kind: kind,
    priority: 'Must',
    implementation_status: impl,
    verification_status: ver,
    severity: sev,
    evidence_level: 'E5',
    test_ids: f.planned_tests || [],
    expected: f.name || f.id,
    actual,
    first_breakpoint: bp,
    root_cause_id: rc,
    task_id: task,
    release_blocking: sev === 'P0' || f.id === 'FLOW-008',
  });
}

// ---- PROTO-001..011 (never UUID) ----
const PROTO_META = {
  'PROTO-001': { name: 'LightBLE 主服务', kind: 'FIRMWARE' },
  'PROTO-002': { name: 'LightBLE 权限演示服务', kind: 'FIRMWARE' },
  'PROTO-003': { name: 'LightBLE OTA 服务事务', kind: 'FIRMWARE' },
  'PROTO-004': { name: '设备响应 JSON 载荷', kind: 'FIRMWARE' },
  'PROTO-005': { name: 'Smart HID Provisioning V1', kind: 'SMART_HID' },
  'PROTO-006': { name: 'Smart HID Pairing QR URI', kind: 'SMART_HID' },
  'PROTO-007': { name: 'Smart HID 分帧 framing', kind: 'SMART_HID' },
  'PROTO-008': { name: '手机广播 payload 编码', kind: 'RUNTIME' },
  'PROTO-009': { name: '夹具串口 JSON 观测流', kind: 'FIRMWARE' },
  'PROTO-010': { name: 'Release Metadata Schema', kind: 'RELEASE' },
  'PROTO-011': { name: 'OTA Firmware Package', kind: 'RUNTIME' },
};

for (const id of PROTO_IDS) {
  const meta = PROTO_META[id];
  let impl = 'UNASSESSED';
  let ver = 'NOT_EXECUTED';
  let sev = null;
  let rc = null;
  let task = null;
  let bp = '';
  let actual = '';
  const ev = evidenceFor(id);
  const refs = [];

  if (['PROTO-001', 'PROTO-002', 'PROTO-003', 'PROTO-004'].includes(id)) {
    refs.push(
      { path: 'hardware/esp32/LightBLE/src/main.cpp', symbol: 'SERVICE_UUID*', line_hint: '8-36' },
      { path: 'contracts/target/ble-fixture-target.json', symbol: 'services', line_hint: 'protocol_member UUIDs' },
    );
    if (!hasLedTable && id === 'PROTO-001') {
      impl = 'CONFIRMED_PARTIAL'; ver = 'AUTOMATED_FAIL'; sev = 'P1';
      rc = 'RC-ESP32-LED-NAME'; task = 'ESP32-PERIPHERAL-001';
      bp = '固件缺 FF00 LED 指令表';
      actual = 'LED command table missing vs ble-fixture-target.led_commands';
    }
    if (id === 'PROTO-003' && otaUsesAction) {
      impl = 'CONFIRMED_PARTIAL';
      sev = sev || 'P1';
      rc = rc || 'RC-ESP32-OTA-ACTION';
      task = task || 'OTA-FIRMWARE-001';
      bp = bp || '固件 OTA JSON 使用 action 字段，目标为 op';
      actual = actual || 'ota action≠op';
    }
    if (deviceNameMacro && nimbleInitName && deviceNameMacro !== nimbleInitName && id === 'PROTO-001') {
      impl = 'CONFIRMED_PARTIAL';
      sev = 'P1';
      rc = 'RC-ESP32-LED-NAME';
      task = 'ESP32-PERIPHERAL-001';
      bp = bp || `DEVICE_NAME="${deviceNameMacro}" 但 NimBLEDevice::init("${nimbleInitName}")`;
    }
  }
  if (id === 'PROTO-009' || id === 'PROTO-010') {
    if (!hasObserver) {
      impl = 'CONFIRMED_MISSING';
      ver = 'BLOCKED_BY_FIXTURE';
      sev = 'P1';
      rc = 'RC-ESP32-OBSERVER';
      task = 'ESP32-OBSERVER-001';
      bp = 'fixture_observer 不存在';
      actual = 'Observer 缺失';
    }
  }
  if (id === 'PROTO-011' && !hasValidateOta) {
    impl = 'NOT_IMPLEMENTED';
    ver = 'AUTOMATED_FAIL';
    sev = 'P1';
    rc = 'RC-OTA-PACKAGE';
    task = 'OTA-PACKAGE-001';
    bp = '客户端 validateOtaPackage 缺失';
  }
  if (ev.fail.length) {
    ver = 'AUTOMATED_FAIL';
    bp = firstFailBp(ev) || bp;
    const m = mapFailToTask(bp, [id, bp]);
    if (m) {
      rc = m.rc; task = m.task; sev = m.sev || sev;
      if (impl === 'UNASSESSED') impl = 'CONFIRMED_PARTIAL';
    }
  } else if (ev.pass.length && impl === 'UNASSESSED') {
    impl = 'IMPLEMENTED_UNTESTED'; ver = 'AUTOMATED_PASS';
  }

  pushRecord({
    target_id: id,
    target_type: 'protocol',
    gap_kind: meta.kind,
    priority: 'Must',
    implementation_status: impl,
    verification_status: ver,
    severity: sev,
    evidence_level: 'E5',
    implementation_refs: refs,
    expected: meta.name,
    actual,
    first_breakpoint: bp,
    root_cause_id: rc,
    task_id: task,
    release_blocking: true,
    protocol_members: id.startsWith('PROTO-00') && Number(id.slice(-3)) <= 3
      ? (bleFixture.services || []).map((s) => ({ service_uuid: s.uuid, characteristics: s.characteristics?.map((c) => c.uuid) }))
      : [],
  });
}

// Fix protocol_members on records (schema may disallow extra) — store only in esp32 slice
for (const r of records) {
  if ('protocol_members' in r) delete r.protocol_members;
}

// ---- CLAIM ----
for (const c of landing.claims || []) {
  const ev = evidenceFor(c.id);
  const fake = landingFakeDownload && /下载|APK|Windows|macOS|产物|SHA|二维码|入口/.test(JSON.stringify(c));
  let impl = 'UNASSESSED';
  let ver = 'NOT_EXECUTED';
  let sev = null;
  let rc = null;
  let task = 'VERIFY-E6-001';
  let bp = 'E6 NOT_EXECUTED';
  let actual = '待 E6 发布门验证';
  if (fake) {
    impl = 'CONFIRMED_PARTIAL';
    ver = 'AUTOMATED_FAIL';
    sev = 'P0';
    rc = 'RC-LANDING-FAKE-DOWNLOAD';
    task = 'PUBLIC-HONESTY-001';
    bp = 'docs/index.md download-hub → releases/latest';
    actual = '落地页/产物声明与证据不匹配或假下载';
  }
  if (ev.fail.length) {
    ver = 'AUTOMATED_FAIL';
    bp = firstFailBp(ev) || bp;
    const m = mapFailToTask(bp, [c.id, bp]);
    if (m) { rc = m.rc; task = m.task; sev = m.sev || sev; impl = 'CONFIRMED_PARTIAL'; }
  } else if (ev.pass.length && impl === 'UNASSESSED') {
    impl = 'IMPLEMENTED_UNTESTED'; ver = 'AUTOMATED_PASS';
  }
  pushRecord({
    target_id: c.id,
    target_type: 'claim',
    gap_kind: 'LANDING',
    priority: 'Must',
    implementation_status: impl,
    verification_status: ver,
    severity: sev,
    evidence_level: 'E6',
    expected: c.statement || c.title || c.id,
    actual,
    first_breakpoint: bp,
    root_cause_id: rc,
    task_id: task,
    release_blocking: true,
    test_ids: c.tests || [],
  });
}

// ---- ERR / DATA / SEC / NFR / DEC / EVID / TEST catalog (mostly UNASSESSED) ----
function pushCatalog(ids, type, gapKind = 'PRODUCT') {
  for (const id of ids) {
    const ev = evidenceFor(id);
    let impl = 'UNASSESSED';
    let ver = 'NOT_EXECUTED';
    let sev = null;
    let rc = null;
    let task = null;
    let bp = '';
    let actual = '';
    let kind = gapKind;
    if (ev.fail.length) {
      ver = 'AUTOMATED_FAIL';
      bp = firstFailBp(ev);
      actual = ev.fail[0].actual || bp;
      const m = mapFailToTask(bp, [id, bp]);
      if (m) {
        rc = m.rc; task = m.task; sev = m.sev; kind = m.kind;
        impl = /NOT_IMPLEMENTED|缺失/.test(actual) ? 'NOT_IMPLEMENTED' : 'CONFIRMED_PARTIAL';
      } else {
        impl = 'CONFIRMED_PARTIAL';
      }
    } else if (ev.pass.length) {
      impl = 'IMPLEMENTED_UNTESTED';
      ver = 'AUTOMATED_PASS';
      actual = 'structured current PASS';
    }
    pushRecord({
      target_id: id,
      target_type: type,
      gap_kind: kind,
      priority: 'Must',
      implementation_status: impl,
      verification_status: ver,
      severity: sev,
      expected: id,
      actual,
      first_breakpoint: bp,
      root_cause_id: rc,
      task_id: task,
      release_blocking: sev === 'P0',
    });
  }
}

pushCatalog(ERR_IDS.slice(0, 68), 'error', 'PRODUCT');
pushCatalog(DATA_IDS.slice(0, 13), 'data', 'PRODUCT');
pushCatalog(SEC_IDS.slice(0, 19), 'security', 'PRODUCT');
pushCatalog(NFR_IDS.slice(0, 24), 'nfr', 'PRODUCT');
pushCatalog(DEC_IDS.slice(0, 17), 'decision', 'PRODUCT');
pushCatalog(EVID_IDS.slice(0, 8), 'evidence', 'PRODUCT');
const testList = (TEST_CANON.length >= 100 ? TEST_CANON : TEST_IDS).slice(0, 103);
pushCatalog(testList, 'test', 'TESTABILITY');

// Release pipeline: Flutter/Tauri mainline ≠ UniApp+firmware target
if (releaseBuildsFlutter || releaseBuildsTauri) {
  for (const id of ['FEAT-066', 'CLAIM-001', 'EVID-008', 'PROTO-010']) {
    const rec = records.find((r) => r.target_id === id && r.dimension !== 'blocker');
    if (!rec) continue;
    rec.downstream_impact = [...new Set([...(rec.downstream_impact || []), 'RELEASE-PIPELINE-001: workflow builds Flutter/Tauri not UniApp+firmware'])];
  }
  // Anchor RC-RELEASE-PIPELINE on PROTO-010 (Release Metadata Schema) as confirmed P0 product/release gap
  const proto10 = records.find((r) => r.target_id === 'PROTO-010');
  if (proto10) {
    proto10.gap_kind = 'RELEASE';
    proto10.severity = 'P0';
    proto10.root_cause_id = 'RC-RELEASE-PIPELINE';
    proto10.task_id = 'RELEASE-PIPELINE-001';
    proto10.implementation_status = 'CONFIRMED_PARTIAL';
    proto10.verification_status = proto10.verification_status === 'AUTOMATED_PASS' ? proto10.verification_status : (proto10.verification_status || 'NOT_EXECUTED');
    proto10.first_breakpoint = '.github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + Peripheral/Observer firmware';
    proto10.actual = `flutter=${releaseBuildsFlutter} tauri=${releaseBuildsTauri} uniapp=${releaseBuildsUniapp}`;
    proto10.release_blocking = true;
    proto10.implementation_refs = [{ path: '.github/workflows/release-build.yml', symbol: 'jobs', line_hint: 'Flutter APK / Tauri MSI' }];
  }
}

// ---------------------------------------------------------------------------
// ESP32 full inventory (for esp32.json + coverage)
// ---------------------------------------------------------------------------
const esp32Inventory = {
  build: {
    envs: pioEnvs,
    expected_envs: ['fixture_peripheral', 'fixture_observer'],
    upload_port: uploadPort,
    no_fixed_serial_port_target: true,
    status: pioEnvs.length === 1 && uploadPort === 'COM3' ? 'CONFIRMED_PARTIAL' : 'UNASSESSED',
    first_breakpoint: '仅 env:esp32dev 且 upload_port=COM3',
    task_id: 'ESP32-BUILD-001',
    root_cause_id: 'RC-ESP32-BUILD',
  },
  names: {
    DEVICE_NAME_macro: deviceNameMacro,
    nimble_init: nimbleInitName,
    observer_name_present: hasObserver,
    mismatch: deviceNameMacro !== nimbleInitName,
    task_id: 'ESP32-PERIPHERAL-001',
  },
  services: (bleFixture.services || []).map((s) => ({
    contract_id: s.id,
    uuid: s.uuid,
    characteristics: (s.characteristics || []).map((c) => ({
      uuid: c.uuid,
      name: c.name,
      expected_properties: c.properties,
      present_in_firmware: FACTS.esp32.toLowerCase().includes(c.uuid.toLowerCase()),
    })),
  })),
  led_commands: (bleFixture.led_commands || []).map((cmd) => ({
    ...cmd,
    present: new RegExp(cmd.hex, 'i').test(FACTS.esp32),
  })),
  ota: {
    firmware_field: otaUsesAction ? 'action' : 'op_or_other',
    target_field: 'op',
    client_writes_ctrl: otaWritesCtrl,
    client_validate_package: hasValidateOta,
  },
  fault_injection: (bleFixture.fault_injection || []).map((f) => ({
    id: f.id,
    present: FACTS.esp32.includes(f.id),
    status: FACTS.esp32.includes(f.id) ? 'CONFIRMED_IMPLEMENTED' : 'CONFIRMED_MISSING',
  })),
  serial_json: bleFixture.serial_json,
  observer: {
    present: hasObserver,
    severity: 'P1',
    task_id: 'ESP32-OBSERVER-001',
    root_cause_id: 'RC-ESP32-OBSERVER',
  },
  artifact: {
    manifest_present: exists('hardware/esp32/LightBLE/manifest.json'),
    status: 'CONFIRMED_MISSING',
  },
  path: 'hardware/esp32/LightBLE/src/main.cpp',
};

// ---------------------------------------------------------------------------
// Coverage / severity / blockers
// ---------------------------------------------------------------------------
function countBy(field) {
  const m = {};
  for (const r of records) {
    const k = String(r[field]);
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

function coverageBucket(type, ids, expected) {
  // Prefer exact target_id membership; blocker synthetic ids excluded
  const typed = records.filter((r) => ids.includes(r.target_id) && r.dimension !== 'blocker');
  // Assessed = confirmed static status OR automated pass/fail evidence (toolchain-only block + UNASSESSED ≠ assessed)
  const assessed = typed.filter((r) =>
    r.implementation_status !== 'UNASSESSED'
    || ['AUTOMATED_PASS', 'AUTOMATED_FAIL'].includes(r.verification_status));
  return {
    total: expected,
    listed: ids.length,
    assessed: assessed.length,
    unassessed: Math.max(0, expected - assessed.length),
    not_applicable: 0,
    reason: ids.length === expected ? null : `extracted=${ids.length}, canonical_expected=${expected}`,
  };
}

const uniqueRootBySev = { P0: 0, P1: 0, P2: 0, P3: 0 };
const usedRc = new Set(records.map((r) => r.root_cause_id).filter(Boolean));
for (const rc of ROOT_CAUSES) {
  if (usedRc.has(rc.id) && rc.severity && uniqueRootBySev[rc.severity] !== undefined) {
    uniqueRootBySev[rc.severity] += 1;
  }
}

const affectedBySev = { P0: 0, P1: 0, P2: 0, P3: 0, null: 0 };
for (const r of records) {
  const s = r.severity == null ? 'null' : r.severity;
  if (affectedBySev[s] !== undefined) affectedBySev[s] += 1;
  else affectedBySev[s] = 1;
}

const blockers = [
  {
    blocker_id: 'BLK-TOOL-PLAYWRIGHT',
    type: 'TOOLCHAIN',
    status: playwrightBlocked ? 'OPEN' : 'CLEARED',
    description: '@playwright/test 未安装 → 页面 E4 BLOCKED_BY_TOOLCHAIN',
    task_id: 'ENV-PLAYWRIGHT-001',
  },
  {
    blocker_id: 'BLK-TEST-PAGE-DRIVER',
    type: 'TESTABILITY',
    status: driverBlocked ? 'OPEN' : 'CLEARED',
    description: 'TARGET_PAGE_DRIVER 未实现',
    task_id: 'TEST-PAGE-DRIVER-001',
  },
  {
    blocker_id: 'BLK-TOOL-PLATFORMIO',
    type: 'TOOLCHAIN',
    status: 'OPEN',
    description: 'PlatformIO 可能未安装 → ESP32 build NOT_EXECUTED（本轮禁止 upload）',
    task_id: 'ESP32-BUILD-001',
  },
  {
    blocker_id: 'BLK-HW-ANDROID',
    type: 'FIXTURE',
    status: 'OPEN',
    description: 'adb devices 可能为空 → HARDWARE_PENDING',
    task_id: 'VERIFY-ANDROID-001',
  },
  {
    blocker_id: 'BLK-HW-ESP32',
    type: 'FIXTURE',
    status: 'OPEN',
    description: '无 ESP32 USB 串口 / Observer 夹具 → BLOCKED_BY_FIXTURE',
    task_id: 'VERIFY-ESP32-001',
  },
];

const firstBreakpoints = [];
const seenBp = new Set();
for (const r of records) {
  if (!r.first_breakpoint || !r.severity) continue;
  const key = `${r.root_cause_id || ''}::${r.first_breakpoint.slice(0, 120)}`;
  if (seenBp.has(key)) continue;
  seenBp.add(key);
  firstBreakpoints.push({
    target_id: r.target_id,
    severity: r.severity,
    gap_kind: r.gap_kind,
    first_breakpoint: r.first_breakpoint,
    root_cause_id: r.root_cause_id,
    task_id: r.task_id,
    verification_status: r.verification_status,
  });
}
firstBreakpoints.sort((a, b) => {
  const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9) || a.target_id.localeCompare(b.target_id);
});

const recommendedOrder = topoSort(TASKS).filter((id) => {
  const t = TASKS.find((x) => x.task_id === id);
  return t && t.status !== 'DONE';
});
const taskNodes = TASKS.map((t) => ({
  task_id: t.task_id,
  task_type: t.task_type,
  title: t.title,
  root_cause_id: t.root_cause_id,
  severity: t.severity,
  status: t.status || 'PLANNED',
  dependencies: t.deps || [],
  unlocks: TASKS.filter((x) => (x.deps || []).includes(t.task_id)).map((x) => x.task_id),
  gap_count: records.filter((r) => r.task_id === t.task_id).length,
  target_ids: [...new Set(records.filter((r) => r.task_id === t.task_id).map((r) => r.target_id))].slice(0, 40),
  test_ids: [...new Set(records.filter((r) => r.task_id === t.task_id).flatMap((r) => r.test_ids || []))].slice(0, 40),
  first_breakpoint: records.find((r) => r.task_id === t.task_id)?.first_breakpoint || '',
  implementation_files: [],
  forbidden_files: ['apps/uniapp/** (until TP-G3)', 'docs/target-product/**', 'contracts/target/** product semantics'],
  automated_acceptance: 'related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL',
  build_acceptance: 'verify-uniapp + docs build',
  e5_acceptance: t.task_type === 'VERIFY_E5' ? 'hardware matrix executed' : 'n/a until VERIFY_*',
  e6_acceptance: t.task_type === 'VERIFY_E6' ? 'clean machine release gate' : 'n/a',
  risk: 'may touch multi-page / protocol surfaces in TP-G3',
  commit_message: `${t.task_type.toLowerCase()}(${t.task_id.toLowerCase()}): ${t.title}`,
}));

const taskGraph = {
  schema_version: '2.0',
  gate: 'TP-G2-R1',
  nodes: taskNodes,
  dependencies: TASKS.flatMap((t) => (t.deps || []).map((d) => ({ from: d, to: t.task_id }))),
  recommended_order: recommendedOrder,
};

const commit = gitHead();
const generatedAt = new Date().toISOString();

const coverage = {
  gate: 'TP-G2-R1',
  schema_version: '2.0',
  generated_at: generatedAt,
  commit,
  structured_current_path: structured.path ? structured.path.replace(`${ROOT}/`, '') : null,
  system: system ? {
    SYSTEM_PASS: system.SYSTEM_PASS,
    SYSTEM_FAIL: system.SYSTEM_FAIL,
    HARNESS_PASS: system.HARNESS_PASS,
    HARNESS_FAIL: system.HARNESS_FAIL,
    TARGET_CONTRACT_FAIL: system.TARGET_CONTRACT_FAIL,
    TEST_INFRA_FAIL: system.TEST_INFRA_FAIL ?? 0,
  } : null,
  current: {
    CURRENT_PASS: current.CURRENT_PASS,
    CURRENT_FAIL: current.CURRENT_FAIL,
    TEST_INFRA_FAIL: current.TEST_INFRA_FAIL ?? 0,
    cases: current.cases.length,
    layers: current.layers || null,
    pages: current.pages || null,
    blocked: current.blocked || null,
  },
  targets: {
    REQ: coverageBucket('requirement', REQ_IDS, EXPECTED_TOTALS.REQ),
    FEAT: coverageBucket('feature', FEAT_IDS, EXPECTED_TOTALS.FEAT),
    PAGE: coverageBucket('page', PAGE_IDS, EXPECTED_TOTALS.PAGE),
    WEB: coverageBucket('web', WEB_IDS, EXPECTED_TOTALS.WEB),
    STATE: coverageBucket('state', STATE_IDS, EXPECTED_TOTALS.STATE),
    OP: coverageBucket('operation', OP_IDS, EXPECTED_TOTALS.OP),
    FLOW: coverageBucket('flow', FLOW_IDS, EXPECTED_TOTALS.FLOW),
    ERR: coverageBucket('error', ERR_IDS.slice(0, 68), EXPECTED_TOTALS.ERR),
    DATA: coverageBucket('data', DATA_IDS.slice(0, 13), EXPECTED_TOTALS.DATA),
    PROTO: coverageBucket('protocol', PROTO_IDS, EXPECTED_TOTALS.PROTO),
    SEC: coverageBucket('security', SEC_IDS.slice(0, 19), EXPECTED_TOTALS.SEC),
    NFR: coverageBucket('nfr', NFR_IDS.slice(0, 24), EXPECTED_TOTALS.NFR),
    CLAIM: coverageBucket('claim', CLAIM_IDS, EXPECTED_TOTALS.CLAIM),
    DEC: coverageBucket('decision', DEC_IDS.slice(0, 17), EXPECTED_TOTALS.DEC),
    EVID: coverageBucket('evidence', EVID_IDS.slice(0, 8), EXPECTED_TOTALS.EVID),
    TEST: coverageBucket('test', testList, EXPECTED_TOTALS.TEST),
  },
  records_total: records.length,
  by_gap_kind: countBy('gap_kind'),
  by_implementation_status: countBy('implementation_status'),
  by_verification_status: countBy('verification_status'),
  by_severity: countBy('severity'),
  unique_root_causes_by_severity: uniqueRootBySev,
  affected_target_records_by_severity: affectedBySev,
  product_vs_testability: {
    product_gaps_with_severity: records.filter((r) => !['TESTABILITY', 'TOOLCHAIN'].includes(r.gap_kind) && r.severity).length,
    testability_records: records.filter((r) => r.gap_kind === 'TESTABILITY').length,
    blocked_page_cases: current.pages?.blocked_cases || 0,
    note: 'blocked_page_cases 不得计为产品缺陷数；Playwright 与 Page Driver 为独立 blocker',
  },
};

const hashPayload = {
  schema_version: '2.0',
  gate: 'TP-G2-R1',
  commit,
  records,
  coverage: { ...coverage, generated_at: null },
  firstBreakpoints,
  taskGraph: { ...taskGraph },
  root_causes: ROOT_CAUSES,
  blockers,
  esp32Inventory,
};
const contentHash = sha(hashPayload);

const report = {
  schema_version: '2.0',
  gate: 'TP-G2-R1',
  content_hash: contentHash,
  generated_at: generatedAt,
  commit,
  unique_root_causes_by_severity: uniqueRootBySev,
  affected_target_records_by_severity: affectedBySev,
  coverage,
  blockers,
  root_causes: ROOT_CAUSES.filter((rc) => usedRc.has(rc.id) || rc.id.startsWith('RC-')),
  records,
};

const SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://smart-ble.local/reports/target-vs-current/report.schema.json',
  title: 'Smart BLE target vs current gap report v2 (TP-G2-R1)',
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version', 'gate', 'content_hash', 'generated_at', 'commit',
    'unique_root_causes_by_severity', 'affected_target_records_by_severity',
    'coverage', 'blockers', 'root_causes', 'records',
  ],
  properties: {
    schema_version: { const: '2.0' },
    gate: { const: 'TP-G2-R1' },
    content_hash: { type: 'string', minLength: 64, maxLength: 64 },
    generated_at: { type: 'string' },
    commit: { type: 'string', pattern: '^[0-9a-f]{7,40}$|UNKNOWN' },
    unique_root_causes_by_severity: {
      type: 'object',
      additionalProperties: false,
      required: ['P0', 'P1', 'P2', 'P3'],
      properties: { P0: { type: 'integer' }, P1: { type: 'integer' }, P2: { type: 'integer' }, P3: { type: 'integer' } },
    },
    affected_target_records_by_severity: { type: 'object' },
    coverage: { type: 'object' },
    blockers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['blocker_id', 'type', 'status', 'description', 'task_id'],
        properties: {
          blocker_id: { type: 'string' },
          type: { type: 'string', enum: ['TOOLCHAIN', 'TESTABILITY', 'FIXTURE', 'CREDENTIAL', 'ENVIRONMENT'] },
          status: { type: 'string', enum: ['OPEN', 'CLEARED'] },
          description: { type: 'string' },
          task_id: { type: ['string', 'null'] },
        },
      },
    },
    root_causes: { type: 'array' },
    records: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'target_id', 'target_type', 'dimension', 'gap_kind', 'priority',
          'implementation_status', 'verification_status', 'severity', 'evidence_level',
          'implementation_refs', 'test_ids', 'test_results', 'expected', 'actual',
          'first_breakpoint', 'downstream_impact', 'dependencies', 'root_cause_id',
          'task_id', 'release_blocking', 'static_implementation', 'e4_verification', 'e5_verification',
        ],
        properties: {
          target_id: { type: 'string' },
          target_type: {
            type: 'string',
            enum: [
              'requirement', 'feature', 'page', 'web', 'state', 'operation', 'flow',
              'protocol', 'claim', 'error', 'data', 'security', 'nfr', 'decision',
              'evidence', 'test',
            ],
          },
          dimension: { type: 'string' },
          gap_kind: {
            type: 'string',
            enum: ['PRODUCT', 'RUNTIME', 'PAGE', 'FIRMWARE', 'SMART_HID', 'LANDING', 'RELEASE', 'TESTABILITY', 'TOOLCHAIN'],
          },
          priority: { type: 'string', enum: ['Must', 'Should', 'Could', 'Won\'t'] },
          implementation_status: {
            type: 'string',
            enum: [
              'UNASSESSED', 'NOT_IMPLEMENTED', 'CONFIRMED_IMPLEMENTED', 'CONFIRMED_PARTIAL',
              'CONFIRMED_MISSING', 'IMPLEMENTED_UNTESTED', 'PARTIAL', 'N/A',
            ],
          },
          verification_status: {
            type: 'string',
            enum: [
              'AUTOMATED_PASS', 'AUTOMATED_FAIL', 'BUILD_PASS', 'BUILD_FAIL',
              'HARDWARE_PENDING', 'HARDWARE_FAIL', 'BLOCKED_BY_PROTOCOL', 'BLOCKED_BY_FIXTURE',
              'BLOCKED_BY_TOOLCHAIN', 'BLOCKED_BY_TARGET_DRIVER', 'BLOCKED_BY_CREDENTIAL',
              'NOT_EXECUTED', 'PASS', 'N/A',
            ],
          },
          static_implementation: { type: ['string', 'null'] },
          e4_verification: { type: ['string', 'null'] },
          e5_verification: { type: ['string', 'null'] },
          severity: { type: ['string', 'null'], enum: ['P0', 'P1', 'P2', 'P3', null] },
          evidence_level: { type: ['string', 'null'], enum: ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', null] },
          implementation_refs: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['path', 'symbol', 'line_hint'],
              properties: {
                path: { type: 'string' },
                symbol: { type: 'string' },
                line_hint: { type: 'string' },
              },
            },
          },
          test_ids: { type: 'array', items: { type: 'string' } },
          test_results: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['test_id', 'status', 'case_id', 'first_breakpoint'],
              properties: {
                test_id: { type: ['string', 'null'] },
                status: { type: 'string', enum: ['PASS', 'FAIL', 'BLOCKED', 'NOT_EXECUTED'] },
                case_id: { type: ['string', 'null'] },
                first_breakpoint: { type: ['string', 'null'] },
              },
            },
          },
          expected: { type: 'string' },
          actual: { type: 'string' },
          first_breakpoint: { type: 'string' },
          downstream_impact: { type: 'array', items: { type: 'string' } },
          dependencies: { type: 'array', items: { type: 'string' } },
          root_cause_id: { type: ['string', 'null'] },
          task_id: { type: ['string', 'null'] },
          release_blocking: { type: 'boolean' },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Write outputs
// ---------------------------------------------------------------------------
function emitAll(outDir) {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(`${outDir}/logs`, { recursive: true });
  writeJson(`${outDir}/report.schema.json`, SCHEMA);
  writeJson(`${outDir}/target-vs-current.json`, report);
  writeJson(`${outDir}/coverage.json`, coverage);
  writeJson(`${outDir}/first-breakpoints.json`, { top20: firstBreakpoints.slice(0, 20), all: firstBreakpoints });
  writeJson(`${outDir}/task-dependency-graph.json`, taskGraph);
  // keep legacy filename pointing note
  writeJson(`${outDir}/fix-dependency-graph.json`, {
    superseded_by: 'task-dependency-graph.json',
    note: 'TP-G2-R1 uses tasks not FIX-*; see task-dependency-graph.json',
    recommended_order: recommendedOrder,
  });
  writeJson(`${outDir}/pages.json`, {
    pages: records.filter((r) => r.target_type === 'page' || r.target_type === 'web'),
    states: records.filter((r) => r.target_type === 'state'),
    operations: records.filter((r) => r.target_type === 'operation'),
    automation_blockers: records.filter((r) => r.dimension === 'blocker'),
    blocked: current.pages || null,
  });
  writeJson(`${outDir}/runtime.json`, { records: records.filter((r) => r.gap_kind === 'RUNTIME') });
  writeJson(`${outDir}/esp32.json`, {
    inventory: esp32Inventory,
    records: records.filter((r) => r.gap_kind === 'FIRMWARE' || (r.target_type === 'protocol' && String(r.target_id).startsWith('PROTO-'))),
  });
  writeJson(`${outDir}/smart-hid.json`, {
    note: 'FEAT-053..059 Node TS import bridge → TEST-BRIDGE-TS-001 (TESTABILITY), not product NOT_IMPLEMENTED',
    profile_imports_ts: smartHidImportsTs,
    records: records.filter((r) => r.gap_kind === 'SMART_HID' || r.task_id === 'TEST-BRIDGE-TS-001' || /^FEAT-05[3-9]$/.test(r.target_id)),
  });
  writeJson(`${outDir}/landing-release.json`, {
    landing_fake_download: landingFakeDownload,
    version_ssot_ready: versionSsotReady,
    page_version_ready: pageVersionReady,
    release_builds_flutter: releaseBuildsFlutter,
    release_builds_tauri: releaseBuildsTauri,
    release_builds_uniapp: releaseBuildsUniapp,
    tasks: ['PUBLIC-HONESTY-001', 'VERSION-METADATA-001', 'RELEASE-PIPELINE-001', 'PAGE-VERSION-001'],
    records: records.filter((r) => r.gap_kind === 'LANDING' || r.gap_kind === 'RELEASE'),
  });
  writeJson(`${outDir}/tests.json`, {
    system,
    current: {
      CURRENT_PASS: current.CURRENT_PASS,
      CURRENT_FAIL: current.CURRENT_FAIL,
      TEST_INFRA_FAIL: current.TEST_INFRA_FAIL,
      cases: current.cases,
      layers: current.layers,
      pages: current.pages,
      blocked: current.blocked,
    },
    structured_path: structured.path ? structured.path.replace(`${ROOT}/`, '') : null,
    testability: records.filter((r) => r.gap_kind === 'TESTABILITY'),
  });
  writeFileSync(`${outDir}/logs/INDEX.md`, `# TP-G2-R1 日志索引

- structured: \`.tmp/tp-g2/logs/current-structured.json\` (fallback current-r3d.json)
- system: \`.tmp/tp-g2/logs/system-r3d.json\` / system.json
- content_hash: \`${contentHash}\`
- commit: \`${commit}\`

日志默认不入库。
`);
  writeJson(`${outDir}/content-hash.json`, { content_hash: contentHash, commit, gate: 'TP-G2-R1' });
}

emitAll(CHILD_OUT);

function schemaIshValidate(rep) {
  const errs = [];
  if (rep.schema_version !== '2.0') errs.push('schema_version');
  if (rep.gate !== 'TP-G2-R1') errs.push('gate');
  if (!/^[0-9a-f]{40}$/.test(rep.commit) && rep.commit !== 'UNKNOWN') errs.push('commit');
  for (const r of rep.records) {
    if (!r.target_id) errs.push('missing target_id');
    if (r.target_type === 'protocol' && !/^PROTO-\d{3}$/.test(r.target_id)) {
      errs.push(`bad proto id ${r.target_id}`);
    }
    if (r.verification_status === 'AUTOMATED_FAIL' && !r.first_breakpoint) {
      errs.push(`fail without bp ${r.target_id}`);
    }
  }
  // unique target_id+dimension
  const keys = new Set();
  for (const r of rep.records) {
    const k = `${r.target_id}::${r.dimension}`;
    if (keys.has(k)) errs.push(`dup ${k}`);
    keys.add(k);
  }
  return errs;
}

if (IS_CHILD) {
  process.stdout.write(`${contentHash}\n`);
  process.exit(0);
}

const errs = schemaIshValidate(report);
if (errs.length) {
  console.error('schema-ish validation errors:', errs.slice(0, 20));
  process.exit(1);
}

// Dual independent process determinism
function runChildEmit(tmpDir) {
  mkdirSync(tmpDir, { recursive: true });
  const script = fileURLToPath(import.meta.url);
  const r = spawnSync(process.execPath, [script, '--child-emit', '--out', tmpDir], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error(`child emit failed: ${r.stderr || r.stdout}`);
  }
  const hashFile = JSON.parse(readFileSync(`${tmpDir}/content-hash.json`, 'utf8'));
  // normalize: strip generated_at from written report and rehash
  const childReport = JSON.parse(readFileSync(`${tmpDir}/target-vs-current.json`, 'utf8'));
  const childCoverage = JSON.parse(readFileSync(`${tmpDir}/coverage.json`, 'utf8'));
  const childTasks = JSON.parse(readFileSync(`${tmpDir}/task-dependency-graph.json`, 'utf8'));
  const childBp = JSON.parse(readFileSync(`${tmpDir}/first-breakpoints.json`, 'utf8'));
  const childEsp = JSON.parse(readFileSync(`${tmpDir}/esp32.json`, 'utf8'));
  const normalized = {
    schema_version: childReport.schema_version,
    gate: childReport.gate,
    commit: childReport.commit,
    records: childReport.records,
    coverage: { ...childCoverage, generated_at: null },
    firstBreakpoints: childBp.all,
    taskGraph: childTasks,
    root_causes: childReport.root_causes,
    blockers: childReport.blockers,
    esp32Inventory: childEsp.inventory,
  };
  return { stdout_hash: (r.stdout || '').trim(), file_hash: hashFile.content_hash, normalized_hash: sha(normalized) };
}

const tmpA = `${ROOT}/.tmp/tp-g2/gap-hash-a`;
const tmpB = `${ROOT}/.tmp/tp-g2/gap-hash-b`;
rmSync(tmpA, { recursive: true, force: true });
rmSync(tmpB, { recursive: true, force: true });
const a = runChildEmit(tmpA);
const b = runChildEmit(tmpB);
if (a.normalized_hash !== b.normalized_hash || a.file_hash !== b.file_hash) {
  console.error('FAIL: dual-process content hash drift', { a, b });
  process.exit(1);
}
if (a.normalized_hash !== contentHash && a.file_hash !== contentHash) {
  // parent and child should match excluding generated_at — file_hash from child equals parent contentHash
  if (a.file_hash !== contentHash) {
    console.error('FAIL: parent/child hash mismatch', { parent: contentHash, child: a.file_hash });
    process.exit(1);
  }
}

console.log(JSON.stringify({
  ok: true,
  gate: 'TP-G2-R1',
  content_hash: contentHash,
  commit,
  records: records.length,
  CURRENT_PASS: current.CURRENT_PASS,
  CURRENT_FAIL: current.CURRENT_FAIL,
  TEST_INFRA_FAIL: current.TEST_INFRA_FAIL ?? 0,
  unique_root_causes_by_severity: uniqueRootBySev,
  affected_target_records_by_severity: affectedBySev,
  task_count: TASKS.length,
  recommended_first_5: recommendedOrder.slice(0, 5),
  dual_process_hash: a.normalized_hash,
  pages_blocked_cases: current.pages?.blocked_cases,
}, null, 2));
