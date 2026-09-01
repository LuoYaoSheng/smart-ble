# 目标页面测试 Driver 契约（TP-G1-R1）

Playwright 页面测试通过 `tests/target/pages/lib/page-driver.js` 统一访问目标 App/H5 页面。

## 前置条件

| 条件 | 结果 |
|---|---|
| `@playwright/test` 不可解析 | `BLOCKED_BY_TOOLCHAIN` |
| Playwright 可用但无 `TARGET_APP_URL` 且无 `TARGET_PAGE_DRIVER=1` | `BLOCKED_BY_TARGET_DRIVER` |
| 两者齐备 | 实际执行 runtime 断言 |

## Driver API

| 方法 | 说明 |
|---|---|
| `openPage(pageId)` | 导航至 manifest 路由 |
| `setState(stateId)` | 注入/触发目标 UI 状态 |
| `getVisibleSections()` | 首屏可见区块 ID 列表 |
| `getAvailableOperations()` | 当前可用 OP ID 列表 |
| `perform(operationId)` | 执行目标操作 |
| `getNavigationTarget()` | 最近一次跳转目标 |
| `getRuntimeEvents()` | BLE/Runtime 事件快照 |
| `getCleanupSnapshot()` | 离页清理断言数据 |
| `getConsoleErrors()` | console.error 收集 |
| `getAccessibilitySnapshot()` | 基础 a11y 快照 |

## TP-G1 约束

- 生产 Driver 未实现时，runtime 测试必须 `skip`/`fail` 为 `NOT_IMPLEMENTED: TARGET_PAGE_DRIVER_MISSING`，**不得 PASS**。
- Manifest 契约断言（静态）可在 Node/Playwright 无 Driver 时 PASS。
- 每份 spec 必须引用对应 PAGE/WEB ID，覆盖 manifest 全部 states、operations、assertions 类别。
