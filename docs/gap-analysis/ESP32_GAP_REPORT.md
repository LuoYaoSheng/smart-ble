# ESP32 差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: 68af291567ff7ddcbf3999ed3c83dc801ce473e5a10d7076c9448be73fe86657
```

记录数（筛选后）：1

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
| PROTO-010 | RELEASE | CONFIRMED_PARTIAL | NOT_EXECUTED | P0 | .github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + P | RELEASE-PIPELINE-001 |




## OTA Chain

| 环节 | 状态 |
|---|---|
| OTA Package | DONE |
| OTA Client | DONE |
| OTA Firmware | DONE |
| OTA E5 | BLOCKED |

> E5 证据：**E5-OTA-001** · `verification/ota-e5/20260902-0952-ota-e5/summary.md`
