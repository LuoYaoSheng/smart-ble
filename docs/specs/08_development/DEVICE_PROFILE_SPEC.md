# DEVICE_PROFILE_SPEC —— 设备 Profile（档案）规格（开发前冻结）

> 版本：1.0（开发前冻结抽取）· 生成日期：2026-09-03
> 输入（本文全部结论的来源，仅此四目录）：[02_product](../02_product/)（PRD / PRODUCT_MODEL / FEATURE_MAP / BUSINESS_RULE / DATA_MODEL）· [03_flow](../03_flow/)（PAGE_SPEC / PAGE_FLOW / USER_FLOW / BUSINESS_FLOW）· [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) · [11_ecosystem](../11_ecosystem/)（API_UNIFIED_SPEC / FEATURE_CHECKLIST / ALIGNMENT_NOTES）
> 性质：**不新增功能、不改变产品逻辑，只做抽取**。Profile 系统为现行规范中已确立的产品模型第二轴（PRD §1.1），本文将其分散于各规范的契约收口为一页开发基线；冲突时以被引文档为准。

## 1. 定位

- 产品模型：**通用 BLE Inspector（检查器）+ 可扩展设备 Profile（档案）系统**。核心不是某一个硬件，而是「发现→广播→GATT 调试→OTA→第一方硬件 Profile（Smart HID 配网）」的完整工具链。（PRD §1.1）
- Profile 的产品价值：**新设备家族以 Profile 注册表接入（UUID/前缀匹配→专属路由与动作），通用调试能力全家族复用**。（PRD §1.4 核心价值 4）
- 能力域归属：Profile 配网域（Smart HID = 首个第一方档案；esp32-demo 演示）。（FEATURE_MAP §1）
- 生态对照：Device Profile = 生态功能点 BLE-013（FEATURE_CHECKLIST §14）；本项目对应 F018 + Profile 扩展原则，矩阵 §13 registerProfile/matchProfile 与该原则同构，Smart HID = 首个内置 Profile（ALIGNMENT_NOTES §3）。

## 2. Profile 契约（注册 · 匹配 · 优先级）

| 契约项 | 内容 | 来源 |
|---|---|---|
| 注册方式 | 代码层注册（Profile 注册表）；U5「自研硬件接入者」按 Profile 契约注册，小程序自动识别给专属动作 | PRD §1.4-4 · PRD §2 U5 行 |
| 契约承载位置 | 仓库根共享层 core/（协议镜像 + framing + **Profile 契约** + logger） | PRD §4.2 |
| 匹配规则 | **UUID=STRONG 优先于名称前缀=WEAK**；STRONG=广播含 Profile 服务 UUID；WEAK=仅名称前缀匹配 | F018（PRD §5）· R14 |
| 生态接口 | `BLE.registerProfile(profile)`（示例 `{"type":"hid","services":["battery","hid"]}`）/ `BLE.matchProfile(device)`（返回 `{"profile":"hid"}`） | API_UNIFIED_SPEC §13 |
| 匹配后表现 | 设备卡显示 Profile **徽章与专属动作按钮**（发现域注入：matchScannedDevices 贴徽章与专属动作） | R14 · FEATURE_MAP §4 |
| 路由分流 | 已连接页点卡**按 profileId 分流**：有 Profile 走其路由，否则 P006 | PAGE_SPEC §7 · PAGE_FLOW §2 |
| 路由参数 | P006 URL 可携带 `[/profileId]`；P002 deviceId 编码入 URL（buildProfileActionUrl / buildHidProvisionUrl） | PAGE_FLOW §3 |

**范围限定（不据此扩 v1 范围）**：生态清单 BLE-013 列出的「自定义页面/自定义协议/自定义数据解析」为生态全集表述；本项目 v1 正典对 Profile 的产品承诺为「识别 → 徽章/专属动作/专属路由」（上表），生态清单不反向扩 v1 范围（11_ecosystem README 定位表：本项目产品范围仍以 02_product 为准）。

## 3. 内置 Profile：Smart HID（唯一第一方档案）

### 3.1 识别与身份验证

