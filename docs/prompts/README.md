# Smart BLE 当前 Codex 任务入口

> 当前方法：目标产品、目标测试、当前实现、差距和修复严格分层。
> 当前唯一总计划：[`2026-09-01-target-product-spec-test-gap-remediation-plan.md`](../plans/2026-09-01-target-product-spec-test-gap-remediation-plan.md)

---

## 1. 正确执行顺序

```text
TP-G0 完整目标产品文档
→ 用户审核并批准
→ TP-G1 目标测试规范与测试脚本
→ 用户审核并批准
→ TP-G2 当前实现盘点与自动差距报告
→ 用户审核修复顺序
→ TP-G3 按目标测试逐项修复
→ TP-G4 Android / 微信 / ESP32 / Smart HID E5
→ TP-G5 落地页、Release 与独立电脑 E6
→ TP-G6 发布后烟测和状态降级
```

任何 Gate 不得自动越过用户审核点。

---

## 2. 当前阶段：TP-G3（TEST-PAGE-DRIVER-001 = DONE）

PUBLIC-HONESTY / VERSION-METADATA / PAGE-VERSION / ENV-PLAYWRIGHT / TEST-PAGE-DRIVER = DONE。

当前阶段：

**TP-G3 · TEST-PAGE-DRIVER-001 已完成；等待用户批准下一 Task**

下一候选（均未自动执行）：

- `RELEASE-PIPELINE-001`
- Runtime / PAGE 业务修复
- OTA / ESP32 / E5 / E6

本轮禁止自动进入上述任一 Task。

正式报告：

```text
docs/gap-analysis/TARGET_VS_CURRENT_SUMMARY.md
docs/remediation/REMEDIATION_ORDER.md
reports/target-vs-current/   # v2
reports/target-vs-current-v1/ # SUPERSEDED
```

历史执行提示词：

```text
2026-09-01-tp-g2-current-gap-analysis-codex-prompt.md
```

原段落保留供参考：

**TP-G2 当前实现盘点与差距报告（已由 R1 校正；现进入 TP-G3 首个 Task）。**

输出：

```text
docs/current-state/**
docs/gap-analysis/**
docs/remediation/**
reports/target-vs-current/**
```

本 Gate 只盘点、运行可运行测试、生成差距与第一断点与修复 Backlog；不修改业务代码，不烧写，不进入 TP-G3。

---

## 3. TP-G1：目标测试体系（已完成并批准）

用户批准目标产品后使用过：

```text
2026-09-01-tp-g1-target-test-system-codex-prompt.md
```

输出：

```text
docs/target-tests/**
scripts/target/**
tests/target/**
```

状态：APPROVED（user）。此后不再扩大测试定义。

---

## 4. TP-G2：当前实现与差距

用户批准测试体系后使用：

```text
2026-09-01-tp-g2-current-gap-analysis-codex-prompt.md
```

输出：

```text
docs/current-state/**
docs/gap-analysis/**
docs/remediation/**
reports/target-vs-current/**
```

本 Gate 只盘点、运行测试、生成差距和第一断点，不修改业务代码。

---

## 5. TP-G3：测试驱动修复

用户批准差距和修复顺序后，每次指定一个 FIX：

```text
2026-09-01-tp-g3-test-driven-remediation-codex-prompt.md
```

执行规则：

```text
失败测试
→ 第一断点
→ 最小修改
→ 自动化/构建
→ HARDWARE_PENDING
→ 聚焦提交
```

不允许一次性修所有问题。

---

## 6. TP-G4：真实设备 E5

自动化通过后使用：

```text
2026-09-01-tp-g4-hardware-e5-verification-codex-prompt.md
```

范围：

- Android；
- 微信；
- LightBLE Peripheral；
- LightBLE Observer；
- OTA；
- Smart HID。

必须固定 App Commit、固件 SHA、设备和串口；验证中只测试、不修代码。

---

## 7. TP-G5：落地页、Release 与 E6

发布范围内 Must 达到 E5 后使用：

```text
2026-09-01-tp-g5-release-e6-codex-prompt.md
```

负责：

- VERSION / Release Metadata；
- Artifact / SHA；
- 生产落地页；
- CI / Release；
- 独立电脑 RELEASE_VERIFY；
- 发布授权边界。

没有 E6 的能力不得公开标 VERIFIED。

---

## 8. TP-G6：发布后烟测

正式发布后使用：

```text
2026-09-01-tp-g6-post-release-smoke-codex-prompt.md
```

从公开下载、公开二维码和正式落地页开始验证；失败时优先降级公开状态和关闭坏入口。

---

## 9. 目标文档和测试入口

目标产品文档清单：

```text
docs/target-product/README.md
```

目标测试文档清单：

```text
docs/target-tests/README.md
```

这两份 README 定义全部必需文档、模板、ID、完整性检查和用户审核摘要，Codex 不得自行删减。

---

## 10. 已被替代的旧入口

以下内容不再作为当前执行入口：

- `docs/plans/2026-08-31-uniapp-esp32-full-product-delivery-plan.md`
- `docs/prompts/2026-08-31-uniapp-esp32-full-product-delivery-codex-prompt.md`
- `docs/prompts/2026-08-31-uniapp-esp32-g3-contract-version-preview-codex-prompt.md`
- 旧 UniApp Reference Product Plan
- 旧 Smart BLE × Smart HID 两仓治理提示词

它们可用于理解历史范围和当前实现审计，但不能覆盖 `docs/target-product/**` 的 APPROVED 目标。

---

## 11. 核心禁止事项

- 不根据当前实现降低目标；
- 不把当前审计直接写成目标契约；
- 不在目标文档中写当前 PASS/FAIL；
- 不在差距分析中修改目标测试；
- 不在验证机边测边修；
- 不把 E0～E4 冒充 E5；
- 不把开发机 E5 冒充 E6；
- 不生成假下载、假二维码和无证据 VERIFIED；
- 不自动 push、tag、部署、烧写或发布。
