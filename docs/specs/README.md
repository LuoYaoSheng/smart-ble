# Smart BLE 产品基准规范（specs）

> **全平台公共文件 · 单一事实源。** 本项目是 `apps/uniapp` 旧工程**改版**（in-place refactor），不是平行创建第二套 App——**docs/specs 是产品事实源**，旧代码是实现证据与复用候选，不是产品需求事实源；改版落位与基线保存（Git commit `2b25725`）规则见 [08_development/IMPLEMENTATION_TARGET](08_development/IMPLEMENTATION_TARGET.md) v1.2。
> 组织依据：《旧 App AI 重构 SOP v2.0》+《旧产品原型跨平台扩展 SOP v1.0》+《产品基准原型 Base Prototype 规范 v1.0》+《AI 产品重构逻辑评审规范 v1.0》+《AI-Native 应用生成平台架构规范 v1.0》（平台级上位框架，本目录为其在 smart-ble 的单项目实例化，定位说明见下）+《产品模型 Product Model 规范 v2.0》+《多平台 HTML 原型生成规范 v1.0》+《平台设计说明规范 v1.0》（2026-09-03 并入：产品模型五件套 / 每平台 low-fi+high-fi / 每平台四份说明文档）。
> 原则：**先有产品再有平台**——本目录定义与平台无关的产品基准（功能/页面/流程/交互/数据口径/设计系统），平台只是扩展层，不反向改变产品模型、数据模型与核心流程。
> 2026-09-02 由 `apps/uniapp/docs` + `apps/uniapp/prototype` 升格迁入（用户决策：多平台仓库，产品文档必须公共化）。

## 事实链与路线

事实链：00_context / 01_reverse（事实）→ 02_product（产品）→ 03_flow（流程交互）→ 04–05（技术视图）→ 06_review（审查）→ 09_test（V0 验收）→ 10_platform（平台扩展分析）。

融合路线：产品恢复（Phase 1–8 ✅）→ 平台扩展分析（✅）→ Design System（07_，✅ 冻结 v1.0）→ 基准原型 V1（prototype/v1-new，✅ 用户走查门禁通过）→ **平台扩展原型（✅ 四平台齐备 2026-09-03，按三规范重构：每平台 low-fi + high-fi + 四份说明文档；原型齐备 ≠ 开发排期，D1 开发首批=微信+App·Android 不变）→ 平台扩展检查（⏳ 待用户走查）→ 开发准备（08_development：**工程契约已生成（08-G0 工程边界冻结 + 08-G1 四件套）；08-G0.1 方向纠偏——由平行新建改为 apps/uniapp 原工程内重构，工程契约侧回落 CONDITIONAL（LEGACY_REUSE_MATRIX 裁定 + 四件套完善中）——三轨准入见 [06_review/DEVELOPMENT_READINESS_FINAL](06_review/DEVELOPMENT_READINESS_FINAL.md) §0（改版编码另等待 09_test 真实点击基线固化）**）**。

跨平台 SOP 目录映射：docs/platform → **10_platform**；docs/design-system → **07_design_system**（TOKEN/COMPONENT/PATTERN 名称一致）；prototype/base → **prototype/{v0-old, v1-new}**（v1-new 按 Base Prototype 规范 v1.0 作为产品基准）；prototype/platform → **prototype/platform/{app,wechat,web,desktop}**。

上位框架定位（2026-09-02）：《AI-Native 应用生成平台架构规范 v1.0》定义的是「应用工厂」**平台级**流水线（需求 → 产品模型 → 能力匹配 → 原型 → 设计 → 代码 → 测试 → 发布）。本目录即该流水线在 smart-ble 的**单项目实例**：产品恢复 / 评审 / 原型 / 设计系统已完成，API 中心（08_development，对应其 §10 输出 API_SPEC / DATA_MODEL / ERROR_CODE）与代码 / 测试 / 发布为后续阶段；能力资产市场（capability/）与发布中心（release/）为平台级概念，不在本项目目录内预建。

## 平台开发总纲（所有平台必须遵守）

分四层，从强到弱约束：

