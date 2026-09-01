# Target vs Current 摘要（TP-G2-R1）

```yaml
status: REVIEW
document_version: 2.0
gate: TP-G2-R1
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 4139b2ab376a9a56083c81495831f051ac7804278a5f56936064e429e04b9571
commit: e09c85eb672c2b0d6b0115c5028b457dc1bb13c8
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
| REQ | 66 | 10 | 56 |
| FEAT | 81 | 13 | 68 |
| PAGE | 10 | 1 | 9 |
| WEB | 1 | 0 | 1 |
| STATE | 67 | 0 | 67 |
| OP | 92 | 7 | 85 |
| FLOW | 14 | 2 | 12 |
| ERR | 68 | 0 | 68 |
| DATA | 13 | 0 | 13 |
| PROTO | 11 | 5 | 6 |
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

- P0: **2**
- P1: **5**
- P2: **0**
- P3: **0**

### affected_target_records_by_severity

- P0: 17
- P1: 21
- P2: 0
- P3: 0
- null: 609

> 不得把 affected records 说成「N 个 P0 缺陷」。Observer 缺失默认 **P1**（无公开危害证据时非 P0）。

## 4. 状态分布

### gap_kind

- PRODUCT: 295
- PAGE: 153
- RUNTIME: 15
- TESTABILITY: 125
- FIRMWARE: 9
- LANDING: 46
- SMART_HID: 3
- RELEASE: 1

### implementation_status

- UNASSESSED: 587
- CONFIRMED_PARTIAL: 31
- NOT_IMPLEMENTED: 3
- CONFIRMED_IMPLEMENTED: 22
- CONFIRMED_MISSING: 4

### verification_status

- HARDWARE_PENDING: 123
- NOT_EXECUTED: 339
- AUTOMATED_FAIL: 9
- EXECUTED: 148
- AUTOMATED_PASS: 22
- BLOCKED_BY_FIXTURE: 6

## 5. Top 20 First Breakpoints

1. **[P0]** `FEAT-046` → OtaManager 在第一个 DATA 写之前未发送 CTRL start （OTA-CLIENT-001 / RC-OTA-CTRL-START）
2. **[P0]** `PROTO-010` → .github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + Peripheral/Observer firmware （RELEASE-PIPELINE-001 / RC-RELEASE-PIPELINE）
3. **[P1]** `FEAT-041` → PAGE-008 内联广告逻辑；useBroadcastSession 未使用 （PAGE-BROADCAST-001 / RC-PAGE-BROADCAST）
4. **[P1]** `FEAT-081` → validateOtaPackage 接口缺失 （OTA-PACKAGE-001 / RC-OTA-PACKAGE）
5. **[P1]** `FLOW-008` → 缺 fixture_observer （ESP32-OBSERVER-001 / RC-ESP32-OBSERVER）
6. **[P1]** `OP-P008-01` → hardware/esp32 无 Observer 目标源码 （ESP32-OBSERVER-001 / RC-ESP32-OBSERVER）
7. **[P1]** `PAGE-008` → 广播页内联；Owner/composable 未接入 （PAGE-BROADCAST-001 / RC-PAGE-BROADCAST）
8. **[P1]** `PROTO-001` → 固件缺 FF00 LED 指令表 （ESP32-PERIPHERAL-001 / RC-ESP32-LED-NAME）
9. **[P1]** `PROTO-003` → 固件 OTA JSON 使用 action 字段，目标为 op （OTA-FIRMWARE-001 / RC-ESP32-OTA-ACTION）
10. **[P1]** `PROTO-009` → fixture_observer 不存在 （ESP32-OBSERVER-001 / RC-ESP32-OBSERVER）
11. **[P1]** `PROTO-011` → 客户端 validateOtaPackage 缺失 （OTA-PACKAGE-001 / RC-OTA-PACKAGE）

## 6. Task waves（拓扑序前 12）

1. **RELEASE-PIPELINE-001** — UniApp + Peripheral/Observer 双固件 Release Pipeline（type=RELEASE, sev=P0, gaps≈1）
2. **RUNTIME-LOG-REDACTION-001** — log-redaction 脱敏（type=SOURCE_FIX, sev=P1, gaps≈0）
3. **RUNTIME-RECONNECT-001** — reconnect-policy 有限重连（type=SOURCE_FIX, sev=P1, gaps≈0）
4. **RUNTIME-SESSION-001** — Registry subscription_count + 配网会话分类（type=SOURCE_FIX, sev=P1, gaps≈0）
5. **RUNTIME-CONNECTION-DISCOVERY-001** — connectDevice 编排服务发现（type=SOURCE_FIX, sev=P1, gaps≈0）
6. **OTA-PACKAGE-001** — 客户端 Firmware Package 六项校验（type=SOURCE_FIX, sev=P1, gaps≈3）
7. **OTA-CLIENT-001** — 客户端完整 OTA 事务（CTRL start→ready→DATA→commit）（type=SOURCE_FIX, sev=P0, gaps≈12）
8. **ESP32-BUILD-001** — 两环境、无固定 COM、模块化入口（type=SOURCE_FIX, sev=P1, gaps≈0）
9. **OTA-FIRMWARE-001** — 固件 OTA op/target/hardware/SHA/max_chunk/commit 校验（type=SOURCE_FIX, sev=P1, gaps≈1）
10. **ESP32-PERIPHERAL-001** — 服务/特征/名称/LED/Device Info 对齐契约（type=SOURCE_FIX, sev=P1, gaps≈1）
11. **ESP32-OBSERVER-001** — 实现 fixture_observer（type=SOURCE_FIX, sev=P1, gaps≈5）
12. **ESP32-FAULT-001** — Fault Injection + Serial JSON（type=SOURCE_FIX, sev=P1, gaps≈0）

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
