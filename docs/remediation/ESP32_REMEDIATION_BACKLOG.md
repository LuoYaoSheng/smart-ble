# ESP32 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2
```

> 本轮只规划，不执行。

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

### FIX-FW-001

- 标题：ESP32 fixture_observer 固件
- gap_kind：FIRMWARE
- severity：P0
- Target IDs（样本）：OP-P008-01, OP-P008-02, OP-P008-03, FLOW-008, 4fafc201-1fb5-459e-8fcc-c5c9c331914b, 4fafc201-1fb5-459e-8fcc-c5c9c331914c, 4fafc201-1fb5-459e-8fcc-c5c9c331914d
- Test IDs：TEST-P-008, TEST-A-010, TEST-U-014, TEST-I-007, TEST-E-006, TEST-W-009
- First Breakpoint（样本）：hardware/esp32 无 Observer 目标源码（证据闭环第一断点）；页面 Owner 见 FIX-PAGE-008
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：FLOW-008 E5 Observer
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(firmware): ESP32 fixture_observer 固件`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-FW-002

- 标题：ESP32 LED 指令表与广播名对齐
- gap_kind：FIRMWARE
- severity：P1
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint（样本）：—
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：PROTO LED
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(firmware): ESP32 LED 指令表与广播名对齐`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

