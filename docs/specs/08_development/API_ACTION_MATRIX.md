# API_ACTION_MATRIX —— 用户动作 × 功能 × 验收 × BLE 统一接口 映射（开发前冻结）

> 版本：1.1（08-G1 同步）· 生成日期：2026-09-03（v1.0）；修订 2026-09-03（v1.1，08-G1 工程契约四件套生成）
> **v1.1 修订记录（08-G1）**：① 方法与事件契约已由 **[API_SPEC](API_SPEC.md)** 定稿（SmartBleRuntimeApi + Platform Ports 两级）——本文 §4 的 BLE.\* 引用口径以 API_SPEC 为准（**本文职责 = 页面动作映射，API_SPEC = 方法与事件契约，两者不得互相替代**）；② §6 枚举口径差登记为「以 API_SPEC 并收口」；③ 动作/功能/验收编号零改动。
> 输入（本文全部结论的来源，仅此四目录）：[02_product](../02_product/)（PRD / FEATURE_MAP / BUSINESS_RULE / STATE_MODEL）· [03_flow](../03_flow/)（PAGE_SPEC / PAGE_FLOW / USER_FLOW / BUSINESS_FLOW）· [10_platform/PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md) · [11_ecosystem](../11_ecosystem/)（API_UNIFIED_SPEC / ALIGNMENT_NOTES）· [08_development/API_SPEC](API_SPEC.md)（方法与事件契约，v1.1 起为 §4 的引用基线）
> 性质：**不新增功能、不改变产品逻辑，只做抽取与对齐**。每条动作均标注规范依据；冲突时以被引文档为准，本文不产生第二正文。
> 用途：开发实现的**动作契约基线**——任何平台实现的任何用户可达动作，必须能在本矩阵（或其引用源）中找到定义；本矩阵未登记而规范也未定义的动作，一律不得实现（依据：BR-12 候选增强红线、10_platform §4 不变式）。

## 0. 编制规则

- **动作编号 ACT-<页>-<序号>**：本表登记用编号，仅用于开发追踪与验收对照，不是产品新增概念。
- **动作正文**：逐条抽取自 [PAGE_SPEC.md](../03_flow/PAGE_SPEC.md) 各页「按钮列表与行为」表（动作的单一事实源）；本表只做摘录，完整行为（含全部异常分支）以 PAGE_SPEC 原表为准。
- **功能/验收**：F 编号对应 [PRD.md](../02_product/PRD.md) §5 功能列表；R 编号对应 PRD §8 验收标准（R19 已随 F023 作废）。
- **BLE.\* 统一接口**：Smart BLE 生态统一 API（[API_UNIFIED_SPEC_v1.0.md](../11_ecosystem/API_UNIFIED_SPEC_v1.0.md) §3–§13），页面动作与 BLE.* 的映射以 [ALIGNMENT_NOTES.md](../11_ecosystem/ALIGNMENT_NOTES.md) §4 为准；现有 uni-app/wx 平台 API 一并列出（旧代码实证）。**方法与事件契约（输入/返回/超时/并发/事件/错误）以 [API_SPEC](API_SPEC.md) 为准（08-G1 定稿）——本表只回答「哪个动作调哪个能力域」，不重复方法签名**。标注「—（非 BLE 域）」表示纯本地 UI/导航/剪贴板动作，无 BLE 调用（剪贴板/扫码/分享等平台支撑能力经 Platform Ports，API_SPEC §2）。
- **平台差异动作**：仅 10_platform §4 差异设计表列出的差异点允许平台分化（L3 圈内）；差异列在下表「平台口径」注明。

---

## 1. 全局动作契约（导航与反馈）

来源：PAGE_SPEC.md §0.1（导航约定）/ §0.2（反馈约定）；PAGE_FLOW.md §1–§2。

