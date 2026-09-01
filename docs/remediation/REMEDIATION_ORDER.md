# 修复顺序（TP-G2 · 未执行）

```yaml
status: REVIEW
document_version: 1.0
approved_by: null
```

> 本文件只规划。**不得**在未经用户批准前执行任何 FIX / 进入 TP-G3。

## 推荐顺序

1. **FIX-TEST-001** — Target Page Driver 实现（sev=P1, gaps≈0, unlocks=E4 page automation）
2. **FIX-TEST-002** — Playwright / H5 harness 工具链（sev=P2, gaps≈166, unlocks=page runtime execution）
3. **FIX-LANDING-001** — 落地页假下载与多端大一统误导（sev=P0, gaps≈11, unlocks=honest download hub）
4. **FIX-RELEASE-001** — Release Metadata / VERSION SSOT / UniApp 产物流水线（sev=P0, gaps≈4, unlocks=PAGE-009/010 WEB claims）
5. **FIX-RUNTIME-001** — display-name 解析链模块（sev=P1, gaps≈2, unlocks=FEAT-013 PAGE-001）
6. **FIX-RUNTIME-002** — HEX validateHexInput 整体拒绝（sev=P1, gaps≈2, unlocks=FEAT-028 PAGE-006）
7. **FIX-RUNTIME-003** — log-redaction 脱敏（sev=P1, gaps≈4, unlocks=FEAT-040 SEC）
8. **FIX-RUNTIME-004** — write-queue MTU 分包队列（sev=P1, gaps≈2, unlocks=FEAT-030 FLOW-005）
9. **FIX-RUNTIME-005** — reconnect-policy 有限重连（sev=P1, gaps≈11, unlocks=FEAT-023/024）
10. **FIX-RUNTIME-006** — Registry subscription_count + 配网会话分类（sev=P1, gaps≈6, unlocks=PAGE-007 DEC-017）
11. **FIX-RUNTIME-007** — connectDevice 编排服务发现（sev=P1, gaps≈1, unlocks=FLOW-004 ERR-CONN-03）
12. **FIX-RUNTIME-009** — public-status / version-metadata 服务（sev=P1, gaps≈2, unlocks=PAGE-009/010 WEB）
13. **FIX-RUNTIME-008** — device-filter keyword 目标接口（sev=P2, gaps≈0, unlocks=FEAT-014 N/M）
14. **FIX-FW-001** — ESP32 fixture_observer 固件（sev=P0, gaps≈7, unlocks=FLOW-008 E5 Observer）
15. **FIX-PAGE-008** — 广播页改用 Owner/composable 非内联（sev=P1, gaps≈10, unlocks=PAGE-008 FEAT-041+）
16. **FIX-FW-002** — ESP32 LED 指令表与广播名对齐（sev=P1, gaps≈0, unlocks=PROTO LED）
17. **FIX-OTA-001** — OtaManager 写 CHAR_CTRL start/commit/abort（sev=P0, gaps≈15, unlocks=FLOW-009 OTA）
18. **FIX-OTA-002** — validateOtaPackage 六项传输前校验（sev=P1, gaps≈2, unlocks=FEAT-081 DEC-016）
19. **FIX-PAGE-010** — 版本页改为 Metadata 投影非硬编码（sev=P1, gaps≈4, unlocks=PAGE-010）
20. **FIX-HID-001** — smart-hid/profile.js ESM 可载（去 TS 语法）（sev=P1, gaps≈12, unlocks=TEST-U-015）
21. **FIX-E5-001** — Android/微信/ESP32 E5 矩阵执行（sev=null, gaps≈0, unlocks=E5 evidence）
22. **FIX-E6-001** — Clean Machine / Release E6（sev=null, gaps≈28, unlocks=E6 claims）

## 依赖边

- FIX-TEST-002 → FIX-TEST-001
- FIX-RELEASE-001 → FIX-LANDING-001
- FIX-RELEASE-001 → FIX-RUNTIME-009
- FIX-RELEASE-001 → FIX-PAGE-010
- FIX-RUNTIME-009 → FIX-PAGE-010
- FIX-TEST-001 → FIX-E5-001
- FIX-RELEASE-001 → FIX-E6-001
- FIX-LANDING-001 → FIX-E6-001

## 首个建议批准 FIX 候选

1. **FIX-TEST-002**（Playwright 工具链）— 解锁页面自动化执行统计，不改产品语义
2. **FIX-LANDING-001** + **FIX-RELEASE-001** — P0 公开误导
3. **FIX-OTA-001** — P0 协议断裂
4. **FIX-FW-001** — P0 Observer 证据永久 BLOCKED 根因
