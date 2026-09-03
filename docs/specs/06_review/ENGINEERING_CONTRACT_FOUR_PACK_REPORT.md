# ENGINEERING_CONTRACT_FOUR_PACK_REPORT —— 08-G1 工程契约四件套生成与事件模型收口报告

> 第 17 份评审文件 · 2026-09-03 · 08-G1 任务收口报告（汇编本轮产物与核验结果）
> 任务：工程契约四件套生成与事件模型收口（用户任务书：收口 Runtime 事件模型 / 拆分平台端口 / 生成 API_SPEC·DATA_MODEL·ERROR_CODE·PERMISSION / Engineering Contract Readiness 达 PASS / 功能实现仍等待 09_test 真实点击基线）。
> 范围纪律：只修改 `docs/specs/**`；`apps/**`、`core/**`、`tests/**`、`docs/specs/prototype/**` 零变更；未创建 apps/uniapp-next；未编写实际业务代码；未执行 git commit/push（基线 `2b25725`）。
> **⚠ 08-G0.1 后读法（2026-09-03 追记）**：本文正文中的 TARGET_APP_ROOT 指向（当时为平行新建目录口径）与「Engineering Contract Readiness = PASS」均为 **08-G1 当时快照**——08-G0.1 方向纠偏后：TARGET_APP_ROOT = 既有 `apps/uniapp` 原工程内重构；Engineering Contract Readiness 回落 **CONDITIONAL PASS**（待 LEGACY_REUSE_MATRIX 逐项裁定 + 四件套按 in-place refactor 口径完善）。四件套文档本体（方法/类型/错误/权限契约）继续有效，仅落位口径以 [IMPLEMENTATION_TARGET](../08_development/IMPLEMENTATION_TARGET.md) v1.2 为准；详见 [IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT](IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT.md)。台账原文不回写。

## 1. 四件套产物清单

| 文件（08_development/） | 版本 | 定位 | 规模要点 |
|---|---|---|---|
| [API_SPEC.md](../08_development/API_SPEC.md) | v1.0 | **方法与事件契约**（本轮核心）：SmartBleRuntimeApi（12 域 37 方法）+ Platform Ports（×9 端口 33 方法）两级 API；事件目录（P×7 + D×13）；CommandResult\<T\>；并发与所有权 12 条冻结；capability 结构化；生命周期 5 规则；OTA BLOCKED | §0–§18 |
| [DATA_MODEL.md](../08_development/DATA_MODEL.md) | v1.0 | **运行时类型与字段契约**：值对象 ×9 + 事件信封（AppEvent/PlatformEvent/DomainEvent）+ 实体 ×26 + 技术字段四标记 + 数据不变式 ×8；与 02_product/DATA_MODEL（产品语义模型）双层不互相替代 | §0–§8 |
| [ERROR_CODE.md](../08_development/ERROR_CODE.md) | v1.0 | **统一错误对象与三级映射**：AppError（12 字段）+ 四层分层（platform-native/sdk-transport/product-domain/validation-capability）+ BLE_001～008 + 业务码全集 + 恢复动作（四分流+通用五动作）+ 取消语义 + 日志脱敏 + 平台映射边界 | §1–§8 |
| [PERMISSION.md](../08_development/PERMISSION.md) | v1.0 | **工程权限状态与最小权限矩阵**：四概念区分（capability/state/permission/host limitation）+ PermissionState ×7 + 九组动作 × 四环境矩阵 + 请求原则 ×7 + 与 ERROR_CODE 对接 + C1/C3 关系 | §1–§7 |

同轮修订（docs/specs 内 7 件）：

