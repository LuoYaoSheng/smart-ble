# 小程序页面地图（Page Map）

> 源码：`apps/uniapp/pages/`（vue3 + pinia）｜生成日期：2026-08-28｜依据：main 分支当前代码逐页核对
> 用途：逐页罗列「页面上有什么 / 每个交互去哪里」，作为功能盘点与改造的事实底稿。

## 0. 全局结构

**tabBar（3 个）**：`设备` → pages/index/index ｜ `广播` → pages/broadcast/index ｜ `关于` → pages/about/index

**页面清单（pages.json 注册 8 页）**

| # | 路径 | 导航栏标题 | 页面性质 | 入口来源 |
|---|------|-----------|---------|---------|
| 1 | pages/index/index | 自绘导航「BLE Toolkit+」 | tab 首页·扫描 | 冷启动默认页 / tabBar / 多处 switchTab 回跳 |
| 2 | pages/hid/add | 配置 Smart HID | 配网向导（核心页） | 首页 SHID 卡片「Smart HID 配网」；hid/detail「重新配置」。参数 `deviceId` |
| 3 | pages/hid/detail | 设备详情 | Smart HID 历史设备详情 | **仅** hid/add 成功后「查看设备」(redirectTo)。无列表入口 |
| 4 | pages/hid/diagnostics | 诊断 | Smart HID 体检 | hid/add 恢复按钮「进入诊断」；hid/detail「运行诊断」。参数 `deviceId` |
| 5 | pages/device/detail | 设备详情 | 通用 BLE GATT 调试台 | 首页任意设备卡「连接」按钮。参数 `device=JSON` |
| 6 | pages/broadcast/index | BLE 广播 | tab·手机当外设广播 | tabBar |
| 7 | pages/about/index | 关于 | tab·应用信息 | tabBar / 分享 |
| 8 | pages/about/version | 版本记录 | 纯展示 | about「版本记录」 |

---

## 1. pages/index/index —— 首页·设备 tab（扫描）

**入口**：冷启动默认页；tabBar「设备」；hid/add「返回设备列表」(switchTab)；hid/detail「高级 BLE 调试」(switchTab)；好友分享卡片。

**页面内容（自上而下）**

1. 自绘导航栏：标题「BLE Toolkit+」+ 蓝牙状态灯（蓝牙就绪/蓝牙未开启）
2. 扫描卡：附近设备大数字计数、`扫描到 N 台 · 已连接 M 台`、**开始扫描/停止扫描**按钮（扫描中变红色■）、扫描失败红色横幅（错误码 + 消息 + 重试按钮）
3. pill 双 tab：`扫描设备` / `已连接`
4. 「筛选」开关联动面板：RSSI 滑杆（-100~0 dBm）、名称前缀输入框（占位提示「例如 SHID / Light / Test」）、隐藏无名设备开关
5. 附近设备列表：设备卡片 = BLE 头像 + 名称 + 识别标签 + deviceId + 信号四格条 + dBm + 描述行；**命中 Smart HID（UUID 强匹配或 SHID- 名称弱匹配）的卡片**额外有绿色「Smart HID」徽章 + 双按钮「连接」「Smart HID 配网」
6. 已连接 tab：设备卡片 + 「断开」mini 按钮 + 「连接稳定」chip
7. 空态占位（无扫描结果 / 无匹配设备两套文案）
8. 广播数据弹窗（点卡片本体触发，浮层不出页）

**交互与去向**

