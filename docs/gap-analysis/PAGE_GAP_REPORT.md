# 页面差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 6d61cc538b5131d8ae7fe4b9490737b696efa2a178a30eca611cd6d8ab550772
```

记录数（筛选后）：18

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
| FEAT-041 | PAGE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-042 | PAGE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-043 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-044 | PAGE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-045 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| PAGE-001 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [TEST-U-005 REQ-030/DATA-003 DEC-017] 第一断点: Registry 快照缺 subscription_count 字段 | RUNTIME-SESSION-001 |
| PAGE-002 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ | RUNTIME-LOG-REDACTION-001 |
| PAGE-006 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [TEST-U-010 REQ-026 FEAT-028] 第一断点: 目标接口 validateHexInput/parseHexInput 缺失 | RUNTIME-GATT-CODEC-001 |
| OP-P006-12 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| OP-P006-13 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| OP-P006-14 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| PAGE-007 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [REQ-053/PAGE-007 排除规则] 第一断点: Registry 无配网会话分类/排除接口——PAGE-007 口径无法排除配网会话 | RUNTIME-SESSION-001 |
| PAGE-008 | PAGE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P1 | 广播页内联；Owner/composable 未接入 | PAGE-BROADCAST-001 |
| OP-P008-01 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| OP-P008-02 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| OP-P008-03 | FIRMWARE | CONFIRMED_MISSING | BLOCKED_BY_FIXTURE | P1 | hardware/esp32 无 Observer 目标源码 | ESP32-OBSERVER-001 |
| WEB-001 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ | RUNTIME-LOG-REDACTION-001 |
| OP-W001-05 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
