# Codex 提示词：TP-G2——当前实现盘点与自动差距报告

> 前置：目标产品与目标测试体系均已由用户批准。
> 本轮只运行测试、盘点当前实现、生成差距和修复任务，不修改业务代码、固件或生产落地页。

---

## 可直接复制给 Codex

```text
你现在执行 Smart BLE 的 TP-G2：当前实现盘点与自动差距报告。

工作区：

/Users/luoyaosheng/Desktop/project/Open/smart-ble

必须先读取：

1. AGENTS.md
2. docs/plans/2026-09-01-target-product-spec-test-gap-remediation-plan.md
3. docs/target-product/REVIEW_SUMMARY.md 与所有 APPROVED target-product 文档
4. contracts/target/**
5. docs/target-tests/REVIEW_SUMMARY.md 与所有 APPROVED target-tests 文档
6. scripts/target/**
7. tests/target/**
8. 现有 product-review、Runtime 审计、页面/ESP32矩阵、落地页矩阵
9. 当前 App、Runtime、固件、文档、CI 和 Release 实现

如果目标产品或测试体系没有批准：

输出 `TARGET_OR_TEST_SYSTEM_NOT_APPROVED` 并停止。

==================================================
一、本轮目标和边界
==================================================

目标：

- 纯事实盘点当前实现；
- 运行目标测试与现有回归；
- 将每个目标 ID 映射到当前实现；
- 生成机器可读差距报告；
- 为每个差距定位第一断点；
- 生成排序后的修复 Backlog；
- 不修业务代码。

允许修改：

- docs/current-state/**
- docs/gap-analysis/**
- docs/remediation/**
- reports/target-vs-current/**
- scripts/target/compare-target-current.mjs
- scripts/target/generate-gap-report.mjs
- 必要的报告 schema / renderer
- docs/target-tests/REVIEW_SUMMARY 中仅添加正式 TP-G2 结果链接

禁止修改：

- docs/target-product 目标内容
- contracts/target 目标内容（除非发现目标自身不一致；此时停止并报告）
- tests/target 的期望以适配当前实现
- apps/uniapp、core、hardware 业务实现
- docs/index.md、VitePress 生产页面
- CI/Release workflow
- 烧写、真机、发布、push
- 自动进入 TP-G3

==================================================
二、当前实现文档
==================================================

创建并详细填写：

1. docs/current-state/README.md
2. docs/current-state/CURRENT_PAGE_IMPLEMENTATION.md
3. docs/current-state/CURRENT_RUNTIME_IMPLEMENTATION.md
4. docs/current-state/CURRENT_ESP32_IMPLEMENTATION.md
5. docs/current-state/CURRENT_SMART_HID_IMPLEMENTATION.md
6. docs/current-state/CURRENT_LANDING_AND_RELEASE_IMPLEMENTATION.md
7. docs/current-state/CURRENT_TEST_COVERAGE.md
8. docs/current-state/CURRENT_BUILD_AND_TOOLCHAIN.md

当前实现文档只能写事实：

- 文件、函数、路由、状态和真实调用链；
- 现有测试覆盖；
- 当前构建工具；
- 当前固件行为；
- 当前落地页、下载、SEO 和 workflow；
- 已有证据等级。

不得把“建议应该改成”写进 current-state；建议属于 gap/remediation。

每个事实必须引用：

- 相对文件路径；
- 函数/组件/配置名；
- 必要时行范围；
- 对应 Target ID。

==================================================
三、必须盘点的当前实现
==================================================

App 页面：

- PAGE-001～010 的模板、脚本、组件、状态、操作和路由；
- 当前首屏结构；
- 当前真实数据来源；
- 当前错误和清理；
- 页面内直接平台 API；
- 未使用组件/composable。

Runtime：

- 全局 BLE callback；
- Scan Session；
- Device Collection；
- Connection Attempt；
- Session Registry；
- Read/Write/Notify；
- tuple routing；
- Reconnect；
- Logger；
- Peripheral owner；
- OTA Manager；
- Smart HID workflow；
- 生命周期与资源释放。

ESP32：

- 实际广播名和宏；
- UUID、属性和服务；
- LED；
- Device Info；
- Notify；
- OTA Control/Data/Status 实际状态机；
- Fault Injection；
- Observer 是否存在；
- PlatformIO 环境和 COM3；
- test 目录和 CI；
- Artifact/version/SHA。

Smart HID：

- matcher；
- Device Info；
- QR/candidate/status；
- errors；
- history；
- diagnostics；
- Session ownership；
- canonical lock；
- E5 evidence。

Landing/Release：

- docs/index.md 区块；
- VitePress nav/sidebar/SEO/OG；
- 下载、二维码、外链；
- release-build.yml；
- deploy-docs.yml；
- 当前 artifact；
- VERSION/manifest/package/about/version 页面；
- public claims；
- evidence/limitations。

==================================================
四、运行测试
==================================================

1. 运行目标测试统一入口。
2. 运行现有 `scripts/verify-uniapp.sh`。
3. 运行现有页面测试和可运行 E2E。
4. 运行 docs build。
5. 环境具备时运行 PlatformIO build/test；缺工具标 BLOCKED_BY_TOOLCHAIN。
6. 不运行真机；E5 标 HARDWARE_PENDING/NOT_EXECUTED。

保存每条命令：

- command；
- exit code；
- duration；
- stdout/stderr 路径；
- 对应 Test ID；
- 第一断点。

测试报告写到：

```text
reports/target-vs-current/logs/
```

或 ignored 目录，不污染 tracked Playwright report。

==================================================
五、差距状态模型
==================================================

每个 Target Item 只能使用：

- NOT_IMPLEMENTED
- IMPLEMENTED_UNTESTED
- AUTOMATED_FAIL
- AUTOMATED_PASS
- BUILD_FAIL
- BUILD_PASS
- HARDWARE_PENDING
- HARDWARE_FAIL
- BLOCKED_BY_PROTOCOL
- BLOCKED_BY_FIXTURE
- BLOCKED_BY_TOOLCHAIN
- BLOCKED_BY_CREDENTIAL
- PASS
- N/A

缺陷严重度单独使用：

- P0：发布或核心流程必然阻断/误导；
- P1：核心正确性或协议问题；
- P2：重要体验、恢复、维护问题；
- P3：一般优化。

不能把“没做真机”自动标为 P0。

==================================================
六、第一断点规则
==================================================

第一断点是最早偏离目标的位置，例如：

```text
目标 OTA：CTRL start → ready → DATA → CTRL commit
当前：直接 DATA
第一断点：未写 CTRL start
不是：最终超时
```

每个 FAIL/BLOCKED 必须记录：

- Target ID；
- Test ID；
- Current file/function；
- Expected；
- Actual；
- First breakpoint；
- Downstream impact；
- Severity；
- Evidence state；
- Suggested FIX ID；
- Release impact。

==================================================
七、机器可读差距报告
==================================================

创建：

reports/target-vs-current/report.schema.json
reports/target-vs-current/target-vs-current.json
reports/target-vs-current/coverage.json
reports/target-vs-current/pages.json
reports/target-vs-current/runtime.json
reports/target-vs-current/esp32.json
reports/target-vs-current/smart-hid.json
reports/target-vs-current/landing-release.json
reports/target-vs-current/tests.json
reports/target-vs-current/first-breakpoints.json

每条记录至少包含：

```json
{
  "target_id": "...",
  "target_type": "requirement|feature|page|flow|protocol|claim",
  "priority": "Must|Should|Could",
  "current_status": "...",
  "severity": "P0|P1|P2|P3|null",
  "evidence_level": "E0|E1|E2|E3|E4|E5|E6|null",
  "implementation_refs": [],
  "test_ids": [],
  "test_results": [],
  "expected": "...",
  "actual": "...",
  "first_breakpoint": "...",
  "downstream_impact": [],
  "dependencies": [],
  "suggested_fix_id": "FIX-...",
  "release_blocking": true
}
```

报告必须可重复生成；禁止把时间戳等非确定值无必要写入核心内容。

==================================================
八、Markdown 差距报告
==================================================

创建：

- docs/gap-analysis/README.md
- docs/gap-analysis/TARGET_VS_CURRENT_SUMMARY.md
- docs/gap-analysis/PAGE_GAP_REPORT.md
- docs/gap-analysis/RUNTIME_GAP_REPORT.md
- docs/gap-analysis/ESP32_GAP_REPORT.md
- docs/gap-analysis/SMART_HID_GAP_REPORT.md
- docs/gap-analysis/LANDING_RELEASE_GAP_REPORT.md
- docs/gap-analysis/TEST_COVERAGE_GAP_REPORT.md

Markdown 应由 JSON 生成或在脚本中校验摘要数字一致。

SUMMARY 至少包含：

- Target 总数；
- PASS/FAIL/BLOCKED 分布；
- Must 覆盖率；
- 自动化通过率；
- E5/E6 Pending 数；
- P0/P1/P2；
- Top 20 First Breakpoints；
- 建议修复顺序；
- 哪些公开 Claim 必须降级；
- 用户需要确认的非技术 Blocker。

==================================================
九、Remediation 文档
==================================================

创建：

- docs/remediation/README.md
- docs/remediation/REMEDIATION_ORDER.md
- docs/remediation/FEATURE_REMEDIATION_BACKLOG.md
- docs/remediation/PAGE_REMEDIATION_BACKLOG.md
- docs/remediation/RUNTIME_REMEDIATION_BACKLOG.md
- docs/remediation/ESP32_REMEDIATION_BACKLOG.md
- docs/remediation/SMART_HID_REMEDIATION_BACKLOG.md
- docs/remediation/LANDING_RELEASE_REMEDIATION_BACKLOG.md
- docs/remediation/BLOCKER_REGISTER.md

每个 FIX 必须包含：

- FIX ID；
- Target IDs；
- First Breakpoint；
- 目标测试；
- 修改文件范围；
- 不允许修改范围；
- 依赖；
- 风险；
- 验收；
- 证据；
- 建议提交信息；
- 排序理由。

排序原则：

1. Target/Contract 自身问题；
2. P0 公开误导；
3. Runtime 基础；
4. PAGE-001；
5. PAGE-006；
6. PAGE-007；
7. PAGE-008/Observer；
8. OTA；
9. PAGE-009/010 与 Landing Preview；
10. Smart HID；
11. E5/E6 与 Release。

不得在本轮执行 FIX。

==================================================
十、已知关键点必须被正确分类
==================================================

以下只作为核对，不允许硬编码报告结果；必须从实际测试/代码得出：

- OTA 当前可能直接 DATA，目标要求 CTRL start/ready/commit；
- PAGE-008 可能内联广播逻辑，目标要求 composable/adapter/service 分层；
- Observer 可能缺失；
- 广播实际名称可能与宏/目标不同；
- COM3 可能写死；
- 版本可能漂移；
- 落地页可能有假下载、多平台错误主线；
- Release workflow 可能仍构建非 UniApp 主产物；
- 显示名可能缺 AD 0x08/0x09；
- Smart HID 配网/诊断 E5 可能未执行。

如果当前实现已变化，以实际事实为准。

==================================================
十一、验证
==================================================

必须验证：

- JSON Schema 和报告可解析；
- 报告生成两次核心内容一致；
- 每个 Must Target 有状态；
- 每个 FAIL/BLOCKED 有第一断点；
- 每个差距有 FIX ID；
- Markdown 统计与 JSON 一致；
- 没有业务代码修改；
- `git diff --check` 通过。

==================================================
十二、提交与报告
==================================================

建议提交：

`docs(gap): compare the approved Smart BLE target with current implementation`

只提交 current-state、gap-analysis、remediation、报告脚本和可审阅 JSON；大日志/截图不提交。

不得 push。

最终报告：

TP-G2: PASS/PARTIAL/FAIL
TARGET COUNTS
STATUS DISTRIBUTION
P0/P1/P2/P3
TOP FIRST BREAKPOINTS
TEST RESULTS
BLOCKED ENVIRONMENT/HARDWARE/CREDENTIAL
REMEDIATION ORDER
BUSINESS CODE: NOT MODIFIED
HARDWARE: NOT EXECUTED
COMMIT / PUSHED NO
NEXT: 用户审阅差距和修复顺序，批准后 TP-G3

任何没有实际测试或事实引用的差距不得写成确认问题。
```