| 约定 | 内容 | 来源 |
|---|---|---|
| TabBar 导航 | 四 Tab（扫描 P001 / 已连接 P007 / 广播 P008 / 关于 P009），switchTab 切换（清栈） | PAGE_SPEC §0.1 · PAGE_FLOW §1 |
| 二级页入栈 | 一律 navigateTo；**配网成功进详情用 redirectTo**（替换向导页，防返回回到已完成向导） | PAGE_SPEC §0.1 · PAGE_FLOW §2（P002→P003 行） |
| 页面栈感知导航 | 目标页已在栈中时 navigateBack 复用，避免叠加实例（P005 首创：返回设备详情 / 重新配网两处） | PAGE_SPEC §0.1 · PAGE_FLOW §1 注①② |
| 空态回首页 | 空态「去扫描」类按钮一律 switchTab 回 P001 | PAGE_SPEC §0.1 |
| 轻反馈 | uni.showToast（success 有图标 / none 纯文字）；**无 loading 遮罩层**，加载态一律内联 | PAGE_SPEC §0.2 |
| 重反馈/确认 | uni.showModal；危险操作（移除/重新配网/离开配网）均二次确认 | PAGE_SPEC §0.2 |
| 复制类操作 | uni.setClipboardData 成功后 toast（「已复制」「日志已复制」「网址已复制」「版本已复制」） | PAGE_SPEC §0.2 |

## 2. 生命周期隐式动作（无按钮、由平台生命周期触发）

来源：PAGE_SPEC.md §0.4；对应业务规则 BR-06（前后台守则，BUSINESS_RULE.md §1）。

| 触发 | 动作 | 来源 |
|---|---|---|
| P001 onHide/onUnload | 自动停止扫描（reason=page_hide / page_unload） | PAGE_SPEC §0.4 · BUSINESS_FLOW §1 |
| P008 onHide（非 APP 平台）/onUnload | 自动停广播；微信端释放外围模式 | PAGE_SPEC §0.4 · R24 |
| P002 onUnload | 清空密码/hubInfo **并断开连接**（敏感数据不残留） | PAGE_SPEC §0.4 · BR-03 |
| P005 onUnload | 若本页持有连接则断开 | PAGE_SPEC §0.4 |
| P006 onUnload | 解绑日志订阅/定时器/断连回调 | PAGE_SPEC §0.4 |

平台生命周期表述差异（同一 BR-06 规则的平台表达）：微信=后台挂起、Web=页签可见性守则、Desktop=常驻+退出确认——见 10_platform §4「生命周期守则」行与 BUSINESS_RULE.md §2。

---

## 3. 页面动作矩阵（P001–P010，P004 除外）

> 各表「行为契约」为摘录；完整出现条件、状态与异常分支见 PAGE_SPEC.md 对应节。

### 3.1 PAGE001 扫描首页（PAGE_SPEC §1）

| ACT | 动作 | 出现条件 | 行为契约（摘要） | 功能/验收 | BLE.* 域 / 现有平台 API |
|---|---|---|---|---|---|
| P01-01 | 开始扫描 ⇄ 停止扫描 | 始终（工具条主按钮） | 开始：权限前置→启动 5s 扫描会话，按钮变 danger；停止：立即中止（reason=user）；完成 toast「扫描完成 · 发现 N 台」 | F001/F002 · R01/R02 | `BLE.scan(options)` / `BLE.stopScan()` / `BLE.initialize()` / `BLE.getBluetoothState()`（ALIGNMENT_NOTES §4）；wx.startBluetoothDevicesDiscovery / wx.openBluetoothAdapter |
| P01-02 | 重试 | 仅错误横幅显示时 | 重新走 startScan 流程 | F002 · R02 | `BLE.scan` 域 |
| P01-03 | 筛选 ⇄ 收起筛选 | 始终（文字链） | 展开/收起 filter-panel | F003 | —（非 BLE 域） |
| P01-04 | RSSI 预设 ×4 / 滑杆 / 名称前缀输入 / 隐藏无名开关 / 重置过滤 | 筛选展开时 | 实时作用于列表（无确认按钮）；重置回 {rssi:-100, prefix:'', hideNoName:false} | F003 · R03 | —（非 BLE 域；对齐生态清单 BLE-002-04/05/06 过滤与排序项，见 ALIGNMENT_NOTES §3） |
| P01-05 | 连接 | 设备卡（普通卡；**SHID 卡同样保留标准连接入口**——Profile 扩展原则，见 [DEVICE_PROFILE_SPEC](DEVICE_PROFILE_SPEC.md) §4 PR-2） | 等扫描收尾（prepareConnect）→暂存路由上下文→navigateTo P006（携带 deviceId/name/rssi） | F006 · R06 | `BLE.connect(deviceId)`；wx.createBLEConnection |
| P01-06 | 配置 Smart HID | SHID 设备卡（Profile 匹配） | 等扫描收尾→setCurrentDevice→navigateTo P002 | F018/F019 · R14/R15 | `BLE.matchProfile(device)` 域（识别在扫描期完成，ALIGNMENT_NOTES §4） |
| P01-07 | （点设备卡本体） | 任意设备卡 | 打开广播数据弹窗（与「连接」按钮互不干扰） | F004 · R04 | `BLE.getAdvertisement()`（含 Manufacturer Data / Service Data / UUID / Raw Data，API §10） |
| P01-08 | 复制数据 / 关闭 | 广播数据弹窗内 | 复制报告全文 toast「已复制」/ 关闭弹窗 | F004 · R04 | —（剪贴板） |

