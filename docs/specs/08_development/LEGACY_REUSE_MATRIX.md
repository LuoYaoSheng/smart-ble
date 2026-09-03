# LEGACY_REUSE_MATRIX —— 旧代码复用矩阵（apps/uniapp 逐模块处置）

> 版本：1.0（框架 + 初判）· 生成日期：2026-09-03（08-G0.1 方向纠偏：由平行新建改为原工程内重构，用户任务书）
> 性质：**不新增功能、不新增页面/流程/状态；本矩阵只裁定旧代码「怎么处置」，不产生任何产品正文**。旧代码 = commit `2b25725` 基线下的 `apps/uniapp` 与 `core/` 现状（BASELINE_COMMIT，[IMPLEMENTATION_TARGET](IMPLEMENTATION_TARGET.md) v1.2 §0）。
> 输入：[04_architecture/MODULE_ARCH](../04_architecture/MODULE_ARCH.md) §1/§3（模块树与职责表，legacy 实证）· [SYSTEM_ARCH](../04_architecture/SYSTEM_ARCH.md)（依赖形态）· `tests/target/**`（contract ×7 / unit ×24 / integration ×15 / firmware / harness / pages / release）· `tests/e2e/spec/ble-flow.spec.js`（Playwright 冒烟）· `apps/uniapp` 内 jest ×2 · [RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.3（目标分层）· [PLATFORM_ADAPTER_SPEC](PLATFORM_ADAPTER_SPEC.md) v1.3 · [PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md)（C1/C3）
> 状态：**v1.0 为框架与初判**——逐项「处理决定」为基于现有证据的初步裁定，深化复核（含逐文件级裁定与真机/真按钮验证）是进入改版前的既定下一步（[DEVELOPMENT_READINESS_FINAL](../06_review/DEVELOPMENT_READINESS_FINAL.md) §0 条件 6c）。

## 0. 编制规则

1. **不默认全保留**——旧代码不是需求事实源（PRODUCT_SOURCE = docs/specs），与正典冲突的旧实现按「重构/重写」处置。
2. **不默认全重写**——Ports & Adapters 是原工程重构目标，不是从零重写指令（[IMPLEMENTATION_TARGET](IMPLEMENTATION_TARGET.md) v1.2 §2 规则 2）；稳定资产经测试后复用。
3. **没有验证证据的标【待验证】**——证据 = 可指认的测试/审计/裁决条目；grep 未引用、无测试覆盖的死代码候选同样标【待验证】后走删除复核。
4. **不新增功能**——矩阵只决定「保留/包装/重构/重写/删除」，不给旧模块加职责。
5. 每项裁定均须在改版分支实施时对应「所需测试」列先行或同步落地（测试先行纪律，09_test 真实点击基线为总前置）。

**处理决定六值定义**：

| 值 | 含义 |
|---|---|
| 保留（retain） | 原样进入改版后工程（允许搬移路径/改 import），行为与实现不改 |
| 包装（wrap） | 实现保留，外面包一层目标架构接口（Port/Adapter/门面）满足依赖禁令 |
| 重构（refactor） | 职责与行为保持，内部结构/依赖方向按目标规范调整 |
| 重写（rewrite） | 职责保留但按正典重新实现（旧实现仅作参考证据） |
| 删除（remove） | 正典无此需求或已被决策移除，直接删除不复刻 |
| 待验证 | 缺证据或冲突未裁决，先补证据再定 |

## 1. 工程身份与入口

### 1.1 manifest.json / project.config.json / pages.json / sitemap.json / App.vue / main.js / index.html / uni.scss / app_theme.css

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/{manifest.json, project.config.json, pages.json, sitemap.json, App.vue, main.js, index.html, uni.scss, app_theme.css}` |
| 当前职责 | 应用身份（AppID/名称/版本）、微信工程配置、页面路由与 tabBar、入口与全局样式 |
| 已有验证证据 | 现网可构建可发布（基线 `2b25725` 为已发布形态）；pages.json 路由与 PAGE_SPEC §0.1 已比对（PAGE_CAPABILITY_COVERAGE_AUDIT §3 页面 9/9 对应） |
| 与新规范的一致性 | **一致（须局部修订）**——应用身份、AppID、构建/发布入口、工程路径保持不变（[IMPLEMENTATION_TARGET](IMPLEMENTATION_TARGET.md) v1.2 §1 规则 4）；pages.json 需随页面重构同步（P004 已移除、路由规则 PAGE_FLOW §1/§2） |
| 处理决定 | **保留（局部重构）**——身份与构建入口不动；pages.json 随页面改版同步修订 |
| 目标落位 | 原路径原文件（TARGET_APP_ROOT 根） |
| 迁移风险 | 低——不新增第二套 manifest/AppID 即无身份分叉；pages.json 改错路由属可回退（Git 分支） |
| 所需测试 | 构建冒烟（微信+App·Android 双端）+ 路由与 tabBar 对照 PAGE_FLOW §1/§2 的契约测试（tests/target/contract/pages-target.test.mjs 扩展） |

### 1.2 config/（product.js / release-metadata.generated.*）与 utils 瞬态

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/config/product.js`、`config/release-metadata.generated.{js,json}`、`replace_about.py`、`env.js`、`vite.config.js`、`jest.config.js`、`uni.promisify.adaptor.js` |
| 当前职责 | 品牌信息/关联小程序清单（F028 推广跳转数据源）、发布元数据、About 页替换脚本、自动化环境、构建与测试配置 |
| 已有验证证据 | tests/target/release/{release-artifacts,links-and-qr,public-claims}.test.mjs 覆盖发布产物与外链声明；version-release-metadata / version-page-model 单测在位 |
| 与新规范的一致性 | 基本一致；`replace_about.py` 为一次性工具脚本（生成物流），`env.js` 为 HBuilderX 自动化配置——目标架构未要求变化 |
| 处理决定 | config/ **保留**；`replace_about.py`【待验证】（若无再生成需求→删除）；`env.js`/`jest.config.js`/`vite.config.js` **保留**（改版分支继续用） |
| 目标落位 | 原路径 |
| 迁移风险 | 低 |
| 所需测试 | release 套件回归 + About/版本页渲染（version-page-model-target.test.mjs） |

## 2. UI 层（页面与组件）

### 2.1 pages/（10 页：4 tab + 6 二级，P004 历史页文件仍在树内）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/pages/{index,broadcast,connected,device,hid,about}/**`（10 个 .vue + 2 个 jest 测试） |
| 当前职责 | 全部页面承载（P001 扫描 / P002 配网 / P003 SHID 详情 / P005 诊断 / P006 GATT / P007 已连接 / P008 广播 / P009 关于 / P010 版本；hid/history.vue 为已移除的 P004 残留文件） |
| 已有验证证据 | 页面↔功能承载审计（PAGE_CAPABILITY_COVERAGE_AUDIT §3：9 页与 PAGE_SPEC 一一对应）；apps 内 jest ×2（index.test.js / page-flow.test.js）；tests/target/pages（pages-contract.test.mjs + manifest/schema + page-driver 契约） |
| 与新规范的一致性 | **部分一致**——页面集合与路由合规；但交互/视觉须对齐 prototype（PROTOTYPE_SOURCE）与 07_design_system；逻辑编排须从「composables 直连」迁到 Application Action/Handler（RUNTIME_ARCHITECTURE v1.3 §2） |
| 处理决定 | **重构**（逐页：结构保留、编排与状态接线按目标规范改）；`pages/hid/history.vue` **删除**（P004 已移除，DEVELOPMENT_SCOPE §4 N-4 不得复刻） |
| 目标落位 | TARGET_APP_ROOT `pages/`（原路径渐进重构，非重写） |
| 迁移风险 | 中——页面是用户可见面，须对照原型逐页验收；P005/P006 类会话状态竞态须真实点击回归（P005/P006 修复报告教训） |
| 所需测试 | 每页对照原型的真实点击验收（09_test 基线组：F020 四结果 / P005 两路径 / P006 三路径 / 空态组）+ pages-contract 契约测试持续在位 |

### 2.2 components/（15 组件：common×4 / device-card / filter-panel / scan×2 / service-panel / write-dialog / log-panel / ota-dialog / hid×2 / about）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/components/**`（15 个 .vue） |
| 当前职责 | 设计系统组件实现（对应 07_design_system A/B/C/D 分层） |
| 已有验证证据 | 07_design_system/COMPONENT.md 页面↔组件授权表已逐组件比对（08-G0 前冻结抽取）；空态/错误横幅等在 jest+原型侧有行为证据（EMPTY_COMPONENT 系列修复为原型侧，旧 App 侧无独立组件测试） |
| 与新规范的一致性 | **部分一致**——组件职责与授权表一致；实现须对齐 v1-new 原型视觉（Token 化）与 props 进/事件出纪律 |
| 处理决定 | **重构**（Token/交互对齐原型；授权表圈外拼装清零）；个别与原型差异过大者升**重写**（逐个在深化轮定） |
| 目标落位 | TARGET_APP_ROOT `components/`（+ Shared Core 资产引用） |
| 迁移风险 | 中——视觉回归工作量大但有原型基准与授权表约束 |
| 所需测试 | 组件级视觉对照（原型截图基准）+ 页面集成真实点击 |

## 3. 编排与状态层

### 3.1 composables/（×4：use-ble-scan / use-device-session / use-broadcast-session / use-smart-hid-provisioning）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/composables/**`（4 文件，280/375 行两级最大） |
| 当前职责 | 页面级编排：扫描、GATT 会话、广播、SHID 配网全流程（旧链 `pages → composables → store/services` 的中继层） |
| 已有验证证据 | tests/target/integration/{scan-runtime,read-write-runtime,smart-hid-provision,broadcast-observer}-target.test.mjs 覆盖对应域行为；MODULE_ARCH §1 行数实证 |
| 与新规范的一致性 | **不一致（依赖形态）**——目标架构编排归 Application Action/Handler（命令结果转 DomainEvent 再落 Store，RUNTIME_ARCHITECTURE v1.3 §2.1），composables 直连 Service/Store 的旧形态废弃（§0.2） |
| 处理决定 | **重构**（职责与流程逻辑保留，改写为 Action/Handler 形态；文件数不承诺同名同数） |
| 目标落位 | Application 层（Base Core） |
| 迁移风险 | 中高——配网全流程（375 行）迁移须逐步走，配 S1–S6 旅程级回归 |
| 所需测试 | 对应 integration 套件回归 + S1–S6 真实旅程点击（09_test） |

### 3.2 store/（Pinia ×2：ble.js 248 行 / hid.js 199 行）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/store/{ble.js, hid.js}` |
| 当前职责 | 扫描会话 + 已连接表投影（ble）；配网会话/进度/诊断（hid）——内存态（knownDevices 已随 F023 移除） |
| 已有验证证据 | tests/target/unit/{session-state,smart-hid-state,history-retention}-target.test.mjs；DATA_MODEL（08_development）§实体契约已对表 |
| 与新规范的一致性 | **部分一致**——两状态域划分与目标一致（FEATURE_IMPLEMENTATION_MATRIX §0.4）；但旧 store 可能 import service（违反 R-2 禁令），写入路径须改为只经 Application Handler |
| 处理决定 | **重构**（State 形状对齐 DATA_MODEL 实体 ×26；写入通道改 Handler-only；依赖禁令 R-1/R-2 清零） |
| 目标落位 | Application/State 层（两状态域） |
| 迁移风险 | 中——状态形状变化波及全部消费组件 |
| 所需测试 | 状态单测（session-state/smart-hid-state 扩展）+ DATA_MODEL 不变式 ×8 断言 |

## 4. 领域服务层（services/）

### 4.1 services/ble-runtime/（16 文件：平台注入/会话注册表/连接发现/写队列/重连/扫描会话/广告解析/过滤/显示名/GATT 编解码/错误/日志脱敏）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/services/ble-runtime/**`（index.js 878 行等 16 文件） |
| 当前职责 | BLE 运行时核心：Session Registry、Write Queue、ReconnectManager/Policy、ScanSession、advertisement 解析、device-filter、display-name、gatt-codec、platform 注入 |
| 已有验证证据 | **最强证据区**——tests/target/unit ×10+ 直接对应（session-registry / write-queue / reconnect-manager / reconnect-state / advertisement / device-filter / device-display-name / device-name / gatt-codec / connection-discovery）+ integration（connection-runtime / multi-device / notify-routing / read-write-runtime / scan-runtime / lifecycle-cleanup / service-discovery）+ contract（protocol-target / target-contract / traceability） |
| 与新规范的一致性 | **高**——职责与六域服务口径吻合（RUNTIME_ARCHITECTURE v1.3 §1.3）；唯一结构差异：平台访问须经 PlatformPortBundle（platform.js 注入形态 → Port 接口化），Store import 须清零 |
| 处理决定 | **保留 + 局部包装**（稳定运行时原样复用；平台注入点包装为 BlePlatformPort 依赖；R-1/R-2 违例点局部重构）——IMPLEMENTATION_TARGET v1.2 §2 规则 5「稳定 BLE Runtime 经测试后复用」的直接适用对象 |
| 目标落位 | Domain Service · GATT 会话域/扫描域（Base Core） |
| 迁移风险 | 低中——改动集中于注入接口与依赖方向，行为有测试网兜底 |
| 所需测试 | 既有 unit/integration 套件全量回归 + Port 替身契约测试（RUNTIME_ARCHITECTURE v1.3 §6） |

### 4.2 session-registry（会话注册表，ble-runtime 内 + services/connected-session-registry.js）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/services/ble-runtime/session-registry.js`（345 行）、`services/connected-session-registry.js` |
| 当前职责 | 已连接设备会话唯一事实源；多会话并发管理（C3 前台多设备的实现基础） |
| 已有验证证据 | session-registry-target / session-state-target / smart-hid-session-ownership / multi-device-target 单测与集成测；C3 裁决明确「Session Registry 为唯一事实源」（PLATFORM_CAPABILITY_DECISION） |
| 与新规范的一致性 | **一致**——C3 裁决与 RUNTIME_ARCHITECTURE「事实源在 ③ Registry、UI 投影在 ② Store」口径同构 |
| 处理决定 | **保留**（两处注册表在深化轮评估是否合一，属重构级合并候选） |
| 目标落位 | Domain Service · GATT 会话域 |
| 迁移风险 | 低——行为有测试；合并须防 P006 类会话进入不一致回归 |
| 所需测试 | session 系单测回归 + P006 三路径会话真实点击 |

### 4.3 services/scan-permission.js（120 行，旧工程唯一直调 wx.\* 先例）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/services/scan-permission.js` |
| 当前职责 | 微信扫描权限查询/申请/设置页跳转 |
| 已有验证证据 | platform-permission-target.test.mjs + permission-flow-target.test.mjs（integration）；MODULE_ARCH §3 职责表 |
| 与新规范的一致性 | **不一致（位置）**——权限属平台绑定能力，目标架构归 WeChatAdapter 的 PermissionPort 实现（PLATFORM_ADAPTER_SPEC v1.3 §2；RUNTIME_ARCHITECTURE v1.3 §1.4） |
| 处理决定 | **包装迁移**（逻辑保留，包进 PermissionPort 实现；Base Core 侧只依赖 Port 接口） |
| 目标落位 | Platform Adapter · WeChatAdapter（PermissionPort）；Android 侧权限链在 AndroidAdapter 补齐（app/PLATFORM_SPEC §3） |
| 迁移风险 | 低中——双端权限矩阵以 PERMISSION v1.0 为准逐格对齐 |
| 所需测试 | permission-flow 集成回归 + 双端真机权限旅程（真机验证矩阵登记项） |

### 4.4 services/provisioning/（5 文件：profiles 注册表 / transport / orchestrator / builtins / profile-navigation）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/services/provisioning/**`（5 文件；builtins 引用 esp32-demo/profile.js 作演示 Profile） |
| 当前职责 | Profile 配网域：Profile 注册表、GATT transport、配网编排、内置 Profile、导航 |
| 已有验证证据 | smart-hid-provision-target.test.mjs（integration）+ smart-hid-workflow-target.test.mjs（unit）；contract/protocol-target 契约锁定 |
| 与新规范的一致性 | **高**——与 DEVICE_PROFILE_SPEC/RULE 的「Device 基座 × Profile 扩展」同构；DR-1～DR-4 铁律待逐条核对 |
| 处理决定 | **保留 + 局部重构**（Profile 契约对齐 core/ble-core/provisioning/profile-contract.js；DR-1～DR-4 合规核对） |
| 目标落位 | Domain Service · Profile 配网域 |
| 迁移风险 | 中——Profile 扩展红线（不破坏普通设备流程）须回归 |
| 所需测试 | provision/workflow 单测回归 + DR 红线契约测试 + S2 首次配网真实旅程 |

### 4.5 services/smart-hid/（11 文件：门面/Profile/工作流引擎/表单/诊断/错误/扫码反馈…known-devices 已移除语义）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/services/smart-hid/**`（11 文件） |
| 当前职责 | Smart HID 专属域：门面、Profile、工作流引擎、配网表单、诊断、扫码反馈 |
| 已有验证证据 | smart-hid-{state,workflow}-target 单测 + smart-hid-{provision,session-ownership}-target 集成测；P005 诊断竞态修复报告（会话级教训） |
| 与新规范的一致性 | **高**——Smart HID 规格（DEVICE_PROFILE_SPEC）即从该域实证+正典化；known_devices 持久化语义已随 F023 移除（N-4 不得复刻） |
| 处理决定 | **保留 + 局部重构**（known-devices.js 残文件**删除**；诊断域接入运行隔离五元组防 P005 类竞态） |
| 目标落位 | Domain Service · Profile 配网域（SHID）/ 诊断支撑 |
| 迁移风险 | 中——工作流引擎与配网表单状态多 |
| 所需测试 | 既有 smart-hid 套件回归 + P005 两路径+错误回路真实点击 |

### 4.6 services/broadcast/（6 文件：会话/适配器/负载预算/观察证据/校验）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/services/broadcast/**`（6 文件；负载构建复用 utils/advertising-payload.js） |
| 当前职责 | 外围广播域：广播会话、平台适配、31B 负载预算、观察证据、参数校验 |
| 已有验证证据 | broadcast-{payload,session}-target 单测 + broadcast-observer-target 集成测；C1 裁决（supported_limited，开发者工具三处拦截等行为实证） |
| 与新规范的一致性 | **高**——31B 预算/BR 规则与正典一致；平台分支（wx-peripheral/LysBlePeripheral）须收敛进 Adapter |
| 处理决定 | **保留 + 包装**（平台适配器部分包进 BlePlatformPort 外围广播能力，C1 降级链保持） |
| 目标落位 | Domain Service · 广播域 + Adapter 外围能力实现 |
| 迁移风险 | 中——C1 三处拦截与运行时探测逻辑不得翻转（实证行为不翻转） |
| 所需测试 | broadcast 套件回归 + 微信真机外围广播验证（真机矩阵） |

### 4.7 services/ota/（3 文件）+ utils/ota_manager.js

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/services/ota/{ota-manager,firmware-package,package-validator}.js`、`utils/ota_manager.js`（注入适配层，被 ota-dialog 引用） |
| 当前职责 | OTA 事务状态机（12 态）、固件包模型、六重校验 |
| 已有验证证据 | ota-{package,state,transaction}-target 单测/集成测（含 tests/target/firmware 套件：observer/ota-firmware/peripheral/serial-schema） |
| 与新规范的一致性 | **一致**——OTA 受限开放口径（DEVELOPMENT_SCOPE §5：契约照实现、端到端 BLOCKED 不提前宣告） |
| 处理决定 | **保留**（12 态契约与校验器原样；端到端 BLOCKED 状态保持） |
| 目标落位 | Domain Service · OTA 事务域 |
| 迁移风险 | 低（契约型代码）；风险在「不得提前宣告可用」纪律 |
| 所需测试 | ota/firmware 套件回归；端到端验证继续 BLOCKED 登记 |

### 4.8 散装支撑（13 文件：connected-disconnect / device-route-context / device-session-operations / device-session-ui / hid-navigation(@deprecated) / public-status / version-metadata / logger/log-redaction / wx-peripheral-mode / wx-peripheral-server / esp32-demo/profile）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/services/*.js`（散装）+ `services/{logger,esp32-demo}/` |
| 当前职责 | 横切支撑：断开汇总、路由上下文、会话操作/UI 编排、导航、公共状态投影、版本元数据、日志脱敏、微信外围双控制器、ESP32 演示 Profile |
| 已有验证证据 | public-status/version-metadata/log-redaction(g) 各有对应单测；wx-peripheral 行为被 C1 裁决引用；hid-navigation 标注 @deprecated（MODULE_ARCH §3） |
| 与新规范的一致性 | 部分一致——日志脱敏（BR-03）、版本投影与正典一致；wx-peripheral-\* 直调 wx.\* 须收敛进 Adapter；hid-navigation 已废弃 |
| 处理决定 | 逐件：log-redaction/version-metadata/public-status **保留**；wx-peripheral-\* **包装迁移**（进 WeChatAdapter 外围广播实现）；device-session-{operations,ui} 并入 Application 层**重构**；hid-navigation **删除**（@deprecated）；esp32-demo/profile【待验证】（配网演示 Profile 是否保留为 builtins 演示项，随 provisioning 深化轮裁定） |
| 目标落位 | Domain Service · 横切支撑域 / Adapter / Application 层 |
| 迁移风险 | 低——单文件职责窄 |
| 所需测试 | 对应单测回归；外围广播真机项照 C1 矩阵 |

## 5. 共享核心（SHARED_CORE_ROOT = core，仓库根层）

### 5.1 core/protocols/（4 文件：smart-ble-protocol / hid-provisioning-protocol / hid-command-schema / smart-hid-contract.lock.json）

| 字段 | 内容 |
|---|---|
| 旧路径 | `core/protocols/**`（含协议受锁镜像 lock.json） |
| 当前职责 | BLE 协议与 SHID 配网协议的跨端契约定义与受锁镜像 |
| 已有验证证据 | tests/target/contract/protocol-target.test.mjs + contract-mutations.test.mjs（契约变异测试）；smart-hid-contract.lock.json 为受锁基准 |
| 与新规范的一致性 | **一致**——Shared Core 纯逻辑定位（RUNTIME_ARCHITECTURE v1.3 §1.5）；复用前置 = 契约测试（已存在） |
| 处理决定 | **保留**（零改动复用；改动只走契约流程，SYSTEM_ARCH §2 规则 4） |
| 目标落位 | core/ 原路径（跨端资产，不进 apps） |
| 迁移风险 | 低——契约测试在位 |
| 所需测试 | protocol/contract 套件持续绿 |

### 5.2 core/ble-core/provisioning/{framing.js, framing-strategies.js, profile-contract.js}

| 字段 | 内容 |
|---|---|
| 旧路径 | `core/ble-core/provisioning/**` |
| 当前职责 | 配网帧解析/组帧策略/Profile 契约（跨端纯逻辑） |
| 已有验证证据 | serial-schema.test.mjs（firmware 套件）+ contract 套件引用；MODULE_ARCH §1 |
| 与新规范的一致性 | **一致**（Shared Core 允许清单：framing） |
| 处理决定 | **保留** |
| 目标落位 | core/ 原路径 |
| 迁移风险 | 低 |
| 所需测试 | framing/serial-schema 回归 |

### 5.3 core/ble-core/utils/{logger.ts, command-queue.ts, data-converter.ts}

| 字段 | 内容 |
|---|---|
| 旧路径 | `core/ble-core/utils/**` |
| 当前职责 | 跨端 logger、命令队列、数据转换 |
| 已有验证证据 | logging-target.test.mjs（integration）+ logging-redaction 单测；command-queue 被 ble-runtime 写队列域共用（MODULE_ARCH §1） |
| 与新规范的一致性 | **一致**（允许清单：logger/command-queue） |
| 处理决定 | **保留** |
| 目标落位 | core/ 原路径 |
| 迁移风险 | 低 |
| 所需测试 | logging 套件回归 + 写队列并发回归 |

### 5.4 core/ble-core/{components, desktop-shared, interfaces, types} 与 core/assets-generator

| 字段 | 内容 |
|---|---|
| 旧路径 | `core/ble-core/components/**`（Electron Web Components）、`desktop-shared/BleUtils.js`、`interfaces/adapter.ts`、`types/index.ts`、`core/assets-generator/**`、`core/tests/BleUtils.test.js` |
| 当前职责 | Electron 端同名双实现组件、桌面共享工具、适配器接口与类型、静态资产生成器 |
| 已有验证证据 | core/tests/BleUtils.test.js（desktop-shared）；MODULE_ARCH §4（同名双实现警告） |
| 与新规范的一致性 | components **非小程序复用，禁止误 import**（MODULE_ARCH §4）；interfaces/types 与目标 Port 接口定义的关系在深化轮对齐；assets-generator 为静态资产生产工具 |
| 处理决定 | components【待验证：不改不动，仅确认禁 import 纪律】；interfaces/adapter.ts【待验证：与 PlatformPortBundle ×9 的关系（吸收/并存）】；types **保留**；assets-generator **保留**（工具，不进运行时） |
| 目标落位 | core/ 原路径（运行时零依赖 apps） |
| 迁移风险 | 低 |
| 所需测试 | 误 import 静态检查（可加入 harness：current-suite-integrity 类） |

## 6. 原生插件

### 6.1 nativeplugins/LysBlePeripheral（Android aar + iOS）

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/nativeplugins/LysBlePeripheral/**`（package.json + android/ios） |
| 当前职责 | App·Android 端 BLE 外围广播原生能力（自定义广播数据/扫描响应；fastjson/appcompat 依赖） |
| 已有验证证据 | broadcast 域单测覆盖 JS 侧；原生侧行为由 C1 裁决语境（Android 广播为 App 端主路径）与真机使用实证；**原生侧自动化证据缺** |
| 与新规范的一致性 | **一致**——原生能力在目标架构经 Adapter（BlePlatformPort 外围能力）调用；插件本身不改 |
| 处理决定 | **保留**（manifest 原生插件引用不动；调用收敛进 AndroidAdapter）【真机验证待补：登记真机验证矩阵】 |
| 目标落位 | 原路径 + AndroidAdapter 调用点 |
| 迁移风险 | 中——原生插件与 HBuilderX 云打包链耦合，须保持构建入口不变 |
| 所需测试 | Android 真机外围广播旅程（真机矩阵）+ 构建冒烟 |

## 7. 测试与验证资产

### 7.1 tests/target/**（contract ×7 / unit ×24 / integration ×15 / firmware / harness / pages / release）与 tests/e2e/

| 字段 | 内容 |
|---|---|
| 旧路径 | `tests/target/**`、`tests/e2e/**`、`apps/uniapp/pages/**/*.test.js`（jest ×2）、`apps/uniapp/jest.config.js` |
| 当前职责 | 逆向舰队验收套件：目标契约、单元、集成、固件模拟、页驱动、发布物校验；Playwright e2e 冒烟（mock 引擎） |
| 已有验证证据 | 自身即证据（本矩阵各条目的「已有验证证据」多数指向此处）；harness/current-suite-integrity 保证套件自洽 |
| 与新规范的一致性 | **一致且必须扩展**——重构期回归网；09_test 真实点击基线是总前置（DEVELOPMENT_READINESS_FINAL §0） |
| 处理决定 | **保留 + 扩展**（随模块迁移持续绿灯；补真实点击断言组——本轮不扩，属下一步） |
| 目标落位 | 仓库根 tests/（不进 apps） |
| 迁移风险 | 低——纯增量 |
| 所需测试 | 套件自身持续可运行（harness 完整性） |

### 7.2 static/（brand / logo / share.png / tabs / placeholders / other-apps）与 styles/design-system.css

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/static/**`、`apps/uniapp/styles/design-system.css`（--ble-\* token）、`apps/uniapp/app_theme.css` |
| 当前职责 | 图标/分享图/tab 图标/占位图/关联小程序推广图（F028）；旧设计 token |
| 已有验证证据 | release 套件（links-and-qr/public-claims）覆盖外链与二维码声明；token 与 07_design_system/TOKEN 的对应关系已冻结 v1.0 |
| 与新规范的一致性 | 资产复用一致；design-system.css 须对齐 TOKEN 正典（A-07 派生色值问题属原型侧登记，App 侧同类问题随重构核对） |
| 处理决定 | static **保留**（other-apps 推广图随 F028 保留）；design-system.css **重构**（对齐 TOKEN；A-07 同类派生色清理） |
| 目标落位 | 原路径 |
| 迁移风险 | 低 |
| 所需测试 | 视觉对照 + release 套件回归 |

## 8. 死依赖与死配置（候选清单）

### 8.1 locale/、src/ 空骨架、utils/ble-utils.js、unpackage/、node_modules 内未用依赖

| 字段 | 内容 |
|---|---|
| 旧路径 | `apps/uniapp/locale/{en-US,zh-CN}.json`、`apps/uniapp/src/**`（空目录树）、`apps/uniapp/utils/ble-utils.js`、`apps/uniapp/unpackage/**`（构建产物 + assistant-verification-artifacts）、package.json 依赖（@dcloudio/uni-ui / pinia） |
| 当前职责 | locale 未接线（MODULE_ARCH §1「locale（未接线）」）；src/ 为无文件空骨架；ble-utils（UUID 中文名）grep 无 import 方（本轮实证 2026-09-03）；unpackage 为构建输出与历史自动化产物 |
| 已有验证证据 | 本轮 grep 实证：locale 无 `$t(`/import 方；src/ 0 文件；ble-utils 无引用；【删除前须在深化轮二次复核】 |
| 与新规范的一致性 | F030 i18n 不做（P-05 关闭，N-6）→ locale 与正典相反；空骨架/无引用文件与正典无关 |
| 处理决定 | locale **删除**【待验证：确认无隐藏引用后删】；src/ 空骨架 **删除**；utils/ble-utils.js **删除**【待验证：二次 grep+运行确认】；unpackage 构建产物不迁移（自然再生）；uni-ui/pinia 依赖【待验证：uni-ui 实际使用面盘点（部分页面引用）后定去留】 |
| 目标落位 | 无（删除项） |
| 迁移风险 | 低——均有 Git 基线兜底 |
| 所需测试 | 删除后全量套件回归 + 双端构建冒烟 |

## 9. 矩阵汇总（初判统计）

| 处置 | 条目（主项） |
|---|---|
| 保留 | core/protocols、framing、logger/command-queue、ble-runtime（+包装点）、session-registry、ota、broadcast（+包装点）、LysBlePeripheral、config/、static、manifest/身份、tests |
| 包装 | scan-permission → PermissionPort；wx-peripheral-\* → WeChatAdapter；ble-runtime 平台注入点 → BlePlatformPort |
| 重构 | pages、components、composables→Application、store、散装 device-session-\*、design-system.css |
| 重写 | （暂无整域重写项；组件级个别差异过大者在深化轮定） |
| 删除 | pages/hid/history.vue（P004）、smart-hid/known-devices.js、hid-navigation(@deprecated)、locale/、src/ 空骨架、utils/ble-utils.js【待验证】 |
| 待验证 | esp32-demo/profile、core/interfaces/adapter.ts 与 Port 关系、uni-ui 依赖面、replace_about.py、删除项二次复核、LysBlePeripheral 真机证据 |

**下一步（进入改版前的既定顺序）**：① 本矩阵逐项深化复核（逐文件级裁定 + 删除项二次验证 + 待验证项补证据）；② 四件套与开发任务分解按「原工程内重构」口径完善；③ 09_test 真实点击基线固化——三项完成后，在专用 Git 开发分支启动 `apps/uniapp` 原路径改版（[DEVELOPMENT_READINESS_FINAL](../06_review/DEVELOPMENT_READINESS_FINAL.md) §0）。
