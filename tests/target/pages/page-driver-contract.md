# 目标页面测试 Driver 契约（TP-G1-R2）

Playwright 页面测试通过 `tests/target/pages/lib/page-driver.js` 访问目标 App/H5。
**期望值**来自 `page-behavior.manifest.json`；**实际值**必须由 Driver 探测。禁止用 Expected 冒充 Actual。

## 前置条件

| 条件 | 结果 |
|---|---|
| `@playwright/test` 不可解析 | `BLOCKED_BY_TOOLCHAIN` |
| Playwright 可用但 Page Driver Runtime 未落地 | `BLOCKED_BY_TARGET_DRIVER` |
| Runtime 已落地（`driver/page-driver-runtime.js` 或 `TARGET_PAGE_DRIVER=1`） | 实际执行全部 State/Operation 用例（Fake Runtime；live URL 可选） |

## Driver API（Actual only）

| 方法 | 说明 |
|---|---|
| `openPage(pageId)` | 导航至目标路由 |
| `resetPage(pageId)` | 重置到干净入口态 |
| `setState(stateId)` | 将页面置于目标状态 |
| `getStateSnapshot()` | 当前状态探测结果 |
| `getVisibleSections()` | 当前可见区块（探测） |
| `getControlState(operationId)` | `{ visible, enabled, reason }` |
| `prepareOperation(operationId)` | 进入前置态 + 注入 Fixture |
| `perform(operationId, inputFixture)` | 执行操作 |
| `getOperationResult(operationId)` | `{ ui, runtime_events, device_events, navigation, cleanup, error }` |
| `getNavigationSnapshot()` | 实际导航探测 |
| `getRuntimeEvents()` | Runtime 事件 |
| `getDeviceEvents()` | 设备侧事件（Fake/E5） |
| `getCleanupSnapshot()` | 清理探测（不得固定假零） |
| `getConsoleErrors()` | console.error |
| `getAccessibilitySnapshot()` | a11y 探测 |
| `probeAvailableOperations()` | **仅探测结果**；禁止直接返回 manifest.operations |

## 硬规则

1. Driver 未实现 → 抛 `NOT_IMPLEMENTED: TARGET_PAGE_DRIVER_MISSING` 或 skip `BLOCKED_BY_TARGET_DRIVER`。
2. 不得返回 `page-behavior` / `pages.manifest` 中的期望字段作为实际结果。
3. `getNavigationSnapshot()` 不得返回静态 `exit_to[0]`。
4. `getCleanupSnapshot()` 不得返回固定 `{ listeners:0, sessions:0 }` 冒充成功。
5. Expected 与 Actual 必须在测试中分离比较。

## TP-G1-R2 边界

- 测试**定义**完整（全部 State/Operation 参数化）。
- 当前生产 Driver 未接线时 runtime 用例 BLOCKED，**不得 PASS**。
- TP-G2 只分析 Driver/页面实现差距，不补写目标期望。
