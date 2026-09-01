# Runtime 差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 4139b2ab376a9a56083c81495831f051ac7804278a5f56936064e429e04b9571
```

记录数（筛选后）：14

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
| FEAT-046 | RUNTIME | CONFIRMED_PARTIAL | NOT_EXECUTED | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| FEAT-047 | RUNTIME | CONFIRMED_PARTIAL | HARDWARE_PENDING | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| FEAT-048 | RUNTIME | CONFIRMED_PARTIAL | HARDWARE_PENDING | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| FEAT-049 | RUNTIME | CONFIRMED_PARTIAL | HARDWARE_PENDING | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| FEAT-050 | RUNTIME | CONFIRMED_PARTIAL | HARDWARE_PENDING | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| FEAT-051 | RUNTIME | CONFIRMED_PARTIAL | HARDWARE_PENDING | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| FEAT-052 | RUNTIME | CONFIRMED_PARTIAL | HARDWARE_PENDING | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| FEAT-081 | RUNTIME | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | validateOtaPackage 接口缺失 | OTA-PACKAGE-001 |
| OP-P006-12 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| OP-P006-13 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| OP-P006-14 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| OP-W001-05 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| FLOW-009 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P0 | OtaManager 在第一个 DATA 写之前未发送 CTRL start | OTA-CLIENT-001 |
| PROTO-011 | RUNTIME | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | 客户端 validateOtaPackage 缺失 | OTA-PACKAGE-001 |
