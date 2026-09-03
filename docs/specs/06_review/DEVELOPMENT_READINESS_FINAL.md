# DEVELOPMENT_READINESS_FINAL —— Smart BLE 开发冻结最终评审报告

> 第 15 份评审文件 · 2026-09-03 · **开发冻结收口评审（只读汇编）**
> 性质：本报告 v1.0 **未修改任何代码与规范**，仅汇编既有文件结论并逐条标记「已完成 / 待完成」；不新增需求、不改变任何决策口径。
> **修订（2026-09-03，08-G0 工程实现基线纠偏与旧工程隔离冻结）**：§0 准入结论由单一「放行」**拆分为两轨**（Product & Prototype Readiness = PASS / Engineering Contract Readiness = CONDITIONAL PASS）；§5 A-06 处置修正（产品口径澄清已由 DEVICE_PROFILE_RULE 关闭）；§6/§9 C1/C3 改判已裁决；§7 开发契约口径更新（工程边界冻结 + 四件套待补）。修订仅改结论口径与状态标记，不改变产品定义，详情见 [ENGINEERING_BASELINE_CORRECTION_REPORT.md](ENGINEERING_BASELINE_CORRECTION_REPORT.md)。
> **修订（2026-09-03，08-G1 工程契约四件套生成与事件模型收口）**：§0 由两轨升为**三轨**——Product & Prototype Readiness = **PASS**（维持）/ Engineering Contract Readiness = **PASS**（四件套 API_SPEC / DATA_MODEL / ERROR_CODE / PERMISSION 已生成，主因消除）/ **Feature Implementation Execution Gate = WAITING**（唯一等待项 = 09_test 真实点击基线固化）；§7/§9 条件 6b 改判已完成。修订仅改结论口径与状态标记，不改变产品定义，详情见 [ENGINEERING_CONTRACT_FOUR_PACK_REPORT.md](ENGINEERING_CONTRACT_FOUR_PACK_REPORT.md)。
> **修订（2026-09-03，08-G0.1 方向纠偏：由平行新建改为原工程内重构）**：① **Implementation Target 改口径**——改版实施目录 = 既有 `apps/uniapp`（in-place refactor，门禁通过后在专用 Git 开发分支原路径重构），「平行新建第二套工程」方案废弃，本文不再出现该目录口径；② **Engineering Contract Readiness 由 PASS 回落 CONDITIONAL PASS**——新增待办：旧代码复用矩阵（[LEGACY_REUSE_MATRIX](../08_development/LEGACY_REUSE_MATRIX.md)，本轮已建框架）逐项裁定深化 + 四件套与开发任务按原工程内重构口径完善；③ **旧版本保存方式** = Git 基线 commit `2b25725`，不以目录复制保存；④ 开发前 `apps/uniapp` 暂不修改（pre-development freeze），「永久只读/legacy-read-only」表述废止。修订仅改结论口径与状态标记，不改变产品定义，详情见 [IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT.md](IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT.md)。
> 输入（仅此六目录）：[02_product](../02_product/) · [03_flow](../03_flow/) · [06_review](.) · [09_test](../09_test/) · [10_platform](../10_platform/) · [11_ecosystem](../11_ecosystem/)（08-G0 修订追加引用 [08_development](../08_development/)）
> 事实源优先级沿用 [PAGE_CAPABILITY_COVERAGE_AUDIT.md](PAGE_CAPABILITY_COVERAGE_AUDIT.md) 头注：02_product → 03_flow → 05_sequence → 07_design_system → prototype。
> 除文件引用外，本报告对「当前实态」项（版本戳 / 内核 MD5 / P2 项开闭状态）做了 2026-09-03 当日 grep+md5 实证，标注为〔本轮实证〕。

---

## 0. 结论先行（08-G0.1 起为三轨准入 + 实施目标行）

**准入结论（2026-09-03，08-G0.1 方向纠偏：由平行新建改为原工程内重构）：**

| 轨道 | 结论 | 判据 |
|---|---|---|
| **1. Product & Prototype Readiness** | **PASS** | 产品定义层无缺口（29 在册功能 × 页面承载）、页面覆盖完整（9 页 + 四平台实例）、两轮原型审计 P0/P1 全部关闭——本报告 §1–§4 仍为依据，结论维持 |
| **2. Engineering Contract Readiness** | **CONDITIONAL PASS** | 工程契约文档齐备（映射与边界 + 08-G1 四件套已生成），但 08-G0.1 方向纠偏引入两项待办：① [LEGACY_REUSE_MATRIX](../08_development/LEGACY_REUSE_MATRIX.md) 逐项处置裁定深化（本轮已建框架与初判）；② 四件套与开发任务分解按「原工程内重构」口径完善。完成前不得启动改版编码 |
| **3. Feature Implementation Execution Gate** | **WAITING** | 等待项：09_test 真实点击基线固化（条件 7，须 09_test 修改授权）+ 上述工程契约两项待办（轨道 2）——三座阻塞问题的存活根因即断言未走真实按钮（§3 警示） |
| **Implementation Target** | **existing `apps/uniapp` in-place refactor** | 改版实施目录 = 既有 `apps/uniapp`：门禁通过后在专用 Git 开发分支中于原路径直接重构（[IMPLEMENTATION_TARGET](../08_development/IMPLEMENTATION_TARGET.md) v1.2）；**不创建平行新工程**；**旧版本由 commit `2b25725` 保留**，不以目录复制保存 |

