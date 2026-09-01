# Smart HID 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2
```

> 本轮只规划，不执行。

### FIX-HID-001

- 标题：smart-hid/profile.js ESM 可载（去 TS 语法）
- gap_kind：SMART_HID
- severity：P1
- Target IDs（样本）：FEAT-053, FEAT-055, FEAT-056, FEAT-058, FEAT-059, REQ-047, REQ-048, REQ-049, REQ-052, REQ-054, REQ-065, TEST-U-015
- Test IDs：TEST-U-015, TEST-H-001, TEST-W-010, TEST-C-007, TEST-P-002, TEST-H-002, TEST-H-003, TEST-P-004, TEST-H-004, TEST-I-009, TEST-P-003, TEST-U-012
- First Breakpoint（样本）：SyntaxError: Unexpected identifier 'as'
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：TEST-U-015
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(smart_hid): smart-hid/profile.js ESM 可载（去 TS 语法）`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-E5-001

- 标题：Android/微信/ESP32 E5 矩阵执行
- gap_kind：TOOLCHAIN
- severity：null
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint（样本）：—
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：FIX-TEST-001
- 解锁：E5 evidence
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(toolchain): Android/微信/ESP32 E5 矩阵执行`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

