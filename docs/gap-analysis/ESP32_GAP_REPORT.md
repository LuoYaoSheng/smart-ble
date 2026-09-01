# ESP32 差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 2014879685cc4cc3ee003b29daa5d719c5c0c7e5a0d7bd244d8a4a0f188195be
```

记录数（筛选后）：13

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
| OP-P008-01 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| OP-P008-02 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| OP-P008-03 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| FLOW-008 | FIRMWARE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P1 | 缺 fixture_observer | ESP32-OBSERVER-001 |
| PROTO-001 | FIRMWARE | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P1 | 固件含广播名 BLEToolkit-Observer | ESP32-OBSERVER-001 |
| PROTO-002 | FIRMWARE | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P1 | 固件含广播名 BLEToolkit-Observer | ESP32-OBSERVER-001 |
| PROTO-003 | FIRMWARE | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P1 | 固件含广播名 BLEToolkit-Observer | ESP32-OBSERVER-001 |
| PROTO-004 | FIRMWARE | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P1 | 固件含广播名 BLEToolkit-Observer | ESP32-OBSERVER-001 |
| PROTO-005 | SMART_HID | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P1 | 固件含广播名 BLEToolkit-Observer | ESP32-OBSERVER-001 |
| PROTO-009 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | fixture_observer 不存在 | ESP32-OBSERVER-001 |
| PROTO-010 | RELEASE | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | .github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + P | RELEASE-PIPELINE-001 |
| PROTO-011 | RUNTIME | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | Observer 字段 ≥9（实际 8） | ESP32-OBSERVER-001 |
| EVID-005 | FIRMWARE | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P1 | Observer 字段 ≥9（实际 8） | ESP32-OBSERVER-001 |
