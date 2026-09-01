# ESP32 差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 4139b2ab376a9a56083c81495831f051ac7804278a5f56936064e429e04b9571
```

记录数（筛选后）：9

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
| OP-P008-01 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| OP-P008-02 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| OP-P008-03 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| FLOW-008 | FIRMWARE | CONFIRMED_PARTIAL | BLOCKED_BY_FIXTURE | P1 | 缺 fixture_observer | ESP32-OBSERVER-001 |
| PROTO-001 | FIRMWARE | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P1 | 固件缺 FF00 LED 指令表 | ESP32-PERIPHERAL-001 |
| PROTO-003 | FIRMWARE | CONFIRMED_PARTIAL | NOT_EXECUTED | P1 | 固件 OTA JSON 使用 action 字段，目标为 op | OTA-FIRMWARE-001 |
| PROTO-009 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | fixture_observer 不存在 | ESP32-OBSERVER-001 |
| PROTO-010 | RELEASE | CONFIRMED_PARTIAL | BLOCKED_BY_FIXTURE | P0 | .github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + P | RELEASE-PIPELINE-001 |
| PROTO-011 | RUNTIME | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | 客户端 validateOtaPackage 缺失 | OTA-PACKAGE-001 |
