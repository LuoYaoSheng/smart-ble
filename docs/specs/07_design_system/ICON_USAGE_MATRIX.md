# ICON_USAGE_MATRIX —— 图标 × 使用位置授权矩阵

> 2026-09-09 冻结 · UI-PARITY-G0。
> 效力：每个 semantic icon id 的**授权使用位**在此登记；矩阵外的引用（或矩阵内 id 的圈外用途）视为违例。变更走 ICON_CATALOG §8。
> 图标色遵循 TOKEN_REFERENCE §2（语义色不得混用）；尺寸跟随使用位登记（rpx = px×2，Flutter 逻辑像素 1:1）。

---

## 1. 全局层

| 使用位 | id | 尺寸(px) | 色彩 | 说明 |
|---|---|---|---|---|
| TabBar·扫描 | `scan` | 23 | 激活 `--c-primary` / 常态 `--c-mut` | png 资产对（系统 UI） |
| TabBar·已连接 | `link` | 23 | 同上 | png 资产对 |
| TabBar·广播 | `cast` | 23 | 同上 | png 资产对 |
| TabBar·关于 | `info` | 23 | 同上 | png 资产对 |
| 二级页返回键 | `chev-r`(rotate 180) | 17 | `--c-text` | `--c-fill` 圆角方块底 |

## 2. P001 扫描（原型 p001-scan.js）

| 使用位 | id | 尺寸(px) | 色彩 |
|---|---|---|---|
| 扫描按钮（未扫） | `scan` | 17 | `#FFFFFF`（primary 实底按钮内） |
| 停止按钮（扫描中） | `stop` | 17 | `#FFFFFF`（danger 实底按钮内） |
| 「附近设备」组标题 | `chip` | 22 | `--c-primary` |
| DeviceCard·连接 | `link` | 17 | primary 实底→`#FFFFFF`；soft→`--c-text` |
| DeviceCard·配置 Smart HID | `hid` | 17 | `#FFFFFF`（primary sm 实底） |
| 错误横幅标题 | `warn` | 17 | `--c-danger` |
| 错误横幅重试 | `refresh` | 15 | `--c-danger`（ghost danger-t） |
| 空态 action「开始扫描」 | `scan` | 17 | `--c-text`（soft 按钮） |

## 3. P002 配网（p002-provision.js）

| 使用位 | id | 色彩 |
|---|---|---|
| 扫码按钮 | `qr` | `--c-primary`（bigact 卡）/ `#FFFFFF` |
| 密码可见切换 | `eye` ⇄ `eye-off` | `--c-mut` |
| 下发按钮 | `send` | `#FFFFFF`（primary） |
| 配置入口/重连 | `set` / `refresh` | 按 tone |
| 步骤/进度完成态 | `check` | success 系 |

## 4. P003 Smart HID 详情（p003-hid-detail.js）

| 使用位 | id | 色彩 |
|---|---|---|
| 菜单行（设备/网络/诊断） | `hid` / `wifi` / `chip` / `pulse` | `--c-mut` |
| 菜单行右箭头 | `chev-r` | `--c-ph` |
| 重新检测 | `refresh` | 按 tone |

## 5. P005 诊断（p005-diagnostics.js）

| 使用位 | id | 色彩 |
|---|---|---|
| 诊断行 ok | `check` | `--c-success-deep`(#0E9A80) |
| 诊断行 warn | `warn` | `--c-warning-deep`(#C77E14) |
| 诊断行 fail | `x` | `--c-danger` |
| USB Ready 项 | `usb` | `--c-mut` |
| 重新诊断 | `refresh` | 按 tone |

## 6. P006 GATT（p006-gatt.js）

| 使用位 | id | 色彩 |
|---|---|---|
| 服务头（普通） | `chip` | `--c-primary` |
| 服务头（OTA） | `dl` | `--c-danger` |
| 服务折叠 chevron | `chev-r`(rotate 90 展开) | `--c-mut` |
| 「服务与特征」组标题 | `log` | `--c-primary` |
| 连接/断开按钮 | `link` / `x` | `#FFFFFF` |
| 日志面板标题 | `log` | dock `--c-ink-text` / card `--c-sub` |
| 日志导出 | `copy` | `--c-primary`（soft） |

## 7. P007 已连接（p007-connected.js）

| 使用位 | id | 色彩 |
|---|---|---|
| 卡片 ON 角标 | `check` | `#FFFFFF`（success 圆底） |
| 断开按钮 | `x` | `--c-danger`（soft danger-t） |
| 空态 action「去扫描」 | `scan` | `--c-text` |

## 8. P008 广播（p008-broadcast.js）

| 使用位 | id | 色彩 |
|---|---|---|
| 开始/停止广播 | `cast` / `stop` | `#FFFFFF` |
| picker 下拉 | `chev-d` | `--c-mut` |
| 受限预警条 | `warn` | `--c-warning-deep` |

## 9. P009/P010 关于与版本

| 使用位 | id | 色彩 |
|---|---|---|
| 菜单行（官网/反馈/分享/版本） | `ext` / `send` / `share` / `doc` | `--c-mut` |
| 菜单行箭头 | `chev-r` | `--c-ph` |
| 平台徽章 | `bt` | `--c-mut` |
| 版本卡 | `doc` / `dl` / `check` | 按 tone |
| 复制版本号 | `copy` | `--c-primary` |

## 10. 保留字形（在册无授权位）

`play` `signal` `batt` `folder` `trash` `box`(图标位；`box` 作空态插图名不受限) —— 引用前须先在本矩阵登记。

## 11. 违例对照（本阶段清理项）

| 违例 | 原位置 | 整改 |
|---|---|---|
| `›`（U+203A）×4 | uniapp pages/about/index.vue 菜单箭头 | → `AppIcon chev-r` |
| `▼`（U+25BC）×2 | uniapp pages/broadcast/index.vue picker | → `AppIcon chev-d` |
| `⌁`（U+2301） | uniapp pages/hid/add.vue 扫码按钮 | → `AppIcon qr` |
| `✓`/`✕`/`!`/`·` | uniapp provision-progress.vue / provision-stepper.vue marker | → `AppIcon check`/`x`/`warn`（active/pending 的 `·` 为状态点样式，见 COMPONENT_CONTRACT C7 登记例外） |
| `×`（U+00D7） | uniapp write-dialog.vue 关闭钮 | → `AppIcon x` |
| `Icons.*`/`CupertinoIcons.*` | Flutter 全库 | 0 处（已达标，保持） |
| 未登记 png | uniapp static/tabs/*.png | 系统级 TabBar 资产，ICON_CATALOG §6 登记例外 |
