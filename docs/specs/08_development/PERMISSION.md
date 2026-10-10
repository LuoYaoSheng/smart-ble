# PERMISSION —— 工程权限状态与按动作最小权限矩阵（工程契约四件套之四）

> 版本：1.0 · 生成日期：2026-09-03（08-G1 工程契约四件套生成与事件模型收口，用户任务书）
> 性质：**不新增产品功能、不改状态集合**——本文只把既有正典中的权限证据（PAGE_SPEC 权限状态行 · PLATFORM_ADAPTER_SPEC §3.2/§4.1 · 10_platform §4 权限模型行）收口为工程层权限状态与按动作的最小权限矩阵。**无证据处标【待真机证据】，不得猜**；冲突时以被引文档为准。
> 输入：[02_product](../02_product/)（PRD / STATE_MODEL）· [03_flow](../03_flow/)（PAGE_SPEC）· [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) §4 · [08_development](.) 既有件（PLATFORM_ADAPTER_SPEC §3/§4 · PLATFORM_CAPABILITY_DECISION · DEVELOPMENT_SCOPE §7 · ERROR_CODE · RUNTIME_ARCHITECTURE v1.2 §1.4 PermissionPort）

## 1. 四类概念不得混淆

| 概念 | 回答的问题 | 判定归属 | 示例 |
|---|---|---|---|
| **capability** | 平台是否具备该能力 | CapabilitySnapshot（[DATA_MODEL](DATA_MODEL.md) §3.1；C1/C3 裁决） | 微信真机外围广播 = supported_limited |
| **bluetooth state** | 蓝牙适配器是否开启 | BluetoothEnvironment（三态+unknown） | 蓝牙未开 10001 → BLE_001 |
| **permission** | 用户是否授权 | PermissionState（§2，经 PermissionPort） | 拒绝蓝牙授权 → BLE_002 |
| **host limitation** | 开发者工具/宿主环境限制 | DeviceInfoPort 宿主判定（wxhost 维度） | **微信开发者工具外围广播 unsupported，不是 permission denied**（PLATFORM_ADAPTER_SPEC §3.1） |

判定次序（与 §3 请求原则一致）：先能力探测（capability）→ 再状态检查（bluetooth state）→ 再权限（permission）→ 宿主限制（host limitation）单独归因，不与前三者混写。

## 2. 工程权限状态 PermissionState

```text
'unknown' | 'checking' | 'granted' | 'denied' | 'permanentlyDenied' | 'notRequired' | 'unsupported'
```

| 状态 | 语义 |
|---|---|
| unknown | 尚未查询（初始态） |
| checking | 查询/申请进行中 |
| granted | 已授权 |
| denied | 已拒绝（可再次申请） |
| permanentlyDenied | 永久拒绝（仅剩系统设置入口，App·Android 二次拒绝实证口径） |
| notRequired | 该动作在该环境无需权限（无独立授权步骤） |
| unsupported | 该能力/权限在该环境不存在（host limitation 或能力缺失） |

> **必须注明：这是工程权限状态（technical 层），不增加产品 [STATE_MODEL](../02_product/STATE_MODEL.md) 中的业务状态**——产品状态集合正典仍为 STATE_MACHINE §1–§9（PZ-2）；PermissionState 只在 PermissionPort / Application 层内部使用，其变化经 PermissionStateChanged 事件上行（[RUNTIME_ARCHITECTURE](RUNTIME_ARCHITECTURE.md) v1.2 §0.5），投影到产品已有的权限失败态呈现（如 P001 授权拒绝横幅）。

## 3. 按动作的最小权限矩阵

环境列 = D1 首批四环境（PLATFORM_ADAPTER_SPEC §3.1 wxhost 维度 + §4）。矩阵单元格记：所需权限/前置 → 证据或【待真机证据】。

