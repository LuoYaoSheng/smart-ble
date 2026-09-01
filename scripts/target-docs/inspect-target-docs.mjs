#!/usr/bin/env node
// scripts/target-docs/inspect-target-docs.mjs
//
// 用途：TP-G0 目标文档（docs/target-product/** + contracts/target/**）的一致性统计与校验。
// 职责边界：本脚本只负责"目标文档质量"（数量统计、REVIEW_SUMMARY 统计区单源校验），
//           不是 TP-G1 业务测试（tests/target/**），也不校验业务实现。
//
// 用法：
//   node scripts/target-docs/inspect-target-docs.mjs            # 统计 + 校验 REVIEW_SUMMARY 统计区（不一致 exit 1）
//   node scripts/target-docs/inspect-target-docs.mjs --update   # 统计 + 重写 REVIEW_SUMMARY 统计区
//   node scripts/target-docs/inspect-target-docs.mjs --json     # 仅输出 JSON 统计
//
// 统计口径（定义处行首匹配，跨文档引用不计入）：
//   REQ    docs/target-product/01、22 的 `| REQ-xxx |` 表行（去重）
//   FEAT   docs/target-product/03 的 `#### FEAT-xxx` 标题
//   OP     页面/WEB 文档第 7 节 `| OP-xxx |` 表行（含"已废弃"或删除线的行不计）
//   STATE  各登记表 `| STATE-xxx |` 表行（去重；含 STATE-OTA-ERR）
//   ERR/DATA/PROTO/SEC/NFR/CLAIM/RISK/EVID 各唯一登记处表行
//   DEC    21 号文档 `### DEC-xxx` 标题
//   TEST   contracts/target/test-traceability.json（机器登记处）
//   Mermaid docs/target-product/**/*.md 中 ```mermaid 代码块数

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(root, 'docs', 'target-product');
const CONTRACTS = join(root, 'contracts', 'target');
const REVIEW_SUMMARY = join(DOCS, 'REVIEW_SUMMARY.md');

function dirname(p) { const i = p.replace(/\\/g, '/').lastIndexOf('/'); return i < 0 ? '.' : p.slice(0, i); }

function walk(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (name.endsWith(ext)) out.push(p);
  }
  return out;
}

const mdFiles = walk(DOCS, '.md');
const mdText = (rel) => readFileSync(join(DOCS, rel), 'utf8');
const allMd = mdFiles.map(p => ({ p, text: readFileSync(p, 'utf8') }));

function rowIds(text, re) {
  const ids = new Set();
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    for (const m of line.matchAll(g)) ids.add(m[1]);
  }
  return ids;
}

// 标题类登记（#### FEAT-xxx / ## FLOW-xxx / ### DEC-xxx）
function headingIds(text, re) {
  const ids = new Set();
  for (const m of text.matchAll(re)) ids.add(m[1]);
  return ids;
}

function union(...sets) {
  const out = new Set();
  for (const s of sets) for (const v of s) out.add(v);
  return out;
}

// ---- 定义处统计 ----
const REQ = union(rowIds(mdText('01_PRODUCT_VISION_SCOPE_AND_PRINCIPLES.md'), /^\| (REQ-\d{3}) \|/),
                  rowIds(mdText('22_TARGET_TRACEABILITY_MATRIX.md'), /^\| (REQ-\d{3}) \|/));
