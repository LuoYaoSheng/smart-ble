# Target vs Current 摘要（TP-G2-R1）

```yaml
status: REVIEW
document_version: 2.0
gate: TP-G2-R1
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 5c58aa6d543f8943886694a38cf03bf4accee2799a5b5636257017e4b676e591
commit: ae13e90ea5ad38a4e416b5783a4956a81f827547
supersedes: TP-G2 v1 (reports/target-vs-current-v1/)
```

> 旧 TP-G2 v1 摘要已 **SUPERSEDED_BY_TP_G2_R1**。正式路径：`reports/target-vs-current/`。

## 1. 测试基础设施与 Current 真实结果

| 项 | 值 |
|---|---|
| SYSTEM_PASS / FAIL | 412 / 0 |
| HARNESS_PASS / FAIL | 89 / 0 |
| TARGET_CONTRACT_FAIL | 0 |
| TEST_INFRA_FAIL | 0 |
| CURRENT_PASS / FAIL | 265 / 19 |
| structured cases | 54 |
| 页面 blocked_specs / blocked_cases | 0 / 0 |
| 页面阻断原因 | null |
| 独立 blockers | BLK-TOOL-PLAYWRIGHT [CLEARED] + BLK-TEST-PAGE-DRIVER [CLEARED] |

**说明：** `blocked_cases=0` 是受阻 Case 数，**不是**产品缺陷数。Playwright 与 Page Driver 分别登记。

## 2. Target Coverage（canonical totals）

| 维度 | total | assessed | unassessed |
|---|---:|---:|---:|
| REQ | 66 | 46 | 20 |
| FEAT | 81 | 42 | 39 |
| PAGE | 10 | 8 | 2 |
| WEB | 1 | 1 | 0 |
| STATE | 67 | 0 | 67 |
| OP | 92 | 7 | 85 |
| FLOW | 14 | 10 | 4 |
| ERR | 68 | 2 | 66 |
| DATA | 13 | 2 | 11 |
| PROTO | 11 | 8 | 3 |
| SEC | 19 | 0 | 19 |
| NFR | 24 | 0 | 24 |
| CLAIM | 31 | 7 | 24 |
| DEC | 17 | 5 | 12 |
| EVID | 8 | 2 | 6 |
| TEST | 103 | 0 | 103 |
| 报告记录总数 | 647 | | |

PROTO 仅使用 `PROTO-001`..`PROTO-011`（不是 Service UUID）。

## 3. 根因 vs 受影响记录

### unique_root_causes_by_severity

- P0: **2**
- P1: **12**
- P2: **0**
- P3: **0**

### affected_target_records_by_severity

- P0: 16
- P1: 67
- P2: 0
- P3: 0
- null: 564

> 不得把 affected records 说成「N 个 P0 缺陷」。Observer 缺失默认 **P1**（无公开危害证据时非 P0）。

## 4. 状态分布

### gap_kind

- PRODUCT: 274
- RUNTIME: 37
- PAGE: 149
- TESTABILITY: 128
- FIRMWARE: 10
- LANDING: 45
- SMART_HID: 3
- RELEASE: 1

### implementation_status

- IMPLEMENTED_UNTESTED: 60
- UNASSESSED: 492
- NOT_IMPLEMENTED: 28
- CONFIRMED_PARTIAL: 41
- CONFIRMED_IMPLEMENTED: 22
- CONFIRMED_MISSING: 4

### verification_status

- AUTOMATED_PASS: 86
- HARDWARE_PENDING: 59
- AUTOMATED_FAIL: 66
- NOT_EXECUTED: 293
- EXECUTED: 139
- BLOCKED_BY_FIXTURE: 4

## 5. Top 20 First Breakpoints

