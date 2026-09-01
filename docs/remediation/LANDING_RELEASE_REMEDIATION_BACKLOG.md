# Landing / Release 修复 Backlog

```yaml
status: APPROVED
gate: TP-G3
content_hash: 54902a01ef816b379460f622959b6e65c8de4a2af90740f8dafa21c14c694a5d
approved_by: user
```

> PUBLIC-HONESTY-001 = **DONE**。VERSION-METADATA-001 / RELEASE-PIPELINE-001 仍为 PLANNED。

### PUBLIC-HONESTY-001

- 状态：**DONE**
- 标题：落地页立即诚实降级（假下载/6+/错误主线→PREVIEW/NOT_RELEASED）
- task_type：SOURCE_FIX
- severity：P0
- root_cause_id：RC-LANDING-FAKE-DOWNLOAD（已关闭）
- Target IDs（样本）：FEAT-070, FEAT-075, WEB-001, CLAIM-016.., STATE-W001-03, OP-W001-03..
- Test IDs：TEST-R-003, TEST-R-001（honesty 相关）PASS；TEST-R-002 仍属 VERSION-METADATA-001
- First Breakpoint（修复前）：docs/index.md releases/latest 假主下载 / 无 NOT_RELEASED
- 依赖：无
- 解锁：VERIFY-E6-001（仍待其他依赖）
- 证据：`docs/index.md` PREVIEW + NOT_RELEASED 不可点击产物卡；SEO 已对齐
- 建议提交信息：`docs(site): publish an honest Smart BLE preview`

### VERSION-METADATA-001

- 标题：根 VERSION + Release Metadata + Public Status
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-VERSION-SSOT
- Target IDs（样本）：FEAT-004, FEAT-009, FEAT-066, REQ-004, REQ-009, REQ-056, PAGE-009, CLAIM-001, EVID-008
- Test IDs：TEST-C-006, TEST-U-002, TEST-R-002, TEST-E-008, TEST-R-001, TEST-P-001, TEST-W-006, TEST-R-003, TEST-P-010, TEST-P-009, TEST-A-012, TEST-W-010
- First Breakpoint：[TEST-U-002 REQ-004/056 FEAT-004/066 PAGE-009/010 WEB-001 S-47] 第一断点: 目标模块缺失：apps/uniapp/services/version-metadata.js
- 依赖：无
- 解锁：RELEASE-PIPELINE-001, PAGE-VERSION-001, VERIFY-E6-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(version-metadata-001): 根 VERSION + Release Metadata + Public Status`

### RELEASE-PIPELINE-001

- 标题：UniApp + Peripheral/Observer 双固件 Release Pipeline
- task_type：RELEASE
- severity：P0
- root_cause_id：RC-RELEASE-PIPELINE
- Target IDs（样本）：PROTO-010
- Test IDs：TEST-E-006
- First Breakpoint：.github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + Peripheral/Observer firmware
- 依赖：VERSION-METADATA-001
- 解锁：VERIFY-E6-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`release(release-pipeline-001): UniApp + Peripheral/Observer 双固件 Release Pipeline`

### VERIFY-E6-001

- 标题：Clean Machine / Release E6
- task_type：VERIFY_E6
- severity：—
- root_cause_id：—
- Target IDs（样本）：CLAIM-002, CLAIM-003, CLAIM-004, CLAIM-005, CLAIM-006, CLAIM-007, CLAIM-008, CLAIM-009, CLAIM-010, CLAIM-011, CLAIM-012, CLAIM-013
- Test IDs：TEST-R-002, TEST-R-007, TEST-A-005, TEST-W-007, TEST-E-001, TEST-A-006, TEST-A-008, TEST-E-003, TEST-W-008, TEST-A-009, TEST-W-009, TEST-E-007
- First Breakpoint：E6 NOT_EXECUTED
- 依赖：PUBLIC-HONESTY-001, RELEASE-PIPELINE-001, VERSION-METADATA-001
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`verify_e6(verify-e6-001): Clean Machine / Release E6`