已移除动作（开发不得实现）：「全部历史 / 已知设备查看 / 移除」——随 2026-09-02 决策移除（PAGE_SPEC §1 表中原行标注【已移除】；PRD 变更记录）。

### 3.2 PAGE002 Smart HID 配网向导（PAGE_SPEC §2）

| ACT | 动作 | 出现条件 | 行为契约（摘要） | 功能/验收 | BLE.* 域 / 现有平台 API |
|---|---|---|---|---|---|
| P02-01 | Wi-Fi 名称输入（≤32 字符） | configure 阶段 | 实时双向绑定，无提交即校验 | F019 · R17 | —（表单，内存态） |
| P02-02 | Wi-Fi 密码输入（≤64，password 型） | configure 阶段 | 可留空（「无密码可留空」） | F019 · R17 | —（表单；仅内存 BR-03） |
| P02-03 | ControlHub 地址输入 | configure 阶段 | placeholder 192.168.1.8:17892；扫码后自动回填 host:port | F019 · R16 | —（表单） |
| P02-04 | 扫描 ControlHub 配对码（大动作卡） | configure 阶段 | 调起扫码→解析 `shid://pair`→回填地址+token 入内存（badge 必需→已获取）；失败按取消/权限/失败分类提示 | F020 · R16 | 扫码为平台绑定项（10_platform §1 Profile 域行）：uni.scanCode；Desktop=摄像头扫码为主+粘贴/手输兜底（10_platform §2.4/§4） |
| P02-05 | 下发配置 | configure 阶段（canSubmit） | canSubmit=SSID+Hub+token 齐且非配网中；点击进入 status 阶段；candidate 分帧明文写 INPUT | F021 · R17 | `BLE.write`（framed-v1 分帧明文 write，帧契约见 BUSINESS_FLOW §4） |
| P02-06 | 取消等待 | status 阶段·配网进行中 | 取消 60s 等待，回到可重试状态 | F021 · R17 | —（轮询取消） |
| P02-07 | 查看设备 | status 阶段·配网成功 | redirectTo P003（保留会话；内存快照，不落盘） | F019 · R17 | —（导航） |
| P02-08 | 恢复按钮（文案随错误变） | status 阶段·失败 | 四种动作：回表单 form / 重新扫码 pairing / 跳诊断 diagnostics / 重下发 retry | F022 · R18 | —（错误恢复路由；错误码表见 BUSINESS_FLOW §4） |
| P02-09 | 重新连接 / 返回设备列表 | connect 阶段·连接失败 | 重连本设备 / switchTab 回首页 | F019 · R15 | `BLE.connect` |
| P02-10 | 重新连接设备 | configure 阶段·断线 | 重连后已填表单保留继续 | F019 · R15 | `BLE.connect` |
| P02-11 | （物理返回键） | 配网进行中 | 拦截→确认弹窗「离开将取消本次配置等待」→允许才 navigateBack | F019 · BR-10 | — |

### 3.3 PAGE003 Smart HID 设备详情（PAGE_SPEC §3）

