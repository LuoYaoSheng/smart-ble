# Smart BLE 目标测试体系入口

> 状态：REVIEW / TP-G1 已交付（测试规范 18 份 + scripts/target + tests/target + verify-target 入口），等待用户审阅
> 文档版本：1.1
> Owner：Smart BLE QA / Engineering
> 最后更新：2026-09-01
> 前置：`docs/target-product/**` 已于 2026-09-01 经用户批准为 APPROVED（TP-G0-R1）。
> 统一入口：`node scripts/verify-target.mjs`（初跑：PASS 123 / FAIL 18 / BLOCKED 11；FAIL 均带 NOT_IMPLEMENTED 第一断点，留 TP-G2）。

---

## 1. 本目录的职责

本目录定义如何证明目标产品已经实现。

它负责：

- 测试分层和证据等级；
- Requirement / Feature / Page / Flow 到 Test 的追踪；
- Contract、Unit、Integration、Page、Firmware、Hardware、Release 测试规范；
- Android、微信、ESP32、Smart HID 和落地页测试矩阵；
- 测试数据、Mock、Fixture 和故障注入；
- 证据包；
- 第一断点与缺陷分级；
- 验收、Release Gate、独立电脑复现和发布后烟测。

它不负责：

- 修改目标需求以适配当前代码；
- 修复业务实现；
- 将 Mock、构建或模拟器结果冒充 E5；
- 记录某次运行的具体结果。

具体运行结果属于：

```text
docs/verification/runs/
reports/target-vs-current/
```

---

## 2. 测试基本原则

1. **Target First**：测试从 APPROVED 目标规范生成，而不是从当前实现生成。
2. **Fail Before Fix**：修复前必须有能够证明问题的失败测试。
3. **First Breakpoint**：报告最早偏离目标的位置，不只报告最终 UI 症状。
4. **No Evidence Inflation**：E0～E4 不得提升为 E5，开发机结果不得自动提升为 E6。
5. **Both Ends**：涉及 BLE/OTA/Peripheral 的测试必须同时验证客户端和 ESP32/Observer 结果。
6. **Cleanup Matters**：成功、失败、超时、取消和离页都必须断言资源清理。
7. **No Sensitive Data**：测试数据和证据不得包含真实密码、token、API Key、私钥和个人标识。
8. **Deterministic**：自动化结果应稳定，可控制时间、随机性、平台能力和故障模式。
9. **Traceable**：每个测试映射目标 ID，每个 Must 需求至少有一条自动化测试。
10. **Release Truth**：落地页和 Release 的声明必须由测试结果与 Metadata 驱动。

---

## 3. 证据等级

| 等级 | 名称 | 证明范围 | 不能证明 |
|---|---|---|---|
| E0 | Contract / Static | ID、路由、配置、Schema、UUID、文档和引用 | 运行行为 |
| E1 | Unit | 纯函数、状态机、编解码、校验、错误映射 | 平台 API 和射频 |
| E2 | Fake Runtime / Integration | 调用顺序、并发、超时、取消、资源释放 | 真实权限、BLE 栈、硬件 |
| E3 | Build | Android、微信、H5、ESP32、文档可构建 | 功能可用 |
| E4 | Page / Prototype / Visual | 页面、状态、跳转、交互、响应式、无障碍基础 | 真实 BLE、插件和射频 |
| E5 | Real Device | 手机、微信、ESP32、Observer、Smart HID 的真实结果 | 独立环境和公开产物 |
| E6 | Clean Machine / Release | 固定 Commit、Artifact SHA、下载、安装、二维码、公开页面 | 后续版本长期稳定性 |

发布范围内的 BLE Must 功能最低 E5；下载、二维码和公开声明最低 E6。

---

## 4. 完整测试文档清单

