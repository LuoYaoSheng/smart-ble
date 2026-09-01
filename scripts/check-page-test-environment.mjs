#!/usr/bin/env node
/**
 * Page E4 environment self-check (ENV-PLAYWRIGHT-001).
 * Does NOT execute page specs and does NOT claim E4 PASS.
 *
 * Status:
 *   PASS                     — Playwright + Chromium + config + testDir ready
 *   BLOCKED_BY_TOOLCHAIN     — Playwright/browser/config missing
 *   READY_FOR_PAGE_E4        — toolchain ready; Page Driver / baseURL may still block runs
 *
 * Exit: 0 when toolchain ready (even if Driver missing); 1 on toolchain blockers.
 */

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function rel(p) {
  return relative(ROOT, p).split('\\').join('/') || '.';
}

function nodeOk() {
  const major = Number(process.versions.node.split('.')[0]);
  return major >= 20 && major < 25;
}

function resolvePlaywright() {
  try {
    const pkgPath = require.resolve('@playwright/test/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return { ok: true, version: pkg.version, path: rel(pkgPath) };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 160) };
  }
}

function resolveChromium() {
  try {
    const { chromium } = require('playwright');
    const executable = chromium.executablePath();
    const ok = existsSync(executable);
    return {
      ok,
      // never embed absolute home paths in committed reports — only basename markers
      browser: 'chromium',
      executable_present: ok,
      build_hint: executable.includes('chromium-')
        ? (executable.match(/chromium-\d+/) || ['chromium'])[0]
        : 'chromium',
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 160) };
  }
}

function main() {
  const blockers = [];
  const versions = {
    node: process.versions.node,
    npm: process.env.npm_config_user_agent || null,
  };
  const paths = {
    config: 'playwright.config.js',
    testDir: 'tests/target/pages',
    manifest: 'tests/target/pages/page-behavior.manifest.json',
    pageDriver: 'tests/target/pages/lib/page-driver.js',
    nvmrc: '.nvmrc',
  };

  if (!nodeOk()) {
    blockers.push({
      id: 'BLK-TOOL-NODE',
      kind: 'BLOCKED_BY_TOOLCHAIN',
      detail: `Node ${process.versions.node} outside engines >=20 <25`,
    });
  }

  const pw = resolvePlaywright();
  versions.playwright = pw.ok ? pw.version : null;
  if (!pw.ok) {
    blockers.push({
      id: 'BLK-TOOL-PLAYWRIGHT',
      kind: 'BLOCKED_BY_TOOLCHAIN',
      detail: '@playwright/test 未安装或不可解析',
    });
  }

  const browser = resolveChromium();
  versions.chromium_build = browser.build_hint || null;
  if (!browser.ok) {
    blockers.push({
      id: 'BLK-TOOL-BROWSER',
      kind: 'BLOCKED_BY_TOOLCHAIN',
      detail: 'Chromium 可执行文件缺失（需 npx playwright install chromium）',
    });
  }

  if (!existsSync(resolve(ROOT, paths.config))) {
    blockers.push({
      id: 'BLK-TOOL-PW-CONFIG',
      kind: 'BLOCKED_BY_TOOLCHAIN',
      detail: 'playwright.config.js 缺失',
    });
  }
  if (!existsSync(resolve(ROOT, paths.testDir))) {
    blockers.push({
      id: 'BLK-TOOL-TESTDIR',
      kind: 'BLOCKED_BY_TOOLCHAIN',
      detail: 'tests/target/pages 缺失',
    });
  }
  if (!existsSync(resolve(ROOT, paths.manifest))) {
    blockers.push({
      id: 'BLK-TOOL-MANIFEST',
      kind: 'BLOCKED_BY_TOOLCHAIN',
      detail: 'page-behavior.manifest.json 缺失',
    });
  }
  if (!existsSync(resolve(ROOT, paths.pageDriver))) {
    blockers.push({
      id: 'BLK-TOOL-PAGE-DRIVER-FILE',
      kind: 'BLOCKED_BY_TOOLCHAIN',
      detail: 'page-driver.js 文件缺失',
    });
  }

  const driverEnv = process.env.TARGET_PAGE_DRIVER === '1';
  const baseUrl = process.env.TARGET_PAGE_BASE_URL || '';
  const driverNotes = [];
  if (!driverEnv) {
    driverNotes.push({
      id: 'BLK-TEST-PAGE-DRIVER',
      kind: 'BLOCKED_BY_TARGET_DRIVER',
      detail: 'TARGET_PAGE_DRIVER≠1 — 环境就绪不等于页面 E4 PASS',
    });
  }
  if (!baseUrl) {
    driverNotes.push({
      id: 'BLK-TEST-PAGE-BASE-URL',
      kind: 'BLOCKED_BY_TARGET_DRIVER',
      detail: 'TARGET_PAGE_BASE_URL 未设置 — 禁止默认访问生产站',
    });
  }

  const toolchainReady = blockers.length === 0;
  const status = toolchainReady ? 'READY_FOR_PAGE_E4' : 'BLOCKED_BY_TOOLCHAIN';
  const report = {
    status,
    pass: toolchainReady,
    blockers,
    driver_blockers: driverNotes,
    versions,
    paths,
    notes: [
      'Playwright 环境就绪 ≠ Page Driver 实现完成',
      'E4 page PASS 仍需 TEST-PAGE-DRIVER-001 + App runtime bridge',
    ],
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(toolchainReady ? 0 : 1);
}

main();
