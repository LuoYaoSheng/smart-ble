# Smart BLE 目标产品规范、测试体系、差距分析与修复总计划

> 日期：2026-09-01
> 状态：CURRENT / 当前唯一方法论与执行主线
> 适用仓库：`smart-ble`
> 核心原则：先定义目标产品，再定义验证目标产品的测试；然后用测试和机器可读契约比较当前实现，最后只修复已确认的差距。
> 本计划替代“先审计当前实现，再直接把审计结论冻结成目标产品”的执行方法。

---

## 0. 为什么必须重新分层

当前已有资料包含产品契约、页面审核、Runtime 审计、ESP32 说明、落地页审核和 Gate 看板，但其中混合了三种完全不同的内容：

1. **目标状态**：产品最终应该是什么。
2. **当前状态**：现有代码现在是什么。
3. **差距与修复建议**：当前实现离目标还差什么。

如果三者不分开，就会出现：

- 现有页面有什么，就把什么写进目标契约；
- 现有代码漏掉的功能，只被标成“待验证”，而不是目标缺口；
- 现有错误测试反过来保护错误实现；
- 页面、ESP32、落地页、版本和 Release 各写一套事实；
- 修复时没有稳定目标，导致反复改需求；
- 落地页根据营销文案发布，而不是根据证据发布。

正确链路固定为：

```text
目标产品文档
→ 机器可读目标契约
→ 目标测试规范
→ 可执行测试脚本
→ 当前实现盘点
→ 自动差距报告
→ 修复任务包
→ 自动化回归
→ Android / 微信 / ESP32 真机
→ 公开落地页与 Release
```

任何后续开发都必须能追溯到：

```text
目标需求 ID
→ 页面 / 流程 / 协议 ID
→ 测试 ID
→ 实现文件
→ 证据 ID
→ Release 声明 ID
```

---

# 1. 文档分层与唯一事实源

## 1.1 目标产品层（Normative）

目录：

```text
docs/target-product/
```

只回答：

> 产品最终应该是什么、用户应该看到什么、设备应该执行什么、公开页面可以承诺什么。

该目录不写：

- 当前代码是否已经实现；
- 当前测试是否通过；
- 当前 Bug 清单；
- 临时修复方案；
- 某次验证结果。

## 1.2 目标测试层（Normative Verification）

目录：

```text
docs/target-tests/
```

只回答：

> 如何证明目标产品已经实现，以及每项能力最低需要哪一级证据。

测试规范必须从目标需求生成，不能从当前实现反推。

## 1.3 当前实现层（Descriptive）

目录：

```text
docs/current-state/
```

只回答：

> 当前页面、Runtime、ESP32、落地页、CI 和 Release 实际是什么。

现有 `docs/product-review/`、`docs/verification/uniapp-runtime-chain-audit.md` 和 `3495a46` 等资料作为当前实现事实输入，不再决定目标产品。

## 1.4 差距分析层（Generated / Reviewable）

目录：

```text
docs/gap-analysis/
reports/target-vs-current/
```

回答：

> 目标与当前的差异、第一断点、修改范围、测试失败和发布影响。

该层应尽量由脚本生成，人工补充判断，但不能手工维护两套互相漂移的状态。

## 1.5 修复与交付层（Execution）

目录：

```text
docs/remediation/
docs/verification/runs/
release/
```

回答：

- 按什么顺序修；
- 每项修复改哪些文件；
- 哪个测试先失败；
- 哪些真机证据完成；
- 哪些能力可以进入公开 Release。

---

# 2. 必须补齐的完整文档体系

## 2.1 目标产品总目录

