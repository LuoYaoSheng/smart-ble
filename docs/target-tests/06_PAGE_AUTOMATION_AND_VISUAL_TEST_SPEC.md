# 06 页面自动化与视觉测试规范（TEST-P-001..012 / E4）

```yaml
status: APPROVED
document_version: 1.1
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: user
supersedes: [1.0]
```

## 1. 范围 / 非范围

负责：页面状态、全部有效操作、跳转、交互、无障碍基础、响应式（WEB）、清理与 console。
不负责：真实 BLE 设备结果（E5）；不修改业务页面让测试通过。

## 2. TP-G1-R2 交付物（测试定义完整）

- `page-behavior.manifest.json`：从 APPROVED 页面 Markdown §4/5/7/8/9/10/12/13 生成的机器可读行为契约（逐 State / 逐 Operation）。
- `page-behavior.schema.json`：行为契约 schema。
- `pages.manifest.json`：与 pages-target 对齐的页面 Fixture（9 断言维度）。
- `pages-contract.test.mjs`：manifest↔契约一致性。
- `PAGE-001..010.spec.js` + `WEB-001.spec.js`：**完整** Playwright 目标测试（Contract / State suite / Operation suite / Error / Navigation / Platform / Cleanup / Console+a11y；WEB 额外 viewport/theme/CTA/NOT_RELEASED/SHA/QR/SEO/no-JS）。
- `lib/page-driver.js` + `page-driver-contract.md`：Expected/Actual 分离；未实现抛 `NOT_IMPLEMENTED: TARGET_PAGE_DRIVER_MISSING`。
- 生成器：`generate-page-behavior.mjs` + `generate-pages-artifacts.mjs`。

## 3. 断言维度

- 首屏 / 全部 State（可见区块、allowed/disabled、恢复）
- 全部有效 Operation（前置、显示/禁用、执行、UI、Runtime、Device/E5 映射、跳转、清理、失败变体）
- 平台差异 / a11y / console / CTA
- WEB：mobile/desktop、light/dark、Hero CTA、NOT_RELEASED、下载 URL+SHA、QR、SEO/OG、no-JS

## 4. BLOCKED 规则

| 条件 | 分类 |
|---|---|
| 未安装 `@playwright/test` | `BLOCKED_BY_TOOLCHAIN` |
| Playwright 可用但 `TARGET_PAGE_DRIVER≠1` | `BLOCKED_BY_TARGET_DRIVER` |
| Driver + URL 齐备 | 实际执行全部 State/Operation 用例 |

定义完整 ≠ 已执行。BLOCKED 不得计自动化 PASS。

## 5. TP-G2 边界

TP-G2 只分析 Driver / 页面实现差距；**不得**在 TP-G2 补写目标测试期望或把未覆盖的 Operation 推给后续 Gate。

## 6. 退出条件

- behavior manifest 与 pages-target OP/State 集合一致；
- 11 份 spec TODO=0、slice(0,3)=0、逐项参数化；
- Harness 页面完整性全 PASS；
- 业务页面零修改。
