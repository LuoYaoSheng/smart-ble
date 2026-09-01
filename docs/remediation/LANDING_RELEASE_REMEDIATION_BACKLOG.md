# Landing / Release 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2
```

> 本轮只规划，不执行。

### FIX-LANDING-001

- 标题：落地页假下载与多端大一统误导
- gap_kind：LANDING
- severity：P0
- Target IDs（样本）：FEAT-075, REQ-059, REQ-060, WEB-001, STATE-W001-03, OP-W001-03, OP-W001-04, OP-W001-05, CLAIM-016, CLAIM-018, CLAIM-028
- Test IDs：TEST-R-001, TEST-R-002, TEST-R-008, TEST-R-009, TEST-R-003, TEST-R-005, TEST-R-006, TEST-R-007, TEST-R-010, TEST-R-011, TEST-E-008
- First Breakpoint（样本）：docs/index.md 三卡均链 releases/latest 假主下载
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：FIX-RELEASE-001
- 解锁：honest download hub；下游 FIX：FIX-E6-001
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(landing): 落地页假下载与多端大一统误导`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-RELEASE-001

- 标题：Release Metadata / VERSION SSOT / UniApp 产物流水线
- gap_kind：RELEASE
- severity：P0
- Target IDs（样本）：FEAT-004, FEAT-066, REQ-004, REQ-056
- Test IDs：TEST-C-006, TEST-U-002, TEST-R-002, TEST-P-010
- First Breakpoint（样本）：仓库根 VERSION 单源文件缺失
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：无
- 解锁：PAGE-009/010 WEB claims；下游 FIX：FIX-LANDING-001, FIX-RUNTIME-009, FIX-PAGE-010, FIX-E6-001
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(release): Release Metadata / VERSION SSOT / UniApp 产物流水线`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

### FIX-E6-001

- 标题：Clean Machine / Release E6
- gap_kind：RELEASE
- severity：null
- Target IDs（样本）：CLAIM-001, CLAIM-002, CLAIM-003, CLAIM-004, CLAIM-005, CLAIM-006, CLAIM-007, CLAIM-008, CLAIM-009, CLAIM-010, CLAIM-011, CLAIM-012
- Test IDs：TEST-R-006, TEST-R-002, TEST-R-007, TEST-A-005, TEST-W-007, TEST-E-001, TEST-A-006, TEST-A-008, TEST-E-003, TEST-W-008, TEST-A-009, TEST-W-009
- First Breakpoint（样本）：E6 NOT_EXECUTED
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：FIX-RELEASE-001, FIX-LANDING-001
- 解锁：E6 claims
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：`fix(release): Clean Machine / Release E6`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）

