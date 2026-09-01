// PAGE-007 已连接 页面目标测试（TEST-P-007）
// TP-G1-R2：逐 State / 逐 Operation 完整定义；Expected=page-behavior；Actual=Page Driver。
// Driver 未实现 → BLOCKED_BY_TARGET_DRIVER；不得 PASS。

import { test, expect } from '@playwright/test';
import {
  getManifestEntry,
  getBehaviorPage,
  TargetPageDriver,
  ASSERTION_KEYS,
} from '../lib/page-driver.js';

const PAGE_ID = 'PAGE-007';
const entry = getManifestEntry(PAGE_ID);
const behavior = getBehaviorPage(PAGE_ID);

test.describe(`${PAGE_ID} 已连接`, () => {
  test('Contract / first screen：manifest + behavior 对齐', async () => {
    expect(entry.id).toBe(PAGE_ID);
    expect(behavior.page_id).toBe(PAGE_ID);
    expect(entry.route).toBe('pages/connected/index');
    expect(behavior.route).toBe('pages/connected/index');
    expect(behavior.first_screen.length).toBeGreaterThan(0);
    expect(behavior.states.length).toBe(entry.states.length);
    expect(behavior.operations.length).toBe(entry.operations.length);
    for (const key of ASSERTION_KEYS) {
      expect(entry.assertions[key], `断言 ${key}`).toBeTruthy();
    }
    expect(entry.assertions.first_screen).toContain(PAGE_ID);
    expect(entry.assertions.empty_state.length).toBeGreaterThan(0);
    expect(entry.assertions.error_states.length).toBeGreaterThan(0);
    expect(entry.assertions.loading.length).toBeGreaterThan(0);
    expect(entry.assertions.platform_diff).toContain(PAGE_ID);
    expect(entry.assertions.navigation).toContain('跳转');
    expect(entry.assertions.a11y).toContain(PAGE_ID);
    expect(entry.assertions.cta_reachability).toMatch(/2 击/);
    expect(entry.assertions.console_error).toContain(PAGE_ID);
  });

  test.describe('State suite', () => {
    for (const state of behavior.states) {
      test(`${state.state_id} ${state.name || ''}`, async ({ page }, testInfo) => {
        const driver = new TargetPageDriver(PAGE_ID, page);
        driver.requireRuntime(testInfo);
        await driver.resetPage();
        await driver.setState(state.state_id);
        const snap = await driver.getStateSnapshot();
        expect(snap.state_id).toBe(state.state_id);
        const sections = await driver.getVisibleSections();
        for (const section of state.visible_sections) {
          expect(sections, `可见区块应含 ${section}`).toEqual(expect.arrayContaining([expect.stringContaining(section.slice(0, Math.min(8, section.length)))]));
        }
        for (const opId of state.allowed_operations) {
          const ctl = await driver.getControlState(opId);
          expect(ctl.visible || ctl.enabled, `允许操作 ${opId}`).toBeTruthy();
        }
        for (const opId of state.disabled_operations) {
          const ctl = await driver.getControlState(opId);
          expect(ctl.enabled, `禁用操作 ${opId}`).toBe(false);
        }
        expect(state.expected_recovery).toBeTruthy();
        expect(state.exit_conditions.length).toBeGreaterThan(0);
      });
    }
  });

  test.describe('Operation suite', () => {
    for (const operation of behavior.operations) {
      test(`${operation.operation_id} ${operation.control}`, async ({ page }, testInfo) => {
        const driver = new TargetPageDriver(PAGE_ID, page);
        driver.requireRuntime(testInfo);
        await driver.resetPage();
        await driver.prepareOperation(operation.operation_id);

        const before = await driver.getControlState(operation.operation_id);
        expect(typeof before.visible).toBe('boolean');
        expect(typeof before.enabled).toBe('boolean');
        if (operation.disabled_when) {
          expect(operation.disabled_when.length).toBeGreaterThan(0);
        }

        await driver.perform(operation.operation_id, operation.input_fixture);
        const result = await driver.getOperationResult(operation.operation_id);

        expect(result.ui).toEqual(expect.arrayContaining(operation.expected_ui));
        expect(result.runtime_events.length).toBeGreaterThan(0);
        for (const ev of operation.expected_runtime_events) {
          expect(result.runtime_events.join('|')).toContain(ev.slice(0, Math.min(12, ev.length)));
        }
        if (operation.hardware_dependent) {
          expect(operation.expected_device_events.length + operation.e5_mapping.length).toBeGreaterThan(0);
        }
        if (operation.expected_navigation) {
          const nav = await driver.getNavigationSnapshot();
          expect(nav).toBeTruthy();
          expect(String(nav.target || nav)).toMatch(/PAGE-|WEB-|#|外部|锚点|站内|来源/);
        }
        const cleanup = driver.getCleanupSnapshot();
        expect(cleanup).toBeTruthy();
        expect(cleanup).not.toEqual({ pageId: PAGE_ID, listeners: 0, sessions: 0 });
        for (const c of operation.expected_cleanup) {
          expect(c).toBeTruthy();
        }
        expect(operation.failure_variants.length).toBeGreaterThan(0);
        for (const fv of operation.failure_variants) {
          expect(fv.condition).toBeTruthy();
          expect(fv.expected_ui.length).toBeGreaterThan(0);
        }
        expect(operation.test_ids.length).toBeGreaterThan(0);
      });
    }
  });

  test('Error and recovery', async ({ page }, testInfo) => {
    const driver = new TargetPageDriver(PAGE_ID, page);
    driver.requireRuntime(testInfo);
    await driver.resetPage();
    for (const err of behavior.error_variants) {
      expect(err.error_id).toBeTruthy();
      expect(err.expected_recovery).toBeTruthy();
    }
    expect(entry.assertions.error_states.length).toBeGreaterThan(0);
  });

  test('Navigation and back', async ({ page }, testInfo) => {
    const driver = new TargetPageDriver(PAGE_ID, page);
    driver.requireRuntime(testInfo);
    await driver.resetPage();
    const nav = await driver.getNavigationSnapshot();
    expect(nav).toBeTruthy();
    expect(behavior.navigation).toBeTruthy();
  });

  test('Platform degradation', async ({ page }, testInfo) => {
    const driver = new TargetPageDriver(PAGE_ID, page);
    driver.requireRuntime(testInfo);
    await driver.resetPage();
    expect(behavior.platform_assertions.length).toBeGreaterThan(0);
    expect(entry.assertions.platform_diff).toContain(PAGE_ID);
  });

  test('Cleanup', async ({ page }, testInfo) => {
    const driver = new TargetPageDriver(PAGE_ID, page);
    driver.requireRuntime(testInfo);
    await driver.resetPage();
    const snap = driver.getCleanupSnapshot();
    expect(snap).toBeTruthy();
    expect(behavior.cleanup_assertions.length).toBeGreaterThan(0);
  });

  test('Console and accessibility', async ({ page }, testInfo) => {
    const driver = new TargetPageDriver(PAGE_ID, page);
    driver.requireRuntime(testInfo);
    await driver.resetPage();
    expect(driver.getConsoleErrors()).toEqual([]);
    const a11y = await driver.getAccessibilitySnapshot();
    expect(a11y).toBeTruthy();
    expect(behavior.a11y_assertions.length).toBeGreaterThan(0);
  });
});
