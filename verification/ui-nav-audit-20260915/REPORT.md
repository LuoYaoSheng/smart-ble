# 各框架首页·导航栏排查报告（2026-09-15）

> 范围：七端首页（P001 扫描页）+ 导航栏（A1 AppNavbar / A2 AppSubnav / A3 AppTabBar）
> 对照正典：`docs/specs/07_design_system/COMPONENT_CONTRACT.md`（A1/A2/A3）+ `TOKEN.md`（fs-title 20/800、fs-h1 17/700、fs-mini 11/600、fs-micro 10/800+2px）
> 方法：静态逐项核对（kicker/标题逐字、几何数值、状态词映射、TabBar 结构与可见性）。页面主体（扫描工具条/设备卡等）沿用此前 UI-CONV/parity 轮结论，本轮聚焦导航层。

## 一、总体结论

**七端首页导航骨架高度一致**：P001 kicker「BLE TOOLKIT+」+ 标题「扫描」+ bt-chip（8px 点 + 11/600 状态词）、四 Tab 底栏（扫描/已连接/广播/关于、h64、已连接 danger 角标 min99+）、各页 kicker（P007 SESSIONS / P008 PERIPHERAL / P009 ABOUT）在 uniapp / Flutter / Android / iOS / macOS 原生 / Electron / Tauri 全部逐字对齐；AppNavbar 几何（8/18/12 内边距、白→冰蓝渐变、lineSoft 底边、sticky、on 点微光）全端一致。

发现 **7 项问题**（无 P0）：Android 活代码标题漂移 ×3、Android 死代码导航残留 ×1、桌面壳状态词/Tab 可见性漂移 ×2、Apple 端返回键几何偏差 ×1、微信时代契约残留 ×1。

## 二、P001 + 导航栏对照矩阵

| 核对项 | 正典 | uniapp | Flutter | Android | iOS | macOS原生 | Electron | Tauri |
|---|---|---|---|---|---|---|---|---|
| P001 kicker | BLE TOOLKIT+ | ✓ | ✓(默认) | ✓(默认) | ✓ | ✓ | ✓ | ✓ |
| P001 标题 | 扫描 | ✓ | ✓ | ✓(MainActivity) | ✓ | ✓ | ✓ | ✓ |
| P007/P008/P009 kicker | SESSIONS/PERIPHERAL/ABOUT | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| navbar 内边距 | 8/18/12 | ✓(16/36/24rpx) | ✓LTRB | ✓18/8/18/12dp+statusBarsPadding | ✓h18 t8 b12 | ✓ | ✓(8px/18px/12px) | ✓(共用 CSS) |
| kicker 字型 | 10/800/+2px | ✓ | ✓ | ✓10sp+W800+2sp | ✓10 heavy tracking2 | ✓ | ✓ | ✓ |
| 标题字型 | 20/800 | ✓ | ✓ | ✓20sp W800 | ✓20 heavy | ✓ | ✓ | ✓ |
| bt 点 | 8px on=success+微光/off=danger/其余灰 | ✓ | ✓ | ✓ | ✓ | ✓(cornerRadius4) | ✓ | ✓ |
| 四 Tab | 扫描/已连接/广播/关于 | ✓原生tabBar | ✓ | ✓ | ✓ | ✓ | ✓(广播条件显隐⚠) | ✓ |
| TabBar 高/角标 | h64 / danger min99+ | ✓128rpx | ✓ | ✓ | ✓ | ✓64 | ✓ | ✓ |
| 返回键 | 30×30 圆角9 | ✓60rpx | ✓ | ✓ | **32×32⚠** | **34⚠** | ✓30px | ✓(共用 CSS) |
| Subnav 标题 | A2 五标题正典 | ✓×5 | ✓×5 | **✗×3⚠** | ✓×5 | ✓×5 | ✓ | ✓ |

## 三、问题清单

### N1（Android·活代码）二级页 AppSubnav 标题三处漂移
对照契约 A2 标题正典（uniapp/Flutter/iOS/macOS 四端一致）：
| 页 | Android 现值 | 正典 |
|---|---|---|
| P002 配网 | Smart HID 配网 | **配置 Smart HID** |
| P003 HID 详情 | Smart HID 设备 | **Smart HID 设备详情** |
| P005 诊断 | Smart HID 诊断 | **SHID 诊断** |

P006「GATT 调试」、P010「版本记录」✓。位置：`ProvisioningScreen.kt:88` / `HidDeviceDetailScreen.kt:64` / `HidDiagnosticsScreen.kt:78`。修复=3 行字符串，非写锁区，Mac 可改。

