# ESP32 差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 22f5ccdce805a64b62655ec4e44dfdef605c5497505bcd95599fdf4bad5e06d1
```

记录数（筛选后）：8

## OTA Contract 状态（TP-G3）

| 链路 | 状态 | Task |
|---|---|---|
| OTA Package Contract | **CLOSED** | OTA-PACKAGE-001 DONE |
| OTA Client | **CLOSED** | OTA-CLIENT-001 DONE |
| OTA Firmware | **OPEN** | OTA-FIRMWARE-001 PLANNED |

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
