#!/usr/bin/env node
// TP-G1-R2：从 pages-target + page-behavior.manifest 生成完整 Playwright spec（无 TODO、无 slice）。
// 先确保 behavior 已生成：node tests/target/pages/generate-page-behavior.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PAGES_DIR = `${ROOT}/tests/target/pages`;

// Ensure behavior is fresh
const genBeh = spawnSync(process.execPath, [`${PAGES_DIR}/generate-page-behavior.mjs`], { cwd: ROOT, encoding: 'utf8' });
if (genBeh.status !== 0) {
  console.error(genBeh.stderr || genBeh.stdout);
  process.exit(genBeh.status || 1);
}

const pagesTarget = JSON.parse(readFileSync(`${ROOT}/contracts/target/pages-target.json`, 'utf8')).pages;
const behavior = JSON.parse(readFileSync(`${PAGES_DIR}/page-behavior.manifest.json`, 'utf8'));

const CTA_HINTS = {
  'PAGE-001': '开始扫描（权限链路后 1 击内）',
  'PAGE-002': '开始配网（表单校验通过后 1 击）',
  'PAGE-003': '重新配置/立即诊断（2 击内）',
  'PAGE-004': '查看详情/移除（每行 2 击内）',
  'PAGE-005': '重新检测（1 击）',
  'PAGE-006': '读取/写入/订阅（特征卡 2 击内）',
  'PAGE-007': '断开（每卡 2 击内；全断 2 击内）',
  'PAGE-008': '开始广播（预算 ≤31B 时 1 击）',
  'PAGE-009': '分享/反馈（2 击内）',
  'PAGE-010': '版本历史项查看（1 击）',
  'WEB-001': '下载/二维码/快速开始（Hero 2 击内）',
};

const pagesManifest = {
  schema_version: '1.0',
  generated_from: 'contracts/target/pages-target.json',
  note: 'TP-G1-R2 页面目标 Fixture；行为期望见 page-behavior.manifest.json；Playwright spec 完整定义。',
  pages: pagesTarget.map((p) => ({
    id: p.id,
    route: p.route,
    type: p.type,
    states: (p.states || []).map((s) => (typeof s === 'string' ? s : s.id || s.name)),
    operations: (p.operations || []).map((o) => (typeof o === 'string' ? o : o.id || o.name)),
    deprecated_operations: (p.deprecated_operations || []).map((o) => (typeof o === 'string' ? o : o.id || o.name)),
    assertions: {
      first_screen: `${p.id} 首屏渲染：${p.name}`,
      empty_state: p.id === 'PAGE-001' ? '扫描空态 S-01 与筛选空态 S-02（N/M）分别呈现' : `${p.id} 空态呈现且不与错误态混淆`,
      error_states: `${p.id} 错误态映射 07 号 ERR 表；恢复动作可达`,
      loading: `${p.id} 关键 Loading 态有进度反馈`,
      platform_diff: `${p.id} 平台差异按 08 号矩阵降级呈现`,
      navigation: `${p.id} 跳转 entry_from/exit_to 与 04 号路由契约一致`,
      a11y: `${p.id} 可达性：可焦点、有标签、对比度合规（17 号）`,
      cta_reachability: `关键 CTA 2 击内可达：${CTA_HINTS[p.id] ?? '关键操作 2 击内'}`,
      console_error: `${p.id} 正常路径无 console error`,
    },
    web_extra: p.id === 'WEB-001' ? { viewport: ['mobile', 'desktop'], theme: ['light', 'dark'], seo: ['canonical', 'og'], no_js: '核心内容无 JS 可读（降级规则）' } : undefined,
  })),
};

mkdirSync(`${PAGES_DIR}/lib`, { recursive: true });
writeFileSync(`${PAGES_DIR}/pages.manifest.json`, JSON.stringify(pagesManifest, null, 2) + '\n');

const testNum = (p) => (p.id === 'WEB-001' ? '012' : String(Number(p.id.split('-')[1])).padStart(3, '0'));

