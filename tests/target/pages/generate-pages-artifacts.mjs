// tests/target/pages/generate-pages-artifacts.mjs
// 一次性生成器：从 contracts/target/pages-target.json 单源生成
//   ① pages.manifest.json（目标数据 Fixture + 断言清单）
//   ② PAGE-001..010.spec.js / WEB-001.spec.js（Playwright 目标骨架，未装 Playwright 时由 runner 标 BLOCKED）
// 生成物入库；重跑覆盖。不修改业务页面。

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
  note: 'TP-G1 页面目标数据 Fixture：E4 断言以本清单+pages-target 为准；Playwright spec 为可运行骨架。',
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

mkdirSync(`${ROOT}/tests/target/pages`, { recursive: true });
writeFileSync(`${ROOT}/tests/target/pages/pages.manifest.json`, JSON.stringify(manifest, null, 2) + '\n');

// ---- Playwright 目标骨架 ----
const specHeader = (p) => `// ${p.id} ${p.name} 页面目标自动化骨架（TEST-P-${String(Number(p.id.split('-')[1])).padStart(3, '0')}）
// E4：Playwright 可运行时按本骨架执行；未安装/未起 H5 原型时 runner 标 BLOCKED（不得计 PASS）。
// 断言源：tests/target/pages/pages.manifest.json + contracts/target/pages-target.json（TP-G1 不改业务页面）。

import { test, expect } from '@playwright/test';

test.describe('${p.id} ${p.name}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.TARGET_APP_URL ?? 'http://127.0.0.1:5173/${p.route}');
  });

  test('首屏内容与关键状态', async ({ page }) => {
    await expect(page).toHaveTitle(/.+/);
    // TODO(TP-G2 接线): 断言 manifest.assertions.first_screen / empty_state / error_states / loading
  });

  test('主操作与跳转返回', async ({ page }) => {
    // TODO(TP-G2 接线): manifest.operations 逐项触发；entry_from/exit_to 往返
  });

  test('无障碍与 console', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    // TODO(TP-G2 接线): a11y 快照 + errors.length === 0
  });
});
`;

for (const p of pages) {
  const file = p.id === 'WEB-001'
    ? `${ROOT}/tests/target/pages/WEB-001.spec.js`
    : `${ROOT}/tests/target/pages/${p.id}.spec.js`;
  writeFileSync(file, specHeader(p));
}
console.log(`generated: pages.manifest.json + ${pages.length} specs`);
