// tests/target/harness/page-version-projection.test.mjs
// HARNESS：PAGE-010 必须消费 getVersionPageModel；禁止 versionHistory / 字面量版本硬编码。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importTarget } from '../lib/import-target.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const VERSION_PAGE = `${ROOT}/apps/uniapp/pages/about/version.vue`;
const ABOUT_PAGE = `${ROOT}/apps/uniapp/pages/about/index.vue`;

test('HARNESS-PAGE-VERSION-001 version.vue 禁止硬编码 versionHistory / 字面量版本', () => {
  assert.ok(existsSync(VERSION_PAGE), 'version.vue 存在');
  const src = readFileSync(VERSION_PAGE, 'utf8');
  assert.ok(!/\bversionHistory\b/.test(src), '不得出现 versionHistory 字面量');
  assert.ok(!/['"`]v?1\.0\.\d+['"`]/.test(src), '页面组件不得硬编码 1.0.x 版本字面量');
  assert.ok(/getVersionPageModel/.test(src), '必须调用 getVersionPageModel');
  assert.ok(/暂无正式发布版本/.test(src), '无正式 Release 时必须有占位文案');
  assert.ok(!/下载|\.apk|sha256/i.test(src) || /不提供下载/.test(src), '无 artifact 时不得提供下载入口');
});

test('HARNESS-PAGE-VERSION-001 PAGE-009/010 共用 version-metadata', () => {
  const about = readFileSync(ABOUT_PAGE, 'utf8');
  assert.ok(/version-metadata\.js/.test(about), 'PAGE-009 从 version-metadata 取版本');
  assert.ok(/getPlatformPublicStatuses|getVersionPageModel/.test(about), 'PAGE-009 平台状态来自 Metadata service');
  assert.ok(!/PRODUCT_PLATFORMS/.test(about), 'PAGE-009 不再从 product.js 取完整平台状态表');
});

test('HARNESS-PAGE-VERSION-001 当前 Metadata 投影：1.0.5 PREVIEW、无正式历史', async () => {
  const m = await importTarget('apps/uniapp/services/version-metadata.js');
  assert.ok(m.ok, m.message || 'import version-metadata');
  const model = m.module.getVersionPageModel();
  assert.equal(model.current.version, '1.0.5');
  assert.equal(model.current.status, 'PREVIEW');
  assert.equal(model.current.has_release_tag, false);
  assert.equal(model.current.has_artifacts, false);
  assert.equal(model.history.releases.length, 0);
  assert.ok(model.history.previews.length >= 1);
  assert.ok(model.current.limitations.length >= 1);
});
