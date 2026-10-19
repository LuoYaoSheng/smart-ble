# ERROR_CODE —— 统一错误对象、错误分层与三级映射（工程契约四件套之三）

> 版本：1.0 · 生成日期：2026-09-03（08-G1 工程契约四件套生成与事件模型收口，用户任务书）
> 性质：**不新增产品功能、不改状态集合与恢复流程、不凭空发明业务错误**——本文只把既有正典中的错误码（PRD §7 / STATE_MODEL §2 / BUSINESS_FLOW §4/§5/§6 / API_ACTION_MATRIX §5 / API_UNIFIED_SPEC §14）收口为统一错误对象、四层分层与「平台原生 → BLE_00x → 产品业务错误」三级映射。冲突时以被引文档为准。
> 输入：[02_product](../02_product/)（PRD / STATE_MODEL / BUSINESS_RULE）· [03_flow](../03_flow/)（PAGE_SPEC / BUSINESS_FLOW）· [04_architecture](../04_architecture/)（STATE_MACHINE / DATA_FLOW）· [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) · [11_ecosystem](../11_ecosystem/)（API_UNIFIED_SPEC §14 / ALIGNMENT_NOTES §5）· 08_development 既有件（API_ACTION_MATRIX §5 / PLATFORM_ADAPTER_SPEC / PLATFORM_CAPABILITY_DECISION / DEVELOPMENT_SCOPE）
> 上位规则：**异常三要素**——每个错误态呈现「提示 + 下一步 + 恢复动作」，禁止静默降级（BR-07）；错误码即契约（STATE_MODEL §2 第 3 条）。

## 1. 统一错误对象 AppError

全部运行时错误以统一对象表达（字段类型契约见 [DATA_MODEL](DATA_MODEL.md) §0）：

| 字段 | 类型 | 必填 | 语义 | 处理规则 |
|---|---|---|---|---|
| code | `string` | ✔ | 错误码（分层命名空间内唯一，见 §2/§3/§4） | 用户可见时经 userMessage 呈现，code 本身可展示于横幅标题（mono，PAGE_SPEC §1） |
| layer | `'platform-native' \| 'sdk-transport' \| 'product-domain' \| 'validation-capability'` | ✔ | 错误所在层（§2 四层之一） | 决定映射路径与呈现策略 |
| operation | `string` | ✔ | 发生错误的操作名（scan/connect/write/provision/ota/…） | 排障定位用，technical 语境 |
| recoverable | `boolean` | ✔ | 是否可恢复 | false=终止性（如身份验证失败） |
| recoveryAction | `RecoveryAction`（§5 枚举） | ✔ | 恢复动作（四分流 + 通用动作） | 驱动 P002 恢复按钮等 UI 路由 |
| userMessage | `string` | ✔ | 用户文案（中文，含下一步指引） | **可展示**；须满足异常三要素 |
| technicalMessage? | `string` | 可空 | 技术信息（脱敏后的 errMsg 摘要） | **必须脱敏**（§6）；仅日志/排障 |
| platformCode? | `string` | 可空 | 平台原生错误码（如微信 `10001`） | **not-user-facing**——不得直接显示给用户（§2 第 1 层规则） |
| deviceId? / sessionId? / operationId? | 见 [DATA_MODEL](DATA_MODEL.md) §1 | 可空 | 归属定位 | operationId 为 technical-only |
| cause? | `unknown` | 可空 | 原始原因对象（平台原生 error / 异常实例） | **runtime-only**：不持久化、**禁止日志原样输出**（仅调试期断点/内存检查，§6） |

## 2. 错误分层（四层）

| # | 层 | 内容 | 规则 |
|---|---|---|---|
| 1 | **platform-native** | 平台原生错误（微信 errCode 10000–10013、Android 插件/权限错误码等） | 只在 Adapter 内出现并经 §3 映射上行；**不得把平台原生码直接显示给用户**（platformCode=not-user-facing）；未映射的平台错误保留安全技术标识（technicalMessage 脱敏摘要 + platformCode），**不得猜测业务错误**（§6 末条） |
| 2 | **sdk-transport** | BLE_001～BLE_008（生态 SDK 层码，API_UNIFIED_SPEC §14） | 两层并行的桥梁层：承接第 1 层、向第 3/4 层供给恢复动作 |
| 3 | **product-domain** | 产品业务错误码（§3.1/§3.2 全集——语义与恢复动作以 PRD §7 / STATE_MODEL §2 / BUSINESS_FLOW §4 为准） | 错误码即契约；恢复动作四分流为产品资产（PZ-2，Adapter 不得改） |
| 4 | **validation-capability** | 本地校验与能力拒绝（非法 HEX、空 payload、超 31B、UUID 非法、能力不支持/宿主不支持） | 多数为可恢复（改输入/改环境）；**取消类不算错误**（§5 取消语义） |

