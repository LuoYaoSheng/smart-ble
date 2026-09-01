// tests/target/pages/lib/page-driver.js
// TP-G1-R2：Expected 在 behavior manifest；Actual 仅由已实现 Driver 探测。
// 未实现时抛 NOT_IMPLEMENTED / skip BLOCKED，禁止返回伪造成功数据。

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

let _pagesManifest;
let _behavior;

export function loadPagesManifest() {
  if (!_pagesManifest) {
    _pagesManifest = JSON.parse(readFileSync(`${ROOT}/tests/target/pages/pages.manifest.json`, 'utf8'));
  }
  return _pagesManifest;
}

export function loadBehaviorManifest() {
  if (!_behavior) {
    _behavior = JSON.parse(readFileSync(`${ROOT}/tests/target/pages/page-behavior.manifest.json`, 'utf8'));
  }
  return _behavior;
}

export function getManifestEntry(pageId) {
  const entry = loadPagesManifest().pages.find((p) => p.id === pageId);
  if (!entry) throw new Error(`pages.manifest 缺少 ${pageId}`);
  return entry;
}

export function getBehaviorPage(pageId) {
  const page = loadBehaviorManifest().pages.find((p) => p.page_id === pageId);
  if (!page) throw new Error(`page-behavior.manifest 缺少 ${pageId}`);
  return page;
}

export function isPlaywrightResolvable() {
  try {
    require.resolve('@playwright/test');
    return true;
  } catch {
    return false;
  }
}

export function isTargetDriverImplemented() {
  return process.env.TARGET_PAGE_DRIVER === '1';
}

export function resolveExecutionContext() {
  if (!isPlaywrightResolvable()) return { mode: 'blocked', reason: BLOCK_REASON.TOOLCHAIN };
  if (!isTargetDriverImplemented()) return { mode: 'blocked', reason: BLOCK_REASON.DRIVER };
  return { mode: 'ready', reason: null };
}

function missing() {
  throw new Error(BLOCK_REASON.MISSING);
}

/**
 * Target Page Driver — Actual API only.
 * Implementations must probe the live page / fake runtime; never echo Expected.
 */
export class TargetPageDriver {
  /**
   * @param {string} pageId
   * @param {import('@playwright/test').Page} [playwrightPage]
   */
  constructor(pageId, playwrightPage) {
    this.pageId = pageId;
    this.pw = playwrightPage;
    this.entry = getManifestEntry(pageId);
    this.behavior = getBehaviorPage(pageId);
    this.ctx = resolveExecutionContext();
    this._consoleErrors = [];
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
      return;
    }
    if (!isTargetDriverImplemented()) {
      testInfo.skip(true, BLOCK_REASON.DRIVER);
    }
  }

  async openPage() {
    if (!isTargetDriverImplemented()) missing();
    const base = process.env.TARGET_APP_URL;
    if (!base) missing();
    await this.pw.goto(`${base.replace(/\/$/, '')}/${this.entry.route}`);
  }

  async resetPage() {
    if (!isTargetDriverImplemented()) missing();
    await this.openPage();
  }

  async setState(_stateId) {
    missing();
  }

  async getStateSnapshot() {
    missing();
  }

  async getVisibleSections() {
    missing();
  }

  async getControlState(_operationId) {
    missing();
  }

  async prepareOperation(_operationId) {
    missing();
  }

  async perform(_operationId, _inputFixture) {
    missing();
  }

  async getOperationResult(_operationId) {
    missing();
  }

  async getNavigationSnapshot() {
    missing();
  }

  /** @deprecated use probeAvailableOperations — kept name for clarity in specs */
  async probeAvailableOperations() {
    missing();
  }

  getRuntimeEvents() {
    missing();
  }

  getDeviceEvents() {
    missing();
  }

  getCleanupSnapshot() {
    missing();
  }

  getConsoleErrors() {
    // Console capture can work without full Driver when page is open;
    // without Driver implementation we still must not claim success path.
    if (!isTargetDriverImplemented()) missing();
    return [...this._consoleErrors];
  }

  async getAccessibilitySnapshot() {
    missing();
  }
}

export const ASSERTION_KEYS = [
  'first_screen', 'empty_state', 'error_states', 'loading',
  'platform_diff', 'navigation', 'a11y', 'cta_reachability', 'console_error',
];

/** Case counts for Runner reporting */
export function countBehaviorCases() {
  const b = loadBehaviorManifest();
  let stateCases = 0;
  let operationCases = 0;
  let assertionCases = 0;
  for (const p of b.pages) {
    stateCases += p.states.length;
    operationCases += p.operations.length;
    // per-op: visible/disabled/success/failure/nav/cleanup ≈ 6 + first_screen/a11y/platform/cleanup page-level
    assertionCases += p.operations.length * 6 + p.states.length * 3 + 8;
    if (p.web_extra) assertionCases += 8;
  }
  return {
    specs: b.pages.length,
    state_cases: stateCases,
    operation_cases: operationCases,
    assertion_cases: assertionCases,
    totals: b.totals,
  };
}
