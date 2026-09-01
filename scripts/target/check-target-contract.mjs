#!/usr/bin/env node
// scripts/target/check-target-contract.mjs
// TEST-C-001 / 002 / 003 / 008 / 010 / 011 / 014 —— 产品目标契约与静态一致性检查。
// 用法：
//   node scripts/target/check-target-contract.mjs                 # 检查真实仓库
//   node scripts/target/check-target-contract.mjs --virtual f.json # 检查内存 Fixture（故意错误验证）

import { Checker, cliCtx, rowIds, headingIds, unique, duplicates, ID_PATTERNS } from './lib/check-utils.mjs';

const MD_DOCS = [
  'docs/target-product/00_DOCUMENT_CONTROL_AND_GLOSSARY.md',
  'docs/target-product/01_PRODUCT_VISION_SCOPE_AND_PRINCIPLES.md',
  'docs/target-product/02_PERSONAS_JOBS_AND_SCENARIOS.md',
  'docs/target-product/03_TARGET_FEATURE_CATALOG.md',
  'docs/target-product/04_INFORMATION_ARCHITECTURE_AND_NAVIGATION.md',
  'docs/target-product/05_TARGET_PAGE_CATALOG.md',
  'docs/target-product/06_TARGET_USER_FLOWS.md',
  'docs/target-product/07_INTERACTION_STATE_AND_ERROR_MODEL.md',
  'docs/target-product/08_PLATFORM_CAPABILITY_AND_DEGRADATION_MATRIX.md',
  'docs/target-product/09_DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY.md',
  'docs/target-product/10_RUNTIME_ARCHITECTURE_AND_RESOURCE_OWNERSHIP.md',
  'docs/target-product/11_BLE_GATT_PROTOCOL_CONTRACT.md',
  'docs/target-product/12_ESP32_FIXTURE_CONTRACT.md',
  'docs/target-product/13_SMART_HID_PROFILE_CONTRACT.md',
  'docs/target-product/14_OBSERVABILITY_LOGGING_AND_EVIDENCE.md',
  'docs/target-product/15_SECURITY_AND_THREAT_MODEL.md',
  'docs/target-product/16_NON_FUNCTIONAL_REQUIREMENTS.md',
  'docs/target-product/17_ACCESSIBILITY_I18N_AND_CONTENT_GUIDE.md',
  'docs/target-product/18_VERSION_RELEASE_METADATA_AND_PUBLIC_STATUS.md',
  'docs/target-product/19_OPEN_SOURCE_DEVELOPER_EXPERIENCE.md',
  'docs/target-product/20_OPERATIONS_SUPPORT_AND_MAINTENANCE.md',
  'docs/target-product/21_RISK_REGISTER_AND_DECISION_LOG.md',
  'docs/target-product/22_TARGET_TRACEABILITY_MATRIX.md',
  'docs/target-product/23_DEFINITION_OF_DONE.md',
];
const PAGE_DOCS = [
  'docs/target-product/pages/PAGE-001_SCAN.md',
  'docs/target-product/pages/PAGE-002_HID_PROVISION.md',
  'docs/target-product/pages/PAGE-003_HID_DETAIL.md',
  'docs/target-product/pages/PAGE-004_HID_HISTORY.md',
  'docs/target-product/pages/PAGE-005_HID_DIAGNOSTICS.md',
  'docs/target-product/pages/PAGE-006_DEVICE_DETAIL.md',
  'docs/target-product/pages/PAGE-007_CONNECTED.md',
  'docs/target-product/pages/PAGE-008_BROADCAST.md',
  'docs/target-product/pages/PAGE-009_ABOUT.md',
  'docs/target-product/pages/PAGE-010_VERSION.md',
];
const WEB_DOC = 'docs/target-product/web/WEB-001_LANDING_PAGE.md';
const TARGET_JSONS = [
  'contracts/target/product-target.json',
  'contracts/target/pages-target.json',
  'contracts/target/flows-target.json',
  'contracts/target/platform-target.json',
  'contracts/target/ble-fixture-target.json',
  'contracts/target/smart-hid-target.json',
  'contracts/target/landing-target.json',
];

const STATUS_VOCAB = ['VERIFIED', 'PREVIEW', 'BLOCKED', 'UNSUPPORTED', 'NOT_RELEASED'];

