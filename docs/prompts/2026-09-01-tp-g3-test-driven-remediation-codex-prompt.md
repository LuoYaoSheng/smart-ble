# Codex 提示词：TP-G3——按目标测试逐项修复

> 前置：TP-G2 差距报告与修复顺序已由用户批准。
> 每次只执行一个明确 FIX 或一个紧密耦合的小 Gate。
> 自动化先修绿；需要硬件的项到 TP-G4，不允许在本阶段假 PASS。

---

## 可直接复制给 Codex

```text
你现在执行 Smart BLE 的 TP-G3：按 APPROVED 目标测试逐项修复。

工作区：

/Users/luoyaosheng/Desktop/project/Open/smart-ble

输入参数：

FIX_ID=<用户明确指定，例如 FIX-001>

必须先读取：

1. AGENTS.md
2. docs/plans/2026-09-01-target-product-spec-test-gap-remediation-plan.md
3. APPROVED docs/target-product/**
4. APPROVED docs/target-tests/**
5. contracts/target/**
6. reports/target-vs-current/**
7. docs/gap-analysis/**
8. docs/remediation/**
9. FIX_ID 对应 Target、Test、First Breakpoint 和修改范围

若用户没有明确 FIX_ID，或该 FIX 未获批准：

输出 `FIX_NOT_SPECIFIED_OR_NOT_APPROVED` 并停止。不得自行挑一个大范围问题开始修改。

==================================================
一、总规则
==================================================

1. 一次只处理 FIX_ID 对应范围。
2. 先证明目标测试失败，再修改实现。
3. 只修第一断点和必要依赖，不顺手重构相邻模块。
4. 不修改 APPROVED 目标规范来让实现通过。
5. 不弱化测试预期。
6. 不把现有旧测试当绝对正确；与目标冲突时，先新增/重写目标测试，并记录旧测试淘汰原因。
7. 每个修改必须映射 Target ID、Test ID、FIX ID。
8. 自动化通过不等于 E5；硬件项保留 HARDWARE_PENDING。
9. 不自动 push、tag、deploy、release。
10. 不执行未授权烧写。
11. 不覆盖用户未提交改动。
12. 生成报告和证据，不留下 tracked build/report 垃圾。

==================================================
二、执行前分析
==================================================

记录：

- git status / HEAD / branch；
- FIX ID；
- Target IDs；
- 当前状态；
- First Breakpoint；
- 目标测试；
- 当前失败输出；
- 修改文件白名单；
- 禁止修改范围；
- 依赖；
- 自动化和构建命令；
- 是否需要 TP-G4 硬件。

若工作区脏，隔离用户改动，不 reset/stash/checkout。

==================================================
三、失败测试确认
==================================================

执行 FIX 对应目标测试和最小相关回归：

- 必须确认当前失败与 gap report 一致；
- 若测试意外 PASS，重新检查 gap 是否过时；
- 不允许在没有可复现失败的情况下盲目修改；
- 若环境缺失，标 BLOCKED_BY_TOOLCHAIN/ENV，不伪造失败。

保存：

- command；
- exit code；
- Target/Test ID；
- first breakpoint；
- 日志路径。

==================================================
四、最小实现
==================================================

按目标架构修改。

常见范围示例：

平台/权限：
- 平台 Adapter；
- 权限状态和恢复；
- 不把扫描失败当无设备。

扫描：
- generation、stop、第二轮、名称、数量、历史入口；
- 不直接改其他页面。

GATT/Session：
- connect attempt、service、Read/Write/Notify、tuple、Registry、cleanup；
- 不把 Smart HID 逻辑塞进通用 Runtime。

广播：
- PAGE → useBroadcastSession → Platform Adapter → Payload Service；
- 31/32、owner、lifecycle；
- 不先修改 Observer 以掩盖 App 问题。

OTA：
- STATUS subscribe → CTRL start → ready → DATA → CTRL commit → success → reboot → version readback；
- abort、timeout、fail；
- 同步重写保护旧错误的测试；
- 客户端和固件必须分别在对应 FIX 中完成，不把两端大改塞进一个模糊提交。

版本/落地页：
- 由目标 Metadata 驱动；
- 无 Artifact 不显示链接；
- 不提前标 VERIFIED。

Smart HID：
- 遵循 canonical contract；
- Profile 专属 workflow；
- token/password 边界；
- owned/borrowed Session。

==================================================
五、验证顺序
==================================================

1. FIX 专项目标测试。
2. 相邻目标测试。
3. 现有相关回归。
4. 统一 target verify。
5. `scripts/verify-uniapp.sh` 或对应固件/文档门。
6. 必要构建 E3。
7. 页面 E4（如适用）。
8. `git diff --check`。

涉及硬件的：

- 自动化与构建通过后，状态最多 `AUTOMATED_PASS / HARDWARE_PENDING`；
- 不在 TP-G3 宣布 E5。

==================================================
六、更新差距和文档
==================================================

更新：

- reports/target-vs-current 对应记录；
- docs/gap-analysis 摘要；
- docs/remediation 对应 FIX 状态；
- 测试结果；
- 必要的 current-state 事实；
- 不修改 target-product，除非发现目标本身冲突，此时停止并走目标变更流程。

状态变化示例：

```text
AUTOMATED_FAIL
→ AUTOMATED_PASS
→ HARDWARE_PENDING
```

不得直接跳到 PASS，除非该项不需要 E5/E6。

==================================================
七、提交
==================================================

一个 FIX 一个聚焦提交或少量明确拆分提交。

提交信息包含模块，例如：

- fix(scan): ...
- fix(runtime): ...
- fix(broadcast): ...
- fix(ota): ...
- test(esp32): ...
- fix(profile): ...
- docs(site): ...

Commit Body 或报告必须列出：

- FIX ID；
- Target IDs；
- Test IDs；
- 自动化结果；
- Hardware pending 状态。

不得 push。

==================================================
八、退出条件
==================================================

FIX 只有以下成立才可标自动化完成：

- 目标失败测试已转 PASS；
- 相邻和全量回归无新增失败；
- 构建通过；
- 第一断点已消除；
- 清理路径有测试；
- Gap/Remediation 已更新；
- 工作区干净；
- 需要硬件时明确下一条 E5 Test ID。

==================================================
九、最终报告
==================================================

FIX:
STATUS:
TARGET IDS:
TEST IDS:
BASELINE:
FIRST BREAKPOINT BEFORE:
CHANGES:
FILES:
TESTS / EXIT CODES:
BUILD / EVIDENCE LEVEL:
HARDWARE:
GAP STATUS CHANGE:
COMMIT:
PUSHED: NO
NEXT:
- 下一个 FIX 由用户指定，或进入 TP-G4 对本 FIX 做硬件验证

没有真实运行的项目不得写 PASS。
```
