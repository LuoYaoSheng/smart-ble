# 页面修复 Backlog

```yaml
status: REVIEW
gate: TP-G2
```

> 本轮只规划，不执行。

### FIX-TEST-001

- 标题：Target Page Driver 实现
- gap_kind：TESTABILITY
- severity：P1
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint（样本）：—
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：FIX-TEST-002
- 解锁：E4 page automation；下游 FIX：FIX-E5-001
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(testability): Target Page Driver 实现`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-TEST-002

- 标题：Playwright / H5 harness 工具链
- gap_kind：TOOLCHAIN
- severity：P2
- Target IDs（样本）：PAGE-001, PAGE-001#AUTOMATION, STATE-P001-01, STATE-P001-02, STATE-P001-03, STATE-P001-04, STATE-P001-05, STATE-P001-06, STATE-P001-07, STATE-P001-08, STATE-P001-09, STATE-P001-10
- Test IDs：TEST-P-001, TEST-A-001, TEST-A-005, TEST-W-001, TEST-W-007, TEST-E-001, TEST-W-006, TEST-A-004, TEST-W-005, TEST-E-005, TEST-P-007, TEST-U-005
- First Breakpoint（样本）：@playwright/test 未安装 → 页面 Case BLOCKED_BY_TOOLCHAIN（非产品缺陷）
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：page runtime execution；下游 FIX：FIX-TEST-001
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(toolchain): Playwright / H5 harness 工具链`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-PAGE-008

- 标题：广播页改用 Owner/composable 非内联
- gap_kind：PAGE
- severity：P1
- Target IDs（样本）：FEAT-041, FEAT-042, FEAT-043, FEAT-044, FEAT-045, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042
- Test IDs：TEST-P-008, TEST-A-010, TEST-W-009, TEST-E-006, TEST-U-014, TEST-I-007
- First Breakpoint（样本）：PAGE-008 内联逻辑；useBroadcastSession 未使用
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：PAGE-008 FEAT-041+
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(page): 广播页改用 Owner/composable 非内联`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-PAGE-010

- 标题：版本页改为 Metadata 投影非硬编码
- gap_kind：PAGE
- severity：P1
- Target IDs（样本）：OP-P010-01, OP-P010-02, OP-P010-03, OP-P010-04
- Test IDs：TEST-P-010, TEST-W-010
- First Breakpoint（样本）：pages/about/version.vue 硬编码 versionHistory
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：FIX-RELEASE-001, FIX-RUNTIME-009
- 解锁：PAGE-010
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(page): 版本页改为 Metadata 投影非硬编码`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