| 项 | 值 | 来源 |
|---|---|---|
| STRONG 匹配 | 广播含服务 UUID `9f1d1001-…-1c04`（强匹配，绿色徽章） | R14 · PRD 场景 S2 |
| WEAK 匹配 | 名称前缀 `SHID-`（同样给出 Profile 标识） | R14 · PAGE_SPEC §1 状态行 |
| 身份验证（连接后） | `verifyDeviceInfo`：product==='smart-hid' + 协议版本 + deviceId 正则 `^HID-[A-Z0-9]{8}$`；不通过则断开并给出错误与「重新连接」 | BUSINESS_FLOW §4 · R15 · PAGE_SPEC §2 |
| 验证时机 | 进入配网向导即自动连接+验证（读 Device Info，订阅 INFO/STATUS） | USER_FLOW S2 · PAGE_SPEC §2 |

### 3.2 专属动作与路由（Smart HID 全部入口）

| 入口 | 动作 | 目标 | 来源 |
|---|---|---|---|
| P001 SHID 卡「配置 Smart HID」 | 等扫描收尾→setCurrentDevice | navigateTo P002（配网向导） | PAGE_SPEC §1 · PAGE_FLOW §1 |
| P001 SHID 卡「连接」（标准能力） | 与普通卡一致的连接路径 | navigateTo P006 | PRODUCT_MODEL §1 基线落地（devCard v1.0.1 双入口）· 10_platform §6 修正① |
| P003「重新配置」 | setCurrentDevice | navigateTo P002 | PAGE_SPEC §3 |
| P003「运行诊断」 | 携带 deviceId | navigateTo P005 | PAGE_SPEC §3 |
| P003「高级 BLE 调试」 | 暂存路由上下文 | navigateTo P006 | PAGE_SPEC §3 |
| P005「重新配网」 | modal 确认（READY 需先进配网模式）→栈感知 | P002 | PAGE_SPEC §5 |
| P007 点卡 | 按 profileId 分流 | Profile 路由 | PAGE_SPEC §7 |
| P002 错误恢复 diagnostics | recoveryAction=diagnostics | P005 | PAGE_FLOW §1 虚线 |

### 3.3 配网协议要点（Smart HID 专属事务）

来源：BUSINESS_FLOW §4（正常链全文）；PAGE_SPEC §2；PRD §7.2。

| 项 | 契约 |
|---|---|
| 表单约束 | SSID ≤32；密码 ≤64 可空；Hub 地址 host[:port]，默认端口 17892 |
| 配对码 | `shid://pair` 二维码扫码获取（产品统一口径，2026-09-03 用户修正）；token 仅内存、TTL 5 分钟 |
| 下发编码 | candidate JSON → **framed-v1 分帧**：帧头 3B、单块封顶 128B（=MTU-3-3）、组装上限 1024B、帧数上限 64、写帧间隔 30ms |
| 写入 | 明文顺序写 INPUT 特征；不发起 SMP/系统配对；旧加密固件错误 fail-fast 并提示重烧 |
| 状态跟踪 | provisionAndWait：60s 轮询 STATUS；state/step 双映射驱动四行进度（Wi-Fi→ControlHub→MQTT 控制链路→USB Ready） |
| 成功 | state=ready 四行全绿→会话内存快照→redirectTo P003 |
| 错误恢复 | 8 种设备侧错误码 → form/pairing/diagnostics/retry 四种恢复动作（全表见 BUSINESS_FLOW §4 异常表） |
| 会话互斥 | session.provisioning 标志（配网会话互斥） |

### 3.4 诊断契约（Smart HID 专属）

五项链路实时检查：**BLE / Wi-Fi / ControlHub / 控制连接 / 设备 Ready 状态**；行状态 ok/warn/active/pending/fail；诊断结果由设备 status.state/step/error 映射（错误串定位异常行）；「显示错误码」展示最近错误 code+message。（F024；R20；PAGE_SPEC §5；STATE_MODEL §1 第 8 项）

### 3.5 边界与口径

