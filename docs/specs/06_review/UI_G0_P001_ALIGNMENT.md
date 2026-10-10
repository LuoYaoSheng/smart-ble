# UI_G0_P001_ALIGNMENT —— P001 三端视觉对齐差异表（UI-PARITY-G0）

> 2026-09-09 · 任务 UI-PARITY-G0 第五阶段产出。
> 基准：[`prototype/v1-new/pages/p001-scan.js`](../prototype/v1-new/pages/p001-scan.js)（F001-F005）。
> 三端：**U-WX** = uniapp 微信（mp-weixin）· **U-AND** = uniapp Android（同仓 `apps/uniapp`，rpx 自适应）· **F-AND** = Flutter Android（`apps/flutter`）。
> 方法：VISUAL_CONTRACT §3（结构比对 + 样式取值比对 + 文案逐字 + 图标位 + 六态覆盖静态档）。
> 门禁：`scripts/check-icon-usage.mjs` PASS · `scripts/check-token-usage.mjs` PASS · `flutter analyze` 0 问题 · `flutter test` 69/69 · `npm run build:mp-weixin` DONE。

---

## 1. 检查清单差异表

| # | 检查项 | 原型 p001 | U-WX | U-AND | F-AND | 状态 |
|---|---|---|---|---|---|---|
| 1 | **Navbar** | `.navbar`：kicker「BLE TOOLKIT+」(10/w800/+2px 字距/品牌蓝) + 标题「扫描」(20/w800) + bt-chip（8px 圆点+三态词 11/w500） | `components/ui/AppNavbar.vue`（正典组件，token 全引用） | 同 U-WX（rpx 自适应） | `lib/ui/design/app_navbar.dart` AppNavbar（本次改挂） | ✅ 一致 |
| 2 | bt-chip 三态 | 就绪=success 点+微光 / 未开启=danger 点 / 平台不支持=ph 点；词：蓝牙就绪/蓝牙未开启/平台不支持 | `bleStatusText/Tone` 三态映射（index.vue） | 同 U-WX | `btStatusWord/btStatusTone`（widget_test 断言词表） | ✅ 一致 |
| 3 | **扫描按钮** | btn primary(`scan`「开始扫描」) ⇄ danger(`stop`「停止扫描」)；左标签三态（扫描中·5s 会话+live 脉冲点 / 扫描完成·发现 N 台 / 待开始扫描） | scan-summary（ble-btn 别名层→正典 token） | 同 U-WX | `_buildScanTool` + `design/app_button.dart` AppButton（本次改挂） | ✅ 一致 |
| 4 | **筛选** | `.filter` 四行：RSSI 预设×4（强[-40]/较好[-60]/一般[-70]/弱[-85]，激活 primary 实底白字）+ 滑杆(-100..-40 step5) + 名称前缀输入 + 隐藏无名开关(success) + 重置过滤(soft sm)；实时生效 | `components/filter-panel/filter-panel.vue`（hex→var 已收敛） | 同 U-WX | `widgets/filter_panel.dart`（存量实现，正典四档；widget_test 断言展开/收起） | ✅ 一致（F-AND 为存量实现，规格并入 COMPONENT_CONTRACT C3） |
| 5 | **DeviceCard** | `.dev` scan 变体：44 头像(primary-weak→#DCE9FF 渐变/SHID #D9F6F0→#E2F8F4) + 名称(15/w700) + mono id(10, ellipsis) + meta(sig+dBm) + 动作区 | `components/ui/DeviceCard.vue`（本次改挂；token 全引用） | 同 U-WX | `widgets/device_card.dart`（存量实现=同一规格；`lib/ui/design/device_card.dart` 正典实现已建立，待后续页面迁移统一） | ✅ 一致 |
| 6 | **Profile Badge** | STRONG→chip「Smart HID · 强匹配」primary / WEAK→「疑似 Smart HID · 弱匹配」warning | AppChip（ui/DeviceCard 内） | 同 U-WX | `_MatchChip`（存量）/AppChip（正典）同规格 | ✅ 一致 |
| 7 | **Smart HID 双入口** | SHID 卡：`配置 Smart HID`(primary sm, icon `hid`, disabled=已连接) + `连接/已连接`(SHID 或已连接→soft，否则 primary, icon `link`)；标准卡仅连接 | ui/DeviceCard 双入口（profileActionLabel/Chip 覆盖字段兼容） | 同 U-WX | DeviceCard `shidConfigureBtn`(ValueKey)+连接键 | ✅ 一致（双入口保留：特殊设备=标准设备扩展，产品模型 §0） |
| 8 | **RSSI** | 四格信号条（≥-60 四/≥-70 三/≥-80 二/其余一；success/warning×2/danger；空格 line）+ dBm(mono) | ui/DeviceCard `.sig q1-q4` | 同 U-WX | SignalBars（同分档同色） | ✅ 一致 |
| 9 | **Empty 双空态** | 未扫描：ill `radar`+「还没有扫描结果」+「点上方按钮开始扫描附近 BLE 设备」+ soft「开始扫描」；筛选无匹配：ill `link`+「当前没有匹配设备」+「调整筛选条件试试」（无 action） | `ui/AppEmpty.vue`（本次改挂） | 同 U-WX | `design/app_empty.dart` AppEmpty（本次改挂） | ✅ 一致 |
| 10 | **Error** | `.ebanner`：danger-weak 底+左 3px danger 条+「扫描失败」+code mono 胶囊+消息+重试(ghost sm danger-t `refresh`) | error-banner 组件（hex→var 收敛） | 同 U-WX | 页内 `_buildErrorBanner`（token 化；未列 13 正典组件，按页内装配登记） | ✅ 一致 |
| 11 | **Icon** | sprite `i-*`（35 枚） | AppIcon（ui/，semantic id + tone） | 同 U-WX | AppIcon（core/design 镜像，入口 ui/design/app_icon.dart） | ✅ 一致（镜像同步由 check-icon-usage 校验） |

## 2. 平台例外（VISUAL_CONTRACT §2 白名单）

| 项 | U-WX | U-AND | F-AND |
|---|---|---|---|
| TabBar | `pages.json` 原生 tabBar（png 资产对，ICON_CATALOG §6） | 同 U-WX（APP 端如自绘走 `ui/AppTabBar.vue`） | BottomNavigationBar（`design/app_tab_bar.dart` 契约封装） |
| 图标渲染 | SVG data-URI（mp-weixin 无内联 svg） | 同 U-WX | flutter_svg |
| 单位 | rpx（px×2） | rpx 自适应屏宽 | 逻辑像素 1:1 |

## 3. 本次改动面（P001 域）

- **U-WX/U-AND**：`pages/index/index.vue` 改挂 `components/ui/`（AppNavbar/AppIcon/AppChip/AppEmpty/DeviceCard）；P001 域组件（filter-panel/error-banner/empty-state/advertisement-dialog/scan-summary）hex 全部收敛为 `--c-*` var（值相同零视觉变化）；原生组件属性（switch/slider）因不解析 CSS var 保留正典 hex + 注释。
- **F-AND**：`device_list_page.dart` 改挂 `lib/ui/design/`（AppNavbar/AppButton/AppChip/AppEmpty）+ 全部圈外 hex 收敛 AppTokens；btDotColor→btStatusTone 语义化。
- 未修改：其他页面（P002-P010）、BLE Runtime、协议、数据模型、功能范围。

## 4. 遗留与后续（非 G0 范围）

1. F-AND `widgets/device_card.dart`/`filter_panel.dart` 为存量实现（规格=正典），后续页面迁移时统一切 `lib/ui/design/` 后删除。
2. UniApp 存量组件（`components/common/*`、`components/*/*`）由 `--ble-*` 别名层供值，逐页迁移后随别名层删除（DESIGN_SYSTEM_INDEX §5）。
3. 六态模拟的截图证据（真机/模拟器）按既有验证战役流程另行归档（`verification/`），本表为静态结构/取值/文案/图标位对齐结论。

## 5. 缺陷修复记录（复查轮，2026-09-09 真机）

| 缺陷 | 现象 | 根因 | 修复 |
|---|---|---|---|
| **UIG0-D01 tabBar 图标黑块** | U-WX/U-AND 底部四个 tab 图标渲染为黑色实心块（形似「图标没显示」），常态/激活无区分 | icon-gen `gen-tabs.js` 提取 sprite 字形时只取 `<g id="i-*">` 标签体、丢弃携带 `stroke="currentColor"` 的开标签——路径失去 fill/stroke 属性 → 默认黑填充；currentColor 替换沦为空操作 → 常态/激活同黑（2026-09-07 PARITY-ICON 轮引入，静默失败） | 生成器保留开标签整体烤色 + 内置断言；8 枚 PNG 重生成（常态 #7B8FA5 / 激活 #1B6DFF）；`check-icon-usage.mjs` 新增 §3b PNG 像素级解码校验（主色命中 + 成对不同）防回归 |

复查证据（U-AND 真机 E5，标准基座 2026-09-09）：tabBar=蓝色放大镜(激活)+灰蓝链环/广播波/信息圈；navbar kicker/标题/蓝牙三态不与状态栏重叠；扫描按钮白色放大镜图标与文字对齐；「附近设备」蓝色芯片图标；设备卡信号条/dBm/连接按钮图标彩色正常（像素检测 0 黑块）。页内 SVG 图标（AppIcon data-URI 路径）本就正常，缺陷仅 tabBar 位图资产。

## 6. 门禁结果

```
node scripts/check-icon-usage.mjs   → PASS (dart 59 · vue 41 · 目录 35 枚 · 镜像同步)
node scripts/check-token-usage.mjs  → PASS (登记色 49 · banned 14 清零 · 正典层严格)
flutter analyze                     → No issues found
flutter test                        → 69/69 passed
npm run build:mp-weixin             → DONE Build complete
```
