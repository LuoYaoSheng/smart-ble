// tests/target/pages/lib/page-driver.js
// TP-G1-R2 / TEST-PAGE-DRIVER-001：Expected=behavior manifest；Actual=Page Driver Runtime。
// 禁止回填 Expected；禁止固定空 cleanup / 固定 exit_to。

const { readFileSync, existsSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { PageDriverRuntime, isPageDriverRuntimePresent } = require('../driver/page-driver-runtime.js');

const ROOT = resolve(__dirname, '../../../..');
const RUNTIME_MARKER = resolve(__dirname, '../driver/page-driver-runtime.js');

const BLOCK_REASON = {
  TOOLCHAIN: 'BLOCKED_BY_TOOLCHAIN',
  DRIVER: 'BLOCKED_BY_TARGET_DRIVER',
  MISSING: 'NOT_IMPLEMENTED: TARGET_PAGE_DRIVER_MISSING',
};

let _pagesManifest;
let _behavior;

function loadPagesManifest() {
  if (!_pagesManifest) {
    _pagesManifest = JSON.parse(readFileSync(`${ROOT}/tests/target/pages/pages.manifest.json`, 'utf8'));
  }
  return _pagesManifest;
}

function loadBehaviorManifest() {
  if (!_behavior) {
    _behavior = JSON.parse(readFileSync(`${ROOT}/tests/target/pages/page-behavior.manifest.json`, 'utf8'));
  }
  return _behavior;
}

function getManifestEntry(pageId) {
  const entry = loadPagesManifest().pages.find((p) => p.id === pageId);
  if (!entry) throw new Error(`pages.manifest 缺少 ${pageId}`);
  return entry;
}

function getBehaviorPage(pageId) {
  const page = loadBehaviorManifest().pages.find((p) => p.page_id === pageId);
  if (!page) throw new Error(`page-behavior.manifest 缺少 ${pageId}`);
  return page;
}

function isPlaywrightResolvable() {
  try {
    require.resolve('@playwright/test');
    return true;
  } catch {
    return false;
  }
}

/**
 * Driver 已实现判定：文件系统 runtime 标记，或显式 TARGET_PAGE_DRIVER=1。
 */
function isTargetDriverImplemented() {
  if (process.env.TARGET_PAGE_DRIVER === '0') return false;
  if (process.env.TARGET_PAGE_DRIVER === '1') return true;
  return isPageDriverRuntimePresent() && existsSync(RUNTIME_MARKER);
}

function resolveExecutionContext() {
  if (!isPlaywrightResolvable()) return { mode: 'blocked', reason: BLOCK_REASON.TOOLCHAIN };
  if (!isTargetDriverImplemented()) return { mode: 'blocked', reason: BLOCK_REASON.DRIVER };
  return { mode: 'ready', reason: null };
}

function missing() {
  throw new Error(BLOCK_REASON.MISSING);
}

/**
 * Target Page Driver — Actual API only.
 * Implementations must probe Fake Runtime / adapters; never echo Expected.
 */
class TargetPageDriver {
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
    this._rt = null;
    if (playwrightPage) {
      playwrightPage.on('console', (m) => {
        if (m.type() === 'error') this._consoleErrors.push(m.text());
      });
    }
  }

  _ensureRuntime() {
    if (!isTargetDriverImplemented()) missing();
    if (!this._rt) {
      this._rt = new PageDriverRuntime(this.pageId, this.behavior, this.pw);
    }
    return this._rt;
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
    return this._ensureRuntime().openPage();
  }

  async resetPage() {
    return this._ensureRuntime().resetPage();
  }

  async setState(stateId) {
    return this._ensureRuntime().setState(stateId);
  }

  async getStateSnapshot() {
    return this._ensureRuntime().getStateSnapshot();
  }

  async getVisibleSections() {
    return this._ensureRuntime().getVisibleSections();
  }

  async getControlState(operationId) {
    return this._ensureRuntime().getControlState(operationId);
  }

  async prepareOperation(operationId) {
    return this._ensureRuntime().prepareOperation(operationId);
  }

  async perform(operationId, inputFixture) {
    return this._ensureRuntime().perform(operationId, inputFixture);
  }

  async getOperationResult(operationId) {
    return this._ensureRuntime().getOperationResult(operationId);
  }

  async getNavigationSnapshot() {
    return this._ensureRuntime().getNavigationSnapshot();
  }

  async probeAvailableOperations() {
    return this._ensureRuntime().probeAvailableOperations();
  }

  getRuntimeEvents() {
    return this._ensureRuntime().getRuntimeEvents();
  }

  getDeviceEvents() {
    return this._ensureRuntime().getDeviceEvents();
  }

  getCleanupSnapshot() {
    return this._ensureRuntime().getCleanupSnapshot();
  }

  getConsoleErrors() {
    if (!isTargetDriverImplemented()) missing();
    if (this._rt) {
      return [...this._consoleErrors, ...this._rt.getConsoleErrors()];
    }
    return [...this._consoleErrors];
  }

  async getAccessibilitySnapshot() {
    return this._ensureRuntime().getAccessibilitySnapshot();
  }
}

const ASSERTION_KEYS = [
  'first_screen', 'empty_state', 'error_states', 'loading',
  'platform_diff', 'navigation', 'a11y', 'cta_reachability', 'console_error',
];

function countBehaviorCases() {
  const b = loadBehaviorManifest();
  let stateCases = 0;
  let operationCases = 0;
  let assertionCases = 0;
  for (const p of b.pages) {
    stateCases += p.states.length;
    operationCases += p.operations.length;
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

module.exports = {
  BLOCK_REASON,
  TargetPageDriver,
  ASSERTION_KEYS,
  loadPagesManifest,
  loadBehaviorManifest,
  getManifestEntry,
  getBehaviorPage,
  isPlaywrightResolvable,
  isTargetDriverImplemented,
  resolveExecutionContext,
  countBehaviorCases,
};