| 操作 | 行为/去向 |
|------|----------|
| 开始/停止扫描 | 本页逻辑：先 `scope.userLocation` 授权门 → 开蓝牙适配器 → 发现 5 秒自动停。⚠️ 授权失败则**扫描不启动且无横幅提示** |
| 点设备卡片本体 | 弹广播数据弹窗（本页浮层，可复制原始广播 hex/UUID/厂商数据） |
| 「连接」按钮（普通设备） | 先停扫描 → `navigateTo /pages/device/detail?device={设备JSON}` |
| 「连接」按钮（SHID 卡片上） | 同上，进通用调试台（注意：这是通用调试入口，不是配网） |
| 「Smart HID 配网」按钮（仅 SHID 卡片） | 停扫描 + 记住设备 → `navigateTo /pages/hid/add?deviceId=…` |
| 已连接卡「断开」 | 本页断开 BLE，不跳页 |
| 错误横幅「重试」 | 本页重新扫描 |
| 右上角分享 | 分享卡片 path=/pages/index/index |

---

## 2. pages/hid/add —— 配置 Smart HID（配网向导·核心页）

**入口**：仅 2 个 —— 首页 SHID 卡片「Smart HID 配网」；hid/detail「重新配置」。参数 `deviceId`。

**页面内容（按 stepper 三阶段）**

- 顶部 stepper：`连接 → 填写配置 → 查看状态`
- **connect 阶段**：目标设备卡（HID 图标/名称/deviceId）、「连接并确认设备中…」状态行、错误框、按钮「重新连接」「返回设备列表」
- **configure 阶段**：「设备已连接」徽章 + Device Info 摘要行（device_id · fw · state）、Wi-Fi 名称输入（≤32）、Wi-Fi 密码输入（≤64，可空）、ControlHub 地址输入（提示默认端口 17892）、**「扫描 ControlHub 配对码」大按钮**（未扫=「必需」/已扫=「已获取」）、隐私说明（凭据不落盘）、「下发配置」按钮
- **status 阶段**：四行进度（Wi-Fi 连接 → ControlHub 配对 → MQTT 连接 → 设备控制链路就绪，由设备 notify 驱动）、成功框「设备已就绪 ✓」或错误框 + 中文错误提示

**交互与去向**

| 操作 | 行为/去向 |
|------|----------|
| 「返回设备列表」 | `switchTab /pages/index/index` |
| 「扫描 ControlHub 配对码」 | `uni.scanCode` 拉起系统相机；识别 `shid://pair?token=&host=&port=` 后回填地址，**不出页**；扫别的码弹「无法识别配对码」；取消静默 |
| 「下发配置」 | 本页 BLE 分帧写入 + 等 60s 结果，进入 status 阶段 |
| 成功「查看设备」 | `redirectTo /pages/hid/detail?deviceId=…` |
| 恢复按钮（按错误码变化，四选一） | `进入诊断` → `navigateTo /pages/hid/diagnostics?deviceId=…`；`重新扫码` → 回 configure 并自动拉起相机；`修改配置` → 回 configure；`重新下发` → 再执行 provision |
| onUnload | 清密码、清 hubInfo、断开 BLE |

---

## 3. pages/hid/detail —— Smart HID 设备详情

**入口**：**只有** hid/add 成功后的「查看设备」（redirectTo）。⚠️ 没有任何列表页能到达这里。

**页面内容**

- hero 卡：设备名、deviceId chip、协议 chip
- 「设备资料」卡：Device ID / 固件版本 / 协议
- 「最近配置」卡：上次 Wi-Fi SSID / 上次 ControlHub 地址
- 按钮组：「重新配置」「运行诊断」「高级 BLE 调试」

**交互与去向**

| 操作 | 去向 |
|------|------|
| 「重新配置」 | `navigateTo /pages/hid/add?deviceId=…`（⚠️ 设备已配网时 READY 态不广播，BLE 连接必失败，页面无提示） |
| 「运行诊断」 | `navigateTo /pages/hid/diagnostics?deviceId=…` |
| 「高级 BLE 调试」 | `switchTab /pages/index/index` |
| 记录不存在 | showModal 后 `navigateBack` |

---

## 4. pages/hid/diagnostics —— 诊断

**入口**：hid/add 恢复按钮「进入诊断」；hid/detail「运行诊断」。参数 `deviceId`。

