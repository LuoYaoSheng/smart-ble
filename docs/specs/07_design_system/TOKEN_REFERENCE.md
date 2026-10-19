# TOKEN_REFERENCE —— Token 三端映射参考

> 2026-09-09 冻结 · UI-PARITY-G0。
> **机器单一来源**：[`core/assets-generator/meta/design-tokens.json`](../../../core/assets-generator/meta/design-tokens.json)（经 `core/assets-generator/generate_assets.py --theme-only` 分发）。
> **规格来源**：[TOKEN.md](TOKEN.md)（v1.0）与 [prototype/v1-new/assets/tokens.css](../prototype/v1-new/assets/tokens.css)。数值冲突时以 design-tokens.json 为准并回改规格。
> 使用规则见 TOKEN.md §9：圈外值视为违例；语义色不得混用；本产品不做全局深色模式。

---

## 1. 分发产物与生成链

```
core/assets-generator/meta/design-tokens.json   ← 唯一编辑点
        │ generate_assets.py --theme-only
        ├─→ apps/uniapp/styles/tokens.css            （--c-* CSS variables；尺寸 px×2→rpx）
        ├─→ apps/flutter/lib/ui/design/app_tokens.dart（AppTokens 常量类；px→逻辑像素 1:1）
        └─→ colors.json 值对齐 → app_theme.css / app_colors.dart（legacy 通道，Electron/Tauri 同源）
```

- UniApp：`App.vue` 依序 import `styles/tokens.css` → `styles/design-system.css`（后者 `--ble-*` 为别名层，只引用 `--c-*`，不带自有 hex）。
- Flutter：`themes/app_theme.dart` 消费 `AppTokens`；页面层禁止散写 hex，统一 `AppTokens.xxx`。

## 2. 色彩 Token（--c-* / AppTokens.c*）

| Token（CSS var） | Flutter 常量 | 值 | 用途 |
|---|---|---|---|
| `--c-primary` | `AppTokens.cPrimary` | `#1B6DFF` | 品牌蓝：主按钮、选中态、链接、TabBar 激活 |
| `--c-primary-deep` | `AppTokens.cPrimaryDeep` | `#0E4FC4` | 主按钮按压/渐变深端 |
| `--c-primary-weak` | `AppTokens.cPrimaryWeak` | `#E8F1FF` | 主色浅底 |
| `--c-success` | `AppTokens.cSuccess` | `#17C7A8` | 成功：READY/诊断 ok/广播中 |
| `--c-success-weak` | `AppTokens.cSuccessWeak` | `#E2F8F4` | 成功浅底 |
| `--c-success-deep` | `AppTokens.cSuccessDeep` | `#0E9A80` | 成功前景深色（chip/badge 文字、op.ok 标题） |
| `--c-danger` | `AppTokens.cDanger` | `#F2555F` | 危险：断开/停止/错误 |
| `--c-danger-weak` | `AppTokens.cDangerWeak` | `#FDEBEC` | 危险浅底 |
| `--c-warning` | `AppTokens.cWarning` | `#FF9F43` | 警告 |
| `--c-warning-weak` | `AppTokens.cWarningWeak` | `#FFF3E4` | 警告浅底 |
| `--c-warning-deep` | `AppTokens.cWarningDeep` | `#C77E14` | 警告前景深色（read 日志/chip 文字） |
| `--c-text` | `AppTokens.cText` | `#18222E` | 主文字 |
| `--c-sub` | `AppTokens.cSub` | `#42536A` | 次级文字 |
| `--c-mut` | `AppTokens.cMut` | `#60758D` | 弱文字 |
| `--c-ph` | `AppTokens.cPh` | `#9AA8B6` | 占位/禁用 |
| `--c-line` | `AppTokens.cLine` | `#E3EAF3` | 强分割线/卡片描边 |
| `--c-line-soft` | `AppTokens.cLineSoft` | `#EDF2F9` | 弱分割线 |
| `--c-fill` | `AppTokens.cFill` | `#F1F5FB` | 填充底 |
| `--c-bg` | `AppTokens.cBg` | `#F8FBFF` | 页面背景 |
| `--c-card` | `AppTokens.cCard` | `#FFFFFF` | 卡片背景 |

### 2.1 控制台深色（仅日志 dock/评审面板）

| Token | Flutter 常量 | 值 |
|---|---|---|
| `--c-ink` | `AppTokens.cInk` | `#101521` |
| `--c-ink-line` | `AppTokens.cInkLine` | `#263149` |
| `--c-ink-text` | `AppTokens.cInkText` | `#D6E2F5` |

### 2.2 日志六色（F011）

| Token | Flutter 常量 | 前景 | 浅底 |
|---|---|---|---|
| `--log-sys(-bg)` | `AppTokens.logSys/logSysBg` | `#5E7EA6` | `#EDF3FA` |
| `--log-err(-bg)` | `AppTokens.logErr/logErrBg` | `#F2555F` | `#FDEBEC` |
| `--log-read(-bg)` | `AppTokens.logRead/logReadBg` | `#C77E14` | `#FFF6E8` |
| `--log-write(-bg)` | `AppTokens.logWrite/logWriteBg` | `#1B6DFF` | `#E8F1FF` |
| `--log-recv(-bg)` | `AppTokens.logRecv/logRecvBg` | `#7C5CFF` | `#F0EBFF` |
| `--log-ok(-bg)` | `AppTokens.logOk/logOkBg` | `#17C7A8` | `#E2F8F4` |

> dock 深色变体的行内反色值（如 `#1B2536/#9FB6D6`）登记于 LogPanel 组件契约（COMPONENT_CONTRACT C5），属组件登记值，不算圈外。