**执行门（WAITING）的边界条件：**

1. **四件套与真实点击测试完成后，允许在 `apps/uniapp` 上开始改版**——即：① LEGACY_REUSE_MATRIX 逐项裁定完成；② 四件套（API_SPEC / DATA_MODEL / ERROR_CODE / PERMISSION）按原工程内重构口径完善；③ 09_test 真实点击基线固化（须 09_test 修改授权，条件 7）。三项齐备前，改版编码（F001–F030 任一功能的重构迁移）不得启动。
2. 旧代码处置纪律：`apps/uniapp` 开发前暂不修改（pre-development freeze）；旧代码是**实现证据与复用候选**，不是产品需求事实源——逐模块处置以 [LEGACY_REUSE_MATRIX](../08_development/LEGACY_REUSE_MATRIX.md) 为准（保留/包装/重构/重写/删除/待验证），不得以复制旧页面/旧 Service 作为需求来源（[IMPLEMENTATION_TARGET](../08_development/IMPLEMENTATION_TARGET.md) v1.2 §1/§2）。
3. **历史口径变更登记**：v1.0 单一「放行 ✅」→ 08-G0 两轨（产品/原型 PASS + 工程契约 CONDITIONAL PASS）→ 08-G1 三轨（工程契约升 PASS）→ **08-G0.1 三轨 + 实施目标行（工程契约因方向纠偏回落 CONDITIONAL PASS；实施目标由平行新建改为既有 apps/uniapp 原路径重构）**。

| 冻结维度 | 状态 |
|---|---|
| 产品能力覆盖（29 在册功能 × 页面承载） | ✅ 已完成（无定义层缺口） |
| 页面覆盖（9 页 + 四平台实例） | ✅ 已完成 |
| HTML 原型审计（两轮：就绪审计 + 能力覆盖审计） | ✅ 已完成（P0×1 + P1×4 全部关闭） |
| 原型层 P2 遗留 | ⏳ 待完成 ×13（演示/字段级，不阻塞开发） |
| 平台能力冻结（D1–D3 + 待验证 + 生态冲突） | ✅ 已冻结（D2 spike 前置不变；**C1/C3 已裁决** 2026-09-03 08-G0，真机证据待补——[PLATFORM_CAPABILITY_DECISION](../08_development/PLATFORM_CAPABILITY_DECISION.md)） |
| 08_development 映射与边界文档 | ✅ 已完成（七件 + 08-G0 三件；工程边界已冻结） |
| 工程契约四件套（API_SPEC / DATA_MODEL / ERROR_CODE / PERMISSION） | ⏳ **CONDITIONAL（08-G0.1）**——四件套已生成（08-G1，[ENGINEERING_CONTRACT_FOUR_PACK_REPORT](ENGINEERING_CONTRACT_FOUR_PACK_REPORT.md)），方向同步已完成（API_SPEC v1.1 / DATA_MODEL v1.1 引用切至 apps/uniapp），但须按原工程内重构口径完善并与 LEGACY_REUSE_MATRIX 对齐；Runtime v1.3 / PLATFORM_ADAPTER_SPEC v1.3 / IMPLEMENTATION_TARGET v1.2 / FEATURE_IMPLEMENTATION_MATRIX v2.3 同轮同步 |
| 进入 D1 开发 | ⏳ 执行门：**门禁通过前 `apps/uniapp` 暂不修改（pre-development freeze）；四件套完善 + LEGACY_REUSE_MATRIX 裁定 + 09_test 真实点击基线固化后，允许在 apps/uniapp 原路径开始改版** |

---

## 1. 产品能力覆盖结论 —— ✅ 已完成（产品定义层无缺口）

来源：[PAGE_CAPABILITY_COVERAGE_AUDIT.md](PAGE_CAPABILITY_COVERAGE_AUDIT.md) §1/§2（第 12 份评审文件，2026-09-03）。

