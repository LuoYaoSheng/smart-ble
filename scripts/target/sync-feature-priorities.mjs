#!/usr/bin/env node
// scripts/target/sync-feature-priorities.mjs
// 从 docs/target-product/03_TARGET_FEATURE_CATALOG.md 每项「归属」行解析 FEAT priority，
// 与 contracts/target/product-target.json 逐项比对，输出统计（禁止手填猜测）。

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MD_PATH = `${ROOT}/docs/target-product/03_TARGET_FEATURE_CATALOG.md`;
const JSON_PATH = `${ROOT}/contracts/target/product-target.json`;
const TRACE_PATH = `${ROOT}/contracts/target/test-traceability.json`;

/** @returns {Map<string, { priority: string, line: string }>} */
function parseMdPriorities(text) {
  const out = new Map();
  const blocks = text.split(/(?=#### FEAT-\d+)/);
  for (const block of blocks) {
    const idM = block.match(/^#### (FEAT-\d+)/);
    if (!idM) continue;
    const lineM = block.match(/- 归属：[^\n]+/);
    if (!lineM) continue;
    const priM = lineM[0].match(/(Must|Should|Could|Not Now)(?:\s|$|（)/);
    out.set(idM[1], { priority: priM ? priM[1] : 'UNKNOWN', line: lineM[0] });
  }
  return out;
}

function distribution(features) {
  const d = { Must: 0, Should: 0, Could: 0, 'Not Now': 0, UNKNOWN: 0 };
  for (const f of features) d[f.priority] = (d[f.priority] ?? 0) + 1;
  return d;
}

const args = process.argv.slice(2);
const mdText = readFileSync(MD_PATH, 'utf8');
const product = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const mdMap = parseMdPriorities(mdText);

const mismatches = [];
for (const f of product.features) {
  const md = mdMap.get(f.id);
  if (!md) mismatches.push({ id: f.id, issue: 'missing_in_md' });
  else if (md.priority !== f.priority) mismatches.push({ id: f.id, md: md.priority, json: f.priority });
}

const mdDist = distribution([...mdMap.values()].map((x) => ({ priority: x.priority })));
const jsonDist = distribution(product.features);

const report = {
  feat_count: product.features.length,
  md_count: mdMap.size,
  md_distribution: mdDist,
  json_distribution: jsonDist,
  mismatches,
  summary: `Must ${jsonDist.Must} / Should ${jsonDist.Should} / Could ${jsonDist.Could}`,
};

if (args.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('FEAT priority sync report');
  console.log(`  MD entries: ${report.md_count}`);
  console.log(`  JSON entries: ${report.feat_count}`);
  console.log(`  MD distribution: Must ${mdDist.Must} / Should ${mdDist.Should} / Could ${mdDist.Could}`);
  console.log(`  JSON distribution: ${report.summary}`);
  if (mismatches.length) {
    console.error('\nMISMATCHES:');
    for (const m of mismatches) console.error(`  ${m.id}: ${JSON.stringify(m)}`);
  } else {
    console.log('\nOK: all 81 FEAT priorities aligned');
  }
}

if (args.includes('--update-coverage')) {
  const trace = JSON.parse(readFileSync(TRACE_PATH, 'utf8'));
  const mustFeats = product.features.filter((f) => f.priority === 'Must');
  const testIds = new Set(trace.tests.map((t) => t.id));
  const featWithAuto = mustFeats.filter((f) =>
    (f.planned_tests || []).some((tid) => testIds.has(tid)),
  ).length;
  trace.coverage = {
    ...trace.coverage,
    must_features_total: mustFeats.length,
    must_features_with_automation: featWithAuto,
  };
  writeFileSync(TRACE_PATH, JSON.stringify(trace, null, 2) + '\n');
  console.log(`Updated test-traceability coverage: must ${featWithAuto}/${mustFeats.length}`);
}

process.exit(mismatches.length ? 1 : 0);