1. **[P0]** `FEAT-046` → OtaManager 在第一个 DATA 写之前未发送 CTRL start （OTA-CLIENT-001 / RC-OTA-CTRL-START）
2. **[P0]** `FEAT-047` → [TEST-U-016 REQ-066 FEAT-081 DEC-016] 第一断点: 目标接口 validateOtaPackage 缺失（六项传输前校验） （OTA-CLIENT-001 / RC-OTA-CTRL-START）
3. **[P0]** `PROTO-010` → .github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + Peripheral/Observer firmware （RELEASE-PIPELINE-001 / RC-RELEASE-PIPELINE）
4. **[P1]** `FEAT-011` → [TEST-U-005 REQ-030/DATA-003 DEC-017] 第一断点: Registry 快照缺 subscription_count 字段 （RUNTIME-SESSION-001 / RC-SESSION-REGISTRY）
5. **[P1]** `FEAT-013` → [TEST-U-006 REQ-013 FEAT-013 PAGE-001 FLOW-002] 第一断点: 目标模块缺失：apps/uniapp/services/ble-runtime/display-name.js （RUNTIME-DISPLAY-NAME-001 / RC-DISPLAY-NAME）
6. **[P1]** `FEAT-014` → 命中项匹配关键词 （RUNTIME-FILTER-001 / RC-DEVICE-FILTER）
7. **[P1]** `FEAT-021` → [REQ-020/021 ERR-CONN-03] 第一断点: connectDevice 未编排服务发现（失败不报错=半开泄漏面） （RUNTIME-CONNECTION-DISCOVERY-001 / RC-CONN-DISCOVERY）
8. **[P1]** `FEAT-023` → [REQ-022/023 FEAT-023/024 TEST-I-003(纯策略) 10号§5] 第一断点: 目标模块缺失：apps/uniapp/services/ble-runtime/reconnect-policy.js （RUNTIME-RECONNECT-001 / RC-RECONNECT）
9. **[P1]** `FEAT-026` → [TEST-U-010 REQ-026 FEAT-028] 第一断点: 目标接口 validateHexInput/parseHexInput 缺失 （RUNTIME-GATT-CODEC-001 / RC-GATT-HEX）
10. **[P1]** `FEAT-030` → [TEST-U-011 REQ-028 FEAT-030 PAGE-006 FLOW-005] 第一断点: 目标模块缺失：apps/uniapp/services/ble-runtime/write-queue.js （RUNTIME-WRITE-QUEUE-001 / RC-WRITE-QUEUE）
11. **[P1]** `FEAT-040` → [TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ble-runtime/log-redaction.js （RUNTIME-LOG-REDACTION-001 / RC-LOG-REDACTION）
12. **[P1]** `FEAT-041` → PAGE-008 内联广告逻辑；useBroadcastSession 未使用 （PAGE-BROADCAST-001 / RC-PAGE-BROADCAST）
13. **[P1]** `FEAT-053` → [TEST-U-015 REQ-047~050 FEAT-053/055/056/058 FLOW-010] 第一断点: SyntaxError: Unexpected identifier 'as' （TEST-BRIDGE-TS-001 / RC-TEST-BRIDGE-TS）
14. **[P1]** `FEAT-062` → [REQ-053/PAGE-007 排除规则] 第一断点: Registry 无配网会话分类/排除接口——PAGE-007 口径无法排除配网会话 （RUNTIME-SESSION-001 / RC-SESSION-REGISTRY）
15. **[P1]** `FEAT-081` → [TEST-U-016 REQ-066 FEAT-081 DEC-016] 第一断点: 目标接口 validateOtaPackage 缺失（六项传输前校验） （OTA-PACKAGE-001 / RC-OTA-PACKAGE）
16. **[P1]** `FLOW-008` → 缺 fixture_observer （ESP32-OBSERVER-001 / RC-ESP32-OBSERVER）
17. **[P1]** `OP-P008-01` → hardware/esp32 无 Observer 目标源码 （ESP32-OBSERVER-001 / RC-ESP32-OBSERVER）
18. **[P1]** `PAGE-008` → 广播页内联；Owner/composable 未接入 （PAGE-BROADCAST-001 / RC-PAGE-BROADCAST）
19. **[P1]** `PROTO-001` → 固件含广播名 BLEToolkit-Observer （ESP32-OBSERVER-001 / RC-ESP32-OBSERVER）
20. **[P1]** `PROTO-009` → fixture_observer 不存在 （ESP32-OBSERVER-001 / RC-ESP32-OBSERVER）

## 6. Task waves（拓扑序前 12）

1. **RELEASE-PIPELINE-001** — UniApp + Peripheral/Observer 双固件 Release Pipeline（type=RELEASE, sev=P0, gaps≈1）
2. **RUNTIME-DISPLAY-NAME-001** — 实现 display-name 解析链（type=SOURCE_FIX, sev=P1, gaps≈2）
3. **RUNTIME-FILTER-001** — device-filter 关键词命中项匹配对齐目标（type=SOURCE_FIX, sev=P1, gaps≈4）
4. **RUNTIME-GATT-CODEC-001** — validateHexInput/parseHexInput（type=SOURCE_FIX, sev=P1, gaps≈6）
5. **RUNTIME-WRITE-QUEUE-001** — write-queue MTU 分包队列（type=SOURCE_FIX, sev=P1, gaps≈2）
6. **RUNTIME-LOG-REDACTION-001** — log-redaction 脱敏（type=SOURCE_FIX, sev=P1, gaps≈6）
7. **RUNTIME-RECONNECT-001** — reconnect-policy 有限重连（type=SOURCE_FIX, sev=P1, gaps≈3）
8. **RUNTIME-SESSION-001** — Registry subscription_count + 配网会话分类（type=SOURCE_FIX, sev=P1, gaps≈8）
9. **RUNTIME-CONNECTION-DISCOVERY-001** — connectDevice 编排服务发现（type=SOURCE_FIX, sev=P1, gaps≈3）
10. **OTA-PACKAGE-001** — 客户端 Firmware Package 六项校验（type=SOURCE_FIX, sev=P1, gaps≈4）
11. **OTA-CLIENT-001** — 客户端完整 OTA 事务（CTRL start→ready→DATA→commit）（type=SOURCE_FIX, sev=P0, gaps≈15）
12. **ESP32-BUILD-001** — 两环境、无固定 COM、模块化入口（type=SOURCE_FIX, sev=P1, gaps≈0）

完整图：`reports/target-vs-current/task-dependency-graph.json`。

## 7. 必须立即降级的公开 Claim

**PUBLIC-HONESTY-001 = DONE**；**VERSION-METADATA-001 = DONE**（RC-VERSION-SSOT CLOSED）。
**PAGE-VERSION-001** 状态见任务图（RC-PAGE-VERSION）。
**RELEASE-PIPELINE-001** 仍为 PLANNED（RC-RELEASE-PIPELINE OPEN）。在 E6 完成前：

- 下载区保持 **NOT_RELEASED / PREVIEW**，禁止 `releases/latest` 假主下载；
- 不得宣称 Android/Windows/macOS 多端正式包可用；
- 不得宣称 Flutter/Tauri 为 UniApp 主产物；
- Observer / OTA VERIFIED 不得上公开面。

## 8. 外部 Blocker

- **BLK-TOOL-PLAYWRIGHT** [CLEARED] @playwright/test 未安装 → 页面 E4 BLOCKED_BY_TOOLCHAIN → ENV-PLAYWRIGHT-001
- **BLK-TEST-PAGE-DRIVER** [CLEARED] TARGET_PAGE_DRIVER 未实现 → TEST-PAGE-DRIVER-001
- **BLK-TOOL-PLATFORMIO** [OPEN] PlatformIO 可能未安装 → ESP32 build NOT_EXECUTED（本轮禁止 upload） → ESP32-BUILD-001
- **BLK-HW-ANDROID** [OPEN] adb devices 可能为空 → HARDWARE_PENDING → VERIFY-ANDROID-001
- **BLK-HW-ESP32** [OPEN] 无 ESP32 USB 串口 / Observer 夹具 → BLOCKED_BY_FIXTURE → VERIFY-ESP32-001

## 9. 下一步

下一 Task 由用户选择（例如 RELEASE-PIPELINE-001），**不得自动执行** OTA / Release Pipeline / E5。