| ACT | 动作 | 行为契约 | 功能/验收 | BLE.* 域 |
|---|---|---|---|---|
| P03-01 | 重新配置（主按钮） | setCurrentDevice→navigateTo P002 | F019 · R15 | — |
| P03-02 | 运行诊断 | navigateTo P005（携带 deviceId） | F024 · R20 | — |
| P03-03 | 高级 BLE 调试 | 暂存路由上下文→navigateTo P006 | F006 | `BLE.connect`（复用会话） |

隐式动作：记录不存在（无设备上下文）→进入即 modal「设备记录不存在」→强制 navigateBack（PAGE_SPEC §3 状态行）。

### 3.4 PAGE005 Smart HID 诊断（PAGE_SPEC §5）

| ACT | 动作 | 出现条件 | 行为契约（摘要） | 功能/验收 | BLE.* 域 |
|---|---|---|---|---|---|
| P05-01 | 重新检测（连接中…禁用） | 始终 | 会话不在线→offline 态+modal「BLE 未连接」（确认「连接并检测」→connect+diagnose；取消停留）；在线→直接 diagnose | F024 · R20 | `BLE.connect` + 读实时状态（STATUS 特征域） |
| P05-02 | 显示错误码 ⇄ 隐藏错误码 | 始终 | 切换错误详情块（code+message）显隐 | F024 · R20 | — |
| P05-03 | 返回设备详情 | 始终 | 页面栈感知：栈中有 P003 则 navigateBack，否则 navigateTo P003 | F024 | — |
| P05-04 | 重新配网 | 始终 | modal 确认（READY 设备需先进配网模式）→栈中有 P002 则返回，否则 navigateTo P002 | F019 · R15 | — |

### 3.5 PAGE006 通用设备详情 · GATT 调试工作台（PAGE_SPEC §6）

| ACT | 动作 | 出现条件 | 行为契约（摘要） | 功能/验收 | BLE.* 域 / 现有平台 API |
|---|---|---|---|---|---|
| P06-01 | 固件更新（danger） | 仅检测到 OTA 服务（4fafc201-…-914d） | 打开 ota-dialog；完整事务契约见 PRD §7.5 与 PAGE_SPEC §6 OTA 子流程 | F025 · R25 | `BLE.getFirmwareVersion()` / `BLE.startOTA(file)`（接口位保留，ALIGNMENT_NOTES §4）。⚠ **端到端 BLOCKED（P-03）**，STATE_MODEL §1 第 6 项 |
| P06-02 | 清空日志 | 始终 | 清空本会话日志列表 | F011 | `BLE.log/getLogs` 域（内存日志） |
| P06-03 | 导出日志 | 始终 | 有日志→格式化文本复制+toast「日志已复制」；无日志→toast「暂无日志」 | F011 · R11 | `BLE.getLogs()`；导出形态平台差异见 10_platform §4「日志导出」行（文件流为候选，BR-12 不做） |
| P06-04 | 连接设备 ⇄ 断开连接 | 始终 | 连接中显示禁用；已连接变 danger「断开连接」（主动断开，**不触发重连**）；连接流=复用会话→10s 超时→自动重试 3 次退避 | F006/F012 · R06/R12 | `BLE.connect` / `BLE.disconnect` / `BLE.getConnectionState`；wx.createBLEConnection |
| P06-05 | 重试 | 服务面板 error 态 | 手动重连（manualRetryConnection） | F006/F012 | `BLE.connect` 域 |
| P06-06 | 全部展开 / 全部收起 | 服务树 ready 态 | 批量折叠切换 | F007 · R07 | — |
| P06-07 | （服务折叠头） | 每服务 | 单服务展开/收起 | F007 | — |
| P06-08 | 读取 | 特征 properties.read | 发起读（3s 超时）→日志「接收」HEX+TEXT；失败日志「错误」 | F008 · R08 | `BLE.read(serviceUUID,charUUID)` |
| P06-09 | 写入 | 特征 properties.write | 记录目标特征→打开 write-dialog | F009 | —（弹窗入口） |
| P06-10 | 开始监听 ⇄ 停止监听 | 特征 properties.notify | 开→订阅+char.notifying 同步+日志「系统」；关→取消订阅；防抖去重 | F010 · R10 | `BLE.enableNotify` / `BLE.disableNotify` |
| P06-11 | （write-dialog）数据类型单选 TEXT/HEX + 数据输入 + 确认/取消 | 弹窗打开时 | 确认：空输入 toast；HEX 非法拦截；合法→**写队列串行**下发→toast「写入成功」+日志 | F009 · R09 | `BLE.write`（写队列串行化=F009，ALIGNMENT_NOTES §4） |
| P06-12 | （ota-dialog）选择文件 / 取消 / 关闭 | 弹窗打开时 | 选 .bin（微信 chooseMessageFile）→校验→传输进度→成功 2s 自动关闭；取消→abort | F025 · R25（BLOCKED，同 P06-01） | `BLE.startOTA` 域 |

