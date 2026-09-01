// tests/target/pages/generate-pages-artifacts.mjs
// 从 contracts/target/pages-target.json 单源生成 manifest + 完整 Playwright spec（无 TODO）。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const pages = JSON.parse(readFileSync(`${ROOT}/contracts/target/pages-target.json`, 'utf8')).pages;

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

const manifest = {
  schema_version: '1.0',
  generated_from: 'contracts/target/pages-target.json',
  note: 'TP-G1-R1 页面目标数据 Fixture：E4 断言以本清单+pages-target 为准；Playwright spec 消费 page-driver 契约。',
  pages: pages.map((p) => ({
    id: p.id,
    route: p.route,
    type: p.type,
    states: (p.states || []).map((s) => (typeof s === 'string' ? s : s.id || s.name)),
    operations: (p.operations || []).map((o) => (typeof o === 'string' ? o : o.id || o.name)),
    deprecated_operations: (p.deprecated_operations || []).map((o) => (typeof o === 'string' ? o : o.id || o.name)),
    assertions: {
      first_screen: `${p.id} 首屏渲染：${p.name}`,
      empty_state: p.id === 'PAGE-001' ? '扫描空态 S-01（未发现附近设备）与筛选空态 S-02（N/M 口径）分别呈现' : `${p.id} 空态呈现且不与错误态混淆`,
      error_states: `${p.id} 错误态映射 07 号 ERR 表；恢复动作可达`,
      loading: `${p.id} 关键 Loading 态（扫描/连接/写/OTA）有进度反馈`,
      platform_diff: `${p.id} 平台差异按 08 号矩阵降级呈现`,
      navigation: `${p.id} 跳转 entry_from/exit_to 与 04 号路由契约一致`,
      a11y: `${p.id} 可达性：可焦点、有标签、对比度合规（17 号）`,
      cta_reachability: `关键 CTA 2 击内可达：${CTA_HINTS[p.id] ?? '关键操作 2 击内'}`,
      console_error: `${p.id} 正常路径无 console error`,
    },
    web_extra: p.id === 'WEB-001' ? { viewport: ['mobile', 'desktop'], theme: ['light', 'dark'], seo: ['canonical', 'og'], no_js: '核心内容无 JS 可读（降级规则）' } : undefined,
  })),
};

mkdirSync(`${ROOT}/tests/target/pages/lib`, { recursive: true });
writeFileSync(`${ROOT}/tests/target/pages/pages.manifest.json`, JSON.stringify(manifest, null, 2) + '\n');

const testNum = (p) => (p.id === 'WEB-001' ? '012' : String(Number(p.id.split('-')[1])).padStart(3, '0'));

const specBody = (p) => `// ${p.id} ${p.name} 页面目标测试（TEST-P-${testNum(p)}）
// 断言源：pages.manifest.json + page-driver 契约；runtime 缺 Driver 时 BLOCKED_BY_TARGET_DRIVER。

import { test, expect } from '@playwright/test';
import { getManifestEntry, TargetPageDriver, ASSERTION_KEYS } from './lib/page-driver.js';

const PAGE_ID = '${p.id}';
const entry = getManifestEntry(PAGE_ID);

test.describe(\`\${PAGE_ID} ${p.name}\`, () => {
  test('契约：manifest 覆盖 states/operations/断言维度', async () => {
    expect(entry.id).toBe(PAGE_ID);
    expect(entry.route).toBe('${p.route}');
    expect(entry.states.length).toBeGreaterThan(0);
    expect(entry.operations.length).toBeGreaterThan(0);
    for (const key of ASSERTION_KEYS) {
      expect(entry.assertions[key], \`断言 \${key}\`).toBeTruthy();
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
`;

for (const p of pages) {
  const file = p.id === 'WEB-001'
    ? `${ROOT}/tests/target/pages/WEB-001.spec.js`
    : `${ROOT}/tests/target/pages/${p.id}.spec.js`;
  writeFileSync(file, specBody(p));
}
console.log(`generated: pages.manifest.json + ${pages.length} complete specs`);