**SDK 传输层码表（BLE_001～008，逐字引自 API_UNIFIED_SPEC §14）**：

| 码 | 说明 | 典型来源 | 常见恢复动作 |
|---|---|---|---|
| BLE_001 | 蓝牙未开启 | 微信 10001 / Android 系统蓝牙关闭 | open_settings（引导开蓝牙） |
| BLE_002 | 权限不足 | 授权拒绝（bluetooth_permission_denied 等） | open_settings（去设置） |
| BLE_003 | 扫描失败 | 扫描启动失败 | retry / rescan |
| BLE_004 | 连接失败 | 建链超时（10s）/失败 | retry / reconnect |
| BLE_005 | 服务不存在 | 服务发现失败/空 | retry |
| BLE_006 | 写入失败 | 写超时（5s）/失败 | retry |
| BLE_007 | Notify 失败 | 订阅失败 | retry |
| BLE_008 | OTA 失败 | OTA 事务失败（F025 BLOCKED 语境） | retry（受 §3.3 OTA 码约束） |

## 3. 三级映射与业务错误码全集

### 3.1 三级映射（既定处置，ALIGNMENT_NOTES §5）

```text
平台原生错误（第 1 层，仅 Adapter 内）
  → BLE_00x SDK 错误（第 2 层）
    → 产品业务错误 / 用户文案 / 恢复动作（第 3/4 层）
```

映射示例（包内已有证据）：

| 平台原生 | SDK 层 | 产品呈现 | 恢复动作 | 来源 |
|---|---|---|---|---|
| 微信 errCode 10001 | BLE_001 | 「请先打开系统蓝牙」弹窗/横幅 | open_settings | PAGE_SPEC §1/§8 · BUSINESS_FLOW §1/§5 |
| 授权拒绝（reason=`bluetooth_permission_denied` 等） | BLE_002 | 横幅 reason 分类 + 去设置 | open_settings | PAGE_SPEC §1 · PLATFORM_ADAPTER_SPEC §3.2 |
| 微信 errCode 10000–10013（读写监听失败） | BLE_005/006/007（按操作归类） | 日志「错误」行（errMsg 中文归一化） | retry | PAGE_SPEC §6 异常处理 |
| 旧加密固件拒绝 INPUT 写入 | BLE_006 | 单次写入后立即失败，提示重烧 V1 简化固件；不发起系统配对 | retry | PLATFORM_ADAPTER_SPEC §4.1 · DEVELOPMENT_SCOPE §6 |
| Android 插件/权限逐项缺失（SDK≥31 ADVERTISE/CONNECT） | BLE_002 | 缺失汇总 modal + 去设置 | open_settings | PLATFORM_ADAPTER_SPEC §4.1 |
| 微信外围活动连接冲突 | BLE_008 前置拦截（validation 层） | 报错提示先断开活动连接 | reconnect 前置（先断开） | BUSINESS_FLOW §5 · PAGE_SPEC §8 |

> 逐码映射表（微信 10000–10013 每码、Android 插件每码 → BLE_00x）以开发期真机/legacy 实证固化为准；**无证据处标【待真机证据】，不得自行补写 Android/iOS/微信错误码语义**（§5 平台映射边界）。

### 3.2 产品业务错误码全集（product-domain 层）

**配网设备侧 8 码（STATUS error 上行，语义与恢复动作 = BUSINESS_FLOW §4 异常表逐字）**：

| 码 | 中文提示要点 | 恢复动作（四分流） | 来源 |
|---|---|---|---|
| invalid_payload | 下发数据无效 | form（回表单） | BUSINESS_FLOW §4 |
| wifi_failed | 设备侧 Wi-Fi 连接失败 | form（SSID/密码保留） | 同上 · R18 |
| controlhub_unreachable | 设备连不上 ControlHub | diagnostics / retry | 同上 |
| pairing_invalid | 配对码无效 | pairing（重扫码） | 同上 |
| pairing_expired | 配对码过期 | pairing | 同上 · token TTL 5 分钟 |
| pairing_used | 配对码已被使用 | pairing | 同上 |
| mqtt_invalid | MQTT 配置无效 | form / diagnostics | 同上 |
| storage_failed | 设备侧存储失败 | retry | 同上 |