### 3.6 PAGE007 已连接设备（PAGE_SPEC §7）

| ACT | 动作 | 出现条件 | 行为契约（摘要） | 功能/验收 | BLE.* 域 |
|---|---|---|---|---|---|
| P07-01 | 全部断开 | >1 台 | Promise.allSettled 批量断开→全部成功 toast；部分失败 modal 列失败设备清单 | F013 · R13 | `BLE.disconnect` ×N |
| P07-02 | 断开（卡片 danger） | 每卡 | SHID 会话先断（如适用）→断开并从列表移除→toast「已断开」；失败 toast 错误信息 | F013/F012 | `BLE.disconnect` |
| P07-03 | （点卡片） | 每卡 | **按 profileId 分流**：有 Profile 走其路由，否则 navigateTo P006 | F018 · R14 | `BLE.matchProfile` 域（路由分流） |
| P07-04 | 去扫描 | 空态 | switchTab P001 | —（导航） | — |

### 3.7 PAGE008 BLE 广播（PAGE_SPEC §8）

| ACT | 动作 | 出现条件 | 行为契约（摘要） | 功能/验收 | BLE.* 域 / 现有平台 API |
|---|---|---|---|---|---|
| P08-01 | 设备名称输入 | 始终（广播中禁用） | 实时参与 31B 预算（名称 2+len） | F016 · R21 | `BLE.startAdvertise(options).name`（API §10） |
| P08-02 | 服务 UUID 输入 | 始终（广播中禁用） | 4/8/36 位 hex 校验，非法显示黄条错误 | F016 · R21 | `BLE.startAdvertise(options).uuid` |
| P08-03 | 广播模式 picker（低功耗/平衡/低延迟） | 仅 Android | 默认「平衡」 | F015 · R23 | `BLE.startAdvertise` options（插件 options 含模式/功率/可连接，BUSINESS_FLOW §5） |
| P08-04 | 发射功率 picker（超低/低/中/高） | 仅 Android（微信端映射 low/medium/high） | 默认「高功率」 | F015 | 同上；微信=server.startAdvertising(powerLevel)（BUSINESS_FLOW §5） |
| P08-05 | 可连接 / 包含设备名称 / 添加服务 UUID 开关 ×3 | 仅 Android | 实时影响 payload 构成与预算 | F015/F016 | 同上 |
| P08-06 | 厂商 ID（HEX 1-4 位）/ 厂商数据输入 | 始终（广播中禁用） | 参与预算（厂商块 2+2+len） | F016 · R21 | `BLE.startAdvertise` options |
| P08-07 | 开始广播 ⇄ 停止广播（主按钮） | 始终 | 开始：payload 校验（超限/非法 toast 阻止）→平台分支（Android：蓝牙开闭+权限引导→插件；iOS：插件；微信：peripheral+server 链路；Web：toast 不支持）→徽章「广播中」；停止：停播（微信关 server） | F014/F015 · R21–R24 | `BLE.startAdvertise(options)`（平台能力决定是否支持，API §10 注意项）；wx.createBLEPeripheralServer / LysBlePeripheral（ALIGNMENT_NOTES §4） |
| P08-08 | 检查支持 | 始终 | 平台分支探测（App 插件 isSupported / 微信建立从机链路 / 其他标记不支持），结果写入日志与徽章 | F014 · R22 | `BLE.getCapabilities()` / `BLE.getBluetoothState()`（ALIGNMENT_NOTES §4：P001 支持判定/P008 check） |

