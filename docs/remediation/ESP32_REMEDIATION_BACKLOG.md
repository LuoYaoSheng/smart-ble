# ESP32 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ed40eeeef16489052a93d5807bf3094dfbfa290df34400ff2bdf3e69919994ff
```

> PUBLIC-HONESTY-001 / VERSION-METADATA-001 状态以 task-dependency-graph.json 为准。未批准 Task 不得执行。

### OTA-FIRMWARE-001

- 状态：**PLANNED**
- 标题：固件 OTA op/target/hardware/SHA/max_chunk/commit 校验
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-ESP32-OTA-ACTION
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：ESP32-BUILD-001
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(ota-firmware-001): 固件 OTA op/target/hardware/SHA/max_chunk/commit 校验`

### ESP32-BUILD-001

- 状态：**PLANNED**
- 标题：两环境、无固定 COM、模块化入口
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-ESP32-BUILD
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：OTA-FIRMWARE-001, ESP32-PERIPHERAL-001, ESP32-OBSERVER-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(esp32-build-001): 两环境、无固定 COM、模块化入口`

### ESP32-PERIPHERAL-001

- 状态：**PLANNED**
- 标题：服务/特征/名称/LED/Device Info 对齐契约
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-ESP32-LED-NAME
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：ESP32-BUILD-001
- 解锁：ESP32-FAULT-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(esp32-peripheral-001): 服务/特征/名称/LED/Device Info 对齐契约`

### ESP32-OBSERVER-001

- 状态：**PLANNED**
- 标题：实现 fixture_observer
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-ESP32-OBSERVER
- Target IDs（样本）：OP-P008-01, OP-P008-02, OP-P008-03, FLOW-008, PROTO-001, PROTO-002, PROTO-003, PROTO-004, PROTO-005, PROTO-009, PROTO-011, EVID-005
- Test IDs：TEST-P-008, TEST-A-010, TEST-U-014, TEST-I-007, TEST-E-006, TEST-W-009, TEST-E-001
- First Breakpoint：hardware/esp32 无 Observer 目标源码
- 依赖：ESP32-BUILD-001
- 解锁：VERIFY-ESP32-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(esp32-observer-001): 实现 fixture_observer`

### ESP32-FAULT-001

- 状态：**PLANNED**
- 标题：Fault Injection + Serial JSON
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-ESP32-SERIAL
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：ESP32-PERIPHERAL-001
- 解锁：VERIFY-ESP32-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(esp32-fault-001): Fault Injection + Serial JSON`