**页面内容**：五行体检表（BLE / Wi-Fi / ControlHub / 控制连接 MQTT / 设备 Ready 状态，各带 ✓/!/…/· 状态图标 + 明细）、「重新检测」按钮、「显示错误码」开关、最近错误详情卡（code + message）。

**交互与去向**

| 操作 | 行为 |
|------|------|
| 「重新检测」 | 本页读 Device Info + Provision Status 重算五行 |
| BLE 行=fail 时 | showModal「尝试重新连接？」→ 确认后本页重连再检测；失败弹「连接失败」 |
| onUnload | 自动断开 BLE 会话 |

---

## 5. pages/device/detail —— 通用 BLE 调试台（开发者工具页）

**入口**：首页任意设备卡「连接」按钮（含 SHID 卡片上的「连接」）。参数 `device=encodeURIComponent(JSON)`；参数缺失/非法 → showModal + `navigateBack`。

**页面内容**：设备头（名称+连接状态点+deviceId）；按钮行「清空日志 / 导出日志(复制剪贴板) / 连接设备-断开连接」；检测到 OTA 服务时显示「固件更新」按钮；服务/特征树面板（每个特征可读/写/notify 开关）；通信日志面板（时间戳+类型，自动滚动）；写入对话框；OTA 对话框。

**交互与去向**：全部本页（连接、自动重连 3 次、读写、notify、OTA 升级），**无出页跳转**。

---

## 6. pages/broadcast/index —— 「广播」tab

**入口**：tabBar。

**页面内容**：广播状态卡（LIVE/OFF）、平台说明卡（Android/iOS/微信小程序三套文案）、广播设置（设备名称、服务 UUID + 格式校验提示；Android 追加广播模式/发射功率等原生插件字段）、开始/停止广播按钮、「检查支持」按钮、日志区（可清空）。

**交互与去向**：全部本页（Android 走 LysBlePeripheral 原生插件 + 权限申请；微信端走 wxBLEServer）。无出页跳转。**与 Smart HID 配网无关**。

---

## 7. pages/about/index —— 「关于」tab

**入口**：tabBar / 分享卡片。

**页面内容**：logo + 应用名 + 版本号 + 简介 + 技术栈标签；「更多小程序」推广卡列表（config/product.js 配置，可跳其它小程序）；「当前环境」（平台/系统版本/设备型号）；功能特性 chips；支持平台 chips；「相关链接」菜单（官方网站 / 问题反馈 / 版本记录）；分享。

**交互与去向**

| 操作 | 去向 |
|------|------|
| 「版本记录」 | `navigateTo /pages/about/version` |
| 推广卡「打开」 | `uni.navigateToMiniProgram`（跳出本小程序到第三方） |
| 官方网站/问题反馈 | 微信端复制链接到剪贴板（无法内开网页） |
| 分享 | 分享菜单 / shareAppMessage |

---

## 8. pages/about/version —— 版本记录

**入口**：about「版本记录」。**纯展示**（版本变更日志列表），无交互、无出页跳转。

---

## 9. 页面内浮层（非独立页面）

| 浮层 | 所在页 | 触发 |
|------|--------|------|
| 广播数据弹窗 advertisement-dialog | 首页 | 点设备卡片本体 |
| 写入对话框 write-dialog | device/detail | 特征「写」 |
| OTA 对话框 ota-dialog | device/detail | 「固件更新」 |
| 各类 showModal（权限引导/无法识别配对码/连接失败等） | 多页 | 错误路径 |

## 10. 跳转关系图

```
                tabBar
        ┌─────────┼──────────┐
      设备 tab              广播 tab      关于 tab
   index/index          broadcast/index  about/index ──navigateTo──> about/version
        │                                    │
        │ 设备卡「连接」                        └─navigateToMiniProgram→(跳出)
        ▼
   device/detail（通用调试台，无出口）
        ▲
        │ SHID 卡「连接」
        │
   index/index ──SHID 卡「Smart HID 配网」──> hid/add（配网向导）
        ▲                                      │  ├─ redirectTo(成功) ──> hid/detail
        │                                      │  │      └─navigateTo「重新配置」──> hid/add
        └──switchTab「返回设备列表」<──────────┘  └─ navigateTo「进入诊断」──> hid/diagnostics
                                                                           ▲
                                              hid/detail「运行诊断」─────────┘
```