**通用业务码（现行契约，STATE_MODEL §2 / PRD §7）**：

| 码 | 语义 | 恢复动作 | 来源 |
|---|---|---|---|
| timeout | 配网 60s 轮询超时（ProvisioningTimedOut） | retry（重下发）/ 取消等待（cancelled，非错误） | BUSINESS_FLOW §4 · SEQ §5 |
| scan_failed | 扫描失败（横幅+重试） | retry / rescan | STATE_MODEL §2 · PAGE_SPEC §1 |
| identity_failed | Smart HID 身份验证失败（product/协议版本/deviceId 正则不过 → 断开报错） | reconnect（重新连接）/ 返回 | PAGE_SPEC §2 · SEQ §5 |
| connection_lost | 连接丢失（被动断线，重连耗尽后呈现） | reconnect / retry | STATE_MODEL §2 · SM §1/§2 |
| diagnostic_connect_failed | 诊断连接失败（modal「请让设备进入配网/恢复模式后重试」） | retry（重检）/ 重新配网路由 | PAGE_SPEC §5 · STATE_MODEL §2 |

**广播域校验/占用码（validation-capability 层，正典在册）**：

| 码 | 语义 | 恢复动作 | 来源 |
|---|---|---|---|
| PAYLOAD_TOO_LARGE | 超 31 字节预算——红字阻止启动，**不静默截断**（BR-05） | 改输入（form 语义，页面内改） | BUSINESS_FLOW §5 · R21 |
| OWNER_BUSY | 广播中禁改 payload（单 owner 状态机） | 等待/先停止广播 | BUSINESS_FLOW §5 边界 · SM §5 |

**OTA 码（product-domain，端到端 BLOCKED 语境）**：

| 码 | 语义 | 恢复动作 | 来源 |
|---|---|---|---|
| OTA_HASH_MISMATCH | 包 sha256 实测不符——校验终止，不发起传输 | retry（重选包） | STATE_MODEL §2 · R25 |
| OTA_VERSION_MISMATCH | VERIFYING 版本回读不一致 | retry | PRD §7.5 · SM §6 · SEQ §7 |
| OTA 包错误 ×6 / 运行错误 ×5 | 六重包校验错误与五种运行错误——**逐码名称未入正典**（旧代码 ota-manager 枚举未逐行核对，STATE_MACHINE §6 注同口径） | 按正典流程（校验终止/失败态） | PRD §6 PAGE006-OTA · BUSINESS_FLOW §6；逐码【待 legacy 实证固化——固化须回写本表，不得提前臆造】 |

**平台补充态（L3 圈内登记，不改产品状态集合）**：`bluetooth_permission_denied`（Android，STATE_MODEL §2 示例）、`insecure_context`（Web，STATE_MODEL §2 示例）——按平台 PAGE_SPEC 标注 + 引 10_platform 条目登记后方可加入实现。

## 4. 错误码命名空间规则

| 前缀/形态 | 层 | 示例 |
|---|---|---|
| `BLE_0xx` | sdk-transport | BLE_001～008（闭合，扩充须回写 §2 表） |
| 小写蛇形（设备上行/通用业务） | product-domain | wifi_failed、scan_failed、OTA_HASH_MISMATCH（历史大写形态保留原样） |
| 大写蛇形（广播/OTA 校验） | validation-capability / product-domain | PAYLOAD_TOO_LARGE、OWNER_BUSY |
| 平台原生 | platform-native | 保留 platformCode 原样（不进用户文案） |

## 5. 恢复动作枚举

**产品四分流（P002 恢复按钮路由，产品资产，任何层不得改）**：`form`（回表单）/ `pairing`（重新扫码）/ `diagnostics`（跳诊断）/ `retry`（重下发）——BUSINESS_FLOW §4 · PAGE_SPEC §2。

**通用动作（正典在册）**：

| 动作 | 语义 | 来源 |
|---|---|---|
| open_settings | 去系统设置（权限/蓝牙） | PAGE_SPEC §1/§8 · [PERMISSION](PERMISSION.md) §3 |
| rescan | 重新扫描 | PAGE_SPEC §1 重试 |
| reconnect | 重新连接 | PAGE_SPEC §2/§6 |
| dismiss | 关闭提示（无需动作） | 反馈约定 |
| none | 无恢复动作（信息性） | 兜底 |

