#!/usr/bin/env node
// scripts/verify-target.mjs —— Smart BLE 目标测试统一入口（TP-G1 交付）。
// 按层运行：1 Contract/Static → 2 Unit → 3 Integration → 4 Page(manifest) → 5 Firmware(static) → 6 Release(static) → 7 Traceability coverage
// 输出每层 PASS/FAIL、Test ID、Target ID、第一断点（NOT_IMPLEMENTED 前缀）、汇总。
// 约束：缺硬件/浏览器不得计自动化 PASS（E4/E5 项标 BLOCKED）；本入口不并入 verify-uniapp.sh 阻断（TP-G1 审核前独立运行）。

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const LAYERS = [
  { name: '1 Contract/Static', dir: 'tests/target/contract' },
  { name: '2 Unit', dir: 'tests/target/unit' },
  { name: '3 Integration/FakeRuntime', dir: 'tests/target/integration' },
  { name: '4 Page/Manifest', files: ['tests/target/pages/pages-contract.test.mjs'], blocked: 'Playwright specs (*.spec.js) 需浏览器环境 → BLOCKED（不计 PASS）' },
  { name: '5 Firmware/Static', dir: 'tests/target/firmware' },
  { name: '6 Release/Static', dir: 'tests/target/release' },
  { name: '7 Traceability', cmd: ['node', 'scripts/target/check-target-traceability.mjs'] },
];

const runNodeTest = (targets) => {
  const args = ['--test', ...targets];
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = r.stdout + r.stderr;
  const pass = Number((out.match(/^# pass (\d+)/m) || [])[1] ?? 0);
  const fail = Number((out.match(/^# fail (\d+)/m) || [])[1] ?? 0);
  const cancelled = Number((out.match(/^# cancelled (\d+)/m) || [])[1] ?? 0);
  const notImpl = [...out.matchAll(/error: '(NOT_IMPLEMENTED:[^']{0,200})/g)].map((m) => m[1]);
  const failMsgs = [...out.matchAll(/error: '([^']{0,160})/g)].map((m) => m[1]).filter((x) => !x.startsWith('NOT_IMPLEMENTED'));
  return { pass, fail, cancelled, notImpl, failMsgs, raw: out, exitCode: r.status };
};

const summary = [];
let firstBreakpoints = [];

for (const layer of LAYERS) {
  process.stdout.write(`\n===== ${layer.name} =====\n`);
  if (layer.blocked) process.stdout.write(`[BLOCKED] ${layer.blocked}\n`);

  if (layer.cmd) {
    const r = spawnSync(layer.cmd[0], layer.cmd.slice(1), { cwd: ROOT, encoding: 'utf8' });
    const out = r.stdout + r.stderr;
    const pass = (out.match(/^ok  /gm) || []).length;
    const fail = (out.match(/^FAIL/gm) || []).length;
    const failMsgs = [...out.matchAll(/^FAIL : \[([^\]]+)\] (.+)$/gm)].map((m) => `[${m[1]}] ${m[2]}`);
    summary.push({ layer: layer.name, pass, fail, blocked: 0, notImpl: [] });
    firstBreakpoints = firstBreakpoints.concat(failMsgs.map((m) => `${layer.name} ${m}`));
    process.stdout.write(out.split('\n').filter((l) => /^FAIL|^.*: (PASS|FAIL)（/.test(l)).join('\n') + '\n');
    continue;
  }

  const targets = layer.files
    ? layer.files.map((f) => `${ROOT}/${f}`)
    : [`${ROOT}/${layer.dir}`];
  if (layer.dir && !existsSync(`${ROOT}/${layer.dir}`)) {
    process.stdout.write('[SKIP] 目录不存在\n');
    summary.push({ layer: layer.name, pass: 0, fail: 0, blocked: 0, notImpl: [], skip: true });
    continue;
  }
  const r = runNodeTest(targets);
  process.stdout.write(`PASS ${r.pass} / FAIL ${r.fail}${r.cancelled ? ` / CANCELLED ${r.cancelled}` : ''}\n`);
  for (const m of r.failMsgs.slice(0, 6)) process.stdout.write(`  ✗ ${m}\n`);
  for (const m of r.notImpl.slice(0, 6)) process.stdout.write(`  ○ ${m}\n`);
  if (r.notImpl.length > 6) process.stdout.write(`  …共 ${r.notImpl.length} 条 NOT_IMPLEMENTED\n`);
  summary.push({ layer: layer.name, pass: r.pass, fail: r.fail, blocked: layer.blocked ? 11 : 0, notImpl: r.notImpl });
  firstBreakpoints = firstBreakpoints.concat(
    r.notImpl.map((m) => `${layer.name} ${m}`),
    r.failMsgs.map((m) => `${layer.name} ${m}`),
  );
}

// ---- 汇总 ----
const totals = summary.reduce((a, s) => ({ pass: a.pass + s.pass, fail: a.fail + s.fail, blocked: a.blocked + s.blocked }), { pass: 0, fail: 0, blocked: 0 });
console.log('\n================ TARGET VERIFY SUMMARY ================');
for (const s of summary) {
  console.log(`${s.layer.padEnd(26)} ${s.fail === 0 && !s.skip ? 'PASS' : 'FAIL'}   pass=${s.pass} fail=${s.fail}${s.blocked ? ` blocked=${s.blocked}` : ''}`);
}
console.log('------------------------------------------------------');
console.log(`TOTAL pass=${totals.pass} fail=${totals.fail} blocked=${totals.blocked}`);
console.log(`\n第一断点预览（前 20，非正式 gap 结论，TP-G2 生成）：`);
const seen = new Set();
const uniqueBp = firstBreakpoints.filter((b) => {
  const key = b.slice(0, 80);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).slice(0, 20);
uniqueBp.forEach((b, i) => console.log(`${String(i + 1).padStart(2)}. ${b}`));
if (!uniqueBp.length) console.log('（无）');

console.log(`
说明：
- FAIL 中 NOT_IMPLEMENTED 前缀 = 目标接口/模块缺失（TP-G2 差距输入）
- E4 Playwright / E5 真机 / E6 发布项为 BLOCKED 或模板，缺环境不计 PASS
- 依据 docs/target-tests/12_TEST_DATA_FIXTURES_AND_MOCKS.md：不修改真实目标文档制造失败`);
process.exit(totals.fail === 0 ? 0 : 1);
