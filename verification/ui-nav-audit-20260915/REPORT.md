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

### N1（Android·活代码）二级页 AppSubnav 标题三处漂移 ✅已修复（2026-09-15）
对照契约 A2 标题正典（uniapp/Flutter/iOS/macOS 四端一致）：
| 页 | Android 现值 | 正典 |
|---|---|---|
| P002 配网 | Smart HID 配网 | **配置 Smart HID** |
| P003 HID 详情 | Smart HID 设备 | **Smart HID 设备详情** |
| P005 诊断 | Smart HID 诊断 | **SHID 诊断** |

P006「GATT 调试」、P010「版本记录」✓。位置：`ProvisioningScreen.kt:88` / `HidDeviceDetailScreen.kt:64` / `HidDiagnosticsScreen.kt:78`。修复=3 行字符串，非写锁区，Mac 可改。**→ 已按正典改正，见「七、修复记录」。**

### N2（Android·死代码）DeviceListScreen 整条 legacy 导航路径无人调用 ✅已修复（2026-09-15）
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

建议：契约删除 MP-WEIXIN 条目（或在退役正典中标注「历史」）、组件删空元素。**→ 已清理，见「七、修复记录」。**

### N7（备注级）Electron P009 about-navbar/about-kicker 独立类名
`styles.css:36-45`：类名与 `.navbar/.kicker` 不同但字型/字距/色值等价（10px/+2px/primary；padding 8/2/12 属 P009 文档式页内布局）。不算漂移，仅命名不统一。

## 四、修复归属建议

| 项 | 归属 | 动作 |
|---|---|---|
| N1 Android 三标题 | Mac 可改 | 3 行字符串 + 既有单测复验。**✅已修复** |
| N2 Android 死代码 | Mac 可改 | 删 DeviceListScreen/BluetoothStateIndicator + 编译+单测复验。**✅已修复** |
| N3 Electron 状态词 | WIN 写锁区 | 登记 WIN 项（unauthorized 词、补平台不支持态；Tauri 补未开启态）。**→ 已登记 WIN-011**；**→ 2026-09-20 Windows 双壳已修（commit 见 WIN-011 回填；Windows 截图=verification/windows-plan-v1/20260920-WIN-011/；macOS 侧无此缺陷源）** |
| N4 广播 Tab 口径 | 用户裁决 + WIN | 先裁「按能力显隐 vs 恒显+徽章」，再改双壳。**→ 已登记 WIN-011（含两案），待裁决** |
| N5 Apple 返回键 | Mac 可改（视觉裁决） | iOS 32→30 / macOS 34→30 需过视觉 Gate；或修契约把 30 改为「30±2 平台适配带」。**待用户裁决** |
| N6 契约残留 | Mac 可改 | 契约删 MP-WEIXIN 条 + 组件删空元素。**✅已修复** |

## 五、本轮命令与证据

- 定位/核对：`grep`/`sed` 全量读取七端导航实现（uniapp pages.json+components/ui、Flutter lib/ui/design、Android ui/design+MainActivity+screens、iOS Sources/Design+Views、macOS Sources/UI、electron/tauri public+src）
- 镜像核验：`diff electron/public/index.html tauri/src/index.html`（仅 4 行差异=视图初始 display）；`diff app.js`（2420/2506 行各自独立宿主实现，非镜像契约文件）

## 六、运行时逐页 UI 查验（2026-09-15 上午，模拟器/本机实拍）

### 通道
| 端 | 载体 | 驱动方式 |
|---|---|---|
| uniapp H5 | `uni dev -p h5`（localhost:5173） | `scripts/ui/uniapp-h5-mock-sweep.mjs`（mock 桥）→ 49/49 态截图（verification/windows-mobile-v1/20260915-nav-audit/） |
| iOS | iPhone 17 Pro Max 模拟器（iOS 26.1） | `--ui-preview=<scenario>` 启动参数（NativePreviewHarness 全九页摆态）+ `simctl io screenshot` |
| Android | Pixel_9_Pro 模拟器 | APK 安装+BLE 权限预授 + `input tap`（uiautomator dump 定位）+ `screencap` |
| macOS 原生 | SmartBLE-mac debug 二进制 | `--snap-pages`（PageSmoke 自带全页快照） |
| Electron | dist/mac-arm64 发布包 + `--remote-debugging-port=9222` | 页面级 CDP（原生 WebSocket：Runtime.evaluate + Page.captureScreenshot） |
| Tauri | src-tauri release bundle | Quartz CGEvent 点击/滚动 + `screencapture -l`（analyze_image 定位行坐标） |
| Flutter | build/macos Release 包 | 同 Tauri 通道 |

### 覆盖矩阵（本目录 shots/）
| 端 | P001 | P002 | P003 | P005 | P006 | P007 | P008 | P009 | P010 |
|---|---|---|---|---|---|---|---|---|---|
| H5 | 8 态 | 9 态 | 7 态 | ✓ | ✓ | ✓ | 6 态 | ✓ | ✓ |
| iOS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Android | ✓ | — | — | — | — | ✓ | ✓ | ✓ | ✓ |
| macOS 原生 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Electron | ✓ | — | — | — | — | ✓ | ✓* | ✓ | ✓ |
| Tauri | ✓ | — | — | — | — | ✓ | ✓ | ✓ | ✓ |
| Flutter | ✓ | — | — | — | — | ✓ | ✓ | ✓ | ✗† |

