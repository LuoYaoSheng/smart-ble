#!/usr/bin/env node
// scripts/target/check-target-platforms.mjs
// TEST-C-004 —— 平台矩阵与公开面一致性：四平台、状态五词表、能力值域、降级必填。

import { Checker, cliCtx } from './lib/check-utils.mjs';

const STATUS_VOCAB = ['VERIFIED', 'PREVIEW', 'BLOCKED', 'UNSUPPORTED', 'NOT_RELEASED'];
const CAP_VALUES = ['Full', 'Adapted', 'Unsupported', 'N/A', 'Degraded', 'Not Released'];
const EXPECTED_PLATFORMS = [
  { id: 'android-app', status: 'VERIFIED' },
  { id: 'wechat-miniprogram', status: 'VERIFIED' },
  { id: 'h5', status: 'UNSUPPORTED' },
  { id: 'ios-app', status: 'NOT_RELEASED' },
];

export function run(ctx) {
  const c = new Checker('check-target-platforms');
  const j = ctx.readJson('contracts/target/platform-target.json');
  c.assert('TEST-C-004', 'platform-target.json', j.ok, `platform-target.json 可解析${j.ok ? '' : '：' + j.error}`);
  if (!j.ok) return c.report();
  const { platforms, capabilities } = j.data;

  // 四平台与目标公开姿态
  c.assert('TEST-C-004', 'PLATFORM 全体', platforms.length === 4, `恰好四平台（实际 ${platforms.length}）`);
  for (const exp of EXPECTED_PLATFORMS) {
    const p = platforms.find((x) => x.id === exp.id);
    c.assert('TEST-C-004', exp.id, p && p.public_status_target === exp.status,
      `${exp.id} 目标公开状态 ${exp.status}（实际 ${p ? p.public_status_target : '缺失'}）`);
    c.assert('TEST-C-004', exp.id, p && STATUS_VOCAB.includes(p.public_status_target), `${exp.id} 状态取自五词表`);
  }

  // 能力矩阵
  c.assert('TEST-C-004', 'CAP 全体', capabilities.length >= 28, `能力条目 ≥28（实际 ${capabilities.length}）`);
  const capIds = capabilities.map((x) => x.id);
  c.assert('TEST-C-004', 'CAP 全体', new Set(capIds).size === capIds.length, '能力 ID 唯一');
  const badValue = [];
  for (const cap of capabilities) {
    for (const k of ['android_app', 'wechat', 'h5', 'ios_app']) {
      if (!CAP_VALUES.includes(cap[k])) badValue.push(`${cap.id}.${k}=${cap[k]}`);
    }
    // 双正式入口出现真实降级（Unsupported/Degraded/Adapted）必须给降级说明；
    // H5 全局 UNSUPPORTED 与 iOS NOT_RELEASED 属平台级姿态，由平台状态断言覆盖。
    const primaryDegraded = ['android_app', 'wechat'].some((k) => ['Unsupported', 'Degraded', 'Adapted'].includes(cap[k]));
    if (primaryDegraded && !(cap.degradation_ui || '').trim()) badValue.push(`${cap.id}.degradation_ui 空`);
  }
  c.assert('TEST-C-004', 'CAP 全体', badValue.length === 0, `能力值在值域内且正式入口降级必有说明（违规 ${badValue.slice(0, 5).join(';')}）`);

  // H5 公开面：UNSUPPORTED 平台不得宣传为可用（08 号以中文标签登记平台）
  if (ctx.exists('docs/target-product/08_PLATFORM_CAPABILITY_AND_DEGRADATION_MATRIX.md')) {
    const t08 = ctx.read('docs/target-product/08_PLATFORM_CAPABILITY_AND_DEGRADATION_MATRIX.md');
    const LABELS = { 'android-app': 'Android App', 'wechat-miniprogram': '微信小程序', h5: 'H5', 'ios-app': 'iOS App' };
    for (const p of platforms) {
      c.assert('TEST-C-004', p.id, t08.includes(LABELS[p.id] || p.id), `08 号能力矩阵登记 ${p.id}（${LABELS[p.id]}）`);
    }
  }

  return c.report();
}

if (process.argv[1] && process.argv[1].endsWith('check-target-platforms.mjs')) {
  const ctx = await cliCtx(import.meta.url);
  const r = run(ctx);
  for (const x of r.results) console.log(`${x.pass ? 'ok  ' : 'FAIL'} : [${x.testId}] ${x.message}`);
  console.log(`\n${r.checker}: ${r.pass ? 'PASS' : 'FAIL'}（${r.total - r.failureCount}/${r.total}）`);
  process.exit(r.pass ? 0 : 1);
}
