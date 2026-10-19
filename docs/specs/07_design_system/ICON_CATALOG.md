# ICON_CATALOG —— 图标目录（35 枚 · 单一来源登记）

> 2026-09-09 冻结 · UI-PARITY-G0。
> **单一来源**：[`docs/specs/prototype/v1-new/index.html`](../prototype/v1-new/index.html) 内联 `<symbol>` sprite（`i-*`）。
> 规格（TOKEN.md §7）：24×24 线性 SVG · stroke 1.8（个别 2/2.2/1.6 见字形）/ round / `currentColor`；约 35 枚，全自包含，无外部图标服务。
> **受锁定镜像**（增删改必须先改 sprite，再同步镜像；icon-gen 流程）：
> 1. U-WX/U-AND：[`apps/uniapp/services/design/app-icons.js`](../../../apps/uniapp/services/design/app-icons.js)（`APP_ICONS`，占位符 `{C}` 色彩 / `{KNOB}` 旋钮底色）
> 2. F-AND：[`apps/flutter/lib/core/design/app_icons.dart`](../../../apps/flutter/lib/core/design/app_icons.dart)（`kAppIcons`）
> 3. 目录本文件（名称 + 语义登记）
>
> 渲染组件（业务代码唯一入口，只允许传 semantic id）：
> - UniApp：`components/ui/AppIcon.vue`（mp-weixin 无内联 svg → data-URI background-image）
> - Flutter：`lib/ui/design/app_icon.dart`（flutter_svg `SvgPicture.string`）
>
> **禁止**：Unicode 字符图标（✓ ✕ ▶ ▼ › × 等）、未登记 png、`Icons.*` / `CupertinoIcons.*` 字体图标。
> 校验：`scripts/check-icon-usage.mjs`。

---

## 1. 基础动作（10）

| id | 名称 | 字形要点 | stroke |
|---|---|---|---|
| `scan` | 扫描 | 放大镜 + 中心十字 | 1.8 |
| `stop` | 停止 | 圆角方块 | 1.8 |
| `play` | 播放 | 实线三角（保留字形，暂无授权位） | 1.8 |
| `refresh` | 重试/刷新 | 断口圆弧箭头 + 端帽 | 1.8 |
| `copy` | 复制/导出 | 双叠圆角矩形 | 1.8 |
| `send` | 下发 | 纸飞机 | 1.8 |
| `dl` | 下载/固件 | 下箭头 + 托盘 | 1.8 |
| `share` | 分享 | 三节点 + 连线 | 1.8 |
| `ext` | 外链 | 方框 + 出角箭头 | 1.8 |
| `qr` | 扫码 | 二维码角框 | 1.8 |

## 2. 导航与状态（8）

| id | 名称 | 字形要点 | 备注 |
|---|---|---|---|
| `chev-r` | 右尖角 | 单折线箭头 | 2.0；返回键 = 本图标 `rotate:180` |
| `chev-d` | 下尖角 | 单折线箭头 | 2.0；picker/折叠（展开态可 rotate:-90） |
| `check` | 对勾 | 两段折线 | 2.2 |
| `x` | 关闭/失败 | 双对角线 | 2.0 |
| `warn` | 警告 | 三角 + 感叹点 | 1.8 |
| `info` | 信息 | 圆 + i | 1.8；未知 id 的兜底字形 |
| `eye` / `eye-off` | 密码可见 | 眼形 (+斜杠) | 1.8，成对 |
| `link` | 链接/连接 | 双链环 | 1.8 |

## 3. 设备与域（9）

| id | 名称 | 字形要点 |
|---|---|---|
| `bt` | 蓝牙 | 蓝牙符 |
| `cast` | 广播 | 中心点 + 双弧对 |
| `wifi` | Wi-Fi | 三弧 + 底点 |
| `usb` | USB | 插头 + 引脚 |
| `hid` | 键盘设备 | 外框 + 键阵 + 空格条 |
| `chip` | 芯片/GATT | IC 方块 + 内核 + 引脚 |
| `pulse` | 诊断脉搏 | 心电折线 |
| `signal` | 信号格 | 四柱阶梯（保留字形，RSSI 条为 CSS 组件非本图标） |
| `batt` | 电量 | 电池 + 实心电量（保留字形，暂无授权位） |

## 4. 文件与容器（5）

| id | 名称 | 字形要点 |
|---|---|---|
| `doc` | 文档 | 折角文档 |
| `log` | 日志 | 折角文档 + 内容行 |
| `folder` | 文件夹 | 方块折叠（保留字形，暂无授权位） |
| `box` | 立方容器 | 等距立方体 |
| `trash` | 删除 | 桶 + 盖（保留字形，暂无授权位） |

## 5. 设置（2）

| id | 名称 | 字形要点 |
|---|---|---|
| `set` | 滑杆设置 | 三横线 + `{KNOB}` 旋钮圆 |
| `lock` | 锁定 | 锁体 + 锁梁 |

## 6. 系统 UI 图标资产（png · 平台例外）

mp-weixin tabBar 仅接受 png 资源，以下 8 枚为**系统级 TabBar 图标**（`pages.json` tabBar 引用），与 sprite 字形同源（scan/link/cast/info 四对常态/激活），登记为平台例外，不算业务图标违例：

| 资产 | 状态对 | 对应 semantic id |
|---|---|---|
| `static/tabs/scan.png` / `scan_active.png` | 常态/激活 | `scan` |
| `static/tabs/link.png` / `link_active.png` | 常态/激活 | `link` |
| `static/tabs/cast.png` / `cast_active.png` | 常态/激活 | `cast` |
| `static/tabs/info.png` / `info_active.png` | 常态/激活 | `info` |

非图标图片资产（登记备查，不作图标使用）：`static/logo.png`（品牌 logo/分享缩略）、`static/share.png`（分享卡）。

> **烤色锁定（2026-09-09 真机缺陷整改）**：tabBar PNG 由 icon-gen `gen-tabs.js` 从 sprite 烤色光栅化（常态 `#7B8FA5` / 激活 `#1B6DFF`，81×81）。曾因生成器丢弃 `<g>` 开标签的 `stroke="currentColor"` 导致产物全黑且常态/激活同色（U-WX/U-AND 四 tab 均为黑色实块）——现生成器内置烤色断言，且 `check-icon-usage.mjs` §3b 对 8 枚资产做像素级解码校验（主色命中 + 成对不同），双重防回归。

## 7. 空态插图（非图标 · 4 幅 · 另行登记）

空态几何线稿 SVG 4 幅（120×88，品牌蓝 + 薄荷双色点缀），仅用于 empty-state：`radar`（扫描空）/ `link`（无连接）/ `doc`（无记录）/ `box`（容器空）。
正典：`components.js` `C.ILL`；镜像：uniapp `services/design/app-illustrations.js`、flutter `lib/core/design/app_illustrations.dart`；渲染组件 uniapp `app-ill.vue` / flutter `AppIll`。

## 8. 登记与变更规则

1. 新增图标：先在原型 sprite 增加 `<symbol id="i-*">`（24×24 / stroke≈1.8 / currentColor），再同步两平台镜像与本目录，并在 [ICON_USAGE_MATRIX.md](ICON_USAGE_MATRIX.md) 授权使用位。
2. 「保留字形」（play/signal/batt/folder/trash）：目录在册但当前无授权使用位；业务代码引用它们需先在矩阵登记用途。
3. 删除图标：需同步移除三处镜像与矩阵行，并过 `check-icon-usage.mjs`。
4. 业务代码引用非法 id → 渲染兜底 `info`（两平台行为一致）且 checker FAIL。