| 层 | 约束 | 内容 | 违反后果 |
|---|---|---|---|
| **L1 产品不变式** | 必须一致 | 功能清单与边界（02_product）、页面与流程（03_flow）、数据口径、零 HTTP/零登录、零本地持久化、日志脱敏 | 禁止：任何平台增删核心功能、改变流程、落盘敏感数据 |
| **L2 设计系统** | 必须共享 | 07_design_system 的 Token/组件/交互模式全平台统一；平台只做原生等价映射（字体栈、密度单位），不另立体系 | 禁止：平台私设色彩/间距/组件规格 |
| **L3 平台差异** | 只许在圈内 | 差异仅限 10_platform 差异设计表列出的差异点（权限流程/分享/扫码/日志导出/生命周期/能力缺失降级）；新平台接入必做**三查**（功能保留/限制合规/增强利用），结论回写 10_platform | 圈外差异需先修订规范再开发 |
| **L4 验收** | 同一把尺 | 09_test 质量门禁标准对平台实现同样适用；prototype/ 为交互与视觉基准，平台 UI 对照基准原型验收 | 不满足不得发布 |

配套规则：

- **平台自文档**：各平台实现细节维护在 `apps/<platform>/README.md` 与 `ARCHITECTURE.md`；平台特有内容**不回写** specs，只通过 10_platform 登记差异。
- **冲突裁决链**：02_product + 03_flow → 07_design_system → 10_platform → 各 app 自述 → 仓库 legacy 文档。
- **新平台接入流程**：读 02/03（产品）→ 10_platform 三查（新增平台先补能力矩阵行）→ 按基准原型实现 → 09_test 标准验收。

## 目录 ↔ SOP 阶段对照

