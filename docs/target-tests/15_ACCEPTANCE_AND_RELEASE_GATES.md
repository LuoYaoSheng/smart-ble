# 15 验收与 Release Gate

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：TP-G2..G6 各 Gate 的进入/退出判据。不负责：执行。

## 2. Gate 判据

| Gate | 内容 | 退出判据 |
|---|---|---|
| TP-G2 | 差距报告（由 verify-target 输出生成正式 gap） | 全部差距分级+批次；用户批准修复计划 |
| TP-G3 | 修复实现 | P0=0；P1 闭环；目标测试目标层 FAIL→PASS（不许改目标） |
| TP-G4 | 真机矩阵执行 | 08/09/10 矩阵全结论；平台差异回填 |
| TP-G5 | Release 组装 | 产物+SHA+QR+Metadata 成对；五处同源 |
| TP-G6 | Clean Machine | R-011 30 分钟闭环达标；公开状态与证据联动 |

## 3. 硬性红线（所有 Gate）

- E0–E4 不得冒充 E5/E6；
- 缺硬件=BLOCKED 不是 PASS；
- 无证据不得 VERIFIED；无产物必须 NOT_RELEASED；
- 每轮必须可由 verify-target 复跑。

## 4. 退出条件

判据冻结；与 23 号 Definition of Done 对齐。