| 文件 | 版本变化 | 修改要点 |
|---|---|---|
| [08_development/RUNTIME_ARCHITECTURE.md](../08_development/RUNTIME_ARCHITECTURE.md) | v1.1 → **v1.2** | 事件模型收口（§0.5）、运行隔离（§0.6）、命令流结果四值（§2.1）、PlatformPortBundle ×9（§1.4）、禁令重申（§0.7）、SSOT 增第 5 禁（§3.2）、测试边界按端口重排（§6） |
| [08_development/PLATFORM_ADAPTER_SPEC.md](../08_development/PLATFORM_ADAPTER_SPEC.md) | v1.1 → **v1.2** | 实现对象升级为 PlatformPortBundle（§0 图/接入方向、§2「Port 接入与职责拆分」行）；错误码分层转引 ERROR_CODE |
| [08_development/IMPLEMENTATION_TARGET.md](../08_development/IMPLEMENTATION_TARGET.md) | v1.0 → **v1.1** | 「apps/ 下不得出现第三个实现线」收窄为「不允许新增第三条 uni-app D1 实现线」，不误伤 apps/{android,ios,flutter,desktop}；TARGET_APP_ROOT 零改动 |
| [08_development/API_ACTION_MATRIX.md](../08_development/API_ACTION_MATRIX.md) | v1.0 → **v1.1** | API 引用切到 API_SPEC（§0/§4/§6），保留页面动作映射职责；编号零改动 |
| [08_development/FEATURE_IMPLEMENTATION_MATRIX.md](../08_development/FEATURE_IMPLEMENTATION_MATRIX.md) | v2.1 → **v2.2** | §0.2 引用基线：类型→DATA_MODEL(08)、错误→ERROR_CODE、权限→PERMISSION、API→API_SPEC；编号零改动 |
| [docs/specs/README.md](../README.md) | — | 08 行改列十四件实际文件、状态「工程契约完成」；融合路线/公共职责/决策记录（新增 08-G1 条目）同步 |
| [06_review/DEVELOPMENT_READINESS_FINAL.md](DEVELOPMENT_READINESS_FINAL.md) | — | §0 两轨升三轨（PASS / PASS / WAITING）；条件 6b 改判已完成；最终判定重写 |

合计：新增 4（四件套）+ 修订 7 + 本报告 1 = 12 件（全部位于 docs/specs）。

## 2. Runtime v1.2 事件模型修正

| 修正项 | 内容 | 落点 |
|---|---|---|
| 事件来源二分 | **PlatformEvent**（BluetoothStateChanged / DeviceFound / ConnectionStateChanged / CharacteristicValueChanged / PeripheralStateChanged / PermissionStateChanged / LifecycleChanged ×7——平台/系统回调，只被 Adapter 订阅归一化）与 **DomainEvent**（ScanRequested…OperationCancelled ×13——命令/状态机/校验/定时器/超时）分类闭合，不得混写；统一关系 `PlatformEvent/DomainEvent → AppEvent → Handler/Reducer → Store` | RUNTIME v1.2 §0.5；信封契约 DATA_MODEL §2；载荷目录 API_SPEC §3 |
| 命令流结果收口 | 命令流 `Page → Application Action → Domain Service → Platform Port → Adapter → System`；结果只允许 **accepted / rejected / cancelled / completed** 四值；**命令结果不得由 Service 直写 Store——ACT 必须转 DomainEvent 再交 Handler/Reducer**（结果上行与事件通道汇合于 Handler，Store 写入口唯一） | RUNTIME v1.2 §2.1；CommandResult 契约 API_SPEC §4 |
| 运行隔离 | 五元组 **operationId / sessionId / generation（run token）/ timestamp / source**；旧运行的异步回调、timer、Promise、平台回调在 operationId/generation 不匹配时**必须丢弃**；重新触发产生新 operationId 并推进 generation；取消后挂起回调同规则。**P005 DIAG_RUN 教训抽象为通用规则，原型变量名（DIAG_RUN 旗标）不升格为接口名** | RUNTIME v1.2 §0.6；technical 字段 DATA_MODEL §6 |
| 依赖禁令维持 | Service import Store / Store import Service / 双向依赖 / Core 调 Adapter / Page·Component 调平台 API / Adapter 改状态机——逐字重申（§0.7），R-1～R-5 在表（§0.4） | RUNTIME v1.2 §0.4/§0.7 |

## 3. Port 职责拆分

单一「BLE Platform Port」拆为 **PlatformPortBundle ×9**（RUNTIME v1.2 §1.4；PLATFORM_ADAPTER_SPEC v1.2 §0/§2；API_SPEC §2）：

| Port | 职责 | 关键边界 |
|---|---|---|
| BlePlatformPort | BLE 中央/GATT/Notify/外围广播/蓝牙状态（19 原语方法） | **权限不混入；扫码/分享/剪贴板/文件/外链/设备信息不混入** |
| PermissionPort | 权限查询/申请/订阅/权限设置页跳转 | 权限通道独立（旧 scan-permission 收编于此） |
| QrScanPort / SharePort / ClipboardPort / FilePickerPort / ExternalNavigationPort / DeviceInfoPort / LifecyclePort | 扫码（F020 三分支）/ 分享（F029）/ 复制瞬态通道 / OTA 选包 / 外链与小程序跳转 / 宿主与版本 / BR-06 触发源 | 各自独立契约 |