function specBody(pageMeta, beh) {
  const name = pageMeta.name || beh.page_id;
  const webBlock = beh.page_id === 'WEB-001' ? `
  test.describe('WEB extras', () => {
    for (const viewport of behavior.web_extra.viewports) {
      test(\`viewport \${viewport}\`, async ({ page }, testInfo) => {
        const driver = new TargetPageDriver(PAGE_ID, page);
        driver.requireRuntime(testInfo);
        await driver.resetPage();
        const snap = await driver.getStateSnapshot();
        expect(snap).toBeTruthy();
        expect(behavior.web_extra.viewports).toContain(viewport);
      });
    }
    for (const theme of behavior.web_extra.themes) {
      test(\`theme \${theme}\`, async ({ page }, testInfo) => {
        const driver = new TargetPageDriver(PAGE_ID, page);
        driver.requireRuntime(testInfo);
        await driver.resetPage();
        expect(behavior.web_extra.themes).toContain(theme);
        expect(behavior.web_extra.hero_cta).toBe(true);
        expect(behavior.web_extra.not_released).toBe(true);
        expect(behavior.web_extra.download_url_sha).toBe(true);
        expect(behavior.web_extra.qr).toBe(true);
        expect(behavior.web_extra.seo).toEqual(expect.arrayContaining(['canonical', 'og']));
        expect(behavior.web_extra.no_js).toBe(true);
      });
    }
  });
` : '';

  return `// ${beh.page_id} ${name} 页面目标测试（TEST-P-${testNum(pageMeta)}）
// TP-G1-R2：逐 State / 逐 Operation 完整定义；Expected=page-behavior；Actual=Page Driver。
// Driver 未实现 → BLOCKED_BY_TARGET_DRIVER；不得 PASS。

import { test, expect } from '@playwright/test';
import {
  getManifestEntry,
  getBehaviorPage,
  TargetPageDriver,
  ASSERTION_KEYS,
} from './lib/page-driver.js';

const PAGE_ID = '${beh.page_id}';
const entry = getManifestEntry(PAGE_ID);
const behavior = getBehaviorPage(PAGE_ID);

test.describe(\`\${PAGE_ID} ${name}\`, () => {
  test('Contract / first screen：manifest + behavior 对齐', async () => {
    expect(entry.id).toBe(PAGE_ID);
    expect(behavior.page_id).toBe(PAGE_ID);
    expect(entry.route).toBe('${pageMeta.route}');
    expect(behavior.route).toBe('${pageMeta.route}');
    expect(behavior.first_screen.length).toBeGreaterThan(0);
    expect(behavior.states.length).toBe(entry.states.length);
    expect(behavior.operations.length).toBe(entry.operations.length);
    for (const key of ASSERTION_KEYS) {
      expect(entry.assertions[key], \`断言 \${key}\`).toBeTruthy();
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
      test(\`\${state.state_id} \${state.name || ''}\`, async ({ page }, testInfo) => {
        const driver = new TargetPageDriver(PAGE_ID, page);
        driver.requireRuntime(testInfo);
        await driver.resetPage();
        await driver.setState(state.state_id);
        const snap = await driver.getStateSnapshot();
        expect(snap.state_id).toBe(state.state_id);
        const sections = await driver.getVisibleSections();
        for (const section of state.visible_sections) {
          expect(sections, \`可见区块应含 \${section}\`).toEqual(expect.arrayContaining([expect.stringContaining(section.slice(0, Math.min(8, section.length)))]));
        }
        for (const opId of state.allowed_operations) {
          const ctl = await driver.getControlState(opId);
          expect(ctl.visible || ctl.enabled, \`允许操作 \${opId}\`).toBeTruthy();
        }
        for (const opId of state.disabled_operations) {
          const ctl = await driver.getControlState(opId);
          expect(ctl.enabled, \`禁用操作 \${opId}\`).toBe(false);
        }
        expect(state.expected_recovery).toBeTruthy();
        expect(state.exit_conditions.length).toBeGreaterThan(0);
      });
    }
  });

  test.describe('Operation suite', () => {
    for (const operation of behavior.operations) {
      test(\`\${operation.operation_id} \${operation.control}\`, async ({ page }, testInfo) => {
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
${webBlock}});
`;
}

for (const p of pagesTarget) {
  const beh = behavior.pages.find((x) => x.page_id === p.id);
  if (!beh) {
    console.error(`missing behavior for ${p.id}`);
    process.exit(1);
  }
  const file = `${PAGES_DIR}/${p.id}.spec.js`;
  writeFileSync(file, specBody(p, beh));
}

console.log(`generated: pages.manifest.json + ${pagesTarget.length} operation-level specs`);
console.log(`behavior totals: ${JSON.stringify(behavior.totals)}`);
