# TP-G1 最终审核摘要（已批准 · TP-G1-R3 度量完整性修订）

```yaml
status: APPROVED
document_version: 1.4
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: user
supersedes: [TP-G1 v1.0, TP-G1-R1 v1.1, TP-G1-R2 v1.2, TP-G1 FINAL]
revision: TP-G1-R3
```

> **用户已批准 TP-G1-R1、TP-G1-R2、TP-G1 FINAL PASS，允许进入 TP-G2。**
> TP-G1-R3 仅修复 Current 测试度量完整性（假绿/假红/结构化），不扩大目标行为与测试范围。

---

## 批准记录

- [x] TP-G1-R1：契约零容忍、Harness/Current 分离已批准
- [x] TP-G1-R2：67 State / 92 Operation 页面行为定义已批准
- [x] Current FAIL 可作为 TP-G2 差距输入
- [x] 批准进入 TP-G2
- [x] 此后不再扩大目标行为和测试范围
- [x] TP-G1-R3：Current 参照层迁出、假绿清除、OTA 精确 UUID、结构化 Case（待用户审阅）

## TP-G1-R3 修订摘要

| 项 | 结果 |
|---|---|
| Integration 参照层 | 迁入 `harness/integration-mutations.test.mjs`（HARNESS-I-002..013） |
| vacuous `\|\| true` / `assert.ok(true)` | 已清除 |
| serial-schema 非 async await | 已修复 |
| OTA 精确 UUID + CTRL-before-DATA | Current FAIL 第一断点正确 |
| Runner `current.cases[]` | PASS/FAIL 由 Case 聚合；含 Target IDs |
| TEST_INFRA_FAIL | 与产品 FAIL 分离 |

## 交付冻结（不得再扩定义）

| 类别 | 内容 |
|---|---|
| 页面行为契约 | `page-behavior.manifest.json`（11 页 / 67 State / 92 Operation） |
| 页面 spec | 完整 Playwright 定义；Driver 未实现时 BLOCKED |
| Harness / System | 尺子已批准；TP-G2 必须先确认 System/Harness 全绿 |
| 统一入口 | `verify-target.mjs --mode=system|current|all` |

## TP-G2 / TP-G2-R1 报告入口

- Current State：`docs/current-state/`
- Gap Analysis：`docs/gap-analysis/`
- Remediation：`docs/remediation/`
- 机器报告：`reports/target-vs-current/`（v1 SUPERSEDED → 见 v2）

## 红线

- BUSINESS CODE: TP-G2 不得修改
- TARGET/TEST EXPECTATIONS: 不得修改目标产品语义与页面期望
- HARDWARE: 不得执行 E5
- 未 push（见执行报告）
