# 16 Clean Machine 复现

```yaml
status: APPROVED
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

## 1. 范围 / 非范围

负责：独立电脑从零复现（TEST-E-008/TEST-R-011）。模板：tests/target/release/clean-install.test.md。

## 2. 模式

| 模式 | 范围 | 时限 |
|---|---|---|
| BUILD_ONLY | clone→依赖→build（App+固件）| — |
| HARDWARE_E5 | +烧写+真机闭环 | — |
| RELEASE_VERIFY | +Release 产物下载/SHA/安装/QR | 30 分钟（CLAIM-031） |

## 3. 铁律

固定 Commit+SHA；无私有知识；5 分钟 Quick Start（CLAIM-017）不得冒充 30 分钟闭环。

## 4. 退出条件

TP-G6 至少一台独立机器完成 RELEASE_VERIFY 并归档证据包。

## 5. Page E4 Environment（ENV-PLAYWRIGHT-001）

本节能达到：**E4 environment ready**（`READY_FOR_PAGE_E4`）。

**不能**达到：E4 page PASS。页面 PASS 仍需：

- `TEST-PAGE-DRIVER-001`（Target Page Driver）
- App runtime bridge / Target page adapter
- 显式 `TARGET_PAGE_BASE_URL`（禁止默认访问生产站）

### 步骤

1. clone 仓库并检出固定 commit
2. 使用 Node 20–24（见根 `.nvmrc` / `package.json` engines）
3. `npm install`（锁定 `@playwright/test`）
4. `npx playwright install chromium`（仅 Chromium）
5. `node scripts/check-page-test-environment.mjs`
6. 期望：`status=READY_FOR_PAGE_E4`，同时 `driver_blockers` 含 `BLOCKED_BY_TARGET_DRIVER`（Driver 未开）

### 验证入口

- `node scripts/verify-target.mjs --mode=system --format=json` → `page_environment.status`
- 缺 Playwright 时 Current pages 为 `BLOCKED_BY_TOOLCHAIN`
- Playwright 已装但 `TARGET_PAGE_DRIVER≠1` 时为 `BLOCKED_BY_TARGET_DRIVER`
