# DEVELOPMENT_SCOPE —— 开发范围冻结（进入开发前的边界基线）

> 版本：1.0（开发前冻结抽取）· 生成日期：2026-09-03
> 输入（本文全部结论的来源，仅此四目录）：[02_product](../02_product/)（PRD / FEATURE_MAP / PRODUCT_MODEL / BUSINESS_RULE / STATE_MODEL）· [03_flow](../03_flow/)（PAGE_SPEC / PAGE_FLOW / USER_FLOW）· [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) · [11_ecosystem](../11_ecosystem/)（README / ALIGNMENT_NOTES）
> 性质：**不新增功能、不改变产品逻辑，只做抽取**。本文冻结「开发做什么/不做什么/什么受限/什么待验证」；所有范围数字与决策均引用来源，本文不产生新决策。

## 1. 平台范围（D1–D3，已拍板）

来源：10_platform §5（优先级建议）/ §6（决策清单）；PRD 变更记录 D1 行；PRODUCT_MODEL §6。

| # | 平台 | 范围结论 | 依据 |
|---|---|---|---|
| D1 | **首批开发 = 微信小程序 + App·Android**（iOS 现状 NOT_RELEASED，不占首批） | 已决策 2026-09-02（用户「继续」按默认建议确认） | 10_platform §6 D1 行 · PRD 变更记录第 3 行 |
| D2 | Desktop | **待技术 spike**（Electron vs Tauri + BLE 原生层，不预判）；**spike 仍为进入开发的前置**；差异原型已齐（2026-09-03，只表现形态不预判选型） | 10_platform §6 D2 行 |
| D3 | Web | **开发暂缓（选项 b）**——S1 扫描/S4 广播两条核心旅程在浏览器断裂；原型层已按「GATT 调试器」子集形态先行（2026-09-03），供未来决策参考，开发仍暂缓 | 10_platform §6 D3 行 |

开发顺序基线（10_platform §5，首批内部次序）：**P1 微信小程序**（基准平台，产品恢复已完成，v1 直接实现）→ **P2 App·Android**（能力最全+已有插件基础，扫描/GATT/配网 UI 复用基准原型）→ P3 Desktop（待 spike）→ P4 Web（子集或暂缓）。

平台不变式（全部平台开发的前提）：**先有产品，再有平台**——产品核心逻辑/数据模型/核心流程不因平台改变（PRD 变更记录第 2 行；10_platform 前提句）。平台差异仅限 10_platform §4 差异设计表列出的差异点；新差异须先回写规范再开发（BR-12）。

## 2. 功能范围（29 项在册）

来源：FEATURE_MAP.md §2（统计）；PRD §5（功能列表正典）。

| 维度 | 值 |
|---|---|
| 在册功能 | **29**（F001–F030 去除 F023） |
| 优先级分布 | P0 ×17 / P1 ×7 / P2 ×5 |
| 状态分布（旧代码现状） | 已实现 ×27 · 部分实现 ×1（F025 BLOCKED）· 未实现 ×1（F030）· 已移除 ×1（F023） |

能力域 ↔ 页面映射（FEATURE_MAP §3）：设备发现域→PAGE001；GATT 调试域→PAGE006/PAGE007；Profile 配网域→PAGE002/PAGE003/PAGE005；广播发射域→PAGE008；OTA 域→PAGE006（子流程）；系统信息域→PAGE009/PAGE010。

## 3. 页面与流程范围

| 项 | 结论 | 来源 |
|---|---|---|
| 页面清单 | PAGE001–PAGE010，**PAGE004 已移除**（整页及其入口链） | PRD §4.3 · PAGE_SPEC §4 · PAGE_FLOW §1「已移除」注 |
| 核心旅程 | S1 调试 / S2 首次配网 / S3 故障排查 / S4 广播验证 / S5 固件升级（受限）/ S6 多设备管理——**全部平台无关** | PRD §3 · 10_platform §1 结论 |
| 导航矩阵 | 以 PAGE_FLOW §1 跳转图 / §2 矩阵为准（redirectTo 仅 P002→P003 一处；栈感知导航仅 P005 两处） | PAGE_FLOW §1/§2 |
| 验收基线 | **R01–R30（R19 已作废）**，Given/When/Then 可直接转测试用例 | PRD §8 |

## 4. 明确不做（负面清单 · 开发红线）

| # | 不做项 | 依据 |
|---|---|---|
| N-1 | 登录 / 会员 / License / 支付 / 订单 / 商业设备管理 | PRD §1.3 · BR-01 |
| N-2 | HID 实时键鼠控制（属 ControlHub→MQTT 链路） | PRD §1.3 |
| N-3 | 云同步 / 远程设备管理 / 任何 HTTP、云端依赖 | PRD §1.3 · Z-3（10_platform §3 尾句） |
| N-4 | F023 已配网设备历史 + PAGE004 + known_devices 本地存储（90 天 TTL/20 条/prune） | PRD 变更记录第 1 行 · BUSINESS_FLOW §4 已移除业务 |
| N-5 | F017 观察侧证据匹配的**独立页面入口**（P-04 关闭：不做；服务层能力保持现状） | PRD 变更记录 D1 行 · PRD §5 F017（「已实现（无消费方）」） |
| N-6 | F030 国际化 i18n（P-05 关闭：不做；UI 全中文为已知现状 R30） | PRD 变更记录 D1 行 · R30 |
| N-7 | 未决策的平台候选增强：后台保连通知、日志文件流导出、URL 参数预填配网信息、Android 蓝牙快捷设置直达、OTA 固件库本地管理、多设备并排工作台等 | BR-12 · 10_platform §2.2/§2.3/§2.4「可能增强」（均标注建议候选） |
| N-8 | 生态清单未纳入项：BLE-009 设备管理（我的设备/别名/收藏/删除）、BLE-011 协议调试（数据模板/快速发送/自动循环发送）、iBeacon/Eddystone 专解、Write Without Response/MTU 分包/数据历史（BLE-005 扩展项） | ALIGNMENT_NOTES §3（生态不反向扩 v1 范围，11_ecosystem README 定位表） |

