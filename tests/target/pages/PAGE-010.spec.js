// PAGE-010 版本记录 页面目标测试（TEST-P-010）
// 断言源：pages.manifest.json + page-driver 契约；runtime 缺 Driver 时 BLOCKED_BY_TARGET_DRIVER。

import { test, expect } from '@playwright/test';
import { getManifestEntry, TargetPageDriver, ASSERTION_KEYS } from './lib/page-driver.js';

const PAGE_ID = 'PAGE-010';
const entry = getManifestEntry(PAGE_ID);

test.describe(`${PAGE_ID} 版本记录`, () => {
  test('契约：manifest 覆盖 states/operations/断言维度', async () => {
    expect(entry.id).toBe(PAGE_ID);
    expect(entry.route).toBe('pages/about/version');
    expect(entry.states.length).toBeGreaterThan(0);
    expect(entry.operations.length).toBeGreaterThan(0);
    for (const key of ASSERTION_KEYS) {
      expect(entry.assertions[key], `断言 ${key}`).toBeTruthy();
    }
    for (const s of entry.states) expect(typeof s).toBe('string');
    for (const op of entry.operations) expect(op).toMatch(/^OP-/);
  });

  test('首屏区块与全部目标状态', async ({ page }, testInfo) => {
    const driver = new TargetPageDriver(PAGE_ID, page);
    driver.requireRuntime(testInfo);
    await driver.openPage();
    expect(entry.assertions.first_screen).toContain(PAGE_ID);
    for (const stateId of entry.states) {
      await driver.setState(stateId);
      const sections = await driver.getVisibleSections();
      expect(sections.length).toBeGreaterThan(0);
    }
    expect(entry.assertions.empty_state.length).toBeGreaterThan(0);
    expect(entry.assertions.error_states.length).toBeGreaterThan(0);
    expect(entry.assertions.loading.length).toBeGreaterThan(0);
  });

  test('主操作、禁用条件与跳转返回', async ({ page }, testInfo) => {
    const driver = new TargetPageDriver(PAGE_ID, page);
    driver.requireRuntime(testInfo);
    await driver.openPage();
    const ops = driver.getAvailableOperations();
    expect(ops).toEqual(entry.operations);
    for (const opId of entry.operations.slice(0, 3)) {
      await driver.perform(opId);
    }
    expect(entry.assertions.navigation).toContain('跳转');
    expect(driver.getNavigationTarget()).toBeTruthy();
  });

  test('平台差异、console、a11y 与 CTA 可达性', async ({ page }, testInfo) => {
    const driver = new TargetPageDriver(PAGE_ID, page);
    driver.requireRuntime(testInfo);
    await driver.openPage();
    expect(entry.assertions.platform_diff).toContain(PAGE_ID);
    expect(entry.assertions.cta_reachability).toMatch(/2 击/);
    const a11y = await driver.getAccessibilitySnapshot();
    expect(a11y).toBeTruthy();
    expect(driver.getConsoleErrors()).toEqual([]);
    expect(entry.assertions.console_error).toContain(PAGE_ID);
    expect(driver.getCleanupSnapshot().pageId).toBe(PAGE_ID);
  });
});