| 维度 | 结论 | 引用 |
|---|---|---|
| 在册功能 | **29 项**（F001–F030 去 F023），其中 **27 项有完整页面承载与可达入口** | 审计 §1；[FEATURE_MAP](../02_product/FEATURE_MAP.md) §2 |
| 优先级分布 | P0 ×17 / P1 ×7 / P2 ×5 | [DEVELOPMENT_SCOPE](../08_development/DEVELOPMENT_SCOPE.md) §2 |
| 规范内闭环（非遗漏） | F017 观察侧证据匹配：P-04 决策不做独立页面入口（服务层能力保持）；F030 国际化：P-05 决策不做（全中文为已知现状 R30） | 审计 §1；[DEVELOPMENT_SCOPE](../08_development/DEVELOPMENT_SCOPE.md) §4 N-5/N-6 |
| 原型层三大缺口（审计发现） | F024 主动作断（P0-1）/ F020 扫码三分类不可达（P1-1）/ F006 进入连接不一致（P1-2）——**均已于 2026-09-03 修复关闭**（见 §4） | 三份修复报告 |
| 状态机覆盖 | STATE_MODEL §1 九台状态机在页面层可达可表现；Smart HID「特殊设备 = 标准设备能力 × Profile 扩展」红线合规 | 审计 §1/§5；[STATE_MODEL](../02_product/STATE_MODEL.md) §1 |
| OTA（F025） | 部分实现、**端到端 BLOCKED（P-03）**：契约保留（12 态/六重校验/分包/版本回读），原型按契约演示口径呈现，BLOCKED 预警两处在位 | [DEVELOPMENT_SCOPE](../08_development/DEVELOPMENT_SCOPE.md) §5；审计 §2.5 S5 专项判定 |

**结论**：审计原文「产品定义层无缺口」「产品定义（02_product/03_flow）与页面映射关系未发现缺口；上述问题全部为原型实现层缺陷/演示缺口」——经三阻塞项修复后，原型实现层缺口同步消除，产品能力覆盖**冻结为完整状态**。

---

## 2. 页面覆盖结论 —— ✅ 已完成

来源：[PAGE_CAPABILITY_COVERAGE_AUDIT.md](PAGE_CAPABILITY_COVERAGE_AUDIT.md) §3；[09_test/COVERAGE_CHECKLIST.md](../09_test/COVERAGE_CHECKLIST.md)。

| 项 | 结论 | 引用 |
|---|---|---|
| 基准页面集 | **9 页（P001–P010 除 P004）与 PAGE_SPEC 一一对应**，无无效页面、无孤儿页面；P004 已移除（2026-09-02 用户决策）为规范内闭环 | 审计 §3；[PAGE_SPEC](../03_flow/PAGE_SPEC.md) §4【已移除】 |
| V0 覆盖口径 | 页面 10/10（在册 9 + 移除标注 1）、功能 29/29、状态 5/5 —— 100% 覆盖 | [COVERAGE_CHECKLIST](../09_test/COVERAGE_CHECKLIST.md) 结论行 |
| 平台实例页面 | wechat / app / desktop = 基准 9 页（内核字节同步 + 覆写层）；web = 6 屏**有意子集**（D3 暂缓决策，「GATT 调试器」形态，缺失域显式 ✗ + 指引） | 审计 §3 平台表；[10_platform §6](../10_platform/PLATFORM_EXTENSION.md) D3 行 |
| 入口旅程 | S1–S6 六旅程全部可达（审计 §4 逐项）；V0 QA 实测 S1–S6 = 6/6 | 审计 §4；[HTML_QA_REPORT](../09_test/HTML_QA_REPORT.md) §一 |

**结论**：页面层无覆盖缺口；平台实例差异（web 子集）均为已拍板决策的合法形态。**冻结为完整状态**。

---

## 3. HTML 原型审计结论 —— ✅ 已完成（两轮审计 + 全部 P0/P1 关闭）

两轮开发前审计均出具「有条件通过」，条件项已全部落地：

| 审计 | 结论 | 阻塞项 | 现状 |
|---|---|---|---|
| [HTML_DEVELOPMENT_READINESS_AUDIT.md](HTML_DEVELOPMENT_READINESS_AUDIT.md)（第 8 份） | 有条件通过（可进入开发准备，2 项 P1 建议先修复） | A-01 空态组件签名损坏（P1）/ A-02 广播弹窗字段不完整（P1）+ P2 ×8 | **A-01/A-02 已关闭**（§4 表）；P2 中 A-04 随 P1-1 修复一并关闭，余项见 §5 |
| [PAGE_CAPABILITY_COVERAGE_AUDIT.md](PAGE_CAPABILITY_COVERAGE_AUDIT.md)（第 12 份） | 有条件通过（修复 1×P0 + 2×P1 后可进入 D1 开发） | P0-1 / P1-1 / P1-2 | **三项已全部关闭**（§4 表）；审计 §8「开发前必须修复项」M-1/M-2/M-3 完结 |

红线核查结论（就绪审计 §1，七类专项）：本地存储零使用 / OTA 未提前实现 / 无登录会员云端 / 平台不改产品流程 / Profile 不破坏普通流程 / 无圈外按钮 / 无功能整缺——**红线全部未破**。

