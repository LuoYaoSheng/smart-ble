# COMPONENT_CONTRACT —— 公共组件三端契约

> 2026-09-09 冻结 · UI-PARITY-G0。
> **组件单一来源**：本文件登记 13 个正典公共组件的名称、props/events、视觉规格与授权变体。行为规格承接 [COMPONENT.md](COMPONENT.md)（v1.0，A/B/C/D 编号沿用）；数值全部引用 [TOKEN_REFERENCE.md](TOKEN_REFERENCE.md)。
> 实现：
> - UniApp：`apps/uniapp/components/ui/`（PascalCase SFC，显式 import）
> - Flutter：`apps/flutter/lib/ui/design/`（`app_*.dart` / `device_card.dart` 等）
>
> 页面只能用本表组件拼装（授权表见 COMPONENT.md 尾表）；**组件外不得重复实现同类视觉**。本阶段（G0）先落 13 组件 + P001 消费；存量组件（`components/common/*`、`components/*/*`、`lib/ui/widgets/*`）保留给存量页面，新页面禁用。

---

## 0. 通用约定

- 图标入参一律 **semantic icon id**（ICON_CATALOG），经 AppIcon 渲染；颜色入参用 Token（CSS var / `AppTokens`），不得传裸 hex。
- 尺寸标注为 375 基准 px；UniApp rpx = px×2；Flutter 逻辑像素 1:1。
- 事件命名：UniApp emit `tap`（组件主动作）/语义事件；Flutter 回调 `onXxx`。

## B0. AppIcon / AppIll（渲染基座）