| 目录 | SOP 阶段 | 内容 | 状态 |
|---|---|---|---|
| 00_context/ | Phase 1 项目扫描 | PROJECT_CONTEXT / TECH_STACK / ASSET_INVENTORY / DEPENDENCY_LIST | ✅ 2026-09-02 补齐 |
| 01_reverse/ | Phase 2 逆向分析 | REVERSE_ANALYSIS.md（10 页/30 功能/数据模型/未完成能力；对象为旧 uniapp 实现，作为产品恢复依据保留） | ✅（历史记录，不回写；与现状的差异以 02_product/PRD.md 变更记录为准） |
| 02_product/ | Phase 3 PRD 恢复 | PRD.md + **产品模型五件套**（PRODUCT_MODEL / FEATURE_MAP / BUSINESS_RULE / DATA_MODEL / STATE_MODEL，规范 v2.0 §2 收口，2026-09-03 补齐后三件） | ✅（含跨平台扩展变更记录行） |
| 03_flow/ | Phase 4 流程与交互恢复 | USER_FLOW / PAGE_FLOW / BUSINESS_FLOW / PAGE_SPEC | ✅ 2026-09-02 补齐三件套 |
| 04_architecture/ | Phase 5 架构恢复 | SYSTEM_ARCH / MODULE_ARCH / DATA_FLOW / STATE_MACHINE（MODULE_ARCH 描述旧 uniapp 实现，产品级结论以 02/03 为准） | ✅ 2026-09-02 补齐 |
| 05_sequence/ | Phase 6 时序图恢复 | SEQUENCE_DIAGRAMS.md（8 图：扫描/GATT/读写监听/重连/配网/诊断/OTA/广播） | ✅ 2026-09-02 补齐 |
| 06_review/ | Phase 8 产品优化 + 评审规范 §15 收口 | PRODUCT_REVIEW / UX_REVIEW / IA_REVIEW + DATA_STORAGE_REVIEW / STATE_REVIEW / PERMISSION_REVIEW（评审规范 §15 六文件齐备，USER_FLOW 维度由 UX_REVIEW §3 旅程评估承担；含 F023 残留 5 处修正；待决策 P-04 F017 / P-05 F030） | ✅ 2026-09-02 |
| 07_design_system/ | Design System（跨平台 SOP §12，全平台共享） | TOKEN / COMPONENT / PATTERN | ✅ 2026-09-02 冻结 v1.0 |
| 08_development/ | 开发准备（开发前冻结抽取 + 工程契约，不新增功能不改逻辑） | 当前实际文件（**十五件**）：**API_SPEC** v1.1（方法与事件契约：SmartBleRuntimeApi 两级 API + Platform Ports ×9 + 事件目录 + CommandResult + 并发与所有权冻结；落位口径已切 apps/uniapp）/ **DATA_MODEL** v1.1（运行时类型与字段契约：值对象 ×9 + 事件信封 + 实体 ×26 + 技术字段标记 + 不变式 ×8；与 02_product/DATA_MODEL 双层不互相替代）/ **ERROR_CODE** v1.0（AppError 统一错误对象 + 四层分层 + 三级映射 + 业务码全集 + 恢复动作与取消语义）/ **PERMISSION** v1.0（四概念区分 + PermissionState ×7 + 按动作最小权限矩阵 ×4 环境 + 请求原则）/ **API_ACTION_MATRIX** v1.1（页面动作映射：用户动作×功能×验收×BLE.* 映射 + 错误码两层并行；**API 引用已切到 API_SPEC，保留页面动作职责**）/ **DEVICE_PROFILE_SPEC**（Profile 契约 + Smart HID 规格 + 扩展原则红线）/ **DEVICE_PROFILE_RULE**（Device 基座 × Profile 扩展四条开发铁律 DR-1～DR-4）/ **STORAGE_POLICY**（零本地持久化口径 + 敏感数据规则 + 生态负面清单）/ **DEVELOPMENT_SCOPE**（D1–D3 平台范围 + 29 功能范围 + 不做清单 + OTA 受限 + 待验证登记）/ **PLATFORM_ADAPTER_SPEC** v1.3（Base Core × 平台 Adapter 分层契约；Adapter implements PlatformPortBundle ×9；重构目标口径）/ **FEATURE_IMPLEMENTATION_MATRIX** v2.3（F001–F030 十二字段映射 + §0.4 目标模块职责映射——逐模块处置引 LEGACY_REUSE_MATRIX）/ **RUNTIME_ARCHITECTURE** v1.3（Ports & Adapters 运行时分层：事件模型、命令流结果四值、运行隔离五元组、平台端口拆分、依赖禁令；原工程内重构目标）/ **IMPLEMENTATION_TARGET** v1.2（工程实现目标冻结：BASELINE_COMMIT=2b25725、PRODUCT_SOURCE=docs/specs、TARGET_APP_ROOT=apps/uniapp 原工程内重构、PROTOTYPE_SOURCE、SHARED_CORE_ROOT=core 复用须契约测试；不创建平行新工程）/ **PLATFORM_CAPABILITY_DECISION**（C1/C3 裁决冻结：supported_limited / supported_foreground，真机证据待补）/ **LEGACY_REUSE_MATRIX**（08-G0.1 新增：旧代码逐模块复用矩阵——保留/包装/重构/重写/删除/待验证，无证据标【待验证】）。**口径（08-G0/G1）**：API_ACTION_MATRIX = **页面动作映射**；API_SPEC = **方法与事件契约**——两者不得互相替代。 | ✅ 契约文档齐备（08-G1，2026-09-03）· **08-G0.1 方向纠偏后工程契约侧 = CONDITIONAL PASS**（待 LEGACY_REUSE_MATRIX 逐项裁定深化 + 四件套按原工程内重构口径完善；改版编码另等待 09_test 真实点击基线固化，见 [DEVELOPMENT_READINESS_FINAL](06_review/DEVELOPMENT_READINESS_FINAL.md) §0） |
| 09_test/ | 验收与测试 | COVERAGE_CHECKLIST.md / HTML_V0_ACCEPTANCE.md / HTML_QA_REPORT.md（标准 v1.0 质量门禁 · Level 3） | ✅ V0 验收完成 |
| 10_platform/ | 平台扩展分析（跨平台 SOP §8–§11） | PLATFORM_EXTENSION.md（四平台能力矩阵/差异设计/优先级建议 D1–D3） | ✅ 2026-09-02 |
| 11_ecosystem/ | 生态级规范（Smart BLE 多语言家族，2026-09-03 用户三份入库） | API_UNIFIED_SPEC_v1.0（BLE.* 统一接口）/ PLATFORM_CAPABILITY_MATRIX_v1.0（12 平台能力分级）/ FEATURE_CHECKLIST_v1.0（BLE-001～013 全集）——**原文逐字入库**；README 定位 + ALIGNMENT_NOTES 对齐分析（平台映射 / 冲突清单 C1–C7 / 功能与 API 映射） | ✅ 2026-09-03 |
| （Phase 7 HTML V0） | prototype/v0-old/app-prototype.html | 旧产品镜像原型（已验收，冻结不改） | ✅ |
| （基准原型 V1） | prototype/v1-new/ | 高保真基准原型（按 Base Prototype 规范 v1.0；吸收 06_review B 类 + QA Q1/Q2/Q3；Playwright 26/26 + 视觉复核通过） | ✅ 2026-09-02 |
| （平台扩展原型） | prototype/platform/{app,wechat,web,desktop}/ | **四平台齐备（2026-09-03 按三规范重构；同日走查修正三项）**，每平台 = `low-fi/`（线框：页面×状态×流程）+ `high-fi/`（正式实例）+ 四份说明文档（PLATFORM_SPEC / PAGE_SPEC / FLOW / COMPONENT_RULE）+ README（含三查与验证记录）。实现形态：`wechat/` = 基准内核（v1.0.1）+ wxhost.js 覆写层（宿主系统维度）+ 客户端胶囊示意；`app/` = 基准内核 + android.js 覆写层（权限链/系统配对/广播增强/系统分享，基线零改动）；`desktop/` = 基准内核 + desktop.js 覆写层（配对码扫码为主+粘贴兜底/P006 三栏/退出确认）+ 窗口 chrome；`web/` = 独立「GATT 调试器」子集内核（6 屏，缺失域显式 ✗+指引；W2 设备卡同基准 C1 口径）。**原型齐备 ≠ 开发排期**：D1 开发首批（微信+Android）不变，D2/D3 见 10_platform §6 | ✅ 2026-09-03（修正轮） |

