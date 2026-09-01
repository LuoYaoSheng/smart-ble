# 当前测试覆盖（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 6d61cc538b5131d8ae7fe4b9490737b696efa2a178a30eca611cd6d8ab550772
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
| CURRENT_PASS | 298 |
| CURRENT_FAIL | 19 |
| cases | 87 |
| source | .tmp/tp-g2/logs/current-structured.json |

### Layers

- unit: pass=43 fail=7 cases=50 blocked=—
- integration: pass=10 fail=8 cases=18 blocked=—
- firmware: pass=5 fail=4 cases=9 blocked=—
- release: pass=10 fail=0 cases=10 blocked=—
- pages-playwright: pass=230 fail=0 cases=— blocked={}

## 页面自动化

- blocked_specs: 0
- blocked_cases: 0
- reason: null
- blockers: BLK-TOOL-PLAYWRIGHT=CLEARED; BLK-TEST-PAGE-DRIVER=CLEARED
- page E4: pass=230 fail=0 (Driver Runtime)
- TP-G2-R2 product tallies: see `docs/gap-analysis/PAGE_E4_GAP_REPORT.md` / `reports/target-vs-current/page-e4-v2.json`

## 映射规则

- PASS → 相关 target_ids 的 verification_status=AUTOMATED_PASS
- FAIL → AUTOMATED_FAIL + case.first_breakpoint
- 无证据 → UNASSESSED / NOT_EXECUTED（不是 PARTIAL）
