# DATA_MODEL —— 运行时类型与字段契约（工程契约四件套之二）

> 版本：1.1（08-G0.1 原工程内重构口径同步：TARGET_APP_ROOT 改为 `apps/uniapp`，标题「新工程」改「运行时」；类型契约本体零改动）· 生成日期：2026-09-03（v1.0，08-G1）；修订 2026-09-03（v1.1，08-G0.1）
> **定位（两层 DATA_MODEL，不得互相替代）**：[02_product/DATA_MODEL.md](../02_product/DATA_MODEL.md) = **产品语义模型**（9 类实体清单与不变量，平台无关口径）；本文 = **改版目标工程运行时类型与字段契约**（TARGET_APP_ROOT = `apps/uniapp` 原工程内重构后的实现级类型，含事件信封与技术字段）。产品语义以 02_product 为准，本文实体均溯源到产品语义模型或既有正典章节；本文不新增产品概念。
> 性质：**不新增产品功能、不改变 29 功能/9 页面/S1–S6、不改变状态集合与恢复流程、零后端、零登录、零本地持久化**（Z-1/Z-2/Z-3）；**不得新增 BLE-009 我的设备、收藏、别名、历史设备等实体**（STORAGE_POLICY §7 负面清单）。
> 输入：[02_product](../02_product/)（PRD / DATA_MODEL / STATE_MODEL / BUSINESS_RULE / FEATURE_MAP）· [03_flow](../03_flow/)（PAGE_SPEC / BUSINESS_FLOW）· [04_architecture](../04_architecture/)（STATE_MACHINE / DATA_FLOW）· [RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.2（事件模型/运行隔离）· [API_ACTION_MATRIX](API_ACTION_MATRIX.md) · [DEVICE_PROFILE_SPEC](DEVICE_PROFILE_SPEC.md) · [STORAGE_POLICY](STORAGE_POLICY.md) · [PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md) · [11_ecosystem/API_UNIFIED_SPEC_v1.0.md](../11_ecosystem/API_UNIFIED_SPEC_v1.0.md)

## 0. 类型表达规则

- 本文使用**语言无关类型表 + TypeScript-like 伪类型**，仅用于契约表达（字段名 / 类型形状 / 可空性）。
- **本文不构成改版工程采用 TypeScript 的技术选型决策。**实现语言与运行时（uni-app + Vue3 + Pinia 等）的最终类型化方式（TS / JSDoc / 其他）属 D1 工程脚手架设计范围，不在本文裁决。
- 约定：`?` 表示可空；`|` 表示联合；`readonly` 表示语义上实现不得回写（非语言强制）；枚举值集合为**闭合集**，扩充须回写本文并过评审（不得借字段新增产品状态）。

## 1. 基础值对象

| 值对象 | 伪类型 | 语义与约束 | 来源 |
|---|---|---|---|
| DeviceId | `string` | 平台侧设备唯一标识（微信 deviceId / Android MAC 形态由 Adapter 归一，Base Core 不感知平台形态） | REVERSE §2.4 · API_UNIFIED_SPEC §6 |
| SessionId | `string` | 会话唯一标识（扫描/连接/配网/广播/OTA 事务各自命名空间） | STATE_MACHINE §1/§3/§5/§6 |
| OperationId | `string` | 单次命令运行的唯一标识（technical-only，§6） | RUNTIME_ARCHITECTURE v1.2 §0.6 |
| ProfileId | `string` | Profile 唯一标识（当前唯一内置：`smart-hid`） | DEVICE_PROFILE_SPEC §2/§3 |
| ServiceUuid | `string` | BLE 服务 UUID（16/32/128 位形态归一；显示时大小写规范由展示层决定） | PAGE_SPEC §6 · API_UNIFIED_SPEC §8 |
| CharacteristicUuid | `string` | BLE 特征 UUID | API_UNIFIED_SPEC §8 |
| Timestamp | `number` | 毫秒级 Unix 时间戳（日志/事件/会话时间） | DATA_MODEL(02) §1 通信日志条目 |
| HexString | `string` | 大写十六进制、字节间空格分隔（如 `"AA BB 07"`；展示契约 HEX: 大写空格分隔） | PAGE_SPEC §6 数据展示规则 |
| ByteArray | `number[]` | 0–255 整数字节数组（传输/分帧层；与 HexString 互转规则属 Shared Core framing 职责） | DATA_FLOW §4 · core/ble-core |

**跨契约类型（在本文登记名称与归属，正文契约见被引文件）**：

| 类型 | 归属契约 | 说明 |
|---|---|---|
| CommandResult\<T\> | [API_SPEC](API_SPEC.md) §4 | 命令结果模型（accepted/completed/rejected/cancelled 四值 + value/error/operationId） |
| AppError | [ERROR_CODE](ERROR_CODE.md) §1 | 统一错误对象（12 字段；cause 标 runtime-only） |
| RecoveryAction | [ERROR_CODE](ERROR_CODE.md) §5 | 恢复动作枚举（四分流 + 通用五动作） |
| PermissionState | [PERMISSION](PERMISSION.md) §2 | 工程权限状态 ×7（非产品业务状态） |

## 2. 事件信封（AppEvent / PlatformEvent / DomainEvent）

事件来源二分与统一关系（[RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.2 §0.5）：`PlatformEvent ─┐ ├→ AppEvent → Handler/Reducer → Store` `DomainEvent ──┘`。

**AppEvent 公共信封**（两类事件共用的外层包装）：

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 | 生命周期 | 来源 |
|---|---|---|---|---|---|---|
| eventId | `string` | ✔ | 无缺省（必生成） | 内部 | 派发后由 Handler 持有至处理完成 | RUNTIME v1.2 §0.5 |
| type | `string`（事件名，闭合集见下） | ✔ | 无缺省 | 内部 | 同上 | RUNTIME v1.2 §0.5 |
| timestamp | `Timestamp` | ✔ | 无缺省 | 内部 | 同上 | RUNTIME v1.2 §0.6 |
| source | `'page' \| 'workflow' \| 'system' \| 'platform' \| 'timer'` | ✔ | 无缺省 | 内部 | 同上 | RUNTIME v1.2 §0.6 |
| operationId? | `OperationId` | 可空 | 无进行中操作时缺省 | **technical-only**（§6） | 同上 | RUNTIME v1.2 §0.6 |
| sessionId? | `SessionId` | 可空 | 非会话内事件缺省 | 内部 | 同上 | RUNTIME v1.2 §0.6 |
| deviceId? | `DeviceId` | 可空 | 非设备级事件缺省 | 内部 | 同上 | RUNTIME v1.2 §0.5 |
| generation? | `number`（run token） | 可空 | 无代次语义时缺省 | **technical-only** | 同上 | RUNTIME v1.2 §0.6 |
| payload | `Record<string, unknown>`（各事件专属载荷，见 [API_SPEC](API_SPEC.md) §3） | ✔ | 空对象=无附加载荷 | 载荷内敏感字段按其本体实体敏感级别 | 同上 | API_SPEC §3 |

**PlatformEvent 闭合集（×7）**：`BluetoothStateChanged` / `DeviceFound` / `ConnectionStateChanged` / `CharacteristicValueChanged` / `PeripheralStateChanged` / `PermissionStateChanged` / `LifecycleChanged`——来源于平台或系统回调，只被 Adapter 订阅与归一化（载荷不含 wx.\*/plus.\* 类型）。

**DomainEvent 闭合集（×13）**：`ScanRequested` / `ScanStarted` / `ScanStopRequested` / `ScanTimedOut` / `ScanFailed` / `ConnectRequested` / `RetryScheduled` / `WriteQueued` / `ValidationRejected` / `ProvisioningTimedOut` / `DiagnosticStepChanged` / `OtaValidationFailed` / `OperationCancelled`（含任务书示例中的取消族，取消语义见 [ERROR_CODE](ERROR_CODE.md) §5）——来源于应用命令、领域状态机、校验、定时器和超时。

> 事件名是通知通道不是状态集合——**不得借事件名增加产品状态**（状态正典 = STATE_MACHINE §1–§9，PZ-2）；扩充事件名须评审回写本表与 API_SPEC §3。

## 3. 运行时实体（基于现有规范整理）

> 每实体先给「生命周期 · 来源」，再给字段表（字段/类型/必填/缺省语义/敏感级别）。全部实体为**内存态、无任何存储键**（02_product/DATA_MODEL 前提；Z-2）。

### 3.1 环境与能力

**BluetoothEnvironment** · 生命周期：应用会话（冷启动即空） · 来源：PAGE_SPEC §1 三态 · API_UNIFIED_SPEC §4

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| state | `'on' \| 'off' \| 'unsupported' \| 'unknown'`（基线口径；生态枚举映射未定稿不切换，API_ACTION_MATRIX §6） | ✔ | `unknown`（未探测） | 公开 |
| hostPlatform | `string`（宿主/平台标识，经 DeviceInfoPort） | ✔ | — | 公开 |
| checkedAt | `Timestamp` | ✔ | — | 内部 |

**CapabilitySnapshot** · 生命周期：应用会话，进入 P008/onShow 重探测 · 来源：API_UNIFIED_SPEC §3 · PLATFORM_CAPABILITY_DECISION §1/§2

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| scan / connect / notify / ota | `'supported' \| 'unsupported' \| 'supported_limited' \| 'supported_foreground' \| 'unknown'` | ✔ | `unknown` | 公开 |
| advertise | 同上（微信=C1 `supported_limited`；Android=`supported`；devtools 宿主=`unsupported`） | ✔ | `unknown` | 公开 |
| advertiseDetail | `{ runtimeProbeRequired: boolean; backgroundNotPromised: boolean; hostLimitation?: string }`（C1 裁决的机器可读投影） | 可空 | 缺省=无外围细节 | 公开 |
| checkedAt | `Timestamp` | ✔ | — | 内部 |

### 3.2 扫描域

**ScanSession** · 生命周期：单次扫描（5s） · 来源：STATE_MACHINE §7 · PAGE_SPEC §1

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| sessionId | `SessionId` | ✔ | — | 内部 |
| phase | `'starting' \| 'scanning' \| 'stopping' \| 'idle' \| 'failed'` | ✔ | `idle` | 公开 |
| durationMs | `number`（=5000，固定） | ✔ | — | 公开 |
| stopReason | `'user' \| 'page_hide' \| 'page_unload' \| 'timeout' \| 'error'` | 可空 | 运行中缺省 | 内部 |
| foundCount | `number` | ✔ | 0 | 公开 |
| operationId / generation | `OperationId` / `number` | ✔ | — | **technical-only** |

**ScannedDevice** · 生命周期：扫描会话内（节流合并更新） · 来源：02_product/DATA_MODEL §1 · REVERSE §2.4

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| deviceId | `DeviceId` | ✔ | — | 公开 |
| displayName | `string`（fallback 链末端「未命名 BLE · ID后四位」必非空） | ✔ | — | 公开 |
| name? / localName? | `string` | 可空 | 缺失走显示名 fallback（R05） | 公开 |
| rssi | `number`（dBm；平台缺失时显式缺省不猜值） | 可空 | `null`=平台未提供 | 公开 |
| advertisement | `Advertisement` | ✔ | — | 公开 |
| profileMatch? | `ProfileMatch` | 可空 | 无匹配=通用设备（DR-1） | 公开 |
| lastSeenAt | `Timestamp` | ✔ | — | 内部 |

**Advertisement** · 生命周期：随 ScannedDevice · 来源：02_product/DATA_MODEL §1（缺失即显式）· PAGE_SPEC §1

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| raw? | `HexString`（原始广播） | 可空 | 「本轮平台 API 未提供此字段」 | 公开 |
| byteLength | `number` | ✔ | 0 时标注「字段存在但长度为 0」 | 公开 |
| manufacturerId? | `string`（HEX） | 可空 | 同缺失显式规则 | 公开 |
| manufacturerData? | `HexString` | 可空 | 同上 | 公开 |
| serviceData? | `Record<ServiceUuid, HexString>` | 可空 | 同上 | 公开 |
| serviceUuids? | `ServiceUuid[]` | 可空 | 同上 | 公开 |
| fields | `AdvertisementField[]`（AD 结构逐段） | ✔ | 空数组=无解析段 | 公开 |

**AdvertisementField（AD Structure）** · 生命周期：随 Advertisement · 来源：DATA_FLOW §1（normalizeAdvertisement {state,present,byteLength,length,hex}）· PAGE_SPEC §1 弹窗

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| type | `number`（AD type，如 0x09/0x08） | ✔ | — | 公开 |
| length | `number` | ✔ | — | 公开 |
| hex? | `HexString` | 可空 | 平台缺失=显式缺失态 | 公开 |
| present | `'present' \| 'absent' \| 'zero-length'` | ✔ | — | 公开 |

### 3.3 连接与 GATT 域

**ConnectionSession** · 生命周期：连接生命周期 · 来源：STATE_MACHINE §1（8 态）

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| sessionId | `SessionId` | ✔ | — | 内部 |
| deviceId | `DeviceId` | ✔ | — | 公开 |
| state | `'CONNECTING' \| 'CONNECTED' \| 'DISCOVERING' \| 'READY' \| 'DISCONNECTING' \| 'DISCONNECTED' \| 'FAILED'`（8 态含 IDLE 起始口径以 STATE_MACHINE §1 为准） | ✔ | — | 公开 |
| ownership | `SessionOwnership` | ✔ | — | 内部 |
| provisioning | `boolean`（配网互斥标志） | ✔ | false | 内部 |
| reconnectState | `'NONE' \| 'SCHEDULED' \| 'RECONNECTING' \| 'SUCCESS' \| 'EXHAUSTED'` | ✔ | `NONE` | 公开 |
| notifySubscriptions | `NotifySubscription[]` | ✔ | 空数组 | 内部 |
| writeQueue | `WriteQueueItem[]`（深度 ≤16） | ✔ | 空数组 | 内部 |
| mtu | `number`（目标 247） | 可空 | 未协商缺省 | 内部 |
| connectedAt? | `Timestamp` | 可空 | — | 内部 |
| operationId / generation | `OperationId` / `number` | ✔ | — | **technical-only** |

**SessionOwnership** · 生命周期：随 ConnectionSession · 来源：STATE_MACHINE §1（owner/borrow）· BUSINESS_FLOW §3

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| ownerKind | `'PAGE' \| 'WORKFLOW' \| 'BACKGROUND' \| 'SYSTEM'` | ✔ | — | 内部 |
| ownerId | `string`（如 `WORKFLOW:'ota-manager'` / 页面名） | ✔ | — | 内部 |
| borrowedBy | `string[]`（borrow 引用只能 release） | ✔ | 空数组 | 内部 |
| userRequestedDisconnect | `boolean`（USER_REQUEST 永不重连判定） | ✔ | false | 内部 |

**GattService** · 生命周期：单连接会话 · 来源：02_product/DATA_MODEL §1 · PAGE_SPEC §6

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| uuid | `ServiceUuid` | ✔ | — | 公开 |
| standardName? | `string`（SIG 标准中文名；未知缺省走「服务 N」占位） | 可空 | 未知 UUID→占位名 | 公开 |
| characteristics | `GattCharacteristic[]` | ✔ | 空数组=empty 态显式 | 公开 |

**GattCharacteristic** · 生命周期：随 GattService · 来源：同上

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| uuid | `CharacteristicUuid` | ✔ | — | 公开 |
| properties | `CharacteristicProperties` | ✔ | — | 公开 |
| value? | `HexString`（最近一次读/通知值） | 可空 | 未读过缺省 | 公开 |
| notifying | `boolean` | ✔ | false | 内部 |

**CharacteristicProperties** · 生命周期：随 GattCharacteristic · 来源：PAGE_SPEC §6（按 properties 渲染按钮）

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| read / write / writeNoResponse / notify / indicate | `boolean` | ✔ | false | 公开 |

**NotifySubscription** · 生命周期：连接生命周期（断线自动清理） · 来源：DATA_FLOW §3 · PAGE_SPEC §6

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| serviceUuid / characteristicUuid | `ServiceUuid` / `CharacteristicUuid` | ✔ | — | 公开 |
| subscribedAt | `Timestamp` | ✔ | — | 内部 |
| debounced | `boolean`（防抖去重开关作用痕迹） | ✔ | false | **technical-only** |

**WriteQueueItem** · 生命周期：入队至完成/取消 · 来源：DATA_FLOW §2 · PRD §4.2 写队列

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| itemId | `string` | ✔ | — | 内部 |
| deviceId | `DeviceId` | ✔ | — | 公开 |
| serviceUuid / characteristicUuid | `ServiceUuid` / `CharacteristicUuid` | ✔ | — | 公开 |
| data | `HexString`（TEXT/HEX 编码后统一 HEX 承载） | ✔ | — | 按业务载荷（配网帧含敏感，见 §5 标注） |
| state | `'PENDING' \| 'SENDING' \| 'DONE' \| 'FAILED' \| 'CANCELLED'` | ✔ | `PENDING` | 内部 |
| timeoutMs | `number`（=5000，单写超时） | ✔ | — | 内部 |
| enqueuedAt | `Timestamp` | ✔ | — | 内部 |
| operationId | `OperationId` | ✔ | — | **technical-only** |

### 3.4 Profile / 配网 / 诊断域

**ProfileMatch** · 生命周期：随 ScannedDevice · 来源：DEVICE_PROFILE_SPEC §2（STRONG/WEAK）

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| profileId | `ProfileId` | ✔ | — | 公开 |
| strength | `'STRONG' \| 'WEAK'` | ✔ | — | 公开 |
| matchedBy | `'serviceUuid' \| 'namePrefix'` | ✔ | — | 公开 |

**ProvisioningSession** · 生命周期：配网向导会话 · 来源：STATE_MACHINE §3 · PAGE_SPEC §2

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| sessionId | `SessionId` | ✔ | — | 内部 |
| deviceId | `DeviceId` | ✔ | — | 公开 |
| phase | `'connect' \| 'configure' \| 'status'` | ✔ | `connect` | 公开 |
| workflowState | `'DISCOVERING' \| 'PAIRING' \| 'VERIFYING' \| 'PROVISIONED' \| 'CANCELLED'` | ✔ | `DISCOVERING` | 公开 |
| startedAt | `Timestamp` | ✔ | — | 内部 |
| operationId / generation | `OperationId` / `number` | ✔ | — | **technical-only** |

**ProvisioningForm** · 生命周期：配网向导会话（离开即清空，BR-03） · 来源：BUSINESS_FLOW §4 · PAGE_SPEC §2

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| ssid | `string`（≤32） | ✔ | 空串=未填 | 公开（不进日志明文） |
| wifiPassword? | `string`（≤64，可空=无密码） | 可空 | — | **敏感**（仅内存、不进日志/剪贴板/导出） |
| hubHost | `string` | ✔ | 空串=未填 | 公开 |
| hubPort | `number`（默认 17892；端口范围校验） | ✔ | 17892 | 公开 |
| token? | `PairingToken` | 可空 | badge「必需」 | **敏感**（仅内存 TTL 5 分钟） |

**PairingToken** · 生命周期：获取后 5 分钟（createMemoryTokenStore 语义） · 来源：BUSINESS_FLOW §4 · STORAGE_POLICY S-2

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| value | `string`（来自 `shid://pair` 扫码） | ✔ | — | **敏感**（runtime-only / never-persisted / 不进日志 S-3） |
| obtainedAt | `Timestamp` | ✔ | — | 内部 |
| expiresAt | `Timestamp`（=obtainedAt+5min；过期=pairing_expired 恢复 pairing） | ✔ | — | 内部 |

**ProvisioningProgress** · 生命周期：下发后 60s 窗口 · 来源：STATE_MACHINE §4 · PAGE_SPEC §2

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| rows | `{ wifi: RowState; hub: RowState; conn: RowState; usb: RowState }`，RowState=`'pending' \| 'active' \| 'done' \| 'fail' \| 'warn'` | ✔ | 全 `pending` | 公开 |
| deviceState | `'boot' \| 'load_config' \| 'unprovisioned' \| 'provisioning' \| 'connecting_wifi' \| 'pairing' \| 'mqtt_connecting' \| 'ready' \| 'recovery' \| 'error'` | 可空 | 未收到推送缺省 | 公开 |
| deviceStep | `'received' \| 'connecting_wifi' \| 'wifi_connected' \| 'pairing' \| 'pairing_success' \| 'mqtt_connecting' \| 'ready'` | 可空 | 同上 | 公开 |
| errorCode? | `string`（8 设备侧错误码之一，[ERROR_CODE](ERROR_CODE.md) §3.1） | 可空 | 无错误缺省 | 公开 |

**DiagnosticSession** · 生命周期：单次诊断会话（页面级） · 来源：STATE_MACHINE §8 · PAGE_SPEC §5

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| sessionId | `SessionId` | ✔ | — | 内部 |
| pageState | `'idle' \| 'connected' \| 'checking' \| 'live' \| 'offline' \| 'error'` | ✔ | `idle` | 公开 |
| rows | `DiagnosticRow[]`（×5） | ✔ | 全 pending | 公开 |
| lastError? | `{ code: string; message: string }` | 可空 | 无错误缺省 | 公开 |
| operationId / generation | `OperationId` / `number` | ✔ | — | **technical-only**（P005 教训，RUNTIME v1.2 §0.6） |

**DiagnosticRow** · 生命周期：随 DiagnosticSession · 来源：02_product/DATA_MODEL §1 · PAGE_SPEC §5

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| key | `'ble' \| 'wifi' \| 'hub' \| 'conn' \| 'usb'` | ✔ | — | 公开 |
| state | `'ok' \| 'warn' \| 'active' \| 'pending' \| 'fail'` | ✔ | `pending` | 公开 |
| detail? | `string` | 可空 | 空明细 | 公开 |

### 3.5 广播域

**BroadcastConfig** · 生命周期：广播页会话 · 来源：PAGE_SPEC §8 · BUSINESS_FLOW §5

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| name | `string` | ✔ | 平台预填默认（微信 SmartBLE / Android SmartBLE-A / iOS SmartBLE-I） | 公开 |
| serviceUuid | `string`（4/8/36 位 hex，非法黄条） | ✔ | 平台预填（FFE0 等） | 公开 |
| manufacturerId | `string`（HEX 1–4 位） | ✔ | 预填 | 公开 |
| manufacturerData | `string` | ✔ | 预填 | 公开 |
| androidOptions? | `{ mode: 'lowPower'\|'balanced'\|'lowLatency'; power: 'ultraLow'\|'low'\|'medium'\|'high'; connectable: boolean; includeName: boolean; includeServiceUuid: boolean }` | 可空 | 非 Android 缺省；Android 默认 平衡/高/开关三态 | 公开 |

**BroadcastBudget** · 生命周期：随表单实时核算 · 来源：BUSINESS_FLOW §5 · BR-05

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| limitBytes | `number`（=31，固定常量） | ✔ | — | 公开 |
| usedBytes | `number` | ✔ | 0 | 公开 |
| parts | `{ label: string; bytes: number }[]`（AD 结构逐项：名称 2+len、UUID、厂商块 2+2+len） | ✔ | 空数组 | 公开 |
| overflow | `boolean`（超限=true，红字阻止启动、不静默截断） | ✔ | false | 公开 |

**BroadcastSession** · 生命周期：广播起停周期 · 来源：STATE_MACHINE §5（6 态，单 owner）

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| state | `'IDLE' \| 'STARTING' \| 'ADVERTISING' \| 'STOPPING' \| 'STOPPED' \| 'FAILED'` | ✔ | `IDLE` | 公开 |
| owner | `string`（单 owner；广播中禁改 payload=OWNER_BUSY） | 可空 | IDLE 缺省 | 内部 |
| supported | `'supported' \| 'unsupported' \| 'probe-pending'`（C1 运行时探测口径） | ✔ | `probe-pending` | 公开 |
| startedAt? | `Timestamp` | 可空 | — | 内部 |

### 3.6 OTA / 日志 / 版本域

**OtaSession** · 生命周期：单次 OTA 事务 · 来源：STATE_MACHINE §6（12 态）· PAGE_SPEC §6 OTA 子流程。**端到端 BLOCKED（P-03）**

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| transactionState | 12 态闭合集（枚举全集以 ota-manager 正典化为准，STATE_MACHINE §6 注） | ✔ | 初始态 | 公开 |
| phaseLabel | `'pick' \| 'validating' \| 'ready-wait' \| 'transferring' \| 'committing' \| 'verifying' \| 'success' \| 'failed' \| 'cancelled'` | ✔ | `pick` | 公开 |
| progress | `{ sentBytes: number; totalBytes: number }` | 可空 | 未传输缺省 | 公开 |
| fileMeta? | `{ name: string; size: number; sha256?: string }` | 可空 | — | 公开 |
| ownership | `SessionOwnership`（接管 `WORKFLOW:'ota-manager'`，禁自动重连） | ✔ | — | 内部 |
| operationId / generation | `OperationId` / `number` | ✔ | — | **technical-only** |

**RuntimeLogEntry** · 生命周期：页面会话（容量：全局 500 / 单设备 200 / LRU 40） · 来源：02_product/DATA_MODEL §1 · BUSINESS_FLOW §7

| 字段 | 类型 | 必填 | 缺省 | 敏感级别 |
|---|---|---|---|---|
| time | `Timestamp` | ✔ | — | 内部 |
| type | `'sys' \| 'err' \| 'read' \| 'write' \| 'recv' \| 'ok'` | ✔ | — | 公开 |
| msg | `string`（**脱敏后**文案：敏感键→`***`，BR-04/F026） | ✔ | — | 公开（脱敏后） |
| deviceId? | `DeviceId` | 可空 | 全局条目缺省 | 公开 |
| namespace? | `string`（如 `'broadcast'`） | 可空 | — | 内部 |

**ReleaseMetadata** · 生命周期：启动/关于页读取（通道不可用回退构建内置） · 来源：02_product/DATA_MODEL §1 版本投影 · PAGE_SPEC §9/§10

| 字段 | 类型 | 必填 | 缺省语义 | 敏感级别 |
|---|---|---|---|---|
| displayVersion | `string`（运行时真值优先，回退 `v+sha7` / `dev.unknown`） | ✔ | `dev.unknown` | 公开 |
| versionCode | `number` | 可空 | — | 公开 |
| channel | `string`（preview 等） | ✔ | — | 公开 |
| overallStatus | `'VERIFIED' \| 'PREVIEW' \| 'BLOCKED' \| 'UNSUPPORTED' \| 'NOT_RELEASED'` | ✔ | — | 公开 |
| knownLimitations | `string[]` | ✔ | 空数组→空态文案 | 公开 |
| releases / previews | `{ version: string; date: string; notes?: string }[]` ×2 | ✔ | 空数组→空态文案 | 公开 |
| platformStatus | `{ platform: string; capability: string; releaseState: string }[]` | ✔ | — | 公开 |

## 4. Domain 实体与 Store 投影（SSOT 分层）

| 规则 | 内容 | 来源 |
|---|---|---|
| 领域事实源 | **Session Registry 是连接领域事实源**（8 态 + owner/borrow + provisioning 互斥）；配网工作流与诊断会话同理为各自领域事实源 | STATE_MACHINE §1 · PLATFORM_CAPABILITY_DECISION §2（C3） |
| UI 唯一投影 | **Store 是 UI 唯一投影来源**——Store 内实体（§3 的投影形态）只能经 Application Handler 写入 | RUNTIME v1.2 §3.1 · STORAGE_POLICY §3 |
| 禁止反向 | **Store projection 不得反向成为领域状态**——断链/重建时以 Registry 为准，Store 只被事件刷新，不得被 UI 或页面逻辑回写领域 | RUNTIME v1.2 §3.2 第 5 条 |
| 禁止第三副本 | **不允许页面或组件创建第三份 BLE 状态**（连接态/扫描态/配网进度） | RUNTIME v1.2 §3.2 第 1/2 条 |

## 5. 敏感字段汇总（最严格档）

| 字段 | 归属实体 | 规则 | 来源 |
|---|---|---|---|
| wifiPassword | ProvisioningForm | 仅内存；只用于本次下发；不写日志/不落盘/不进剪贴板/离开配网页即清空 | BR-03 · S-1 · S-4 |
| token.value | PairingToken | 仅内存 TTL 5 分钟；日志脱敏 `***`；过期即失效 | S-2 · S-3 · STATE_MACHINE §3 |
| 配网帧载荷 | WriteQueueItem（配网场景 data） | 下发期间内存态；日志只记事件不记明文 | BR-03/04 · DATA_FLOW §4 安全边界 |

## 6. 技术字段标记

以下字段/对象必须标记并按此处理（四标记可叠加）：

| 标记 | 含义 | 适用对象 |
|---|---|---|
| **technical-only** | 仅为工程运行服务，不构成产品概念、不呈现给用户 | operationId、generation、WriteQueueItem.operationId、DiagnosticSession.operationId、debounced、SessionOwnership 全部字段（ownerId/borrowedBy 等内部治理字段） |
| **runtime-only** | 只存在于运行时内存，任何形式的序列化/导出/日志均不得携带 | generation、internalCause（[ERROR_CODE](ERROR_CODE.md) §1 cause 字段）、PairingToken.value |
| **never-persisted** | 冷启动即空，禁止进入任何存储（Z-2 全实体适用，敏感字段双重适用） | 全部实体（§3 前提）；敏感字段（§5）加严 |
| **not-user-facing** | 不得在任何 UI 文案/弹窗/日志中直接展示 | platformCode（错误平台原始码）、internalCause、operationId、generation |

## 7. 数据不变式（平台与实现不得触碰）

| # | 不变式 | 来源 |
|---|---|---|
| INV-1 | **deviceId 去重**：同 deviceId 的发现项合并更新（留最新），集合上限 100、RSSI 降序 | BR-09 · BUSINESS_FLOW §1 |
| INV-2 | **Profile 仅为可空扩展**：profileMatch/profileId 是可空注记字段，不得成为任何通用路径前置条件 | DR-1 · DEVICE_PROFILE_SPEC PR-6 |
| INV-3 | **配网会话不进入 P007 通用列表**：两种会话分账（session.provisioning 互斥；P001 计数=通用连接数+SHID 配网在线） | DR-3 · PAGE_SPEC §7 |
| INV-4 | **Session 状态以注册表为准**：Registry 为连接事实源，Store 仅投影且不得反向 | PLATFORM_CAPABILITY_DECISION §2 · §4 本表 |
| INV-5 | **广播缺失字段不猜值**：字段缺失/长度 0 显式呈现（present 三态），不造值 | 02_product/DATA_MODEL §2 第 4 条 · 10_platform §7 三查② |
| INV-6 | **敏感字段不落盘、不进日志、不进剪贴板**（§5 汇总；任何导出物保持脱敏） | S-1～S-4 · BR-03/04 · R28 |
| INV-7 | **冷启动即空**：全部实体（含 operationId/generation）内存态，冷启动即空——验收预期非缺陷 | DATA_FLOW §8 · PRD §1.3/§1.4 |
| INV-8 | **无存储键**：不得出现任何 localStorage/键值/数据库/文件落盘路径（F023/PAGE004 不复刻） | Z-2 · STORAGE_POLICY §1/§8 · N-4 |

## 8. 冻结校验

- ☑ 双层定位声明：02_product/DATA_MODEL=产品语义模型 / 本文=运行时类型契约，不互相替代（头注）
- ☑ 类型表达规则含「不构成 TypeScript 选型决策」声明（§0）
- ☑ 基础值对象 ×9（DeviceId/SessionId/OperationId/ProfileId/ServiceUuid/CharacteristicUuid/Timestamp/HexString/ByteArray）全部落表（§1）
- ☑ 事件信封三类 + 公共字段（eventId/type/timestamp/source/operationId?/sessionId?/deviceId?/generation?/payload）与 PlatformEvent ×7 / DomainEvent ×13 闭合集（§2，与 RUNTIME v1.2 §0.5 一致）
- ☑ 运行时实体覆盖任务书全清单（BluetoothEnvironment/CapabilitySnapshot/ScanSession/ScannedDevice/Advertisement/AdvertisementField/ConnectionSession/SessionOwnership/GattService/GattCharacteristic/CharacteristicProperties/NotifySubscription/WriteQueueItem/RuntimeLogEntry/ProfileMatch/ProvisioningSession/ProvisioningForm/PairingToken/ProvisioningProgress/DiagnosticSession/DiagnosticRow/BroadcastConfig/BroadcastBudget/BroadcastSession/OtaSession/ReleaseMetadata ×26），每实体给齐字段名/类型/必填/缺省语义/敏感级别/生命周期/来源（§3）
- ☑ 未新增 BLE-009 我的设备/收藏/别名/历史设备等实体（STORAGE_POLICY §7 负面清单重申）
- ☑ Domain 实体与 Store 投影四规则（Registry 事实源/Store 唯一投影/不反向/无第三副本）（§4）
- ☑ 技术字段四标记（technical-only/runtime-only/never-persisted/not-user-facing）落表（§6）
- ☑ 数据不变式 ×8（§7）；零持久化与敏感规则全链引用 S-1～S-6/BR-02～04/Z-2，无放松