## 公共 vs 平台职责

| 内容 | 归属 |
|---|---|
| 产品定义（PRD/功能/页面/流程/交互/数据口径） | **specs/**（公共） |
| 设计系统（Token/组件/模式） | **specs/07_design_system**（公共） |
| 平台能力矩阵、差异设计、三查结论 | **specs/10_platform**（公共，平台各有分节） |
| 动作-接口映射、Profile 规格/规则、存储策略、开发范围冻结、分层与功能映射、工程实现目标与旧代码复用矩阵（原工程内重构）、运行时分层（Runtime v1.3 事件模型与平台端口）、平台能力裁决（C1/C3）、方法与事件契约（API_SPEC）、运行时类型契约（DATA_MODEL）、错误分层（ERROR_CODE）、权限矩阵（PERMISSION） | **specs/08_development**（公共，当前十五件：开发四件套 + 动作/Profile/存储/范围/分层/功能映射/裁决/实现目标/复用矩阵/运行时分层） |
| 交互与视觉基准 | **specs/prototype**（公共） |
| 平台代码实现、构建、平台 Bug、平台性能 | **apps/&lt;platform&gt;/** |
| 平台实现说明（README/ARCHITECTURE） | **apps/&lt;platform&gt;/** |

## 迁移映射（旧路径 → 新路径）

2026-09-02（SOP 内部整理）：

| 旧 | 新 |
|---|---|
| docs/reverse-analysis.md | 01_reverse/REVERSE_ANALYSIS.md |
| docs/product/prd.md | 02_product/PRD.md |
| docs/product/page-spec.md | 03_flow/PAGE_SPEC.md |
| prototype/coverage-checklist.md | 09_test/COVERAGE_CHECKLIST.md |
| docs/review/html-v0-acceptance.md | 09_test/HTML_V0_ACCEPTANCE.md |
| prototype/app-prototype.html | prototype/v0-old/app-prototype.html |

2026-09-02（公共化迁移）：

| 旧 | 新 |
|---|---|
| apps/uniapp/docs/ | docs/specs/ |
| apps/uniapp/prototype/ | docs/specs/prototype/ |

## 历史文档关系

- `docs/product-contract/`：前代「UniApp 主线契约」正典，2026-09-02 起权威移交本目录，降为历史参考（其平台矩阵/测试门禁内容后续择要并入 10_platform 与 08_development）。
- `docs/product-reconstruction/`：更早的产品重构系列，历史参考。
- 与仓库内其他 legacy 文档冲突时，一律以本目录为准。

## 生效的产品决策

- **2026-09-02（用户决策）**：移除「已配置 Smart HID」首页面板、PAGE004 历史页、F023 与全部本地持久化（→ 零本地存储形态）。详见 02_product/PRD.md 变更记录。
- **2026-09-02（用户指令）**：启动跨平台扩展——依据跨平台扩展 SOP v1.0 与 Base Prototype 规范 v1.0；产品核心逻辑/数据模型/核心流程不变，平台为扩展层。平台范围与优先级待决策（D1–D3，见 10_platform/PLATFORM_EXTENSION.md §6）。
- **2026-09-02（用户决策）**：产品文档公共化——specs 升格为仓库级全平台规范，所有 `apps/*` 按「平台开发总纲」开发。
- **2026-09-02（用户决策 D1）**：平台范围首批 = 微信小程序 + App·Android；Desktop 待技术 spike（D2 开放）、Web 暂缓（D3=b）；06_review 遗留 P-04（F017 独立入口）/ P-05（F030 i18n）关闭：均不做。平台扩展原型首批交付 prototype/platform/{wechat,app}/，详见 10_platform/PLATFORM_EXTENSION.md §6。
- **2026-09-03（用户指令，按三规范重构）**：产品模型补齐五件套（BUSINESS_RULE/DATA_MODEL/STATE_MODEL 新建）；平台原型层四平台齐备——每平台独立 HTML（low-fi + high-fi）+ 专属说明文档四件套（用户反馈：「不同平台最好是单独的 HTML，再一份专门的说明文档…其他平台也没漏了吧」）。**原型完整性与开发排期解耦**：D1/D2/D3 决策不变。
- **2026-09-03（用户走查修正，三项）**：① 确立 Profile 扩展原则——「特殊设备是标准设备的扩展，需要有原来的所有功能」，基准 devCard v1.0.1 恢复 SHID 卡标准「连接」入口，三平台内核字节重同步、Web W2 设备卡同口径；② 「SHID 配网，配对码是通过扫描二维码」——Desktop 主路径改摄像头扫码，粘贴/手输降为兜底（10_platform §2.4 修订）；③ 「微信小程序是有区分安卓和 iOS 或其他平台上的微信小程序」——新增宿主系统维度（安卓/iOS 真机/开发者工具，旧代码 isWeixinDevTools/osName 佐证），wechat 实例 wxhost.js 覆写层。
- **2026-09-03（用户走查修正·追加）**：④ 「desktop 也需要区分系统吧，Windows、Linux、Mac」——Desktop 新增操作系统维度（macOS CoreBluetooth / Windows WinRT / Linux BlueZ，10_platform §2.4），desktop.js OS 注册表 + P009 切换入口 + 窗口 chrome 三形态（os-mac/os-win/os-linux，系统还原层）+ P008 原生层徽标与 Linux BlueZ【待验证】提示；Linux 广播外围受 BlueZ/内核权限影响两处口径一致。
- **2026-09-03（用户指令·生态规范三份入库）**：Smart BLE 生态规范三份（API 统一接口 / 平台功能差异矩阵 / 功能点清单）原文入 `11_ecosystem/`——定位为**生态级上位基线**，本项目=其中 uni-app 实现线；**产品范围仍以 02_product 为准、D1–D3 排期不变、不改 apps/ 代码（本阶段仅文档+原型呈现）**。原型层消费（v1.2.0）：wechat/app/desktop 三实例评审栏注入「生态能力矩阵」卡、web W4 补矩阵第二来源；矩阵与实证冲突处以旧代码实证为准、不翻转已验证行为（**其中 C1 微信广播发送 / C3 微信多设备已于 08-G0 裁决，见下**；其余待裁决项维持登记）。08_development 四件套后续以三份为直接输入（API_SPEC 吸收 BLE.* 接口、ERROR_CODE 吸收 BLE_001～008 分层）。
- **2026-09-03（开发前冻结四件套入库）**：新增 `08_development/` 四文件——API_ACTION_MATRIX（用户动作×功能×验收×BLE.* 映射 + 错误码两层并行）/ DEVICE_PROFILE_SPEC（Profile 契约 + Smart HID 规格 + 扩展原则红线）/ STORAGE_POLICY（零本地持久化口径）/ DEVELOPMENT_SCOPE（D1–D3 + 29 功能范围 + 不做清单 + OTA 受限 + 待验证登记）。**性质为冻结抽取：不新增功能、不改变产品逻辑，全部结论引用 02_product / 03_flow / 10_platform / 11_ecosystem 来源章节**；文件名与原设想（API_SPEC/ERROR_CODE/PERMISSION）不同，当时将 BLE.* 接口与错误码分层并入 API_ACTION_MATRIX §4/§5，实体契约仍以 02_product/DATA_MODEL 为正典。**（此「并入」口径已被 08-G0 修订——API_ACTION_MATRIX 为页面动作映射、不能替代方法与事件契约，四件套仍需独立产出，见下条。）**
- **2026-09-03（用户指令·uni-app 开发映射两件）**：新增 `08_development/` 两文件——PLATFORM_ADAPTER_SPEC（Base Core × 平台 Adapter 分层契约：职责二分 / 微信 wxhost 规则（含宿主系统维度）/ Android 规则（六覆写点）/ 禁止修改项 PZ-1～9 + 分层判定速查）/ FEATURE_IMPLEMENTATION_MATRIX（F001–F030 × 页面/UI组件/状态/Store/Service/BLE API/Platform Adapter/测试入口 九列映射，含 F023 已移除与 F030 不做两条红线行）。**性质为开发契约收口：不新增功能、不改产品逻辑、不引入后端与持久化，全部结论引用既有正典章节**；进入 uni-app 开发阶段与既有五件（API_ACTION_MATRIX / DEVICE_PROFILE_SPEC / DEVICE_PROFILE_RULE / STORAGE_POLICY / DEVELOPMENT_SCOPE）配套使用。
- **2026-09-03（用户指令·08-G0 工程实现基线纠偏与旧工程隔离冻结；其中「平行新建」方向已于 08-G0.1 废弃，见下条）**：① 工程目录冻结——当时口径为旧工程只读 + 平行新工程唯一写入（**08-G0.1 起改为 apps/uniapp 原工程内重构**）；② **Runtime 依赖模型纠偏**——废弃旧线性链 `services → core → 平台 API`，改 Ports & Adapters（命令流/事件流双通道 + 五条依赖禁令 + 目标决定 vs legacy reference 分类），[RUNTIME_ARCHITECTURE](08_development/RUNTIME_ARCHITECTURE.md) 升 **v1.1**；③ **C1/C3 裁决冻结**——微信外围广播 supported_limited / 微信多设备 supported_foreground（真机证据待补，新增 [08_development/PLATFORM_CAPABILITY_DECISION](08_development/PLATFORM_CAPABILITY_DECISION.md)，同步 ALIGNMENT_NOTES / 10_platform / DEVELOPMENT_SCOPE / PLATFORM_ADAPTER_SPEC 等）；④ **PRD 零持久化残句修正**（§1.3/§1.4 两句）；⑤ **准入拆分两轨**——Product & Prototype Readiness = PASS / Engineering Contract Readiness = CONDITIONAL PASS（09_test 真实点击基线为功能迁移前置），[DEVELOPMENT_READINESS_FINAL](06_review/DEVELOPMENT_READINESS_FINAL.md) §0；⑥ **口径澄清**——API_ACTION_MATRIX = 页面动作映射，API_SPEC = 方法与事件契约，两者不得互相替代。全程仅改 docs/specs，未提交 git（基线 `2b25725`）；修改清单与核验结果见 [06_review/ENGINEERING_BASELINE_CORRECTION_REPORT](06_review/ENGINEERING_BASELINE_CORRECTION_REPORT.md)。
- **2026-09-03（用户指令·08-G1 工程契约四件套生成与事件模型收口；其「Engineering Contract Readiness = PASS」状态已于 08-G0.1 回落 CONDITIONAL PASS，见下条）**：① **工程契约四件套生成**——[API_SPEC](08_development/API_SPEC.md)（SmartBleRuntimeApi 两级 API + Platform Ports ×9 + 事件目录 + CommandResult 四值 + 并发与所有权 12 条冻结 + capability 结构化）/ [DATA_MODEL](08_development/DATA_MODEL.md)（运行时类型契约：值对象 ×9 + 事件信封 + 实体 ×26 + 技术字段四标记 + 不变式 ×8）/ [ERROR_CODE](08_development/ERROR_CODE.md)（AppError + 四层分层 + 三级映射 + 业务码全集 + 取消语义）/ [PERMISSION](08_development/PERMISSION.md)（PermissionState ×7 + 按动作最小权限矩阵 + 请求原则）；② **Runtime v1.2 事件模型收口**——事件来源二分（PlatformEvent ×7 / DomainEvent ×13 → AppEvent → Handler/Reducer → Store）、命令流结果四值（accepted/rejected/cancelled/completed，ACT 转 DomainEvent 落 Store）、运行隔离五元组（operationId/sessionId/generation/timestamp/source，P005 教训抽象、原型变量名不升格接口名）；③ **平台端口拆分**——PlatformPortBundle ×9（Ble/Permission/QrScan/Share/Clipboard/FilePicker/ExternalNavigation/DeviceInfo/Lifecycle）；④ **IMPLEMENTATION_TARGET v1.1**——第三实现线禁令收窄为「uni-app D1 实现线」，不误伤 apps/{android,ios,flutter,desktop}；⑤ **新增 Feature Implementation Execution Gate = WAITING**——三轨准入（产品/原型 PASS · 工程契约 PASS · 功能实现等待 09_test 真实点击基线固化），[DEVELOPMENT_READINESS_FINAL](06_review/DEVELOPMENT_READINESS_FINAL.md) §0；API_ACTION_MATRIX v1.1 / FEATURE_IMPLEMENTATION_MATRIX v2.2 引用切至四件套。全程仅改 docs/specs，未提交 git（基线 `2b25725`）；产物清单与核验见 [06_review/ENGINEERING_CONTRACT_FOUR_PACK_REPORT](06_review/ENGINEERING_CONTRACT_FOUR_PACK_REPORT.md)。
- **2026-09-03（用户指令·08-G0.1 方向纠偏：由平行新建改为原工程内重构）**：① **项目定位纠正**——Smart BLE 是 `apps/uniapp` 旧工程改版（in-place refactor），不是平行创建第二套 App：**不创建平行新工程目录、不新增第二套 manifest/project.config/AppID、不维护两套 uni-app 工程**；② **五常量重冻结**（[IMPLEMENTATION_TARGET](08_development/IMPLEMENTATION_TARGET.md) 升 **v1.2**）：BASELINE_COMMIT=`2b25725`（旧版本由 Git 基线保存，不以目录复制保存）/ PRODUCT_SOURCE=docs/specs / TARGET_APP_ROOT=**apps/uniapp**（门禁通过后在专用开发分支原路径重构）/ PROTOTYPE_SOURCE=docs/specs/prototype / SHARED_CORE_ROOT=core；③ **废止 legacy-read-only 永久只读隔离**——改为 pre-development freeze（开发前暂不修改）+ implementation target（门禁通过后原路径重构）两态口径；④ **新增 [LEGACY_REUSE_MATRIX](08_development/LEGACY_REUSE_MATRIX.md)**——旧代码逐模块裁定 保留/包装/重构/重写/删除/待验证：稳定 BLE Runtime/写队列/重连/协议/原生插件可经测试后复用，不默认全保留、不默认全重写、无证据标【待验证】；⑤ **正典同步**——RUNTIME_ARCHITECTURE v1.3 / PLATFORM_ADAPTER_SPEC v1.3 / FEATURE_IMPLEMENTATION_MATRIX v2.3 / API_SPEC v1.1 / DATA_MODEL v1.1 / 04_architecture 两件头注 / DEVELOPMENT_READINESS_FINAL（工程契约侧回落 **CONDITIONAL PASS**：待复用矩阵裁定深化 + 四件套按 in-place 口径完善；四件套与真实点击测试完成后允许在 apps/uniapp 开始改版）；⑥ 08-G0/08-G1 历史台账补「08-G0.1 后读法」追记（台账原文不回写）。全程仅改 docs/specs，未提交 git（基线 `2b25725`）；修改清单与核验见 [06_review/IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT](06_review/IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT.md)。
