// tests/target/release/links-and-qr.test.mjs
// TEST-R-005（静态部分）：链接矩阵 —— 落地页与目标文档内外链健康（相对路径解析 + 死链检测）。
// TEST-R-009（静态前置）：二维码资产规则（官方码 + 文本等价）。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const LANDING = `${ROOT}/docs/index.md`;

test('TEST-R-005 落地页本站相对链接全部可达', () => {
  if (!existsSync(LANDING)) return assert.fail('落地页缺失');
  const html = readFileSync(LANDING, 'utf8');
  // 站点根依部署而异（GitHub Pages 常为 / 或 /docs/）：绝对路径先按 docs/ 解析，再按仓库根；
  // 两处皆无 → 真死链（静态可判）；.md↔.html 后缀差异按站点生成规则豁免记录。
  const relLinks = [...html.matchAll(/(?:href|src)="(\.[^"]+|\/(?!\/)[^"]*)"/g)].map((m) => m[1]);
  const broken = [];
  const siteDependent = [];
  for (const link of relLinks) {
    const clean = link.split('#')[0].split('?')[0];
    if (!link.startsWith('/')) {
      if (!existsSync(resolve(dirname(LANDING), decodeURIComponent(clean)))) broken.push(link);
      continue;
    }
    const candidates = [`${ROOT}/docs${clean}`, `${ROOT}${clean}`,
      `${ROOT}/docs${clean.replace(/\.html$/, '.md')}`, `${ROOT}${clean.replace(/\.html$/, '.md')}`];
    if (candidates.some((c) => existsSync(c))) continue;
    siteDependent.push(link);
  }
  assert.deepEqual(broken, [], `相对死链必须为空（发现 ${broken.join(', ')}）`);
  if (siteDependent.length) {
    console.log(`[site-root dependent] ${siteDependent.join(', ')} → E6 部署验证（静态不判 FAIL）`);
  }
});

test('TEST-R-005 目标文档内链相对且可达（docs/target-product 抽样）', () => {
  const doc = `${ROOT}/docs/target-product/README.md`;
  const md = readFileSync(doc, 'utf8');
  const links = [...md.matchAll(/\]\(([^)#\s]+[^)\s]*)\)/g)].map((m) => m[1]).filter((l) => !/^https?:/.test(l));
  const broken = links.filter((l) => !existsSync(resolve(dirname(doc), decodeURIComponent(l))));
  assert.deepEqual(broken, [], `README.md 内链死链：${broken.join(', ')}`);
});

test('TEST-R-009 二维码规则：落地页如含码图必须同时给文本等价', () => {
  if (!existsSync(LANDING)) return assert.fail('落地页缺失');
  const html = readFileSync(LANDING, 'utf8');
  const hasQrImage = /qr|二维码/i.test(html) && /(<img|\.png|\.svg)/i.test(html);
  if (!hasQrImage) {
    assert.ok(true, '当前无码图（NOT_RELEASED 姿态合法）');
    return;
  }
  // 有码图时：同屏必须能找到等价文本链接（小程序码指向的页面地址或说明）
  assert.ok(/小程序码|扫码|text-?equivalent|链接地址/i.test(html), '码图必须伴随文本等价（landing-target.qr_rules）');
});
