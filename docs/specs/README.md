# Smart BLE 产品基准规范（specs）

> **全平台公共文件 · 单一事实源。** `apps/{uniapp,android,ios,flutter,desktop}` 所有平台实现一律按本规范开发。
> 组织依据：《旧 App AI 重构 SOP v2.0》+《旧产品原型跨平台扩展 SOP v1.0》+《产品基准原型 Base Prototype 规范 v1.0》+《AI 产品重构逻辑评审规范 v1.0》+《AI-Native 应用生成平台架构规范 v1.0》（平台级上位框架，本目录为其在 smart-ble 的单项目实例化，定位说明见下）+《产品模型 Product Model 规范 v2.0》+《多平台 HTML 原型生成规范 v1.0》+《平台设计说明规范 v1.0》（2026-09-03 并入：产品模型五件套 / 每平台 low-fi+high-fi / 每平台四份说明文档）。
> 原则：**先有产品再有平台**——本目录定义与平台无关的产品基准（功能/页面/流程/交互/数据口径/设计系统），平台只是扩展层，不反向改变产品模型、数据模型与核心流程。
> 2026-09-02 由 `apps/uniapp/docs` + `apps/uniapp/prototype` 升格迁入（用户决策：多平台仓库，产品文档必须公共化）。

## 事实链与路线

事实链：00_context / 01_reverse（事实）→ 02_product（产品）→ 03_flow（流程交互）→ 04–05（技术视图）→ 06_review（审查）→ 09_test（V0 验收）→ 10_platform（平台扩展分析）。

融合路线：产品恢复（Phase 1–8 ✅）→ 平台扩展分析（✅）→ Design System（07_，✅ 冻结 v1.0）→ 基准原型 V1（prototype/v1-new，✅ 用户走查门禁通过）→ **平台扩展原型（✅ 四平台齐备 2026-09-03，按三规范重构：每平台 low-fi + high-fi + 四份说明文档；原型齐备 ≠ 开发排期，D1 开发首批=微信+App·Android 不变）→ 平台扩展检查（⏳ 待用户走查）→ 开发准备（08_development）**。

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
| 08_development/ | 开发准备 | API_SPEC（BLE GATT 契约，本产品无 HTTP）/ DATA_MODEL / ERROR_CODE / PERMISSION | ⏳ 未开始 |
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
| BLE 协议契约、错误码、权限清单 | **specs/08_development**（公共，待产出） |
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
- **2026-09-03（用户指令·生态规范三份入库）**：Smart BLE 生态规范三份（API 统一接口 / 平台功能差异矩阵 / 功能点清单）原文入 `11_ecosystem/`——定位为**生态级上位基线**，本项目=其中 uni-app 实现线；**产品范围仍以 02_product 为准、D1–D3 排期不变、不改 apps/ 代码（本阶段仅文档+原型呈现）**。原型层消费（v1.2.0）：wechat/app/desktop 三实例评审栏注入「生态能力矩阵」卡、web W4 补矩阵第二来源；矩阵与实证冲突处（C1 微信广播发送 / C3 微信多设备等，见 11_ecosystem/ALIGNMENT_NOTES §2）**以旧代码实证为准标注「待裁决」，不翻转已验证行为**。08_development 四件套后续以三份为直接输入（API_SPEC 吸收 BLE.* 接口、ERROR_CODE 吸收 BLE_001～008 分层）。
