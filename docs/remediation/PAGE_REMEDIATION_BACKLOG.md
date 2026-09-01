# 页面修复 Backlog

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 3e2a59830b1441a4655b27f482eb195c420d25d76b4910b89b21d8a925a09166
```

> PUBLIC-HONESTY-001 / VERSION-METADATA-001 状态以 task-dependency-graph.json 为准。未批准 Task 不得执行。

### ENV-PLAYWRIGHT-001

- 状态：**PLANNED**
- 标题：安装并锁定 Playwright / H5 harness
- task_type：ENVIRONMENT
- severity：P2
- root_cause_id：RC-PLAYWRIGHT
- Target IDs（样本）：PAGE-001#BLK-TOOL-PLAYWRIGHT, STATE-P001-01, STATE-P001-02, STATE-P001-03, STATE-P001-04, STATE-P001-05, STATE-P001-06, STATE-P001-07, STATE-P001-08, STATE-P001-09, STATE-P001-10, OP-P001-01
- Test IDs：TEST-P-001, TEST-W-006, TEST-A-004, TEST-W-005, TEST-A-001, TEST-W-001, TEST-A-005, TEST-W-007, TEST-E-001, TEST-E-005, TEST-P-007, TEST-U-005
- First Breakpoint：@playwright/test 未安装
- 依赖：无
- 解锁：TEST-PAGE-DRIVER-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`environment(env-playwright-001): 安装并锁定 Playwright / H5 harness`

### TEST-PAGE-DRIVER-001

- 状态：**PLANNED**
- 标题：实现 Target Page Driver
- task_type：TESTABILITY
- severity：P2
- root_cause_id：RC-PAGE-DRIVER
- Target IDs（样本）：PAGE-001#BLK-TEST-PAGE-DRIVER, PAGE-002#BLK-TEST-PAGE-DRIVER, PAGE-003#BLK-TEST-PAGE-DRIVER, PAGE-004#BLK-TEST-PAGE-DRIVER, PAGE-005#BLK-TEST-PAGE-DRIVER, PAGE-006#BLK-TEST-PAGE-DRIVER, PAGE-007#BLK-TEST-PAGE-DRIVER, PAGE-008#BLK-TEST-PAGE-DRIVER, PAGE-009#BLK-TEST-PAGE-DRIVER, PAGE-010#BLK-TEST-PAGE-DRIVER, WEB-001#BLK-TEST-PAGE-DRIVER
- Test IDs：—
- First Breakpoint：TARGET_PAGE_DRIVER 未实现
- 依赖：ENV-PLAYWRIGHT-001
- 解锁：VERIFY-ANDROID-001, VERIFY-WECHAT-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`testability(test-page-driver-001): 实现 Target Page Driver`

### PAGE-BROADCAST-001

- 状态：**PLANNED**
- 标题：PAGE-008 改用 composable/adapter/service
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-PAGE-BROADCAST
- Target IDs（样本）：FEAT-041, FEAT-042, FEAT-043, FEAT-044, FEAT-045, PAGE-008
- Test IDs：TEST-P-008, TEST-A-010, TEST-W-009, TEST-E-006, TEST-I-007, TEST-U-014
- First Breakpoint：PAGE-008 内联广告逻辑；useBroadcastSession 未使用
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(page-broadcast-001): PAGE-008 改用 composable/adapter/service`

### PAGE-VERSION-001

- 状态：**DONE**
- 标题：PAGE-010 改为 Metadata 投影
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-PAGE-VERSION
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：VERSION-METADATA-001
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(page-version-001): PAGE-010 改为 Metadata 投影`