| 文件 | 负责内容 |
|---|---|
| `01_TEST_STRATEGY_AND_EVIDENCE_LEVELS.md` | 测试目标、分层、范围、环境和退出条件 |
| `02_REQUIREMENT_TO_TEST_TRACEABILITY.md` | REQ/Feature/Page/Flow/Protocol/Claim 到 Test 的完整映射 |
| `03_CONTRACT_AND_STATIC_TEST_SPEC.md` | 文档、JSON、ID、路由、版本、公开状态和链接门禁 |
| `04_UNIT_TEST_SPEC.md` | 纯逻辑和状态机测试目录 |
| `05_INTEGRATION_AND_FAKE_RUNTIME_TEST_SPEC.md` | Runtime、Store、Workflow、Adapter、资源与错误测试 |
| `06_PAGE_AUTOMATION_AND_VISUAL_TEST_SPEC.md` | 页面行为契约 + 完整 State/Operation Playwright 定义（Driver 未实现时 BLOCKED） |
| `07_ESP32_AUTOMATED_TEST_SPEC.md` | Peripheral/Observer、协议、LED、Notify、OTA、Fault |
| `08_ANDROID_HARDWARE_TEST_MATRIX.md` | Android 页面与 OP E5 矩阵 |
| `09_WECHAT_HARDWARE_TEST_MATRIX.md` | 微信权限、GATT、Peripheral、分享和平台差异 |
| `10_SMART_HID_END_TO_END_TEST_MATRIX.md` | 配网、错误、历史、诊断和 USB HID |
| `11_LANDING_PAGE_AND_RELEASE_TEST_SPEC.md` | Claim、下载、二维码、SEO、Metadata、安装和 Release |
| `12_TEST_DATA_FIXTURES_AND_MOCKS.md` | 测试数据、Fake Runtime、Fixture、时间和故障注入 |
| `13_EVIDENCE_PACKAGE_FORMAT.md` | 环境、日志、截图、视频、SHA 和隐私 |
| `14_DEFECT_TRIAGE_AND_FIRST_BREAKPOINT.md` | P0/P1/P2、证据状态、第一断点和修复关联 |
| `15_ACCEPTANCE_AND_RELEASE_GATES.md` | 页面、功能、平台、Profile、Web 和 Release 验收 |
| `16_CLEAN_MACHINE_REPRODUCTION.md` | BUILD_ONLY、HARDWARE_E5、RELEASE_VERIFY |
| `17_POST_RELEASE_SMOKE_AND_ROLLBACK.md` | 发布后烟测、失败降级、回滚与公告 |

---

## 5. 可执行测试目录

TP-G1 应创建：

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
│   ├── target-contract.test.mjs
│   ├── pages-target.test.mjs
│   ├── flows-target.test.mjs
│   ├── platform-target.test.mjs
│   ├── protocol-target.test.mjs
│   ├── traceability.test.mjs
│   └── landing-target.test.mjs
├── unit/
│   ├── platform-permission-target.test.mjs
│   ├── device-name-target.test.mjs
│   ├── advertisement-target.test.mjs
│   ├── gatt-codec-target.test.mjs
│   ├── session-state-target.test.mjs
│   ├── broadcast-payload-target.test.mjs
│   ├── ota-state-target.test.mjs
│   ├── smart-hid-state-target.test.mjs
│   ├── logging-redaction-target.test.mjs
│   └── release-metadata-target.test.mjs
├── integration/
│   ├── scan-runtime-target.test.mjs
│   ├── connection-runtime-target.test.mjs
│   ├── notify-routing-target.test.mjs
│   ├── multi-device-target.test.mjs
│   ├── peripheral-owner-target.test.mjs
│   ├── ota-transaction-target.test.mjs
│   ├── smart-hid-provision-target.test.mjs
│   └── lifecycle-cleanup-target.test.mjs
├── pages/
│   ├── PAGE-001.spec.js
│   ├── PAGE-002.spec.js
│   ├── PAGE-003.spec.js
│   ├── PAGE-004.spec.js
│   ├── PAGE-005.spec.js
│   ├── PAGE-006.spec.js
│   ├── PAGE-007.spec.js
│   ├── PAGE-008.spec.js
│   ├── PAGE-009.spec.js
│   ├── PAGE-010.spec.js
│   └── WEB-001.spec.js
├── firmware/
│   ├── fixture-contract.test.mjs
│   ├── serial-schema.test.mjs
│   └── artifact-metadata.test.mjs
├── hardware/
│   ├── android-run-template.md
│   ├── wechat-run-template.md
│   ├── esp32-peripheral-run-template.md
│   ├── esp32-observer-run-template.md
│   └── smart-hid-run-template.md
└── release/
    ├── public-claims.test.mjs
    ├── release-artifacts.test.mjs
    ├── links-and-qr.test.mjs
    └── clean-install.test.md
