# 06 页面自动化与视觉测试规范（TEST-P-001..012 / E4）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：页面状态、跳转、交互、无障碍基础、响应式（WEB）。
不负责：真实 BLE/插件（E4 天然限制）；不修改业务页面让测试通过。

## 2. TP-G1 交付物

- `tests/target/pages/pages.manifest.json`：从 pages-target.json 单源生成的目标数据 Fixture（11 页 × 9 断言维度 + WEB 专属 viewport/theme/SEO/无 JS）。
- `tests/target/pages/pages-contract.test.mjs`：manifest↔契约一致性（5 用例，可执行）。
- `PAGE-001..010.spec.js` + `WEB-001.spec.js`：Playwright 目标骨架（首屏/主操作/a11y+console 三段式）。
- 生成器 `generate-pages-artifacts.mjs`（重跑覆盖，保持单源）。

## 3. 断言维度（每页）

首屏内容｜正常态｜关键 Loading｜空态（S-01/S-02 区分）｜错误态（07 号映射）｜平台差异（08 号降级）｜全部主操作｜跳转返回（04 号契约）｜a11y（17 号）｜WEB：mobile/desktop+light/dark｜console error｜CTA 2 击可达。

## 4. BLOCKED 规则

未安装 Playwright / 未起 H5 原型 → spec 全部 BLOCKED，**不得计自动化 PASS**；manifest 契约断言（E0 性质）照常运行。

## 5. 证据

报告/截图/视频写 ignored 的 evidence 目录（不提交 tracked Playwright report）。

## 6. 退出条件

manifest 5 用例 PASS；11 spec 骨架在位并声明目标步骤；业务页面零修改。
