# 页面差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: f02fb36703e21a3dfc1fbe352c470b2a26f3fbf2d6e6a28d5e3f45c20f16faf1
```

记录数（筛选后）：13

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
| FEAT-041 | PAGE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-042 | PAGE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-043 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-044 | PAGE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| FEAT-045 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | PAGE-008 内联广告逻辑；useBroadcastSession 未使用 | PAGE-BROADCAST-001 |
| PAGE-001 | TESTABILITY | UNASSESSED | AUTOMATED_FAIL | P1 | [TEST-U-015 REQ-047~050 FEAT-053/055/056/058 FLOW-010] 第一断点: SyntaxError: Unexpe | TEST-BRIDGE-TS-001 |
| PAGE-002 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ | RUNTIME-LOG-REDACTION-001 |
| PAGE-006 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [REQ-020/021 ERR-CONN-03] 第一断点: connectDevice 未编排服务发现（失败不报错=半开泄漏面） | RUNTIME-CONNECTION-DISCOVERY-001 |
| PAGE-008 | PAGE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P1 | 广播页内联；Owner/composable 未接入 | PAGE-BROADCAST-001 |
| OP-P008-01 | PAGE | CONFIRMED_PARTIAL | EXECUTED | P1 | 广播页内联；Owner/composable 未接入 | PAGE-BROADCAST-001 |
| OP-P008-02 | PAGE | CONFIRMED_PARTIAL | EXECUTED | P1 | 广播页内联；Owner/composable 未接入 | PAGE-BROADCAST-001 |
| OP-P008-03 | PAGE | CONFIRMED_PARTIAL | HARDWARE_PENDING | P1 | 广播页内联；Owner/composable 未接入 | PAGE-BROADCAST-001 |
| WEB-001 | RUNTIME | UNASSESSED | AUTOMATED_FAIL | P1 | [TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：apps/uniapp/services/ | RUNTIME-LOG-REDACTION-001 |