```

现有测试不应被删除；TP-G1 先建立目标测试，再在后续 TP-G3 决定复用、重写或废弃旧测试。

---

## 6. 每条测试的必填元数据

每个测试文件或 Case 必须声明：

```text
Test ID
Title
Target IDs
Priority
Evidence Level
Release Blocking
Platforms
Fixtures
Preconditions
Inputs
Steps
Expected UI Result
Expected Runtime Result
Expected Device/Observer Result
Expected Cleanup
Error/Boundary Variants
Artifacts/Evidence
Timeout
Owner
```

自动化文件可使用顶部 JSDoc 或相邻 JSON/Markdown Manifest，但不能只靠文件名猜关联目标。

---

## 7. 测试必须覆盖的维度

### 7.1 正常路径

- 正确输入；
- 正确设备；
- 稳定连接；
- 成功结果；
- 后续状态；
- 正确清理。

### 7.2 边界

- 空值、最大值、最小值；
- 31/32 字节；
- MTU 和最后一个小分包；
- 一台/两台/上限设备；
- 日志容量；
- 历史 TTL；
- 超时临界点；
- 迟到事件；
- 重复点击和并发。

### 7.3 错误

- 权限拒绝和永久拒绝；
- 蓝牙关闭；
- 平台不支持；
- 扫描/连接/服务/读写/Notify 失败；
- 设备断电；
- 错误 Characteristic 属性；
- Peripheral 创建/启动/停止失败；
- OTA start/ready/data/commit/success/version 失败；
- Smart HID 身份、QR、token、Wi-Fi、Hub、MQTT、存储错误；
- 下载 404、SHA 不一致、二维码失效和 Metadata 漂移。

### 7.4 取消与清理

- 用户停止扫描；
- 离页；
- App hide/unload；
- 取消写入/OTA/配网；
- 主动断开；
- 被动断开；
- 重试耗尽；
- Listener、Timer、Session、Server、Adapter、File Handle 和 Promise 释放。

---

## 8. Target 测试与当前实现的关系

目标测试允许在 TP-G1 后大量失败。失败不是坏事，而是 TP-G2 的差距输入。

禁止：

- 因当前实现没有 `CHAR_CTRL` 就把 OTA 目标测试改成只写 DATA；
- 因当前 PAGE-008 内联逻辑就把目标架构写成页面持有所有资源；
- 因当前落地页没有 APK 就删掉“真实下载需要 SHA”的测试；
- 因微信开发者工具不支持真实 BLE 就把模拟器结果标 E5；
- 因缺 Observer 就降低广播正式证据要求。

---

## 9. TP-G1 执行顺序

```text
1. 读取 APPROVED target-product 文档
2. 创建 test traceability
3. 写 Contract/Static 测试
4. 写 Unit 目标测试
5. 写 Fake Runtime / Integration 目标测试
6. 写 Page/Prototype 测试
7. 写 ESP32 自动测试规范和脚本骨架
8. 写 Android/微信/Smart HID 真机矩阵
9. 写 Landing/Release 测试
10. 验证故意错误 Fixture 会失败
11. 运行当前实现，允许 FAIL
12. 输出测试体系 REVIEW_SUMMARY
13. 停下，不修改业务代码
```

---

## 10. TP-G1 完整性检查

- [ ] 所有 Must Requirement 有 Test ID；
- [ ] 所有 PAGE/WEB 操作有自动化或明确 E5/E6；
- [ ] 所有错误状态有测试；
- [ ] 所有资源所有权有清理测试；
- [ ] Peripheral 有 Observer 测试；
- [ ] OTA 有完整事务顺序和版本回读测试；
- [ ] Smart HID 有错误恢复和 Session 所有权测试；
- [ ] Landing 每个 Claim/CTA 有测试；
- [ ] Artifact URL/SHA/状态联动有测试；
- [ ] 故意错误 Fixture 可以触发失败；
- [ ] 测试失败输出 Target ID 和第一断点；
- [ ] 当前实现未被修改；
- [ ] 测试体系状态为 REVIEW；
- [ ] 用户批准后才进入 TP-G2。

---

## 11. 用户审核入口

TP-G1 完成后生成：

```text
docs/target-tests/REVIEW_SUMMARY.md
```

摘要必须包含：

- 总 Requirement / Feature / Page / Flow / Test 数量；
- Must 自动化覆盖率；
- Must E5/E6 覆盖率；
- 各测试层级清单；
- 故意失败验证结果；
- 当前实现初跑的失败数量（只作预览，不做差距结论）；
- 尚缺环境/硬件/凭据；
- 进入 TP-G2 的批准清单。