质量基线：V0 QA **Level 3（开发依据）放行**（[HTML_QA_REPORT](../09_test/HTML_QA_REPORT.md) §九，页面 9/9 · 功能 29/29 · 流程 6/6 · 五态 ×9 页 · 异常 4/4，console 0 error）；v1-new 基准原型 Playwright 26/26 + 视觉复核通过（[v1-new/README](../prototype/v1-new/README.md) 头注），并已吸收 06_review 全部 B 类与 QA Q1/Q2/Q3 整改项。

审计遗留的方法论警示（引用自两审计，是 §9 中 09_test 固化建议的依据）：历轮冒烟断言以场景库直接置态为主、未点击真实按钮，致使 P0-1 穿越多轮测试存活——**断言必须经真实用户动作触发**（[PAGE_CAPABILITY](PAGE_CAPABILITY_COVERAGE_AUDIT.md) §1 末条；[P005 修复报告](P005_DIAGNOSE_FIX_REPORT.md) §3 教训）。

当前同步态〔本轮实证 2026-09-03〕：内核 app.js MD5 四方唯一 `6a687a0c688a4a37a2aa67e6fdccd94e`（v1-new + wechat/app/desktop），pages/p002-provision.js 四方唯一；版本戳 v1-new `?v=1.1.7` · 三壳 `?v=1.4.6` · web `?v=1.4.1`；desktop 覆写层三分类挂载在位（desktop.js:129-131）。

---

## 4. P0/P1 问题关闭记录 —— ✅ 已完成（5/5 关闭）

| # | 级别 | 问题 | 关闭报告 | 验证 | 状态 |
|---|---|---|---|---|---|
| P0-1 | P0 | P005「重新检测」点击即 ReferenceError，F024 核心动作与 checking→live 经用户操作不可达（四实例同病） | [P005_DIAGNOSE_FIX_REPORT.md](P005_DIAGNOSE_FIX_REPORT.md)（M-1） | Playwright 真实点击 36/36 · 0 PAGEERROR · MD5 四方一致（当轮 `c4b93b8d…`） | ✅ 已关闭 2026-09-03 |
| P1-1 | P1 | F020 扫码失败三分类（取消/权限/无效）无 UI 分支不可达（qrErr 死字段） | [QR_ERROR_STATE_FIX_REPORT.md](QR_ERROR_STATE_FIX_REPORT.md)（M-2） | Playwright 真实点击 32/32（四结果 + X 关闭语义 + 恢复回路 + 配网回归 + 三壳抽查）· MD5 `6a687a0c…` ×4 | ✅ 已关闭 2026-09-03（同轮关闭就绪审计 A-04） |
| P1-2 | P1 | P006 三路径进入连接行为不一致，P007 已连接会话进入显示「未连接」 | [P006_SESSION_STATE_FIX_REPORT.md](P006_SESSION_STATE_FIX_REPORT.md)（M-3） | Playwright 26/26 · 统一入口 `p006Enter()` 读会话注册表 | ✅ 已关闭 2026-09-03 |
| A-01 | P1 | `C.empty()` 签名不匹配，全部空态渲染损坏（22 调用点） | [EMPTY_COMPONENT_FIX_REPORT.md](EMPTY_COMPONENT_FIX_REPORT.md) + [EMPTY_COMPONENT_FINAL_FIX_REPORT.md](EMPTY_COMPONENT_FINAL_FIX_REPORT.md)（两级：调用迁移 + act 缺省收口） | Playwright 62/62 · MD5 四方一致 | ✅ 已关闭 2026-09-03 |
| A-02 | P1 | 广播数据弹窗（adv-sheet）字段不完整，F004 为 P0 功能（R04 验收） | [ADVERTISEMENT_DETAIL_FIX_REPORT.md](ADVERTISEMENT_DETAIL_FIX_REPORT.md) | 四实例 Playwright 实测 · AD 帧自洽校验 · console 0 error | ✅ 已关闭 2026-09-03 |

审计 §8 修复建议 M-1（P0 必修）/ M-2 / M-3（P1 强烈建议）全部落地；M-4（P2 批量小改）归入 §5 待完成。QR 修复报告 §6 原文确认：「**审计三阻塞项（P0-1/P1-1/P1-2）全部关闭——页面能力覆盖审计的『开发前必须修复项』清单完结，D1 开发无已知阻塞**」。

---

## 5. P2 遗留列表 —— ⏳ 待完成 ×13（不阻塞开发）

> 判级口径（两审计一致）：P2 均为演示数据/字段级/文案级缺口，**开发实现以规范为准，不受 mock 演示范围限制**（[PAGE_CAPABILITY](PAGE_CAPABILITY_COVERAGE_AUDIT.md) §1/§7；[就绪审计](HTML_DEVELOPMENT_READINESS_AUDIT.md) §2 P2 表头「建议修复或澄清后开发」）。开闭状态为〔本轮 grep/读文件实证 2026-09-03〕。

