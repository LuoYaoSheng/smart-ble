// tests/target/pages/lib/page-driver.js
// 目标页面测试 Driver（TP-G1-R1）。生产 Driver 未接线时 runtime 断言 BLOCKED_BY_TARGET_DRIVER。

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);

export const BLOCK_REASON = {
  TOOLCHAIN: 'BLOCKED_BY_TOOLCHAIN',
  DRIVER: 'BLOCKED_BY_TARGET_DRIVER',
  MISSING: 'NOT_IMPLEMENTED: TARGET_PAGE_DRIVER_MISSING',
};

let _manifest;
export function loadManifest() {
  if (!_manifest) {
    _manifest = JSON.parse(readFileSync(`${ROOT}/tests/target/pages/pages.manifest.json`, 'utf8'));
  }
  return _manifest;
}

export function getManifestEntry(pageId) {
  const entry = loadManifest().pages.find((p) => p.id === pageId);
  if (!entry) throw new Error(`manifest 缺少 ${pageId}`);
  return entry;
}

export function isPlaywrightResolvable() {
  try {
    require.resolve('@playwright/test');
    return true;
  } catch {
    return false;
  }
}

export function resolveExecutionContext() {
  if (!isPlaywrightResolvable()) return { mode: 'blocked', reason: BLOCK_REASON.TOOLCHAIN };
  const hasUrl = Boolean(process.env.TARGET_APP_URL);
  const hasDriver = process.env.TARGET_PAGE_DRIVER === '1';
  if (!hasUrl && !hasDriver) return { mode: 'blocked', reason: BLOCK_REASON.DRIVER };
  return { mode: 'ready', reason: null };
}

export class TargetPageDriver {
  /**
   * @param {string} pageId
   * @param {import('@playwright/test').Page} [playwrightPage]
   */
  constructor(pageId, playwrightPage) {
    this.pageId = pageId;
    this.pw = playwrightPage;
    this.entry = getManifestEntry(pageId);
    this.ctx = resolveExecutionContext();
    this._consoleErrors = [];
    this._runtimeEvents = [];
    if (playwrightPage) {
      playwrightPage.on('console', (m) => {
        if (m.type() === 'error') this._consoleErrors.push(m.text());
      });
    }
  }

  /** @param {import('@playwright/test').TestInfo} testInfo */
  requireRuntime(testInfo) {
    if (this.ctx.mode === 'blocked') {
      testInfo.skip(true, this.ctx.reason);
    }
    if (process.env.TARGET_PAGE_DRIVER !== '1') {
      testInfo.skip(true, BLOCK_REASON.MISSING);
    }
  }

  async openPage() {
    const base = process.env.TARGET_APP_URL ?? 'http://127.0.0.1:5173';
    const url = `${base.replace(/\/$/, '')}/${this.entry.route}`;
    await this.pw.goto(url);
  }

  async setState(stateId) {
    if (!this.entry.states.includes(stateId)) throw new Error(`未知状态 ${stateId}`);
    throw new Error(BLOCK_REASON.MISSING);
  }

  async getVisibleSections() {
    throw new Error(BLOCK_REASON.MISSING);
  }

  getAvailableOperations() {
    return [...this.entry.operations];
  }

  async perform(operationId) {
    if (!this.entry.operations.includes(operationId)) throw new Error(`未知操作 ${operationId}`);
    throw new Error(BLOCK_REASON.MISSING);
  }

  getNavigationTarget() {
    return this.entry.exit_to?.[0] ?? null;
  }

  getRuntimeEvents() {
    return [...this._runtimeEvents];
  }

  getCleanupSnapshot() {
    return { pageId: this.pageId, listeners: 0, sessions: 0 };
  }

  getConsoleErrors() {
    return [...this._consoleErrors];
  }

  async getAccessibilitySnapshot() {
    throw new Error(BLOCK_REASON.MISSING);
  }
}

export const ASSERTION_KEYS = [
  'first_screen', 'empty_state', 'error_states', 'loading',
  'platform_diff', 'navigation', 'a11y', 'cta_reachability', 'console_error',
];
