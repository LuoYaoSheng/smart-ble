# 当前测试覆盖（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 4139b2ab376a9a56083c81495831f051ac7804278a5f56936064e429e04b9571
```

## System / Harness

| 指标 | 值 |
|---|---|
| SYSTEM_PASS | 412 |
| SYSTEM_FAIL | 0 |
| HARNESS_PASS | 89 |
| HARNESS_FAIL | 0 |
| TARGET_CONTRACT_FAIL | 0 |
| TEST_INFRA_FAIL | 0 |

## Current（结构化 cases）

| 指标 | 值 |
|---|---|
| CURRENT_PASS | 0 |
| CURRENT_FAIL | 0 |
| cases | 0 |
| source | .tmp/tp-g2/logs/current-structured.json |

### Layers



## 页面自动化

- blocked_specs: undefined
- blocked_cases: undefined
- reason: undefined
- blockers: BLK-TOOL-PLAYWRIGHT=CLEARED; BLK-TEST-PAGE-DRIVER=CLEARED
- page E4: pass=— fail=— (Driver Runtime)
- TP-G2-R2 product tallies: see `docs/gap-analysis/PAGE_E4_GAP_REPORT.md` / `reports/target-vs-current/page-e4-v2.json`

## 映射规则

- PASS → 相关 target_ids 的 verification_status=AUTOMATED_PASS
- FAIL → AUTOMATED_FAIL + case.first_breakpoint
- 无证据 → UNASSESSED / NOT_EXECUTED（不是 PARTIAL）