通用规则：所有 Port 由**组装根注入**；**禁止泄露 wx.\*/plus.\* 原生对象**；**Adapter 可实现多个 Port，Base Core 只依赖抽象接口**；**物理文件是否拆分不是本轮决策**（职责契约必须分开）。事件模型中取消/权限/生命周期分别有对应 PlatformEvent（OperationCancelled 为 DomainEvent；PermissionStateChanged / LifecycleChanged 为 PlatformEvent）。

## 4. API 方法 / 事件统计

| 维度 | 统计 |
|---|---|
| SmartBleRuntimeApi 方法 | **37**：环境 5 / 扫描 3 / 连接 4 / GATT 7 / 广播 4 / Profile·配网·诊断 8 / OTA 3 / 日志 3（API_SPEC §5–§12） |
| technical-only 方法 | **1**（dispose——生命周期对称防泄漏，已登记存在理由，API_SPEC §17） |
| Platform Ports | **9 端口 33 方法**（BlePlatformPort 19 + 支撑端口 14，API_SPEC §2） |
| 事件 | **20**：PlatformEvent ×7 + DomainEvent ×13（闭合集，API_SPEC §3） |
| F/ACT 追溯 | 37 方法全部可追溯 F 或 ACT 编号（唯一 technical-only = dispose）；支撑端口动作在 API_ACTION_MATRIX §3 有 ACT 对应 |
| 并发与所有权冻结 | 12 条（单扫描会话/deviceId 去重/Registry 事实源/owner-borrow/会话分账/同设备串行·跨设备并行/深 16·单写 5s/重连 1s·3s·5s×3/主动断开不重连/广播单 owner/OTA 接管禁重连/旧运行失效，API_SPEC §13） |

## 5. 数据实体统计

| 维度 | 统计 |
|---|---|
| 基础值对象 | **9**（DeviceId/SessionId/OperationId/ProfileId/ServiceUuid/CharacteristicUuid/Timestamp/HexString/ByteArray） |
| 事件信封 | **3 类**共用 9 公共字段（eventId/type/timestamp/source/operationId?/sessionId?/deviceId?/generation?/payload） |
| 运行时实体 | **26**：环境能力 2（BluetoothEnvironment/CapabilitySnapshot）+ 扫描 4（ScanSession/ScannedDevice/Advertisement/AdvertisementField）+ 连接 GATT 7（ConnectionSession/SessionOwnership/GattService/GattCharacteristic/CharacteristicProperties/NotifySubscription/WriteQueueItem）+ 配网诊断 7（ProfileMatch/ProvisioningSession/ProvisioningForm/PairingToken/ProvisioningProgress/DiagnosticSession/DiagnosticRow）+ 广播 3（BroadcastConfig/BroadcastBudget/BroadcastSession）+ OTA/日志/版本 3（OtaSession/RuntimeLogEntry/ReleaseMetadata） |
| 字段规则 | 每实体给齐字段名/类型/必填/缺省语义/敏感级别/生命周期/来源（DATA_MODEL §3 各表） |
| 技术字段标记 | technical-only / runtime-only / never-persisted / not-user-facing 四标记落表（§6） |
| 负面清单 | 未新增 BLE-009 我的设备/收藏/别名/历史设备等实体（STORAGE_POLICY §7 重申） |

## 6. 错误码分层统计

| 层 | 数量 | 明细 |
|---|---|---|
| platform-native | 3 项已登记 + 逐码待固化 | 微信 10001（蓝牙未开）/ 10000–10013（归一化，逐码【待真机证据】）/ Android bluetooth_permission_denied / 系统配对取消 / Web insecure_context；platformCode=not-user-facing |
| sdk-transport | **8** | BLE_001～BLE_008（API_UNIFIED_SPEC §14 逐字） |
| product-domain | **15** | 配网设备侧 8（invalid_payload/wifi_failed/controlhub_unreachable/pairing_invalid/pairing_expired/pairing_used/mqtt_invalid/storage_failed）+ 通用 5（timeout/scan_failed/identity_failed/connection_lost/diagnostic_connect_failed）+ OTA 2（OTA_HASH_MISMATCH/OTA_VERSION_MISMATCH）；OTA 六包/五运行逐码名称未入正典——登记待 legacy 实证固化，不臆造 |
| validation-capability | **2** | PAYLOAD_TOO_LARGE / OWNER_BUSY |
| 恢复动作 | 4+5 | 四分流 form/pairing/diagnostics/retry + 通用 open_settings/rescan/reconnect/dismiss/none |
| 取消语义 | 5 类 | 取消扫码/停止扫描/主动断开/取消 OTA/离开配网——一律 cancelled outcome/状态转移，不包装成系统错误 |

