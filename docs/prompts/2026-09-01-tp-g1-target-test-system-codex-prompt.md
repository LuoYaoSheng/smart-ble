# Codex 提示词：TP-G1——按目标规范建立完整测试体系

> 前置：`docs/target-product/REVIEW_SUMMARY.md` 已获用户批准；TP-G1 启动时先将目标文档与机器契约的审批元数据从 REVIEW 统一提升为 APPROVED，再建立测试体系。
> 本轮创建测试规范、机器门禁和测试脚本，但不修复业务代码。
> 当前实现出现大量 FAIL 是预期结果，留给 TP-G2 生成差距。

---

## 可直接复制给 Codex

```text
你现在执行 Smart BLE 的 TP-G1：按 APPROVED 目标产品规范建立完整测试体系。

工作区：

/Users/luoyaosheng/Desktop/project/Open/smart-ble

必须先读取：

1. AGENTS.md
2. docs/plans/2026-09-01-target-product-spec-test-gap-remediation-plan.md
3. docs/target-product/README.md
4. docs/target-product/REVIEW_SUMMARY.md
5. docs/target-product/** 全部目标文档
6. contracts/target/**
7. docs/target-tests/README.md

审批判断以 `docs/target-product/REVIEW_SUMMARY.md` 为入口：

- 如果 `status != APPROVED`，或 `approved_by` 为空/null：输出 `TARGET_PRODUCT_NOT_APPROVED` 并停止。
- 如果 REVIEW_SUMMARY 已明确 APPROVED，但其余目标 Markdown/机器契约仍是 REVIEW：这是正常的审批投影待同步状态，不得停止。
- TP-G1 的第一步必须把 `docs/target-product/**` 与 `contracts/target/*-target.json` 的审批元数据统一提升为 APPROVED，并设置与 REVIEW_SUMMARY 一致的批准信息；Schema 文件不写审批状态。
- 完成审批投影后先运行目标文档一致性检查，再开始编写测试体系。

==================================================
一、本轮目标与边界
==================================================

目标：

- 创建完整测试规范文档；
- 创建 Contract/Static、Unit、Integration、Page、Firmware、Hardware、Release 测试；
- 建立 Requirement→Test 追踪；
- 证明测试可以识别故意错误；
- 运行当前实现，允许测试失败；
- 输出测试体系审核摘要；
- 不修业务代码。

允许修改：

- docs/target-tests/**
- scripts/target/**
- tests/target/**
- contracts/target/test-traceability.json 及其 schema
- 必要的测试依赖和 ignored 配置（必须最小化）
- 统一目标测试入口，例如 `scripts/verify-target.sh` 或 package script

禁止修改：

- apps/uniapp 业务代码
- core/ble-core 业务代码
- hardware/esp32/LightBLE 业务固件
- docs/index.md 生产落地页
- 现有产品目标以迎合当前实现
- 旧测试的预期以掩盖目标 FAIL
- 真机烧写、发布、push
- 自动进入 TP-G2

==================================================
二、必须创建的测试文档
==================================================

完整创建并填写：

1. docs/target-tests/01_TEST_STRATEGY_AND_EVIDENCE_LEVELS.md
2. docs/target-tests/02_REQUIREMENT_TO_TEST_TRACEABILITY.md
3. docs/target-tests/03_CONTRACT_AND_STATIC_TEST_SPEC.md
4. docs/target-tests/04_UNIT_TEST_SPEC.md
5. docs/target-tests/05_INTEGRATION_AND_FAKE_RUNTIME_TEST_SPEC.md
6. docs/target-tests/06_PAGE_AUTOMATION_AND_VISUAL_TEST_SPEC.md
7. docs/target-tests/07_ESP32_AUTOMATED_TEST_SPEC.md
8. docs/target-tests/08_ANDROID_HARDWARE_TEST_MATRIX.md
9. docs/target-tests/09_WECHAT_HARDWARE_TEST_MATRIX.md
10. docs/target-tests/10_SMART_HID_END_TO_END_TEST_MATRIX.md
11. docs/target-tests/11_LANDING_PAGE_AND_RELEASE_TEST_SPEC.md
12. docs/target-tests/12_TEST_DATA_FIXTURES_AND_MOCKS.md
13. docs/target-tests/13_EVIDENCE_PACKAGE_FORMAT.md
14. docs/target-tests/14_DEFECT_TRIAGE_AND_FIRST_BREAKPOINT.md
15. docs/target-tests/15_ACCEPTANCE_AND_RELEASE_GATES.md
16. docs/target-tests/16_CLEAN_MACHINE_REPRODUCTION.md
17. docs/target-tests/17_POST_RELEASE_SMOKE_AND_ROLLBACK.md
18. docs/target-tests/REVIEW_SUMMARY.md

每份文档必须有 REVIEW 状态、Owner、范围、非范围、测试 ID、环境、输入、期望、证据和退出条件。

==================================================
三、测试 ID 与追踪
==================================================

统一测试 ID：

- TEST-C-xxx Contract/Static
- TEST-U-xxx Unit
- TEST-I-xxx Integration/Fake Runtime
- TEST-P-xxx Page/Prototype/Visual
- TEST-E-xxx ESP32 automated/on-target
- TEST-A-xxx Android real device
- TEST-W-xxx WeChat real device
- TEST-H-xxx Smart HID E2E
- TEST-R-xxx Landing/Release/E6

更新：

- contracts/target/test-traceability.json
- docs/target-tests/02_REQUIREMENT_TO_TEST_TRACEABILITY.md
- docs/target-product/22_TARGET_TRACEABILITY_MATRIX.md（只补 Test ID 关联，不改目标内容）

每个 Must Requirement：

- 至少一条 E0/E1/E2 自动化；
- 页面操作至少一条 E4 或明确无法自动化的理由；
- BLE/硬件功能至少一条 E5；
- 公开 Claim 至少一条 TEST-R；
- 不能出现孤立 Requirement、Feature、Page、Flow、Protocol、Claim 或 Test。

==================================================
四、Contract / Static 测试
==================================================

创建：

scripts/target/check-target-contract.mjs
scripts/target/check-target-pages.mjs
scripts/target/check-target-flows.mjs
scripts/target/check-target-platforms.mjs
scripts/target/check-target-protocols.mjs
scripts/target/check-target-traceability.mjs
scripts/target/check-target-landing-claims.mjs

tests/target/contract/target-contract.test.mjs
tests/target/contract/pages-target.test.mjs
tests/target/contract/flows-target.test.mjs
tests/target/contract/platform-target.test.mjs
tests/target/contract/protocol-target.test.mjs
tests/target/contract/traceability.test.mjs
tests/target/contract/landing-target.test.mjs

必须检查：

- JSON Schema 和 JSON 可解析；
- Markdown 与 JSON ID 一致；
- ID 唯一；
- 引用存在；
- PAGE-001～010、WEB-001 完整；
- 四 Tab；
- 路由目标；
- Flow 和 Feature 完整；
- 平台能力/降级合法；
- BLE UUID、Characteristic 和 OTA 状态顺序；
- Smart HID lock 边界；
- Landing Claim 状态、Artifact URL/SHA 和证据规则；
- Must 追踪覆盖率 100%；
- 相对链接；
- 文档状态 APPROVED。

必须使用故意错误 Fixture 证明每个 checker 会 FAIL，而不是只在当前正确文件上 PASS。

==================================================
五、Unit 目标测试
==================================================

至少创建：

- platform-permission-target.test.mjs
- device-name-target.test.mjs
- advertisement-target.test.mjs
- device-filter-target.test.mjs
- gatt-codec-target.test.mjs
- write-queue-target.test.mjs
- session-state-target.test.mjs
- reconnect-state-target.test.mjs
- broadcast-payload-target.test.mjs
- ota-state-target.test.mjs
- smart-hid-state-target.test.mjs
- history-retention-target.test.mjs
- logging-redaction-target.test.mjs
- version-release-metadata-target.test.mjs
- public-status-target.test.mjs

要求：

- 从目标规范写预期；
- 覆盖正常、边界、错误、取消和清理；
- 允许当前实现 FAIL；
- 不导入当前实现后照着当前行为写测试；
- 可先针对目标接口/纯函数签名建立测试与 Fixture。

特别测试：

Device name：

```text
name → localName → AD 0x09 → AD 0x08 → Profile → 厂商 → 未命名 BLE · ID 后四位
```

OTA：

```text
subscribe STATUS
→ CTRL start
→ ready
→ DATA N chunks
→ CTRL commit
→ success
→ reboot/reconnect/version readback
```

以及 abort、ready timeout、chunk fail、commit fail、no success、version mismatch。

Broadcast payload：

- 字段合法性；
- 31 字节可用；
- 32 字节阻止；
- 平台系统接管字段；
- 不静默截断。

==================================================
六、Integration / Fake Runtime 测试
==================================================

至少创建：

- scan-runtime-target.test.mjs
- permission-flow-target.test.mjs
- connection-runtime-target.test.mjs
- service-discovery-target.test.mjs
- read-write-runtime-target.test.mjs
- notify-routing-target.test.mjs
- multi-device-target.test.mjs
- lifecycle-cleanup-target.test.mjs
- peripheral-owner-target.test.mjs
- ota-transaction-target.test.mjs
- smart-hid-provision-target.test.mjs
- smart-hid-session-ownership-target.test.mjs

必须断言：

扫描：
- start/stop/timeout/hide/second round；
- generation；
- 迟到事件；
- 数量和筛选；
- listener 不重复。

连接：
- 同 device 单 attempt；
- 半开连接清理；
- 服务空/失败；
- 主动断开不重连；
- 被动断开有限重连；
- 耗尽清理。

Notify：
- device/service/characteristic tuple；
- 同 UUID 多设备不串；
- 用户订阅与 Session 生命周期；
- 页面离开和主动断开清理。

Peripheral：
- 单一 owner；
- Central 活动连接保护；
- create/start/stop/close；
- hide/unload；
- 失败不假成功。

Smart HID：
- matcher；
- Device Info；
- waiter 先注册；
- state/step；
- 八类错误；
- token/password 不泄露；
- owned/borrowed Session；
- READY 后释放。

==================================================
七、页面、原型与视觉测试
==================================================

创建：

- tests/target/pages/PAGE-001.spec.js ～ PAGE-010.spec.js
- tests/target/pages/WEB-001.spec.js

若生产页面缺少可运行目标原型，TP-G1 可以先使用目标数据 Fixture 和测试 Manifest 定义断言；不得修改业务页面来让测试通过。

每页覆盖：

- 首屏内容；
- 正常态；
- 关键 Loading；
- 空态；
- 错误态；
- 平台差异；
- 所有主操作；
- 跳转和返回；
- 无障碍；
- mobile/desktop（WEB）；
- light/dark（WEB）；
- console error；
- 关键 CTA 两次点击内可达。

测试报告、截图、视频写到 ignored/evidence，不修改 tracked Playwright report。

==================================================
八、ESP32 自动测试规范和骨架
==================================================

创建测试文档和可执行/可接入骨架：

- fixture-contract.test.mjs
- serial-schema.test.mjs
- artifact-metadata.test.mjs
- hardware/esp32/LightBLE/test 目标目录说明或测试骨架

覆盖：

- Peripheral/Observer 环境；
- 名称、UUID、权限；
- LED；
- Device Info；
- Notify；
- Fault Injection；
- OTA 状态机；
- Observer 输出；
- 串口 JSON；
- 版本/commit/SHA；
- 无固定 COM3；
- clean build。

本轮不重构固件，不要求 `pio test` 当前全绿；测试可以因为实现缺失而 FAIL/BLOCKED。

==================================================
九、Android、微信、Smart HID 真机矩阵
==================================================

`08_ANDROID_HARDWARE_TEST_MATRIX.md` 必须按 PAGE/OP 定义：

- 权限；
- 两轮扫描；
- 广播详情；
- 连接/GATT；
- Session/多设备；
- Peripheral + Observer；
- OTA；
- 关于/版本。

每项记录 UI、Runtime、ESP32、清理、截图/视频/日志和最低设备环境。

`09_WECHAT_HARDWARE_TEST_MATRIX.md` 独立定义：

- 正式 AppID；
- 稳定基础库；
- 蓝牙/定位；
- GATT；
- 多设备；
- Peripheral；
- 外链、小程序跳转、分享；
- 开发者工具最多 E4。

`10_SMART_HID_END_TO_END_TEST_MATRIX.md` 定义：

- matcher/Info；
- QR/candidate/status；
- 八类错误；
- 历史/详情/诊断/重配；
- Session ownership；
- READY；
- ControlHub/MQTT/USB HID；
- 固定 Smart HID commit、firmware SHA 和 ControlHub version。

==================================================
十、Landing / Release / E6 测试
==================================================

创建：

- public-claims.test.mjs
- release-artifacts.test.mjs
- links-and-qr.test.mjs
- clean-install.test.md

覆盖：

- Hero/版本/状态；
- 能力卡与证据；
- 平台矩阵；
- 图片和原型；
- Android/微信/Peripheral/Observer 入口；
- 无产物时 NOT_RELEASED 且无链接；
- URL/SHA 必须成对；
- QR 可识别；
- Evidence/Limitations；
- Smart HID；
- GitHub/Issue/Security/License；
- SEO/OG/canonical；
- 内外链；
- Android fresh install；
- ESP32 从零；
- Release Metadata 与 VERSION/commit/artifact 一致。

==================================================
十一、测试数据与故障 Fixture
==================================================

`12_TEST_DATA_FIXTURES_AND_MOCKS.md` 必须定义：

- 有名/无名/短名/长名设备；
- 重复 deviceId、RSSI 更新；
- 一台/两台/超上限；
- 各属性 Characteristic；
- Notify burst；
- 断电/断线；
- 31/32 字节；
- OTA 大小、最后小块、失败阶段；
- Smart HID 正常和八类错误；
- Release Artifact 有/无/坏 SHA；
- 假 QR 和过期 URL；
- Fake Clock、Fake Timer、Fake Runtime；
- 所有敏感数据使用明显测试值。

==================================================
十二、统一目标测试入口
==================================================

创建一个统一入口，例如：

```text
scripts/verify-target.sh
```

或等价 Node runner。

它应按层运行：

1. Contract/Static；
2. Unit；
3. Integration；
4. Page manifest/可运行测试；
5. Firmware static；
6. Release static；
7. Traceability coverage。

输出：

- 每层 PASS/FAIL/BLOCKED；
- Test ID；
- Target ID；
- 第一断点；
- 汇总数量；
- 不把缺硬件当自动化 PASS。

不得把该入口加入现有 `verify-uniapp.sh` 作为阻断，直到 TP-G1 审核通过；可先独立运行。

==================================================
十三、故意失败验证
==================================================

必须使用临时 Fixture 或内存副本证明：

- 重复 ID 会失败；
- 坏引用会失败；
- 缺 Must Test 会失败；
- 错 Tab/路由会失败；
- OTA 顺序缺 start/commit/version 会失败；
- 32 字节 Payload 会失败；
- PREVIEW 假下载会失败；
- VERIFIED 缺 SHA/Evidence 会失败；
- Smart HID token 出现在持久化 schema 会失败。

不得通过修改真实目标文档制造失败。

==================================================
十四、运行当前实现
==================================================

完成测试体系后，运行目标测试入口。

预期：

- Contract/Target 本身应 PASS；
- 当前实现相关 Unit/Integration/Page/Firmware/Release 可能大量 FAIL；
- 这些 FAIL 不在本轮修复；
- 只记录测试是否能输出具体 Target ID 和第一断点。

不得为了让当前实现变绿而修改测试目标。

==================================================
十五、REVIEW_SUMMARY
==================================================

生成 `docs/target-tests/REVIEW_SUMMARY.md`：

- REQ/FEAT/PAGE/FLOW/TEST 数量；
- Must 自动化覆盖率；
- Must E5/E6 覆盖率；
- 各层测试数量；
- 故意失败用例结果；
- 当前实现初跑 PASS/FAIL/BLOCKED 数量；
- 最主要 20 个第一断点预览（不等于正式 gap）；
- 缺工具/硬件/凭据；
- 用户批准清单；
- 未批准前禁止 TP-G2。

==================================================
十六、验证与提交
==================================================

实际运行：

- `git diff --check`
- 所有 Contract tests
- 所有可运行 Unit/Integration tests
- 统一目标测试入口
- JSON/traceability checks
- 故意失败验证

不运行真机和烧写。

建议提交：

`test(target): define the complete Smart BLE verification system`

只提交 target-tests、scripts/target、tests/target、traceability 更新和必要配置；不得提交业务代码和生成报告。

不得 push。

最终报告：

TP-G1: PASS/PARTIAL/FAIL
TEST COUNTS
TRACEABILITY COVERAGE
INTENTIONAL FAILURE RESULTS
CURRENT IMPLEMENTATION PREVIEW RESULTS
BUSINESS CODE: NOT MODIFIED
HARDWARE: NOT EXECUTED
COMMIT / PUSHED NO
NEXT: 用户审阅 REVIEW_SUMMARY，批准后 TP-G2
```