| 动作（F/ACT） | 微信 Android 真机 | 微信 iOS 真机 | 微信开发者工具 | App·Android |
|---|---|---|---|---|
| **F001/F002 扫描（含权限前置）** P01-01/02 | 微信蓝牙授权（弹窗+去设置，六态分支 F002；拒绝 reason 分类 `bluetooth_permission_denied` 等）；底层系统定位权限由微信宿主统一管理，产品不自管【待真机证据：安卓/iOS 宿主系统弹窗形态】 | 同左（安卓/iOS 真机同一 wx BLE 路径，行为一致，PLATFORM_ADAPTER_SPEC §3.1） | 模拟器授权行为不等价真机【待真机证据】；扫描/GATT 域不受影响（§3.1 同源） | ACCESS_FINE_LOCATION 运行时权限链：弹窗→拒绝横幅→二次拒绝=永久拒绝→仅剩系统设置引导（回流自动续扫）（PLATFORM_ADAPTER_SPEC §4.1） |
| **F006 连接** P01-05/P06-04 | 随蓝牙授权，无独立权限步骤（notRequired） | 同左 | 同左【待真机证据】 | 随扫描授权链（FINE_LOCATION）；SDK≥31 的 BLUETOOTH_CONNECT 逐项请求实证仅登记于广播前置（§4.1），连接链单列【待真机证据】 |
| **F010 Notify** P06-10 | notRequired（无独立权限步骤，正典无权限分支） | 同左 | 同左 | notRequired |
| **F014 微信外围广播** P08-07/08 | 无独立权限项；外围服务运行时探测后启用（C1 supported_limited，不允许静默降级） | 同左（真机验证矩阵在册，真机证据待补） | **unsupported（host limitation，非 permission denied）**——三处拦截：真机调试横幅+检查支持→不支持+启动拦截 | —（归 F015） |
| **F015 Android 外围广播** P08-03~07 | —（归 F014） | — | — | SDK≥31 逐项权限（BLUETOOTH_ADVERTISE→BLUETOOTH_CONNECT）+ FINE_LOCATION；拒绝→缺失汇总 modal+去设置；系统蓝牙关闭→Intent 蓝牙设置（PLATFORM_ADAPTER_SPEC §4.1） |
| **F020 摄像头扫码** P02-04 | 相机权限由微信宿主管理；产品存在「扫码权限拒绝→分类提示可重扫」分支（denied 态可呈现，PAGE_SPEC §2） | 同左 | 同左【待真机证据】 | 相机运行时权限链【待真机证据——旧代码 uni.scanCode 的 App 端权限行为未入正典】 |
| **F025 OTA 文件选择** P06-12 | chooseMessageFile 会话文件选择（notRequired，无授权弹窗实证） | 同左 | 同左【待真机证据】 | chooseFile 系统文件选择器（notRequired，无授权弹窗实证） |
| **F029 分享** P09-03 | notRequired（右上角菜单/系统机制触发，不由页面绘制） | 同左 | 同左 | notRequired（系统分享面板；失败降级复制） |
| **外链/系统设置跳转** P09-01/P09-04 | 外链=复制到剪贴板+toast（notRequired）；权限设置=微信设置指引（F002 去设置） | 同左 | 同左 | 外链=系统浏览器 plus.runtime.openURL（notRequired）；权限设置=应用详情页（去设置）；蓝牙设置=Intent（notRequired） |

> 「—」表示该环境不承载该功能（F014 仅微信路径、F015 仅 App 路径，P008 平台分支，PAGE_SPEC §8）。PC 端微信【未知，未验证】不建模（DEVELOPMENT_SCOPE §7 V-4）。

## 4. 请求原则

