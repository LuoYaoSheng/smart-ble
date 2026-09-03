# ENGINEERING_BASELINE_CORRECTION_REPORT —— 08-G0 工程实现基线纠偏与旧工程隔离冻结报告

> 第 16 份评审文件 · 2026-09-03 · **08-G0 执行报告（本轮修改的完整台账 + 静态核验结果）**
> 任务依据：用户 08-G0 任务书（工程实现基线纠偏与旧工程隔离冻结，十节）。
> 约束遵守：**只修改 docs/specs**；apps/、core/、prototype（docs/specs/prototype）、tests/ 零触碰；不新增产品功能、不改变 29 功能 / 9 页面 / S1–S6 流程；零后端 / 零登录 / 零本地持久化；本轮不创建实际应用代码、不执行 git commit/push（基线 `2b25725` 不变）。
> **⚠ 08-G0.1 方向纠偏声明（2026-09-03）**：本文 §1–§8 台账中「TARGET_APP_ROOT = `apps/uniapp-next`」「legacy-read-only 永久隔离」等表述为 **08-G0 当时快照，已于 08-G0.1 整体废弃**——现行口径见下方 §0 与 [IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT](IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT.md)：TARGET_APP_ROOT = 既有 `apps/uniapp` 原工程内重构，旧版本由 commit `2b25725` 保存。台账原文不回写（历史记录），阅读时以 §0 为准。

## 0. 08-G0.1 方向纠偏：由平行新建改为原工程内重构（2026-09-03 追记）

**前一版 `apps/uniapp-next` 方案已废弃。**本节为本文（08-G0 台账）的现行有效修订口径，与 [IMPLEMENTATION_TARGET](../08_development/IMPLEMENTATION_TARGET.md) v1.2 一致：

1. **废弃内容**：平行新建第二套 uni-app 工程（原 TARGET_APP_ROOT = `apps/uniapp-next`）、`apps/uniapp` 永久只读（legacy-read-only）隔离、新旧两套工程并行维护、「空工程脚手架设计」前置阶段——以上全部废止。
2. **现行口径**：Smart BLE 是**旧工程改版**，不是平行创建第二套 App——TARGET_APP_ROOT = 既有 `apps/uniapp`；开发门禁通过后在**专用 Git 开发分支**中于原路径直接重构；产品需求只以 docs/specs 为准；旧代码是**实现证据与复用候选**，不是产品需求事实源。
3. **基线保存**：旧版本由 Git 基线 commit **`2b25725`** 保存，不通过复制目录保存；应用身份、AppID、构建入口、发布入口与工程路径保持不变。
4. **旧代码复用策略**：现有模块先经 [LEGACY_REUSE_MATRIX](../08_development/LEGACY_REUSE_MATRIX.md) 逐项裁定（保留/包装/重构/重写/删除/待验证）——稳定 BLE Runtime、写队列、重连、协议、原生插件可经测试后复用；不默认全保留、不默认全重写、没有证据标【待验证】。
5. **两态口径替代永久只读**：pre-development freeze（门禁通过前 `apps/uniapp` 暂不修改）/ implementation target（门禁通过后原路径重构）。
6. **本文以下各节**为 08-G0 执行台账（历史记录）：其中 C1/C3 裁决、Runtime Ports & Adapters 目标模型、PRD 零持久化修正等结论**继续有效**；仅「平行新建 + 永久只读隔离」相关表述按本节废止。


## 1. 修改文件清单

### 1.1 新增（3 件）

