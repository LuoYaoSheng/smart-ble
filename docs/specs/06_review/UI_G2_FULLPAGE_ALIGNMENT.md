# UI-G2 全页面逐页对齐报告（nav → tabbar）+ 品牌启动图

> 输入：用户走查反馈「从 nav 到 tabbar 基本都没完成，一个页面一个页面好好过一下，交互也要处理；启动图单独处理（ChatGPT2API 生成）」。
> 基准：`docs/specs/prototype/v1-new`（P001-P010 契约）+ `platform/{wechat,app}` 壳层差异。
> 日期：2026-09-09 · 分支 `refactor/uniapp-v1`。

## 0. 背景与根因

G0/G1 仅将 **P001 首页**挂上正典组件层；其余 8 页仍在旧组件层（`components/common/app-icon` 等），且仅 2 页用自定义导航（其余系统导航栏标题、副标题、返回行为与原型 subnav 均不一致）——「没对齐」的实态：

| 维度 | G1 后现状 | 根因 |
|---|---|---|
| 导航 | 仅 P001/P007 自定义；P002/P003/P005/P006/P008/P009/P010 系统导航栏 | 正典 AppNavbar/AppSubnav 零使用 |
| 标题 | P003「Smart HID 设备」/ P005「诊断」/ P006「设备详情」≠ 正典 | 原型 IA-01 等口径未落 |
| 状态栏 | ui/AppNavbar 无安全区处理（旧 common/app-navbar 有） | 正典组件缺 MP 胶囊/状态栏逻辑 |
| 组件 | AppButton/AppSubnav/AppTabBar/AppBadge/AppCard/AppListRow/DeviceCard(conn)/LogPanel/ServicePanel 九件零使用 | G0 只建未迁 |
| 图标 | hid/diagnostics 用旧 app-icon + 文本字形 `·`；5 个旧组件引用旧图标 | 收口未完成 |
| Flutter | 仅 device_list 迁移；tab2-4 无 AppNavbar；子页全系统 AppBar；provisioning 48 处硬编码色 | 同上 |
| 启动图 | uniapp 无自定义启动图；Flutter 为默认白底+icon | 未排期 |

## 1. 逐页对齐矩阵（U = uniapp U-WX/U-AND 共码，F = Flutter Android）

| 页 | 导航（U/F） | 组件迁移（U） | 交互对齐 | 判定 |
|---|---|---|---|---|
| P001 扫描 | 已正典（+本轮 navbar 安全区升级）| — （scan-summary/error-banner/advertisement-dialog 图标入口换血） | — | ✅ |
| P002 配网 | AppSubnav「配置 Smart HID」，返回键走 U-01 离开确认（与系统返回同口径）| — | subnav 返回 × 离开确认复用同一 `confirmLeaveIfNeeded`；硬编码色 → token | ✅ |
| P003 详情 | AppSubnav「Smart HID 设备详情」（原「Smart HID 设备」）| AppBadge「配置成功 · READY」/ AppChip 协议行 / AppListRow kv（缺失值 `—`）/ AppButton×3（refresh/pulse/set）| 补正典 info 说明条（内存快照零持久化，文案逐字取自原型） | ✅ |
| P005 诊断 | AppSubnav「SHID 诊断」（原「诊断」）| AppStatusIcon 五态行图标（退役文本字形 `·`）+ AppBadge 状态行（六值词表对齐正典）| 重新检测/返回设备详情/重新配网(soft danger-t)；错误码折叠入错误块（ghost sm）；offline 连接确认 modal 文案对齐正典 | ✅ |
| P006 GATT 调试 | AppSubnav「GATT 调试」（原「设备详情」，IA-01）+ 右槽「固件更新」ghost sm danger-t（OTA 服务存在时）| **ServicePanel（五态正典）+ LogPanel dock** 接管旧 service-panel/log-panel；服务/特征计数 chip + 全部展开/收起 | read/write/notify 事件签名带 `{serviceId,charId}`；notify 态页管 map；日志导出并入 LogPanel 工具条 | ✅ |
| P007 已连接 | AppNavbar `SESSIONS` + 会话 chip（配网在线 warning / 通用 neutral）| **DeviceCard conn 变体** + AppEmpty（link 插图 + 去扫描 CTA）+ sumcard「N 台在线 · 全部为内存会话」+ 全部断开 danger sm | 断开/批量断开/失败 modal 流保持 | ✅ |
| P008 广播 | AppNavbar `PERIPHERAL` + 平台 chip + 状态 AppBadge（广播中 on/失败 err/已就绪 warn/其余 dim，「不支持」无点）| **LogPanel card** 接管旧 log-panel + 新增「导出」工具条动作（剪贴板）| 表单/权限链/平台分支零改动 | ✅ |
| P009 关于 | AppNavbar `ABOUT` + 版本 chip（mono）| 头部 logo 渐变 → `--c-primary-deep/--c-primary`；图标 tone 化 | 紧凑品牌行（v1.0.8 口径）保持 | ✅ |
| P010 版本 | AppSubnav「版本记录」| AppEmpty（doc）×2 接管旧 empty-state | 复制版本信息保持 | ✅ |
| pages.json | 9 页全部 `navigationStyle: custom`；标题对齐正典 | — | — | ✅ |

### F-AND（Flutter）改动

