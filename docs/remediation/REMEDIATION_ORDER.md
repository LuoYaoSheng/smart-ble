# 修复顺序（TP-G2-R1）

```yaml
status: APPROVED
document_version: 2.0
gate: TP-G2-R1
content_hash: bad99ca68136a8d46d7260c01d7187e31228ade74e516a7ebbf2eec57d57a20d
approved_by: user
```

> 执行规则：依赖图不变；Wave/拓扑序；一次只批准一个 Task；完成后停下。
> **PUBLIC-HONESTY / VERSION-METADATA / PAGE-VERSION / ENV-PLAYWRIGHT / TEST-PAGE-DRIVER = DONE**。
> **TP-G2-R2**：页面 E4 产品差距已重算（PAGE_E4_GAP_REPORT.md）；页面失败优先挂 RUNTIME/OTA/ESP32 Task。
> **RUNTIME-FILTER-001 / RUNTIME-DISPLAY-NAME-001 / RUNTIME-GATT-CODEC-001 / RUNTIME-WRITE-QUEUE-001 = DONE**。下一 Task 由用户选择；**不得**自动执行 LOG-REDACTION / SESSION / RELEASE / ESP32 / OTA。

## 推荐拓扑序

1. **RELEASE-PIPELINE-001** — UniApp + Peripheral/Observer 双固件 Release Pipeline（type=RELEASE, sev=P0, gaps≈1, status=PLANNED）
2. **ESP32-BUILD-001** — 两环境、无固定 COM、模块化入口（type=SOURCE_FIX, sev=P1, gaps≈0, status=PLANNED）
3. **OTA-E5-VERIFICATION** — ESP32+Android OTA 闭环 E5（type=VERIFY_E5, sev=P0, gaps≈0, status=BLOCKED）
4. **ESP32-PERIPHERAL-001** — 服务/特征/名称/LED/Device Info 对齐契约（type=SOURCE_FIX, sev=P1, gaps≈0, status=PLANNED）
5. **ESP32-OBSERVER-001** — 实现 fixture_observer（type=SOURCE_FIX, sev=P1, gaps≈0, status=PLANNED）
6. **ESP32-FAULT-001** — Fault Injection + Serial JSON（type=SOURCE_FIX, sev=P1, gaps≈0, status=PLANNED）
7. **PAGE-BROADCAST-001** — PAGE-008 改用 composable/adapter/service（type=SOURCE_FIX, sev=P1, gaps≈9, status=PLANNED）
8. **TEST-BRIDGE-TS-001** — Node 测试桥支持 TS protocol import（Smart HID）（type=TESTABILITY, sev=P1, gaps≈7, status=PLANNED）
9. **VERIFY-ANDROID-001** — Android 真机矩阵（type=VERIFY_E5, sev=—, gaps≈0, status=PLANNED）
10. **VERIFY-WECHAT-001** — 微信真机矩阵（type=VERIFY_E5, sev=—, gaps≈0, status=PLANNED）
11. **VERIFY-ESP32-001** — ESP32 E5 夹具矩阵（type=VERIFY_E5, sev=—, gaps≈0, status=PLANNED）
12. **VERIFY-SMART-HID-001** — Smart HID E5 端到端（type=VERIFY_E5, sev=—, gaps≈0, status=PLANNED）
13. **VERIFY-E6-001** — Clean Machine / Release E6（type=VERIFY_E6, sev=—, gaps≈31, status=PLANNED）

## 依赖边

- ENV-PLAYWRIGHT-001 → TEST-PAGE-DRIVER-001
- VERSION-METADATA-001 → RELEASE-PIPELINE-001
- OTA-PACKAGE-001 → OTA-CLIENT-001
- ESP32-BUILD-001 → OTA-FIRMWARE-001
- OTA-FIRMWARE-001 → OTA-E5-VERIFICATION
- OTA-CLIENT-001 → OTA-E5-VERIFICATION
- ESP32-BUILD-001 → ESP32-PERIPHERAL-001
- ESP32-BUILD-001 → ESP32-OBSERVER-001
- ESP32-PERIPHERAL-001 → ESP32-FAULT-001
- VERSION-METADATA-001 → PAGE-VERSION-001
- TEST-PAGE-DRIVER-001 → VERIFY-ANDROID-001
- OTA-CLIENT-001 → VERIFY-ANDROID-001
- TEST-PAGE-DRIVER-001 → VERIFY-WECHAT-001
- ESP32-OBSERVER-001 → VERIFY-ESP32-001
- ESP32-FAULT-001 → VERIFY-ESP32-001
- TEST-BRIDGE-TS-001 → VERIFY-SMART-HID-001
- PUBLIC-HONESTY-001 → VERIFY-E6-001
- RELEASE-PIPELINE-001 → VERIFY-E6-001
- VERSION-METADATA-001 → VERIFY-E6-001

## 首批候选

1. **RELEASE-PIPELINE-001** — UniApp + Peripheral/Observer 双固件 Release Pipeline（status=PLANNED）
2. **ESP32-BUILD-001** — 两环境、无固定 COM、模块化入口（status=PLANNED）
3. **OTA-E5-VERIFICATION** — ESP32+Android OTA 闭环 E5（status=BLOCKED）
4. **ESP32-PERIPHERAL-001** — 服务/特征/名称/LED/Device Info 对齐契约（status=PLANNED）
5. **ESP32-OBSERVER-001** — 实现 fixture_observer（status=PLANNED）