| 文件 | 内容 |
|---|---|
| [08_development/IMPLEMENTATION_TARGET.md](../08_development/IMPLEMENTATION_TARGET.md) | 工程实现目录冻结与旧工程隔离：五常量（SPEC_ROOT / LEGACY_APP_ROOT=apps/uniapp / TARGET_APP_ROOT=apps/uniapp-next / SHARED_CORE_ROOT=core / PROTOTYPE_ROOT=docs/specs/prototype）+ 最高约束六条 + 隔离规则五条 + core 复用三口径 + 原型使用规则 |
| [08_development/PLATFORM_CAPABILITY_DECISION.md](../08_development/PLATFORM_CAPABILITY_DECISION.md) | C1/C3 裁决冻结（supported_limited / supported_foreground，真机证据待补）+ 同步落点清单 + 未裁决项维持 |
| [06_review/ENGINEERING_BASELINE_CORRECTION_REPORT.md](.) | 本报告 |

### 1.2 修改（12 件）

| 文件 | 版本 | 修改要点 |
|---|---|---|
| [08_development/RUNTIME_ARCHITECTURE.md](../08_development/RUNTIME_ARCHITECTURE.md) | v1.0 → **v1.1** | 依赖模型纠偏（详见 §2） |
| [08_development/PLATFORM_ADAPTER_SPEC.md](../08_development/PLATFORM_ADAPTER_SPEC.md) | v1.0 → **v1.1** | 开发落位 → TARGET_APP_ROOT；Adapter 接入 = implements BLE Platform Port（禁隐式双向依赖）；C1/C3 已裁决（PZ-7）；legacy 标注；冻结校验更新 |
| [08_development/FEATURE_IMPLEMENTATION_MATRIX.md](../08_development/FEATURE_IMPLEMENTATION_MATRIX.md) | v2.0 → **v2.1** | 新增 §0.4 目标模块职责映射（旧文件名=legacy reference，不复制旧目录数量）；F006/F013/F014 与 §8 的 C1/C3 表述更新；**功能/页面/动作/验收编号零改动** |
| [08_development/DEVELOPMENT_SCOPE.md](../08_development/DEVELOPMENT_SCOPE.md) | §6/§8 | C1/C3 行 → 已裁决 + capability 定档；冲突处置总则与冻结校验同步 |
| [08_development/API_ACTION_MATRIX.md](../08_development/API_ACTION_MATRIX.md) | §3.7 备注 | 平台口径备注：「标待裁决不翻转」→ 已裁决定档（最小修改） |
| [11_ecosystem/ALIGNMENT_NOTES.md](../11_ecosystem/ALIGNMENT_NOTES.md) | §2 | C1/C3 处置列 → 已裁决（引裁决正文）+ §2 表后裁决状态注 |
| [11_ecosystem/README.md](../11_ecosystem/README.md) | 定位表 | 冲突处置行补 C1/C3 已裁决注记 |
| [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) | §3 注 / §6 | 「待用户裁决」→ 已裁决；§6 决策表新增 C1/C3 两行 |
| [02_product/PRD.md](../02_product/PRD.md) | §1.3/§1.4 + 变更记录 | 零持久化残句修正（详见 §5）；新增变更记录行登记本轮口径澄清 |
| [06_review/DEVELOPMENT_READINESS_FINAL.md](DEVELOPMENT_READINESS_FINAL.md) | v1.0 → 修订 | 准入拆分两轨（详见 §6）；A-06 处置修正（详见 §7）；§6/§9 C1/C3 已裁决；§7 开发契约口径更新 |
| [specs/README.md](../README.md) | 头注/路线/目录表/职责表/决策记录 | 详见 §8 |
| [06_review/QR_ERROR_STATE_FIX_REPORT.md](QR_ERROR_STATE_FIX_REPORT.md) · [07_design_system/TOKEN.md](../07_design_system/TOKEN.md) · [07_design_system/COMPONENT.md](../07_design_system/COMPONENT.md) | 链接 | 历史断链机械修复（6 处路径多退一级，零内容变更，见 §8.3 核验 7） |
| [04_architecture/SYSTEM_ARCH.md](../04_architecture/SYSTEM_ARCH.md) · [04_architecture/MODULE_ARCH.md](../04_architecture/MODULE_ARCH.md) | 头注 | 各加一条口径声明横幅：本文为旧工程（legacy-read-only）实证、新工程目标以 RUNTIME_ARCHITECTURE v1.1 为准——防止旧依赖链被误读为目标架构（正文零改动，历史描述不回写） |