export function run(ctx) {
  const c = new Checker('check-target-contract');

  // ---------- 可用文档枚举（Fixture 派生时按存在性收敛） ----------
  const mdPaths = MD_DOCS.concat(PAGE_DOCS);
  if (ctx.exists(WEB_DOC)) mdPaths.push(WEB_DOC);

  // ---------- TEST-C-002 文档元数据与字段完整性 ----------
  for (const rel of TARGET_JSONS) {
    const j = ctx.readJson(rel);
    c.assert('TEST-C-002', 'contracts/' + rel.split('/').pop(), j.ok, `${rel} JSON 可解析${j.ok ? '' : '：' + j.error}`);
    if (!j.ok) continue;
    const d = j.data;
    const missing = ['schema_version', 'product_version', 'status', 'last_approved_at', 'approved_by'].filter((k) => !(k in d));
    c.assert('TEST-C-002', 'contracts/' + rel.split('/').pop(), missing.length === 0, `${rel} 必备字段齐全（缺 ${missing.join(',')}）`);
    // ---------- TEST-C-003 状态词与审批一致 ----------
    c.assert('TEST-C-003', 'contracts/' + rel.split('/').pop(), d.status === 'APPROVED' && d.approved_by === 'user',
      `${rel} 审批元数据应为 APPROVED/user（实际 ${d.status}/${d.approved_by}）`);
  }
  for (const rel of mdPaths) {
    const text = ctx.read(rel);
    const yaml = text.match(/```yaml\r?\n([\s\S]*?)```/);
    const hasMeta = yaml && ['status:', 'document_version:', 'owner:', 'last_reviewed:', 'approved_by:'].every((k) => yaml[1].includes(k));
    c.assert('TEST-C-002', rel.replace('docs/target-product/', ''), hasMeta, `${rel} 含完整 yaml 元数据块`);
    if (yaml) {
      c.assert('TEST-C-003', rel.replace('docs/target-product/', ''), /status:\s*APPROVED/.test(yaml[1]) && /approved_by:\s*user/.test(yaml[1]),
        `${rel} 状态应为 APPROVED/user`);
    }
  }

  // ---------- TEST-C-001 ID 唯一性与登记处一致性 ----------
  const pt = ctx.readJson('contracts/target/product-target.json');
  if (pt.ok) {
    const reqIds = pt.data.requirements.map((r) => r.id);
    const featIds = pt.data.features.map((f) => f.id);
    c.assert('TEST-C-001', 'REQ 全体', duplicates(reqIds).length === 0, `REQ 重复：${duplicates(reqIds).join(',') || '无'}`);
    c.assert('TEST-C-001', 'FEAT 全体', duplicates(featIds).length === 0, `FEAT 重复：${duplicates(featIds).join(',') || '无'}`);
    c.assert('TEST-C-001', 'REQ 全体', reqIds.every((id) => ID_PATTERNS.REQ.test(id)), 'REQ ID 形如 REQ-xxx');
    c.assert('TEST-C-001', 'FEAT 全体', featIds.every((id) => ID_PATTERNS.FEAT.test(id)), 'FEAT ID 形如 FEAT-xxx');

    // Markdown ↔ JSON 双向一致（登记处以唯一权威文档为准：REQ=01 号表行，FEAT=03 号标题）
    const doc01 = mdPaths.find((x) => x.endsWith('01_PRODUCT_VISION_SCOPE_AND_PRINCIPLES.md'));
    const doc03 = mdPaths.find((x) => x.endsWith('03_TARGET_FEATURE_CATALOG.md'));
    const mdAll = mdPaths.filter((p) => ctx.exists(p)).map((p) => ctx.read(p)).join('\n');
    const mdReq = doc01 && ctx.exists(doc01) ? unique(rowIds(ctx.read(doc01), ID_PATTERNS.REQ)) : unique(rowIds(mdAll, ID_PATTERNS.REQ));
    const mdFeat = doc03 && ctx.exists(doc03) ? unique(headingIds(ctx.read(doc03), ID_PATTERNS.FEAT)) : unique(headingIds(mdAll, ID_PATTERNS.FEAT));
    const contractOnlyReq = reqIds.filter((id) => !mdReq.includes(id));
    const mdOnlyReq = mdReq.filter((id) => !reqIds.includes(id));
    c.assert('TEST-C-001', 'REQ 全体', contractOnlyReq.length === 0 && mdOnlyReq.length === 0,
      `REQ 登记 JSON↔Markdown 一致（仅JSON:${contractOnlyReq.join(',')} 仅MD:${mdOnlyReq.join(',')}）`);
    const contractOnlyFeat = featIds.filter((id) => !mdFeat.includes(id));
    const mdOnlyFeat = mdFeat.filter((id) => !featIds.includes(id));
    c.assert('TEST-C-001', 'FEAT 全体', contractOnlyFeat.length === 0 && mdOnlyFeat.length === 0,
      `FEAT 登记 JSON↔Markdown 一致（仅JSON:${contractOnlyFeat.join(',')} 仅MD:${mdOnlyFeat.join(',')}）`);

    // ---------- TEST-C-008 FEAT→Test / REQ→FEAT 映射非空 ----------
    const featNoTest = featIds.filter((id) => {
      const f = pt.data.features.find((x) => x.id === id);
      return !f || !Array.isArray(f.planned_tests) || f.planned_tests.length === 0;
    });
    c.assert('TEST-C-008', 'FEAT 全体', featNoTest.length === 0, `每个 FEAT 必须有 planned_tests（缺：${featNoTest.slice(0, 6).join(',')}）`);
    const reqNoFeat = reqIds.filter((id) => {
      const r = pt.data.requirements.find((x) => x.id === id);
      return !r || !Array.isArray(r.features) || r.features.length === 0;
    });
    c.assert('TEST-C-008', 'REQ 全体', reqNoFeat.length === 0, `每个 REQ 必须映射 FEAT（缺：${reqNoFeat.slice(0, 6).join(',')}）`);

    // ---------- TEST-C-002 FEAT 优先级 Markdown↔JSON 逐项一致（03 号登记行为准） ----------
    const mdAll2 = mdPaths.filter((p) => ctx.exists(p)).map((p) => ctx.read(p)).join('\n');
    const prioDrift = [];
    for (const f of pt.data.features) {
      const re = new RegExp(`####\\s*${f.id}[^\\n]*\\n[\\s\\S]{0,400}?归属：[^｜
]*｜(?:[^｜
]*｜){0,5}[^｜
]*(Must|Should|Could)`, 'm');
      const m = mdAll2.match(re);
      if (m && m[1] !== f.priority) prioDrift.push(`${f.id}: md=${m[1]} json=${f.priority}`);
    }
    c.assert('TEST-C-002', 'FEAT 全体', prioDrift.length === 0, `FEAT 优先级 03 号↔product-target.json 一致（漂移：${prioDrift.join(';')}）`);
  }

  // 07/09 号：ERR / DATA 登记处完整性（ID 在多表引用属正常，唯一性以 unique 计数口径）
  const pageDocTexts = mdPaths.filter((p) => p.includes('/pages/')).map((p) => ctx.read(p)).join('\n');
  if (ctx.exists('docs/target-product/07_INTERACTION_STATE_AND_ERROR_MODEL.md')) {
    const t07 = ctx.read('docs/target-product/07_INTERACTION_STATE_AND_ERROR_MODEL.md');
    const errIds = unique(rowIds(t07, ID_PATTERNS.ERR));
    c.assert('TEST-C-010', 'ERR 全体', errIds.length >= 60, `07 号 ERR 登记 ≥60（实际 ${errIds.length}）`);
    const stateIds = unique(rowIds(t07, /^STATE-[A-Z0-9-]+/).concat(rowIds(pageDocTexts, /^STATE-[A-Z0-9-]+/)));
    c.assert('TEST-C-010', 'STATE 全体', stateIds.length >= 100, `07 号+页面文档 STATE 登记 ≥100（实际 ${stateIds.length}）`);
  }
  if (ctx.exists('docs/target-product/09_DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY.md')) {
    const t09 = ctx.read('docs/target-product/09_DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY.md');
    const dataIds = unique(rowIds(t09, ID_PATTERNS.DATA));
    c.assert('TEST-C-010', 'DATA 全体', dataIds.length >= 13, `09 号 DATA 登记 ≥13（实际 ${dataIds.length}）`);
  }

  // ---------- TEST-C-011 架构静态约束（对当前实现；虚拟 ctx 缺实现时跳过） ----------
  if (ctx.exists('apps/uniapp/pages')) {
    const pagesWithDirectCallback = [];
    const collectVue = (dir) => {
      // 轻量遍历：依赖 ctx 无 listDir，改为扫描已知页面路由对应的 vue 路径
      const routes = [];
      if (ctx.readJson('contracts/target/pages-target.json').ok) {
        routes.push(...ctx.readJson('contracts/target/pages-target.json').data.pages.map((p) => p.route));
      }
      return routes;
    };
    const routes = collectVue('apps/uniapp/pages');
    const GLOBAL_BLE_CALLBACKS = /uni\.on(BluetoothDeviceFound|BLEConnectionStateChange|BLECharacteristicValueChange|BluetoothAdapterStateChange)/;
    for (const r of routes) {
      const vue = `apps/uniapp/${r}.vue`;
      if (!ctx.exists(vue)) continue;
      if (GLOBAL_BLE_CALLBACKS.test(ctx.read(vue))) pagesWithDirectCallback.push(vue);
    }
    c.assert('TEST-C-011', 'FEAT-003/10号§2', pagesWithDirectCallback.length === 0,
      `页面禁止直接注册全局 BLE 回调（违规：${pagesWithDirectCallback.join(', ') || '无'}）`);
    const GENERIC = ['apps/uniapp/services/ble-runtime/index.js', 'apps/uniapp/utils/ble-utils.js'];
    const violating = GENERIC.filter((p) => ctx.exists(p) && /smart-hid|provisioning/.test(ctx.read(p)));
    c.assert('TEST-C-011', 'FEAT-053/TEST-C-007', violating.length === 0, `通用层禁止 import Smart HID（违规：${violating.join(', ') || '无'}）`);
  } else {
    c.assert('TEST-C-011', 'FEAT-003', true, '（虚拟 ctx 无实现，静态约束跳过）');
  }

  // ---------- TEST-C-014 决策默认方案一致性 ----------
  const decChecks = [
    ['docs/target-product/21_RISK_REGISTER_AND_DECISION_LOG.md', /DEC-016/, 'DEC-016 OTA 固件包已登记'],
    ['docs/target-product/21_RISK_REGISTER_AND_DECISION_LOG.md', /DEC-017/, 'DEC-017 统一订阅语义已登记'],
    ['docs/target-product/16_NON_FUNCTIONAL_REQUIREMENTS.md', /10\s*秒/, 'NFR 默认扫描时长 10 秒（DEC-013）'],
    ['docs/target-product/06_TARGET_USER_FLOWS.md', /10\s*秒/, 'FLOW-002 扫描时长 10 秒（DEC-013）'],
  ];
  for (const [rel, re, msg] of decChecks) {
    if (!ctx.exists(rel)) { c.assert('TEST-C-014', rel, true, `（文档缺失，跳过 ${msg}）`); continue; }
    c.assert('TEST-C-014', rel, re.test(ctx.read(rel)), msg);
  }

  // 平台状态词合法性（TEST-C-003）
  const pf = ctx.readJson('contracts/target/platform-target.json');
  if (pf.ok) {
    const bad = pf.data.platforms.filter((p) => !STATUS_VOCAB.includes(p.public_status_target));
    c.assert('TEST-C-003', 'PLATFORM 全体', bad.length === 0, `平台公开状态必须取自五词表（违规：${bad.map((b) => b.id + '=' + b.public_status_target).join(',')}）`);
    const vocab = (pf.data.product && pf.data.product.public_status_vocabulary) || (pt.ok && pt.data.product && pt.data.product.public_status_vocabulary) || [];
    c.assert('TEST-C-003', 'PRODUCT', !vocab.length || vocab.every((v) => STATUS_VOCAB.includes(v)), 'product.public_status_vocabulary 与五词表一致');
  }

  return c.report();
}

// ---------- CLI ----------
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('check-target-contract.mjs')) {
  const ctx = await cliCtx(import.meta.url);
  const r = run(ctx);
  for (const x of r.results) console.log(`${x.pass ? 'ok  ' : 'FAIL'} : [${x.testId}] ${x.message}`);
  console.log(`\n${r.checker}: ${r.pass ? 'PASS' : 'FAIL'}（${r.total - r.failureCount}/${r.total}）`);
  process.exit(r.pass ? 0 : 1);
}