### N2（Android·死代码）DeviceListScreen 整条 legacy 导航路径无人调用
`DeviceListScreen.kt:89-108`：Scaffold+Material TopAppBar（标题「BLE Toolkit+」当页面标题、`BluetoothStateIndicator` 图标式指示器 + 另一套状态词「蓝牙已开启/已关闭/不可用/未授权/状态未知」）。全仓 grep 零调用方（MainActivity 实际走 `DeviceListContent` + 正典 AppNavbar）。死代码携带非正典导航实现与状态词，有误用风险，建议删除 DeviceListScreen 与 BluetoothStateIndicator（及其未使用 import）。

### N3（Electron）bt-chip 状态词漂移
`app.js:927-939` stateMap：`unauthorized → 「未授权」`；正典=「蓝牙未开启」（iOS/Android 均如此，且 `MainActivity.kt:147` 注释「Unauthorized 同未开启（对齐桌面壳）」与 Electron 实现直接矛盾）；fallback「状态未知」非正典词；无「平台不支持」态。Tauri 侧（`app.js:506-520`）是正典三态（就绪/平台不支持/初始化中…）但缺「蓝牙未开启」红点态（poweredOff 归入平台不支持分支）。归属：Windows 写锁区 → 登记 WIN 协调。

### N4（桌面三端）broadcastTab 初始可见性互相矛盾
- Electron：默认 `display:none`，仅 `platform==='linux'` 显示（`app.js:874-877`，注释：bleno 仅 Linux 支持广播）；
- Tauri：默认恒显（index.html 无 hidden，无 broadcastTab 引用逻辑）；
- macOS 原生：四 Tab 恒显（MainWindowController）。

同一 macOS 上 Electron 隐藏广播 Tab、Tauri/macOS 原生显示。Electron/Tauri 属 Windows 写锁区 → 登记 WIN 协调；需先裁决口径（按能力显隐 vs 恒显+「未就绪」徽章）。

### N5（Apple 端）返回键几何 2-4px 偏差
契约 A2=30×30 圆角 9。uniapp(60rpx)/Flutter(30)/Android(30)/Electron(30px) 全对；**iOS NativeBackButton=32×32**（`NativeComponents.swift:149`，端内自称统一规格但与契约不符）；**macOS subnav=34 宽**（`Common.swift:98`，复用 DSButton soft small 而非专用 back 键样式）。附带小项：iOS subnav 垂直内边距 9/9 vs 正典 8/10；TabBar 白底透明度 iOS 0.98 / macOS 0.96 / Electron 不透明。Mac 可改，但属视觉裁决（改小是否伤命中区需 Gate 复验）。

### N6（契约+uniapp 组件）微信时代残留
微信目标 2026-09-11 已退役，但：
- `COMPONENT_CONTRACT.md` A1/A2 仍保留 2 处 MP-WEIXIN 平台规则（状态栏占位+胶囊避让）——代码中已无对应实现，文档与实现脱钩；
- `AppNavbar.vue:3` / `AppSubnav.vue:3` 的 `<view class="status-bar">` 空元素为占位残留（无高度、无样式、无 #ifdef）。

建议：契约删除 MP-WEIXIN 条目（或在退役正典中标注「历史」）、组件删空元素。

### N7（备注级）Electron P009 about-navbar/about-kicker 独立类名
`styles.css:36-45`：类名与 `.navbar/.kicker` 不同但字型/字距/色值等价（10px/+2px/primary；padding 8/2/12 属 P009 文档式页内布局）。不算漂移，仅命名不统一。

## 四、修复归属建议

| 项 | 归属 | 动作 |
|---|---|---|
| N1 Android 三标题 | Mac 可改 | 3 行字符串 + 既有单测复验 |
| N2 Android 死代码 | Mac 可改 | 删 DeviceListScreen/BluetoothStateIndicator + 编译+75 单测复验 |
| N3 Electron 状态词 | WIN 写锁区 | 登记 WIN 项（unauthorized 词、补平台不支持态；Tauri 补未开启态） |
| N4 广播 Tab 口径 | 用户裁决 + WIN | 先裁「按能力显隐 vs 恒显+徽章」，再改双壳 |
| N5 Apple 返回键 | Mac 可改（视觉裁决） | iOS 32→30 / macOS 34→30 需过视觉 Gate；或修契约把 30 改为「30±2 平台适配带」 |
| N6 契约残留 | Mac 可改 | 契约删 MP-WEIXIN 条 + 组件删空元素 |

## 五、本轮命令与证据

- 定位/核对：`grep`/`sed` 全量读取七端导航实现（uniapp pages.json+components/ui、Flutter lib/ui/design、Android ui/design+MainActivity+screens、iOS Sources/Design+Views、macOS Sources/UI、electron/tauri public+src）
- 镜像核验：`diff electron/public/index.html tauri/src/index.html`（仅 4 行差异=视图初始 display）；`diff app.js`（2420/2506 行各自独立宿主实现，非镜像契约文件）
- 结论基于静态证据；未做运行时截图（可按需补 H5/模拟器视觉帧）
