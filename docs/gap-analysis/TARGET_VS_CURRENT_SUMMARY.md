# Target vs Current 摘要（TP-G2）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 0b5d2b66fc093f6408f7424de0352d3212f8edb31644c2712c813f126db59a35
```

## 1. 本轮运行

| 项 | 值 |
|---|---|
| SYSTEM_PASS / FAIL | 412 / 0 |
| HARNESS_PASS / FAIL | 70 / 0 |
| TARGET_CONTRACT_FAIL | 0 |
| CURRENT_PASS / FAIL | 41 / 18 |
| 页面 blocked_specs / blocked_cases | 11 / 229 |
| 页面阻断原因 | BLOCKED_BY_TOOLCHAIN |

**说明：** `blocked_cases=229` 属于工具链阻断（Playwright 未安装），**不得**计为 229 个产品缺陷。

## 2. Target 覆盖

| 维度 | 数量 |
|---|---|
| REQ | 66 |
| FEAT | 81 |
| PAGE | 11 |
| STATE | 67 |
| OP | 92 |
| FLOW | 14 |
| PROTO | 3 |
| CLAIM | 31 |
| 报告记录总数 | 377 |

## 3. 差距分布

### gap_kind

- PRODUCT: 126
- RELEASE: 2
- RUNTIME: 25
- PAGE: 161
- SMART_HID: 6
- LANDING: 40
- TESTABILITY: 11
- FIRMWARE: 6

### implementation_status

- PARTIAL: 316
- NOT_IMPLEMENTED: 61

### verification_status

- HARDWARE_PENDING: 72
- AUTOMATED_FAIL: 73
- NOT_EXECUTED: 61
- BLOCKED_BY_TOOLCHAIN: 171

### severity

- null: 290
- P1: 57
- P0: 30

### Product vs Testability

- 带 severity 的产品向差距：87
- Testability/Toolchain 记录：11
- 页面 blocked_cases：229（blocked_page_cases 不得计为产品缺陷数）

## 4. Top 20 First Breakpoints

1. **[P0]** `FEAT-046` → OtaManager 未写 CHAR_CTRL start/commit （FIX-OTA-001）
2. **[P0]** `FEAT-075` → docs/index.md 三卡均链 releases/latest 假主下载 （FIX-LANDING-001）
3. **[P0]** `OP-P006-12` → OtaManager 未写 CHAR_CTRL；与固件事务协议断裂 （FIX-OTA-001）
4. **[P0]** `OP-P008-01` → hardware/esp32 无 Observer 目标源码（证据闭环第一断点）；页面 Owner 见 FIX-PAGE-008 （FIX-FW-001）
5. **[P0]** `WEB-001` → 假主下载 releases/latest；另有 Playwright BLOCKED_BY_TOOLCHAIN （FIX-LANDING-001）
6. **[P0]** `STATE-W001-03` → NOT_RELEASED 无产物时应无下载链接；当前仍暴露 releases/latest （FIX-LANDING-001）
7. **[P0]** `OP-W001-03` → 下载 CTA 指向 releases/latest 而非 NOT_RELEASED/真实产物 （FIX-LANDING-001）
8. **[P0]** `FLOW-008` → 缺 fixture_observer （FIX-FW-001）
9. **[P0]** `FLOW-009` → OtaManager 跳过 CTRL start，第一断点在事务入口 （FIX-OTA-001）
10. **[P0]** `CLAIM-016` → docs/index.md download-hub → releases/latest （FIX-LANDING-001）
11. **[P1]** `FEAT-004` → 仓库根 VERSION 单源文件缺失 （FIX-RELEASE-001）
12. **[P1]** `FEAT-009` → 目标模块缺失：apps/uniapp/services/public-status.js （FIX-RUNTIME-009）
13. **[P1]** `FEAT-011` → Registry 快照缺 subscription_count 字段 （FIX-RUNTIME-006）
14. **[P1]** `FEAT-013` → apps/uniapp/services/ble-runtime/display-name.js 缺失 （FIX-RUNTIME-001）
15. **[P1]** `FEAT-020` → 目标模块缺失：apps/uniapp/services/ble-runtime/reconnect-policy.js （FIX-RUNTIME-005）
16. **[P1]** `FEAT-028` → 目标接口 validateHexInput/parseHexInput 缺失 （FIX-RUNTIME-002）
17. **[P1]** `FEAT-030` → 目标模块缺失：apps/uniapp/services/ble-runtime/write-queue.js （FIX-RUNTIME-004）
18. **[P1]** `FEAT-040` → 目标模块缺失：apps/uniapp/services/ble-runtime/log-redaction.js （FIX-RUNTIME-003）
19. **[P1]** `FEAT-053` → SyntaxError: Unexpected identifier 'as' （FIX-HID-001）
20. **[P1]** `FEAT-081` → validateOtaPackage 接口缺失 （FIX-OTA-002）

## 5. 公开声明约束

在 FIX-LANDING-001 / FIX-RELEASE-001 / E6 完成前：

- 下载区必须保持 **NOT_RELEASED / PREVIEW**，禁止假主下载；
- 不得宣称 Android/Windows/macOS 多端正式包可用；
- Observer / OTA VERIFIED 不得上公开面。

## 6. 外部 Blocker（需用户确认）

- Playwright 未安装 → BLOCKED_BY_TOOLCHAIN
- PlatformIO 未安装 → ESP32 build/upload 不可用（本轮禁止 upload）
- `adb devices` 当前无设备 → HARDWARE_PENDING
- 未见 ESP32 USB 串口 → HARDWARE_PENDING
- HBuilderX.app 未在默认路径 → UniApp 正式打包可能 BLOCKED_BY_TOOLCHAIN

## 7. 下一步

用户审阅本摘要与 `docs/remediation/REMEDIATION_ORDER.md`。未经批准不得进入 TP-G3。
