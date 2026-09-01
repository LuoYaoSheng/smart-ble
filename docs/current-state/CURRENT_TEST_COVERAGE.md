# 当前测试覆盖（本轮实测）

```yaml
status: REVIEW
last_reviewed: 2026-09-01
```

## System / Harness

| 指标 | 值 |
|---|---|
| SYSTEM_PASS | 412 |
| SYSTEM_FAIL | 0 |
| HARNESS_PASS | 70 |
| HARNESS_FAIL | 0 |
| TARGET_CONTRACT_FAIL | 0 |
| 7 Checker | 全部 PASS |

## Current

| 层 | PASS | FAIL |
|---|---|---|
| unit | 5 | 11 |
| integration | 25 | 2 |
| firmware | 3 | 4 |
| release | 8 | 1 |
| pages-playwright | 0 | 0（blocked） |
| **合计** | **41** | **18** |

## 页面阻断

| 项 | 值 |
|---|---|
| reason | BLOCKED_BY_TOOLCHAIN |
| blocked_specs | 11 |
| blocked_cases | 229 |
| state_cases | 67 |
| operation_cases | 92 |
| assertion_cases | 849 |

## 其他

| 命令 | 结果 |
|---|---|
| `verify-uniapp.sh` | PASS（EXIT 0） |
| `docs:build` | PASS（EXIT 0） |
| PlatformIO | 未安装 → ESP32 build NOT_EXECUTED |
| Playwright | 未安装 |
| adb devices | 空列表 |
| 硬件 E5 | HARDWARE_PENDING / NOT_EXECUTED |

日志：`.tmp/tp-g2/logs/`（不入库）