## 11. 导航视角的死角（与代码核对过的结论）

1. **hid/detail 只有一个入口**：配网成功那一次。knownDevices 最多存 20 台历史设备，但**没有任何列表页展示它们**——历史设备存了等于看不见。
2. **hid/detail「重新配置」是死路**：固件 READY 态关闭 BLE 广播（main.c），只有 Wi-Fi/MQTT 失联 5 分钟自动进 RECOVERY 才重新可见；固件无物理恢复触发（无按键逻辑），页面也不提示。
3. 首页 SHID 卡片同时给「连接」（进通用调试台）和「Smart HID 配网」两个按钮，对配网用户是干扰项。
4. `services/smart-hid/index.js` 的 `scanSmartHid()` 是死代码，无调用方。
5. tabBar「广播」是开发者工具功能，占据 1/3 导航位，与 Smart HID 产品定位无关。

---

## 12. 逐页审计：重复 / 丢失 / 死按钮（2026-08-28，与代码逐行核对）

> 「死按钮」分两档：**失灵**（点了没反应/无反馈）与**必败**（流程走得通但结果必然失败）。

### 12.1 首页 index/index

- **重复（同屏文字重复，用户实测指出）**：
  - 「附近设备」出现两遍：scan-summary 大数字旁的标签 + 列表区 section-title；空态文案里还有第三遍。
  - 「已连接」出现两遍：scan-secondary「已连接 M 台」+ pill tab「已连接」。
  - 列表头 caption「点开卡片查看广播原始数据…」与每张设备卡 meta 行「点击卡片查看广播原始数据」逐卡重复。
  - 两个计数含义不同无解释：大数字是**筛选后**数量，「扫描到 N 台」是**未筛选**数量，开筛选后两个数对不上。
- **丢失**：
  - knownDevices 历史设备（≤20 台，已持久化）没有任何列表入口——配网成功后用户在 UI 里再找不到自己的设备。
  - 扫描无进度反馈：5 秒扫描窗无倒计时、结束无提示、无「继续扫描」；用户分不清「扫完了」和「没有设备」。
  - 无「只看 Smart HID」开关：默认 `hideNoName=false`，真机一扫一大把匿名设备，SHID 卡片被淹没；名称前缀筛选要用户自己知道填 SHID。
  - 蓝牙状态灯失真：`onLoad(checkBluetoothState)` 在 `openAdapter` 之前用 `getBluetoothAdapterState` 查询（未初始化必失败→off），且只有 onLoad 查这一次、无 onShow 刷新——冷启动后永远显示「蓝牙未开启」，直到某次扫描成功。
- **死按钮（失灵·核心故障）**：
  - 「开始扫描」整条链路是死的：`toggle()` → `start()` → `requestBleScanPermission()` → `wx.authorize(scope.userLocation)` 直接 fail（manifest 声明了 requiredPrivateInfos 但《用户隐私保护指引》未配置对应项，授权连弹窗都不弹）→ showModal「去设置」→ `wx.openSetting` 里根本没有该项可开 → `resolve(false)` → `start()` 返回 `{ok:false}` 但 **toggle() 不消费返回值** → 点击无任何后果。真机上本页是全 App 唯一的扫描触发点，等于核心功能 100% 不可用。
  - scan-summary 的错误横幅 +「重试」按钮在权限拒绝场景永远不会出现（scanError 只由扫描控制器 onState 写入，权限路径根本不进控制器）——有 UI 但无法触发的部件。
