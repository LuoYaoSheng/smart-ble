// tests/target/release/public-claims.test.mjs
// TEST-R-003 CLAIM-016 CLAIM-017 CLAIM-018 CLAIM-019 WEB-001 FEAT-070 FEAT-075
// 公开声明与状态一致性：无假下载 / 无假二维码 / 无无证据声明。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const LANDING = `${ROOT}/docs/index.md`;

test('TEST-R-003 生产落地页存在', () => {
  assert.ok(existsSync(LANDING), 'docs/index.md 存在');
});

test('TEST-R-003 无假下载：APK/固件直链必须伴随 SHA256；无产物时必须诚实 NOT_RELEASED 且无 releases/latest 冒充', () => {
  if (!existsSync(LANDING)) return assert.fail('落地页缺失');
  const html = readFileSync(LANDING, 'utf8');
  const assetLinks = [...html.matchAll(/href="([^"]*\.(?:apk|bin|zip|ipa))"/gi)].map((m) => m[1]);
  const latestReleaseLinks = [...html.matchAll(/href="([^"]*releases\/latest[^"]*)"/gi)].map((m) => m[1]);
  const shaMention = /sha256|SHA-?256/i.test(html);
  const honestMissing = /NOT_RELEASED|尚未发布|暂未发布|未发布/.test(html);

  if (assetLinks.length === 0) {
    assert.ok(honestMissing, '无产物直链时页面必须明确 NOT_RELEASED/尚未发布');
    assert.equal(latestReleaseLinks.length, 0, '无产物时不得用 releases/latest 冒充具体 APK/固件下载');
    return;
  }
  assert.ok(shaMention, `存在 ${assetLinks.length} 个产物直链但页面无 SHA 说明`);
  for (const link of assetLinks) {
    const local = link.replace(/^[./]+/, '');
    if (/^https?:/.test(link)) continue;
    assert.ok(existsSync(`${ROOT}/${local}`), `本地产物存在：${local}`);
  }
});

test('TEST-R-003 禁用无证据强声明词（VERIFIED 语义不得无证据出现）', () => {
  if (!existsSync(LANDING)) return assert.fail('落地页缺失');
  const html = readFileSync(LANDING, 'utf8');
  const hits = [...html.matchAll(/已验证|VERIFIED/gi)];
  for (const m of hits) {
    const ctx = html.slice(Math.max(0, m.index - 300), m.index + 300);
    assert.ok(/sha|证据|Evidence|evidence|测试报告/i.test(ctx), `“${m[0]}”出现处必须邻近证据说明`);
  }
});

test('TEST-R-003 禁止错误主线与 6+ 入口误导', () => {
  if (!existsSync(LANDING)) return assert.fail('落地页缺失');
  const html = readFileSync(LANDING, 'utf8');
  assert.ok(!/Flutter\s*Mobile\s*Mainline|Flutter Mobile 主线/i.test(html), '不得宣称 Flutter Mobile Mainline');
  assert.ok(!/6\+|六个以上入口|6 个以上入口/.test(html), '不得宣称 6+ 入口');
  assert.ok(!/多端大一统|全平台统一下载/.test(html), '不得使用多端大一统禁用定位');
});
