/**
 * F027/F029 桌面投影测试（E-WIN / T-WIN；F028 推广卡已于桌面线裁撤）
 *
 * 锁定三件事：
 * 1. 两线镜像文件逐字节一致（version-metadata.js / config/product.js / 生成产物）；
 * 2. buildVersionString 三态与 uniapp 正典语义一致（V1-V5，对齐 F-AND/K-AND 向量组）；
 * 3. versionPageModel 纯投影（平台四键 / 限制 / previews 1 条 / 禁止编造 release）。
 *
 * Run: node --test tests/desktop/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(import.meta.url);

const LINES = {
  electron: 'apps/desktop/electron/public',
  tauri: 'apps/desktop/tauri/src',
};

function loadLineScripts(relDir) {
  const g = { window: {} };
  global.window = g.window;
  require_(resolve(ROOT, relDir, 'config/release-metadata.generated.js'));
  require_(resolve(ROOT, relDir, 'config/product.js'));
  require_(resolve(ROOT, relDir, 'version-metadata.js'));
  const api = {
    VM: g.window.SmartBLEVersionMetadata,
    PRODUCT: g.window.SmartBLEProduct,
    METADATA: g.window.RELEASE_METADATA,
  };
  delete global.window;
  return api;
}

const electron = loadLineScripts(LINES.electron);
const tauri = loadLineScripts(LINES.tauri);

// ---------------------------------------------------------------------------
// 1. 镜像一致性
// ---------------------------------------------------------------------------

test('mirror: version-metadata.js / product.js / generated artifact byte-identical across E-WIN & T-WIN', () => {
  for (const rel of ['version-metadata.js', 'config/product.js', 'config/release-metadata.generated.js']) {
    const a = readFileSync(resolve(ROOT, LINES.electron, rel), 'utf8');
    const b = readFileSync(resolve(ROOT, LINES.tauri, rel), 'utf8');
    assert.equal(a, b, `${rel} 必须在两线间逐字节一致（锁定镜像）`);
  }
});

test('mirror: 桌面生成产物值 = uniapp 正典产物值', () => {
  const canonical = JSON.parse(
    readFileSync(resolve(ROOT, 'apps/uniapp/config/release-metadata.generated.json'), 'utf8'),
  );
  assert.deepEqual(electron.METADATA, canonical);
  assert.deepEqual(tauri.METADATA, canonical);
});

// ---------------------------------------------------------------------------
// 2. buildVersionString 三态（V1–V5，对齐 F-AND/K-AND M2/M3 向量语义）
// ---------------------------------------------------------------------------

test('V1 缺失版本 → dev.unknown（不编造 0.0.0）', () => {
  assert.equal(electron.VM.buildVersionString({ version: '' }), 'dev.unknown');
  assert.equal(electron.VM.buildVersionString({}), 'dev.unknown');
});

test('V2 release + sha → version+sha', () => {
  assert.equal(
    electron.VM.buildVersionString({ version: '1.0.5', commit: '2d6e79c0123456', channel: 'release' }),
    '1.0.5+2d6e79c',
  );
});

test('V3 release 无 sha → 裸版本', () => {
  assert.equal(electron.VM.buildVersionString({ version: '1.0.5', commit: null, channel: 'release' }), '1.0.5');
});

test('V4 preview + sha → version-dev.sha（sha 取 7 位）', () => {
  assert.equal(
    electron.VM.buildVersionString({ version: '1.0.5', commit: '2d6e79c0123456', channel: 'PREVIEW' }),
    '1.0.5-dev.2d6e79c',
  );
});

test('V5 preview 无 sha → version-dev.unknown', () => {
  assert.equal(electron.VM.buildVersionString({ version: '1.0.5' }), '1.0.5-dev.unknown');
});

// ---------------------------------------------------------------------------
// 3. versionPageModel 投影（M1/M3 语义）
// ---------------------------------------------------------------------------

test('M1 默认元数据：platforms 四键序 / 限制非空 / preview 1 条 / release 不编造', () => {
  const model = electron.VM.getVersionPageModel();
  const c = model.current;
  assert.equal(c.version, '1.0.5');
  assert.deepEqual(c.platforms.map((p) => p.key), ['android', 'wechat', 'h5', 'ios']);
  assert.ok(c.limitations.length > 0, 'known_limitations 投影非空');
  // PREVIEW 渠道：release_tag=null 或 artifacts 空 → releases 必须为空（禁止编造 VERIFIED）
  if (!c.has_release_tag || !c.has_artifacts) {
    assert.equal(model.history.releases.length, 0);
  }
  assert.equal(model.history.previews.length, 1);
  assert.equal(model.history.previews[0].label, '1.0.5 Preview');
});

test('M2 空元数据兜底：不抛异常、字段有形', () => {
  const model = electron.VM.getVersionPageModel({});
  assert.equal(model.current.version, '');
  assert.equal(model.current.display_version, 'dev.unknown');
  assert.deepEqual(model.history, { releases: [], previews: [] });
});

test('M3 注入 release 元数据 → releases 一条 VERIFIED；注入不污染全局', () => {
  const injected = {
    app_version: '2.0.0',
    channel: 'release',
    overall_status: 'RELEASED',
    release_tag: 'v2.0.0',
    built_at: '2026-09-10T00:00:00Z',
    commit: 'aaaaaaab',
    artifacts: [{ name: 'x.zip', url: 'https://example.com/x.zip', sha256: '0'.repeat(64) }],
    public_surfaces: {},
    known_limitations: [],
  };
  const model = electron.VM.getVersionPageModel(injected);
  assert.equal(model.history.releases.length, 1);
  assert.equal(model.history.releases[0].status, 'VERIFIED');
  assert.equal(model.history.previews.length, 0);
  // 注入不污染全局：默认模型仍来自真实产物
  const again = electron.VM.getVersionPageModel();
  assert.equal(again.current.version, '1.0.5');
});

test('F028 桌面裁撤：两线不再导出 RELATED_MINI_PROGRAMS，产品基础信息保留', () => {
  assert.equal(electron.PRODUCT.RELATED_MINI_PROGRAMS, undefined);
  assert.equal(tauri.PRODUCT.RELATED_MINI_PROGRAMS, undefined);
  for (const api of [electron, tauri]) {
    assert.ok(api.PRODUCT.PRODUCT_INFO.website.startsWith('https://'));
    assert.ok(api.PRODUCT.PRODUCT_FEATURES.length > 0);
  }
});

test('T-WIN 线 API 行为与 E-WIN 一致', () => {
  assert.equal(
    tauri.VM.buildVersionString({ version: '1.0.5', commit: '2d6e79c012', channel: 'preview' }),
    electron.VM.buildVersionString({ version: '1.0.5', commit: '2d6e79c012', channel: 'preview' }),
  );
  assert.deepEqual(
    tauri.VM.getVersionPageModel().current.platforms.map((p) => p.key),
    electron.VM.getVersionPageModel().current.platforms.map((p) => p.key),
  );
});