```text
docs/target-product/
├── README.md
├── 00_DOCUMENT_CONTROL_AND_GLOSSARY.md
├── 01_PRODUCT_VISION_SCOPE_AND_PRINCIPLES.md
├── 02_PERSONAS_JOBS_AND_SCENARIOS.md
├── 03_TARGET_FEATURE_CATALOG.md
├── 04_INFORMATION_ARCHITECTURE_AND_NAVIGATION.md
├── 05_TARGET_PAGE_CATALOG.md
├── pages/
│   ├── PAGE-001_SCAN.md
│   ├── PAGE-002_HID_PROVISION.md
│   ├── PAGE-003_HID_DETAIL.md
│   ├── PAGE-004_HID_HISTORY.md
│   ├── PAGE-005_HID_DIAGNOSTICS.md
│   ├── PAGE-006_DEVICE_DETAIL.md
│   ├── PAGE-007_CONNECTED.md
│   ├── PAGE-008_BROADCAST.md
│   ├── PAGE-009_ABOUT.md
│   └── PAGE-010_VERSION.md
├── web/
│   └── WEB-001_LANDING_PAGE.md
├── 06_TARGET_USER_FLOWS.md
├── 07_INTERACTION_STATE_AND_ERROR_MODEL.md
├── 08_PLATFORM_CAPABILITY_AND_DEGRADATION_MATRIX.md
├── 09_DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY.md
├── 10_RUNTIME_ARCHITECTURE_AND_RESOURCE_OWNERSHIP.md
├── 11_BLE_GATT_PROTOCOL_CONTRACT.md
├── 12_ESP32_FIXTURE_CONTRACT.md
├── 13_SMART_HID_PROFILE_CONTRACT.md
├── 14_OBSERVABILITY_LOGGING_AND_EVIDENCE.md
├── 15_SECURITY_AND_THREAT_MODEL.md
├── 16_NON_FUNCTIONAL_REQUIREMENTS.md
├── 17_ACCESSIBILITY_I18N_AND_CONTENT_GUIDE.md
├── 18_VERSION_RELEASE_METADATA_AND_PUBLIC_STATUS.md
├── 19_OPEN_SOURCE_DEVELOPER_EXPERIENCE.md
├── 20_OPERATIONS_SUPPORT_AND_MAINTENANCE.md
├── 21_RISK_REGISTER_AND_DECISION_LOG.md
├── 22_TARGET_TRACEABILITY_MATRIX.md
└── 23_DEFINITION_OF_DONE.md
```

## 2.2 目标测试总目录

```text
docs/target-tests/
├── README.md
├── 01_TEST_STRATEGY_AND_EVIDENCE_LEVELS.md
├── 02_REQUIREMENT_TO_TEST_TRACEABILITY.md
├── 03_CONTRACT_AND_STATIC_TEST_SPEC.md
├── 04_UNIT_TEST_SPEC.md
├── 05_INTEGRATION_AND_FAKE_RUNTIME_TEST_SPEC.md
├── 06_PAGE_AUTOMATION_AND_VISUAL_TEST_SPEC.md
├── 07_ESP32_AUTOMATED_TEST_SPEC.md
├── 08_ANDROID_HARDWARE_TEST_MATRIX.md
├── 09_WECHAT_HARDWARE_TEST_MATRIX.md
├── 10_SMART_HID_END_TO_END_TEST_MATRIX.md
├── 11_LANDING_PAGE_AND_RELEASE_TEST_SPEC.md
├── 12_TEST_DATA_FIXTURES_AND_MOCKS.md
├── 13_EVIDENCE_PACKAGE_FORMAT.md
├── 14_DEFECT_TRIAGE_AND_FIRST_BREAKPOINT.md
├── 15_ACCEPTANCE_AND_RELEASE_GATES.md
├── 16_CLEAN_MACHINE_REPRODUCTION.md
└── 17_POST_RELEASE_SMOKE_AND_ROLLBACK.md
```

## 2.3 机器可读契约

