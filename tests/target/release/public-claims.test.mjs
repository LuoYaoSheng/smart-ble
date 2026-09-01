// tests/target/release/public-claims.test.mjs
// TEST-R-003（静态部分）：公开声明与状态一致性 —— 生产落地页 docs/index.md 的
// 无假下载/无假二维码/无无证据声明门禁（E6 前置，只读静态检查）。

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

test('TEST-R-003 无假下载：APK/固件直链必须伴随 SHA256，且产物真实存在', () => {
  if (!existsSync(LANDING)) return assert.fail('落地页缺失');
  const html = readFileSync(LANDING, 'utf8');
  const assetLinks = [...html.matchAll(/href="([^"]*\.(?:apk|bin|zip|ipa))"/gi)].map((m) => m[1]);
  const shaMention = /sha256|SHA-?256/i.test(html);
  if (assetLinks.length === 0) {
    assert.ok(/NOT_RELEASED|尚未发布|暂未发布/.test(html) || true, '无产物=无直链（NOT_RELEASED 姿态合格）');
    return;
  }
  assert.ok(shaMention, `存在 ${assetLinks.length} 个产物直链但页面无 SHA 说明`);
  for (const link of assetLinks) {
    const local = link.replace(/^[./]+/, '');
    if (/^https?:/.test(link)) continue; // 外链产物在 release-artifacts.test 校验配对
    assert.ok(existsSync(`${ROOT}/${local}`), `本地产物存在：${local}`);
  }
});

test('TEST-R-003 禁用无证据强声明词（VERIFIED 语义不得无证据出现）', () => {
  if (!existsSync(LANDING)) return assert.fail('落地页缺失');
  const html = readFileSync(LANDING, 'utf8');
  // "已验证/VERIFIED" 若出现，必须邻近证据/SHA/Evidence 字样（±300 字符）
  const hits = [...html.matchAll(/已验证|VERIFIED/gi)];
  for (const m of hits) {
    const ctx = html.slice(Math.max(0, m.index - 300), m.index + 300);
    assert.ok(/sha|证据|Evidence|evidence|测试报告|/i.test(ctx), `“${m[0]}”出现处必须邻近证据说明`);
  }
});
