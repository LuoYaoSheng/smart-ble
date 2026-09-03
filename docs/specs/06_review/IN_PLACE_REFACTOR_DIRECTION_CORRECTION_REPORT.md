# IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT —— 08-G0.1 方向纠偏执行报告：由平行新建改为原工程内重构

> 第 18 份评审文件 · 2026-09-03 · **08-G0.1 执行报告（本轮修改的完整台账 + 静态核验结果）**
> 任务依据：用户 08-G0.1 任务书（将「平行新建工程」纠正为「原工程内重构改版」，八节）。
> 约束遵守：**只修改 docs/specs**（不含 docs/specs/prototype）；`apps/**`、`core/**`、`tests/**` 零触碰；不创建 `apps/uniapp-next`；不新增功能、页面、流程、状态；不执行 git commit/push（基线 `2b25725` 不变）。

## 1. 为什么「平行新建」方案被废弃

08-G0 冻结的 `TARGET_APP_ROOT = apps/uniapp-next`（平行新建第二套 uni-app 工程 + 旧工程永久只读隔离）方案存在以下问题，经用户 08-G0.1 任务书正式废弃：

1. **与项目本质不符**：Smart BLE 是旧工程改版，不是创建第二个 App——产品事实源已是 docs/specs（PRODUCT_SOURCE），改版的全部价值在于把既有 `apps/uniapp` 迁到目标规范，而非另起炉灶。
2. **双工程维护成本**：平行新工程意味着新旧两套 uni-app 并行维护、两套 manifest/project.config/AppID、构建与发布入口分叉——应用身份与发布链路被无谓放大。
3. **旧版本保存方式错误**：以「旧工程只读 + 新工程另建」保存旧版本，实质是用目录复制承担版本管理职责——这正 是 Git 基线（commit `2b25725`）应该做的事。
4. **诱导向「从零重写」**：空工程唯一写入目录的形态，容易把 Ports & Adapters 目标模型误读为从零重写指令，丢弃已验证的稳定资产（BLE Runtime、写队列、重连、协议镜像、原生插件及其测试网）。

## 2. 原工程内重构的最终口径

- **五常量重冻结**（[IMPLEMENTATION_TARGET](../08_development/IMPLEMENTATION_TARGET.md) v1.2 §0）：

| 常量 | 值 |
|---|---|
| BASELINE_COMMIT | `2b25725` |
| PRODUCT_SOURCE | `docs/specs` |
| TARGET_APP_ROOT | `apps/uniapp` |
| PROTOTYPE_SOURCE | `docs/specs/prototype` |
| SHARED_CORE_ROOT | `core` |

- **两态口径**（替代 legacy-read-only 永久隔离）：pre-development freeze（文档、原型和开发契约阶段 `apps/uniapp` 暂不修改）→ implementation target（工程开发门禁通过后，在专用 Git 开发分支中对 `apps/uniapp` 原路径直接重构改版）。
- **不变项**：应用身份、AppID、构建入口、发布入口与工程路径保持不变；不创建平行新工程目录；不新增第二套 manifest/project.config/AppID；不维护两套 uni-app 工程。
- **Ports & Adapters 定位纠正**：RUNTIME_ARCHITECTURE v1.3 / PLATFORM_ADAPTER_SPEC v1.3 描述的是旧工程**重构后的目标形态**——达到路径是逐模块评估 + 渐进迁移，不是新建空工程重抄。

## 3. 基线保存方式

旧版本由 **Git 基线 commit `2b25725`** 保存：改版在专用开发分支进行，主干历史可随时回溯与比对；不通过复制目录（备份目录形态）保存。本轮（及历轮 docs/specs 修改）继续暂缓提交，HEAD 仍为 `2b25725`。

## 4. 旧代码复用策略

新增 [08_development/LEGACY_REUSE_MATRIX.md](../08_development/LEGACY_REUSE_MATRIX.md)（v1.0 框架 + 初判），覆盖 22+ 模块项（manifest/project.config、pages、components、composables、store、ble-runtime、session-registry、scan-permission、provisioning、smart-hid、broadcast、ota、core/protocols、framing、logger、command-queue、nativeplugins/LysBlePeripheral、tests、static assets、locale、死依赖/死配置等），每项含八字段（旧路径/当前职责/已有验证证据/与新规范的一致性/处理决定/目标落位/迁移风险/所需测试）。核心策略：

