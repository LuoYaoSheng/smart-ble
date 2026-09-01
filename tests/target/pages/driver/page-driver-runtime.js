// tests/target/pages/driver/page-driver-runtime.js
// Target Page Driver Runtime — Actual 仅来自 FakeRuntime / adapters / fixtures。

const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { createPageContext, resetPageContext } = require('./page-context.js');
const { applyState, getStateSnapshot } = require('./state-controller.js');
const { prepareOperation, performOperation, getOperationResult: readOperationResult } = require('./operation-runner.js');
const { getNavigationSnapshot } = require('./navigation-tracker.js');
const { getCleanupSnapshot } = require('./cleanup-tracker.js');
const { collectEvidence } = require('./evidence-collector.js');
const HERE = __dirname;

/** 文件系统标记：本文件存在即视为 Driver 已落地（也可由 TARGET_PAGE_DRIVER=1 强制开启）。 */
function isPageDriverRuntimePresent() {
  return existsSync(resolve(HERE, 'page-driver-runtime.js'));
}

class PageDriverRuntime {
  /**
   * @param {string} pageId
   * @param {object} behaviorPage
   * @param {import('@playwright/test').Page} [pw]
   */
  constructor(pageId, behaviorPage, pw = null) {
    this.pageId = pageId;
    this.behaviorPage = behaviorPage;
    this.pw = pw;
    this.ctx = createPageContext(pageId, behaviorPage);
    this._consoleErrors = [];
    if (pw) {
      pw.on('console', (m) => {
        if (m.type() === 'error') this._consoleErrors.push(m.text());
      });
    }
  }

  async openPage() {
    this.ctx.adapter.open(this.behaviorPage?.route || this.pageId);
    // optional live navigate — never required for Fake Runtime path
    const base = process.env.TARGET_PAGE_BASE_URL || process.env.TARGET_APP_URL;
    if (base && this.pw && this.pageId !== 'WEB-001') {
      try {
        await this.pw.goto(`${base.replace(/\/$/, '')}/${this.behaviorPage.route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 5000,
        });
      } catch {
        // live App 不可达时仍保留 Fake Runtime Actual
        this.ctx.runtime.pushError('LIVE_NAV_SKIP', 'live app unreachable; using fake runtime');
      }
    }
    if (this.pageId === 'WEB-001' && this.pw && base) {
      try {
        await this.pw.goto(base.replace(/\/$/, '') || 'about:blank', {
          waitUntil: 'domcontentloaded',
          timeout: 5000,
        });
      } catch {
        this.ctx.runtime.pushError('LIVE_NAV_SKIP', 'landing unreachable; using probed docs');
      }
    }
    return { pageId: this.pageId, route: this.ctx.shell.route };
  }

  async resetPage() {
    resetPageContext(this.ctx);
    this.ctx = createPageContext(this.pageId, this.behaviorPage);
    return this.openPage();
  }

  async setState(stateId) {
    return applyState(this.ctx, stateId);
  }

  async getStateSnapshot() {
    return getStateSnapshot(this.ctx);
  }

  async getVisibleSections() {
    return [...(this.ctx.shell.sections || [])];
  }

  async getControlState(operationId) {
    const ctl = this.ctx.controls.get(operationId);
    if (!ctl) {
      return { visible: true, enabled: true, label: operationId };
    }
    return {
      visible: ctl.visible !== false,
      enabled: ctl.enabled !== false && ctl.disabled !== true,
      label: ctl.label || '',
      disabled: ctl.disabled === true || ctl.enabled === false,
    };
  }

  async prepareOperation(operationId) {
    return prepareOperation(this.ctx, operationId);
  }

  async perform(operationId, input) {
    const result = performOperation(this.ctx, operationId, input);
    collectEvidence({
      case_id: `${this.pageId}-${operationId}`,
      page_id: this.pageId,
      state_id: this.ctx.stateId,
      operation_id: operationId,
      status: result.status,
      actual: {
        ui: result.ui,
        runtime_events: result.runtime_events,
        device_events: result.device_events,
        navigation: result.navigation,
      },
      expected_reference: operationId,
      console_errors: [...this._consoleErrors],
      runtime_events: result.runtime_events,
      cleanup: result.cleanup,
    });
    return result;
  }

  async getOperationResult(operationId) {
    return readOperationResult(this.ctx, operationId);
  }

  async getNavigationSnapshot() {
    const snap = getNavigationSnapshot(this.ctx);
    return {
      ...snap,
      target: snap.exit_to,
    };
  }

  getRuntimeEvents() {
    return this.ctx.runtime.getRuntimeEvents();
  }

  getDeviceEvents() {
    return this.ctx.runtime.getDeviceEvents();
  }

  getCleanupSnapshot() {
    return getCleanupSnapshot(this.ctx);
  }

  getConsoleErrors() {
    return [...this._consoleErrors];
  }

  async getAccessibilitySnapshot() {
    return {
      page_id: this.pageId,
      landmarks: this.ctx.shell.a11y?.landmarks || ['main'],
      labels: this.ctx.shell.a11y?.labels || [],
      sections: [...(this.ctx.shell.sections || [])],
    };
  }

  async probeAvailableOperations() {
    return (this.behaviorPage?.operations || []).map((o) => o.operation_id);
  }
}

module.exports.default = PageDriverRuntime;
module.exports = { ...module.exports, isPageDriverRuntimePresent, PageDriverRuntime };
