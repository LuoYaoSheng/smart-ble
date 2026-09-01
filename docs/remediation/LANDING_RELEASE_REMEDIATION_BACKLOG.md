# Landing / Release 修复 Backlog

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 3e2a59830b1441a4655b27f482eb195c420d25d76b4910b89b21d8a925a09166
```

> PUBLIC-HONESTY-001 / VERSION-METADATA-001 状态以 task-dependency-graph.json 为准。未批准 Task 不得执行。

### PUBLIC-HONESTY-001

- 状态：**DONE**
- 标题：落地页立即诚实降级（假下载/6+/错误主线→PREVIEW/NOT_RELEASED）
- task_type：SOURCE_FIX
- severity：P0
- root_cause_id：RC-LANDING-FAKE-DOWNLOAD
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：VERIFY-E6-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(public-honesty-001): 落地页立即诚实降级（假下载/6+/错误主线→PREVIEW/NOT_RELEASED）`

### VERSION-METADATA-001

- 状态：**DONE**
- 标题：根 VERSION + Release Metadata + Public Status
- task_type：SOURCE_FIX
- severity：P1
- root_cause_id：RC-VERSION-SSOT
- Target IDs（样本）：见 JSON
- Test IDs：—
- First Breakpoint：—
- 依赖：无
- 解锁：RELEASE-PIPELINE-001, PAGE-VERSION-001, VERIFY-E6-001
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`source_fix(version-metadata-001): 根 VERSION + Release Metadata + Public Status`

### RELEASE-PIPELINE-001

- 状态：**PLANNED**
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

- 状态：**PLANNED**
- 标题：Clean Machine / Release E6
- task_type：VERIFY_E6
- severity：—
- root_cause_id：—
- Target IDs（样本）：CLAIM-001, CLAIM-002, CLAIM-003, CLAIM-004, CLAIM-005, CLAIM-006, CLAIM-007, CLAIM-008, CLAIM-009, CLAIM-010, CLAIM-011, CLAIM-012
- Test IDs：TEST-R-006, TEST-E-008, TEST-R-001, TEST-R-002, TEST-R-007, TEST-A-005, TEST-W-007, TEST-E-001, TEST-A-006, TEST-A-008, TEST-E-003, TEST-W-008
- First Breakpoint：E6 NOT_EXECUTED
- 依赖：PUBLIC-HONESTY-001, RELEASE-PIPELINE-001, VERSION-METADATA-001
- 解锁：
- 禁止修改（本轮）：apps/uniapp/** (until TP-G3); docs/target-product/**; contracts/target/** product semantics
- 自动化验收：related CURRENT_FAIL → PASS; System/Harness remain 0 FAIL
- 建议提交信息：`verify_e6(verify-e6-001): Clean Machine / Release E6`
