# Smart HID 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 0a33163ed724ee27d113d5f163faff955f767f775efdd4d35114f9a2a07038d4
```

> PUBLIC-HONESTY-001 / VERSION-METADATA-001 状态以 task-dependency-graph.json 为准。未批准 Task 不得执行。

### TEST-BRIDGE-TS-001

- 状态：**PLANNED**
- 标题：Node 测试桥支持 TS protocol import（Smart HID）
- task_type：TESTABILITY
- severity：P1
- root_cause_id：RC-TEST-BRIDGE-TS
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
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
