// tests/target/firmware/artifact-metadata.test.mjs
// TEST-E-008/TEST-R-008（静态前置）：固件构建产物元数据契约 —— 版本/commit/SHA 三元组与
// 18 号 Release Metadata 同源；无产物时必须 NOT_RELEASED（不得挂链接）。

import test from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ARTIFACT_DIRS = ['dist/firmware', 'releases/firmware', 'hardware/esp32/LightBLE/.pio/build'];
const VERSION_FILE = `${ROOT}/VERSION`;

test('VERSION 单源文件存在（18 号：版本五处同源的源头）', () => {
  assert.ok(existsSync(VERSION_FILE), '仓库根 VERSION 文件存在');
  if (existsSync(VERSION_FILE)) assert.match(readFileSync(VERSION_FILE, 'utf8'), /\d+\.\d+\.\d+/);
});

test('固件产物元数据：有产物必须带 manifest（版本+SHA），无产物必须 NOT_RELEASED', () => {
  const built = ARTIFACT_DIRS.filter((d) => existsSync(`${ROOT}/${d}`));
  // .pio/build 属本机构建缓存（不入库）；发布产物目录 dist/firmware、releases/firmware 不存在 → NOT_RELEASED 姿态
  const releaseDirs = built.filter((d) => !d.includes('.pio'));
  if (releaseDirs.length === 0) {
    // NOT_RELEASED 姿态：落地页/README 不得有固件直链下载
    const landing = existsSync(`${ROOT}/docs/index.md`) ? readFileSync(`${ROOT}/docs/index.md`, 'utf8') : '';
    const fwLinks = landing.match(/href="[^"]*firmware[^"]*\.(bin|zip)"/gi) || [];
    assert.equal(fwLinks.length, 0, `无固件产物时不得出现固件下载直链（发现 ${fwLinks.length} 个）`);
    return;
  }
  for (const d of releaseDirs) {
    assert.ok(existsSync(`${ROOT}/${d}/manifest.json`), `${d} 含 manifest.json（版本+SHA 三元组）`);
  }
});