```text
contracts/target/
├── product-target.schema.json
├── product-target.json
├── pages-target.schema.json
├── pages-target.json
├── flows-target.schema.json
├── flows-target.json
├── platform-target.schema.json
├── platform-target.json
├── ble-fixture-target.schema.json
├── ble-fixture-target.json
├── smart-hid-target.schema.json
├── smart-hid-target.json
├── landing-target.schema.json
├── landing-target.json
├── test-traceability.schema.json
└── test-traceability.json
```

Markdown 是人类正典；JSON 是机器投影。脚本必须检查二者一致，不能各自独立修改。

## 2.4 当前实现、差距和修复文档

```text
docs/current-state/
├── README.md
├── CURRENT_PAGE_IMPLEMENTATION.md
├── CURRENT_RUNTIME_IMPLEMENTATION.md
├── CURRENT_ESP32_IMPLEMENTATION.md
├── CURRENT_LANDING_AND_RELEASE_IMPLEMENTATION.md
└── CURRENT_TEST_COVERAGE.md

docs/gap-analysis/
├── README.md
├── TARGET_VS_CURRENT_SUMMARY.md
├── PAGE_GAP_REPORT.md
├── RUNTIME_GAP_REPORT.md
├── ESP32_GAP_REPORT.md
├── SMART_HID_GAP_REPORT.md
├── LANDING_RELEASE_GAP_REPORT.md
└── TEST_COVERAGE_GAP_REPORT.md

docs/remediation/
├── README.md
├── REMEDIATION_ORDER.md
├── FEATURE_REMEDIATION_BACKLOG.md
├── PAGE_REMEDIATION_BACKLOG.md
├── ESP32_REMEDIATION_BACKLOG.md
├── LANDING_RELEASE_REMEDIATION_BACKLOG.md
└── BLOCKER_REGISTER.md
```

---

# 3. 每类文档必须包含什么

## 3.1 产品范围文档

必须明确：

- 产品定位和非目标；
- 第一正式版本包含与不包含；
- Android、微信、H5、iOS、其他客户端的角色；
- LightBLE Peripheral / Observer 的角色；
- Smart HID 的位置；
- 不恢复的 Cloud、账号、会员、支付、License；
- 正式能力、Preview、Blocked、Unsupported、Not Released 的定义；
- 产品原则：诚实状态、目标先行、设备结果优先、历史不冒充实时。

## 3.2 功能目录

每项功能必须包含：

```text
Feature ID
名称
用户价值
目标用户
优先级 Must / Should / Could / Not Now
所属页面
关联流程
前置条件
输入
输出
正常结果
错误和恢复
平台差异
数据来源
ESP32 / Smart HID 依赖
安全与隐私
性能要求
测试 ID
最低证据等级
公开发布条件
```

功能至少分为：

- SYS 平台与能力；
- PERM 权限；
- SCAN 扫描；
- AD 广播解析；
- CONN 连接；
- GATT；
- SESSION；
- LOG；
- PERIPHERAL；
- OTA；
- HID 配网；
- HID 历史与诊断；
- PRODUCT 关于、版本和分享；
- WEB 落地页和发布；
- DOC 开源与开发者体验。

## 3.3 页面规范

每个 PAGE / WEB 文档必须包含：

1. 页面目标和存在必要性；
2. 所属用户与使用场景；
3. 进入来源、路由参数、深链和冷启动；
4. 信息架构，从上到下的区块顺序；
5. 首屏必须可见内容；
6. 字段定义、数据类型、数据来源、实时/历史；
7. 所有操作表；
8. 所有状态表；
9. 错误、空态和恢复动作；
10. 页面跳转图；
11. Runtime / Web 调用链；
12. Session、Listener、Timer、Adapter、Server 所有权；
13. 平台差异；
14. ESP32 / Smart HID / Release 依赖；
15. 安全和隐私；
16. 性能和容量；
17. 无障碍与内容规范；
18. 自动化测试；
19. 真机测试；
20. 发布声明；
21. 验收条件；
22. 非目标；
23. Mermaid 流程图或状态图。

## 3.4 流程文档