## 2. Runtime 依赖模型纠偏（RUNTIME_ARCHITECTURE v1.1）

- **原问题**：v1.0 §0.2 将旧工程实证链 `pages → composables → store → services → core → 平台 API`（SYSTEM_ARCH §2 规则 1 / MODULE_ARCH §2）写成新工程依赖铁律——含 `store → services` 旧 import 方向与「services → core → 平台 API」平台链；旧工程形态被自动升级为新工程架构事实，违反 08-G0 最高约束第 3 条。
- **修改依据**：08-G0 任务书第三节 + IMPLEMENTATION_TARGET §1。
- **新口径**：Ports & Adapters——Presentation → Application/State → Domain Service → **BLE Platform Port**（领域自有抽象）；Domain Service → **Shared Core**（纯逻辑依赖）；**WeChatAdapter / AndroidAdapter implements BLE Platform Port** → System BLE Framework；组装根唯一注入点；禁隐式双向依赖。命令流 / 事件流双通道成典（§2.1/§2.2），扫描与连接两例逐跳重接。五条依赖禁令落表（§0.4：Service import Store / Store↔Service 双向 / Core 调 Adapter / Page·Component 调平台 API / Adapter 改状态机）。
- **分类表（§0.3，不得混写）**：Application 编排角色 / Pinia State 载体 / 六域服务职责 / 平台调用只在 Adapter / Shared Core 纯逻辑 = **已采纳目标决定**；composables×4 / Store×2 / services×6（16/5/11/6/3/13）/ 4 个平台收敛文件 / 旧依赖链 = **legacy reference only**。
- Port 方法与事件清单以未来 API_SPEC.md 定稿为准（现口径 API_UNIFIED_SPEC §3–§13 + API_ACTION_MATRIX §4），本文未新造 API。

## 3. 旧工程隔离规则（IMPLEMENTATION_TARGET，冻结）

`apps/uniapp` = **legacy-read-only**；`apps/uniapp-next` = D1 新工程**唯一写入目录**；新工程**不得 import** 旧工程任何文件；**不得以复制旧页面/旧 Service 作为需求来源**（需求源 = docs/specs 正典）；旧文件数量与文件名仅为参考（不构成新架构强约束）；core/ 复用必须先过契约测试、允许纯协议/framing/logger 等跨端资产、禁反向依赖 apps；prototype 只作交互视觉基准不作运行时代码复制源。

## 4. C1 / C3 裁决结果（PLATFORM_CAPABILITY_DECISION）

| # | 裁决 | 要点 |
|---|---|---|
| C1 微信 BLE 外围广播 | **supported_limited** | 保留 F014；开发者工具 unsupported（三处拦截）；微信真机**运行时探测后启用**；后台广播不承诺；Android/iOS 微信宿主分别进入真机验证矩阵；不允许静默降级 |
| C3 微信多设备会话 | **supported_foreground** | 保留 F013；支持前台运行时多 Session；不承诺后台保持；不承诺固定最大连接数；每 Session 独立错误反馈；**Session Registry 为唯一事实源** |

