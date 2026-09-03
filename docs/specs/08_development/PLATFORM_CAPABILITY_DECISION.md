# PLATFORM_CAPABILITY_DECISION —— C1 / C3 平台能力裁决冻结

> 版本：1.0 · 裁决日期：2026-09-03（08-G0 工程实现基线纠偏轮，用户任务书正式下达）
> 裁决对象：[11_ecosystem/ALIGNMENT_NOTES](../11_ecosystem/ALIGNMENT_NOTES.md) §2 冲突清单中的 C1（微信 BLE 外围广播）与 C3（微信多设备会话）——自本文起由「待用户裁决」改为「**已裁决**」。
> 证据基础：旧代码实证（apps/uniapp，开发前冻结不改，作为实现证据与复用候选引用）+ 现行 canon（02_product / 10_platform）。**真机证据待补状态保留**：本裁决不声称已完成真机验证，真机验证矩阵在开发期补齐（登记制度，DEVELOPMENT_SCOPE §7）。
> 效力边界：**不改变产品范围**（F013/F014 原样保留）、不改变状态机、不改变 S1–S6 流程、不改变三零边界——本裁决只冻结 capability 口径、宿主行为边界与验证义务。

## 1. C1 微信 BLE 外围广播（对应 F014 · BLE-008）

| 项 | 裁决内容 |
|---|---|
| 产品范围 | **保留 F014**（广播发射·微信，P1 已实现档位不变） |
| capability | **supported_limited**（有限支持——按旧代码实证 △ 定档；生态矩阵 ❌ 为矩阵侧待修订口径） |
| 微信开发者工具 | **unsupported**——devtools 宿主外围服务不可用：真机调试横幅 + 检查支持→不支持 + 启动拦截，三处拦截在位（PLATFORM_ADAPTER_SPEC §3.1） |
| 微信真机 | **运行时探测后启用**——`wx.createBLEPeripheralServer` 建立成功才进入 ADVERTISING；探测/建立失败走 FAILED 与不支持指引，**不允许静默降级** |
| 后台广播 | **不承诺**——后台挂起即停广播（BR-06 前后台守则的微信表达；onUnload/离页停广播现状） |
| Android/iOS 微信宿主 | **分别进入真机验证矩阵**（登记待补，DEVELOPMENT_SCOPE §7 登记制度；PC 端微信维持 V-4【未知】不建模） |
| 静默降级 | **不允许**——能力缺失/探测失败必须显式「不支持 + 指引」（10_platform §7 三查②） |

依据链：ALIGNMENT_NOTES §2 C1 行（矩阵 ❌ vs 实证 △）→ 裁决按实证定档 supported_limited；矩阵侧建议其 v1.1 修订对齐（ALIGNMENT_NOTES §2 C5 附带建议，不阻塞本项目）。

## 2. C3 微信多设备会话（对应 F013 · BLE-003 多连接）

| 项 | 裁决内容 |
|---|---|
| 产品范围 | **保留 F013**（多设备会话管理·批量断开，P1 已实现档位不变） |
| capability | **supported_foreground**（前台支持——按旧代码实证 ✅ 定档） |
| 前台多 Session | **支持前台运行时多 Session**——并发连接去重、会话注册表 owner/borrow 所有权管理（STATE_MACHINE §1） |
| 后台保持 | **不承诺**——后台挂起即挂起全部会话（BR-06 微信表达；后台保连为 App 线候选，微信线不做） |
| 固定最大连接数 | **不承诺**——不写死 N 台上限；连接数上限由运行时平台错误反馈呈现，不预设常量 |
| 独立错误反馈 | **每个 Session 独立错误反馈**——批量断开 Promise.allSettled 部分失败清单弹窗（PAGE_SPEC §7；MODULE_ARCH §3 断开汇总，legacy 职责证据） |
| 唯一事实源 | **Session Registry 为唯一事实源**（③ 领域会话注册表；Store 已连接表为其对 UI 的唯一投影通道——RUNTIME_ARCHITECTURE v1.1 §3.1 同口径） |

依据链：ALIGNMENT_NOTES §2 C3 行（矩阵 ❌ vs 实证 ✅）→ 裁决按实证定档 supported_foreground。

## 3. 同步落点（2026-09-03 已完成）

| 文件 | 修改 |
|---|---|
| [11_ecosystem/ALIGNMENT_NOTES.md](../11_ecosystem/ALIGNMENT_NOTES.md) §2 | C1/C3 处置列 → 已裁决（引本文） |
| [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) §3 注 / §6 决策表 | 「待用户裁决」→ 已裁决；§6 新增 C1/C3 决策行 |
| [08_development/DEVELOPMENT_SCOPE.md](DEVELOPMENT_SCOPE.md) §6/§8 | C1/C3 行 → 已裁决 + capability 定档；冻结校验行同步 |
| [08_development/PLATFORM_ADAPTER_SPEC.md](PLATFORM_ADAPTER_SPEC.md) §3.3 / PZ-7 / §7 | C1/C3 → 已裁决（真机证据待补）；C4 维持待裁决 |
| [08_development/FEATURE_IMPLEMENTATION_MATRIX.md](FEATURE_IMPLEMENTATION_MATRIX.md) F006/F013/F014 行 + §8 | 待裁决表述 → 已裁决引用 |
| [08_development/API_ACTION_MATRIX.md](API_ACTION_MATRIX.md) §4 平台口径备注 | 「标待裁决不翻转」→ 已裁决定档 |
| [06_review/DEVELOPMENT_READINESS_FINAL.md](../06_review/DEVELOPMENT_READINESS_FINAL.md) §6/§9 | 生态待裁决行 / 条件 9 → 已裁决（真机证据待补） |
| 冻结快照（不回改） | `docs/specs/prototype/**`（原型层冻结，PZ-9）与 06_review 历史审计报告正文中的「待裁决」标注为**当时快照**，不回写；裁决后以本文为准 |

## 4. 未裁决项（维持原状，不受本文影响）

C2（iOS/macOS 外围能力待验证）、C4（自动重连两层语义口径差）、C5（矩阵无 Web 行）、C6（生态其他实现线）、C7（长连接——原判定一致项）维持 [ALIGNMENT_NOTES](../11_ecosystem/ALIGNMENT_NOTES.md) §2 原状态；C4 仍按 DEVELOPMENT_SCOPE §6 登记口径差（前台会话内重连 vs 后台保连），开发期收口。

## 5. 冻结校验

- ☑ 裁决字段逐字来自 08-G0 任务书；capability 定档与实证一致（△→supported_limited / ✅→supported_foreground），未翻转实证行为
- ☑ 真机证据待补保留（本文不声称已真机验证；Android/iOS 微信宿主进真机验证矩阵）
- ☑ 产品范围零变化（F013/F014 保留、优先级/状态不变）、状态机零改动、无新增功能
- ☑ 同步落点清单与实际修改一一对应（§3）；冻结快照（prototype / 历史审计）登记不回改
