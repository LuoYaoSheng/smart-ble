# Target vs Current 摘要（TP-G2-R1）

```yaml
status: REVIEW
document_version: 2.0
gate: TP-G2-R1
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: f02fb36703e21a3dfc1fbe352c470b2a26f3fbf2d6e6a28d5e3f45c20f16faf1
commit: 0b1fdddd9280d8a81bb1f1932d954ece4c1bee2b
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
| CURRENT_PASS / FAIL | 437 / 5 |
| structured cases | 212 |
| 页面 blocked_specs / blocked_cases | 0 / 0 |
| 页面阻断原因 | null |
| 独立 blockers | BLK-TOOL-PLAYWRIGHT [CLEARED] + BLK-TEST-PAGE-DRIVER [CLEARED] |

**说明：** `blocked_cases=0` 是受阻 Case 数，**不是**产品缺陷数。Playwright 与 Page Driver 分别登记。

## 2. Target Coverage（canonical totals）

| 维度 | total | assessed | unassessed |
|---|---:|---:|---:|
| REQ | 66 | 47 | 19 |
| FEAT | 81 | 41 | 40 |
| PAGE | 10 | 8 | 2 |
| WEB | 1 | 1 | 0 |
| STATE | 67 | 0 | 67 |
| OP | 92 | 3 | 89 |
| FLOW | 14 | 10 | 4 |
| ERR | 68 | 2 | 66 |
| DATA | 13 | 2 | 11 |
| PROTO | 11 | 7 | 4 |
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

- P0: **1**
- P1: **5**
- P2: **0**
- P3: **0**

### affected_target_records_by_severity

- P0: 1
- P1: 35
- P2: 0
- P3: 0
- null: 611

> 不得把 affected records 说成「N 个 P0 缺陷」。Observer 缺失默认 **P1**（无公开危害证据时非 P0）。

## 4. 状态分布

### gap_kind

- PRODUCT: 297
- RUNTIME: 10
- PAGE: 156
- TESTABILITY: 129
- LANDING: 46
- FIRMWARE: 5
- SMART_HID: 3
- RELEASE: 1

### implementation_status

- IMPLEMENTED_UNTESTED: 103
- UNASSESSED: 495
- NOT_IMPLEMENTED: 10
- CONFIRMED_PARTIAL: 17
- CONFIRMED_IMPLEMENTED: 22

### verification_status

- AUTOMATED_PASS: 130
- HARDWARE_PENDING: 58
- NOT_EXECUTED: 294
- AUTOMATED_FAIL: 21
- EXECUTED: 144

## 5. Top 20 First Breakpoints

1. **[P0]** `PROTO-010` → .github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + Peripheral/Observer firmware （RELEASE-PIPELINE-001 / RC-RELEASE-PIPELINE）
2. **[P1]** `FEAT-021` → [REQ-020/021 ERR-CONN-03] 第一断点: connectDevice 未编排服务发现（失败不报错=半开泄漏面） （RUNTIME-CONNECTION-DISCOVERY-001 / RC-CONN-DISCOVERY）
3. **[P1]** `FEAT-040` → [TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ble-runtime/log-redaction.js （RUNTIME-LOG-REDACTION-001 / RC-LOG-REDACTION）
4. **[P1]** `FEAT-041` → PAGE-008 内联广告逻辑；useBroadcastSession 未使用 （PAGE-BROADCAST-001 / RC-PAGE-BROADCAST）
5. **[P1]** `FEAT-053` → [TEST-U-015 REQ-047~050 FEAT-053/055/056/058 FLOW-010] 第一断点: SyntaxError: Unexpected identifier 'as' （TEST-BRIDGE-TS-001 / RC-TEST-BRIDGE-TS）
6. **[P1]** `FEAT-057` → [TEST-I-009 REQ-047~051 FEAT-057/063 FLOW-010] 第一断点: TypeError: Failed to resolve module specifier "./device-display-name.js" from "data:text/javascript;base64, （RUNTIME-DISPLAY-NAME-001 / RC-DISPLAY-NAME）
7. **[P1]** `PAGE-008` → 广播页内联；Owner/composable 未接入 （PAGE-BROADCAST-001 / RC-PAGE-BROADCAST）

## 6. Task waves（拓扑序前 12）

1. **RELEASE-PIPELINE-001** — UniApp + Peripheral/Observer 双固件 Release Pipeline（type=RELEASE, sev=P0, gaps≈1）
2. **RUNTIME-LOG-REDACTION-001** — log-redaction 脱敏（type=SOURCE_FIX, sev=P1, gaps≈6）
3. **RUNTIME-CONNECTION-DISCOVERY-001** — connectDevice 编排服务发现（type=SOURCE_FIX, sev=P1, gaps≈5）
4. **ESP32-BUILD-001** — 两环境、无固定 COM、模块化入口（type=SOURCE_FIX, sev=P1, gaps≈0）
5. **ESP32-PERIPHERAL-001** — 服务/特征/名称/LED/Device Info 对齐契约（type=SOURCE_FIX, sev=P1, gaps≈0）
6. **ESP32-OBSERVER-001** — 实现 fixture_observer（type=SOURCE_FIX, sev=P1, gaps≈0）
7. **ESP32-FAULT-001** — Fault Injection + Serial JSON（type=SOURCE_FIX, sev=P1, gaps≈0）
8. **PAGE-BROADCAST-001** — PAGE-008 改用 composable/adapter/service（type=SOURCE_FIX, sev=P1, gaps≈9）
9. **TEST-BRIDGE-TS-001** — Node 测试桥支持 TS protocol import（Smart HID）（type=TESTABILITY, sev=P1, gaps≈7）
10. **VERIFY-ANDROID-001** — Android 真机矩阵（type=VERIFY_E5, sev=—, gaps≈0）
11. **VERIFY-WECHAT-001** — 微信真机矩阵（type=VERIFY_E5, sev=—, gaps≈0）
12. **VERIFY-ESP32-001** — ESP32 E5 夹具矩阵（type=VERIFY_E5, sev=—, gaps≈0）

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