### 5.1 来源：[PAGE_CAPABILITY_COVERAGE_AUDIT.md](PAGE_CAPABILITY_COVERAGE_AUDIT.md) §7（P2-1～P2-7）

| # | 问题 | 当前实证 | 状态 |
|---|---|---|---|
| P2-1 | P001 工具条「N 台设备·M 台已连接」的 M 计数未呈现（口径已在 TabBar 角标实现） | p001-scan.js grep「台已连接」= 0 | ⏳ 待完成（与就绪审计 A-05 同项） |
| P2-2 | P009 品牌卡缺「技术栈 chips + 总体状态」两字段 | p009-about.js grep「技术栈」= 0 | ⏳ 待完成 |
| P2-3 | P010 当前限制卡 mock 3 条 vs PRD 口径 8 条 | mock.js:105 三条在册 | ⏳ 待完成 |
| P2-4 | 授权拒绝横幅（reason 分类）无专门场景（ebanner 通路可承载；app 实例已演示同型） | 场景库无该场景 | ⏳ 待完成 |
| P2-5 | F005 显示名 fallback 中间级（AD 0x09/0x08→Profile→厂商）无演示数据（端点「未命名 BLE」已证） | mock 无对应样例设备 | ⏳ 待完成 |
| P2-6 | 扫描会话 starting/stopping 瞬态未呈现（STATE_MACHINE §7 四态） | 工具条标签仍四值 | ⏳ 待完成 |
| P2-7 | OTA 12 态仅演示 7 相位主链（SUBSCRIBING/STARTING/READY 无演示） | 演示相位未扩 | ⏳ 待完成 |

### 5.2 来源：[HTML_DEVELOPMENT_READINESS_AUDIT.md](HTML_DEVELOPMENT_READINESS_AUDIT.md) §2（A-03～A-10 去已关闭项）

| # | 问题 | 当前实证 | 状态 |
|---|---|---|---|
| A-03 | P008 Android 三开关（可连接/含名称/加 UUID）基准原型缺失（app 覆写层已完整，基准场景切 Android 时表单不全） | p008-broadcast.js grep 三开关 = 0 | ⏳ 待完成 |
| A-06 | P007 mock 把「配网会话」放进已连接列表 + p007-open 仅按 profileId 分流存在口径缝隙 | 产品口径澄清**已关闭（08-G0 修订）**：「配网会话不进 P007 通用列表」与按会话类型分流已由 [DEVICE_PROFILE_RULE](../08_development/DEVICE_PROFILE_RULE.md) DR-3（开发落点/违例判定）+ §5 checklist 第 7 项收口；**仅保留 mock 演示数据缺陷**（mock.js:72 配网会话错误进入 P007 列表——mock 级，随 P2 批量整改或改版实现时自然消解） | ⏳ 待完成（仅 mock 级演示数据缺陷；规范澄清部分已关闭） |
| A-07 | 基准 CSS 存在 Token 表外派生色值（#0E9A80 等；README「仅引用 Token」表述与事实不符） | components.css/pages.css grep #0E9A80 = 11 处 | ⏳ 待完成（应在样式迁移 rpx/ThemeData 前完成，不阻断 D1 启动） |
| A-08 | 显示名兜底文案「未命名 BLE 设备」vs 规范「未命名 BLE · ID后四位」未按 ID 后四位截断 | components.js:92 原文案 | ⏳ 待完成（与 P2-5 同域不同点：末级文案 vs 中间级数据） |
| A-09 | P006 服务面板 idle 态误用 loading 语义（spinner 旋转误导「正在初始化」） | p006-gatt.js:18 `mode:'loading'` | ⏳ 待完成 |
| A-10 | P006「固件更新」入口在 subnav 右槽 vs 规范定义在设备面板操作行（功能等价、触达路径偏差） | p006-gatt.js:42 subnav | ⏳ 待完成（或经评审确认接受偏差并备注 PAGE_SPEC） |

> 已关闭不列：A-04（扫码分类，随 P1-1 关闭）、A-05（并入 P2-1）。
> 处置建议沿用审计 §8 M-4：**可与开发并行的小批量整改**，逐项待用户放行（一轮一项的既定工作方式）。

---

## 6. 平台能力冻结状态 —— ✅ 已冻结（D1/D3 拍板；D2 待 spike 为既定前置，非新增事项）

来源：[10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) §3/§5/§6；[DEVELOPMENT_SCOPE](../08_development/DEVELOPMENT_SCOPE.md) §1/§7；[11_ecosystem/README.md](../11_ecosystem/README.md)。

