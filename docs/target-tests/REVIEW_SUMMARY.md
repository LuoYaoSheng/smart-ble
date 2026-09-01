# TP-G1-R2 审核摘要（用户审核入口 · TP-G1 最终校正）

```yaml
status: REVIEW
document_version: 1.2
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: [TP-G1 v1.0, TP-G1-R1 v1.1]
```

> TP-G1-R2 完成页面行为目标测试完整化：逐 State / 逐 Operation 机器可读契约、Expected/Actual 分离、Harness 强化。
> **未经用户批准本摘要前，禁止进入 TP-G2。批准后不再扩大测试定义。**

---

## 1. 交付总览

| 类别 | 内容 |
|---|---|
| 页面行为契约 | `page-behavior.manifest.json`（11 页 / 67 State / 92 Operation / 50 error variants） |
| 页面 spec | 11 份完整 Playwright 定义：State suite + Operation suite + Error/Nav/Platform/Cleanup/a11y（WEB 额外） |
| Page Driver | Actual API 全抛 `TARGET_PAGE_DRIVER_MISSING`；禁止假零 / 静态 exit_to / 回填 Expected |
| Harness | 页面完整性 15 用例（含故意错误：删 OP/State、缺 cleanup/failure、slice、空 perform） |
| Runner | `pages: { specs, state_cases, operation_cases, assertion_cases, blocked_specs, blocked_cases, reason }` |

## 2. 数量与覆盖

- FEAT：**Must 81 / Should 0 / Could 0**（R1 已冻结）
- 页面行为：states=67｜operations=92｜failure_variants=92｜cleanup_assertions=39
- TODO=0｜slice(0,3)=0｜空断言=0
- 测试定义完整；Driver 未实现时 BLOCKED，**不得 PASS**

## 3. System / Harness / Current

| 分类 | 要求 |
|---|---|
| System | SYSTEM_FAIL=0｜TARGET_CONTRACT_FAIL=0 |
| Harness | HARNESS_FAIL=0（含页面完整性） |
| Current | 允许 FAIL（TP-G2 输入） |
| Pages | Playwright 缺失 → BLOCKED_BY_TOOLCHAIN；有 Playwright 无 Driver → BLOCKED_BY_TARGET_DRIVER |

## 4. 页面测试边界（R2）

- 定义来源：APPROVED 页面 Markdown，禁止从 Vue 反推。
- Expected = behavior manifest；Actual = Page Driver 探测。
- TP-G2 只分析实现差距，不补写目标期望。

## 5. 用户批准清单

- [ ] TP-G1-R1 契约零容忍与 Harness 分离接受
- [ ] TP-G1-R2 页面行为完整定义（92 OP / 67 State）接受
- [ ] Current FAIL 作为 TP-G2 差距输入接受
- [ ] 批准进入 TP-G2（此后不再扩大测试定义）

## 6. 红线

- BUSINESS CODE: NOT MODIFIED
- HARDWARE: NOT FLASHED
- ANDROID: NOT INSTALLED / NOT TESTED
- 未 push（状态见执行报告）