| # | 原则 | 依据 |
|---|---|---|
| P-1 | **Just-in-time**：权限在动作触发时按需申请；**禁止应用启动时一次性索要全部权限** | F002 前置模型（P01-01 点击才触发）· 10_platform §4 |
| P-2 | **先能力探测，再状态检查，再申请权限**（§1 判定次序；capability ≠ state ≠ permission） | C1 裁决（运行时探测）· 本文 §1 |
| P-3 | **拒绝后提供明确下一步**（横幅 reason 分类 + 重试 + 指引；异常三要素） | BR-07 · PAGE_SPEC §1 |
| P-4 | **永久拒绝进入系统设置**（permanentlyDenied → open_settings；App·Android 二次拒绝实证） | PLATFORM_ADAPTER_SPEC §4.1 |
| P-5 | **从设置返回 onShow 必须重新检查**权限状态（不缓存 granted 假设；经 LifecycleChanged→onShow 触发复查） | RUNTIME v1.2 §0.5 · BR-06 生命周期表达 |
| P-6 | **权限结果只存运行时内存**（PermissionState 为 runtime 态） | Z-2 · DATA_MODEL §6 |
| P-7 | **不得持久化「用户曾拒绝」等状态**（无存储键；冷启动即 unknown） | Z-2 · STORAGE_POLICY §1 · INV-7/8 |

## 5. 与 ERROR_CODE 对接

每个权限结果必须完成四级映射（[ERROR_CODE](ERROR_CODE.md) §3 同构）：

```text
PermissionState → AppError / BLE_00x → 用户文案 → recoveryAction
```

| PermissionState | 映射 | 用户文案要点 | recoveryAction |
|---|---|---|---|
| denied / permanentlyDenied | `AppError{layer: sdk-transport, code: BLE_002（platformCode=reason）}` | 授权拒绝横幅（reason 分类）+ 指引 | open_settings |
| unsupported（权限/能力不存在） | validation-capability 层（能力/宿主限制，**不占 BLE_002**） | 「不支持 + 指引」（不静默降级） | dismiss / none（指引文案内含去向） |
| notRequired / granted | 无 AppError | — | none |
| checking / unknown | 无 AppError（过程态） | 内联加载表达（无遮罩） | none |

> 蓝牙未开不属于权限（§1 概念 2）：映射 BLE_001 + open_settings（PAGE_SPEC §1「请先打开系统蓝牙」）。

## 6. C1/C3 与权限的关系（均已裁决，2026-09-03 08-G0）

- **C1 已裁决 = supported_limited**：**权限通过不等于能力可用**——微信外围广播即使授权链全绿，仍需外围服务**运行时探测**（`wx.createBLEPeripheralServer` 建立成功才进入 ADVERTISING；探测/建立失败走 FAILED 与不支持指引，不允许静默降级；后台广播不承诺）（[PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md) §1）。
- **C3 已裁决 = supported_foreground**：**不是权限项**——多设备会话属于能力与生命周期边界（前台多 Session / 不承诺后台保持与固定最大连接数 / 每 Session 独立错误反馈 / Session Registry 唯一事实源），权限矩阵不设行（同上 §2）。

## 7. 冻结校验

- ☑ 四类概念区分表 + 示例（devtools 外围广播 unsupported ≠ permission denied）（§1）
- ☑ PermissionState ×7（unknown/checking/granted/denied/permanentlyDenied/notRequired/unsupported）+ 「工程权限状态，不增加产品 STATE_MODEL 业务状态」注明（§2）
- ☑ 最小权限矩阵覆盖九组动作（F001/F002、F006、F010、F014、F015、F020、F025、F029、外链/设置跳转）× 四环境（微信安卓真机/微信 iOS 真机/微信开发者工具/App·Android）；全部结论溯源 PAGE_SPEC/PLATFORM_ADAPTER_SPEC/10_platform，无证据处标【待真机证据】未猜（§3）
- ☑ 请求原则七条（Just-in-time/探测次序/拒绝下一步/永久拒绝去设置/onShow 复查/仅内存/不持久化拒绝史）（§4）
- ☑ 与 ERROR_CODE 对接四级映射表（PermissionState→AppError/BLE_00x→文案→recoveryAction）；蓝牙未开归 BLE_001 非权限（§5）
- ☑ C1/C3 关系收口：C1 权限通过≠能力可用（运行时探测）；C3 非权限项（§6）
- ☑ 不新增产品功能、不新增业务状态（PZ-2）；权限通道经 PermissionPort（RUNTIME v1.2 §1.4），Page/Component 不直调权限 API（R-4）
