# ESP32 差距报告（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: f02fb36703e21a3dfc1fbe352c470b2a26f3fbf2d6e6a28d5e3f45c20f16faf1
```

记录数（筛选后）：1

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
| PROTO-010 | RELEASE | CONFIRMED_PARTIAL | AUTOMATED_PASS | P0 | .github/workflows/release-build.yml builds Flutter/Tauri; not UniApp Android + P | RELEASE-PIPELINE-001 |

## OTA Chain

| 环节 | Task | 状态 |
|---|---|---|
| OTA Package | OTA-PACKAGE-001 | DONE |
| OTA Client | OTA-CLIENT-001 | DONE |
| OTA Firmware | OTA-FIRMWARE-001 | DONE |
| OTA E5 | — | OPEN（等待批准；禁止自动执行真实 OTA） |

> Flash partition：双分区 OTA（`partitions_ota.csv`）评估为安全 staging；升级失败保持旧固件运行。