- **状态脱节**：
  - 从 hid/add 返回后：扫描已停（onHide stop('page_hide')）但 scannedDevices 残留，界面看起来还在「有结果」状态，无任何「已停止」提示，也不自动续扫。
  - 「已连接 M 台」/「已连接」tab 只统计**通用调试台**的连接（connectedDevicesMap 只由 device/detail 写入）；配网向导和诊断页建立的 BLE 连接不计入——同一台设备两种连接方式在 UI 上待遇不同，配网中的设备永远不进「已连接」tab。

### 12.2 hid/add 配网向导

- **重复**：configure 阶段「设备已连接」徽章与 stepper 第 2 步高亮表达同一状态（轻微，可接受）。
- **丢失**：
  - 配对 token 无时效提示：一次性短期凭据，页面上没有有效期倒计时/过期预警，只能等 `pairing_expired` 失败后才知道。
  - 60 秒等待期无「取消」按钮：provisioning 中用户只能干等 `waitForProvisionResult` 超时。
  - 重新配置不回填：knownDevices 存了 `lastWifi`，但 initialize 不预填 Wi-Fi SSID——重配同一台设备要重新手输。
- **死按钮（必败）**：
  - 「重新连接」：从 hid/detail「重新配置」进入且设备 READY（BLE 广播已关）时，此按钮可点但永远失败，无前置判断或提示。
- **隐藏断点（适配器时序）**：hid/add 的连接路径 `smartHidService.connect` → `transport.connect` → `ble-runtime.connectDevice` → `createBLEConnection`，**全程无人调用 `openBluetoothAdapter`**——它假设「进配网前扫描已经开过适配器」。而扫描被权限门拦死时适配器从未打开，`createBLEConnection` 会直接报 errCode 10000（adapter not init），错误文案却是「连接失败，请靠近设备后重试」，完全误导。对比 device/detail 有自己的 `initBluetoothAdapter`（先 openAdapter 再 connect），两个详情页两套生命周期管理。

### 12.3 hid/detail

- **重复**：
  - 同页两遍身份信息：hero 卡的 deviceId chip + 协议 chip，下方「设备资料」卡再列一遍 Device ID + 协议。
  - pages.json 里 hid/detail 与 device/detail 导航栏标题都叫「设备详情」——两个完全不同的页面同名。
- **丢失**：
  - 无「删除设备」入口：store 有 `removeKnownDevice()` 但无任何 UI 调用，配错的设备永远留在记录里。
  - 快照无说明/无刷新：显示的是上次配网时的固件版本等，设备实际状态可能早已变化。
- **死按钮（必败/名不符实）**：
  - 「重新配置」：本页唯一进入场景是刚配网成功（READY）→ BLE 广播已关 → hid/add 连接必败。**对本页的目标用户 100% 失败**，且页面不提示原因。
  - 「运行诊断」：同样依赖 BLE 可连，READY 设备必然走到「连接失败」弹窗。
  - 「高级 BLE 调试」：实际只是 `switchTab` 回首页，不带设备参数、不打开任何调试界面——按钮承诺的功能不存在。

### 12.4 hid/diagnostics

- **重复**：五行体检项的 label 在两处各维护一份——页面 fallback 写「控制连接」，services `diagnose()` 写「控制连接 (MQTT)」，措辞已漂移，改一处漏一处。
- **丢失**：
  - 进入页面不自动检测：onLoad 只存 deviceId，五行全 pending，必须手点「重新检测」。
  - 无出口引导：没有「返回配置/查看设备」按钮，诊断完只能靠导航栏返回。
  - 「最近错误」是全局单例（hidStore.lastError），不区分设备——从 hid/detail 进入时展示的可能是另一台设备/另一次会话的旧错误。
- **死按钮（必败）**：「重新检测」对 READY 设备：需要 BLE session → connect 必败 → modal「尝试连接」→「连接失败」，永远产不出有效诊断。

### 12.5 device/detail 通用调试台

