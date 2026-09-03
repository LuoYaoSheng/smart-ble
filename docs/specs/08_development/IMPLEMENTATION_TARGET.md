# IMPLEMENTATION_TARGET —— 工程实现目标冻结：原工程内重构改版（08-G0 / 08-G0.1）

> 版本：1.2（08-G0.1 方向纠偏）· 生成日期：2026-09-03（v1.0，08-G0）；修订 2026-09-03（v1.1，08-G1）；修订 2026-09-03（v1.2，08-G0.1 由平行新建改为原工程内重构）
> **v1.2 修订记录（08-G0.1）**：① **方向纠偏**——废弃 v1.0/v1.1 的「平行新建第二套工程」方案（原 TARGET_APP_ROOT = `apps/uniapp-next`），改为**原工程内重构改版**：TARGET_APP_ROOT = `apps/uniapp`，门禁通过后在专用 Git 开发分支中于原路径直接重构；② **删除 LEGACY_APP_ROOT 常量与全部 legacy-read-only 永久隔离表述**——`apps/uniapp` 不再被标记为「永久只读」，改为两态口径：**pre-development freeze（开发前暂不修改）** 与 **implementation target（门禁通过后原路径重构）**；③ **新增 BASELINE_COMMIT 常量**——旧版本由 Git 基线 commit `2b25725` 保存，不通过复制目录保存；④ 新增旧代码复用矩阵引用（[LEGACY_REUSE_MATRIX](LEGACY_REUSE_MATRIX.md)）：现有模块先经复用矩阵决定 保留 / 包装 / 重构 / 重写 / 删除 / 待验证，不默认全保留、不默认全重写。
> 性质：**不新增产品功能、不改变 29 功能 / 9 页面 / S1–S6 流程；零后端、零登录、零本地持久化；本轮不创建实际应用代码、不执行 git commit/push、不创建 `apps/uniapp-next`**。本文只冻结「改版实施到哪里、旧版本如何保存、旧代码如何复用、共享资产与原型如何使用」，不产生任何产品正文。
> 输入：[specs/README](../README.md)（平台开发总纲 L1–L4）· [RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.3（目标依赖模型）· [PLATFORM_ADAPTER_SPEC](PLATFORM_ADAPTER_SPEC.md) v1.3（分层契约）· [DEVELOPMENT_SCOPE](DEVELOPMENT_SCOPE.md)（D1–D3 范围）· [LEGACY_REUSE_MATRIX](LEGACY_REUSE_MATRIX.md)（旧代码复用矩阵，08-G0.1 新增）· [04_architecture/MODULE_ARCH](../04_architecture/MODULE_ARCH.md)（旧工程实证，legacy reference）

## 0. 冻结的目录常量（v1.2）

| 常量 | 值 | 冻结状态 |
|---|---|---|
| BASELINE_COMMIT | `2b25725` | **旧实现基线**——旧版本由该 Git commit 保存，不通过复制目录保存；改版在专用开发分支上进行，主干历史可随时回溯 |
| PRODUCT_SOURCE | `docs/specs` | **唯一产品事实源**（产品/流程/架构/开发契约/平台/生态正典全部在此）；旧代码不是产品需求事实源 |
| TARGET_APP_ROOT | `apps/uniapp` | **改版实施目录**——工程开发门禁通过后，在专用 Git 开发分支中于此原路径直接重构改版（见 §2） |
| PROTOTYPE_SOURCE | `docs/specs/prototype` | 交互与视觉基准（非运行时代码复制源，见 §4） |
| SHARED_CORE_ROOT | `core` | 跨端共享资产（复用须先过契约测试，见 §3） |

**v1.2 明确不做（废弃与禁止事项）**：

- **不创建 `apps/uniapp-next`**——「平行新建第二套工程」方案已废弃（08-G0.1）。
- **不新增第二套 manifest / project.config / AppID**——应用身份、AppID、构建入口、发布入口与工程路径保持不变。
- **不维护两套 uni-app 工程**——新旧并行的双工程维护形态禁止出现。
- **Git 基线承担旧版本保存职责**——不通过复制目录（如 `apps/uniapp-old` 备份目录）保存旧版本。
- **不再使用 LEGACY_APP_ROOT 常量与 legacy-read-only（永久只读）表述**——历史文档中的该表述以本文 v1.2 为准（历史台账见 [06_review](../06_review/) 各报告，不回写）。

## 1. 最高约束（本文全部规则的上位，08-G0.1 任务书口径）

1. 在文档、原型和开发契约阶段，`apps/uniapp` 暂不修改（pre-development freeze）。
2. 工程开发门禁通过后，在专用 Git 开发分支中直接重构 `apps/uniapp`（implementation target）。
3. 旧版本由 commit `2b25725` 保存，不通过复制目录保存。
4. 应用身份、AppID、构建入口、发布入口与工程路径保持不变。
5. 产品需求只以 `docs/specs` 为准（PRODUCT_SOURCE）。
6. 旧代码可以作为实现证据和复用候选，但不是产品需求事实源。

## 2. 改版实施规则（TARGET_APP_ROOT = apps/uniapp）

1. **两态口径（替代旧版 legacy-read-only 永久隔离）**：
   - **pre-development freeze（开发前冻结）**：工程开发门禁（[DEVELOPMENT_READINESS_FINAL](../06_review/DEVELOPMENT_READINESS_FINAL.md) §0）通过前，任何任务不得在 `apps/uniapp` 内新增 / 修改 / 删除文件（含配置、资源、注释性改动）——旧代码此时的角色是**实现证据与复用候选**。
   - **implementation target（改版实施）**：门禁通过后，在**专用 Git 开发分支**中对 `apps/uniapp` 原路径直接重构改版；`main`/基线 `2b25725` 不动，改版成果经分支评审合入。
2. **Ports & Adapters 是原工程重构目标，不是从零重写指令**——[RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.3 与 [PLATFORM_ADAPTER_SPEC](PLATFORM_ADAPTER_SPEC.md) v1.3 描述的是 `apps/uniapp` 重构后的目标形态；达到该形态的路径是「逐模块评估 + 渐进迁移」，不是「新建空工程重抄一遍」。
3. **现有模块先经复用矩阵决定处置**——每个旧模块按 [LEGACY_REUSE_MATRIX](LEGACY_REUSE_MATRIX.md) 逐项裁定：**保留（retain）/ 包装（wrap）/ 重构（refactor）/ 重写（rewrite）/ 删除（remove）/ 待验证**；没有验证证据的一律标【待验证】，不得凭印象处置。
4. **不要求新工程复制旧文件数量，也不要求全部旧模块重写**——旧文件数、文件名与目录形态仅为 legacy reference（[MODULE_ARCH](../04_architecture/MODULE_ARCH.md) §1）；重构后的模块组织以 [RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.3 §0.3「目标架构决定」为准。
5. **稳定资产优先复用**——稳定 BLE Runtime（会话注册表、写队列、重连管理、GATT 编解码）、协议镜像（core/protocols）、framing、logger、command-queue、原生插件（nativeplugins/LysBlePeripheral）等**可以经测试后复用**，不以「新架构」为由推倒重写。
6. **页面、状态、平台边界按目标规范逐步重构**——页面层对齐 prototype（PROTOTYPE_SOURCE）与 07_design_system；状态层对齐 RUNTIME_ARCHITECTURE v1.3 事件模型与四件套契约；平台调用收敛进 Adapter（PlatformPortBundle 实现），Base Core 清零直调平台 API。
7. **单实现线纪律**——`apps/uniapp` 是唯一 uni-app D1 实现线；不得新增 `apps/uniapp-*` 第二套 uni-app 工程目录（v1.1 第三实现线禁令收窄口径维持，只是「新建平行工程」本身已整体废弃）。新增其他语言或平台实现线仍按仓库既有 `apps/{android,ios,flutter,desktop}` 治理，但必须遵守平台范围决策（[10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) §5/§6 D1–D3 与 [PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md)）。
8. **不得以旧实现为需求来源**——需求来源只有 docs/specs 正典（02_product / 03_flow / 04_architecture / 08_development / 10_platform / 11_ecosystem）；旧文件只允许以「实现证据 / legacy reference / 复用候选」身份被引用（如 MODULE_ARCH §3 服务职责表、API_ACTION_MATRIX §4 wx.\* 实证列）。旧实现与正典冲突时，以正典为准并按复用矩阵走「重构/重写」处置。

## 3. 共享核心复用规则（SHARED_CORE_ROOT = core）

- **core/ 是否复用必须经过契约测试**：引入前先以 `core/protocols/smart-hid-contract.lock.json`（协议受锁镜像）与 04_architecture 正典跑契约一致性校验，通过方可进入 TARGET_APP_ROOT 重构后代码的依赖；未过契约测试不得引入（对应 [RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.3 §6 Shared Core 行：契约测试为该层测试边界）。core/ 本身零改动即可被复用（在 core/ 已有测试通过的前提下）。
- **允许复用**纯协议、framing、logger、command-queue 等跨端资产（SYSTEM_ARCH §2 规则 4：core 改动须走契约流程；MODULE_ARCH §1 core/ 结构）。
- **不得让 core 反向依赖 apps**：core/ 不依赖 `apps/uniapp`（MODULE_ARCH §2 原文）——core 在目标架构中为 Shared Core（纯逻辑，零下游依赖，RUNTIME_ARCHITECTURE v1.3 §1.5）。
- core/components 为 Electron 端 Web Components 同名双实现，**非小程序复用，禁止误 import**（MODULE_ARCH §4）。

## 4. 原型使用规则（PROTOTYPE_SOURCE = docs/specs/prototype）

- prototype 只作为**交互和视觉基准**（specs/README 总纲 L4：平台 UI 对照基准原型验收），**不作为运行时代码复制源**——不得从原型 HTML/JS 中复制逻辑代码进入 TARGET_APP_ROOT。
- 原型 mock-data 仅为演示脚手架；替换为真实实现时页面 / 组件 / Store 契约不变（PLATFORM_ADAPTER_SPEC §1 数据流行）。
- 原型层冻结不改（PZ-9）：其中的历史标注（含 C1/C3 裁决前的「待裁决」快照）不回写，裁决后正典以 [PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md) 为准。

## 5. 与既有正典的关系

- 本文不产生第二正文：分层与依赖模型 = [RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.3；Base Core × Adapter 职责二分 = [PLATFORM_ADAPTER_SPEC](PLATFORM_ADAPTER_SPEC.md) v1.3；旧代码逐项处置 = [LEGACY_REUSE_MATRIX](LEGACY_REUSE_MATRIX.md)；开发范围与负面清单 = [DEVELOPMENT_SCOPE](DEVELOPMENT_SCOPE.md)；本文只补「改版落位、基线保存与复用纪律」这一维。
- 冲突时以被引文档为准；本文与 04_architecture 对旧工程的描述（SYSTEM_ARCH / MODULE_ARCH）冲突时，**旧工程描述视为 legacy reference，目标口径以 08_development 本文 + RUNTIME_ARCHITECTURE v1.3 为准**。
- 历史台账（06_review 各报告）中 v1.2 之前的「apps/uniapp-next / legacy-read-only」表述为当时快照，以本文 v1.2 为准（台账不回写，见 [IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT](../06_review/IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT.md)）。

## 6. 冻结校验（v1.2）

- ☑ 五常量与 08-G0.1 任务书逐字一致（BASELINE_COMMIT `2b25725` / PRODUCT_SOURCE docs/specs / TARGET_APP_ROOT apps/uniapp / PROTOTYPE_SOURCE docs/specs/prototype / SHARED_CORE_ROOT core）
- ☑ 不创建 `apps/uniapp-next`、不新增第二套 manifest/project.config/AppID、不维护两套 uni-app 工程（§0）
- ☑ 旧版本保存 = Git 基线 `2b25725`，非目录复制（§0/§1 规则 3）
- ☑ 两态口径替代永久只读：pre-development freeze（§2 规则 1a）/ implementation target 原路径重构（§2 规则 1b）；全文无「legacy-read-only / 永久只读」表述
- ☑ Ports & Adapters = 重构目标非重写指令；复用矩阵四+二处置（保留/包装/重构/重写/删除/待验证）前置（§2 规则 2/3）
- ☑ 稳定资产（BLE Runtime / 写队列 / 重连 / 协议 / 原生插件）经测试后可复用；页面/状态/平台边界逐步重构（§2 规则 5/6）
- ☑ core 复用三口径维持：契约测试前置 / 允许清单（纯协议·framing·logger 等）/ 禁反向依赖 apps（§3）
- ☑ prototype 只作基准不作代码源（§4），与 specs/README L4 一致
- ☑ 未新增功能、未改 29 功能 / 9 页面 / S1–S6、未创建应用代码、未创建 apps/uniapp-next、未提交 git（§1）
