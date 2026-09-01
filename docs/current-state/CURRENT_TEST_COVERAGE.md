# 当前测试覆盖（TP-G2-R2）

```yaml
status: REVIEW
gate: TP-G2-R2
```

## System / Harness

| 指标 | 值 |
|---|---|
| SYSTEM_PASS | 412 |
| SYSTEM_FAIL | 0 |
| HARNESS_PASS | 105 |
| HARNESS_FAIL | 0 |
| TARGET_CONTRACT_FAIL | 0 |
| TEST_INFRA_FAIL | 0 |

## Current（结构化 cases）

| 指标 | 值 |
|---|---|
| CURRENT_PASS | 265 |
| CURRENT_FAIL | 19 |
| cases | 54 |
| source | .tmp/tp-g2/logs/current-structured.json |

### Layers

- unit: pass=8 fail=9 cases=17 blocked=—
- integration: pass=12 fail=6 cases=18 blocked=—
- firmware: pass=5 fail=4 cases=9 blocked=—
- release: pass=10 fail=0 cases=10 blocked=—
- pages-playwright: pass=230 fail=0 cases=— blocked={}

## 页面自动化（TP-G2-R2）

- blocked_specs: 0
- blocked_cases: 0
- reason: null
- blockers: BLK-TOOL-PLAYWRIGHT=CLEARED; BLK-TEST-PAGE-DRIVER=CLEARED
- page E4 harness: pass=230 fail=0 (Fake Runtime)
- **产品差距（case 级）**：PASS=102 FAIL=97 BLOCKED=2 NOT_IMPLEMENTED=29
- 报告：`docs/gap-analysis/PAGE_E4_GAP_REPORT.md` · `reports/target-vs-current/page-e4-v2.json`

## 映射规则

- Harness PASS ≠ 产品 PASS（Fake Runtime）
- 产品 FAIL/NOT_IMPLEMENTED 来自静态探测 + Current FAIL first_breakpoint
- BLOCKED = fixture/hardware（如 Observer）
- 无证据不得标 PARTIAL
