# Target vs Current 摘要（TP-G2-R1）

```yaml
status: REVIEW
document_version: 2.0
gate: TP-G2-R1
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 5426d043164502a145e41a290572f2e4aca2fb0a1ed9277ecb914ecbb36d75d3
commit: c95ef5531cd5446a71b2cc23152501d7a677c554
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
| CURRENT_PASS / FAIL | 0 / 0 |
| structured cases | 0 |
| 页面 blocked_specs / blocked_cases | undefined / undefined |
| 页面阻断原因 | undefined |
| 独立 blockers | BLK-TOOL-PLAYWRIGHT [CLEARED] + BLK-TEST-PAGE-DRIVER [CLEARED] |

**说明：** `blocked_cases=undefined` 是受阻 Case 数，**不是**产品缺陷数。Playwright 与 Page Driver 分别登记。

## 2. Target Coverage（canonical totals）

| 维度 | total | assessed | unassessed |
|---|---:|---:|---:|
| REQ | 66 | 0 | 66 |
| FEAT | 81 | 0 | 81 |
| PAGE | 10 | 0 | 10 |
| WEB | 1 | 0 | 1 |
| STATE | 67 | 0 | 67 |
| OP | 92 | 0 | 92 |
| FLOW | 14 | 0 | 14 |
| ERR | 68 | 0 | 68 |
| DATA | 13 | 0 | 13 |
| PROTO | 11 | 1 | 10 |
| SEC | 19 | 0 | 19 |
| NFR | 24 | 0 | 24 |
| CLAIM | 31 | 0 | 31 |
| DEC | 17 | 0 | 17 |
| EVID | 8 | 0 | 8 |
| TEST | 103 | 0 | 103 |
| 报告记录总数 | 647 | | |

PROTO 仅使用 `PROTO-001`..`PROTO-011`（不是 Service UUID）。

## 3. 根因 vs 受影响记录

### unique_root_causes_by_severity

- P0: **1**
- P1: **0**
- P2: **0**
- P3: **0**

### affected_target_records_by_severity

- P0: 1
- P1: 0
- P2: 0
- P3: 0
- null: 646

> 不得把 affected records 说成「N 个 P0 缺陷」。Observer 缺失默认 **P1**（无公开危害证据时非 P0）。

## 4. 状态分布

### gap_kind

- PRODUCT: 310
- PAGE: 154
- TESTABILITY: 125
- LANDING: 47
- FIRMWARE: 5
- SMART_HID: 3
- RUNTIME: 2
- RELEASE: 1

### implementation_status

- UNASSESSED: 624
- CONFIRMED_IMPLEMENTED: 22
- CONFIRMED_PARTIAL: 1

### verification_status

- HARDWARE_PENDING: 127
- NOT_EXECUTED: 345
- EXECUTED: 153
- AUTOMATED_PASS: 22

## 5. Top 20 First Breakpoints

1. **[P0]** `PROTO-010` → .github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + Peripheral/Observer firmware （RELEASE-PIPELINE-001 / RC-RELEASE-PIPELINE）

## 6. Task waves（拓扑序前 12）

1. **RELEASE-PIPELINE-001** — UniApp + Peripheral/Observer 双固件 Release Pipeline（type=RELEASE, sev=P0, gaps≈1）
2. **OTA-E5-VERIFICATION** — ESP32+Android OTA 闭环 E5（type=VERIFY_E5, sev=P0, gaps≈0）
3. **ESP32-FAULT-001** — Fault Injection + Serial JSON（type=SOURCE_FIX, sev=P1, gaps≈0）
4. **TEST-BRIDGE-TS-001** — Node 测试桥支持 TS protocol import（Smart HID）（type=TESTABILITY, sev=P1, gaps≈0）
5. **VERIFY-ANDROID-001** — Android 真机矩阵（type=VERIFY_E5, sev=—, gaps≈0）
6. **VERIFY-WECHAT-001** — 微信真机矩阵（type=VERIFY_E5, sev=—, gaps≈0）
7. **VERIFY-ESP32-001** — ESP32 E5 夹具矩阵（type=VERIFY_E5, sev=—, gaps≈0）
8. **VERIFY-SMART-HID-001** — Smart HID E5 端到端（type=VERIFY_E5, sev=—, gaps≈0）
9. **VERIFY-E6-001** — Clean Machine / Release E6（type=VERIFY_E6, sev=—, gaps≈31）

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
- **OTA-E5-BLOCKER** [OPEN] E5-OTA-001 BLOCKED：无 ESP32 USB；仅 Android 模拟器；UniApp APK 编译失败 → OTA-E5-VERIFICATION

## 9. 下一步

下一 Task 由用户选择（例如 RELEASE-PIPELINE-001），**不得自动执行** OTA / Release Pipeline / E5。
