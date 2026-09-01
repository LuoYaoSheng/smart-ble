# Feature 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2
```

> 本轮只规划，不执行。

### FIX-RUNTIME-001

- 标题：display-name 解析链模块
- gap_kind：RUNTIME
- severity：P1
- Target IDs（样本）：FEAT-013, REQ-013
- Test IDs：TEST-U-006, TEST-A-005, TEST-W-007
- First Breakpoint（样本）：apps/uniapp/services/ble-runtime/display-name.js 缺失
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FEAT-013 PAGE-001
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): display-name 解析链模块`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-RUNTIME-002

- 标题：HEX validateHexInput 整体拒绝
- gap_kind：RUNTIME
- severity：P1
- Target IDs（样本）：FEAT-028, REQ-026
- Test IDs：TEST-U-010, TEST-I-004, TEST-A-008, TEST-E-003
- First Breakpoint（样本）：目标接口 validateHexInput/parseHexInput 缺失
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FEAT-028 PAGE-006
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): HEX validateHexInput 整体拒绝`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-RUNTIME-003

- 标题：log-redaction 脱敏
- gap_kind：RUNTIME
- severity：P1
- Target IDs（样本）：FEAT-040, REQ-036, REQ-037, REQ-050
- Test IDs：TEST-U-013, TEST-R-004, TEST-U-012, TEST-A-008, TEST-U-015, TEST-I-009, TEST-H-002
- First Breakpoint（样本）：目标模块缺失：apps/uniapp/services/ble-runtime/log-redaction.js
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FEAT-040 SEC
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): log-redaction 脱敏`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-RUNTIME-004

- 标题：write-queue MTU 分包队列
- gap_kind：RUNTIME
- severity：P1
- Target IDs（样本）：FEAT-030, REQ-028
- Test IDs：TEST-U-011, TEST-I-004, TEST-E-003
- First Breakpoint（样本）：目标模块缺失：apps/uniapp/services/ble-runtime/write-queue.js
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FEAT-030 FLOW-005
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): write-queue MTU 分包队列`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-RUNTIME-005

- 标题：reconnect-policy 有限重连
- gap_kind：RUNTIME
- severity：P1
- Target IDs（样本）：FEAT-020, FEAT-021, FEAT-022, FEAT-023, FEAT-024, FEAT-025, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023
- Test IDs：TEST-I-003, TEST-P-006, TEST-A-006, TEST-W-007, TEST-E-002, TEST-E-005, TEST-A-007, TEST-W-008
- First Breakpoint（样本）：目标模块缺失：apps/uniapp/services/ble-runtime/reconnect-policy.js
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FEAT-023/024
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): reconnect-policy 有限重连`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-RUNTIME-006

- 标题：Registry subscription_count + 配网会话分类
- gap_kind：RUNTIME
- severity：P1
- Target IDs（样本）：FEAT-011, FEAT-012, FEAT-036, REQ-011, REQ-012, REQ-033
- Test IDs：TEST-U-005, TEST-I-002, TEST-A-005, TEST-W-007, TEST-I-001, TEST-I-006, TEST-A-013
- First Breakpoint（样本）：Registry 快照缺 subscription_count 字段
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：PAGE-007 DEC-017
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): Registry subscription_count + 配网会话分类`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-RUNTIME-007

- 标题：connectDevice 编排服务发现
- gap_kind：RUNTIME
- severity：P1
- Target IDs（样本）：FLOW-004
- Test IDs：TEST-I-003, TEST-A-006, TEST-A-007, TEST-W-007, TEST-E-002, TEST-E-005
- First Breakpoint（样本）：connectDevice 未编排服务发现（失败不报错=半开泄漏面）
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FLOW-004 ERR-CONN-03
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): connectDevice 编排服务发现`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-RUNTIME-008

- 标题：device-filter keyword 目标接口
- gap_kind：RUNTIME
- severity：P2
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint（样本）：—
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FEAT-014 N/M
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): device-filter keyword 目标接口`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-RUNTIME-009

- 标题：public-status / version-metadata 服务
- gap_kind：RUNTIME
- severity：P1
- Target IDs（样本）：FEAT-009, REQ-009
- Test IDs：TEST-P-001, TEST-W-006, TEST-R-003
- First Breakpoint（样本）：目标模块缺失：apps/uniapp/services/public-status.js
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：FIX-RELEASE-001
- 解锁：PAGE-009/010 WEB；下游 FIX：FIX-PAGE-010
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): public-status / version-metadata 服务`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-OTA-001

- 标题：OtaManager 写 CHAR_CTRL start/commit/abort
- gap_kind：RUNTIME
- severity：P0
- Target IDs（样本）：FEAT-046, FEAT-047, FEAT-048, FEAT-049, FEAT-050, FEAT-051, FEAT-052, REQ-043, REQ-044, REQ-045, REQ-046, OP-P006-12
- Test IDs：TEST-P-006, TEST-A-011, TEST-E-007, TEST-R-003, TEST-I-008, TEST-U-016, TEST-I-010
- First Breakpoint（样本）：OtaManager 未写 CHAR_CTRL start/commit
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FLOW-009 OTA
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): OtaManager 写 CHAR_CTRL start/commit/abort`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-OTA-002

- 标题：validateOtaPackage 六项传输前校验
- gap_kind：RUNTIME
- severity：P1
- Target IDs（样本）：FEAT-081, REQ-066
- Test IDs：TEST-U-016, TEST-I-010, TEST-E-007, TEST-A-011
- First Breakpoint（样本）：validateOtaPackage 接口缺失
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FEAT-081 DEC-016
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(runtime): validateOtaPackage 六项传输前校验`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