- **不默认全保留、不默认全重写、没有证据标【待验证】、不新增功能**。
- 稳定资产（BLE Runtime、写队列、重连、协议、原生插件）经测试后**保留/包装**复用；页面、状态、平台边界按目标规范**逐步重构**；P004 残页、known-devices、@deprecated 导航、未接线 locale、空骨架 src/、无引用 ble-utils 等**删除**（二次复核后执行）。
- 初判统计与待验证清单见矩阵 §9。

## 5. 修改文件清单

### 5.1 新增（2 件）

| 文件 | 内容 |
|---|---|
| [08_development/LEGACY_REUSE_MATRIX.md](../08_development/LEGACY_REUSE_MATRIX.md) | 旧代码逐模块复用矩阵（框架 + 初判，八字段 ×22+ 项 + 汇总） |
| [06_review/IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT.md](.) | 本报告 |

### 5.2 修改（13 件）

| 文件 | 版本 | 修改要点 |
|---|---|---|
| [08_development/IMPLEMENTATION_TARGET.md](../08_development/IMPLEMENTATION_TARGET.md) | v1.1 → **v1.2**（重写） | 五常量重冻结（+BASELINE_COMMIT/PRODUCT_SOURCE/PROTOTYPE_SOURCE；TARGET_APP_ROOT=apps/uniapp；删 LEGACY_APP_ROOT）；两态口径替代永久只读；改版实施规则八条（Ports & Adapters=重构目标、复用矩阵前置、稳定资产复用、单实现线纪律）；明确不创建平行新工程 |
| [08_development/RUNTIME_ARCHITECTURE.md](../08_development/RUNTIME_ARCHITECTURE.md) | v1.2 → **v1.3** | 头注用途改为「apps/uniapp 重构目标」；§0.2/§0.3/§0.4/§2/§1.5 等正文「新工程」口径改「重构后/目标架构」；core 禁令措辞去平行目录；冻结校验更新 |
| [08_development/PLATFORM_ADAPTER_SPEC.md](../08_development/PLATFORM_ADAPTER_SPEC.md) | v1.2 → **v1.3** | §0 分层表目标落位 = apps/uniapp；Adapter 层/Service 行/core 行措辞切换；v1.1 历史注记标废弃；冻结校验更新 |
| [08_development/FEATURE_IMPLEMENTATION_MATRIX.md](../08_development/FEATURE_IMPLEMENTATION_MATRIX.md) | v2.2 → **v2.3** | §0.4 编制口径：目标工程=apps/uniapp 原工程内重构、处置引 LEGACY_REUSE_MATRIX；v2.1 历史注记标废弃 |
| [08_development/API_SPEC.md](../08_development/API_SPEC.md) | v1.0 → **v1.1** | 头注：契约主体=改版目标工程（apps/uniapp）；契约本体零改动 |
| [08_development/DATA_MODEL.md](../08_development/DATA_MODEL.md) | v1.0 → **v1.1** | 标题「新工程」→「运行时」；定位行落位改 apps/uniapp；类型契约本体零改动 |
| [08_development/PLATFORM_CAPABILITY_DECISION.md](../08_development/PLATFORM_CAPABILITY_DECISION.md) | 头注 | 证据基础措辞：legacy-read-only 参考 → 开发前冻结不改（实现证据与复用候选） |
| [04_architecture/SYSTEM_ARCH.md](../04_architecture/SYSTEM_ARCH.md) | 头注横幅 | 口径声明改为「开发前冻结不改 + 重构基线与复用评估证据」；目标架构引用升 v1.3 |
| [04_architecture/MODULE_ARCH.md](../04_architecture/MODULE_ARCH.md) | 头注横幅 | 同上 + 指向 LEGACY_REUSE_MATRIX（职责表=复用评估证据） |
| [06_review/DEVELOPMENT_READINESS_FINAL.md](DEVELOPMENT_READINESS_FINAL.md) | 修订（08-G0.1 追记） | §0：三轨 + **Implementation Target 行**（existing apps/uniapp in-place refactor）；Engineering Contract Readiness 回落 **CONDITIONAL PASS**（待复用矩阵裁定 + 四件套完善）；「四件套与真实点击测试完成后允许在 apps/uniapp 开始改版」；旧版本由 2b25725 保留；§5 A-06/§7 开发契约/§9 条件 6b/6c/7 与最终判定同步；全文不再出现平行新工程口径 |
| [06_review/ENGINEERING_BASELINE_CORRECTION_REPORT.md](ENGINEERING_BASELINE_CORRECTION_REPORT.md) | 追记 | 新增 **§0「08-G0.1 方向纠偏：由平行新建改为原工程内重构」**（声明前一版 apps/uniapp-next 方案已废弃）+ 头注意读声明 + §8.3 前置口径废止追记；台账原文不回写 |
| [06_review/ENGINEERING_CONTRACT_FOUR_PACK_REPORT.md](ENGINEERING_CONTRACT_FOUR_PACK_REPORT.md) | 追记 | 头注「08-G0.1 后读法」：TARGET_APP_ROOT 指向与 Engineering PASS 为当时快照，现行以 v1.2 口径为准；台账原文不回写 |
| [specs/README.md](../README.md) | 头注/路线/目录表/职责表/决策记录 | 头注改「apps/uniapp 旧工程改版 + docs/specs 产品事实源」；08_development 行升十五件（+LEGACY_REUSE_MATRIX，版本全量刷新）与 CONDITIONAL 状态；职责表措辞；08-G0/08-G1 决策记录标注废弃 + **新增 08-G0.1 决策记录行** |