## 3. 字体 Token

| Token | Flutter 常量 | 值（375 基准） | 用途 |
|---|---|---|---|
| `--fs-display` | `AppTokens.fsDisplay` | 24 / w800 | 品牌卡标题 |
| `--fs-title` | `AppTokens.fsTitle` | 20 / w800 | tab 页导航标题 |
| `--fs-h1` | `AppTokens.fsH1` | 17 / w700 | 二级页标题/卡片组标题 |
| `--fs-h2` | `AppTokens.fsH2` | 15 / w700 | 卡片标题/按钮主文案 |
| `--fs-body` | `AppTokens.fsBody` | 13 / w400 | 正文 |
| `--fs-cap` | `AppTokens.fsCap` | 12 / w600 | 标签/辅助说明 |
| `--fs-mini` | `AppTokens.fsMini` | 11 / w600 | 徽章/状态词/计数 |
| `--fs-micro` | `AppTokens.fsMicro` | 10 / w800 | kicker（字距 +2px） |
| `--fw-reg/med/bold/xbold` | `AppTokens.fwReg/fwMed/fwBold/fwXbold` | 400/600/700/800 | 字重四档 |
| `--font` | `AppTokens.fontFamily` | `-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif` | 正文族 |
| `--font-mono` | `AppTokens.fontMono` | `"SF Mono", Menlo, Consolas, monospace` | deviceId/HEX/错误码/UUID |

行高：标题 1.3 / 正文 1.55（Flutter 经 `height` 参数表达）。UniApp rpx 映射：px × 2（如 `--fs-h1:34rpx`）。

## 4. 间距 Token（4px 基准）

| Token | 值 | UniApp | Flutter |
|---|---|---|---|
| `--sp-1..8` | 4/8/12/16/20/24/28/32 px | `8/16/24/32/40/48/56/64rpx` | `AppTokens.sp1..sp8`（double） |

约定：页面水平 gutter 16；卡片内边距 16；卡片间距 12；卡片组间距 20；导航栏底部 12。

## 5. 圆角 / 阴影 / 层级 / 动效

| 组 | Token | 值 |
|---|---|---|
| 圆角 | `--r-sm/md/lg/xl/round` | 8/12/16/20/999 px（UniApp ×2 rpx；Flutter `AppTokens.rSm…rRound`） |
| 阴影 | `--shadow-1` | `0 1px 2px rgba(16,32,64,.04), 0 4px 12px rgba(16,32,64,.06)`（卡片） |
| | `--shadow-2` | `0 8px 24px rgba(16,32,64,.16)`（弹窗/抽屉） |
| | `--shadow-primary` | `0 6px 16px rgba(27,109,255,.32)`（主按钮） |
| 层级 | `--z-nav/tab/sheet/modal/toast` | 10/20/80/90/100 |
| 动效 | `--dur-fast/--dur/--ease` | 120ms / 200ms / `cubic-bezier(.2,.7,.3,1)`；spinner 800ms linear（唯一动画元素） |

## 6. 旧 iOS 色清理清单（本阶段执行）

以下值在 Token 层**禁止再出现**（系统 UI 除外）：

| 旧值 | 原位置 | 处置 |
|---|---|---|
| `#007AFF` / `#0A84FF` / `#0051D5` | colors.json `primary` 系 | 改为 `#1B6DFF` / `#0E4FC4` 正典 |
| `#34C759` / `#30D158` | colors.json `success` 系 | 改为 `#17C7A8` |
| `#F2F2F7` | colors.json `background` | 改为 `#F8FBFF` |
| `#FF9500`/`#FF3B30`/`#E5E5EA`/`#8E8E93` 等 | colors.json 其余 | 对齐 §2 正典（warning→#FF9F43、error→#F2555F、border→#E3EAF3、textSecondary→#60758D） |

dark 通道：正典无全局深色模式（TOKEN.md §9.4），`colors.json` dark 值 = light 值（`prefers-color-scheme` 变为无操作）。

## 7. UniApp `--ble-*` 别名层（存量兼容）

`styles/design-system.css` 中 `--ble-*` 不再携带自有 hex，逐项指向正典：

| 别名 | 指向 | 备注 |
|---|---|---|
| `--ble-brand` / `--ble-brand-soft` | `var(--c-primary)` / `var(--c-primary-weak)` | 值不变 |
| `--ble-brand-deep` | `var(--c-primary-deep)` | 值 #134dbe → #0E4FC4（圈外值收敛） |
| `--ble-mint/--ble-orange/--ble-red` | `var(--c-success/--c-warning/--c-danger)` | 值不变 |
| `--ble-text` | `var(--c-text)` | 值 #12263f → #18222E（圈外值收敛） |
| `--ble-text-subtle/--ble-text-muted` | `var(--c-mut)` / `var(--c-ph)` | subtle #60758d 不变；muted #93a2b4 → #9AA8B6 |
| `--ble-line*` | `var(--c-line-soft)` 系 | rgba 表达 → 正典实色 |

`uni.scss` 兜底值同步正典（`$uni-color-primary → #1b6dff` 等本已一致；`$uni-text-color` 兜底 #12263f → #18222E）。

## 8. 校验

- `scripts/check-token-usage.mjs`：扫描 U-WX/U-AND/F-AND 业务 UI（uniapp pages/components 的 template/script/style，flutter lib/）圈外 hex 与旧 iOS 色违例；白名单 = 本文件登记值 + 系统 UI 文件（pages.json、tabBar 资产、原生清单）。
- 生成器漂移校验：`design-tokens.json` 重跑后 `git diff` 应为空（产物与源同步）。
