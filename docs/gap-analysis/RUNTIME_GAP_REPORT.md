# Runtime 差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: f02fb36703e21a3dfc1fbe352c470b2a26f3fbf2d6e6a28d5e3f45c20f16faf1
```

记录数（筛选后）：8

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
| FEAT-021 | RUNTIME | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | [REQ-020/021 ERR-CONN-03] 第一断点: connectDevice 未编排服务发现（失败不报错=半开泄漏面） | RUNTIME-CONNECTION-DISCOVERY-001 |
| FEAT-040 | RUNTIME | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | [TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ | RUNTIME-LOG-REDACTION-001 |
| FEAT-057 | RUNTIME | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | [TEST-I-009 REQ-047~051 FEAT-057/063 FLOW-010] 第一断点: TypeError: Failed to resolv | RUNTIME-DISPLAY-NAME-001 |
| PAGE-002 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ | RUNTIME-LOG-REDACTION-001 |
| PAGE-006 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [REQ-020/021 ERR-CONN-03] 第一断点: connectDevice 未编排服务发现（失败不报错=半开泄漏面） | RUNTIME-CONNECTION-DISCOVERY-001 |
| WEB-001 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ | RUNTIME-LOG-REDACTION-001 |
| FLOW-004 | RUNTIME | CONFIRMED_PARTIAL | AUTOMATED_FAIL | P1 | [REQ-020/021 ERR-CONN-03] 第一断点: connectDevice 未编排服务发现（失败不报错=半开泄漏面） | RUNTIME-CONNECTION-DISCOVERY-001 |
| ERR-CONN-03 | RUNTIME | NOT_IMPLEMENTED | AUTOMATED_FAIL | P1 | [REQ-020/021 ERR-CONN-03] 第一断点: connectDevice 未编排服务发现（失败不报错=半开泄漏面） | RUNTIME-CONNECTION-DISCOVERY-001 |