每条 Flow 必须有：

- Flow ID 和目标；
- 参与者；
- 前置条件；
- 主成功路径；
- 替代路径；
- 错误路径；
- 取消和返回；
- 状态与数据变化；
- Session/资源变化；
- ESP32/Smart HID 行为；
- 平台差异；
- Mermaid 流程图；
- Mermaid 时序图；
- 关联 Feature/Page/Test；
- 完成证据。

至少覆盖：

1. 首次启动与权限；
2. 扫描两轮；
3. 广播详情；
4. 连接与服务发现；
5. Read/Write/Notify；
6. 跨页 Session；
7. 多设备；
8. 手机 Peripheral；
9. OTA；
10. Smart HID 配网；
11. Smart HID 历史/诊断/重配；
12. 关于/分享/反馈；
13. 落地页体验/下载/ESP32；
14. Release 后新安装。

## 3.5 Runtime 架构文档

必须冻结：

- 页面 → composable → store/workflow → service → Runtime → 平台 API；
- Central Runtime 唯一全局回调所有者；
- device/service/characteristic tuple 路由；
- Session Registry；
- Scan Generation；
- Connection Attempt；
- Notify Subscriber；
- Logger；
- Peripheral Mode Owner；
- OTA Transaction；
- Smart HID Workflow；
- 页面生命周期与应用生命周期；
- 资源所有权和释放矩阵；
- 并发、重入、迟到事件、超时和取消；
- 禁止页面直接注册全局 BLE callback。

## 3.6 ESP32 文档

必须覆盖：

- 支持板型和最小硬件；
- `fixture_peripheral` 与 `fixture_observer`；
- 广播字段；
- Service/Characteristic/权限；
- LED 命令；
- Device Info；
- Notify schema 与频率；
- OTA start/ready/data/commit/success/abort/reboot/version-readback；
- Fault Injection；
- Observer 输出；
- 串口 JSON schema；
- 状态机和时序；
- PlatformIO 环境；
- 无固定串口；
- 构建、烧写和恢复；
- 固件版本、commit、SHA；
- 自动化、on-target 和真机测试；
- 安全边界。

## 3.7 落地页文档

必须覆盖：

- 目标用户和一分钟任务；
- Hero、版本、状态和 CTA；
- 核心 BLE 闭环；
- 能力卡与证据状态；
- 平台矩阵；
- 真实 App 截图；
- 在线原型；
- ESP32 Peripheral / Observer；
- 微信、Android、ESP32 三条快速开始；
- 下载或 NOT_RELEASED；
- 版本、commit、SHA、设备、evidence、已知限制；
- Smart HID；
- GitHub、Issue、Security、License；
- release metadata 数据源；
- 无产物降级；
- 二维码规则；
- SEO/OG/canonical；
- 响应式、暗色、键盘、焦点和 alt；
- 链接/下载/二维码/声明自动测试；
- E5/E6 发布门禁。

---

# 4. ID 与追踪规则

统一 ID：

```text
REQ-xxx      产品需求
FEAT-xxx     功能
PAGE-xxx     App 页面
WEB-xxx      Web 页面
FLOW-xxx     用户流程
STATE-xxx    状态
ERR-xxx      错误
DATA-xxx     数据实体/字段
PROTO-xxx    协议
SEC-xxx      安全要求
NFR-xxx      非功能要求
TEST-C-xxx   Contract/Static
TEST-U-xxx   Unit
TEST-I-xxx   Integration
TEST-P-xxx   Page/E2E
TEST-E-xxx   ESP32
TEST-A-xxx   Android
TEST-W-xxx   WeChat
TEST-H-xxx   Smart HID
TEST-R-xxx   Release/Web
EVID-xxx     证据包
DEC-xxx      决策
RISK-xxx     风险
FIX-xxx      修复任务
CLAIM-xxx    公开声明
```

每个 Must Requirement：