| 端 | 实现 | API |
|---|---|---|
| UniApp | `components/ui/AppIcon.vue`（转接字形源 `services/design/app-icons.js`） | props: `name`(必填 semantic id) / `size`(rpx，默认 40) / `color`(默认 `--c-text`) / `knob`(#FFFFFF) / `rotate`(deg) |
| Flutter | `lib/ui/design/app_icon.dart`（转接 `core/design/app_icons.dart`） | `AppIcon(name, {size=24, color, knob='#FFFFFF', rotate=0})` |
| UniApp | `components/ui/AppIll.vue`（4 幅空态插图） | props: `name`(radar/link/doc/box) / `width`(rpx) |
| Flutter | `lib/ui/design/app_ill.dart` | `AppIll(name, {width=118})` |

未知 id 兜底 `info`；尺寸档 13/17/22/26（xs/sm/md/lg）。

## A1. AppNavbar（tab 页自绘导航栏）

- 结构：kicker（`--fs-micro` 品牌蓝 +2px 字距）+ 标题行（`--fs-title` w800）+ 右侧蓝牙状态 chip（`bt-dot` 8px 圆点 + 状态词 `--fs-mini`）。
- props：`kicker` / `title` / `statusText` / `statusTone`(`on`|`off`|``)。
- 视觉：白→`--c-bg` 渐变底、底边 `--c-line-soft`、sticky（`--z-nav`）。on 点 `--c-success`+微光，off 点 `--c-danger`，默认 `--c-ph`。
- 用于 P001/007/008/009。

## A2. AppSubnav（二级页导航栏）

- 结构：返回键（30×30 `--c-fill` 圆角 9 + `chev-r` rotate180）+ 标题（`--fs-h1` w700）+ 右槽（可选动作，如 P006「固件更新」ghost sm danger-t）。
- props：`title` / `back`(默认 navigateBack/pop) / 右槽 slot `action`。
- 事件：`back`。

## A3. AppTabBar（四 Tab 底栏）

- 四项：扫描(`scan`)/已连接(`link`)/广播(`cast`)/关于(`info`)；激活 `--c-primary` + w700，常态 `--c-mut`；已连接项角标（`--c-danger` 圆胶囊，口径=通用连接+SHID 会话在线）。
- 实现：UniApp = `pages.json` 原生 tabBar（png 对 + `selectedColor:#1B6DFF`）；组件封装为**契约声明 + 配置校验**（AppTabBar.vue 供 APP 端自绘用）。Flutter = `lib/ui/design/app_tab_bar.dart`（BottomNavigationBar 封装，AppIcon 字形）。
- 仅 switchTab 语义，无返回。

## A4. AppListRow（键值行 kv）

- 结构：`k`（宽 96px(192rpx) `--fs-cap` `--c-mut` w600）+ `v`（`--fs-body` `--c-text`，可 mono）；缺失值显示「—」不隐藏行。
- props：`label` / `value` / `mono`(bool) / `dim`(bool)。
- 行间分割 `--c-line-soft`，末行无。

## B1. AppButton（按钮）

- 变体 tone：`primary`（primary→primary-deep 渐变 + shadow-primary + 白字）/ `danger`（#FF6B74→danger 渐变）/ `ghost`（透明 + 1.5px 语义描边；`dangerText` 变体红字红框）/ `soft`（`--c-fill` 底 + `--c-line` 内描边；`dangerText` 变体 danger-weak 底红字）。
- 尺寸 size：`md`（高 40 / `--fs-h2` w600 / `--r-md` / 左右 18）/ `sm`（高 32 / `--fs-body` / `--r-sm` / 左右 13）/ `block`（宽 100%）。
- props：`label` / `tone` / `size` / `icon`(semantic id) / `loading` / `disabled` / `block` / `dangerText`。
- 事件：`tap`。disabled：`--c-fill` 底 + `--c-ph` 字、无阴影；loading：spinner + 禁用；按压 `scale(.97)`（`--dur-fast`）。

## B2. AppChip（标签）

- 胶囊 `--r-round`，`--fs-mini` w600，padding 2/9。
- tone：`neutral`(`--c-fill`/`--c-sub`) / `primary`(primary-weak/primary) / `success`(success-weak/#0E9A80) / `danger`(danger-weak/danger) / `warning`(warning-weak/#C77E14) / `mono`(等宽 `--fs-micro`)。
- props：`text` / `tone`。

## B3. AppBadge（状态徽章）

- 点 + 词胶囊：`--fs-mini` w700，默认 `--c-fill`/`--c-sub`，点 7px `--c-ph`。
- tone：`on`(success-weak/#0E9A80 + 点发光) / `err`(danger-weak/danger) / `warn`(warning-weak/#C77E14) / `dim`(`--c-mut`)。
- props：`text` / `tone` / `dot`(bool，默认 true)。

## B6. AppEmpty（空态）

- 结构：插图（4 幅，120×88 档）+ 主文案（`--fs-h1` w700 `--c-text`）+ 说明（`--fs-body` `--c-mut`，max-width 250）+ 可选 action（AppButton soft + icon）。
- props：`ill`(radar/link/doc/box) / `title` / `description` / `actionLabel` / `actionIcon`。
- 事件：`action`。P001 双空态文案规范见 COMPONENT.md B6。

## B7. AppStatusIcon（状态图标）

- 状态五态 → 图标 + 色彩映射（诊断行/进度行左侧图标列）：
  `ok`→`check`/`--c-success-deep` · `warn`→`warn`/`--c-warning-deep` · `fail`→`x`/`--c-danger` · `active`→脉冲点（primary）· `pending`→空心 dashed 点。
- props：`state`(ok|warn|fail|active|pending) / `size`。
- 背景 24px 圆（对应 weak 底色）；`active`/`pending` 不使用字符 `·`，以样式点表达（替代原 marker 字符方案，ICON_USAGE_MATRIX §11）。

## C1. DeviceCard（设备卡 · 单一来源）

- 变体 `variant`：`scan` / `conn`。
- 结构：44×44 `--r-md` 渐变头像（标准 primary-weak→#DCE9FF / SHID #D9F6F0→#E2F8F4）+ 名称行（`--fs-h2` w700 + 匹配 chip）+ deviceId（mono `--fs-micro` `--c-mut`）+ meta 行（RSSI 四格信号条 + dBm mono）。
- SHID：`STRONG`→chip「Smart HID · 强匹配」primary / `WEAK`→「疑似 Smart HID · 弱匹配」warning；动作区**双入口**：`配置 Smart HID`(primary sm, icon `hid`) + `连接/已连接`(SHID 或已连接时 soft，否则 primary sm, icon `link`)。
- conn 变体：头像 ON 角标（success 圆底 + `check` 白 13px）+ meta「已连接 · 可进行 GATT 调试」+ `断开`(soft danger-t sm)。
- 信号分档：≥-60 四格(success) / ≥-70 三 / ≥-80 二(warning×2) / 其余一(danger)，空格 `--c-line`；格宽 3px 高 4/7/10/12。
- props：`device` / `variant` / `connected`(bool)。
- 事件：`tap`(卡片=广播数据) / `connect` / `configure` / `disconnect`。

## C4. ServicePanel（GATT 服务树）

- 五态 `state`：`idle`(op loading 提示卡) / `connecting`(op loading) / `ready`(服务折叠列表) / `empty`(op warn 专用文案) / `error`(op err + 重试)。
- 服务头：图标（普通 `chip` primary / OTA `dl` danger）+ 名称（SIG 中文名或「服务 N」）+ UUID 前 8 mono chip + `chev-r`(展开 rotate90)；特征行：名称 + 属性 chips（read=primary/write=success/notify=warning）+ 动作键（读取/写入 soft sm、监听⇄停止 ghost sm）。
- props：`state` / `services` / `expanded` / `notifying` / `errorText`。
- 事件：`toggleService` / `read` / `write` / `notify` / `retry`。

## C5. LogPanel（通信日志 · 单一来源）

- 变体 `variant`：`dock`（深色 `--c-ink`，P006 底部） / `card`（白卡，P008）。
- 工具行：`log` 图标 + 「通信日志」+ 清空(ghost sm dangerText) + 导出(soft sm, icon `copy`)。
- 行：时间(mono `--fs-mini`) + 类型 chip 六色（sys/err/read/write/recv/ok → TOKEN_REFERENCE §2.2；dock 用登记反色对：sys #1B2536/#9FB6D6、err #3A1F26/#FF8B94、read #39301C/#FFC37E、write #1B2B4A/#8FB8FF、recv #2A2344/#BBA8FF、ok #14342E/#5EE0C4）+ 消息(.mono 数据段)。
- 空态「暂无日志」；脱敏 `token=***`（F026）；max-height 220px 滚动。
- props：`logs` / `variant` / `emptyText`。
- 事件：`clear` / `export`。

## 契约外存量组件（迁移期登记）

以下存量实现继续服务存量页面，规格并入上表对应正典，后续阶段删除：uniapp `components/common/{app-icon,app-navbar,empty-state,error-banner,operation-state,app-ill}.vue`、`components/{device-card,filter-panel,log-panel,service-panel,scan/*,hid/*,…}`；flutter `lib/ui/widgets/{device_card,filter_panel,log_panel,service_list,service_tile,…}.dart`。新增页面禁止引用。