| # | 项 | 冻结结论 | 状态 |
|---|---|---|---|
| D1 | 平台范围与优先级 | **首批开发 = 微信小程序 + App·Android**（iOS 现状 NOT_RELEASED 不占首批）；内部次序 P1 微信 → P2 App·Android | ✅ 已决策（2026-09-02） |
| D2 | Desktop | 待技术 spike（Electron vs Tauri + BLE 原生层，不预判）；spike 为进入开发前置；差异原型已齐（2026-09-03，只表现形态） | ⏳ 待完成（spike 未启动，D1 范围外） |
| D3 | Web | 开发暂缓（选项 b）：S1 扫描 / S4 广播两条核心旅程在浏览器断裂；原型按「GATT 调试器」子集先行 | ✅ 已决策（随 D1） |
| 遗留决策 | P-04（F017 独立入口）/ P-05（F030 i18n） | 均不做（随 D1 拍板） | ✅ 已决策 |
| 不变式 | 先有产品，再有平台 | 平台差异仅限 10_platform §4 差异设计表；圈外差异先回写规范再开发（BR-12） | ✅ 冻结（L1–L4 四层总纲，[specs/README](../README.md)） |
| 待验证登记 | V-1～V-6（Desktop 原生层 / Linux BlueZ / Web 实验性 API / PC 端微信 BLE【未知】/ iOS CoreBluetooth / STATE_REVIEW §5 遗留【未知】） | 登记不脑补，开发期 spike/核对 | ⏳ 待完成（登记制度，不阻塞 D1） |
| 生态冲突项 | C1 微信广播发送 / C3 微信多设备——**已裁决（2026-09-03，08-G0）**：supported_limited / supported_foreground，实证行为不翻转，**真机证据待补**（[PLATFORM_CAPABILITY_DECISION](../08_development/PLATFORM_CAPABILITY_DECISION.md)）；C4 重连语义两层 / C2·C5 iOS·macOS 维持登记 | ✅ C1/C3 已裁决（真机验证矩阵开发期补齐）；其余登记不阻塞 |
| 生态定位 | 三份生态规范 = 生态级上位基线；本项目 = uni-app 实现线；产品范围以 02_product 为准，D1–D3 不变 | — | ✅ 已冻结（[11_ecosystem/README](../11_ecosystem/README.md) 定位表） |

---

## 7. 开发范围 D1 —— ✅ 已冻结

来源：[08_development/DEVELOPMENT_SCOPE.md](../08_development/DEVELOPMENT_SCOPE.md)（冻结抽取，不新增功能不改逻辑）；[10_platform §5/§6](../10_platform/PLATFORM_EXTENSION.md)。

| 维度 | 冻结值 |
|---|---|
| 首批平台 | 微信小程序（P1，基准平台 v1 直接实现）+ App·Android（P2，扫描/GATT/配网 UI 复用基准原型） |
| 功能范围 | 29 项在册（F001–F030 去 F023）；P0 ×17 / P1 ×7 / P2 ×5 |
| 页面范围 | PAGE001–PAGE010（PAGE004 已移除）；能力域↔页面映射六组 |
| 核心旅程 | S1 调试 / S2 首次配网 / S3 故障排查 / S4 广播验证 / S5 固件升级（受限）/ S6 多设备管理——全部平台无关 |
| 导航矩阵 | 以 PAGE_FLOW §1/§2 为准（redirectTo 仅 P002→P003 一处；栈感知导航仅 P005 两处） |
| 验收基线 | R01–R30（R19 已作废），Given/When/Then 可直接转测试用例 |
| OTA | 受限开放：契约照规范实现，端到端 BLOCKED 状态保持，不得提前宣告可用 |
| 开发契约 | [08_development](../08_development/) 工程契约：API_ACTION_MATRIX（v1.1）/ DEVICE_PROFILE_SPEC / DEVICE_PROFILE_RULE / STORAGE_POLICY / DEVELOPMENT_SCOPE / PLATFORM_ADAPTER_SPEC（**v1.3**）/ FEATURE_IMPLEMENTATION_MATRIX（**v2.3**）+ 08-G0 三件（**IMPLEMENTATION_TARGET v1.2** / PLATFORM_CAPABILITY_DECISION / **RUNTIME_ARCHITECTURE v1.3**）+ 08-G1 四件套（API_SPEC **v1.1** / DATA_MODEL **v1.1** / ERROR_CODE / PERMISSION）+ **08-G0.1 一件（LEGACY_REUSE_MATRIX，复用矩阵框架已建、逐项裁定深化中）**（版本为 08-G0.1 后当前态；[specs/README](../README.md) 08 行） |

---

## 8. 开发禁止事项 —— ✅ 已冻结（负面清单 + 不变式）

来源：[DEVELOPMENT_SCOPE](../08_development/DEVELOPMENT_SCOPE.md) §4（N-1～N-8 原文）；[STATE_MODEL](../02_product/STATE_MODEL.md) §2；[specs/README](../README.md) 平台开发总纲 L1–L4。

**负面清单（N-1～N-8，逐字引 [DEVELOPMENT_SCOPE §4](../08_development/DEVELOPMENT_SCOPE.md)）：**