- **重复**：无实质重复（与首页「已连接」tab 的连接管理属合理分层）。
- **丢失**：无——读写/notify/OTA/日志导出/3 次重连齐全，是全 App 最完整的页面。
- **死按钮**：无。「固件更新」仅在设备带 OTA 服务时渲染（SHID 固件无 OTA 服务，对 Smart HID 永不显示，属正确行为）。

### 12.6 broadcast/index

- **重复**：同页状态两遍——顶部 status-card（正在广播/未广播 + 副标题）与底部 broadcast-status-bar（广播中/已停止 + 提示）显示完全相同的信息。
- **丢失**：无（Android 原生插件权限流、微信 wxBLEServer + 超长降级重试都齐）。产品层面此 tab 与 Smart HID 无关（见 §11.5）。
- **死按钮**：无。Android 专属 picker/switch 在微信端不渲染是平台裁剪，不是死按钮。

### 12.7 about/index

- **重复**：无。
- **丢失**：功能特性 chips 仍是纯 BLE 工具的 6 项（扫描/过滤/连接/读写/通知/广播），**Smart HID 配网这个当前主打能力在关于页完全没出现**；简介/官网/反馈也都是通用工具的，无 Smart HID 入口。
- **死按钮**：无——官网/反馈在微信端按合规降级为复制链接（有意设计）；「更多小程序」两张卡 appId 已配置、可跳转。

### 12.8 about/version

- **重复**：无。
- **丢失**：版本记录停在 v1.0.4（2024-04-29）——Smart HID 配网向导、Profile 匹配、诊断页等后来加的能力全部没有条目（versionFallback 同为 1.0.4）。
- **遗留**：分享标题「智能蓝牙助手」与全局品牌「BLE Toolkit+」不一致（首页分享用的是后者），真机分享卡片会显示旧名字。

### 12.9 全局死代码链（store/hid.js + services/smart-hid）

| 成员 | 状态 |
|------|------|
| `smartHidService.scanSmartHid()` | 无任何调用方（配网走通用扫描 + profile 匹配） |
| store `setSmartDevices()` | 唯一调用方是 scanSmartHid()，随之而死 |
| store `smartDevices` | 唯一读取处是配网 initialize() 的回退查找，但永远为空数组 → 该分支永不命中 |
| store `hasConfiguredDevice` | getter 无读取方 |
| store `removeKnownDevice()` | 无调用方（对应 12.3 丢失的「删除设备」UI） |

### 12.10 审计结论

**必败类死按钮全部指向同一根因**：固件 READY 态关 BLE 广播（main.c:219）+ 无物理恢复触发 → hid/detail 的「重新配置」「运行诊断」、diagnostics 的「重新检测」、hid/add 的「重新连接」这 4 个按钮对刚配好的设备必然失败，且 UI 无任何前置提示。要修需要**两端配合**：固件给恢复入口（按键或指令），UI 在设备 READY 时给出明确引导而不是让用户点必败按钮。

---

## 13. 深度审计补充：运行链路与整体逻辑（2026-08-28 第二轮）

> 上一节是结构层盘点；本节把扫描→配网→诊断的运行链路逐环走通后发现的系统性问题。

### 13.1 单点故障：权限门使全 App 核心功能不可用

全 App 只有一个活的扫描触发点（首页「开始扫描」→ `store.startScan`；`scanSmartHid()` 是死代码）。这个唯一触发点被 `requestBleScanPermission()` 前置拦截：

```
toggle() → start() → requestBleScanPermission()
  → wx.authorize(scope.userLocation) 直接 fail
     （manifest 声明 requiredPrivateInfos 定位接口，但代码从未调用定位 API，
      隐私指引未配置 → 隐私管控直接拒绝，连授权弹窗都不弹）
  → showModal「去设置」→ wx.openSetting 小程序设置页里没有该项 → 死胡同
  → resolve(false) → start() 返回 {ok:false} → toggle() 丢弃返回值 → 无反馈
```

