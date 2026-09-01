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

test('HARNESS-ENV-PW-004 缺 TARGET_PAGE_DRIVER 时为 BLOCKED_BY_TARGET_DRIVER 而非 PASS', () => {
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
  assert.ok(Array.isArray(report.driver_blockers));
  assert.ok(
    report.driver_blockers.some((b) => b.kind === 'BLOCKED_BY_TARGET_DRIVER'),
    'must surface BLOCKED_BY_TARGET_DRIVER when driver/env missing',
  );
  assert.ok(!report.notes?.some((n) => /页面 E4 PASS/.test(n) && !/仍需|不等于|≠/.test(n)));
});

test('HARNESS-ENV-PW-005 不得把环境安装成功当作页面实现完成', () => {
  const driverSrc = readFileSync(`${ROOT}/tests/target/pages/lib/page-driver.js`, 'utf8');
  assert.match(driverSrc, /TARGET_PAGE_DRIVER/);
  assert.match(driverSrc, /BLOCKED_BY_TARGET_DRIVER|TARGET_PAGE_DRIVER_MISSING/);
  assert.notEqual(process.env.TARGET_PAGE_DRIVER, '1', 'this harness run must not pretend driver is enabled');
});