平台口径备注：微信矩阵冲突 C1（矩阵 ❌ vs 实证 △）与多设备冲突 C3（矩阵 ❌ vs F013 已实现 ✅）——**已裁决（2026-09-03，08-G0）：C1 = supported_limited / C3 = supported_foreground，以实证为准**，真机证据待补（[PLATFORM_CAPABILITY_DECISION](PLATFORM_CAPABILITY_DECISION.md) §1/§2；ALIGNMENT_NOTES §2；10_platform §3 生态矩阵对照段）。

### 3.8 PAGE009 关于（PAGE_SPEC §9）

| ACT | 动作 | 行为契约 | 功能/验收 | 平台口径 |
|---|---|---|---|---|
| P09-01 | 官方网站 / 问题反馈 | 平台分支：APP 拉起浏览器 / H5 新窗 / 微信复制链接+toast | F027 域 · PAGE_SPEC §9 | 10_platform §4 分享/外链差异行 |
| P09-02 | 版本记录 | navigateTo P010 | F027 | — |
| P09-03 | 分享应用 | 微信：showShareMenu+toast「请点击右上角分享」；APP：系统分享（失败降级复制）；H5：navigator.share（失败降级复制） | F029 | 10_platform §4「分享（F029）」行 |
| P09-04 | （推广卡） | 微信：navigateToMiniProgram（未配置 appId→toast；失败→modal）；**非微信渠道（APP/Desktop/Web）：打开落地页 + 出示小程序码（静态预生成资源·零后端）** | F028 · R27 | 10_platform §4「推广跳转（F028）」行；二维码为待实现项（PRD §5 F028 状态「部分实现」） |

### 3.9 PAGE010 版本记录（PAGE_SPEC §10）

| ACT | 动作 | 行为契约 | 功能/验收 |
|---|---|---|---|
| P10-01 | 复制版本信息 | 复制 display_version→toast「版本已复制」（失败 toast「复制失败」） | F027 · R26 |

### 3.10 PAGE004 Smart HID 历史【已移除】

**无任何动作**。PAGE004 连同其全部按钮（去扫描/点条目/移除）于 2026-09-02 用户决策整页移除，重开发**不必实现**（PAGE_SPEC §4；PRD 变更记录；PAGE_FLOW §1「已移除」注）。

---

## 4. BLE.\* 统一接口 ↔ 本项目动作 ↔ 现有平台 API 总表

来源：ALIGNMENT_NOTES.md §4（08 阶段 API 映射的既定输入）；接口签名见 API_UNIFIED_SPEC_v1.0.md §3–§13。**（v1.1）方法与事件契约以 [API_SPEC](API_SPEC.md) 为准**：本表左列 BLE.\* 能力域在 API_SPEC 中已落为 SmartBleRuntimeApi 方法（§5–§12）与 Platform Ports（§2）——开发实现按 API_SPEC 的输入/返回/超时/并发/事件/错误契约执行，本表保留「动作 ↔ 能力域」映射职责。

| BLE.*（API 规范章节） | 基准原型动作 | 现有 uniapp 对应（旧代码实证） |
|---|---|---|
| BLE.initialize / getBluetoothState（§3/§4） | P001 环境态 / P008 check | wx.openBluetoothAdapter / uni 对应 |
| BLE.getCapabilities（§3） | P001 支持判定 / W1 门禁 | 平台条件编译（现状） |
| BLE.scan / stopScan（§5） | p001-scan / p001-stop | wx.startBluetoothDevicesDiscovery |
| BLE.connect / disconnect / getConnectionState（§7） | p001-connect / p006-disconnect | wx.createBLEConnection |
| BLE.discoverServices / discoverCharacteristics（§8） | P006 服务树 | wx.getBLEDeviceServices/Characteristics |
| BLE.read / write / enableNotify / disableNotify（§9） | P006 读写监听 | wx 读/写/notify 三件套（写队列串行=F009） |
| BLE.getAdvertisement / startAdvertise（§10） | P008（F004 观察侧 / F014·F015 发射侧） | wx.createBLEPeripheralServer / LysBlePeripheral |
| BLE.getFirmwareVersion / startOTA（§11） | P006 OTA 弹层（F025 BLOCKED） | 接口位保留 |
| BLE.log / getLogs（§12） | F011 通信日志 + F026 脱敏 | 面板内日志（无文件流，候选不做） |
| BLE.registerProfile / matchProfile（§13） | F018 识别（STRONG/WEAK） | mock 层演示；08 阶段定型 |

