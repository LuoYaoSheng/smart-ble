# API_SPEC —— 方法与事件契约（工程契约四件套之一 · 本轮核心）

> 版本：1.1（08-G0.1 原工程内重构口径同步：TARGET_APP_ROOT 改为 `apps/uniapp`；契约本体零改动）· 生成日期：2026-09-03（v1.0，08-G1）；修订 2026-09-03（v1.1，08-G0.1）
> 性质：**不新增产品功能、不改 29 功能/9 页面/S1–S6、不改状态集合、零后端、零登录、零本地持久化**。本文是改版目标工程（TARGET_APP_ROOT = `apps/uniapp`，原工程内重构）的**方法与事件契约**——API_ACTION_MATRIX = 页面动作映射，本文 = 方法与事件契约，**两者不得互相替代**（也不得声称前者可替代本文，08-G0 已澄清）。类型契约见 [DATA_MODEL](DATA_MODEL.md)，错误契约见 [ERROR_CODE](ERROR_CODE.md)，权限契约见 [PERMISSION](PERMISSION.md)；冲突时以被引产品正典（02/03/04）为准。
> 输入：[11_ecosystem/API_UNIFIED_SPEC_v1.0.md](../11_ecosystem/API_UNIFIED_SPEC_v1.0.md)（BLE.\* §3–§13）· [11_ecosystem/ALIGNMENT_NOTES.md](../11_ecosystem/ALIGNMENT_NOTES.md) §4（映射既定输入）· [02_product](../02_product/)（PRD §5/§7/§8）· [03_flow](../03_flow/)（PAGE_SPEC / BUSINESS_FLOW）· [04_architecture](../04_architecture/)（STATE_MACHINE / DATA_FLOW）· [05_sequence/SEQUENCE_DIAGRAMS.md](../05_sequence/SEQUENCE_DIAGRAMS.md) · [RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.2 · [API_ACTION_MATRIX](API_ACTION_MATRIX.md)（ACT 编号）· [PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md) · [DEVICE_PROFILE_SPEC](DEVICE_PROFILE_SPEC.md)

## 0. 两级 API（不得混为一个巨型接口）

| 级 | 名称 | 服务对象 | 覆盖域 |
|---|---|---|---|
| **A** | **SmartBleRuntimeApi**（产品运行时接口） | Application Action / Domain 层（②③） | 环境与能力 · 扫描 · 连接与 Session · 服务发现 · GATT 读写 · Notify · 广播 · Profile 匹配 · Smart HID 配网 · 诊断 · OTA（BLOCKED）· 日志（§5–§12） |
| **B** | **Platform Ports**（平台能力抽象接口，PlatformPortBundle ×9） | Domain Service（③，按需取用） | BlePlatformPort（BLE 原语）+ Permission / QrScan / Share / Clipboard / FilePicker / ExternalNavigation / DeviceInfo / Lifecycle 八个支撑端口（§2） |

规则：A 编排 B 的原语与领域规则（队列/会话/工作流）；扫码、分享、剪贴板、文件选择、外链、设备信息、生命周期**只出现在 B 的对应端口，不得混入 BlePlatformPort，也不上升为 A 的成员**（Application Action 直接经对应 Port 使用支撑能力）；权限不混入任何 BLE 方法（PERMISSION §1）。

## 1. 通用约定

- **方法签名**为语言无关契约表达（DATA_MODEL §0 声明：不构成 TypeScript 选型决策）。
- **返回值**：全部异步方法返回 `CommandResult<T>`（§4）；同步方法直接返回值。
- **事件**：方法产生的状态变化经事件通道上行（§3 目录；信封 = DATA_MODEL §2）；**方法返回结果不是 UI 状态——所有 UI 状态由 AppEvent → Handler/Reducer → Store 投影产生**。
- **错误**：统一 AppError（[ERROR_CODE](ERROR_CODE.md) §1）；下文「可能错误」只列码，语义/文案/恢复动作以 ERROR_CODE 为准。
- **运行隔离**：所有方法调用生成/携带 operationId；stale 回调按 RUNTIME_ARCHITECTURE v1.2 §0.6 丢弃。
- **OTA 特别约束**：§16——API 位存在、契约可定义，端到端状态 BLOCKED，不得写成已验证可发布能力。

## 2. Platform Ports（PlatformPortBundle ×9 · 职责契约）

端口职责边界全文 = [RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.2 §1.4；本节给方法级契约。**所有 Port 由组装根注入；禁止泄露 wx.\*/plus.\* 原生对象；Adapter 可实现多个 Port；Base Core 只依赖抽象。**

### 2.1 BlePlatformPort（仅 BLE 中央/GATT/Notify/外围广播/蓝牙状态）

| 方法 | 输入 → 返回 | 事件（归一化后） | 错误映射责任 |
|---|---|---|---|
| initializeAdapter | `{}` → `BluetoothEnvironment` | BluetoothStateChanged | 平台码→BLE_001/002（ERROR_CODE §3.1） |
| getBluetoothState | `{}` → `BluetoothEnvironment` | — | 不抛错（状态以返回值呈现） |
| subscribeBluetoothState | listener → unsubscribe | BluetoothStateChanged | — |
| startScan / stopScan | options(allowDuplicates 等) / reason → ok | DeviceFound | 平台码→BLE_003 |
| subscribeDeviceFound | listener → unsubscribe | DeviceFound | — |
| connect / disconnect | deviceId(+options) / deviceId(+initiator) → ok | ConnectionStateChanged | 平台码→BLE_004 |
| subscribeConnectionState | listener → unsubscribe | ConnectionStateChanged | — |
| discoverServices / discoverCharacteristics | deviceId / deviceId+serviceUuid → 服务/特征集合 | — | 平台码→BLE_005 |
| read | deviceId+serviceUuid+charUuid → 值 | CharacteristicValueChanged | 平台码→BLE_005/006（逐码【待真机证据】） |
| write | deviceId+uuids+payload → ok | — | 平台码→BLE_006 |
| enableNotify / disableNotify | deviceId+uuids → ok | CharacteristicValueChanged | 平台码→BLE_007 |
| subscribeCharacteristicValue | listener → unsubscribe | CharacteristicValueChanged | — |
| startAdvertising / stopAdvertising | BroadcastConfig(平台相关参数经 Adapter 消化) / `{}` → ok | PeripheralStateChanged | 平台码→BLE_008 前置/运行（活动连接冲突=validation 拦截） |
| subscribeAdvertisingState | listener → unsubscribe | PeripheralStateChanged | — |

### 2.2 支撑端口 ×8（不得混入 BlePlatformPort）

| Port | 方法 | 输入 → 返回 | 事件 | 支撑 | 错误 |
|---|---|---|---|---|---|
| PermissionPort | checkPermission / requestPermission / subscribePermissionState / openAppSettings | permissionKey → [PermissionState](PERMISSION.md) §2；`{}` → ok | PermissionStateChanged | F002/F015/F020 | denied→BLE_002（PERMISSION §5）；unsupported≠权限 |
| QrScanPort | scanCode | `{}` → `{content}` \| `{outcome:'cancelled'\|'denied'\|'failed'}` | — | F020（P02-04） | 三分支分类提示（取消不算错误，ERROR_CODE §5） |
| SharePort | share / showShareMenu | options → result | — | F029（P09-03） | 失败降级复制（ClipboardPort 协作） |
| ClipboardPort | copyText | text → ok/fail | — | F004/F011/F027/F028（复制类） | 失败 toast「复制失败」；敏感字段禁止进入（S-4） |
| FilePickerPort | pickFile | `{extension:'bin'}` → file \| null(取消) | — | F025（P06-12；一次性读入，STORAGE_POLICY §5.3） | 取消=cancelled 非错误 |
| ExternalNavigationPort | openExternalUrl / openMiniProgram | url / appId(+path) → ok | — | F027/F028（P09-01/P09-04） | 未配置 appId→toast；失败→modal 重试（PAGE_SPEC §9） |
| DeviceInfoPort | getDeviceInfo / getRuntimeVersion | `{}` → 宿主信息(平台/osName/机型) / 版本真值 | — | wxhost 宿主判定（F002/F014 devtools 拦截）/ F027 版本三态 | 获取失败→unknown 三字段（PAGE_SPEC §9） |
| LifecyclePort | subscribeLifecycle | listener → unsubscribe | LifecycleChanged | BR-06 全部隐式动作（P001 停扫/P008 停广播/P002 清敏感/P005/P006 清理） | — |

## 3. 事件目录（闭合集）

事件来源二分与统一关系 = RUNTIME_ARCHITECTURE v1.2 §0.5；信封字段 = DATA_MODEL §2。**事件的来源只有两类——平台回调（PlatformEvent）与领域产出（DomainEvent），不得有第三类来源。**

| 类 | 事件 | 载荷要点（payload） | 主要消费 |
|---|---|---|---|
| P | BluetoothStateChanged | `{state}` | P001 导航栏三态 / P008 |
| P | DeviceFound | `{device: ScannedDevice 增量}`（归一化后） | 扫描处理链 → Store |
| P | ConnectionStateChanged | `{deviceId, state, connected, disconnectSource?}` | Session Registry 8 态转移 → Store |
| P | CharacteristicValueChanged | `{deviceId, serviceUuid, characteristicUuid, value: HexString}` | 日志「接收」/ 配网 STATUS / 诊断 |
| P | PeripheralStateChanged | `{state: BroadcastSession.state}` | P008 徽章/日志 |
| P | PermissionStateChanged | `{permissionKey, state: PermissionState}` | 权限横幅/门禁 |
| P | LifecycleChanged | `{phase: 'show'\|'hide'\|'unload', page}` | BR-06 隐式动作 |
| D | ScanRequested / ScanStarted | `{sessionId, durationMs}` | 扫描态投影 |
| D | ScanStopRequested | `{sessionId, reason}` | 停扫转移 |
| D | ScanTimedOut / ScanFailed | `{sessionId, errorCode?}` | 完成口径 / 失败横幅 |
| D | ConnectRequested | `{deviceId, operationId}` | CONNECTING 态 |
| D | RetryScheduled | `{target, attempt, backoffMs}` | 重连/初始化重试日志 |
| D | WriteQueued | `{itemId, deviceId, queueDepth}` | 写队列反馈 |
| D | ValidationRejected | `{rule, field, code}`（非法 HEX/空/超 31B/表单非法） | 校验拦截 |
| D | ProvisioningTimedOut | `{sessionId, deviceId}` | 取消等待态 |
| D | DiagnosticStepChanged | `{sessionId, rowKey, state}` | 五行进度 |
| D | OtaValidationFailed | `{transactionId, code}` | 校验终止（BLOCKED 语境） |
| D | OperationCancelled | `{operationId, reason}`（取消等待/队列 abort/OTA abort/离开配网） | cancelled 口径（ERROR_CODE §5） |

> 扩充规则：事件名可按规范最终整理；新增须经评审回写本表与 RUNTIME v1.2 §0.5——**不得借事件名增加产品状态**（PZ-2）。

## 4. 结果模型 CommandResult\<T\>

```text
CommandResult<T> = {
  status: 'accepted' | 'completed' | 'rejected' | 'cancelled',
  value?: T,                 // status=completed 时有效
  error?: AppError,          // status=rejected 时有效（cancelled 不占错误码，ERROR_CODE §5）
  operationId: OperationId   // technical-only（DATA_MODEL §6）
}
```

- `accepted`：命令受理（异步过程进行中——扫描已启动、写已入队、配网已下发等待 STATUS）；`completed`：同步完成（状态查询/纯函数）；`rejected`：校验/前置/单会话冲突拒绝；`cancelled`：完成前被取消（用户/运行失效）。
- **方法返回结果不是 UI 状态**：结果由 Application Action 转换为 DomainEvent（§3），经 Handler/Reducer 落 Store 后才成为 UI 状态（RUNTIME v1.2 §2.1 规则 3/4）。

## 5. SmartBleRuntimeApi —— 环境与能力

| 方法 | F / ACT | 输入 → 返回 | 异步·幂等·超时 | 取消 · 并发 | 事件（出 D / 入 P） | 可能错误 · capability | 来源 |
|---|---|---|---|---|---|---|---|
| initialize | F002 · P01-01 前置 | `{}` → `BluetoothEnvironment` | 异步 · 幂等（重复调用复用）· 初始化失败指数退避重试 3 次（1s/2s/4s） | 不可取消（可 dispose）· 全局一次 | D: RetryScheduled；P 入: BluetoothStateChanged / PermissionStateChanged / LifecycleChanged | BLE_001（open_settings）/ BLE_002 · 前置于一切 BLE 能力 | SEQ §1 · BUSINESS_FLOW §1 |
| dispose | **technical-only**（生命周期对称：解绑全局监听/定时器/平台订阅，防泄漏；无产品行为） | `{}` → void | 异步 · 幂等 | — · 单次 | P 入: — | 无 | RUNTIME v1.2 §10 生命周期 |
| getBluetoothState | F002/F014 · P01-01/P08-08 | `{}` → `BluetoothEnvironment` | 同步 · 幂等 · 无 | — | — | 不抛错（state 呈现 off/unsupported） | API §4 · PAGE_SPEC §1 |
| getCapabilities | F014/F015 · P08-08 | `{}` → `CapabilitySnapshot`（**禁止只返回 boolean**，§14） | 异步（含运行时探测）· 每次重探测（P008 进入/onShow 均调用，不缓存） | 不可 · 探测串行 | P 入: PeripheralStateChanged（探测副作用） | 探测失败→capability=unknown + 显式「不支持+指引」（不静默降级，C1） | API §3 · PLATFORM_CAPABILITY_DECISION §1 |
| subscribeBluetoothState | F001/F002 · P01-01 | listener → unsubscribe | 异步 · **重复注册可检测/幂等**（§10） | — | P 入: BluetoothStateChanged | — | PAGE_SPEC §1 三态 |

## 6. SmartBleRuntimeApi —— 扫描

| 方法 | F / ACT | 输入 → 返回 | 异步·幂等·超时 | 取消 · 并发 | 事件（出 D / 入 P） | 可能错误 · capability | 来源 |
|---|---|---|---|---|---|---|---|
| startScan | F001 · P01-01 | `{durationMs=5000, serviceUuid?, allowDuplicates=true}` → `SessionId` | 异步 · **同一时刻一个扫描会话**（进行中再调=rejected）· 5s 会话自动停 | stopScan 可停 · 单会话独占 | D: ScanRequested → ScanStarted / ScanFailed；P 入: DeviceFound / BluetoothStateChanged | BLE_001/002/003 · scan_failed · capability: scan | SM §7 · SEQ §1 · R01 |
| stopScan | F001 · P01-01 | `reason: 'user'\|'page_hide'\|'page_unload'` → void | 异步 · 幂等（无会话=no-op completed） | — | D: ScanStopRequested（状态转移非错误） | — | PAGE_SPEC §0.4 · BR-06 |
| subscribeDeviceFound | F001/F004/F005/F018 · P01-07 | listener → unsubscribe | 异步 · 重复注册可检测 | — | P 入: DeviceFound（处理链：节流/归一/显示名/Profile 匹配/合并去重） | — | DATA_FLOW §1 |

## 7. SmartBleRuntimeApi —— 连接与 Session

| 方法 | F / ACT | 输入 → 返回 | 异步·幂等·超时 | 取消 · 并发 | 事件（出 D / 入 P） | 可能错误 · capability | 来源 |
|---|---|---|---|---|---|---|---|
| connect | F006/F019 · P01-05/P06-04/P02-09/P02-10/P05-01 | deviceId(+options) → `SessionId` | 异步 · **deviceId 连接去重**（已连接/未死会话复用→completed）· 超时 10s + 自动重试 3 次退避 n×2s | 用户断开/离开确认可终止 · 多设备并行（C3） | D: ConnectRequested / RetryScheduled；P 入: ConnectionStateChanged | BLE_004 · connection_lost ·（配网入口）identity_failed · capability: connect | SM §1 · SEQ §2 · BUSINESS_FLOW §2 |
| disconnect | F012/F013 · P06-04/P07-01/P07-02 | deviceId + `initiator:'user'\|'workflow'\|'system'` → void | 异步 · 幂等 | — · 批量=allSettled | D: OperationCancelled（该设备未发写队列 abort）；状态转移经 ConnectionStateChanged 上行 | 断开失败→toast/modal（P007）· **USER_REQUEST 永不重连** | SM §1/§2 · PAGE_SPEC §7 |
| getConnectionState | F006 · P06-04 | deviceId → 会话 8 态（读 **Session Registry**，§13） | 同步 · 幂等 | — | — | 不抛错（无会话=IDLE 口径） | SM §1 |
| subscribeConnectionState | F006/F012 | listener → unsubscribe | 异步 · 重复注册可检测 | — | P 入: ConnectionStateChanged（被动断线判定/重连 backoff 在 ③） | — | SEQ §4 |

## 8. SmartBleRuntimeApi —— GATT 读写与 Notify

| 方法 | F / ACT | 输入 → 返回 | 异步·幂等·超时 | 取消 · 并发 | 事件（出 D / 入 P） | 可能错误 · capability | 来源 |
|---|---|---|---|---|---|---|---|
| discoverServices | F007 · P06 自动 | deviceId → `GattService[]` | 异步 · 幂等 · 期望服务重试 3×400ms | — · 会话内一次 | 状态转移经 ConnectionStateChanged（DISCOVERING→READY） | BLE_005 · capability: connect | SEQ §2 · BUSINESS_FLOW §2 |
| discoverCharacteristics | F007 · P06 自动 | deviceId+serviceUuid → `GattCharacteristic[]` | 异步 · 幂等 | — | — | BLE_005 | API §8 |
| read | F008 · P06-08 | deviceId+serviceUuid+charUuid → `HexString` | 异步 · 非幂等（每次新读）· **3s 超时** | 不可（自然超时）· 受写队列外独立 | P 入: CharacteristicValueChanged（「接收」HEX+TEXT） | 读失败→日志「错误」（errMsg 归一；逐码【待真机证据】） | PAGE_SPEC §6 · R08 |
| write | F009/F021 · P06-11/P02-05 | deviceId+uuids+data+`{mode:'TEXT'\|'HEX'}` → `WriteQueueItem.itemId`（accepted 即入队） | 异步 · **同设备串行 / 跨设备并行 / 单写 5s / 深度 16（满队 rejected）**（§13） | 断线→队列 abort（PENDING→CANCELLED） | D: WriteQueued / ValidationRejected（空输入·非法 HEX）/ OperationCancelled（abort）；P 入: — | BLE_006 · capability: connect+READY | DATA_FLOW §2 · R09 |
| enableNotify / disableNotify | F010 · P06-10 | deviceId+uuids → void | 异步 · **防抖去重**（重复快速点击不产生并发开关） | — · 订阅集随会话 | 状态同步 char.notifying；P 入: CharacteristicValueChanged | BLE_007 | PAGE_SPEC §6 · R10 |
| subscribeCharacteristicValue | F008/F010/F021/F024 | listener → unsubscribe | 异步 · 重复注册可检测 | — · 断线自动清理订阅 | P 入: CharacteristicValueChanged | — | DATA_FLOW §3 |

## 9. SmartBleRuntimeApi —— 外围广播

| 方法 | F / ACT | 输入 → 返回 | 异步·幂等·超时 | 取消 · 并发 | 事件（出 D / 入 P） | 可能错误 · capability | 来源 |
|---|---|---|---|---|---|---|---|
| startAdvertising | F014/F015 · P08-07 | `BroadcastConfig` → `BroadcastSession` | 异步 · **单 owner**（ADVERTISING 中再启动=rejected OWNER_BUSY）· 平台建立超时（微信外围链路/插件初始化） | stopAdvertising 可停 | D: ValidationRejected（超 31B=PAYLOAD_TOO_LARGE / UUID 非法）；P 入: PeripheralStateChanged | PAYLOAD_TOO_LARGE / OWNER_BUSY / 活动连接冲突拦截 / BLE_008 前置 · **capability: advertise——微信=C1 supported_limited（运行时探测后启用）/ Android=supported / devtools=unsupported（host limitation）** | SM §5 · BUSINESS_FLOW §5 · R21–R24 |
| stopAdvertising | F014/F015 · P08-07 | `{}` → void | 异步 · 幂等 | — | 状态转移 IDLE/STOPPED；微信释放外围模式 | — | PAGE_SPEC §8 · BR-06 |
| getAdvertisingState | F014 · P08-08 | `{}` → `BroadcastSession` | 同步 · 幂等 | — | — | 不抛错 | SM §5 |
| subscribeAdvertisingState | F014/F015 | listener → unsubscribe | 异步 · 重复注册可检测 | — | P 入: PeripheralStateChanged（徽章六值） | — | PAGE_SPEC §8 |

## 10. SmartBleRuntimeApi —— Profile / 配网 / 诊断

| 方法 | F / ACT | 输入 → 返回 | 异步·幂等·超时 | 取消 · 并发 | 事件（出 D / 入 P） | 可能错误 · capability | 来源 |
|---|---|---|---|---|---|---|---|
| registerProfile | F018 · —（代码层注册，非用户动作） | profile（契约见 DEVICE_PROFILE_SPEC §5） → void | 同步 · 重复注册可检测（rejected） | — | D: ValidationRejected（注册契约非法） | 无平台错误 · 纯领域注册表 | DR-2 · API §13 |
| matchProfile | F018 · P01-06/P07-03（识别在扫描期完成） | ScannedDevice → `ProfileMatch?`（STRONG 优先 WEAK） | 同步纯函数 · 幂等 | — | — | 无 · 纯函数 | R14 · DEVICE_PROFILE_SPEC §2 |
| verifyDeviceInfo | F019 · P02 进入自动 | deviceId → `DeviceInfo 校验结果` | 异步 · 单次（随配网入口） | 断开即终止 | P 入: CharacteristicValueChanged（INFO 读取） | **identity_failed（recoverable=false，断开报错）** | SEQ §5 · PAGE_SPEC §2 |
| startProvisioning | F019/F021 · P02-05 | deviceId + `ProvisioningForm` → `SessionId` | 异步 · **配网会话互斥**（provisioning 标志）· 60s 窗口 | cancelProvisioning / 离开确认 | D: WriteQueued（framed-v1 分帧入队）/ ProvisioningTimedOut / OperationCancelled；P 入: CharacteristicValueChanged（STATUS state/step/error） | 8 设备侧错误码经 STATUS 上行呈现（非命令结果直返，ERROR_CODE §3.2） · capability: connect | SM §3/§4 · SEQ §5 · R17 |
| cancelProvisioning | F021 · P02-06 | deviceId → void | 异步 · 幂等 | — · 会话互斥期内独占 | D: OperationCancelled（工作流 CANCELLED，非错误） | — | PAGE_SPEC §2 · SM §3 |
| getProvisioningStatus | F021 · P02 status 观察 | deviceId → `ProvisioningProgress`（读工作流事实源） | 同步 · 幂等 | — | — | 不抛错 | SM §4 |
| runDiagnostics | F024 · P05-01 | deviceId → `SessionId`（**每次生成新 operationId**——P005 教训，RUNTIME v1.2 §0.6） | 异步 · 非幂等（重检=新运行）· 读状态超时随连接 | 重新检测使旧运行失效（generation） | D: DiagnosticStepChanged；P 入: CharacteristicValueChanged（INFO/STATUS） | diagnostic_connect_failed（modal 指引进配网模式） · offline 态前置 | SM §8 · SEQ §6 · PAGE_SPEC §5 |
| getDiagnosticResult | F024 · P05-02 | deviceId → `DiagnosticSession`（含 lastError code+message） | 同步 · 幂等 | — | — | 不抛错 | PAGE_SPEC §5 |

## 11. SmartBleRuntimeApi —— OTA（端到端 BLOCKED）

| 方法 | F / ACT | 输入 → 返回 | 异步·幂等·超时 | 取消 · 并发 | 事件（出 D / 入 P） | 可能错误 · capability | 来源 |
|---|---|---|---|---|---|---|---|
| getFirmwareVersion | F025 · P06-01 | deviceId → 版本串 | 异步 · 幂等 | — | P 入: CharacteristicValueChanged | BLE_008 域 · **接口位保留** | API §11 · ALIGNMENT §4 |
| startOta | F025 · P06-12 | deviceId + file(.bin，经 FilePickerPort) → `OtaSession` | 异步 · **接管会话所有权（WORKFLOW:'ota-manager'）+ 禁自动重连**（§13）· ready 30s / success 30s / 传输按 180B·20ms | cancelOta（{op:'abort'}）· 独占会话 | D: OtaValidationFailed（六重校验失败终止，不发起传输）；P 入: CharacteristicValueChanged（STATUS/DATA） | OTA_HASH_MISMATCH / OTA_VERSION_MISMATCH / 六包五运行逐码【待 legacy 实证固化】 · **capability: ota——端到端 BLOCKED（P-03），见 §16** | SM §6 · SEQ §7 · R25 |
| cancelOta | F025 · P06-12 | deviceId → void | 异步 · 幂等 | — | D: OperationCancelled（事务 CANCELLED，非错误） | — | SM §6 · PAGE_SPEC §6 |

## 12. SmartBleRuntimeApi —— 日志

| 方法 | F / ACT | 输入 → 返回 | 异步·幂等·超时 | 取消 · 并发 | 事件 | 可能错误 · capability | 来源 |
|---|---|---|---|---|---|---|---|
| log | F011/F026 · P06 日志源头 | level + message + context? → void | 同步 · —（容量管理在 core logger） | — | — | 脱敏前置（写前 token/password→`***`，BR-04） | BUSINESS_FLOW §7 · API §12 |
| getLogs | F011 · P06-03 | filter? → `RuntimeLogEntry[]`（全局 500/单设备 200/LRU 40） | 同步 · 幂等 | — | — | 不抛错；空日志→「暂无日志」 | R11 |
| clearLogs | F011 · P06-02 | deviceId? → void | 同步 · 幂等 | — | — | — | PAGE_SPEC §6 |

## 13. 并发与所有权（冻结）

| # | 规则 | 值/口径 | 来源 |
|---|---|---|---|
| C-1 | 扫描并发 | **同一时刻一个扫描会话**；进行中再 startScan=rejected | SM §7 · 本文 §6 |
| C-2 | 连接去重 | **deviceId 维度连接去重**（复用未死会话） | BUSINESS_FLOW §2 |
| C-3 | 会话事实源 | **Session Registry 唯一事实源**（Store 仅投影） | C3 裁决 · RUNTIME v1.2 §3 |
| C-4 | 所有权 | **owner / borrow**——owner（PAGE/WORKFLOW/BACKGROUND/SYSTEM）可断开，borrow 只能 release | SM §1 |
| C-5 | 会话分账 | **配网会话与通用会话分账**（provisioning 互斥；不进 P007 列表，计入 P001 计数） | DR-3 |
| C-6 | 写并发 | **同设备写队列串行；跨设备可并行** | PRD §4.2 |
| C-7 | 写队列 | **深度 16；单写超时 5s**；优先级插队 | PRD §4.2 · DATA_FLOW §2 |
| C-8 | 重连 | **1s/3s/5s，最多 3 次**；耗尽→FAILED→手动重试 ×3 | SM §2 · BR-08 |
| C-9 | 主动断开 | **用户主动断开不重连**（USER_REQUEST；2s marker 区分被动） | SM §1/§2 |
| C-10 | 广播所有权 | **广播单 owner**；ADVERTISING 中禁改 payload（OWNER_BUSY） | SM §5 |
| C-11 | OTA 接管 | OTA 进行中**接管会话（WORKFLOW:'ota-manager'）并禁自动重连** | BUSINESS_FLOW §6 |
| C-12 | 运行隔离 | **operationId/generation 不匹配的旧回调必须丢弃** | RUNTIME v1.2 §0.6 |

## 14. Capability（C1/C3 裁决口径）

- `getCapabilities` 返回 **CapabilitySnapshot 结构（见 [DATA_MODEL](DATA_MODEL.md) §3.1），不允许只返回 boolean**——每能力 `supported / unsupported / supported_limited / supported_foreground / unknown` + 外围细节（运行时探测要求/后台不承诺/宿主限制）。
- **C1 已裁决（2026-09-03，08-G0）= supported_limited**（微信外围广播：devtools unsupported / 真机运行时探测后启用 / 后台不承诺 / 不允许静默降级；真机证据待补）；**C3 已裁决（2026-09-03，08-G0）= supported_foreground**（微信多设备：前台多 Session / 不承诺后台保持与固定最大连接数 / 每 Session 独立错误反馈 / Session Registry 唯一事实源）——[PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md) §1/§2。
- 权限通过≠能力可用；C3 非权限项（PERMISSION §6）。

## 15. 生命周期

| 规则 | 内容 | 来源 |
|---|---|---|
| initialize 单次注册 | **initialize 只能注册一次全局监听**（重复调用幂等复用，不重复注册） | 本文 §5 · RUNTIME v1.2 §0.1 |
| dispose 解绑 | **dispose 必须解绑**全部全局监听/定时器/平台订阅 | 本文 §5 |
| 页面离开释放边界 | **页面离开只释放页面 owner，不得误杀 borrow 会话**（owner/borrow 判定在 Registry） | SM §1 · BR-06 |
| onHide/onUnload | 按 **BR-06**：P001 停扫、P008 停广播（非 APP）/释放外围、P002 清敏感并断开、P005 持有则断开、P006 解绑订阅/定时器/回调（触发源 = LifecycleChanged） | PAGE_SPEC §0.4 · API_ACTION_MATRIX §2 |
| listener 注册 | **重复注册必须可检测或幂等**（全部 subscribe\* 方法契约） | 本文各表 · RUNTIME v1.2 §6 |

## 16. OTA 特别约束（BLOCKED）

- **API 位存在**（getFirmwareVersion / startOta / cancelOta，§11）与**契约可定义**（12 态事务/六重校验/180B·20ms 分包/commit+版本回读）；
- **端到端状态仍为 BLOCKED（P-03）**——客户端与固件完整事务尚未对齐（PRD §5 F025 · DEVELOPMENT_SCOPE §5）；
- **不得在本文或任何实现中把 OTA 写成已验证可发布能力**；动作契约照规范实现、BLOCKED 标注两处在位（API_ACTION_MATRIX P06-01/P06-12 同口径）。

## 17. 方法追溯登记（供静态核验）

- 全部公共方法（§5–§12，共 37 个）均可追溯：F 编号 + ACT 编号（见各表第二列；「—」表示无页面动作的技术注册，如 registerProfile 代码层注册）。
- **technical-only 方法登记（含存在理由）**：`dispose`（§5）——生命周期对称与防泄漏（initialize 的逆操作），无产品行为、无页面动作。其余 subscribe\* / get\* 均绑定 F/ACT。
- Platform Ports（§2）支撑的页面动作（扫码 P02-04 / 分享 P09-03 / 复制 P01-08·P06-03·P10-01·P09-01 / 选包 P06-12 / 推广 P09-04 / 设置跳转 P01-01 权限行）在 API_ACTION_MATRIX §3 有 ACT 编号，本文 §2 逐行对应。

## 18. 冻结校验

- ☑ 两级 API 分立：SmartBleRuntimeApi（12 域）与 Platform Ports（×9）不得混为一个巨型接口（§0/§2）；扫码/分享/剪贴板/文件/外链/设备信息/生命周期不在 BlePlatformPort、不上升为 A 级成员
- ☑ 每方法给齐：方法名/所属层（§0 级别+所在域节）/F/ACT/输入/返回/同步异步/幂等/超时/取消/并发/发出 DomainEvent/接收 PlatformEvent/可能错误/capability 条件/来源（§5–§12 表列）
- ☑ 方法与事件覆盖任务书最小集：环境（initialize/dispose/getBluetoothState/getCapabilities/subscribeBluetoothState）、扫描（startScan/stopScan/subscribeDeviceFound）、连接（connect/disconnect/getConnectionState/subscribeConnectionState）、GATT（discoverServices/discoverCharacteristics/read/write/enableNotify/disableNotify/subscribeCharacteristicValue）、广播（startAdvertising/stopAdvertising/getAdvertisingState/subscribeAdvertisingState）、Profile/配网/诊断/OTA/日志整理为 SmartBleRuntimeApi 未下沉到 BlePlatformPort（§5–§12 vs §2.1）
- ☑ 并发与所有权 12 条冻结（§13：单扫描会话/deviceId 去重/Registry 事实源/owner-borrow/分账/同设备串行·跨设备并行/深 16·单写 5s/重连 1s·3s·5s×3/主动断开不重连/广播单 owner/OTA 接管/旧运行失效）
- ☑ CommandResult\<T\> 四值（accepted/completed/rejected/cancelled）+「方法返回结果不是 UI 状态」（§4）
- ☑ capability 用 C1/C3 裁决定档且返回结构化 CapabilitySnapshot、禁止 boolean（§14）
- ☑ 生命周期五规则（initialize 单次注册/dispose 解绑/页面离开只释放 owner 不误杀 borrow/onHide·onUnload 按 BR-06/重复注册可检测或幂等）（§15）
- ☑ OTA 三段口径：API 位存在/契约可定义/端到端 BLOCKED 不得写成已验证可发布（§16）
- ☑ technical-only 方法（dispose）登记理由；全部公共方法可追溯 F/ACT（§17）
- ☑ 不新增功能/页面/验收编号；无 HTTP/登录/本地持久化；事件目录闭合且不得借事件名增加产品状态（§3）
