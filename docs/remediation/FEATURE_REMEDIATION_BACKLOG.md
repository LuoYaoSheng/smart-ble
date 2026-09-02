# Feature / Runtime 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 0a33163ed724ee27d113d5f163faff955f767f775efdd4d35114f9a2a07038d4
```

> PUBLIC-HONESTY-001 / VERSION-METADATA-001 状态以 task-dependency-graph.json 为准。未批准 Task 不得执行。

### RUNTIME-DISPLAY-NAME-001

- 状态：**DONE**
- 标题：实现 display-name 解析链
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-DISPLAY-NAME
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-display-name-001): 实现 display-name 解析链`

### RUNTIME-FILTER-001

- 状态：**DONE**
- 标题：device-filter 关键词命中项匹配对齐目标
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-DEVICE-FILTER
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-filter-001): device-filter 关键词命中项匹配对齐目标`

### RUNTIME-GATT-CODEC-001

- 状态：**DONE**
- 标题：validateHexInput/parseHexInput
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-GATT-HEX
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-gatt-codec-001): validateHexInput/parseHexInput`

### RUNTIME-WRITE-QUEUE-001

- 状态：**DONE**
- 标题：write-queue MTU 分包队列
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-WRITE-QUEUE
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-write-queue-001): write-queue MTU 分包队列`

### RUNTIME-LOG-REDACTION-001

- 状态：**PLANNED**
- 标题：log-redaction 脱敏
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-LOG-REDACTION
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-log-redaction-001): log-redaction 脱敏`

### RUNTIME-RECONNECT-001

- 状态：**DONE**
- 标题：reconnect-policy 有限重连
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-RECONNECT
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-reconnect-001): reconnect-policy 有限重连`

### RUNTIME-SESSION-001

- 状态：**DONE**
- 标题：Registry subscription_count + 配网会话分类
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-SESSION-REGISTRY
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-session-001): Registry subscription_count + 配网会话分类`

### RUNTIME-CONNECTION-DISCOVERY-001

- 状态：**PLANNED**
- 标题：connectDevice 编排服务发现
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-CONN-DISCOVERY
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-connection-discovery-001): connectDevice 编排服务发现`

### OTA-PACKAGE-001

- 状态：**DONE**
- 标题：客户端 Firmware Package 六项校验
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-OTA-PACKAGE
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：OTA-CLIENT-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(ota-package-001): 客户端 Firmware Package 六项校验`

### OTA-CLIENT-001

- 状态：**PLANNED**
- 标题：客户端完整 OTA 事务（CTRL start→ready→DATA→commit）
- task_type：SOURCE_FIX
- severity：P0
- root_cause_id：RC-OTA-CTRL-START
- Target IDs（样本）：FEAT-046, FEAT-047, FEAT-048, FEAT-049, FEAT-050, FEAT-051, FEAT-052, OP-P006-12, OP-P006-13, OP-P006-14, OP-W001-05, FLOW-009
- Test IDs：TEST-P-006, TEST-A-011, TEST-E-007, TEST-R-003, TEST-I-008, TEST-U-016, TEST-I-010, TEST-R-008
- First Breakpoint：OtaManager 在第一个 DATA 写之前未发送 CTRL start
- 依赖：OTA-PACKAGE-001
- 解锁：VERIFY-ANDROID-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(ota-client-001): 客户端完整 OTA 事务（CTRL start→ready→DATA→commit）`

### OTA-FIRMWARE-001

- 状态：**PLANNED**
- 标题：固件 OTA op/target/hardware/SHA/max_chunk/commit 校验
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-ESP32-OTA-ACTION
- Target IDs（样本）：PROTO-003
- Test IDs：—
- First Breakpoint：固件 OTA JSON 使用 action 字段，目标为 op
- 依赖：ESP32-BUILD-001
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(ota-firmware-001): 固件 OTA op/target/hardware/SHA/max_chunk/commit 校验`
