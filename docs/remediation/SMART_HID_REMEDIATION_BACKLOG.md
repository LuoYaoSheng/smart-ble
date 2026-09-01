# Smart HID 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 5c58aa6d543f8943886694a38cf03bf4accee2799a5b5636257017e4b676e591
```

> PUBLIC-HONESTY-001 / VERSION-METADATA-001 状态以 task-dependency-graph.json 为准。未批准 Task 不得执行。

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

### VERIFY-SMART-HID-001

- 状态：**PLANNED**
- 标题：Smart HID E5 端到端
- task_type：VERIFY_E5
- severity：—
- root_cause_id：—
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：TEST-BRIDGE-TS-001
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`verify_e5(verify-smart-hid-001): Smart HID E5 端到端`
