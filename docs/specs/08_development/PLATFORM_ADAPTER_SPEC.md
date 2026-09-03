# PLATFORM_ADAPTER_SPEC —— Base Core × 平台 Adapter 分层契约（uni-app 开发阶段）

> 版本：1.3（08-G0.1 原工程内重构口径）· 生成日期：2026-09-03（v1.0）；修订 2026-09-03（v1.1，08-G0）；修订 2026-09-03（v1.2，08-G1）；修订 2026-09-03（v1.3，08-G0.1）
> **v1.3 修订记录（08-G0.1 方向纠偏）**：① TARGET_APP_ROOT 由平行新建目录（该方案已废弃）改为 **`apps/uniapp`（原工程内重构改版）**——本文 Base Core × Adapter 二分是旧工程**重构目标**，不是从零重写指令（[IMPLEMENTATION_TARGET](IMPLEMENTATION_TARGET.md) v1.2 §2）；② 现有模块先经 [LEGACY_REUSE_MATRIX](LEGACY_REUSE_MATRIX.md) 决定 保留/包装/重构/重写/删除/待验证——不要求复制旧文件数量，也不要求全部旧模块重写；稳定 BLE Runtime / 写队列 / 重连 / 协议 / 原生插件可经测试后复用；③ 删除「legacy-read-only 永久隔离」表述，改为 pre-development freeze（开发前暂不修改）+ implementation target（门禁通过后原路径重构）。分层职责本体零改动。
> **v1.1 修订记录（08-G0）**：① 开发落位全部改为 TARGET_APP_ROOT（当时定为平行新建目录——**该方案已于 08-G0.1 废弃**，现为 `apps/uniapp` 原路径重构）；② Adapter 接入方式收口为 **implements BLE Platform Port**（[RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.1 §0/§1.4），禁止与 Base Core 隐式双向依赖；③ C1/C3 由「待用户裁决」改判「**已裁决**」（[PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md)，真机证据待补）；④ 旧工程依赖链与「4 收敛文件」表述改标 legacy reference。功能/页面/动作/验收编号零改动。
> **v1.2 修订记录（08-G1）**：Adapter 的实现对象由单一「BLE Platform Port」改为**平台端口集合 PlatformPortBundle**（BlePlatformPort / PermissionPort / QrScanPort / SharePort / ClipboardPort / FilePickerPort / ExternalNavigationPort / DeviceInfoPort / LifecyclePort ×9，职责拆分见 [RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.2 §1.4）：① 权限通道独立为 PermissionPort（旧 scan-permission 收编于此）；② 扫码 / 分享 / 剪贴板 / 文件选择 / 外链 / 设备信息 / 生命周期各自成端口，**不得混入 BlePlatformPort**；③ 所有端口由组装根注入、禁止泄露 wx.\*/plus.\* 原生对象、一个 Adapter 可实现多个 Port、Base Core 只依赖抽象接口；④ 物理文件是否拆分不是本轮决策（职责契约必须分开）。方法级契约见 [API_SPEC](API_SPEC.md) §2。
> 输入（本文全部结论的来源，仅既有正典）：[02_product](../02_product/)（PRD / PRODUCT_MODEL / BUSINESS_RULE / DATA_MODEL / STATE_MODEL）· [03_flow](../03_flow/)（PAGE_SPEC / PAGE_FLOW）· [04_architecture](../04_architecture/)（MODULE_ARCH / STATE_MACHINE——旧工程实证，legacy reference）· [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) · [prototype](../prototype/)（v1-new 基准 + platform 四实例，交互视觉基准）· 08_development 既有件（API_ACTION_MATRIX / DEVICE_PROFILE_SPEC / DEVICE_PROFILE_RULE / STORAGE_POLICY / DEVELOPMENT_SCOPE / FEATURE_IMPLEMENTATION_MATRIX / IMPLEMENTATION_TARGET / RUNTIME_ARCHITECTURE v1.1 / PLATFORM_CAPABILITY_DECISION）
> 性质：**不新增功能、不改变产品逻辑、不引入后端与持久化**。本文只做分层契约收口：开发阶段什么代码落在 Base Core、什么落在平台 Adapter、微信 wxhost 与 Android 各自的规则、哪些东西任何层都不许改。冲突时以被引文档为准，本文不产生第二正文。
> 用途：uni-app 开发阶段（D1 = 微信小程序 + App·Android，同一 uni-app 工程内两平台，PRD §1.2 平台矩阵）的**分层开发契约**——与 [API_ACTION_MATRIX](API_ACTION_MATRIX.md)（动作契约）、[DEVICE_PROFILE_SPEC](DEVICE_PROFILE_SPEC.md)（Profile 契约）、[FEATURE_IMPLEMENTATION_MATRIX](FEATURE_IMPLEMENTATION_MATRIX.md)（功能映射）并列使用。

## 0. 分层模型

```text
Platform Adapter（平台绑定层 = PlatformPortBundle 实现者）
  WeChatAdapter（MP-WEIXIN：微信适配 + wxhost 宿主系统子维度） · AndroidAdapter（APP-PLUS）
  implements PlatformPortBundle（端口为 Base Core 领域自有抽象，RUNTIME_ARCHITECTURE v1.2 §1.4）
  ├─ BlePlatformPort（BLE 中央/GATT/Notify/外围广播/蓝牙状态——仅 BLE 能力）
  ├─ PermissionPort（权限查询·申请·订阅·设置页跳转） · QrScanPort（F020 扫码）
  ├─ SharePort（F029） · ClipboardPort（复制类瞬态通道） · FilePickerPort（F025 选包）
  └─ ExternalNavigationPort（外链/小程序跳转） · DeviceInfoPort（宿主/版本） · LifecyclePort（BR-06）
  一个 Adapter 可实现多个 Port；平台 API 唯一出现层 · 差异收敛于此
─────────────────────────────────────────────────────────
Base Core（平台无关层）
  页面 P001–P010（除 P004）· 设计系统组件 · Application/State（Store，内存态）
  Domain Service（六域职责）· PlatformPortBundle 端口接口定义（×9）· Shared Core（仓库根 core/，纯逻辑）
  状态机 ×9 · 业务规则 BR-01～12 · Device 基座 × Profile 扩展
```

**接入方向（v1.2 收口）**：Adapter 经 PlatformPortBundle 接入 Base Core——依赖只有「Adapter → Port（implements）」一组边，由组装根（应用启动处）注入；Port 与 Base Core 其余部分不依赖任何具体 Adapter，**不得形成隐式双向依赖**（全局单例 / 条件编译渗入 Base Core / 反向 import 均为违例，RUNTIME_ARCHITECTURE v1.2 §0.1 规则 4 / §4.2）；**所有 Port 禁止泄露 wx.\*/plus.\* 原生对象**（归一化义务在 Adapter，RUNTIME_ARCHITECTURE v1.2 §0.1 规则 5）。

分层依据（四处事实同源）：PRD §4.2 技术分层（重构需保持的骨架）；MODULE_ARCH §1/§2（模块树与依赖方向——旧工程实证，legacy reference）；原型层「基准内核字节复制 + 覆写层单文件收敛」形态（prototype/platform/README §2）；RUNTIME_ARCHITECTURE v1.2 Ports & Adapters 目标模型——**原型先例即本分层契约的可视化预演，目标模型是其架构化收口**。

| 层 | 目标落位（TARGET_APP_ROOT = `apps/uniapp`，原工程内重构） | 原型对应 | 平台关系 |
|---|---|---|---|
| Base Core | pages/ · components/ · Application/State（Store）· Domain Service（六域职责）· PlatformPortBundle 端口接口定义（×9，RUNTIME_ARCHITECTURE v1.2 §1.4）· Shared Core 资产引用（`core/` 纯逻辑，复用经契约测试，IMPLEMENTATION_TARGET §3）。（apps/uniapp 旧工程对应物 composables×4 / store×2 / services×6 仅为 legacy reference，不复制文件数与文件名，RUNTIME_ARCHITECTURE v1.2 §0.3） | v1-new 内核（app.js / pages×9 / components / mock-data） | 微信与 Android **同一份代码**，禁止平台分支 |
| Platform Adapter | WeChatAdapter / AndroidAdapter（Port 实现模块；条件编译 MP-WEIXIN / APP-PLUS 或组装根运行时注入）——**目标架构中唯一允许出现 uni.\*/wx.\*/plus.\* 调用的层**（旧代码该职责经 LEGACY_REUSE_MATRIX 包装/重构迁入） | wxhost.js / android.js 覆写层（内核零改动，差异单文件可整体评审） | 平台差异**只许**出现在此层（L3 圈内） |

## 1. Base Core 职责（平台无关层）

| 职责域 | 契约 | 来源 |
|---|---|---|
| 页面与导航 | P001–P010（P004 已移除）；tabBar ×4（P001/P007/P008/P009）；二级页一律 navigateTo；redirectTo 仅 P002→P003 一处；页面栈感知导航仅 P005 两处 | PAGE_SPEC §0.1 · API_ACTION_MATRIX §1 |
| 生命周期隐式动作 | P001 离页停扫、P008 离页停广播（非 APP）、P002 onUnload 清敏感数据并断开、P005/P006 卸载清理——**守则平台无关，触发的平台表达归 Adapter（§2）** | API_ACTION_MATRIX §2 · BR-06 |
| UI 组件 | A1–A3 / B1–B9 / C1–C12 / D1–D3 全集 + 页面↔组件授权表（禁止圈外拼装、禁止页面重复造相似组件） | 07_design_system/COMPONENT.md 全文 |
| Store | Application/State 层内存态 Store：扫描会话 + 已连接表投影 / 配网会话·进度·诊断两状态域——全部内存态、无存储键；实体清单 9 类（旧工程 ble.js/hid.js ×2 文件为 legacy reference，职责域采纳、文件数不强约束，RUNTIME_ARCHITECTURE v1.1 §0.3） | MODULE_ARCH §1（legacy 职责证据）· DATA_MODEL §1 |
| Service | Domain Service 六域职责：会话注册表/写队列/重连/扫描/广告解析/过滤/显示名 · Profile 注册表/transport/orchestrator · 门面/工作流/表单/诊断 · 广播会话/适配器/预算 · OTA 事务/校验 · 横切支撑（路由上下文/断开汇总/版本元数据/日志脱敏）——平台访问一律经 PlatformPortBundle 按需取端口（旧工程 services×6 文件形态为 legacy reference；旧 scan-permission 直调 wx.\* 职责在目标架构归 Adapter 的 PermissionPort 实现） | MODULE_ARCH §3（legacy 职责证据）· RUNTIME_ARCHITECTURE v1.2 §1.3/§1.4 |
| 共享层 core/ | Shared Core（纯逻辑）：协议镜像 + framing + Profile 契约 + logger；core/ 不反向依赖 apps（apps/uniapp 全路径均禁，RUNTIME_ARCHITECTURE v1.3 禁令 R-3）；进入重构后依赖前须过契约测试（IMPLEMENTATION_TARGET §3） | PRD §4.2 · MODULE_ARCH §1/§2 · IMPLEMENTATION_TARGET §3 |
| 状态机 | 9 台（会话 8 态 / 重连 / 配网工作流 / 设备 STATUS / 广播 6 态 / OTA 12 态 / 扫描 / 诊断 / 服务面板）；状态集合与转移平台无关 | STATE_MODEL §1 · STATE_MACHINE §1–§9 |
| 业务规则 | BR-01～BR-12（零网络 / 零持久化 / 敏感仅内存 / 脱敏 / 31B 拦截 / 前后台守则 / 异常三要素 / 重连 / 节流 / 脏表单 / 平台不变式 / 候选红线） | BUSINESS_RULE §1 |
| 设备模型 | Device 基座 × Profile 扩展四铁律 DR-1～DR-4：通用能力不依赖 Profile；Profile 只叠加不替换；配网非连接必然；Smart HID 双入口 | DEVICE_PROFILE_RULE §1–§4 |
| 数据流 | 目标模型双通道：命令流 Page → Application Action → Service → 端口 → Adapter → System BLE（结果四值 accepted/rejected/cancelled/completed，ACT 转 DomainEvent 落 Store）；事件流 平台回调 → Adapter → 归一化 PlatformEvent / 领域产出 DomainEvent → AppEvent → Application Handler → Store → UI（RUNTIME_ARCHITECTURE v1.2 §0.5/§2）；页面/组件不直连平台 API，Service 不 import Store。旧工程链 `pages → composables → store → services → core → 平台 API` 为 legacy reference，重构后不沿用（RUNTIME_ARCHITECTURE v1.2 §0.2 废弃口径）；基准原型 mock-data 仅为演示脚手架，替换为真实实现时页面/组件/Store 契约不变 | RUNTIME_ARCHITECTURE v1.2 §0/§2 · MODULE_ARCH §2（legacy 实证）· PRD §4.2 |

平台无关性判定基准：10_platform §1「产品能力的平台无关性盘点」——六域产品能力（扫描会话/筛选/GATT 读写监听/配网状态机/31B 预算/版本投影）全平台一致；平台绑定项仅 4 类（扫描 API 形态 / 权限模型 / 外围能力有无 / 扫码与分享机制）。

## 2. Platform Adapter 职责（平台绑定层）

| 职责 | 契约 | 来源 |
|---|---|---|
| 平台 API 唯一入口 | 平台 API 调用（uni.\*/wx.\*/plus.\*）只出现在 Adapter——即 PlatformPortBundle 各端口的实现模块内部；Base Core 其余文件禁止直调。旧工程「仅 4 个收敛文件 + scan-permission 唯一直调 wx.\* 先例」为 legacy reference（收敛**原则**采纳，收敛**形态**不复刻；IMPLEMENTATION_TARGET §2 规则 5，RUNTIME_ARCHITECTURE v1.2 §0.3） | RUNTIME_ARCHITECTURE v1.2 §1.4/§1.6 · MODULE_ARCH §1/§2/§3（legacy 实证）· PZ-8 |
| Port 接入与职责拆分 | Adapter implements PlatformPortBundle 所需端口，由组装根注入（条件编译或运行时）；**禁止与 Base Core 形成隐式双向依赖**（Port 归领域持有，Adapter 只向内实现）；权限经 PermissionPort、扫码经 QrScanPort、分享经 SharePort、剪贴板经 ClipboardPort、文件选择经 FilePickerPort、外链跳转经 ExternalNavigationPort、宿主/版本经 DeviceInfoPort、生命周期经 LifecyclePort——**均不得混入 BlePlatformPort**（BlePlatformPort 只含 BLE 中央/GATT/Notify/外围广播/蓝牙状态）；一个 Adapter 可实现多个 Port；所有 Port 禁止泄露 wx.\*/plus.\* 原生对象 | RUNTIME_ARCHITECTURE v1.2 §0.1 规则 3/4/5 · §1.4 · API_SPEC §2 |
| 合法差异圈（L3） | 仅 10_platform §4 差异表 7 行：设备发现交互 / 权限模型 / 分享 / 扫码 / 推广跳转 / 日志导出 / 生命周期守则；**圈外差异须先回写 10_platform 再开发** | specs/README 总纲 L3 · 10_platform §4 · BR-12 |
| 实现形态 | 条件编译（MP-WEIXIN / APP-PLUS）或运行时覆写；差异收敛到可整体评审的少量文件（原型先例：android.js = ACTION 覆写 + renderAll 后处理 + defaults 包装，基线零改动） | prototype/platform/app/PLATFORM_SPEC §1 |
| 平台补充态 | 平台特有失败分支（如 Android 系统配对取消重试）为平台补充态：须在该平台 PAGE_SPEC 标注并引 10_platform 条目，**不得改产品状态集合** | STATE_MODEL §3 |
| 错误码分层 | 两层并行：平台原生错误 → BLE_001～008（SDK 层）→ 业务错误码/用户文案；异常三要素（提示 + 下一步 + 恢复动作）任何平台不得省略；完整分层与三级映射契约见 [ERROR_CODE](ERROR_CODE.md)（四层：platform-native / sdk-transport / product-domain / validation-capability） | API_ACTION_MATRIX §5 · BR-07 · ERROR_CODE §1/§2 |
| 能力缺失降级 | 平台能力缺失域显式「不支持 + 指引」（不得静默降级）；缺失字段显式呈现不猜值 | 10_platform §7 三查② · DATA_MODEL §2-4 |
| 枚举口径 | 蓝牙状态/连接状态枚举映射表定稿前，各实现以基线口径为准（bt 三态 / 会话 8 态），不得单方面切换 BLE.\* 枚举 | API_ACTION_MATRIX §6 |

## 3. 微信 wxhost 规则（MP-WEIXIN · 基准平台 P1）

定位：**基准平台**（10_platform §5 P1）——扩展成本零，v1 直接实现，其余平台向它对齐。uni BLE API 与 wx 同构（10_platform §2.2）；BLE.\* 统一接口 ↔ wx.\* 映射以 API_ACTION_MATRIX §4 为准。

### 3.1 宿主系统维度（wxhost 子维度，2026-09-03 用户走查确立）

| 宿主 | 判定（开发口径） | 行为差异 |
|---|---|---|
| 安卓真机 | `wx.getDeviceInfo().platform === 'android'` | 与 iOS 同一 wx BLE API 路径，行为一致 |
| iOS 真机 | `platform === 'ios'` | 同上；关于页展示宿主 osName/机型 |
| 微信开发者工具 | `platform === 'devtools'`（旧代码 isWeixinDevTools） | **外围广播不可用**：P008 真机调试横幅 + 检查支持→不支持 + 启动拦截；扫描/GATT 域不受影响 |
| PC 端微信 | — | 【未知，未验证】不建模；真机验证后回写（DEVELOPMENT_SCOPE §7 V-4） |

来源：prototype/platform/wechat/PLATFORM_SPEC.md §2。

### 3.2 平台表达（差异圈微信列）

| 差异点 | 微信规则 |
|---|---|
| 权限模型 | 微信授权弹窗 + 去设置（P001 六态权限分支，F002）；拒绝后横幅含 code 与重试 |
| 扫码（F020） | uni.scanCode（shid://pair 解析） |
| 分享（F029） | 页面级 onShareAppMessage/onShareTimeline（右上角菜单触发，不由页面绘制） |
| 推广跳转（F028） | **点击直接发起 navigateToMiniProgram（无确认弹窗，实证 openApp）**；无 appId→toast、失败→modal 重试 |
| 日志导出（F011） | 剪贴板（文件流候选不做） |
| 生命周期 | 后台挂起即停扫/停广播（BR-06 的微信表达） |
| 外链 | 复制到剪贴板 + toast |

来源：10_platform §4 微信列 · wechat/PLATFORM_SPEC §4 · API_ACTION_MATRIX §3.8 平台口径。

### 3.3 广播与多设备（生态冲突处置——C1/C3 已裁决）

- 广播发送（F014）：wx.createBLEPeripheralServer + server.startAdvertising(powerLevel)，功率仅三档映射；活动连接冲突拦截；**C1 已裁决（2026-09-03，08-G0）：capability = supported_limited——devtools unsupported / 微信真机运行时探测后启用 / 后台广播不承诺 / 不允许静默降级；真机证据待补**（[PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md) §1；矩阵 ❌ 为矩阵侧待修订口径，实证 △ 不翻转）。
- 多设备连接（F013）：**C3 已裁决（2026-09-03，08-G0）：capability = supported_foreground——前台运行时多 Session / 不承诺后台保持 / 不承诺固定最大连接数 / 每 Session 独立错误反馈 / Session Registry 为唯一事实源**（[PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md) §2）。
- 来源：11_ecosystem/ALIGNMENT_NOTES §2 · DEVELOPMENT_SCOPE §6 · PLATFORM_CAPABILITY_DECISION §1/§2。

## 4. Android 规则（APP-PLUS · D1 首批 P2）

定位：App·Android 为 D1 第二平台（10_platform §6 D1）；**iOS 现状 NOT_RELEASED，随 App 线后续评估，不占本线**（app/PLATFORM_SPEC 头注）。uni BLE API 与 wx 同构 ⇒ 扫描/GATT/配网三域 UI 与 Base Core 直接复用（10_platform §2.2）。

### 4.1 六覆写点（平台差异收敛清单）

| 差异点 | Android 规则（覆写实现） |
|---|---|
| 权限模型 | P001：FINE_LOCATION 弹窗 → 拒绝横幅 → 二次拒绝=永久拒绝 → 仅剩系统设置引导（回流自动续扫） |
| 广播前置 | P008：SDK≥31 逐项权限（ADVERTISE→CONNECT）；拒绝→缺失汇总 modal + 去设置；系统蓝牙关闭→Intent 蓝牙设置 |
| BLE 写语义 | P002：加密写首次弹系统 PIN 配对；取消自动 2s 重试一次（现状）；再取消→失败 modal + 重新下发（二次策略【未知】登记，DEVELOPMENT_SCOPE §7） |
| 广播增强 | P008：模式/功率 picker ×2 + 三开关（可连接/含设备名/添加服务 UUID）；预算按开关重算，超限拦截；LysBlePeripheral 原生插件 |
| 分享/外链/日志导出 | p009-openweb→系统浏览器（实证 plus.runtime.openURL）；系统分享面板（失败降级复制；文件流候选拦截） |
| 推广承接（F028） | 无 navigateToMiniProgram → 推广 sheet = 小程序码 + 打开落地页（系统浏览器） |

来源：prototype/platform/app/PLATFORM_SPEC.md §3（覆写点表逐行对应）。

### 4.2 生命周期与候选

- 前台生命周期同基准（BR-06）；**后台保连为候选未决策，默认不实现**（BR-12；10_platform §4 生命周期行「受限后台保连【候选】」）。
- 生态矩阵 UNI-APP-AND 行与本项目实证全量一致，直接吸收，无冲突项（app/PLATFORM_SPEC §2b）。

## 5. 禁止修改项（任何层都不得触碰）

| # | 禁改项 | 内容 | 来源 |
|---|---|---|---|
| PZ-1 | L1 产品不变式 | 功能清单与边界（02_product）、页面与流程（03_flow）、数据口径、零 HTTP/零登录、零本地持久化、日志脱敏 | specs/README 总纲 L1 · BR-11 |
| PZ-2 | 状态集合与转移 | 平台不得增删状态或改变恢复路由（含错误码恢复动作四分流） | STATE_MODEL §2-1 · 10_platform §4 不变式行 |
| PZ-3 | 数据实体与字段语义 | ScannedDevice/Session 等以 REVERSE §2.4 为准；获取方式可平台化，实体与语义不变 | DATA_MODEL §2/§3 |
| PZ-4 | 核心流程与旅程 | S1–S6 全部平台无关；配网状态机/错误码表/31B 预算算法为产品资产 | 10_platform §1/§4 · PRD §7 |
| PZ-5 | 负面清单 | N-1～N-8：登录/会员/支付/云同步/HTTP、HID 实时控制、F023 复刻、F017 页面入口、F030 i18n、未决策候选增强、生态未纳入项 | DEVELOPMENT_SCOPE §4 |
| PZ-6 | 三零边界 | Z-1 零网络 / Z-2 零本地持久化 / Z-3 全平台一致——任何 Adapter 差异不得引入 HTTP/云端/落盘 | STORAGE_POLICY §2 |
| PZ-7 | 裁决执行与未决不翻转 | **C1（微信广播）/C3（微信多设备）已裁决**（2026-09-03，08-G0：supported_limited / supported_foreground，真机证据待补）——按 [PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md) 执行；C4（重连口径）仍待裁决、按实证实现不翻转；枚举映射表定稿前不切换 BLE.\* 枚举 | PLATFORM_CAPABILITY_DECISION · DEVELOPMENT_SCOPE §6 · API_ACTION_MATRIX §6 |
| PZ-8 | Base Core 洁净 | Base Core 文件不得出现平台分支或直调平台 API（uni.\*/wx.\*/plus.\* 只许出现在 Adapter = Port 实现内）；Adapter 与 Base Core 不得隐式双向依赖（只许 Adapter→Port 实现关系）；原型同构纪律=内核字节复制、差异只进覆写层 | MODULE_ARCH §2 · RUNTIME_ARCHITECTURE v1.1 §0.1/§0.4（R-4）· prototype/platform/README §2 |
| PZ-9 | 冻结正典 | 07_design_system v1.0、08_development 既有冻结件（清单以 [specs/README](../README.md) 08_development 行为准）、01_reverse（历史记录不回写）、prototype v0-old 与 prototype/platform（冻结不改，含 C1/C3 裁决前「待裁决」快照不回写）——修订须走对应目录的变更流程，不得在开发中就地改写 | specs/README 目录对照表 · 11_ecosystem README 定位表 · PLATFORM_CAPABILITY_DECISION §3 |

## 6. 分层判定速查（改动落层决策）

| 改动类型 | 落层 | 依据 |
|---|---|---|
| 新设备家族接入 | Profile 注册（Base Core·provisioning 注册表），不改通用代码 | DEVICE_PROFILE_RULE DR-2 · DEVICE_PROFILE_SPEC §5 |
| 平台 API 调用 / 平台错误码 | Platform Adapter（对应端口的实现内；错误映射按 ERROR_CODE §2 三级映射） | RUNTIME_ARCHITECTURE v1.2 §1.6 · MODULE_ARCH §2/§3（legacy）· API_ACTION_MATRIX §5 · ERROR_CODE |
| 新平台差异点 | **先回写 10_platform §4 再开发**（圈外差异禁止直接实现） | BR-12 · specs/README L3 |
| 平台特有失败分支 | Adapter 实现 + 平台 PAGE_SPEC 标注补充态 | STATE_MODEL §3 |
| mock 换真实实现 | Application/Service 层（经端口注入真实 Adapter；页面/组件/Store 契约不变） | RUNTIME_ARCHITECTURE v1.2 §1.2/§1.4 · MODULE_ARCH §2（legacy 依赖方向） |
| 状态/流程/文案/数据模型变化 | **不允许在开发阶段发生**——属产品变更，走 02/03 修订流程 | BR-11 · PZ-1 |

## 7. 冻结校验

- ☑ 分层二分只引既有事实（PRD §4.2 / MODULE_ARCH（legacy）/ 原型内核-覆写层形态 / RUNTIME_ARCHITECTURE v1.2 目标模型），无新造层次
- ☑ **（v1.3）开发落位 = TARGET_APP_ROOT（`apps/uniapp` 原工程内重构，非平行新建、非从零重写）；现有模块先过 LEGACY_REUSE_MATRIX（保留/包装/重构/重写/删除/待验证）；旧文件数与文件名不构成强约束；开发前 apps/uniapp 暂不修改（pre-development freeze）**
- ☑ **（v1.1）Adapter 经 BLE Platform Port 接入（implements，组装根注入），无隐式双向依赖（§0 接入方向、§2 Port 接入行、PZ-8）**
- ☑ **（v1.2）实现对象升级为 PlatformPortBundle ×9：权限/扫码/分享/剪贴板/文件/外链/设备信息/生命周期均不混入 BlePlatformPort；一个 Adapter 可实现多个 Port；全部端口组装根注入、禁泄露 wx.\*/plus.\*（§0 图、§2「Port 接入与职责拆分」行，RUNTIME_ARCHITECTURE v1.2 §1.4）；物理文件是否拆分未决策、职责契约已分开**
- ☑ wxhost 规则 = wechat/PLATFORM_SPEC §2/§4 + 10_platform §2.1/§4 微信列逐条对应；宿主维度含【未知】登记不脑补
- ☑ Android 规则 = app/PLATFORM_SPEC §3 六覆写点逐行对应；候选增强均标「不做」（BR-12）
- ☑ 禁止修改项九条全部带来源；含用户本轮四禁（不新增功能/不改产品逻辑/不引入后端/不引入持久化 → PZ-1/PZ-5/PZ-6）
- ☑ **（v1.1）C1/C3 已裁决按 PLATFORM_CAPABILITY_DECISION 登记（真机证据待补）；C4 与枚举口径未决状态如实保留，未擅自翻转**
- ☑ **（v1.2）错误码分层转引 ERROR_CODE（四层 + 三级映射）；方法级端口契约转引 API_SPEC §2，本文不重复正文**