补充（API §6 Device 统一模型 ↔ 本项目实体）：`{id, name, rssi, connected, advertisement}` 与内存态实体 ScannedDevice 对应（字段语义以 DATA_MODEL.md §1 及其引用的 REVERSE §2.4 为准）。

## 5. 错误码契约（两层并行，既定处置）

来源：API_UNIFIED_SPEC_v1.0.md §14；STATE_MODEL.md §2；ALIGNMENT_NOTES.md §5。

- **SDK 传输层（生态）**：BLE_001 蓝牙未开启 / BLE_002 权限不足 / BLE_003 扫描失败 / BLE_004 连接失败 / BLE_005 服务不存在 / BLE_006 写入失败 / BLE_007 Notify 失败 / BLE_008 OTA 失败。
- **产品业务层（现行契约）**：wifi_failed / pairing_expired / controlhub_unreachable / timeout / scan_failed / identity_failed / connection_lost / OTA_HASH_MISMATCH / diagnostic_connect_failed 等，语义与恢复动作以 PRD §7 与 STATE_MODEL §2 为准。
- **既定处置（ALIGNMENT_NOTES §5）**：两层并行——业务错误码不变，BLE_001～008 作为 SDK 层码引入并给出「平台原生错误 → BLE_00x → 用户文案」三级映射。产品侧错误恢复必须满足异常三要素（提示+下一步+恢复动作，BR-07）。

## 6. 枚举口径差（开发期待收口项 · 未决，不在本文裁决）

来源：ALIGNMENT_NOTES.md §4 末段（原文既定：「08 API_SPEC 统一为 BLE.\* 枚举并给出映射表」）。

| 维度 | 生态 BLE.* 枚举（API §4/§7） | 本项目基线口径 |
|---|---|---|
| 蓝牙状态 | unknown / poweredOff / poweredOn / unauthorized | bt: on / off / unsupported（PAGE_SPEC §1 导航栏三态） |
| 连接状态 | disconnected / connecting / connected / ready / error | F006 会话 **8 态**（STATE_MODEL §1 第 1 项；转移表以 04_architecture/STATE_MACHINE §1 为正典） |

处置：枚举统一映射为开发期既定待办（其产出属后续 API 契约文档），**在映射表定稿前，各实现以基线口径为准，不得单方面切换枚举**（依据：冲突裁决链——生态清单不反向改变现行 canon，11_ecosystem README 定位表）。**（v1.1，08-G1）方法与事件契约已由 [API_SPEC](API_SPEC.md) 定稿（SmartBleRuntimeApi + Platform Ports）；枚举映射表的最终收口随 API_SPEC 后续版本进行，定稿前本节「不切换」口径不变。**

## 7. 冻结校验

- ☑ 动作完整：P001–P010（除 P004）全部用户动作登记，与 PAGE_SPEC 各页按钮表逐条对应
- ☑ 无多：本表未含任何 PAGE_SPEC/PRD 未定义的动作（HTML 存在而 PRD 未定义的按钮属违例——开发实现同样适用）
- ☑ 无少：F001–F030 在册 29 功能（除 F023/F017/F030 无页面动作外）均可经本表动作触达；F017 无独立页面入口（P-04 关闭，PRD 变更记录）、F030 不做（P-05 关闭）
- ☑ OTA 全部动作（P06-01/P06-12）带 BLOCKED 标注（STATE_MODEL §1 第 6 项）
- ☑ 平台差异仅限 10_platform §4 差异表列出的差异点（扫码/分享/推广/日志导出/生命周期/权限模型/设备发现交互）
- ☑ **（v1.1）方法与事件契约引用切换到 API_SPEC（§0/§4/§6），本文保留页面动作映射职责；动作/功能/验收编号零改动**