| 项 | 内容 | 来源 |
|---|---|---|
| READY 设备边界 | READY 后关闭蓝牙广播——重新配网需设备进入配网/恢复模式（各重配入口均带确认提示） | BUSINESS_FLOW §4 边界 · PRD 场景 S3 |
| HID 控制边界 | 不做 HID 实时键鼠控制（该能力属 ControlHub→MQTT 链路，本产品只负责配网与诊断）；成功态固定说明「HID 控制请通过 ControlHub 下发」 | PRD §1.3 · PAGE_SPEC §2 |
| 会话计数口径 | Smart HID 配网会话**不占用 P007 列表**，但计入 P001「已连接」计数（通用连接数 + SHID 配网会话在线） | PAGE_SPEC §1/§7 · USER_FLOW S6 |
| 断线语义 | configure 阶段断线→徽章已断开+**表单保留**+重连续传 | PAGE_SPEC §2 · R15 |

## 4. Profile 扩展原则（红线：Profile 不得破坏普通设备流程）

> 原文（PRODUCT_MODEL §1，2026-09-03 用户走查确立）：**特殊设备（Smart HID 等 Profile 设备）是标准 BLE 设备的扩展，而非替代——在任何平台、任何入口，特殊设备必须保留标准设备的全部能力（发现/广播数据/连接/GATT 调试/日志），Profile 能力（配网/诊断）在其上叠加。**

| # | 规则 | 来源 |
|---|---|---|
| PR-1 | Profile 设备保留标准设备全部能力：发现、广播数据查看、连接、GATT 调试、日志——Profile 能力只叠加不替换 | PRODUCT_MODEL §1 · 10_platform §6 2026-09-03 修正① |
| PR-2 | 基线落地形态：SHID 设备卡双入口 = 「配置 Smart HID」（Profile 主入口）+ 标准「连接」入口（基准原型 devCard v1.0.1，三平台内核重同步 + Web W2 同口径） | PRODUCT_MODEL §1 基线落地句 · PRODUCT_MODEL §6 决策记录 2026-09-03 ① |
| PR-3 | 平台不变式（L1）：平台不得改变产品逻辑（旅程/状态机/错误码恢复动作）、数据模型、核心流程 S1–S6——Profile 行为同样受此约束 | BUSINESS_RULE BR-11 · 10_platform §4 不变式行 |
| PR-4 | 复用关系：Profile 配网域**复用** GATT 调试域连接/写入/notify 基础设施（provisioning transport 构建在 ble-runtime 之上）；经注册表给设备发现域注入识别能力 | FEATURE_MAP §4 |
| PR-5 | 数据契约不变：Profile 流程中的实体（配网表单与凭据等）全部为内存态，受零持久化与脱敏规则约束 | DATA_MODEL §1/§2 |
| PR-6 | 识别不得影响无 Profile 设备：无匹配设备走通用路径（显示名 fallback 至「未命名 BLE · ID后四位」，R05；P007 无 profileId → P006） | PAGE_SPEC §1 · §7 |

## 5. 新 Profile 接入（既定流程，非本轮新增）

1. 按 Profile 契约在代码层注册（服务 UUID / 名称前缀 + 专属动作与路由）——PRD §1.4-4。
2. 注册后扫描期自动识别：UUID STRONG / 前缀 WEAK 贴徽章与专属动作——F018 / R14。
3. 生态层同构接口：`BLE.registerProfile` / `BLE.matchProfile`（API §13；08 阶段定型，ALIGNMENT_NOTES §4——**接口定型属开发期待办，本文不自行定义新签名**）。
4. 新 Profile 不得触发本文 §4 红线（叠加不替换）。

## 6. 冻结校验

- ☑ 唯一内置 Profile = Smart HID（esp32-demo 为演示档案）；无规范依据不得新增内置 Profile
- ☑ 匹配/验证/配网/诊断契约全部溯源（§2–§3 各表）
- ☑ Profile 扩展原则六条（§4）与 PRODUCT_MODEL §1 / BR-11 / FEATURE_MAP §4 逐条对应，无新造规则
- ☑ 「特殊设备破坏普通设备流程」为零容忍项：开发验收时以 §4 PR-1/PR-2 为准绳（对照 P001 SHID 卡双入口与 P007 分流）