## 5. 受限开放：OTA（F025）

- 状态：**部分实现（端到端 BLOCKED）**——客户端与固件完整事务尚未对齐（PRD §5 F025 行；PRD 场景 S5 ⚠ 标注）。
- 状态机登记：OTA 事务 12 态，**端到端 BLOCKED（P-03）**（STATE_MODEL §1 第 6 项）。
- 契约保留：12 态事务、六重包校验、180B/20ms 分包、commit+版本回读（PRD §7.5 流程图；PAGE_SPEC §6 OTA 子流程；BUSINESS_FLOW §6）。
- 开发口径：OTA 动作与契约按规范实现（API_ACTION_MATRIX P06-01/P06-12），**端到端 BLOCKED 状态保持，不得提前宣告可用**；生态接口位 `BLE.getFirmwareVersion` / `BLE.startOTA` 保留（ALIGNMENT_NOTES §4）。

## 6. 生态对齐的既定处置（不改变开发范围）

来源：11_ecosystem README 定位表；ALIGNMENT_NOTES §2（C1–C7）/ §3（优先级口径差）。

- 定位：三份生态规范 = 生态级上位基线（多语言家族全集）；本项目 = 其中 **uni-app 实现线**；**产品范围仍以 02_product 为准，D1–D3 排期不变**。
- 冲突处置总则：**旧代码实证 + 现行 canon 优先**，不翻转已验证行为；C1/C3 已于 2026-09-03（08-G0）裁决（[PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md)），其余冲突项维持「待裁决」登记。
- 开发直接相关的冲突项（C1/C3 已裁决）：

| # | 冲突 | 处置 |
|---|---|---|
| C1 | 广播发送：矩阵=微信 ❌ vs 实证 F014 △（wx.createBLEPeripheralServer 真机可用） | **已裁决（2026-09-03，08-G0）：supported_limited**——保留 F014；devtools unsupported；真机运行时探测后启用；后台广播不承诺；不允许静默降级；真机证据待补（PLATFORM_CAPABILITY_DECISION §1） |
| C3 | 多设备连接：矩阵=微信 ❌ vs 实证 F013 ✅ | **已裁决（2026-09-03，08-G0）：supported_foreground**——保留 F013；前台运行时多 Session；不承诺后台保持与固定最大连接数；每 Session 独立错误反馈；Session Registry 唯一事实源（PLATFORM_CAPABILITY_DECISION §2） |
| C4 | 自动重连：矩阵=微信 ⚠️ vs F012 前台会话内重连 | 口径差登记不翻转；开发期区分「会话内重连 vs 后台保连」两层语义 |
| C2/C5 | iOS/macOS 广播矩阵 ❌（公开外围能力待验证）；矩阵无 Web 行 | 登记不阻塞：iOS NOT_RELEASED、Desktop 待 D2、Web 以 10_platform §3 + W1 门禁为准 |

- 优先级口径差：清单 §11 将广播发送/多设备列为 P2，产品按用户价值已实现 F014/F015/F013——**产品现状优先**（ALIGNMENT_NOTES §3 末段）。

## 7. 待验证清单（登记制度，禁止脑补）

来源：10_platform §2 各平台【待验证】标注；STATE_MODEL §2 第 4 条；10_platform §2.1（PC 端微信）。

| # | 事项 | 归属 |
|---|---|---|
| V-1 | Desktop BLE 原生集成与选型（Electron vs Tauri；CoreBluetooth/WinRT/BlueZ） | D2 spike 前置 |
| V-2 | Linux 广播外围受 BlueZ/内核权限影响 | 两处口径一致登记【待验证】 |
| V-3 | Web：watchAdvertisements / LE Advertising 为实验性 API【待验证】；Safari 桌面/iOS 支持分化 | Web 暂缓依据 |
| V-4 | PC 端微信 BLE 支持：旧代码未覆盖【未知，未验证】——不建模仅登记 | 微信宿主维度 |
| V-5 | iOS CoreBluetooth / macOS 外围能力为公开技术事实【待验证】 | C2 登记 |
| V-6 | STATE_REVIEW §5 遗留【未知】项：开发期核对，不阻塞（禁止脑补登记制度） | STATE_MODEL §2 第 4 条 |

## 8. 冻结校验

- ☑ 平台范围 = D1/D2/D3 原文结论，无扩解；开发顺序引 10_platform §5
- ☑ 功能/页面/验收数字（29 项、P001–P010 除 P004、R01–R30 除 R19）与 FEATURE_MAP/PRD 逐字一致
- ☑ 负面清单 8 条全部有出处；受限项（OTA）未擅自翻转；C1/C3 已裁决登记（PLATFORM_CAPABILITY_DECISION，真机证据待补）、C4 维持待裁决
- ☑ 待验证清单沿用规范原标注（【待验证】/【未知】），本文未替任何一项下结论
