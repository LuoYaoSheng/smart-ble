# 当前测试覆盖（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 54902a01ef816b379460f622959b6e65c8de4a2af90740f8dafa21c14c694a5d
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
| CURRENT_PASS | 30 |
| CURRENT_FAIL | 23 |
| cases | 53 |
| source | .tmp/tp-g2/logs/current-structured.json |

### Layers

- unit: pass=5 fail=11 cases=16 blocked=—
- integration: pass=12 fail=6 cases=18 blocked=—
- firmware: pass=4 fail=5 cases=9 blocked=—
- release: pass=9 fail=1 cases=10 blocked=—
- pages-playwright: pass=0 fail=0 cases=— blocked={"BLOCKED_BY_TOOLCHAIN":11}

## 页面自动化

- blocked_specs: 11
- blocked_cases: 229
- reason: BLOCKED_BY_TOOLCHAIN
- blockers: BLK-TOOL-PLAYWRIGHT, BLK-TEST-PAGE-DRIVER（独立登记，gap_count 均 > 0）

## 映射规则

- PASS → 相关 target_ids 的 verification_status=AUTOMATED_PASS
- FAIL → AUTOMATED_FAIL + case.first_breakpoint
- 无证据 → UNASSESSED / NOT_EXECUTED（不是 PARTIAL）
