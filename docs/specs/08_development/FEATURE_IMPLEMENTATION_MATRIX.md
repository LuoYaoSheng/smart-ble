# FEATURE_IMPLEMENTATION_MATRIX —— F001–F030 功能 × 实现要素映射（uni-app 开发阶段）

> 版本：2.3（08-G0.1 原工程内重构口径同步）· 生成日期：2026-09-03
> **v2.3 变更说明（08-G0.1 方向纠偏同步）**：① §0.4 目标落位由平行新建目录（该方案已废弃）改为 **TARGET_APP_ROOT = `apps/uniapp`（原工程内重构改版）**——目标模块职责是旧工程**重构后的组织口径**，不是从零重写指令（[IMPLEMENTATION_TARGET](IMPLEMENTATION_TARGET.md) v1.2 §2）；② 现有模块先经 [LEGACY_REUSE_MATRIX](LEGACY_REUSE_MATRIX.md) 决定 保留/包装/重构/重写/删除/待验证——不要求复制旧文件数量，也不要求全部旧模块重写。功能、页面、动作与验收编号零改动（30 行 / 12 字段 / R 编号 / ACT 引用全部维持原文）。
> 输入（本文全部结论的来源，仅既有正典）：[02_product](../02_product/)（PRD §5/§6/§8 / FEATURE_MAP / DATA_MODEL / STATE_MODEL / BUSINESS_RULE）· [03_flow](../03_flow/)（PAGE_SPEC / PAGE_FLOW / USER_FLOW）· [04_architecture](../04_architecture/)（MODULE_ARCH / STATE_MACHINE——旧工程实证，legacy reference）· [05_sequence/SEQUENCE_DIAGRAMS.md](../05_sequence/SEQUENCE_DIAGRAMS.md) · [07_design_system/COMPONENT.md](../07_design_system/COMPONENT.md) · [09_test/COVERAGE_CHECKLIST.md](../09_test/COVERAGE_CHECKLIST.md) · [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) · [11_ecosystem](../11_ecosystem/)（API_UNIFIED_SPEC / ALIGNMENT_NOTES）· [08_development](.) 既有件（PLATFORM_ADAPTER_SPEC / API_ACTION_MATRIX / RUNTIME_ARCHITECTURE v1.2 / IMPLEMENTATION_TARGET / PLATFORM_CAPABILITY_DECISION / **API_SPEC / DATA_MODEL / ERROR_CODE / PERMISSION**）
> 性质：**不新增功能、不改变产品定义、不设计数据库、不引入后端**（对应 Z-1 零网络 / Z-2 零持久化 / BR-01/BR-02）。本文是功能级开发映射：每个功能 F00X 落在哪个页面、从哪进入、用哪些组件、有哪些状态、挂哪个 Store、调哪个 Service、经哪个 BLE 接口、Adapter 差异在哪、从哪验收。每格结论均引用既有规范章节，本文不产生第二正文。
> v2.0 变更说明：在 v1.0 冻结结论基础上重排——每功能显式给出 12 字段（原 v1.0 将功能名称并入功能列、业务域靠章节标题、用户入口散落各格）。映射内容与 v1.0 一致，无新增、无删改。
> **v2.1 变更说明（08-G0 工程实现基线纠偏）**：① 新增 §0.4「目标模块职责映射」——旧文件名/旧文件数仅为**来源证据（legacy reference）**，新增目标模块职责口径，**不要求新代码原样复制旧目录数量**（目标落位 = TARGET_APP_ROOT——当时定为平行新建目录，**已于 08-G0.1 改为 `apps/uniapp` 原工程内重构**，[IMPLEMENTATION_TARGET](IMPLEMENTATION_TARGET.md) v1.2）；② C1/C3 已裁决引用更新（[PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md)）；③ **功能、页面、动作与验收编号零改动**（30 行 / 12 字段 / R 编号 / ACT 引用全部维持 v2.0 原文）。
> **v2.2 变更说明（08-G1 工程契约四件套生成）**：字段引用基线切换——「BLE API」字段（字段 10）的**方法与事件契约以 [API_SPEC](API_SPEC.md) 为准**；各卡片的数据实体**类型契约引用 [DATA_MODEL](DATA_MODEL.md)（08_development 运行时层）**、错误呈现**引用 [ERROR_CODE](ERROR_CODE.md)**、权限前置**引用 [PERMISSION](PERMISSION.md)**；RUNTIME_ARCHITECTURE 引用升 v1.2（事件模型 + PlatformPortBundle）。功能/页面/动作/验收编号零改动。
> 用途：与 [PLATFORM_ADAPTER_SPEC](PLATFORM_ADAPTER_SPEC.md)（分层契约）、[RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.1（运行时分层）、[API_ACTION_MATRIX](API_ACTION_MATRIX.md)（动作契约）、[DEVICE_PROFILE_SPEC](DEVICE_PROFILE_SPEC.md)（Profile 契约）配套——本文回答「功能落点」，动作级行为仍以 PAGE_SPEC + API_ACTION_MATRIX 为准。

## 0. 编制规则

### 0.1 行覆盖与统计口径

- **行覆盖 F001–F030 全集**（30 行 = 29 在册 + F023 已移除红线行）；优先级/状态与 FEATURE_MAP §2 一致（P0×17 / P1×7 / P2×5）。
- 枚举口径：蓝牙/连接状态映射表定稿前以基线口径实现，不切换 BLE.\* 枚举（API_ACTION_MATRIX §6）。
- 分层总则：除「Platform Adapter」字段注明差异外，其余字段均落在 Base Core（PLATFORM_ADAPTER_SPEC §0/§1）。

### 0.2 十二字段口径（各字段引用基线一次声明，功能卡片内只写条目与节号）

> **（v2.2）工程契约引用基线**：字段 8 Store 实体的**类型契约** = [DATA_MODEL](DATA_MODEL.md)（08_development 运行时层，§3 实体表）；字段 10 的**方法与事件契约** = [API_SPEC](API_SPEC.md)；各卡片错误呈现与恢复动作 = [ERROR_CODE](ERROR_CODE.md)；权限前置与能力门禁 = [PERMISSION](PERMISSION.md) + [PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md)。产品语义层（02_product/DATA_MODEL）与运行时层（08_development/DATA_MODEL）双层不互相替代。

| # | 字段 | 口径与来源基线 |
|---|---|---|
| 1 | 功能编号 | PRD §5 功能列表（F001–F030，与逆向报告一致） |
| 2 | 功能名称 | PRD §5 + FEATURE_MAP §1 能力树，逐字一致不改写 |
| 3 | 所属业务域 | FEATURE_MAP §1 六域能力树 + §3 能力域↔页面映射 |
| 4 | 用户入口 | PAGE_SPEC 各页「进入条件」/「按钮列表与行为」表 + PAGE_FLOW §2 跳转矩阵入口列 + USER_FLOW S1–S6 |
| 5 | 对应页面 | PAGE_SPEC P001–P010（P004 已移除不出现）+ FEATURE_MAP §3 |
| 6 | UI 组件 | 07_design_system/COMPONENT.md 编号（A 骨架 / B 通用 / C 业务 / D 全局）+ 页面↔组件授权表（禁止圈外拼装） |
| 7 | 页面状态 | STATE_MODEL §1 九台状态机清单；转移正典为 STATE_MACHINE §1–§9（卡片内「SM §N」） |
| 8 | Pinia Store | Application/State 层状态域（目标职责见 §0.4）；旧工程实证：ble.js=扫描会话+已连接表，hid.js=配网会话/进度/诊断（MODULE_ARCH §1，legacy reference）；「—」=不经 Store |
| 9 | Service 接口 | Domain Service 六域职责（目标职责见 §0.4）；旧工程实证文件名（ble-runtime / provisioning / smart-hid / broadcast / ota / 散装，含 utils·/core· 落位）为来源证据（MODULE_ARCH §3，legacy reference） |
| 10 | BLE API | BLE.\* 生态统一接口（章节号 = 11_ecosystem/API_UNIFIED_SPEC §N，映射经 API_ACTION_MATRIX §4）+ wx.\*/plus.\* 旧代码实证；**方法与事件契约（输入/返回/超时/并发/事件/错误/capability）= [API_SPEC](API_SPEC.md)（08-G1 定稿）** |
| 11 | Platform Adapter | D1 两平台（微信 wxhost / App·Android）差异，见 PLATFORM_ADAPTER_SPEC §2–§4；「无差异」= 10_platform §4 差异表无此行，两平台同实现 |
| 12 | 测试用例 | PRD §8 R 编号（R19 已作废）+ COVERAGE_CHECKLIST 功能覆盖行 + SEQ §N（05_sequence 时序图）+ 基准原型（prototype/v1-new）场景 |

### 0.3 总览索引

| 编号 | 功能名称 | 业务域 | 优先级 | 状态 | 页面 | 验收 |
|---|---|---|---|---|---|---|
| F001 | BLE 扫描 | 设备发现域 | P0 | 已实现 | P001 | R01 |
| F002 | 扫描权限前置 | 设备发现域 | P0 | 已实现 | P001 | R02 |
| F003 | 扫描筛选 | 设备发现域 | P0 | 已实现 | P001 | R03 |
| F004 | 广播数据查看 | 设备发现域 | P0 | 已实现 | P001 | R04 |
| F005 | 显示名智能解析 | 设备发现域 | P1 | 已实现 | P001 | R05 |
| F006 | GATT 连接 | GATT 调试域 | P0 | 已实现 | P006 | R06 |
| F007 | 服务树浏览 | GATT 调试域 | P0 | 已实现 | P006 | R07 |
| F008 | 特征读取 | GATT 调试域 | P0 | 已实现 | P006 | R08 |
| F009 | 特征写入 | GATT 调试域 | P0 | 已实现 | P006 | R09 |
| F010 | Notify 监听 | GATT 调试域 | P0 | 已实现 | P006 | R10 |
| F011 | 通信日志 | GATT 调试域 | P0 | 已实现 | P006/P008 | R11 |
| F012 | 断线自动重连 | GATT 调试域 | P0 | 已实现 | P006/P007 | R12 |
| F013 | 多设备会话管理 | GATT 调试域 | P1 | 已实现 | P007 | R13 |
| F014 | 广播发射（微信） | 广播发射域 | P1 | 已实现 | P008 | R22/R24 |
| F015 | 广播发射（App） | 广播发射域 | P1 | 已实现 | P008 | R23 |
| F016 | 广播负载预算 | 广播发射域 | P1 | 已实现 | P008 | R21 |
| F017 | 观察侧证据匹配 | 广播发射域 | P2 | 已实现（无消费方） | 无页面 | — |
| F018 | Profile 设备识别 | Profile 配网域 | P0 | 已实现 | P001/P007 | R14 |
| F019 | Smart HID 配网向导 | Profile 配网域 | P0 | 已实现 | P002 | R15 |
| F020 | ControlHub 配对码扫码 | Profile 配网域 | P0 | 已实现 | P002 | R16 |
| F021 | 分帧明文写入+状态跟踪 | Profile 配网域 | P0 | 已实现 | P002 | R17 |
| F022 | 配网错误恢复 | Profile 配网域 | P0 | 已实现 | P002 | R18 |
| ~~F023~~ | ~~已配网设备历史~~ | （Profile 配网域） | — | **已移除（2026-09-02）** | — | R19 作废 |
| F024 | Smart HID 诊断 | Profile 配网域 | P1 | 已实现 | P005 | R20 |
| F025 | OTA 固件升级 | OTA 域 | P1 | 部分实现（端到端 BLOCKED） | P006 子流程 | R25 |
| F026 | 日志脱敏 | 系统信息与支撑域 | P0 | 已实现 | 横切 | R28 |
| F027 | 版本元数据展示 | 系统信息与支撑域 | P2 | 已实现 | P009/P010 | R26 |
| F028 | 小程序推广跳转 | 系统信息与支撑域 | P2 | 部分实现（二维码待实现） | P009 | R27 |
| F029 | 分享 | 系统信息与支撑域 | P2 | 已实现 | P009+页面级 | — |
| F030 | 国际化 | 系统信息与支撑域 | P2 | 未实现（不做） | — | R30（现状确认） |

### 0.4 目标模块职责映射（08-G0 · 新增）

**编制口径**：功能卡片中的「Pinia Store」「Service 接口」字段沿用的旧文件名（ble.js / hid.js / ble-runtime / smart-hid 等）**仅为来源证据（legacy reference）**——证明该职责在旧工程已有实现；改版目标工程（TARGET_APP_ROOT = `apps/uniapp`，原工程内重构）按下表**目标模块职责**组织，**不要求原样复制旧目录数量、文件名与文件内部结构，也不要求全部旧模块重写**——逐模块处置以 [LEGACY_REUSE_MATRIX](LEGACY_REUSE_MATRIX.md) 为准（保留/包装/重构/重写/删除/待验证；[IMPLEMENTATION_TARGET](IMPLEMENTATION_TARGET.md) v1.2 §2 规则 3/4；[RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.3 §0.3 分类表）。本节不改变任何功能/页面/动作/验收编号。

| 矩阵字段 | 旧工程证据（legacy reference only） | 目标模块职责（已明确采纳） |
|---|---|---|
| Pinia Store（字段 8） | ble.js / hid.js ×2 文件（MODULE_ARCH §1） | **State Layer 两状态域**：扫描·连接投影域（扫描会话 / 已连接表）与配网·诊断域（配网会话/进度/诊断）；内存态，写入只经 Application Handler，Store 与 Service 互不 import（RUNTIME_ARCHITECTURE v1.1 §0.4 R-1/R-2） |
| Service 接口（字段 9） | services×6（ble-runtime 16 / provisioning 5 / smart-hid 11 / broadcast 6 / ota 3 / 散装 13，MODULE_ARCH §3） | **Domain Service 六域职责**（与 FEATURE_MAP §1 六域同构）：扫描与广告处理域 / GATT 会话域（Session Registry·写队列·重连）/ Profile 配网域 / 广播域（会话·31B 预算）/ OTA 事务域 / 横切支撑域；平台访问一律经 BLE Platform Port（RUNTIME_ARCHITECTURE v1.1 §1.3/§1.4） |
| BLE API（字段 10） | wx.\*/plus.\* 直调实证（API_ACTION_MATRIX §4 右列） | **Port 方法调用**：命令经 Port 下行（方法清单以 API_SPEC 定稿为准，现口径 BLE.\*）；wx.\* 只存在于 WeChatAdapter / AndroidAdapter 的 Port 实现内 |
| Platform Adapter（字段 11） | 旧工程 4 个平台收敛文件 + 覆写点 | **Port 实现者差异**：WeChatAdapter / AndroidAdapter implements Port，差异圈仍为 10_platform §4 七行；经 Port 接入，无隐式双向依赖 |
| UI 组件 / 对应页面（字段 5/6） | pages ×9 + components ×15 文件形态 | **Presentation 层**：页面与组件按 07_design_system 授权表组织（授权表为强约束，文件数不是） |
| （隐含）页面编排 | composables ×4（use-ble-scan 等） | **Application Action / Handler 编排角色**：命令发起与事件落 Store 的用例编排层（RUNTIME_ARCHITECTURE v1.1 §1.2） |

---

## 1. 设备发现域（F001–F005 · PAGE001）

### F001 BLE 扫描（P0）

- **业务域**：设备发现域（FEATURE_MAP §1）
- **用户入口**：P001 扫描工具条「开始扫描 ⇄ 停止扫描」主按钮（PAGE_SPEC §1 按钮表 P01-01）；页面本身入口 = tabBar 首项（App 启动默认页）/ 各页空态「去扫描」switchTab / 微信分享卡片落地（PAGE_SPEC §1 进入条件 · PAGE_FLOW §2）
- **对应页面**：P001 扫描首页（tabBar「扫描」）
- **UI 组件**：A1 app-navbar（蓝牙状态点+三态文案）· B1 btn（启停主按钮，扫描中变 danger）· C1 device-card(scan) · B6 empty-state · B8 error-banner（扫描失败横幅+重试）· D1 toast（「扫描完成 · 发现 N 台」）（COMPONENT.md P001 授权表）
- **页面状态**：扫描会话 starting→scanning→stopping→idle，任一环节可 →failed（SM §7，会话固定 5s 自动停）；蓝牙三态 on/off/unsupported（导航栏）；列表空态两种文案（SM §7 + PAGE_SPEC §1）
- **Pinia Store**：ble.js —— 扫描会话（1s 节流合并、RSSI 降序、上限 100）（MODULE_ARCH §1）
- **Service 接口**：ble-runtime —— 扫描会话（MODULE_ARCH §3）
- **BLE API**：BLE.scan(options) / BLE.stopScan()（API §5）· BLE.initialize() / BLE.getBluetoothState()（API §3/§4）· wx.openBluetoothAdapter / wx.startBluetoothDevicesDiscovery（API_ACTION_MATRIX §4）
- **Platform Adapter**：无差异——发现交互两平台同为连续扫描列表（10_platform §4「设备发现交互」行）；权限差异归 F002
- **测试用例**：R01（PRD §8）· COVERAGE_CHECKLIST F001 行 · SEQ §1 扫描会话 · 基准 P001 场景（扫描完成 toast）

### F002 扫描权限前置（P0）

- **业务域**：设备发现域
- **用户入口**：P001 点「开始扫描」时前置触发（无独立按钮；失败经横幅呈现并可「重试」，PAGE_SPEC §1 按钮表 P01-02）
- **对应页面**：P001
- **UI 组件**：B8 error-banner（横幅+重试，标题含 error.code mono）· D2 modal（蓝牙未开 10001 引导「请先打开系统蓝牙」）（COMPONENT.md B8/D2）
- **页面状态**：权限/环境失败态（授权拒绝 reason 分类 + 去设置）；蓝牙未开 10001 引导态；适配器初始化失败自动指数退避重试 3 次（1s/2s/4s）后仍失败才报错（PAGE_SPEC §1 异常处理）
- **Pinia Store**：ble.js —— 环境态
- **Service 接口**：散装·scan-permission（唯一直调 wx.\* 的收敛件先例，PAGE_SPEC §0.3 · MODULE_ARCH §3）
- **BLE API**：BLE.initialize() / BLE.getBluetoothState()（API §3/§4）
- **Platform Adapter**：**差异·权限模型行**（10_platform §4）——微信=授权弹窗+去设置（PLATFORM_ADAPTER_SPEC §3.2）；Android=FINE_LOCATION 运行时权限链（拒绝横幅→二次拒绝=永久拒绝→去设置，回流续扫，PLATFORM_ADAPTER_SPEC §4.1）
- **测试用例**：R02 · COVERAGE_CHECKLIST F002 行 · SEQ §1 异常分支 · 基准 P001 场景「蓝牙未开启/平台不支持」；app 实例 P001 权限链场景

### F003 扫描筛选（P0）

- **业务域**：设备发现域
- **用户入口**：P001「筛选 ⇄ 收起筛选」文字链展开面板；面板内 RSSI 预设 ×4 / 滑杆 / 名称前缀输入 / 隐藏无名开关 / 重置过滤（PAGE_SPEC §1 按钮表 P01-03/P01-04）
- **对应页面**：P001
- **UI 组件**：C3 filter-panel（B5 slider/preset chip 组合；实时生效无确认键）· B6 empty-state（空态两文案）（COMPONENT.md C3）
- **页面状态**：空态两种文案（未扫描 / 筛选无匹配）；筛选实时投影（PAGE_SPEC §1 状态列表）
- **Pinia Store**：ble.js —— 筛选实时投影（无确认键）
- **Service 接口**：ble-runtime —— 过滤（MODULE_ARCH §3）
- **BLE API**：—（非 BLE 域，纯本地列表投影；对齐生态 BLE-002-04/05/06 过滤排序项，API_ACTION_MATRIX P01-04）
- **Platform Adapter**：无差异
- **测试用例**：R03 · COVERAGE_CHECKLIST F003 行 · 基准 P001 筛选+空态 B 场景

### F004 广播数据查看（P0）

- **业务域**：设备发现域
- **用户入口**：P001 点设备卡本体（与「连接」按钮互不干扰，PAGE_SPEC §1 按钮表 P01-07）；弹窗内「复制数据 / 关闭」（P01-08）
- **对应页面**：P001（覆盖层弹窗）
- **UI 组件**：C2 adv-sheet（基于 D3 底部抽屉；AD 结构逐段 长度/类型/HEX mono 块）+「复制数据」soft 按钮（COMPONENT.md C2）
- **页面状态**：字段缺失标注态——「本轮平台 API 未提供此字段」/「字段存在但长度为 0」（DATA_MODEL §2-4 缺失即显式，不猜值）
- **Pinia Store**：ble.js —— ScannedDevice.advertisement（DATA_MODEL §1）
- **Service 接口**：ble-runtime —— 广告解析（MODULE_ARCH §3）
- **BLE API**：BLE.getAdvertisement()（API §10：Manufacturer Data / Service Data / UUID / Raw Data）
- **Platform Adapter**：平台缺失字段显式呈现不猜值（DATA_MODEL §2 不变式，非差异项）
- **测试用例**：R04 · COVERAGE_CHECKLIST F004 行 · 基准 P001 点卡弹窗+复制场景

### F005 显示名智能解析（P1）

- **业务域**：设备发现域
- **用户入口**：P001 列表渲染隐式（无按钮；设备卡显示名生成规则）（PAGE_SPEC §1 数据展示规则）
- **对应页面**：P001
- **UI 组件**：C1 device-card 头部（显示名 + RSSI 四格信号条，-60/-70/-80 分档 + dBm 数值）（COMPONENT.md C1）
- **页面状态**：多级 fallback 解析（name→localName→AD 0x09/0x08→Profile 名→厂商→「未命名 BLE · ID后四位」），不产生独立 UI 状态（PAGE_SPEC §1）
- **Pinia Store**：ble.js —— ScannedDevice.name 显示名投影
- **Service 接口**：ble-runtime —— 显示名 fallback（MODULE_ARCH §3）
- **BLE API**：—（扫描数据解析，无独立调用）
- **Platform Adapter**：无差异（纯解析逻辑）
- **测试用例**：R05 · COVERAGE_CHECKLIST F005 行 · 基准 P001 无名设备卡场景

---

## 2. GATT 调试域（F006–F013 · PAGE006 / PAGE007）

### F006 GATT 连接（P0）

- **业务域**：GATT 调试域
- **用户入口**：P001 普通卡「连接」（SHID 卡同样保留标准连接入口——Profile 扩展原则 PR-2，PAGE_SPEC §1 按钮表 P01-05）/ P007 点卡 / P003「高级 BLE 调试」（PAGE_SPEC §6 进入条件 · PAGE_FLOW §2）
- **对应页面**：P006 通用设备详情（GATT 调试工作台，标题「GATT 调试」）
- **UI 组件**：A2 subnav · C4 service-panel（内用 B7 op-state）· B1 btn（连接⇄断开/重试）· D2 modal（路由参数无效）（COMPONENT.md P006 授权表）
- **页面状态**：会话 8 态 CONNECTING→CONNECTED→DISCOVERING→READY→DISCONNECTING/DISCONNECTED/FAILED（SM §1）；服务面板五态 idle/connecting/ready/empty/error（SM §9）；连接复用/超时 10s/自动重试 3 次退避（PAGE_SPEC §6）
- **Pinia Store**：ble.js —— 已连接表（Session 实体，DATA_MODEL §1）
- **Service 接口**：ble-runtime —— 会话注册表 / 服务发现（期望服务重试 3×400ms）/ MTU 247（MODULE_ARCH §3）
- **BLE API**：BLE.connect(deviceId) / BLE.disconnect / BLE.getConnectionState（API §7）· wx.createBLEConnection（API_ACTION_MATRIX §4）
- **Platform Adapter**：无差异（连接复用/10s 超时/重试 3 次退避为 Base 契约）；C3 已裁决 supported_foreground（PLATFORM_CAPABILITY_DECISION §2，真机证据待补；ALIGNMENT_NOTES §2）
- **测试用例**：R06 · COVERAGE_CHECKLIST F006 行 · SEQ §2 连接与服务发现 · 基准 P006 场景 connecting→ready/error/empty

### F007 服务树浏览（P0）

- **业务域**：GATT 调试域
- **用户入口**：P006 连接成功后自动 GATT 发现即展示；「（服务折叠头）/ 全部展开 / 全部收起」交互（PAGE_SPEC §6 按钮表 P06-06/P06-07）
- **对应页面**：P006
- **UI 组件**：C4 service-panel（服务折叠列表 / UUID mono chip / 特征行属性 chips read/write/notify + 动作键 / 全部展开收起文字链）（COMPONENT.md C4）
- **页面状态**：ready 态；SIG 标准中文名（如 1800/180F）/ 未知 UUID「服务 N/特征值 N」占位（PAGE_SPEC §6 数据展示规则）
- **Pinia Store**：GATT 服务树（单连接会话实体，DATA_MODEL §1）
- **Service 接口**：ble-runtime + utils·ble-utils（UUID 标准中文命名）（MODULE_ARCH §1/§3）
- **BLE API**：BLE.discoverServices(deviceId) / BLE.discoverCharacteristics(serviceUUID)（API §8）· wx.getBLEDeviceServices / wx.getBLEDeviceCharacteristics
- **Platform Adapter**：无差异
- **测试用例**：R07 · COVERAGE_CHECKLIST F007 行 · 基准 P006 服务树折叠/展开

### F008 特征读取（P0）

- **业务域**：GATT 调试域
- **用户入口**：P006 特征行「读取」按钮（仅 properties.read=true 出现，PAGE_SPEC §6 按钮表 P06-08）
- **对应页面**：P006
- **UI 组件**：C4 特征行动作键（读取 soft sm）· C5 log-panel(dock)「接收」行（HEX+TEXT 双格式）（COMPONENT.md C4/C5）
- **页面状态**：3s 超时→日志「错误」行（errMsg 中文归一化，微信 10000–10013 映射）（PAGE_SPEC §6 异常处理）
- **Pinia Store**：通信日志条目（DATA_MODEL §1）
- **Service 接口**：ble-runtime
- **BLE API**：BLE.read(serviceUUID,charUUID)（API §9）· wx.readBLECharacteristicValue
- **Platform Adapter**：无差异
- **测试用例**：R08 · COVERAGE_CHECKLIST F008 行 · SEQ §3 读分支

### F009 特征写入（P0）

- **业务域**：GATT 调试域
- **用户入口**：P006 特征行「写入」（properties.write）→ 打开写入弹窗；弹窗内 TEXT/HEX 单选 + 数据输入 + 确认/取消（PAGE_SPEC §6 按钮表 P06-09/P06-11）
- **对应页面**：P006
- **UI 组件**：C9 write-dialog（目标特征摘要 mono / TEXT/HEX chip / textarea / 确认 primary / 取消 ghost）（COMPONENT.md C9）
- **页面状态**：校验拦截态（空输入 toast「请输入数据」；非法 HEX 拦截不产生 BLE 写）；写队列串行中（isSending）
- **Pinia Store**：Session 写队列——同设备串行 / 跨设备并行 / 超时 5s / 深 16 / 优先级插队（PRD §4.2 · MODULE_ARCH §3）
- **Service 接口**：ble-runtime —— 写队列
- **BLE API**：BLE.write(serviceUUID,charUUID,data)（API §9）· wx.writeBLECharacteristicValue（写队列串行化=本功能，API_ACTION_MATRIX §4）
- **Platform Adapter**：无差异（配网明文写与旧固件 fail-fast 语义归 F021）
- **测试用例**：R09 · COVERAGE_CHECKLIST F009 行 · SEQ §3 写分支 · 基准 P006 写弹窗场景

### F010 Notify 监听（P0）

- **业务域**：GATT 调试域
- **用户入口**：P006 特征行「开始监听 ⇄ 停止监听」（properties.notify，PAGE_SPEC §6 按钮表 P06-10）
- **对应页面**：P006
- **UI 组件**：C4 特征行动作键（监听⇄停止 ghost sm）；推送以 C5「接收」日志行呈现（COMPONENT.md C4/C5）
- **页面状态**：char.notifying 同步；断线自动清理订阅（PAGE_SPEC §6）
- **Pinia Store**：Session notify 订阅集（DATA_MODEL §1）
- **Service 接口**：ble-runtime
- **BLE API**：BLE.enableNotify / BLE.disableNotify(serviceUUID,charUUID)（API §9）· wx.notifyBLECharacteristicValueChange
- **Platform Adapter**：无差异（防抖去重为 Base 契约）
- **测试用例**：R10 · COVERAGE_CHECKLIST F010 行 · SEQ §3 监听分支

### F011 通信日志（P0）

- **业务域**：GATT 调试域
- **用户入口**：P006 设备面板「清空日志 / 导出日志」按钮（PAGE_SPEC §6 按钮表 P06-02/P06-03）；P008 操作日志 card 随页面呈现
- **对应页面**：P006（dock 变体）/ P008（card 变体）
- **UI 组件**：C5 log-panel 双变体（行 = 时间 mono + 类型 chip 六色 sys/err/read/write/recv/ok + 消息；工具行 = 清空 ghost sm / 导出 soft sm）（COMPONENT.md C5）
- **页面状态**：空态「暂无日志」（导出时空日志 toast「暂无日志」）
- **Pinia Store**：通信日志条目（全局 500 / 单设备 200 / LRU 40，上限截断）（DATA_MODEL §1 · MODULE_ARCH §3）
- **Service 接口**：core·logger —— 容量管理（MODULE_ARCH §1 core 层）
- **BLE API**：BLE.log(level,message) / BLE.getLogs()（API §12，内存日志）
- **Platform Adapter**：**差异·日志导出行**（10_platform §4）——微信=剪贴板；App=剪贴板+系统分享（文件流候选不做，BR-12）
- **测试用例**：R11 · COVERAGE_CHECKLIST F011 行 · 基准 P006 导出/空日志场景

### F012 断线自动重连（P0）

- **业务域**：GATT 调试域
- **用户入口**：隐式（设备断电/超出范围触发被动断线检测；用户可见出口 = P006 服务面板 error 态「重试」按钮，PAGE_SPEC §6 按钮表 P06-05）
- **对应页面**：P006 / P007（横跨；重连结果同步两页）
- **UI 组件**：B7 op-state（error+重试）· C5 log-panel「系统」行（重连过程日志反馈）
- **页面状态**：重连 NONE→SCHEDULED→RECONNECTING→SUCCESS/EXHAUSTED（SM §2）；主动断开 2s marker 区分、用户主动断开永不重连；3 次耗尽→会话 FAILED→详情页手动重试 ×3
- **Pinia Store**：Session（reconnectState）
- **Service 接口**：ble-runtime —— 重连 3×（1s/3s/5s）backoff；重连期间写队列 abort（PENDING→CANCELLED）（MODULE_ARCH §3）
- **BLE API**：BLE.connect / BLE.getConnectionState · wx.onBLEConnectionStateChange（被动断线检测）（API_ACTION_MATRIX §4）
- **Platform Adapter**：C4 口径——前台会话内重连；后台保连=候选不做（BR-12 · ALIGNMENT_NOTES §2）
- **测试用例**：R12 · COVERAGE_CHECKLIST F012 行 · SEQ §4 被动断线与自动重连 · 基准 P006 场景「被动断线」

### F013 多设备会话管理（P1）

- **业务域**：GATT 调试域
- **用户入口**：tabBar「已连接」进入 P007；「全部断开」按钮（>1 台时）/ 每卡「断开」/ 点卡分流（PAGE_SPEC §7 按钮表 P07-01/02/03）
- **对应页面**：P007 已连接设备（tabBar「已连接」）
- **UI 组件**：C12 summary-card（计数+全部断开 danger）· C1 device-card(conn)（ON 头标/连接 meta/断开 danger sm）· B6 empty-state 双文案 · A1 app-navbar（COMPONENT.md P007 授权表）
- **页面状态**：multi（汇总卡+计数）/ one（无汇总卡）/ empty 两种文案（SHID 配网会话在线 vs 常规）（PAGE_SPEC §7 状态列表）
- **Pinia Store**：ble.js —— 已连接表（SHID 配网会话不占列表但计入 P001「已连接」计数，PAGE_SPEC §7 数据展示规则）
- **Service 接口**：ble-runtime（并发连接去重）+ 散装·断开汇总（Promise.allSettled）（MODULE_ARCH §3）
- **BLE API**：BLE.disconnect ×N（API §7）
- **Platform Adapter**：C3 已裁决——supported_foreground（前台运行时多 Session / 不承诺后台保持与固定最大连接数 / 每 Session 独立错误反馈 / Session Registry 唯一事实源；PLATFORM_CAPABILITY_DECISION §2 · PLATFORM_ADAPTER_SPEC §3.3）
- **测试用例**：R13 · COVERAGE_CHECKLIST F013 行 · 基准 P007 全部断开+部分失败清单弹窗

---

## 3. 广播发射域（F014–F017 · PAGE008）

### F014 广播发射·微信（P1）

- **业务域**：广播发射域
- **用户入口**：tabBar「广播」进入 P008（进入即自动检查支持，onShow 也查）；「开始广播 ⇄ 停止广播」主按钮 / 「检查支持」按钮（PAGE_SPEC §8 按钮表 P08-07/P08-08）
- **对应页面**：P008 BLE 广播（tabBar「广播」）
- **UI 组件**：B3 badge（运行徽章六值：广播中/失败/已停止/已就绪/未就绪/不支持）· B5 form-field（广播中禁用）· C5 log-panel(card)（COMPONENT.md P008 授权表）
- **页面状态**：BROADCAST_STATE 6 态 IDLE→STARTING→ADVERTISING→STOPPING→STOPPED / FAILED（SM §5，单 owner、广播中禁改 payload）
- **Pinia Store**：广播表单+31B 预算（DATA_MODEL §1）
- **Service 接口**：broadcast（会话/适配器）+ 散装·wx 外围双控制器（MODULE_ARCH §3）
- **BLE API**：BLE.startAdvertise(options)（API §10，平台能力决定是否支持）· wx.createBLEPeripheralServer + server.startAdvertising(advertiseRequest, powerLevel)（功率三档映射，API_ACTION_MATRIX §4）
- **Platform Adapter**：**差异·外围能力（差异最大点）**——微信=peripheral+server 链路 / 活动连接冲突拦截（提示先断开）/ devtools 宿主三处拦截（真机调试横幅+检查支持→不支持+启动拦截，PLATFORM_ADAPTER_SPEC §3.1）；C1 已裁决 supported_limited（真机运行时探测后启用 / 后台广播不承诺 / 不允许静默降级；PLATFORM_CAPABILITY_DECISION §1，真机证据待补）
- **测试用例**：R22/R24（PRD §8）· COVERAGE_CHECKLIST F014 行 · SEQ §8 广播启动 · 基准+wechat 实例 P008 微信场景（冲突/devtools/离页自动停+释放外围模式）

### F015 广播发射·App（P1）

- **业务域**：广播发射域
- **用户入口**：同 F014（tabBar「广播」P008，Android App 端）；Android 专属「广播模式 / 发射功率 picker ×2 + 可连接/包含设备名称/添加服务 UUID 开关 ×3」（PAGE_SPEC §8 按钮表 P08-03/04/05）
- **对应页面**：P008
- **UI 组件**：同 F014 组件 + B5 form-field（picker ×2 模式/功率 + switch ×3，仅 Android）
- **页面状态**：6 态 + 权限缺失汇总 modal（去设置）/ 系统蓝牙关闭 Intent 引导（PAGE_SPEC §8 异常处理）
- **Pinia Store**：广播表单（扩展参数参与预算，不改预算算法口径，DATA_MODEL §1）
- **Service 接口**：broadcast·适配器 + nativeplugins/LysBlePeripheral（App 原生插件，MODULE_ARCH §1）
- **BLE API**：BLE.startAdvertise options（模式/功率/可连接/含名称/UUID，API §10）
- **Platform Adapter**：Android=SDK≥31 逐项权限（ADVERTISE→CONNECT）+ 蓝牙开闭前置 + 插件（PLATFORM_ADAPTER_SPEC §4.1）；iOS=插件（NOT_RELEASED 不占本线）
- **测试用例**：R23 · COVERAGE_CHECKLIST F015 行 · SEQ §8 Android 分支 · app 实例 P008 权限链+三开关预算联动场景

### F016 广播负载预算（P1）

- **业务域**：广播发射域
- **用户入口**：P008 表单输入实时联动（设备名称/服务 UUID/厂商 ID/厂商数据；Android 三开关）——无独立按钮，字节数提示区随输入更新（PAGE_SPEC §8 输入表）
- **对应页面**：P008
- **UI 组件**：字节数实时提示（N/31；超限红字）+ B5 校验黄条（UUID 4/8/36 位 hex 非法提示）（COMPONENT.md B5）
- **页面状态**：超限阻止启动（红字「超出限制」+点击开始广播被阻止，不静默截断，BR-05）
- **Pinia Store**：广播表单+31B 预算（DATA_MODEL §1）
- **Service 接口**：broadcast·负载预算 + utils·advertising-payload（MODULE_ARCH §1/§3）
- **BLE API**：—（本地实时核算；参数经 BLE.startAdvertise options 下发）
- **Platform Adapter**：无差异（Android 三开关参与重算，预算算法口径不变）
- **测试用例**：R21 · COVERAGE_CHECKLIST F016 行 · 基准 P008 超限场景

### F017 观察侧证据匹配（P2）

- **业务域**：广播发射域
- **用户入口**：**无页面入口**（P-04 已关闭；N-5 红线：开发不得新增页面入口，DEVELOPMENT_SCOPE §4）
- **对应页面**：无（仅与 P007 Profile 分流间接相关，不呈现）
- **UI 组件**：—
- **页面状态**：—
- **Pinia Store**：—
- **Service 接口**：broadcast·观察证据（服务层就绪，MODULE_ARCH §3）
- **BLE API**：广播内容与观察端上报 JSON 交叉匹配（服务层能力，无页面消费方）
- **Platform Adapter**：—
- **测试用例**：COVERAGE_CHECKLIST F017 行 =「服务层能力，无页面入口」现状标注（如实呈现，不造入口）

---

## 4. Profile 配网域（F018–F024 · PAGE002 / PAGE003 / PAGE005）

### F018 Profile 设备识别（P0）

- **业务域**：Profile 配网域
- **用户入口**：P001 扫描结果 SHID 设备卡（徽章 +「配置 Smart HID」主按钮 + 标准「连接」双入口，PAGE_SPEC §1 按钮表 P01-05/P01-06）/ P007 点卡按 profileId 分流（P07-03）
- **对应页面**：P001（徽章呈现）/ P007（路由分流）
- **UI 组件**：C1 device-card SHID 变体（profileMatch 徽章 STRONG=primary / WEAK=warning +「配置 Smart HID」主按钮）（COMPONENT.md C1）
- **页面状态**：profileMatch STRONG（服务 UUID 9f1d1001-…-1c04 强匹配）/ WEAK（名称前缀 SHID- 弱匹配）（PRD §8 R14）
- **Pinia Store**：ble.js —— ScannedDevice.profileMatch（DATA_MODEL §1）
- **Service 接口**：provisioning·Profile 注册表（matchScannedDevices 注入发现域，MODULE_ARCH §3 · FEATURE_MAP §4）
- **BLE API**：BLE.registerProfile(profile) / BLE.matchProfile(device)（API §13；签名 08 阶段定型，定稿前不得自行新增，ALIGNMENT_NOTES §4）
- **Platform Adapter**：无差异（识别在扫描期完成）
- **测试用例**：R14 · COVERAGE_CHECKLIST F018 行 · 基准 P001 SHID 双入口（PR-2）+ P007 分流；DR-1/DR-2 准绳（DEVICE_PROFILE_RULE §1/§2）

### F019 Smart HID 配网向导（P0）

- **业务域**：Profile 配网域
- **用户入口**：P001 SHID 卡「配置 Smart HID」/ P003「重新配置」（setCurrentDevice）/ P005「重新配网」（经 READY 停广播确认弹窗）（PAGE_SPEC §2 进入条件 · PAGE_FLOW §2）
- **对应页面**：P002 Smart HID 配网向导
- **UI 组件**：C6 provision-stepper（三步骤条）· C7 provision-progress（四行进度）· B5 form-field（SSID≤32/密码≤64/Hub 地址 mono+默认端口 17892 提示）· B9 banner-note（隐私声明常驻表单底部）· B8 error-banner · B7 op-state（COMPONENT.md P002 授权表）
- **页面状态**：phase 三态 connect/configure/status；工作流 DISCOVERING→PAIRING→VERIFYING→PROVISIONED/CANCELLED（SM §3）；configure 阶段断线续填（徽章已断开+表单保留）；配网中物理返回离开确认（BR-10）（PAGE_SPEC §2 状态列表）
- **Pinia Store**：hid.js —— 配网会话/进度（MODULE_ARCH §1）
- **Service 接口**：smart-hid（门面/纯 JS 工作流引擎/表单）+ provisioning·orchestrator（MODULE_ARCH §3）
- **BLE API**：BLE.connect + verifyDeviceInfo（product=smart-hid / 协议版本 / deviceId 正则 ^HID-[A-Z0-9]{8}$，失败即断开报错）（SEQ §5）
- **Platform Adapter**：扫码差异归 F020；配网非连接必然（DR-3：连接路径禁配网前置）
- **测试用例**：R15 · COVERAGE_CHECKLIST F019 行 · SEQ §5 配网全流程 · 基准 P002 三阶段+断线续填+离开确认场景

### F020 ControlHub 配对码扫码（P0）

- **业务域**：Profile 配网域
- **用户入口**：P002 configure 阶段「扫描 ControlHub 配对码」大动作卡（badge 必需→已获取，标题变「重新扫描…」）（PAGE_SPEC §2 按钮表 P02-04）
- **对应页面**：P002（configure 阶段）
- **UI 组件**：扫码大动作卡（B3 badge 状态流转）
- **页面状态**：成功回填（hubAddress=QR host:port）/ 取消 / 权限拒绝 / 失败四分支分类提示，可重扫（PAGE_SPEC §2 异常处理）
- **Pinia Store**：hid.js —— token（仅内存 TTL 5 分钟，createMemoryTokenStore，SM §3 注）
- **Service 接口**：smart-hid（createMemoryTokenStore · parsePairingQrPayload 重复参数拒绝）（SEQ §5 · MODULE_ARCH §3）
- **BLE API**：—（扫码为平台绑定项，10_platform §1）
- **Platform Adapter**：**差异·扫码行**（10_platform §4）——微信/App=uni.scanCode（解析 shid://pair）；Desktop=摄像头扫码为主+粘贴/手输兜底（D2 后）；Web=S2 不可达
- **测试用例**：R16 · COVERAGE_CHECKLIST F020 行 · SEQ §5 扫码分支 · 基准 P002 扫码四分支场景

### F021 分帧明文写入+状态跟踪（P0）

- **业务域**：Profile 配网域
- **用户入口**：P002 configure 阶段「下发配置」按钮（canSubmit=SSID+Hub+token 齐且非配网中，PAGE_SPEC §2 按钮表 P02-05）；status 阶段「取消等待」（P02-06）
- **对应页面**：P002（status 阶段）
- **UI 组件**：C7 provision-progress 四行（Wi-Fi / ControlHub / MQTT 控制链路 / USB Ready × pending/active/done/fail/warn 五态）（COMPONENT.md C7）
- **页面状态**：设备侧 STATUS state/step 驱动四行进度（pairing→hub active、ready→全 done，SM §4）；60s 轮询超时→取消等待
- **Pinia Store**：hid.js —— 进度
- **Service 接口**：smart-hid·provisionAndWait（60s）+ core·framing（framed-v1 分帧：帧头 3B [seq][total][len] / 单块≤128B / 组装 1024B / ≤64 帧 / 帧间隔 30ms）（MODULE_ARCH §3 · SEQ §5）
- **BLE API**：BLE.write（明文顺序写 INPUT 特征 1003，不发起 SMP，API §9）
- **Platform Adapter**：各平台统一直连写入；旧加密固件错误 fail-fast 并提示重烧 V1 简化固件（PLATFORM_ADAPTER_SPEC §4.1 · DEVELOPMENT_SCOPE §7）
- **测试用例**：R17 · COVERAGE_CHECKLIST F021 行 · SEQ §5 下发分支 · 基准 P002 下发→四行进度至 READY；断言零系统配对弹窗与单次写失败

### F022 配网错误恢复（P0）

- **业务域**：Profile 配网域
- **用户入口**：P002 status 阶段失败态「恢复按钮」（文案随错误变，四种动作：回表单 form / 重新扫码 pairing / 跳诊断 diagnostics / 重下发 retry）（PAGE_SPEC §2 按钮表 P02-08）
- **对应页面**：P002（status 阶段失败态）
- **UI 组件**：恢复按钮（B1 btn 文案动态化）；失败行高亮由 C7 承载
- **页面状态**：8 种设备侧错误码（invalid_payload / wifi_failed / controlhub_unreachable / pairing_invalid / pairing_expired / pairing_used / mqtt_invalid / storage_failed，SM §4）；异常三要素（提示+下一步+恢复动作，BR-07）
- **Pinia Store**：hid.js —— errorMessage / recoveryAction
- **Service 接口**：smart-hid —— 错误码→中文提示+恢复动作映射（MODULE_ARCH §3）
- **BLE API**：STATUS error 上行（协议域，非独立 BLE.\* 调用）
- **Platform Adapter**：无差异（四分流 form/pairing/diagnostics/retry 为 Base 契约）
- **测试用例**：R18 · COVERAGE_CHECKLIST F022 行 · SEQ §5 错误分支 · 基准 P002 场景 wifi_failed / pairing_expired / controlhub_unreachable

### ~~F023 已配网设备历史~~（已移除 · 红线行）

- **业务域**：（原 Profile 配网域）
- **用户入口 / 页面 / 组件 / 状态 / Store / Service / BLE API / Adapter / 测试**：**全部不适用——红线行**。已移除（2026-09-02 用户决策，PRD 变更记录）：PAGE004/已配网历史/known_devices 本地存储（90 天 TTL/20 条上限/prune）一律不得复刻（N-4，DEVELOPMENT_SCOPE §4）；R19 已作废（PRD §8）

### F024 Smart HID 诊断（P1）

- **业务域**：Profile 配网域
- **用户入口**：P003「运行诊断」/ P002 配网错误恢复（recoveryAction=diagnostics）（PAGE_SPEC §5 进入条件 · PAGE_FLOW §2）
- **对应页面**：P005 Smart HID 诊断
- **UI 组件**：C8 diag-row ×5（图标 ✓/!/…/·/✗ + 状态词 + 可展开 detail）· B7 op-state · 错误码详情块（code mono+message）· D2 modal（连接确认/重新配网确认）（COMPONENT.md P005 授权表）
- **页面状态**：页面六态 idle/connected/checking/live/offline/error + 行五态 ok/warn/active/pending/fail（SM §8）；无诊断数据时五行 pending（非空白）
- **Pinia Store**：hid.js —— 诊断（MODULE_ARCH §1）
- **Service 接口**：smart-hid·diagnose（MODULE_ARCH §3）
- **BLE API**：BLE.connect + 读实时状态（INFO/STATUS 特征域，API §7 + 协议）
- **Platform Adapter**：无差异；页面栈感知导航（「返回设备详情/重新配网」两处，栈中有则 navigateBack 否则 navigateTo）为 Base 契约（PAGE_FLOW §1 注①②）
- **测试用例**：R20 · COVERAGE_CHECKLIST F024 行 · SEQ §6 诊断 · 基准 P005 重新检测/错误码显隐场景

---

## 5. OTA 域（F025 · PAGE006 子流程）

### F025 OTA 固件升级（P1 · 端到端 BLOCKED）

- **业务域**：OTA 域
- **用户入口**：P006 设备面板「固件更新」按钮（仅检测到 OTA 服务 4fafc201-…-914d 时可见，PAGE_SPEC §6 按钮表 P06-01/P06-12）
- **对应页面**：P006（ota-dialog 子流程弹窗）
- **UI 组件**：C10 ota-dialog（P-03 warn 预警条（BLOCKED 说明）+ 相位文案（确认设备/校验 sha256/传输中 N%/提交/回读）+ 进度条 + 取消（发 abort）/关闭 + 成功 2s 自动关闭）（COMPONENT.md C10）
- **页面状态**：OTA 事务 12 态（SM §6，枚举全集以 ota-manager 为准）；**端到端 BLOCKED（P-03）不得提前宣告可用**（DEVELOPMENT_SCOPE §5）
- **Pinia Store**：（事务状态由 ota 服务承载，非独立 Store 切片；会话所有权归 WORKFLOW:'ota-manager'，SM §1）
- **Service 接口**：ota（事务状态机/包模型/六重校验器）+ utils·ota_manager（MODULE_ARCH §3）
- **BLE API**：BLE.getFirmwareVersion() / BLE.startOTA(file)（API §11，接口位保留，ALIGNMENT_NOTES §4）
- **Platform Adapter**：文件选择差异——微信=chooseMessageFile / App=chooseFile（10_platform §2.2 · PAGE_SPEC §6 OTA 子流程）
- **测试用例**：R25 · COVERAGE_CHECKLIST F025 行 · SEQ §7 OTA 时序 · 基准 P006 OTA 场景（sha256 不符终止/成功 2s 自动关闭）

---

## 6. 系统信息与支撑域（F026–F030 · 横切）

### F026 日志脱敏（P0）

- **业务域**：系统信息与支撑域
- **用户入口**：横切（一切日志输出路径，隐式生效；无独立入口）
- **对应页面**：横切（P006/P008 等全部日志路径与导出物）
- **UI 组件**：C5 log-panel 行内脱敏显示（token=\*\*\*）（COMPONENT.md C5）
- **页面状态**：—（不变式，非状态）
- **Pinia Store**：通信日志条目（DATA_MODEL §1）
- **Service 接口**：散装·日志脱敏 + core·logger（SENSITIVE_PROFILE_KEYS 黑名单 + 保护键白名单）（MODULE_ARCH §3）
- **BLE API**：BLE.log（API §12）
- **Platform Adapter**：无差异（L1 不变式——任何导出物保持脱敏，BR-04 · STORAGE_POLICY S-4）
- **测试用例**：R28 · COVERAGE_CHECKLIST F026 行（演示条目）

### F027 版本元数据展示（P2）

- **业务域**：系统信息与支撑域
- **用户入口**：tabBar「关于」P009（品牌卡运行时版本行）/ P009 菜单「版本记录」→ P010（PAGE_SPEC §9/§10 · PAGE_FLOW §2）
- **对应页面**：P009 关于 / P010 版本记录
- **UI 组件**：B4 kv（键值行，缺失值「—」不隐藏行）· B2 chip（版本/状态 pill/平台状态五词表 VERIFIED/PREVIEW/BLOCKED/UNSUPPORTED/NOT_RELEASED）· B6 empty-state ×3（限制/releases/previews 空态）（COMPONENT.md P009/P010 授权表）
- **页面状态**：版本号三态（运行时获取成功 / 回退 release-metadata（verFallback）/ dev.unknown）；releases/previews/限制列表空态文案（PAGE_SPEC §9/§10 状态列表）
- **Pinia Store**：版本投影（内存实体，DATA_MODEL §1）
- **Service 接口**：散装·版本元数据 + Config·release-metadata.generated.\*（MODULE_ARCH §1/§3）
- **BLE API**：—（非 BLE 域）
- **Platform Adapter**：运行时版本取值渠道分支（APP widget 版本 / 微信 getAccountInfoSync，兜底构建元数据）——取值渠道差异，非行为差异（PAGE_SPEC §9 数据展示规则）
- **测试用例**：R26 · COVERAGE_CHECKLIST F027 行 · 基准 P010 全页+三空态场景

### F028 小程序推广跳转（P2）

- **业务域**：系统信息与支撑域
- **用户入口**：P009「更多小程序」推广卡点击（PAGE_SPEC §9 按钮表 P09-04）
- **对应页面**：P009 关于（推广区）
- **UI 组件**：C11 promo-card（图标块+名称+说明+「前往」soft sm；微信端点击直接发起跳转无确认弹窗；非微信渠道=推广详情 sheet：小程序码+「打开落地页」主操作）（COMPONENT.md C11）
- **页面状态**：未配置 appId→toast「该小程序暂未配置跳转」；跳转失败→modal 重试提示（PAGE_SPEC §9 异常处理）
- **Pinia Store**：—（静态配置投影）
- **Service 接口**：—（平台能力直调；二维码为静态预生成资源·零后端）
- **BLE API**：—
- **Platform Adapter**：**差异·推广跳转行**（10_platform §4）——微信=navigateToMiniProgram 直跳；App=落地页（系统浏览器）+小程序码 sheet；二维码=待实现项（PRD §5 F028 状态「部分实现」）
- **测试用例**：R27 · COVERAGE_CHECKLIST F028 行 · 基准 P009 推广卡场景（含 v1.4.0「跳转失败」场景）

### F029 分享（P2）

- **业务域**：系统信息与支撑域
- **用户入口**：P009 菜单「分享应用」+ 页面级分享（微信 onShareAppMessage/onShareTimeline 右上角菜单，不由页面绘制）（PAGE_SPEC §9 按钮表 P09-03）
- **对应页面**：P009 + 页面级（各页分享配置）
- **UI 组件**：菜单行 + 平台分支反馈（toast/系统分享面板）；分享取消静默
- **页面状态**：失败降级复制（APP/H5 分支）
- **Pinia Store**：—
- **Service 接口**：—（平台能力直调）
- **BLE API**：—
- **Platform Adapter**：**差异·分享行**（10_platform §4）——微信=社交卡片/Timeline；App=系统分享（失败降级复制）
- **测试用例**：COVERAGE_CHECKLIST F029 行 · 基准 P009 分享按平台分支反馈（PRD §8 无独立 R 编号，经 R29 平台验收行旁证）

### F030 国际化（P2 · 未实现且不做 · 红线行）

- **业务域**：系统信息与支撑域
- **用户入口**：无（locale 资源就绪未接线）
- **对应页面**：—（UI 全中文硬编码为已知现状）
- **UI 组件 / 页面状态 / Pinia Store / Service 接口 / BLE API / Platform Adapter**：—
- **测试用例**：R30（现状确认，PRD §8）· COVERAGE_CHECKLIST F030 行（现状标注）。**红线：开发不得引入 i18n（N-6，P-05 已关闭，DEVELOPMENT_SCOPE §4）**

---

## 7. 汇总核对

- **行数**：30 = 29 在册 + F023 红线行；优先级/状态与 FEATURE_MAP §2 逐字一致（P0×17 / P1×7 / P2×5）。
- **特殊状态行**：F017 无页面入口（N-5）· F023 已移除（N-4）· F025 端到端 BLOCKED（P-03，接口位保留）· F030 不做（N-6）。
- **三零回执**：全表 BLE API 均为本地 + BLE + 扫码，无任何 HTTP/云端调用（Z-1/Z-3，BR-01）；全部 Store 切片为内存态、无存储键（Z-2，DATA_MODEL §1 九类实体，BR-02）；不设计数据库、不引入后端（本文档性质约束）。
- **平台差异收敛回执**：Adapter 字段出现的差异点全部属于 10_platform §4 差异表 7 行圈内（权限模型/扫码/分享/推广跳转/日志导出/外围能力/生命周期表达），无圈外差异（PLATFORM_ADAPTER_SPEC §2 合法差异圈）。
- **入口完备回执**：30 个功能的用户入口均索引至 PAGE_SPEC 按钮表（ACT 编号见 API_ACTION_MATRIX §3）或 PAGE_FLOW §2 入口列；隐式触发（F005/F012/F017/F026）与红线行（F023/F030）如实标注「无独立入口」。

## 8. 冻结校验

- ☑ 功能编号/名称/优先级/状态与 PRD §5 + FEATURE_MAP §1/§2 逐字一致，无增删改
- ☑ 业务域与 FEATURE_MAP §1 六域能力树 + §3 域↔页映射一致
- ☑ 用户入口与 PAGE_SPEC 各页「进入条件/按钮表」+ PAGE_FLOW §2 跳转矩阵一致（含 2026-09-02 决策后口径：P004/历史入口不出现）
- ☑ 组件字段全部为 07_design_system/COMPONENT.md 在册组件（页面↔组件授权表内），无页外拼装
- ☑ 状态字段全部索引至 STATE_MACHINE §1–§9 正典（SM §N），未新造状态或转移
- ☑ Store/Service 字段与 MODULE_ARCH §1/§3 模块树对应；core/utils 落位标注；「—」=不经该层
- ☑ BLE API 字段 = API_ACTION_MATRIX §4 总表口径（BLE.\* 章节 + wx 实证），无新造接口；**（v2.2）方法与事件契约引用 API_SPEC，类型引用 DATA_MODEL(08)，错误引用 ERROR_CODE，权限引用 PERMISSION（§0.2 引用基线）**
- ☑ **（v2.1）旧文件名/文件数为 legacy reference，目标模块职责另列 §0.4，不要求复制旧目录数量（IMPLEMENTATION_TARGET §2 规则 5）**
- ☑ Adapter 字段差异均圈定在 10_platform §4 七行内；C1/C3 已裁决（PLATFORM_CAPABILITY_DECISION，真机证据待补）、C4 待裁决不翻转（ALIGNMENT_NOTES §2）
- ☑ 测试用例字段 = PRD §8 R 编号 + COVERAGE_CHECKLIST 功能覆盖行 + SEQ §N + 基准原型场景，四源交叉
- ☑ F023/F030 红线行与 N-4/N-6、F017 与 N-5、F025 BLOCKED 与 DEVELOPMENT_SCOPE §5 一致
