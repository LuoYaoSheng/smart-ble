// tests/target/harness/page-environment.test.mjs
// ENV-PLAYWRIGHT-001：页面 E4 工具链环境自检；不得因 Playwright 安装成功假定页面实现完成。

import test from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);

test('HARNESS-ENV-PW-001 @playwright/test 可解析', () => {
  assert.doesNotThrow(() => require.resolve('@playwright/test'));
  const pkg = JSON.parse(readFileSync(require.resolve('@playwright/test/package.json'), 'utf8'));
  assert.match(String(pkg.version), /^\d+\.\d+\.\d+/);
});

test('HARNESS-ENV-PW-002 playwright.config.js 与 testDir 存在', () => {
  assert.ok(existsSync(`${ROOT}/playwright.config.js`), 'playwright.config.js');
  assert.ok(existsSync(`${ROOT}/tests/target/pages`), 'tests/target/pages');
  const cfg = readFileSync(`${ROOT}/playwright.config.js`, 'utf8');
  assert.match(cfg, /tests\/target\/pages/);
  assert.match(cfg, /TARGET_PAGE_BASE_URL/);
});

test('HARNESS-ENV-PW-003 Chromium 依赖可解析', () => {
  const { chromium } = require('playwright');
  const exe = chromium.executablePath();
  assert.ok(existsSync(exe), 'chromium executable present');
});

test('HARNESS-ENV-PW-004 环境就绪 ≠ 业务页面 PASS；Driver 阻断可独立识别', () => {
  const env = { ...process.env };
  delete env.TARGET_PAGE_DRIVER;
  delete env.TARGET_PAGE_BASE_URL;
  const r = spawnSync(process.execPath, ['scripts/check-page-test-environment.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env,
  });
  assert.equal(r.status, 0, 'toolchain itself should PASS after ENV-PLAYWRIGHT-001');
  const report = JSON.parse(r.stdout);
  assert.equal(report.status, 'READY_FOR_PAGE_E4');
  // Driver 落地后不再把「缺 env」当作唯一阻断；仍须声明环境 ≠ 页面产品 PASS
  assert.ok(Array.isArray(report.notes));
  assert.ok(report.notes.some((n) => /环境就绪|不等于|≠|仍需/.test(typeof n === 'string' ? n : n.detail || '')));
});

test('HARNESS-ENV-PW-005 不得把环境安装成功当作页面产品实现完成', () => {
  const driverSrc = readFileSync(`${ROOT}/tests/target/pages/lib/page-driver.js`, 'utf8');
  assert.match(driverSrc, /TARGET_PAGE_DRIVER/);
  assert.match(driverSrc, /BLOCKED_BY_TARGET_DRIVER|TARGET_PAGE_DRIVER_MISSING/);
  assert.ok(existsSync(`${ROOT}/tests/target/pages/driver/page-driver-runtime.js`));
});