两项均**真机证据待补**（裁决基于旧代码实证 + 现行 canon，不声称已真机验证）；实证行为不翻转；矩阵侧 ❌ 为待其 v1.1 修订口径。同步落点：ALIGNMENT_NOTES §2、11_ecosystem/README、10_platform §3/§6、DEVELOPMENT_SCOPE §6、PLATFORM_ADAPTER_SPEC §3.3/PZ-7、FEATURE_IMPLEMENTATION_MATRIX F006/F013/F014/§8、API_ACTION_MATRIX §3.7 备注、DEVELOPMENT_READINESS_FINAL §6/§9（同步清单见裁决文 §3）。**冻结快照不回改**：docs/specs/prototype/**（原型冻结）与 06_review 两份历史审计正文（PAGE_CAPABILITY_COVERAGE_AUDIT / HTML_DEVELOPMENT_READINESS_AUDIT）中的「待裁决」为当时快照，以本裁决为准。C2/C4/C5/C6/C7 维持原状态。

## 5. PRD 零持久化残句修正

- **原问题**：§1.3「不做云同步 / 远程设备管理（**设备历史仅本机非敏感记录**）」与 §1.4 核心价值 5「……**本地历史只存非敏感字段**」——与 2026-09-02 零本地持久化决策（F023/PAGE004/known_devices 移除）冲突的残句。
- **修正后统一口径**：无设备历史业务；会话、配网快照与日志仅运行时内存；应用冷启动即空；F023/PAGE004 不得复刻。
- **边界**：只改这两句 + 变更记录登记一行；其余产品内容零改动。

## 6. 最终准入：新旧状态对照（DEVELOPMENT_READINESS_FINAL）

| 维度 | 旧（v1.0，2026-09-03 上午） | 新（08-G0 修订） |
|---|---|---|
| 准入结论 | 「D1 开发准入放行 ✅ 条件满足」（单一判定） | **两轨**：Product & Prototype Readiness = **PASS**；Engineering Contract Readiness = **CONDITIONAL PASS** |
| 08_development | 「七件套已冻结」 | 映射与边界文档已完成（七件 + 08-G0 三件）；**API_SPEC / DATA_MODEL / ERROR_CODE / PERMISSION 四件未生成** |
| 功能实现门槛 | 未单列 | **四件套完成前仅可开始空工程脚手架设计，不得开始功能实现** |
| 09_test 真实点击基线 | 强烈建议（非阻塞） | **功能迁移前必须固化**（升级为前置条件；待 09_test 修改放行） |
| C1/C3 | ⏳ 待用户裁决 | ✅ 已裁决（真机证据待补） |
| A-06 | 「①mock 级 + ②需产品澄清」双待办 | 产品口径澄清**已由 DEVICE_PROFILE_RULE DR-3/§5 关闭**；仅保留 mock 演示数据缺陷（mock 级） |

## 7. 静态核验结果（§九 全项）

| # | 核验项 | 结果 |
|---|---|---|
| 1 | git diff 只出现 docs/specs 下文件 | ✅ **PASS**——`git status --porcelain` 全部条目位于 docs/specs；tracked 修改 = README/PRD/PLATFORM_EXTENSION/ALIGNMENT_NOTES（本轮）+ docs/specs/prototype/**（**本轮之前会话已存在的原型改动，本轮零触碰**，见 §8.1 说明）；根目录 apps/、core/、tests/ 无任何条目 |
| 2 | apps/、core/、prototype/、tests/ 零变更（本轮） | ✅ **PASS**——本轮未修改其中任何文件；docs/specs/prototype 的既有改动为本任务开始前状态（任务起始即已 dirty，清单快照比对一致） |
| 3 | 08_development 中 `apps/uniapp` 仅出现在 legacy/read-only/reference 语境 | ✅ **PASS**——grep 全部 9 处逐一核对：IMPLEMENTATION_TARGET（legacy-read-only 定义）、PLATFORM_CAPABILITY_DECISION（legacy-read-only 参考）、RUNTIME_ARCHITECTURE（legacy reference 标注）、PLATFORM_ADAPTER_SPEC（legacy reference 标注），无一处作为新工程落位 |
| 4 | 不再存在「C1/C3 待用户裁决」 | ✅ **PASS（口径登记）**——正典（08/10/11、README、readiness）中 C1/C3 全部为「已裁决」；残留「待用户裁决」字样仅为裁决过渡描述（「由待用户裁决改为已裁决」）；**冻结快照例外**：docs/specs/prototype/**（4 处，任务约束不得修改原型）与 06_review 两份历史审计正文（历史记录不回写）保留裁决前快照，以 PLATFORM_CAPABILITY_DECISION 为准 |
| 5 | PRD 不再存在「本地历史只存」/「设备历史仅本机」 | ✅ **PASS**——§1.3/§1.4 正文已消除；唯一残留位于变更记录行（对被修正残句的引文，历史记录性质） |
| 6 | DEVELOPMENT_READINESS_FINAL 不再声称完整工程契约已全部冻结 | ✅ **PASS**——§0 明文「完整工程契约未全部冻结」+ 四件套 ⏳ 未生成 + CONDITIONAL PASS |
| 7 | 所有 Markdown 相对链接有效 | ✅ **PASS（1 项冻结例外登记）**——80 文件 341 相对链接全检：本轮修复历史断链 6 处（QR 报告 3 + TOKEN/COMPONENT 3，路径多退一级，零内容变更）；**冻结例外 1 处**：prototype/platform/README.md → ../../../10_platform/PLATFORM_EXTENSION.md（正确为 ../../，但原型冻结不得修改，登记待原型层下次解冻轮修复） |
| 8 | 不提交、不推送 | ✅ **PASS**——HEAD 仍为 `2b257254fafe…`（= 2b25725），零 commit 零 push |

## 8. 补充说明

### 8.1 工作区既有脏区（非本轮产生）

任务开始时 docs/specs/prototype/**（44 文件 M）与 06_review/08_development 未跟踪文件即已存在（此前会话的原型修正轮与开发冻结轮产物，均未提交）。本轮零触碰 prototype；本报告 §7 核验 1/2 的「零变更」均指**本轮任务**未引入上述目录的任何新改动。

### 8.2 与正典的一致性

本轮全部修改不新增功能、不改 29 功能 / 9 页面 / S1–S6 / 状态机 / 数据模型语义；FEATURE_IMPLEMENTATION_MATRIX 的功能卡片 12 字段映射内容与 R/ACT 编号逐字未动（仅新增 §0.4 与 C1/C3 表述替换）；PLATFORM_ADAPTER_SPEC 的差异圈（10_platform §4 七行）与 PZ-1～PZ-9 框架未变（PZ-7 由「待裁决不翻转」改「裁决执行与未决不翻转」）。

### 8.3 下一阶段缺口（进入功能实现前必须补齐）

| # | 缺口 | 说明 |
|---|---|---|
| 1 | **API_SPEC.md** | 方法与事件契约（BLE Platform Port 方法/事件清单 + BLE.\* 枚举映射表定稿）——API_ACTION_MATRIX 为页面动作映射，**不得互相替代** |
| 2 | **DATA_MODEL.md** | 实体契约独立成文（现以 02_product/DATA_MODEL 为正典，08 侧需工程视角落位） |
| 3 | **ERROR_CODE.md** | 三级映射（平台原生错误 → BLE_001～008 → 业务错误码/用户文案） |
| 4 | **PERMISSION.md** | 权限矩阵（微信授权 / Android 运行时权限 × 页面动作） |
| 5 | **09_test 真实点击基线** | F020 四结果 / P005 两路径+错误回路 / P006 三路径会话 / 空态组——断言必须经真实用户动作触发（功能迁移前置条件，待 09_test 修改放行） |

四件套完成前：仅可开始空工程脚手架设计（apps/uniapp-next 目录骨架 / 构建配置 / Port 接口草案）；不得开始功能实现。**（⚠ 08-G0.1 已废止本句前置口径：四件套已于 08-G1 生成，且不存在「空工程脚手架」阶段——现行前置 = LEGACY_REUSE_MATRIX 裁定 + 四件套按原工程内重构口径完善 + 09_test 真实点击基线，齐备后在 apps/uniapp 原路径开始改版，见 §0。）**

—— 08-G0 执行完毕。执行人：ZCode（工程实现基线纠偏与旧工程隔离冻结）。本报告为 06_review 第 16 份评审文件。
