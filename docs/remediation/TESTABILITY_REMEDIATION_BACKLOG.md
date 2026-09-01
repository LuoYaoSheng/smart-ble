# 测试可执行性 Backlog

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 3e2a59830b1441a4655b27f482eb195c420d25d76b4910b89b21d8a925a09166
```

> PUBLIC-HONESTY-001 / VERSION-METADATA-001 状态以 task-dependency-graph.json 为准。未批准 Task 不得执行。

### TEST-CURRENT-INTEGRITY-001

- 状态：**DONE**
- 标题：Current 度量完整性（TP-G1-R3 已完成）
- task_type：TESTABILITY
- severity：—
- root_cause_id：—
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`testability(test-current-integrity-001): Current 度量完整性（TP-G1-R3 已完成）`

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

### TEST-BRIDGE-TS-001

- 状态：**PLANNED**
- 标题：Node 测试桥支持 TS protocol import（Smart HID）
- task_type：TESTABILITY
- severity：P1
- root_cause_id：RC-TEST-BRIDGE-TS
- Target IDs（样本）：FEAT-053, FEAT-058, REQ-047, REQ-049, REQ-054, FLOW-010
- Test IDs：TEST-U-015, TEST-H-001, TEST-W-010, TEST-C-007, TEST-H-003, TEST-I-009, TEST-H-002
- First Breakpoint：[TEST-U-015 REQ-047~050 FEAT-053/055/056/058 FLOW-010] 第一断点: SyntaxError: Unexpected identifier 'as'
- 依赖：无
- 解锁：VERIFY-SMART-HID-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`testability(test-bridge-ts-001): Node 测试桥支持 TS protocol import（Smart HID）`
