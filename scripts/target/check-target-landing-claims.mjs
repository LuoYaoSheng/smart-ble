#!/usr/bin/env node
// scripts/target/check-target-landing-claims.mjs
// TEST-C-010（landing 侧）—— 公开声明门禁：Claim 登记/证据前置/测试映射、
// 下载规则（无假下载/SHA 必需/缺产物 NOT_RELEASED）、二维码规则、
// VERIFIED 必须带 URL+SHA 证据对、目标文档相对链接合法性。

import { Checker, cliCtx, rowIds, ID_PATTERNS } from './lib/check-utils.mjs';

const BAD_LINK = /\]\((file:\/\/|\/Users\/|[A-Za-z]:\\\\|https?:\/\/[^)\s]*\/blob\/main\/docs\/)/;

export function run(ctx) {
  const c = new Checker('check-target-landing-claims');
  const j = ctx.readJson('contracts/target/landing-target.json');
  c.assert('TEST-C-010', 'landing-target.json', j.ok, `landing-target.json 可解析${j.ok ? '' : '：' + j.error}`);
  if (!j.ok) return c.report();
  const d = j.data;

  // 区块完整有序
  const orders = (d.sections || []).map((s) => s.order);
  c.assert('TEST-C-010', 'WEB-001', orders.length >= 14 && orders.every((o, i) => i === 0 || o > orders[i - 1]),
    `落地页区块 ≥14 且有序（实际 ${orders.length}）`);

  // Claim 登记
  const claims = d.claims || [];
  c.assert('TEST-C-010', 'CLAIM 全体', claims.length >= 31, `CLAIM ≥31（实际 ${claims.length}）`);
  const badClaim = claims.filter((x) => !x.id || !x.statement || !(x.evidence_prerequisite || '').trim() || !(x.tests || []).length);
  c.assert('TEST-C-010', 'CLAIM 全体', badClaim.length === 0,
    `每条 Claim 有陈述/证据前置/测试（缺 ${badClaim.map((x) => x.id).slice(0, 6).join(',')}）`);
  const claimIds = claims.map((x) => x.id);
  c.assert('TEST-C-010', 'CLAIM 全体', new Set(claimIds).size === claimIds.length, 'CLAIM ID 唯一');

  // 测试引用闭合（若 traceability 在 ctx 中）
  const t = ctx.readJson('contracts/target/test-traceability.json');
  if (t.ok) {
    const testIds = t.data.tests.map((x) => x.id);
    const bad = claims.flatMap((x) => (x.tests || []).filter((tt) => !testIds.includes(tt)).map((tt) => `${x.id}→${tt}`));
    c.assert('TEST-C-010', 'CLAIM 全体', bad.length === 0, `Claim 引用测试存在（坏 ${bad.slice(0, 5).join(',')}）`);
  }

  // 下载规则（故意错误类别 7：PREVIEW 假下载必须被抓）
  const dr = d.download_rules || {};
  c.assert('TEST-C-010', 'WEB-001/dl', dr.no_fake_download === true, 'download_rules.no_fake_download = true');
  c.assert('TEST-C-010', 'WEB-001/dl', dr.sha_required === true, 'download_rules.sha_required = true');
  c.assert('TEST-C-010', 'WEB-001/dl', String(dr.missing_artifact_behavior || '').includes('NOT_RELEASED'),
    '缺产物行为 = NOT_RELEASED（不得挂空链接/假下载）');

  // QR 规则
  const qr = d.qr_rules || {};
  c.assert('TEST-C-010', 'WEB-001/qr', qr.official_only === true && qr.text_equivalent_required === true,
    '二维码仅官方 + 文本等价');

  // VERIFIED 必须带 URL/SHA 证据对（故意错误类别 8）
  const verifiedNoEvidence = claims.filter((x) => (x.public_status || '').toUpperCase() === 'VERIFIED' &&
    !(x.artifact_url && x.artifact_sha256));
  c.assert('TEST-C-010', 'CLAIM 全体', verifiedNoEvidence.length === 0,
    `VERIFIED 声明必须带 artifact_url+sha256（缺证据 ${verifiedNoEvidence.map((x) => x.id).join(',')}）`);

  // Claim 全表登记处为 18 号第 6 节；WEB-001 文档引用区间 notation
  if (ctx.exists('docs/target-product/18_VERSION_RELEASE_METADATA_AND_PUBLIC_STATUS.md')) {
    const t18 = ctx.read('docs/target-product/18_VERSION_RELEASE_METADATA_AND_PUBLIC_STATUS.md');
    const mdClaims = new Set(rowIds(t18, ID_PATTERNS.CLAIM));
    const missing = claimIds.filter((id) => !mdClaims.has(id));
    c.assert('TEST-C-010', 'WEB-001', missing.length === 0, `18 号登记全部 Claim（缺 ${missing.slice(0, 6).join(',')}）`);
  }
  if (ctx.exists('docs/target-product/web/WEB-001_LANDING_PAGE.md')) {
    const w = ctx.read('docs/target-product/web/WEB-001_LANDING_PAGE.md');
    c.assert('TEST-C-010', 'WEB-001', /CLAIM-001\.\.0?31|CLAIM-001\s*~\s*031|CLAIM-\d{3}/.test(w), 'WEB-001 文档引用 CLAIM 登记处');
  }

  // 相对链接合法性（目标文档内链必须相对路径）
  const docDirs = ['docs/target-product', 'docs/target-product/pages', 'docs/target-product/web'];
  const offenders = [];
  for (const dir of docDirs) {
    for (const name of ['00_DOCUMENT_CONTROL_AND_GLOSSARY.md', '01_PRODUCT_VISION_SCOPE_AND_PRINCIPLES.md',
      'README.md', 'REVIEW_SUMMARY.md', 'WEB-001_LANDING_PAGE.md', 'PAGE-001_SCAN.md']) {
      const rel = `${dir}/${name}`;
      if (!ctx.exists(rel)) continue;
      const text = ctx.read(rel);
      for (const line of text.split('\n')) {
        if (BAD_LINK.test(line)) offenders.push(`${rel}: ${line.trim().slice(0, 60)}`);
      }
    }
  }
  c.assert('TEST-C-010', 'LINKS', offenders.length === 0, `目标文档内链为相对路径（违规 ${offenders.slice(0, 3).join(' | ')}）`);

  // 生产落地页现状：不得出现无 SHA 的直链下载（对当前实现的静态检查，可 FAIL）
  if (ctx.exists('docs/index.md')) {
    const html = ctx.read('docs/index.md');
    const apkLinks = (html.match(/href="[^"]*\.apk[^"]*"/g) || []);
    const shaMention = /sha256|SHA-?256/i.test(html);
    c.assert('TEST-C-010', 'docs/index.md', apkLinks.length === 0 || shaMention,
      `生产落地页 APK 直链必须伴随 SHA（APK 链接 ${apkLinks.length} 个，SHA 说明 ${shaMention}）`);
  }

  return c.report();
}

if (process.argv[1] && process.argv[1].endsWith('check-target-landing-claims.mjs')) {
  const ctx = await cliCtx(import.meta.url);
  const r = run(ctx);
  for (const x of r.results) console.log(`${x.pass ? 'ok  ' : 'FAIL'} : [${x.testId}] ${x.message}`);
  console.log(`\n${r.checker}: ${r.pass ? 'PASS' : 'FAIL'}（${r.total - r.failureCount}/${r.total}）`);
  process.exit(r.pass ? 0 : 1);
}
