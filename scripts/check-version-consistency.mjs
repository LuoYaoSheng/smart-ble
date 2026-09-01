#!/usr/bin/env node
/**
 * Smart BLE 产品版本一致性门禁（VERSION SSOT）。
 * 不强制 docs/package.json、contracts/target product_version、固件 FIRMWARE_VERSION。
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const errors = [];

function fail(msg) {
  errors.push(msg);
}

function read(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

function mustExist(rel) {
  if (!existsSync(resolve(ROOT, rel))) fail(`missing: ${rel}`);
}

mustExist('VERSION');
mustExist('release/release-state.json');
mustExist('release/release-manifest.json');
mustExist('release/release-manifest.schema.json');
mustExist('docs/public/release/latest.json');
mustExist('apps/uniapp/config/release-metadata.generated.json');
mustExist('apps/uniapp/config/release-metadata.generated.js');
mustExist('apps/uniapp/services/version-metadata.js');
mustExist('apps/uniapp/services/public-status.js');

const versionRaw = existsSync(resolve(ROOT, 'VERSION')) ? read('VERSION') : '';
const version = versionRaw.replace(/^\uFEFF/, '').split(/\r?\n/)[0]?.trim() || '';

if (!SEMVER.test(version)) fail(`根 VERSION 不是合法 SemVer: ${JSON.stringify(version)}`);
if (version !== '1.0.5') fail(`本轮产品 VERSION 必须为 1.0.5，实际 ${version}`);
if (!versionRaw.endsWith('\n')) fail('VERSION 必须以 LF 换行结尾');
if (versionRaw.includes('\r')) fail('VERSION 不得含 CR');

const uniManifest = readJson('apps/uniapp/manifest.json');
const uniPkg = readJson('apps/uniapp/package.json');
const releaseManifest = readJson('release/release-manifest.json');
const docsLatest = readJson('docs/public/release/latest.json');
const appGenerated = readJson('apps/uniapp/config/release-metadata.generated.json');
const state = readJson('release/release-state.json');
const generatedJs = read('apps/uniapp/config/release-metadata.generated.js');
const productJs = read('apps/uniapp/config/product.js');
const aboutVue = read('apps/uniapp/pages/about/index.vue');
const landing = read('docs/index.md');

if (uniManifest.versionName !== version) {
  fail(`manifest versionName=${uniManifest.versionName} ≠ VERSION=${version}`);
}
if (String(uniManifest.versionCode) !== '101') {
  fail(`versionCode 本轮应保留 101，实际 ${uniManifest.versionCode}`);
}
if (uniPkg.version !== version) {
  fail(`apps/uniapp/package.json version=${uniPkg.version} ≠ VERSION=${version}`);
}
if (releaseManifest.app_version !== version) fail('release-manifest.json app_version 漂移');
if (docsLatest.app_version !== version) fail('docs/public/release/latest.json app_version 漂移');
if (appGenerated.app_version !== version) fail('release-metadata.generated.json app_version 漂移');
if (!generatedJs.includes(`"app_version": "${version}"`) && !generatedJs.includes(`app_version: '${version}'`)) {
  // JSON.stringify in module uses "app_version": "1.0.5"
  if (!new RegExp(`"app_version"\\s*:\\s*"${version.replace(/\./g, '\\.')}"`).test(generatedJs)) {
    fail('generated.js 未投影正确 app_version');
  }
}

if (Object.prototype.hasOwnProperty.call(state, 'app_version')) {
  fail('release-state.json 不得重复保存 app_version');
}

if (!Array.isArray(releaseManifest.artifacts) || releaseManifest.artifacts.length !== 0) {
  fail('当前 PREVIEW Metadata artifacts 必须为 []');
}
if (releaseManifest.release_tag != null) fail('PREVIEW release_tag 必须为 null（不得生成 v1.0.5 tag 投影）');
if (releaseManifest.commit != null) fail('PREVIEW commit 必须为 null');
if (releaseManifest.built_at != null) fail('PREVIEW built_at 必须为 null');
if (releaseManifest.wechat_qr?.image != null) fail('WeChat QR image 必须为 null');
if (releaseManifest.wechat_qr?.status !== 'not_released') fail('WeChat QR status 必须为 not_released');

const fakeUrl = JSON.stringify(releaseManifest).match(/"url"\s*:\s*"[^"]+"/);
const fakeSha = JSON.stringify(releaseManifest).match(/"sha256"\s*:\s*"[^"]+"/);
if (fakeUrl || fakeSha) fail('无 Artifact 时不得出现 url/sha256 字段假值');

if (/versionFallback/.test(productJs)) {
  fail('apps/uniapp/config/product.js 仍含 versionFallback');
}
if (!landing.includes(version)) fail(`docs/index.md 未投影产品版本 ${version}`);
if (!/PREVIEW/.test(landing)) fail('docs/index.md 未投影 PREVIEW');
if (/版本元数据尚未发布/.test(landing)) fail('docs/index.md 仍写「版本元数据尚未发布」');

if (/versionFallback/.test(aboutVue)) {
  fail('About 页仍依赖 versionFallback');
}

// PAGE-010 硬编码属 PAGE-VERSION-001，本检查明确不把它计为 VERSION-METADATA 完成条件
const versionPage = read('apps/uniapp/pages/about/version.vue');
if (!/versionHistory/.test(versionPage)) {
  // 若已改掉也不在本 Task 验收；仅记录信息
  console.log('note: PAGE-010 versionHistory 状态由 PAGE-VERSION-001 负责，本轮不验收页面改写');
} else {
  console.log('note: PAGE-010 仍硬编码 versionHistory → PAGE-VERSION-001（本轮预期）');
}

// 排除域：不得误改
const docsPkg = readJson('docs/package.json');
if (docsPkg.version === version && docsPkg.name && /vitepress|docs/i.test(JSON.stringify(docsPkg))) {
  // docs package 允许碰巧同号，但不要求；仅当被错误强制为产品版本时也不 fail
}
const productTarget = readJson('contracts/target/product-target.json');
if (productTarget.product_version === version && version === '1.0.5') {
  // 契约包仍应为 1.0.0；若被误改则 fail
}
if (productTarget.product_version !== '1.0.0') {
  fail(`contracts/target/product-target.json product_version 被误改（期望 1.0.0，实际 ${productTarget.product_version}）`);
}

if (errors.length) {
  console.error('check-version-consistency FAIL:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`check-version-consistency PASS (VERSION=${version}, versionCode=101)`);
