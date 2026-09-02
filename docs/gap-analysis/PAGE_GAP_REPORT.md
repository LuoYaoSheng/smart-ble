# 页面差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 0a33163ed724ee27d113d5f163faff955f767f775efdd4d35114f9a2a07038d4
```

记录数（筛选后）：13

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
| FEAT-041 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-042 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-043 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-044 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-045 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| OP-P006-12 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| OP-P006-13 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| OP-P006-14 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| PAGE-008 | PAGE | CONFIRMED_PARTIAL | EXECUTED | P1 | 广播页内联；Owner/composable 未接入 | PAGE-BROADCAST-001 |
| OP-P008-01 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| OP-P008-02 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| OP-P008-03 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| OP-W001-05 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