const FEAT = headingIds(mdText('03_TARGET_FEATURE_CATALOG.md'), /^#### (FEAT-\d{3})/gm);
// PAGE/WEB 标题统计（pages/ 与 web/ 目录的一级标题）
const PAGE_SET = new Set();
const WEB_SET = new Set();
for (const f of allMd) {
  const rel = relative(DOCS, f.p).replace(/\\/g, '/');
  if (rel.startsWith('pages/')) for (const m of f.text.matchAll(/^# (PAGE-\d{3})/gm)) PAGE_SET.add(m[1]);
  if (rel.startsWith('web/')) for (const m of f.text.matchAll(/^# (WEB-\d{3})/gm)) WEB_SET.add(m[1]);
}
const FLOW = headingIds(mdText('06_TARGET_USER_FLOWS.md'), /^## (FLOW-\d{3})/gm);

const OP = new Set(); const OP_DEPRECATED = new Set();
const STATE = new Set();
const OP_ROW = /\| (OP-(?:P\d{3}|W001)-\d{2}) \|/g;
const STATE_ROW = /\| (STATE-(?:P\d{3}|W001|GBL|OTA|HID)-(?:\d{2}|ERR)) \|/g;
for (const f of allMd) {
  for (const line of f.text.split('\n')) {
    if (!line.startsWith('|')) continue;
    for (const m of line.matchAll(OP_ROW)) {
      (line.includes('已废弃') || line.includes('~~')) ? OP_DEPRECATED.add(m[1]) : OP.add(m[1]);
    }
    for (const m of line.matchAll(STATE_ROW)) STATE.add(m[1]);
  }
}
const ERR = rowIds(mdText('07_INTERACTION_STATE_AND_ERROR_MODEL.md'), /^\| (ERR-[A-Z]+-\d{2}) \|/);
const DATA = rowIds(mdText('09_DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY.md'), /^\| (DATA-\d{3}) \|/);
const PROTO = rowIds(mdText('11_BLE_GATT_PROTOCOL_CONTRACT.md'), /^\| (PROTO-\d{3}) \|/);
const SEC = rowIds(mdText('15_SECURITY_AND_THREAT_MODEL.md'), /^\| (SEC-\d{3}) \|/);
const NFR = rowIds(mdText('16_NON_FUNCTIONAL_REQUIREMENTS.md'), /^\| (NFR-\d{3}) \|/);
const CLAIM = rowIds(mdText('18_VERSION_RELEASE_METADATA_AND_PUBLIC_STATUS.md'), /^\| (CLAIM-\d{3}) \|/);
const DEC = headingIds(mdText('21_RISK_REGISTER_AND_DECISION_LOG.md'), /^### (DEC-\d{3})/gm);
const RISK = rowIds(mdText('21_RISK_REGISTER_AND_DECISION_LOG.md'), /^\| (RISK-\d{3}) \|/);
const EVID = rowIds(mdText('14_OBSERVABILITY_LOGGING_AND_EVIDENCE.md'), /^\| (EVID-\d{3}) \|/);

const trace = JSON.parse(readFileSync(join(CONTRACTS, 'test-traceability.json'), 'utf8'));
const TEST = new Set(trace.tests.map(t => t.id));
const bySuite = {};
for (const t of trace.tests) { const k = t.id.slice(5, 6); bySuite[k] = (bySuite[k] ?? 0) + 1; }
const suiteOrder = ['C', 'U', 'I', 'P', 'E', 'A', 'W', 'H', 'R'];
const suiteText = suiteOrder.map(k => `${k}${bySuite[k] ?? 0}`).join('/');

const mermaidBlocks = allMd.reduce((n, f) => n + (f.text.match(/^```mermaid/gm) ?? []).length, 0);
const jsonFiles = readdirSync(CONTRACTS).filter(f => f.endsWith('.json'));
const schemaCount = jsonFiles.filter(f => f.endsWith('.schema.json')).length;
const dataJsonCount = jsonFiles.length - schemaCount;

const stats = {
  markdown_files: mdFiles.length,
  contract_schemas: schemaCount,
  contract_data_json: dataJsonCount,
  REQ: REQ.size, FEAT: FEAT.size,
  PAGE: PAGE_SET.size, WEB: WEB_SET.size, FLOW: FLOW.size,
  OP_active: OP.size, OP_deprecated: OP_DEPRECATED.size,
  STATE: STATE.size,
  ERR: ERR.size,
  DATA: DATA.size, PROTO: PROTO.size, SEC: SEC.size, NFR: NFR.size,
  CLAIM: CLAIM.size, DEC: DEC.size, RISK: RISK.size, EVID: EVID.size,
  planned_tests: TEST.size, test_suites: suiteText,
  mermaid_blocks: mermaidBlocks,
};

const statePageGlobal = (() => {
  const page = [...STATE].filter(s => /^STATE-(P\d{3}|W001)-/.test(s)).length;
  return { page, global: STATE.size - page };
})();

function statsTable() {
  const rows = [
    ['目标文档（.md）', String(stats.markdown_files)],
    ['机器契约（schema / data JSON）', `${stats.contract_schemas} / ${stats.contract_data_json}`],
    ['Mermaid 图', String(stats.mermaid_blocks)],
    ['REQ / FEAT', `${stats.REQ} / ${stats.FEAT}`],
    ['PAGE / WEB / FLOW', `${stats.PAGE} / ${stats.WEB} / ${stats.FLOW}`],
    [`OP（在册 ${stats.OP_active}，另有废弃 ${stats.OP_deprecated} 不复用）`, String(stats.OP_active)],
    ['STATE（页面/全局）', `${stats.STATE}（${statePageGlobal.page}/${statePageGlobal.global}）`],
    ['ERR', String(stats.ERR)],
    ['DATA / PROTO / SEC / NFR', `${stats.DATA} / ${stats.PROTO} / ${stats.SEC} / ${stats.NFR}`],
    ['CLAIM / DEC / RISK / EVID', `${stats.CLAIM} / ${stats.DEC} / ${stats.RISK} / ${stats.EVID}`],
    [`计划测试（${suiteText}）`, String(stats.planned_tests)],
  ];
  return ['| 维度 | 数量 |', '|---|---|', ...rows.map(r => `| ${r[0]} | ${r[1]} |`)].join('\n');
}

const BEGIN = '<!-- TARGET_DOCS_STATS:BEGIN 由 scripts/target-docs/inspect-target-docs.mjs 生成，勿手改 -->';
const END = '<!-- TARGET_DOCS_STATS:END -->';

const args = process.argv.slice(2);
if (args.includes('--json')) {
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}

const summary = readFileSync(REVIEW_SUMMARY, 'utf8');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockRe = new RegExp(`${esc(BEGIN)}\\n([\\s\\S]*?)\\n${esc(END)}`);
const m = summary.match(blockRe);

if (args.includes('--update')) {
  if (!m) {
    console.error(`REVIEW_SUMMARY.md 缺少统计标记 ${BEGIN} / ${END}，请先手工插入标记区块`);
    process.exit(1);
  }
  const updated = summary.replace(blockRe, `${BEGIN}\n${statsTable()}\n${END}`);
  writeFileSync(REVIEW_SUMMARY, updated);
  console.log('REVIEW_SUMMARY 统计区已更新：');
  console.log(statsTable());
  process.exit(0);
}

console.log(statsTable());
console.log('\nJSON:', JSON.stringify(stats));
if (!m) {
  console.error(`\nFAIL: REVIEW_SUMMARY.md 缺少统计标记区块`);
  process.exit(1);
}
if (m[1].trim() !== statsTable().trim()) {
  console.error('\nFAIL: REVIEW_SUMMARY 统计区与实际统计不一致（运行 --update 或手工修正）');
  console.error('--- REVIEW_SUMMARY 当前 ---');
  console.error(m[1].trim());
  process.exit(1);
}
console.log('\nOK: REVIEW_SUMMARY 统计区与实际统计一致');