后果链：扫描不可用 → 适配器永不打开 → 设备发现/Profile 匹配/配网向导/诊断全部不可达。**真机上整个产品的主流程 100% 走不通**，且每个环节的报错文案都在误导（「请靠近设备」「蓝牙未开启」）。

关键事实：微信早已不要求小程序蓝牙扫描申请 `scope.userLocation`（Android 只需系统层面给微信 App 定位权限，由微信自行引导）。这道门申请的是一个**不再需要**的权限——删掉门 + 删掉 manifest 的 requiredPrivateInfos 才是正解。

### 13.2 适配器生命周期假设错误

`hid/add`（经 transport→runtime）与 `diagnostics` 的连接路径都**不自己打开蓝牙适配器**，隐含假设「扫描先跑过」。`device/detail` 却自带 `initBluetoothAdapter`。三条连接路径两种假设 → 一旦入口状态不满足，报错是 10000 底层错误配一条无关文案。适配器打开应当收敛到 runtime 层统一保证（connect 前幂等 open）。

### 13.3 配网成功的瞬间，设备从 App 里"消失"

按当前实现，配网成功那一刻起：

1. 固件进 READY → BLE 广播关闭 → 扫描列表里**永远不再出现**这台设备；
2. 「查看设备」→ redirectTo hid/detail → add 页 onUnload 断开 BLE → 「已连接」tab 也没有它（配网连接本就不计入 connectedDevicesMap）；
3. 唯一痕迹是 knownDevices 存储——而它没有任何列表页展示。

用户视角：**配完网设备就"丢了"**，只剩一个一次性到达的详情页。产品闭环里"配网后管理"这一段在 V1 实际不存在，但 UI 用「重新配置」「运行诊断」等按钮假装它存在（§12.3 的必败按钮）。

### 13.4 状态同步缺失（多处）

| 状态 | 问题 |
|------|------|
| 蓝牙开关 | 只在 onLoad 查一次、且查在 openAdapter 之前 → 永远「未开启」；无 onShow 刷新 |
| 扫描中 | 停止后 scannedDevices 残留、无「已停止/已完成」提示、返回页面不续扫 |
| 已连接数 | 只算通用调试连接；配网/诊断连接不计入，同一设备两种待遇 |
| 诊断错误 | hidStore.lastError 全局单例，不分设备，可展示别的会话的旧错误 |

### 13.5 其他系统性风险

- **tab 适配器模式互踩**：广播 tab 以 `mode:'peripheral'` 重开适配器，设备页以默认 central 模式开，来回切 tab 反复重初始化（未实测，标注为风险）。
- **UI/固件能力矩阵不对齐**：UI 提供「重配/诊断」，固件 READY 态不提供可达性；固件有 RECOVERY 态，UI 不告知如何进入（断 Wi-Fi 5 分钟）。两端各说各话。
- **品牌信息落后**：版本记录/分享名/特性清单停留在通用 BLE 工具时代（§12.7/12.8）。

### 13.6 修复优先级（按"能不能用"排序）

1. **P0-A 删权限门**：`use-ble-scan.js` 移除 `requestBleScanPermission` 前置拦截（改为直接扫描，失败走 scanError 横幅）。
2. **P0-B 清 manifest**：删掉 `requiredPrivateInfos` 与 `permission.scope.userLocation`（代码从未用定位 API，声明反而触发隐私管控）。
3. **P0-C 适配器收敛**：ble-runtime `connectDevice` 前幂等 `openAdapter`（或 hid/add 连接前先 open）。
4. **P0-D 状态灯**：openAdapter 之后再查状态 + onShow 刷新。
5. **P1 文案去重**：「附近设备」×2、「已连接」×2、caption 逐卡重复。
6. **P1 扫描体验**：倒计时/完成提示/续扫；「只看 Smart HID」开关。
7. **P1 设备管理闭环**：knownDevices 列表入口 + READY 设备的重配引导（配合固件恢复入口）。