- 至少一个 Feature；
- 至少一个 Page/Flow 或后台能力；
- 至少一个自动化测试；
- 涉及硬件时至少一个 E5 测试；
- 涉及公开声明时至少一个 Release/Web 测试。

缺少任一追踪关系，契约门必须失败。

---

# 5. 机器可读目标契约

`contracts/target/*.json` 用于：

- ID 唯一性；
- Page/Feature/Flow/Test 引用；
- 路由和 Tab 对比；
- 平台能力；
- BLE UUID 和状态机；
- Landing Claim 与 Release 状态；
- 测试覆盖率；
- 自动生成差距报告。

JSON 必须包含：

- `schema_version`；
- `product_version`；
- `status`；
- `last_approved_at`；
- `approved_by`（允许 null，批准后填写）；
- 稳定 ID；
- 关联 ID；
- `minimum_evidence_level`；
- `release_blocking`。

Markdown 与 JSON 不一致时，Gate 失败；不得静默选择任一份。

---

# 6. 目标测试体系

## 6.1 测试必须先于修复实现

顺序：

```text
目标规范批准
→ 机器契约批准
→ 写目标测试
→ 证明测试对缺失/错误实现会失败
→ 运行当前实现
→ 生成差距
→ 才允许修改代码
```

## 6.2 测试层级

```text
E0 Contract / Static
E1 Unit
E2 Fake Runtime / Integration
E3 Build
E4 Page / Prototype / Visual
E5 Real Phone + ESP32 / Observer / Smart HID
E6 Clean Machine + Public Release
```

## 6.3 必须建立的测试脚本

```text
scripts/target/
├── check-target-contract.mjs
├── check-target-pages.mjs
├── check-target-flows.mjs
├── check-target-platforms.mjs
├── check-target-protocols.mjs
├── check-target-traceability.mjs
├── check-target-landing-claims.mjs
├── compare-target-current.mjs
└── generate-gap-report.mjs

tests/target/
├── contract/
├── unit/
├── integration/
├── pages/
├── firmware/
├── hardware/
└── release/
```

每个测试必须：

- 映射一个或多个目标 ID；
- 有正常、边界、错误和清理断言；
- 对当前错误实现确实失败；
- 不为了当前代码而降低目标；
- 不把 mock 当真机；
- 输出具体第一断点。

---

# 7. 当前实现与差距报告

## 7.1 当前实现盘点

当前实现文档必须引用真实文件、函数、路由、UUID、Workflow 和 CI；不写目标建议。

现有 G1/G2 资料迁移为输入：

- `docs/product-review/**`；
- `docs/verification/uniapp-runtime-chain-audit.md`；
- `docs/verification/uniapp-esp32-page-operation-matrix.md`；
- `docs/verification/landing-page-link-and-claim-matrix.md`；
- `3495a46` OTA/广播修正。

## 7.2 差距状态

统一：

```text
NOT_IMPLEMENTED
IMPLEMENTED_UNTESTED
AUTOMATED_FAIL
AUTOMATED_PASS
HARDWARE_PENDING
HARDWARE_FAIL
BLOCKED_BY_PROTOCOL
BLOCKED_BY_FIXTURE
BLOCKED_BY_TOOLCHAIN
BLOCKED_BY_CREDENTIAL
PASS
N/A
```

每个差距必须记录：

- Target ID；
- Current implementation；
- 对应代码；
- 对应测试；
- 实际结果；
- 第一断点；
- 修改文件；
- 依赖和风险；
- 发布影响；
- 修复任务 ID。

## 7.3 报告输出

```text
reports/target-vs-current/
├── target-vs-current.json
├── coverage.json
├── pages.json
├── runtime.json
├── esp32.json
├── smart-hid.json
├── landing-release.json
└── first-breakpoints.json
```

Markdown 报告从 JSON 生成或校验，不手工维护两个不一致版本。

---

# 8. 修复执行规则