\* Electron P008 经 CDP 强制切视图拍摄（Tab 本体隐藏，见 N4）。
† Flutter P010：三次 CGEvent 点击「版本记录」行均未触发导航（Flutter macOS 对合成点击的手势识别差异；Tab 点击正常）。页面已由静态核对覆盖（`versions_page.dart:67 AppSubnav(title:'版本记录')` ✓）。
Android 二级页（P002/P003/P005/P006）运行时需真实扫描到 SHID 设备方可导航，模拟器无 BLE 数据源——以静态核对 + 九页可达性测试（MAC-005）覆盖。

### P001 首页七端运行时验核（全部 PASS）
| 端 | kicker | 标题 | bt-chip | Tab 栏 |
|---|---|---|---|---|
| H5 | BLE TOOLKIT+ ✓ | 扫描 ✓ | 绿点·蓝牙就绪 ✓ | 四 Tab·扫描高亮 ✓ |
| iOS | ✓ | ✓ | 绿点·蓝牙就绪 ✓ | 四 Tab·已连接红角标 3 ✓ |
| Android | ✓ | ✓ | 灰点·初始化中… ✓（VM 首帧瞬态=正典四态词） | 四 Tab ✓ |
| macOS 原生 | ✓ | ✓ | 绿点·蓝牙就绪 ✓ | 四 Tab ✓（实拍含 SHID 卡） |
| Electron | ✓ | ✓ | 灰/红点·平台不支持类 ✓（与 N3 词汇记录一致） | **仅三 Tab（广播缺失）→ N4 运行时实锤** |
| Tauri | ✓ | ✓ | 灰点·平台不支持 ✓（updateStatus error 分支正典词） | 四 Tab 恒显 ✓（与 Electron 相反） |
| Flutter | ✓ | ✓ | 红点·蓝牙未开启 ✓ | 四 Tab ✓ |

### 运行时新增观察
- **N4 双重实锤**：Electron Tab 栏运行时仅 扫描/已连接/关于（`broadcastTab` computed display:none，仅 linux 显示）；Tauri/macOS 同机恒显四 Tab。
- **Tauri/Flutter 关于页版本 chip 显示 `v1.0.5-dev.unknown`**：本地 Release bundle 未跑正式 metadata 管线时的 fallback 表现（Electron 同构页面一致）；发布管线（候选产物模式）会注入真实值——观察项，非缺陷。
- **iOS 预览通道资产**：NativePreviewHarness 19 情景全页摆态可复用为后续视觉回归基线。
- Electron/Tauri P009 菜单四行一致（官方网站/问题反馈/版本记录/分享应用）；P010 需滚动后进（长页布局，非缺陷）。

### 本节结论
首页与导航栏在运行时层面与静态审计结论一致：**七端骨架全对齐；唯桌面 Electron 广播 Tab 缺失（N4）与 Electron 状态词（N3）为运行时可复现差异；Apple 返回键几何（N5）属静态量测差异，运行时视觉不可辨。**

## 七、修复记录（2026-09-15 10:40，用户放行「该修改修改掉」后执行）

### 已修复：N1 + N2 + N6（Mac 侧，随本报告同一提交）

| 项 | 文件 | 改动 |
|---|---|---|
| N1 | `apps/android/.../ProvisioningScreen.kt:88` | 标题「Smart HID 配网」→「配置 Smart HID」 |
| N1 | `apps/android/.../HidDeviceDetailScreen.kt:64` | 标题「Smart HID 设备」→「Smart HID 设备详情」 |
| N1 | `apps/android/.../HidDiagnosticsScreen.kt:78` | 标题「Smart HID 诊断」→「SHID 诊断」 |
| N2 | `apps/android/.../DeviceListScreen.kt` | 删 `DeviceListScreen`（legacy Scaffold+TopAppBar 路径）与 `BluetoothStateIndicator`（非正典图标指示器+五状态词）两函数；连带删孤儿 import `Scaffold`/`TopAppBar`/`BluetoothState`/`theme.Success`。删前复扫：全仓（含测试集）零外部引用；`MainActivity` 实际 import 的是 `DeviceListContent`（活代码，保留） |
| N6 | `docs/specs/07_design_system/COMPONENT_CONTRACT.md` | A1 删 MP-WEIXIN 状态栏占位+胶囊避让规则（保留 APP webview 事实并注明移除缘由）；A2 props 删「MP-WEIXIN 同 A1」 |
| N6 | `apps/uniapp/components/ui/AppNavbar.vue:3` / `AppSubnav.vue:3` | 删空 `<view class="status-bar">`（删前全仓 grep 确认零样式/逻辑引用） |

**复验**：
- Android：`:app:compileDebugKotlin` + `:app:testDebugUnitTest` → `BUILD SUCCESSFUL`，单测 **76/76 通过 0 失败**（报告三节原记 75 为上轮计数，本轮结果文件 10:38 新鲜生成）；
- uniapp：`npm run build:h5` → `DONE Build complete.`（EXIT=0）。

### 已登记：N3 + N4 → Windows 计划 WIN-011（写锁区，Mac 不动代码）

- N3（状态词）：Electron `app.js` stateMap `unauthorized→未授权` 改「蓝牙未开启」、fallback「状态未知」改「初始化中…」、补「平台不支持」态；Tauri 补「蓝牙未开启」红点态；
- N4（广播 Tab）：两案待用户裁决——A 按能力显隐（Electron 现状）/ B 恒显四 Tab+「未就绪」徽章（正典 A3 与 Tauri/macOS 现状）。

### 仍待用户裁决：N5（Apple 返回键 30 vs 32/34，改码需过视觉 Gate 或改契约立「30±2 适配带」）

