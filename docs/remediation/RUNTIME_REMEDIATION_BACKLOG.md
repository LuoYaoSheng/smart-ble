# Runtime 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 6d61cc538b5131d8ae7fe4b9490737b696efa2a178a30eca611cd6d8ab550772
```

> PUBLIC-HONESTY-001 / VERSION-METADATA-001 状态以 task-dependency-graph.json 为准。未批准 Task 不得执行。

### RUNTIME-DISPLAY-NAME-001

- 状态：**DONE**
- 标题：实现 display-name 解析链
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-DISPLAY-NAME
- Target IDs（样本）：FEAT-013, REQ-013, PAGE-001, FLOW-002
- Test IDs：TEST-U-006 + device-display-name-target DN-01..18
- First Breakpoint：（已关闭）原：display-name.js 缺失 → resolveDeviceDisplayName / resolveDisplayName
- 依赖：无
- 解锁：—
- 关闭证据：apps/uniapp/services/ble-runtime/device-display-name.js + display-name.js；discovery/store 归一化附加 displayName
- 自动化验收：TEST-U-006 PASS；System/Harness 0 FAIL
- 建议提交信息：`feat(runtime): add BLE display name resolver`


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

- 状态：**PLANNED**
- 标题：validateHexInput/parseHexInput
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-GATT-HEX
- Target IDs（样本）：FEAT-026, FEAT-028, REQ-024, REQ-026, PAGE-006, FLOW-005
- Test IDs：TEST-U-009, TEST-A-006, TEST-E-003, TEST-U-010, TEST-I-004, TEST-A-008, TEST-P-006, TEST-U-011, TEST-U-012, TEST-I-003, TEST-I-005, TEST-I-008
- First Breakpoint：[TEST-U-010 REQ-026 FEAT-028] 第一断点: 目标接口 validateHexInput/parseHexInput 缺失
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-gatt-codec-001): validateHexInput/parseHexInput`

### RUNTIME-WRITE-QUEUE-001

- 状态：**PLANNED**
- 标题：write-queue MTU 分包队列
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-WRITE-QUEUE
- Target IDs（样本）：FEAT-030, REQ-028
- Test IDs：TEST-U-011, TEST-I-004, TEST-E-003
- First Breakpoint：[TEST-U-011 REQ-028 FEAT-030 PAGE-006 FLOW-005] 第一断点: 目标模块缺失：apps/uniapp/services/ble-runtime/write-queue.js
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
- Target IDs（样本）：FEAT-040, REQ-036, REQ-037, REQ-050, PAGE-002, WEB-001
- Test IDs：TEST-U-013, TEST-R-004, TEST-U-012, TEST-A-008, TEST-U-015, TEST-I-009, TEST-H-002, TEST-P-002, TEST-H-001, TEST-H-003, TEST-W-010, TEST-R-001
- First Breakpoint：[TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ble-runtime/log-redaction.js
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-log-redaction-001): log-redaction 脱敏`

### RUNTIME-RECONNECT-001

- 状态：**PLANNED**
- 标题：reconnect-policy 有限重连
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-RECONNECT
- Target IDs（样本）：FEAT-023, REQ-022, FLOW-004
- Test IDs：TEST-I-003, TEST-A-007, TEST-W-008, TEST-E-002, TEST-A-006, TEST-W-007, TEST-E-005
- First Breakpoint：[REQ-022/023 FEAT-023/024 TEST-I-003(纯策略) 10号§5] 第一断点: 目标模块缺失：apps/uniapp/services/ble-runtime/reconnect-policy.js
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-reconnect-001): reconnect-policy 有限重连`

### RUNTIME-SESSION-001

- 状态：**PLANNED**
- 标题：Registry subscription_count + 配网会话分类
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-SESSION-REGISTRY
- Target IDs（样本）：FEAT-011, FEAT-012, FEAT-062, REQ-011, REQ-012, REQ-053, PAGE-001, PAGE-007, FLOW-002, DEC-017
- Test IDs：TEST-U-005, TEST-I-002, TEST-A-005, TEST-W-007, TEST-P-005, TEST-H-005, TEST-I-009, TEST-H-006, TEST-P-001, TEST-A-001, TEST-W-001, TEST-E-001
- First Breakpoint：[TEST-U-005 REQ-030/DATA-003 DEC-017] 第一断点: Registry 快照缺 subscription_count 字段
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
- Target IDs（样本）：FEAT-021, REQ-019, ERR-CONN-03
- Test IDs：TEST-I-003, TEST-A-006, TEST-E-002, TEST-P-006, TEST-W-007
- First Breakpoint：[REQ-020/021 ERR-CONN-03] 第一断点: connectDevice 未编排服务发现（失败不报错=半开泄漏面）
- 依赖：无
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(runtime-connection-discovery-001): connectDevice 编排服务发现`

### OTA-PACKAGE-001

- 状态：**PLANNED**
- 标题：客户端 Firmware Package 六项校验
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-OTA-PACKAGE
- Target IDs（样本）：FEAT-081, REQ-066, FLOW-009, DEC-016
- Test IDs：TEST-U-016, TEST-I-010, TEST-E-007, TEST-A-011, TEST-I-008
- First Breakpoint：[TEST-U-016 REQ-066 FEAT-081 DEC-016] 第一断点: 目标接口 validateOtaPackage 缺失（六项传输前校验）
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
- Target IDs（样本）：FEAT-046, FEAT-047, FEAT-048, FEAT-049, FEAT-050, FEAT-051, FEAT-052, REQ-043, REQ-044, REQ-045, REQ-046, OP-P006-12
- Test IDs：TEST-P-006, TEST-A-011, TEST-E-007, TEST-R-003, TEST-I-008, TEST-U-016, TEST-I-010, TEST-R-008
- First Breakpoint：OtaManager 在第一个 DATA 写之前未发送 CTRL start
- 依赖：OTA-PACKAGE-001
- 解锁：VERIFY-ANDROID-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(ota-client-001): 客户端完整 OTA 事务（CTRL start→ready→DATA→commit）`