- `main.dart`：原生 BottomNavigationBar → **AppTabBar**（已连接角标 = `BleManager.connectionStatesStream` 连接数实时驱动）；`ConnectedDevicesPage(onGoScan: 切回扫描 Tab)` 注入。
- P007：AppNavbar(SESSIONS+chip) + AppEmpty + sumcard + 全部断开 AppButton；`Color(0xFF18222E)` → token。
- P008：AppBar+手搓徽章 → AppNavbar（平台 chip + AppBadge 三态）；`_statusBadge` 改 tone 口径。
- P009：AppBar → AppNavbar（ABOUT + 版本 mono chip）；品牌渐变 → AppTokens。
- P002/P003/P005/P006/P010：AppBar → **AppSubnav**（标题对齐正典；P002 返回走 `_confirmLeave`）；P006 标题/设备名/ID 下沉 devhead，OTA+连接 chip 入右槽。
- P005：文本字形 `✓ ✕ ! … ·` → **AppStatusIcon**（枚举五态）+ 正典状态词表。
- provisioning_page：48 处硬编码色 → **AppTokens**（余 16 处近 token 漂移值在 LEGACY_DRIFT 登记内）。
- versions_page：`_emptyBlock` → **AppEmpty**。
- 修复正典组件潜伏缺陷：`AppStatusIcon` lazy `late final` AnimationController 在「未 build 即 dispose」时于失活树取 TickerMode 抛异常 → 改 initState 创建（flutter test 全量首用暴露）。

## 2. 组件层收敛（U 侧）

- **删除退役**（git rm）：`common/app-icon.vue`、`common/app-navbar.vue`、`common/empty-state.vue`、`common/app-ill.vue`、`device-card/device-card.vue`、`service-panel/service-panel.vue`、`log-panel/log-panel.vue`（共 7 文件 + 3 目录）。
- **图标入口换血**（旧 app-icon → `ui/AppIcon`，API 兼容 color 直传）：`scan/scan-summary`、`common/error-banner`、`common/operation-state`、`scan/advertisement-dialog`、`about/app-card`。
- **正典组件 API 补齐**：AppNavbar `#status` 槽位 + MP 状态栏占位/胶囊避让；AppSubnav `@back` 拦截约定（绑定即页面接管）；LogPanel 兼容存量 `{type中文, message, timestamp}` 条目形状；ServicePanel read/write/notify 事件携带 `{serviceId, charId}`。
- `page-flow.test.js` 守卫同步：设备卡断言迁至 `ui/DeviceCard.vue`（icon prop + token 信号条）；empty-state 断言迁至 `ui/AppEmpty.vue`；error-banner/adv-dialog 断言改 token 变量；运行时选择器 `.ble-btn`→`.app-btn`。

## 3. 品牌启动图（ChatGPT2API 生成）

| 端 | 接线 | 资产 |
|---|---|---|
| U-AND（uniapp 云打包）| `manifest.json → app-plus.distribute.splashscreen`（`androidStyle:"default"` + 四密度，schema 经 HBuilderX `app-safe-pack/makeapp.js:302` 核实）| `static/splash/{hdpi 480×762, xhdpi 720×1184, xxhdpi 1080×1818, xxxhdpi 1440×2424}.png`（竖版整幅：冰蓝底 #F8FBFF + 蓝渐变蓝牙徽记 + BLE Toolkit+ 字标）|
| F-AND | `flutter_native_splash` 重生（color #F8FBFF + 透明底 logo 居中 + **Android 12 专项**：windowSplashScreenBackground/AnimatedIcon）| `assets/images/splash_logo.png`（1024² 透明底 lockup；生成后 PIL 连通域去孤点 + alpha 收紧，半透明残留 0.38%）|
| U-WX | 不适用（微信启动屏由宿主控制，无自定义能力）| — |

生成参数：`gpt-image-2`（ChatGPT2API 自托管 · c2a-files.i2kai.com）；文案经视觉模型逐字校验（"BLE Toolkit+" 无乱码）。
限制：uniapp 启动图**仅云打包生效**（标准基座真机运行显示基座启动图，HBuilderX 官方口径）；Android 12+ 系统启动屏在 F-AND 已专项处理、U-AND 云打包由打包器回退默认图标屏（后续需要再登记 Android12 icon 资产）。

## 4. 验证

| 门禁 | 结果 |
|---|---|
| `npm run build:mp-weixin` | ✅ Build complete |
| `npm run build:app` | ✅ Build complete（APP-PLUS 条件分支过编译）|
| `flutter analyze` | ✅ No issues found |
| `flutter test` | ✅ 69/69（AppStatusIcon 生命周期修复后）|
| `scripts/check-icon-usage.mjs` | ✅ PASS（35 枚目录 · 双端镜像同步）|
| `scripts/check-token-usage.mjs` | ✅ PASS（banned 14 清零 · 正典层严格）|
| `manifest.json` JSON 解析 | ✅ |

## 5. 遗留登记（非本轮范围）

1. **F-AND P001 组件三件**（`ui/widgets/{advertisement_sheet, device_card, filter_panel}`，39 处登记内 hex）仍为旧层——P001 已在 G1 判 PASS，待专项窗口迁移至 `ui/design/` 后删除旧件。
2. provisioning_page 余 16 处近 token 漂移色（`0xFFB33A44` 等深色阶），在 LEGACY_DRIFT 登记内，待 token 域扩充后收敛。
3. U-WX 真机走查 + 全页截图证据（微信开发者工具登录受限，G1 起登记）。
4. 真机回归窗口：P005/P006 状态机交互（连接失败/服务空/OTA）与 P002 返回拦截建议随下一轮 F 域真机证据链补录。