每个 FIX：

```text
目标 Requirement / Feature / Page / Flow
→ 失败测试
→ 第一断点
→ 最小修改范围
→ 专项测试
→ 全量自动化
→ 构建
→ 真机（如适用）
→ 证据
→ 状态更新
→ 单独提交
```

修复顺序建议：

1. 文档与机器契约；
2. 平台/权限；
3. PAGE-001 扫描；
4. PAGE-006 连接/GATT；
5. PAGE-007 Session/多设备；
6. PAGE-008 Peripheral；
7. OTA；
8. PAGE-009/010；
9. WEB-001 Preview；
10. Smart HID；
11. Release 和 E6。

不得一次性“清空所有 FAIL”。每个 Gate 和子 Gate 都要可独立验证和回滚。

---

# 9. 新执行 Gate

## TP-G0：目标产品文档体系

输出全部 `docs/target-product/**` 和 `contracts/target/**`。

退出条件：

- 文档完整；
- 目标不依赖当前实现；
- 用户批准核心范围、页面、流程、ESP32、Smart HID、落地页和 Release；
- 暂不修改业务代码。

## TP-G1：目标测试规范与脚本

输出 `docs/target-tests/**`、`scripts/target/**`、`tests/target/**`。

退出条件：

- 测试覆盖全部 Must；
- 对故意错误 Fixture 能失败；
- 当前实现允许大面积 FAIL；
- 暂不修业务代码。

## TP-G2：当前实现盘点与自动差距报告

输出 `docs/current-state/**`、`docs/gap-analysis/**` 和 `reports/target-vs-current/**`。

退出条件：

- 每个目标项有状态；
- 每个 FAIL 有第一断点；
- 修复范围明确；
- 暂不修改业务代码。

## TP-G3：按目标测试修复

按功能和页面逐项修改，自动化先绿。

## TP-G4：Android / 微信 / ESP32 / Smart HID E5

按硬件矩阵执行，保存双端证据。

## TP-G5：落地页、Release 与独立电脑 E6

只有达到发布条件的能力才能公开。

## TP-G6：发布后烟测与维护

下载、安装、二维码、链接、固件和版本复测。

---

# 10. 文档质量要求

每份文档必须：

- 使用中文，必要协议字段保留英文；
- 有状态、版本、Owner、最后审核日期；
- 有明确“本文负责什么 / 不负责什么”；
- 不使用“基本完成”“应该”“大概”等模糊状态；
- 关键流程提供 Mermaid；
- 关键表格使用稳定 ID；
- 引用相对路径；
- 无敏感信息；
- 不复制同一事实到多处而无 SSOT；
- 至少包含验收与关联测试；
- 详细到 Codex 不需要猜业务规则即可实现。

详细不等于重复。相同事实必须通过 ID 和链接复用。

---

# 11. 当前下一步

现在停止旧 G3 方法，执行：

```text
TP-G0：创建并填写完整目标产品文档体系
```

TP-G0 完成后先由用户审核，不自动进入测试脚本和业务修改。

随后执行：

```text
TP-G1：按批准目标编写测试规范与测试脚本
TP-G2：运行目标测试并生成当前差距
TP-G3：按 FAIL 和第一断点修复
```

---

# 12. 最终完成定义

只有以下全部成立，整个工作才完成：

1. 目标产品文档齐全且经批准；
2. 机器可读目标契约与 Markdown 一致；
3. Must 需求均有自动化和硬件测试映射；
4. 当前实现差距可自动生成；
5. 所有发布范围内 Must 自动化通过；
6. Android、微信、ESP32 和 Smart HID 达到目标 E5；
7. Landing/Release 达到 E6；
8. 公开页面没有无证据声明和假下载；
9. 另一台电脑可从固定 commit 和 artifact SHA 复现；
10. 发布后烟测通过；
11. 文档、测试、代码、固件、版本、证据和公开状态保持可追踪一致。