## 7. 权限矩阵统计

| 维度 | 统计 |
|---|---|
| 概念区分 | 4 类（capability / bluetooth state / permission / host limitation），判定次序：能力→状态→权限，宿主限制单独归因 |
| PermissionState | 7 值（unknown/checking/granted/denied/permanentlyDenied/notRequired/unsupported）——工程状态，不增加产品业务状态 |
| 矩阵规模 | 9 组动作（F001/F002 扫描、F006 连接、F010 Notify、F014 微信外围、F015 Android 外围、F020 扫码、F025 选包、F029 分享、外链/设置跳转）× 4 环境（微信 Android 真机/微信 iOS 真机/微信开发者工具/App·Android） |
| 【待真机证据】 | 7 处（微信宿主系统弹窗形态、devtools 授权等价性、App 连接链 SDK≥31、App 扫码权限链、devtools 扫码/选包等）——无一处猜测补写 |
| 请求原则 | 7 条（Just-in-time / 探测次序 / 拒绝下一步 / 永久拒绝去设置 / onShow 复查 / 仅内存 / 不持久化拒绝史） |
| 对接 | PermissionState → AppError/BLE_00x → 文案 → recoveryAction 四级映射（denied→BLE_002→open_settings；unsupported 不占 BLE_002） |

## 8. 交叉引用核验（静态核验 13 项结果）