| # | 禁止项 | 依据 |
|---|---|---|
| N-1 | 登录 / 会员 / License / 支付 / 订单 / 商业设备管理 | PRD §1.3 · BR-01 |
| N-2 | HID 实时键鼠控制（属 ControlHub→MQTT 链路） | PRD §1.3 |
| N-3 | 云同步 / 远程设备管理 / 任何 HTTP、云端依赖 | PRD §1.3 · Z-3 |
| N-4 | F023 已配网设备历史 + PAGE004 + known_devices 本地存储（90 天 TTL/20 条/prune）——**不得复刻** | PRD 变更记录 · BUSINESS_FLOW §4 |
| N-5 | F017 观察侧证据匹配的独立页面入口——**开发不得加入口**（P-04 关闭） | PRD 变更记录 D1 行 |
| N-6 | F030 国际化 i18n——不做（P-05 关闭；全中文为已知现状 R30） | PRD 变更记录 D1 行 · R30 |
| N-7 | 未决策的平台候选增强（后台保连通知 / 日志文件流导出 / URL 预填配网 / 蓝牙快捷设置直达 / OTA 固件库 / 多设备并排工作台等） | BR-12 · 10_platform §2.2–§2.4 |
| N-8 | 生态清单未纳入项（BLE-009 设备管理 / BLE-011 协议调试 / iBeacon 专解 / Write Without Response 等）——生态不反向扩 v1 范围 | ALIGNMENT_NOTES §3 |

**配套不变式：** 状态集合与转移平台无关，不得增删状态或改变恢复路由（BR-11，[STATE_MODEL §2](../02_product/STATE_MODEL.md)）；错误码即契约（BR-07 异常三要素）；零本地持久化 / 零 HTTP / 日志脱敏（L1）；圈外差异先修订规范再开发（BR-12）；OTA 端到端 BLOCKED 不得提前宣告可用（[DEVELOPMENT_SCOPE §5](../08_development/DEVELOPMENT_SCOPE.md)）。

---

## 9. 准入条件核对（08-G0.1 口径：产品/原型满足；工程契约回落 CONDITIONAL（复用矩阵 + 四件套完善）；功能实现执行门等待 09_test 真实点击基线）

> 门禁定义（引用）：[PAGE_CAPABILITY §8](PAGE_CAPABILITY_COVERAGE_AUDIT.md) 结论原文——「**M-1 修复并回归通过后，原型层即可作为 D1 开发（微信 + App·Android）的交互与视觉基准放行**；M-2/M-3 建议随 M-1 同轮处理」；[specs/README](../README.md) 融合路线——「基准原型 V1 ✅ 用户走查门禁通过 → 平台扩展原型 ✅ → 开发准备（08_development ✅ 冻结）」。

