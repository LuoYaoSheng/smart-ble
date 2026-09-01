# TP-G1-R1 审核摘要（用户审核入口）

```yaml
status: REVIEW
document_version: 1.1
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: [TP-G1 v1.0]
```

> 本文件浓缩 TP-G1-R1 校正交付：目标契约零容忍一致、Harness/Current 分离、页面测试完整定义、verify-target 三分模式、import-target 隔离。
> **未经用户批准本摘要前，禁止进入 TP-G2（差距报告与修复计划）。**

---

## 1. 交付总览（TP-G1-R1 变更）

| 类别 | 内容 |
|---|---|
| 优先级校正 | TARGET-AMEND-001：81 FEAT 全部 Must（`sync-feature-priorities.mjs` 单源统计） |
| 契约测试 | tests/target/contract/ 7 文件 **仅真实仓库**（零容忍，known failure 白名单 = 0） |
| Harness 测试 | tests/target/harness/ 5 文件 58 用例（mutation/参照层/完整性/隔离，**不计入 Current PASS**） |
| 单元目标测试 | tests/target/unit/ 15 文件 **仅目标层**（参照层已迁至 harness） |
| 页面测试 | 11 份完整 spec（TODO=0）+ page-driver 契约 + manifest 生成器 |
| 统一入口 | `verify-target.mjs --mode=system|current|all [--format=json]` |
| 导入隔离 | import-target：cache-bust + resetImportTargetCache + withInjectedGlobals 串行锁 |

## 2. 数量与覆盖

- 目标登记：REQ 66｜FEAT 81（**Must 81 / Should 0 / Could 0**）｜PAGE 10 + WEB 1｜FLOW 14｜计划测试 103
- **Must 自动化覆盖**：81/81 Must FEAT 有 planned_tests（`test-traceability.json` coverage 实算）
- FEAT-035：Must｜minimum_evidence E5｜release_blocking true｜DEC-008 的 3 台扩展记为 NFR/Should 扩展目标
- 无孤立 REQ/FEAT/PAGE/FLOW/CLAIM/Test（7 checker 全 PASS）

## 3. System / Harness / Current 分类结果

| 分类 | 用例/断言 | TP-G1-R1 结果 |
|---|---|---|
| **System**（checker + contract + pages-contract） | 411 断言 | **PASS 411 / FAIL 0** |
| **Harness**（mutation + 参照层 + 完整性 + 隔离） | 58 用例 | **PASS 58 / FAIL 0** |
| **Current**（unit + integration + firmware + release） | 59 用例 | PASS 41 / **FAIL 18**（诚实差距，TP-G2 输入） |
| **Current 页面 Playwright** | 11 spec × 4 用例 | **BLOCKED_BY_TOOLCHAIN 11**（`@playwright/test` 未安装） |

运行命令：

```bash
node scripts/verify-target.mjs --mode=system --format=json   # SYSTEM_FAIL=0 HARNESS_FAIL=0
node scripts/verify-target.mjs --mode=current --format=json  # 允许 CURRENT_FAIL>0
```

## 4. Harness 故意错误验证（58/58 PASS）

- 契约 mutation（重复 ID、坏引用、OTA 缺步、Landing 假下载等）→ `tests/target/harness/contract-mutations.test.mjs`
- 优先级漂移 FEAT-035 → `contract-priority-drift.test.mjs`
- 单元参照层（32B 截断、权限预取、HEX 静默修正等）→ `unit-mutations.test.mjs`
- 页面 spec 完整性（无 TODO、有 expect、manifest 覆盖）→ `page-test-completeness.test.mjs`
- import-target 隔离（cache/globals/并行）→ `runner-isolation.test.mjs`

## 5. 页面测试定义（TP-G1-R1 完成）

- `tests/target/pages/page-driver-contract.md` + `lib/page-driver.js`
- 11 份 spec 覆盖：首屏/全部 states/主操作/跳转/a11y/console/CTA/平台差异
- Driver 未接线时 runtime 测试 → `BLOCKED_BY_TARGET_DRIVER`（不得 PASS）
- `generate-pages-artifacts.mjs` 不再生成 TODO 骨架

## 6. 已知 Blocker（非 TP-G1 门禁）

| 项 | 分类 | 说明 |
|---|---|---|
| Playwright 未安装 | BLOCKED_BY_TOOLCHAIN | 安装后可自动执行 11 spec |
| TARGET_PAGE_DRIVER 未实现 | BLOCKED_BY_TARGET_DRIVER | TP-G2+ 接线后 runtime 断言可跑 |
| ESP32/Android/微信真机 | BLOCKED_BY_FIXTURE | TP-G4 |
| Release 产物 E6 手工项 | NOT_EXECUTED 模板 | TP-G5/6 |

## 7. 用户批准清单

- [ ] TARGET-AMEND-001 优先级投影（Must 81/0/0）接受
- [ ] Harness/Current 分离与 verify-target 三分模式接受
- [ ] 页面测试完整定义（TODO=0）接受
- [ ] Current FAIL=18 作为 TP-G2 差距输入接受
- [ ] 批准进入 TP-G2

## 8. 红线

- BUSINESS CODE: NOT MODIFIED
- HARDWARE: NOT FLASHED
- ANDROID: NOT INSTALLED / NOT TESTED
- 未 push（push 状态见每次执行报告，本文件不写远端 hash）
