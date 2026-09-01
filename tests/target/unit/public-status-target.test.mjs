// tests/target/unit/public-status-target.test.mjs
// TEST-U-002（公开状态派生）五词表：VERIFIED/PREVIEW/BLOCKED/UNSUPPORTED/NOT_RELEASED；
// 无产物 → NOT_RELEASED（不得 VERIFIED/PREVIEW 挂下载）；VERIFIED 必须有证据对。
// 目标：REQ-009/046/055/058/060；FEAT-009/046/065/070；18 号第 2 节。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'REQ-009/046/055 FEAT-009/070 18号§2 五词表';

const VOCAB = ['VERIFIED', 'PREVIEW', 'BLOCKED', 'UNSUPPORTED', 'NOT_RELEASED'];

// ---------- 目标层 ----------
test('目标层：services/public-status.js', async (t) => {
  const m = await importTarget('apps/uniapp/services/public-status.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const fn = m.module.derivePublicStatus || m.module.publicStatus;
  if (typeof fn !== 'function') return assert.fail(notImplemented(IDS, '目标接口 derivePublicStatus 缺失'));

  // 无产物 → NOT_RELEASED
  assert.equal(fn({ has_artifact: false }), 'NOT_RELEASED', '无产物 NOT_RELEASED');
  // 词表合法
  for (const sample of [
    { has_artifact: false },
    { has_artifact: true, evidence: { sha256: 'x', url: 'https://a/b' }, e5_passed: true },
    { has_artifact: true, e5_passed: false },
    { has_artifact: true, blocked: true },
  ]) {
    const st = fn(sample);
    assert.ok(VOCAB.includes(st), `状态 ${st} 取自五词表`);
  }
  // VERIFIED 必须有证据（sha/url 成对）
  assert.notEqual(fn({ has_artifact: true, e5_passed: true }), 'VERIFIED', '缺证据对不得 VERIFIED');
  const verified = fn({ has_artifact: true, e5_passed: true, evidence: { sha256: 'a'.repeat(64), url: 'https://x/y.apk' } });
  assert.ok(verified === 'VERIFIED' || VOCAB.includes(verified), '证据齐全可 VERIFIED（或合法降级）');
});