| # | 准入条件 | 依据 | 状态 |
|---|---|---|---|
| 1 | 产品规范冻结：产品模型五件套 + 03_flow 三件套 + Design System v1.0 | [specs/README](../README.md) 目录表（均 ✅ 2026-09-02/03） | ✅ 已完成 |
| 2 | V0 原型 QA Level 3 放行（页面 9/9 · 功能 29/29 · 流程 6/6 · 异常 4/4） | [HTML_QA_REPORT §九](../09_test/HTML_QA_REPORT.md) | ✅ 已完成 |
| 3 | 基准原型 V1 + 平台四实例齐备（走查门禁通过 + 三规范重构） | [specs/README](../README.md) 路线行；[10_platform §6](../10_platform/PLATFORM_EXTENSION.md) 注记 | ✅ 已完成 |
| 4 | 原型层 P0/P1 阻塞清零（审计 M-1/M-2/M-3 + 就绪审计 A-01/A-02） | §4 关闭记录（五份修复报告，Playwright 36/32/26/62/实测 全过） | ✅ 已完成 |
| 5 | 内核同步一致（四实例 MD5 唯一 + 版本戳） | 〔本轮实证〕app.js `6a687a0c…` ×4 · p002 `bbaaf050…` ×4 · 戳 1.1.7/1.4.6/1.4.1 | ✅ 已完成 |
| 6 | 08_development 映射与边界文档完成（范围/负面清单/映射/分层/存储/Profile 规则 + 08-G0 三件：工程目标冻结/C1·C3 裁决/Runtime v1.1） | [specs/README](../README.md) 目录表 08 行（工程边界已冻结） | ✅ 已完成 |
| 6b | **工程契约四件套：API_SPEC / DATA_MODEL / ERROR_CODE / PERMISSION**（方法与事件契约 / 实体契约 / 错误码三级映射 / 权限矩阵） | [ENGINEERING_CONTRACT_FOUR_PACK_REPORT](ENGINEERING_CONTRACT_FOUR_PACK_REPORT.md)（08-G1，2026-09-03）；API_ACTION_MATRIX = 页面动作映射，不能替代 API_SPEC | ⏳ **CONDITIONAL（08-G0.1）**——已生成（08-G1），方向同步完成（v1.1 引用已切 apps/uniapp）；待按原工程内重构口径完善并与 LEGACY_REUSE_MATRIX 对齐 |
| 6c | **旧代码复用矩阵 LEGACY_REUSE_MATRIX**（逐模块：保留/包装/重构/重写/删除/待验证） | [LEGACY_REUSE_MATRIX](../08_development/LEGACY_REUSE_MATRIX.md)（08-G0.1 新增） | ⏳ **框架与初判已建（08-G0.1），逐项裁定深化待完成**——改版编码启动前置之一 |
| 7 | 09_test 冒烟固化（真实点击断言组：F020 四结果 / P005 两路径+错误回路 / P006 三路径会话 / 空态组） | 三份修复报告遗留建议（[P005 §7.2](P005_DIAGNOSE_FIX_REPORT.md)、[QR §6.2](QR_ERROR_STATE_FIX_REPORT.md)、[P006 §7](P006_SESSION_STATE_FIX_REPORT.md)、[EMPTY_FINAL §5.1](EMPTY_COMPONENT_FINAL_FIX_REPORT.md)） | ⏳ **必须完成（apps/uniapp 改版启动前置之一；未获 09_test 修改授权，待放行）** |
| 8 | 原型 P2×13 整改 | 审计 §8 M-4「可与开发并行」 | ⏳ 待完成（非阻塞，逐项待放行） |
| 9 | 生态 C1/C3 裁决 | [PLATFORM_CAPABILITY_DECISION](../08_development/PLATFORM_CAPABILITY_DECISION.md)（08-G0，2026-09-03） | ✅ **已裁决**（supported_limited / supported_foreground；真机证据待补，不阻塞脚手架） |
| 10 | D2 Desktop spike / D3 Web | 不在 D1 范围（§6 表） | ⏳ 待完成（范围外） |
| 11 | git 提交/推送（本轮及历轮修复均未提交，基线 `2b25725`） | [P005 §7.4](P005_DIAGNOSE_FIX_REPORT.md) / [QR §6.4](QR_ERROR_STATE_FIX_REPORT.md)「按约定暂缓」 | ⏳ 待完成（用户既定约定：暂缓提交与推送） |

**最终判定（08-G0.1 口径）：Product & Prototype Readiness = PASS**（条件 1–6 产品/原型侧全部满足，§1–§4 结论维持）；**Engineering Contract Readiness = CONDITIONAL PASS**——四件套已于 08-G1 生成，但 08-G0.1 方向纠偏（平行新建 → 原工程内重构）引入两项待办：LEGACY_REUSE_MATRIX 逐项裁定深化（条件 6c）与四件套按 in-place refactor 口径完善（条件 6b）；**Feature Implementation Execution Gate = WAITING**——等待 09_test 真实点击基线固化（条件 7，须 09_test 修改授权；三座阻塞问题的存活根因即断言未走真实按钮，§3 警示）及上述工程契约待办。**Implementation Target = existing apps/uniapp in-place refactor**：四件套与真实点击测试完成后，允许在 `apps/uniapp` 原路径开始改版（专用 Git 开发分支实施）；旧版本由 commit `2b25725` 保留。

---

## 附：本报告引用源清单

| 目录 | 引用文件 |
|---|---|
| 02_product | PRD.md（变更记录/§5/§8 经转引）· FEATURE_MAP.md §2 · STATE_MODEL.md §1/§2 |
| 03_flow | PAGE_SPEC.md（§2/§4/§5/§6 经转引）· PAGE_FLOW.md §1/§2（经转引） |
| 06_review | PAGE_CAPABILITY_COVERAGE_AUDIT · HTML_DEVELOPMENT_READINESS_AUDIT · P005_DIAGNOSE_FIX_REPORT · QR_ERROR_STATE_FIX_REPORT · P006_SESSION_STATE_FIX_REPORT · EMPTY_COMPONENT_FIX_REPORT · EMPTY_COMPONENT_FINAL_FIX_REPORT · ADVERTISEMENT_DETAIL_FIX_REPORT |
| 09_test | COVERAGE_CHECKLIST · HTML_QA_REPORT |
| 10_platform | PLATFORM_EXTENSION.md §3/§5/§6 |
| 11_ecosystem | README.md（定位表）· ALIGNMENT_NOTES §2/§3（经转引） |
| 08_development（结论消费方） | DEVELOPMENT_SCOPE.md §1/§2/§4/§5/§6/§7 |
| 其他 | specs/README.md（融合路线 + 平台开发总纲 L1–L4 + 目录状态表）· prototype/v1-new/README.md（修订记录 v1.0.1–v1.0.7） |

—— 评审完成。评审人：ZCode（开发冻结最终评审，只读汇编 + 当前态实证）。本报告为 06_review 第 15 份评审文件；本目录现有 14 份前置评审/修复文件，全链证据可溯。