## 6. 静态核验结果（任务书 §七 全项）

| # | 核验项 | 结果 |
|---|---|---|
| 1 | docs/specs 正典中不得再出现 apps/uniapp-next | ✅ **PASS（口径核验）**——正典（README + 00–05/07–11，含 08_development 全部）grep 逐条核对：该字符串仅存于「**废弃/不创建**」否定语境（IMPLEMENTATION_TARGET v1.2 §0「不创建 apps/uniapp-next」明确清单——任务书第二节本身要求此表述——及各文件修订记录中的废弃声明）；**无任何一处作为活跃目标落位**。06_review 历史台账与 prototype（禁改区）中的出现为存档快照，均带「已于 08-G0.1 废弃」追记或以 §0/现行正典为准 |
| 2 | TARGET_APP_ROOT 必须统一为 apps/uniapp | ✅ **PASS**——正典全部定义性出现 = `apps/uniapp`；「当时定为平行新建目录」仅存于历史注记（标注已废弃） |
| 3 | 不得再将 apps/uniapp 标为永久只读 | ✅ **PASS**——「legacy-read-only/永久只读」无生效口径出现，仅存于「已删除/替代」说明语境；现行两态口径（pre-development freeze / implementation target）已在 IMPLEMENTATION_TARGET v1.2 §2、RUNTIME v1.3、PLATFORM_ADAPTER v1.3、readiness §0 落文 |
| 4 | 所有文档明确「开发前暂不改 + 门禁通过后原路径重构」 | ✅ **PASS**——上述四文件 + README 头注/路线/决策记录 + 两份 04_architecture 横幅 + LEGACY_REUSE_MATRIX 头注均含两态表述 |
| 5 | apps/**、core/**、tests/**、prototype/** 本轮零修改 | ✅ **PASS**——`git status --porcelain` 禁区零新增条目；docs/specs/prototype 的 M 状态为本任务开始前既存脏区（此前会话原型修正轮产物，未提交，本轮零触碰；与 08-G0 报告 §8.1 同源说明） |
| 6 | 不新增功能、页面、流程、状态 | ✅ **PASS**——全部修改为口径/落位/处置裁定文字；29 功能 / 9 页面 / S1–S6 / 状态集合零改动（各修订记录均声明「契约本体零改动」） |
| 7 | 不提交、不推送 | ✅ **PASS**——HEAD 仍为 `2b25725`，零 commit 零 push；`apps/` 目录下无 uniapp-next（未创建） |

## 7. 下一步

1. **先完成 LEGACY_REUSE_MATRIX**：逐项深化复核——逐文件级裁定、删除项二次验证（locale / src 空骨架 / ble-utils / hid-navigation 等）、待验证项补证据（esp32-demo、core/interfaces 与 Port 关系、uni-ui 依赖面、LysBlePeripheral 真机证据）。
2. **再完善四件套与开发任务**：API_SPEC / DATA_MODEL / ERROR_CODE / PERMISSION 按「原工程内重构」口径与复用矩阵对齐（引用已同步，深化待做）；随后产出开发任务分解（逐模块迁移顺序 + 所需测试先行）。
3. **09_test 真实点击基线固化**（须 09_test 修改授权）——与上述两项共同构成 `apps/uniapp` 改版启动门禁（[DEVELOPMENT_READINESS_FINAL](DEVELOPMENT_READINESS_FINAL.md) §0）。

—— 08-G0.1 执行完毕。执行人：ZCode（方向纠偏：由平行新建改为原工程内重构）。本报告为 06_review 第 18 份评审文件。
