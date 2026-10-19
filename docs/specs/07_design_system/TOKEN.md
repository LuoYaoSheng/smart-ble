# TOKEN —— 设计令牌（全平台共享）

> Design System 三件套之一 · 2026-09-02 冻结 v1.0 · 2026-09-11 升版 v1.1（官网重设计轮：营销字号档与区块节奏档收编，见 §2/§3 与文末变更记录）
> 来源：prototype/v0-old 十色 Token 正式化（HTML_QA_REPORT §14 移交项）+ 商业级扩展。
> 效力：**所有平台（apps/*）与所有原型唯一视觉数值来源**。CSS 实现见 [prototype/v1-new/assets/tokens.css](../prototype/v1-new/assets/tokens.css)；平台实现时按 §8 映射，数值不得另立。

---

## 1. 色彩令牌

### 1.1 品牌与语义色

| Token | 值 | 用途 |
|---|---|---|
| `--c-primary` | `#1B6DFF` | 品牌蓝：主按钮、选中态、链接、TabBar 激活 |
| `--c-primary-deep` | `#0E4FC4` | 主按钮按压态/渐变深端 |
| `--c-primary-weak` | `#E8F1FF` | 主色浅底：选中行、信息条底色、徽章底 |
| `--c-success` | `#17C7A8` | 成功：连接就绪、诊断 ok、READY、广播中 |
| `--c-success-weak` | `#E2F8F4` | 成功浅底 |
| `--c-danger` | `#F2555F` | 危险：断开/停止/移除、错误横幅、失败徽章 |
| `--c-danger-weak` | `#FDEBEC` | 危险浅底 |
| `--c-warning` | `#FF9F43` | 警告：诊断 warn、UUID 非法黄条、OTA 受限预警 |
| `--c-warning-weak` | `#FFF3E4` | 警告浅底 |

### 1.2 中性色

| Token | 值 | 用途 |
|---|---|---|
| `--c-text` | `#18222E` | 主文字 |
| `--c-sub` | `#42536A` | 次级文字（说明行、meta） |
| `--c-mut` | `#60758D` | 弱文字（标签、时间戳、占位外的说明） |
| `--c-ph` | `#9AA8B6` | 占位符/禁用文字 |
| `--c-line` | `#E3EAF3` | 强分割线/卡片描边 |
| `--c-line-soft` | `#EDF2F9` | 弱分割线（行间） |
| `--c-fill` | `#F1F5FB` | 填充底（次按钮、输入框底、返回键底） |
| `--c-bg` | `#F8FBFF` | 页面背景 |
| `--c-card` | `#FFFFFF` | 卡片背景 |

### 1.3 控制台深色（日志/评审面板）

| Token | 值 | 用途 |
|---|---|---|
| `--c-ink` | `#101521` | 控制台底（日志面板深色变体、评审桌面） |
| `--c-ink-line` | `#263149` | 控制台分割线 |
| `--c-ink-text` | `#D6E2F5` | 控制台文字 |

### 1.4 日志六色（F011 通信日志类型色）

| 类型 | 前景色 | 浅底 | 语义 |
|---|---|---|---|
| sys 系统 | `#5E7EA6` | `#EDF3FA` | 系统事件（连接/订阅/重连） |
| err 错误 | `--c-danger` | `--c-danger-weak` | 失败（读写/连接/启停） |
| read 读取 | `#B8860B`→统一 `#C77E14` | `#FFF6E8` | 读特征返回 |
| write 写入 | `--c-primary` | `--c-primary-weak` | 写特征下发 |
| recv 接收 | `#7C5CFF` | `#F0EBFF` | notify 推送 |
| ok 成功 | `--c-success` | `--c-success-weak` | 操作成功 |

## 2. 字体令牌

| Token | 值（375 基准 px） | 用途 |
|---|---|---|
| `--fs-display` | 24 / 800 | 品牌卡标题 |
| `--fs-title` | 20 / 800 | tab 页导航标题 |
| `--fs-h1` | 17 / 700 | 二级页标题、卡片组标题 |
| `--fs-h2` | 15 / 700 | 卡片标题、按钮主文案 |
| `--fs-body` | 13 / 400 | 正文、列表 meta |
| `--fs-cap` | 12 / 600 | 标签、chips、辅助说明 |
| `--fs-mini` | 11 / 600 | 徽章、状态词、计数 |
| `--fs-micro` | 10 / 800 | kicker（字距 +2px）、评审面板 pid |

营销档（v1.1 收编，**仅官网/落地页营销区专用**，App 界面不得使用）：

| Token | 值 | 用途 |
|---|---|---|
| `--fs-display-lg` | `clamp(36px, 5vw, 58px)` / 800 / 行高 1.08 / 字距 -0.04em | 官网 Hero 主张 |
| `--fs-display-md` | `clamp(28px, 4vw, 42px)` / 800 / 行高 1.04 / 字距 -0.03em | 官网区块标题 |

字体族：`-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif`；等宽（deviceId/HEX/错误码）：`"SF Mono", Menlo, Consolas, monospace`（class `.mono`）。行高：标题 1.3 / 正文 1.55。

## 3. 间距令牌（4px 基准）

`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24 · `--sp-7` 28 · `--sp-8` 32

区块节奏档（v1.1 收编，**仅官网/落地页面区块级间距**，组件内部间距仍用 `--sp-*`）：

`--sec-md` 48 · `--sec-lg` 64 · `--sec-xl` 96（px；移动端可降半使用）

约定：页面水平 gutter = 16；卡片内边距 = 16；卡片间距 = 12；卡片组间距 = 20；导航栏底部 = 12。

## 4. 圆角与阴影

| Token | 值 | 用途 |
|---|---|---|
| `--r-sm` | 8 | 小件：chips、输入框、返回键 |
| `--r-md` | 12 | 按钮、日志行、诊断行 |
| `--r-lg` | 16 | 卡片 |
| `--r-xl` | 20 | 弹窗、大动作卡 |
| `--r-round` | 999 | 徽章、pill 按钮、头像 |
| `--shadow-1` | `0 1px 2px rgba(16,32,64,.04), 0 4px 12px rgba(16,32,64,.06)` | 卡片 |
| `--shadow-2` | `0 8px 24px rgba(16,32,64,.16)` | 弹窗/底部抽屉 |
| `--shadow-primary` | `0 6px 16px rgba(27,109,255,.32)` | 主按钮 |

## 5. 层级（z-index）

`--z-nav:10`（sticky 头） · `--z-tab:20` · `--z-sheet:80`（底部抽屉） · `--z-modal:90` · `--z-toast:100`

## 6. 动效令牌（仅 opacity/transform，全平台可实现）

| Token | 值 | 用途 |
|---|---|---|
| `--dur-fast` | 120ms | 按键按压、折叠 |
| `--dur` | 200ms | 弹窗进出、页面切换 fade |
| `--ease` | `cubic-bezier(.2,.7,.3,1)` | 通用 |
| spinner | 800ms linear 无限旋转 | 内联加载（唯一动画元素） |

禁止：路径动画、滤镜特效、视差、未知字体/图标服务加载动画。

## 7. 图标与插图

- **图标**：24×24 线性 SVG（stroke 1.8 / round / `currentColor`），内联 `<symbol>` sprite，命名 `i-*`（见 v1-new index.html）。约 30 枚，全自包含，无外部图标服务。
- **插图**：空态几何线稿 SVG 4 幅（雷达=扫描空、链环=无连接、信号塔=广播空、档案=无版本记录），品牌蓝+薄荷双色点缀，120×88。仅用于 empty-state，不用于装饰。

## 8. 平台映射（数值唯一，单位映射）

| 平台 | 映射规则 |
|---|---|
| 微信小程序 / uni-app | px × 2 → rpx（750 设计稿）；CSS var → `uni.scss` `$c-primary` 等同名 SCSS 变量 |
| Web (React/Vue) | 直接使用 CSS 变量（tokens.css 原样引入） |
| Flutter | px → 逻辑像素（1:1）；Token → `ThemeData` colorScheme/TextTheme 常量类 `AppTokens` |
| Desktop (Tauri/Electron) | 同 Web；原生窗口字体栈按 OS 取系统默认，色彩不变 |
| iOS 原生 | px → pt（1:1）；UIColor hex 直读 |

## 9. 使用规则

1. 任何界面颜色/字号/间距/圆角只能引用本表 Token；圈外值视为违例（QA §14 收敛项）。
2. 语义色不得混用：危险操作一律 danger，不得用 warning 代替；成功态一律 success（薄荷绿），不得用品牌蓝。
3. 文本对比度：`--c-text/--c-sub` 用于可读正文；`--c-mut` 仅限 ≥12px 辅助信息；`--c-ph` 仅占位/禁用。
4. 深色仅用于控制台场景（日志深色变体/评审桌面），不做全局深色模式。
5. 营销档（`--fs-display-lg/md`、`--sec-*`）仅限官网/落地页营销区与区块节奏；App 界面一律使用 §2/§3 基础档。

---

## 变更记录

- **v1.1（2026-09-11）**：官网产品化重设计轮（docs/plans/2026-09-11-website-product-redesign-design.md §6）——收编 style.css 登记例外 ①（营销展示字号 42/58px 上限 → `--fs-display-lg/md`）与 ②（区块节奏间距 36–96px → `--sec-md/lg/xl`）；限定营销档使用范围（规则 5）。原 2026-09-11 落地页收敛轮（verification/web-ui-conv/20260911-landing/REPORT.md）的登记例外自此清零。
- **v1.0（2026-09-02）**：首次冻结。