| # | 核验项 | 结果 |
|---|---|---|
| 1 | git diff 只出现 docs/specs/** | PASS（§11 git 状态；HEAD=2b25725 不变，本轮新增 5 + 修改 7 全在 docs/specs；任务前既有脏区 56 条为此前会话产物，见 §11） |
| 2 | apps/**、core/**、tests/**、prototype/** 零本轮变更 | PASS（git status 上述目录零条目） |
| 3 | 四件套实际存在 | PASS（08_development/ API_SPEC.md · DATA_MODEL.md · ERROR_CODE.md · PERMISSION.md 四文件在册） |
| 4 | 所有 Markdown 相对链接有效 | PASS（86 文件 481 条相对链接，断链 1 = 既有冻结例外——prototype/platform/README.md 的 ../../../10_platform 链接，原型冻结不修；例外外断链 0） |
| 5 | API_SPEC 每个公共方法可追溯 F/ACT 或 technical-only 理由 | PASS（37 方法全溯源；technical-only 仅 dispose 且已登记理由，API_SPEC §17） |
| 6 | 所有 API 输入/输出类型均能在 DATA_MODEL 找到 | PASS（方法表引用实体/值对象逐一对照 DATA_MODEL §1/§3；CommandResult §4 自定义于 API_SPEC 并链 DATA_MODEL §0 表达规则） |
| 7 | 所有错误均能在 ERROR_CODE 找到 | PASS（方法表「可能错误」= BLE_00x/业务码/校验码，全在 ERROR_CODE §2/§3.2 表内；待固化项均标【待真机证据】/【待 legacy 实证固化】未臆造） |
| 8 | 所有权限/能力判断均能在 PERMISSION 或 PLATFORM_CAPABILITY_DECISION 找到 | PASS（矩阵/请求原则/C1C3 关系均落 PERMISSION；capability 定档引 PLATFORM_CAPABILITY_DECISION） |
| 9 | 不存在违禁表述 | PASS——无「以 API_ACTION_MATRIX 顶替 API_SPEC」的主张（四处均为反向声明「不得互相替代」）；无「事件仅源自平台回调」的单源口径（RUNTIME/API_SPEC 均为二分：平台回调 + 领域产出）；无「扫码/分享划入 BlePlatformPort」的归类（均为「不得混入」反向声明）；无 Service↔Store 互相 import 的架构主张（全部出现处均为禁令语境——禁令表为任务 §3.4 要求的正面列举，非违规） |
| 10 | 不新增产品状态、页面、功能或验收编号 | PASS（grep 编号集合不变：F001–F030/P001–P010/R01–R30/S1–S6；事件名为通知通道非状态，多处显式声明） |
| 11 | 不出现本地存储键、HTTP、登录、会员、云同步 | PASS（新四件套正文零出现；提及均为禁止语境） |
| 12 | C1/C3 保持已裁决，不回退为待裁决 | PASS（PERMISSION/API_SPEC/RUNTIME 均引 PLATFORM_CAPABILITY_DECISION 已裁决口径） |
| 13 | OTA 保持 BLOCKED | PASS（API_SPEC §11/§16、README、readiness 均保留 P-03 BLOCKED，未写成已验证可发布） |

## 9. 准入状态变化

| 轨道 | 08-G0 | 08-G1 | 依据 |
|---|---|---|---|
| Product & Prototype Readiness | PASS | **PASS（维持）** | DEVELOPMENT_READINESS_FINAL §1–§4 |
| Engineering Contract Readiness | CONDITIONAL PASS（四件套未生成） | **PASS**（四件套已生成 + Runtime v1.2 + 端口拆分；CONDITIONAL 主因消除） | DEVELOPMENT_READINESS_FINAL §0/§9 条件 6b |
| Feature Implementation Execution Gate | （并入两轨表述） | **WAITING——唯一等待项 = 09_test 真实点击基线固化**（须 09_test 修改授权） | DEVELOPMENT_READINESS_FINAL §0/§9 条件 7 |

## 10. 下一门禁：09_test 真实点击基线固化

- **内容**：真实点击断言组固化（F020 四结果 / P005 两路径+错误回路 / P006 三路径会话 / 空态组——三份修复报告遗留建议）；断言必须经真实用户动作触发，不得以场景库直接置态（§3 警示：P0-1 穿越多轮测试的存活根因）。
- **前置**：需用户放行 09_test 修改授权（本轮任务范围仅 docs/specs，09_test 未动）。
- **放行后**：可开始功能实现（F001–F030 编码迁移至 TARGET_APP_ROOT = `apps/uniapp-next`）；空工程脚手架设计现在即可进行。**（⚠ 08-G0.1 废止注：本条执行建议已被方向纠偏取代——现行 TARGET_APP_ROOT = `apps/uniapp` 原路径重构，不创建平行工程；「空工程脚手架」阶段已取消。现行前置 = LEGACY_REUSE_MATRIX 逐项裁定 + 四件套按 in-place 口径完善 + 09_test 真实点击基线，齐备后在专用 Git 开发分支于 `apps/uniapp` 原路径开始改版。见头注与 [IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT](IN_PLACE_REFACTOR_DIRECTION_CORRECTION_REPORT.md)。）**
- 其他待办（不阻塞、待放行）：原型 P2 ×13；git 提交/推送（基线 2b25725）；真机验证矩阵（C1/C3 证据补齐）；OTA 六包/五运行逐码 legacy 实证固化（回写 ERROR_CODE §3.2）。

## 11. git 状态与未提交说明

- **未提交、未推送**（用户既定约定；DEVELOPMENT_READINESS_FINAL §9 条件 11）。HEAD 维持 `2b25725`。
- 本轮变更（docs/specs 内）：新增 5（四件套 ×4 + 本报告）+ 修改 7（RUNTIME_ARCHITECTURE / PLATFORM_ADAPTER_SPEC / IMPLEMENTATION_TARGET / API_ACTION_MATRIX / FEATURE_IMPLEMENTATION_MATRIX / specs README / DEVELOPMENT_READINESS_FINAL）。
- 既有脏区说明：任务开始前工作区已有 56 条 dirty（prototype 44 M + 06_review/08_development 未跟踪等，为此前会话产物，08-G0 报告 §8.1 已登记）——本轮未触碰其中 prototype 部分（冻结），06_review/08_development 的未跟踪文件含 08-G0 产物，属历轮未提交状态延续。

---

—— 08-G1 任务完成。评审人：ZCode（工程契约四件套生成与事件模型收口）。本报告为 06_review 第 17 份评审文件；工程契约侧自本文起无已知缺口，功能实现执行门等待 09_test 真实点击基线固化（待用户放行）。
