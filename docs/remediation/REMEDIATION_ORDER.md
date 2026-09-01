# 修复顺序（TP-G2-R1 · 未执行）

```yaml
status: APPROVED
document_version: 2.0
gate: TP-G2-R1
content_hash: 54902a01ef816b379460f622959b6e65c8de4a2af90740f8dafa21c14c694a5d
approved_by: user
last_reviewed: 2026-09-01
```

> **用户已批准本 Remediation 顺序作为规划。**
>
> 执行规则：依赖图不变；Wave/拓扑序；一次只批准一个 Task；完成后停下。
> **PUBLIC-HONESTY-001 = DONE**。其他 Task 仍为 PLANNED（含 VERSION-METADATA-001）。

## 推荐拓扑序

1. **TEST-CURRENT-INTEGRITY-001** — Current 度量完整性（TP-G1-R3 已完成）（type=TESTABILITY, sev=—, gaps≈0, status=DONE）
2. **ENV-PLAYWRIGHT-001** — 安装并锁定 Playwright / H5 harness（type=ENVIRONMENT, sev=P2, gaps≈162, status=PLANNED）
3. **TEST-PAGE-DRIVER-001** — 实现 Target Page Driver（type=TESTABILITY, sev=P2, gaps≈11, status=PLANNED）
4. **PUBLIC-HONESTY-001** — 落地页立即诚实降级（假下载/6+/错误主线→PREVIEW/NOT_RELEASED）（type=SOURCE_FIX, sev=P0, gaps≈0, status=DONE）
5. **VERSION-METADATA-001** — 根 VERSION + Release Metadata + Public Status（type=SOURCE_FIX, sev=P1, gaps≈9, status=PLANNED）
6. **RELEASE-PIPELINE-001** — UniApp + Peripheral/Observer 双固件 Release Pipeline（type=RELEASE, sev=P0, gaps≈1, status=PLANNED）
7. **RUNTIME-DISPLAY-NAME-001** — 实现 display-name 解析链（type=SOURCE_FIX, sev=P1, gaps≈2, status=PLANNED）
8. **RUNTIME-FILTER-001** — device-filter 关键词命中项匹配对齐目标（type=SOURCE_FIX, sev=P1, gaps≈4, status=PLANNED）
9. **RUNTIME-GATT-CODEC-001** — validateHexInput/parseHexInput（type=SOURCE_FIX, sev=P1, gaps≈6, status=PLANNED）
10. **RUNTIME-WRITE-QUEUE-001** — write-queue MTU 分包队列（type=SOURCE_FIX, sev=P1, gaps≈2, status=PLANNED）
11. **RUNTIME-LOG-REDACTION-001** — log-redaction 脱敏（type=SOURCE_FIX, sev=P1, gaps≈6, status=PLANNED）
12. **RUNTIME-RECONNECT-001** — reconnect-policy 有限重连（type=SOURCE_FIX, sev=P1, gaps≈3, status=PLANNED）
13. **RUNTIME-SESSION-001** — Registry subscription_count + 配网会话分类（type=SOURCE_FIX, sev=P1, gaps≈8, status=PLANNED）
14. **RUNTIME-CONNECTION-DISCOVERY-001** — connectDevice 编排服务发现（type=SOURCE_FIX, sev=P1, gaps≈3, status=PLANNED）
15. **OTA-PACKAGE-001** — 客户端 Firmware Package 六项校验（type=SOURCE_FIX, sev=P1, gaps≈4, status=PLANNED）
16. **OTA-CLIENT-001** — 客户端完整 OTA 事务（CTRL start→ready→DATA→commit）（type=SOURCE_FIX, sev=P0, gaps≈15, status=PLANNED）
17. **ESP32-BUILD-001** — 两环境、无固定 COM、模块化入口（type=SOURCE_FIX, sev=P1, gaps≈0, status=PLANNED）
18. **OTA-FIRMWARE-001** — 固件 OTA op/target/hardware/SHA/max_chunk/commit 校验（type=SOURCE_FIX, sev=P1, gaps≈0, status=PLANNED）
19. **ESP32-PERIPHERAL-001** — 服务/特征/名称/LED/Device Info 对齐契约（type=SOURCE_FIX, sev=P1, gaps≈0, status=PLANNED）
20. **ESP32-OBSERVER-001** — 实现 fixture_observer（type=SOURCE_FIX, sev=P1, gaps≈12, status=PLANNED）
21. **ESP32-FAULT-001** — Fault Injection + Serial JSON（type=SOURCE_FIX, sev=P1, gaps≈0, status=PLANNED）
22. **PAGE-BROADCAST-001** — PAGE-008 改用 composable/adapter/service（type=SOURCE_FIX, sev=P1, gaps≈6, status=PLANNED）
23. **PAGE-VERSION-001** — PAGE-010 改为 Metadata 投影（type=SOURCE_FIX, sev=P1, gaps≈5, status=PLANNED）
24. **TEST-BRIDGE-TS-001** — Node 测试桥支持 TS protocol import（Smart HID）（type=TESTABILITY, sev=P1, gaps≈6, status=PLANNED）
25. **VERIFY-ANDROID-001** — Android 真机矩阵（type=VERIFY_E5, sev=—, gaps≈0, status=PLANNED）
26. **VERIFY-WECHAT-001** — 微信真机矩阵（type=VERIFY_E5, sev=—, gaps≈0, status=PLANNED）
27. **VERIFY-ESP32-001** — ESP32 E5 夹具矩阵（type=VERIFY_E5, sev=—, gaps≈0, status=PLANNED）
28. **VERIFY-SMART-HID-001** — Smart HID E5 端到端（type=VERIFY_E5, sev=—, gaps≈0, status=PLANNED）
29. **VERIFY-E6-001** — Clean Machine / Release E6（type=VERIFY_E6, sev=—, gaps≈30, status=PLANNED）

## 依赖边

- ENV-PLAYWRIGHT-001 → TEST-PAGE-DRIVER-001
- VERSION-METADATA-001 → RELEASE-PIPELINE-001
- OTA-PACKAGE-001 → OTA-CLIENT-001
- ESP32-BUILD-001 → OTA-FIRMWARE-001
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

1. **ENV-PLAYWRIGHT-001** — 环境任务，解锁页面 E4 统计
2. **TEST-PAGE-DRIVER-001** — 可测试性（依赖 Playwright）
3. **PUBLIC-HONESTY-001** — P0 公开误导立即降级
4. **VERSION-METADATA-001** — VERSION/Metadata（不循环依赖 Release）
5. **OTA-CLIENT-001** — P0 协议断裂（依赖 OTA-PACKAGE-001）