**技术层新增枚举规则**：若实现期需要新增恢复动作枚举（仅技术内部使用），**必须标 technical-only，不得改变页面流程**（页面可见路由仍只认上列四分流 + 通用动作；新增须经评审回写本表）。

**取消语义（cancelled 不是错误）**：

| 取消场景 | 建模 | 依据 |
|---|---|---|
| 用户取消扫码（F020） | cancelled outcome + 分类提示（不算错误） | PAGE_SPEC §2 · QR_ERROR_STATE_FIX_REPORT |
| 停止扫描（reason=user） | 状态转移（scanning→stopping→idle） | SM §7 · PAGE_SPEC §0.4 |
| 主动断开（USER_REQUEST） | 状态转移（永不重连） | SM §1/§2 · BR-08 |
| 取消 OTA（abort） | 状态转移（→CANCELLED） | SM §6 · SEQ §7 |
| 离开配网（确认后） | 工作流 CANCELLED 态 | SM §3 · BR-10 |

统一规则：**优先建模为 cancelled outcome / 状态转移（CommandResult=`cancelled` → OperationCancelled 事件，[RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.2 §2.1），不得统一包装成「系统错误」**——取消类不得占用 AppError 错误码、不得触发错误横幅/重试 UI。

## 6. 日志与脱敏

| 规则 | 内容 | 来源 |
|---|---|---|
| userMessage 可展示 | 错误呈现以 userMessage 为准（含下一步），满足异常三要素 | BR-07 |
| technicalMessage 必须脱敏 | 敏感键（token/password/secret…）→ `***` 后方可入日志 | BR-04 · F026 · S-3 |
| cause 不持久化 | runtime-only；禁止日志原样输出（§1 cause 行） | DATA_MODEL §6 |
| token/password/ssid 密码禁止进入日志 | SENSITIVE_PROFILE_KEYS 黑名单 + 保护键白名单不脱敏 | BUSINESS_FLOW §7 · S-3 |
| 未映射平台错误 | 保留安全的技术标识（platformCode + 脱敏 technicalMessage），**不得猜测业务错误**（不脑补映射） | 10_platform §7 三查② · DATA_MODEL §2 缺失即显式同源 |

## 7. 平台映射边界（只记录包内已有证据）

- **微信**：errCode 10001（蓝牙未开→引导）；errCode 10000–10013（读写监听失败 errMsg 中文归一化，PAGE_SPEC §6）——逐码语义【待真机证据/待 legacy 实证固化】。
- **App·Android**：权限拒绝 reason（bluetooth_permission_denied 等，PLATFORM_ADAPTER_SPEC §4.1）；V1 简化不发起系统配对；插件错误逐码【待真机证据】。
- **微信开发者工具**：外围广播 unsupported = **host limitation，不是 permission denied**（[PERMISSION](PERMISSION.md) §1 例）。
- **iOS 微信宿主 / iOS App / Desktop / Web**：无包内错误码证据——【待真机证据】，不得自行补写。

## 8. 冻结校验

- ☑ AppError 统一对象字段全集（code/layer/operation/recoverable/recoveryAction/userMessage/technicalMessage?/platformCode?/deviceId?/sessionId?/operationId?/cause?）落表，cause 标 runtime-only 且禁止日志原样输出（§1/§6）
- ☑ 四层分层（platform-native / sdk-transport / product-domain / validation-capability）+ 「平台原生码不得直接显示给用户」（§2）
- ☑ 三级映射（平台原生 → BLE_00x → 产品业务/文案/恢复动作）与映射示例全部为包内已有证据；无证据处标【待真机证据】（§3.1/§7）
- ☑ 业务错误码全集 = 正典抽取：8 配网设备侧码 + 通用 5 码 + 广播 2 码 + OTA 2 码；OTA 六包/五运行错误逐码名称如实登记「未入正典，待固化」；无凭空发明（§3.2）
- ☑ 恢复动作 = 四分流（form/pairing/diagnostics/retry）+ 通用五动作（open_settings/rescan/reconnect/dismiss/none）；技术层新增须标 technical-only 且不改页面流程（§5）
- ☑ 取消语义成典：五类取消场景建模为 cancelled outcome/状态转移，不包装成系统错误（§5 末表）
- ☑ 日志与脱敏五规则（§6）；与 STORAGE_POLICY S-1～S-6 / BR-03/04/07 / F026 全链一致
- ☑ 不新增产品功能、不改状态集合与恢复流程（PZ-2）；错误码即契约口径与 STATE_MODEL §2 一致
