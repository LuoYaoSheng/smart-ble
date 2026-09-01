# 01 测试策略与证据等级

```yaml
status: APPROVED
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

## 1. 范围 / 非范围

负责：TP-G1 目标测试体系的总策略——测试分层、证据等级 E0–E6、PASS/FAIL/BLOCKED 口径、第一断点原则。
不负责：具体用例（03–11）、运行结果记录（`docs/verification/runs/`）、修复（TP-G2+）。

## 2. 核心关系

APPROVED Target（docs/target-product/**）→ Target Test（本目录+tests/target/**）→ 当前实现接受测试 → PASS / FAIL / BLOCKED。

禁止反向：不得按当前实现改测试目标；不得因当前实现缺 CHAR_CTRL 就删 OTA 目标断言。

## 3. 证据等级与自动化边界

| 等级 | 名称 | 自动化（TP-G1 已落地） | 真 机 / 手 工 |
|---|---|---|---|
| E0 | Contract/Static | scripts/target/ 7 checker + tests/target/contract/（真实仓库零容忍）+ harness mutations | — |
| E1 | Unit | tests/target/unit/（目标层）+ harness 参照层 | — |
| E2 | Fake Runtime | tests/target/integration/ | — |
| E3 | Build | 由 E6 模板覆盖（clean-install） | make verify / pio run |
| E4 | Page | page-behavior.manifest + 11 份完整 Playwright 定义（Driver 未实现时 BLOCKED_BY_TARGET_DRIVER / 无 Playwright 时 BLOCKED_BY_TOOLCHAIN） | 原型走查 |
| E5 | Real Device | 固件静态前置（tests/target/firmware/） | 08/09/10 矩阵 + hardware/ 5 模板 |
| E6 | Release | tests/target/release/ 静态用例 | clean-install.test.md |

## 4. PASS / FAIL / BLOCKED 口径

- PASS：目标断言在真实工件（契约/代码/Fake Runtime）上通过。
- FAIL：断言失败；`NOT_IMPLEMENTED:` 前缀 = 目标接口/模块缺失（TP-G2 差距输入）。
- BLOCKED：工件存在但环境缺失（浏览器/真机/产物）——**不得计自动化 PASS**。
- 模板：E5/E6 手工矩阵（hardware/、clean-install）。

## 5. 第一断点

每个 FAIL 输出最早偏离目标的位置（目标 ID + 缺口描述），不是最终 UI 症状。verify-target 汇总前 20 条预览（非正式 gap）。

## 6. 环境与依赖

Node ≥20（node:test）；无 npm 依赖（ESM 桥 data-URL 加载 uniapp 源码）；Playwright 可选（未装→E4 BLOCKED）。

## 7. 退出条件（TP-G1）

- [x] 测试规范 18 份齐备（本文件+02..17+REVIEW_SUMMARY）
- [x] 7 checker + 7 contract 测试（含 9 类故意错误全部被抓）
- [x] 15 unit + 12 integration + manifest/specs + firmware/release 静态
- [x] verify-target 统一入口可运行并输出分层汇总
- [x] 初跑记录（见 REVIEW_SUMMARY §6）
- [ ] 用户批准 REVIEW_SUMMARY → 进入 TP-G2
