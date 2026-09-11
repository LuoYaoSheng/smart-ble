# Web 端 UI 规范审计与收敛 · 2026-09-11

> 任务书（用户）：「我发现 web端，有些没按规范来做，就是基础的UI设计规范，最好移动端也一起分析下。」
> 规范正典：`docs/specs/07_design_system/`（TOKEN.md 冻结 v1.0 + DESIGN_SYSTEM_INDEX 冻结规则：圈外色 / Unicode·emoji 图标 / 自定尺寸三类红线）。
> 审计对象：① Web 端 = lightble.i2kai.com 落地页（docs/.vitepress）+ Web 原型线（specs/prototype/platform/web）；② 移动端 = uniapp 双门禁 + flutter + Apple 双线 + app/wechat 原型。

---

## 0. 结论速览

| 线 | 判定 | 一句话 |
|---|---|---|
| **落地页（部署 Web 端）** | **主违例面，已修复** | 自定义主题整体游离设计系统（自造色板/圆角/字号/阴影），且**站点构建链自 09-09 起全断**（线上部署事实中断）——本轮 token 化重构 + 构建修复，双 PASS |
| Web 原型线 | 基本干净，2 处死代码漂移已清 | CSS/JS 与正典 v1-new 现已字节对齐 |
| 移动端实现（uniapp/flutter/Apple） | **门禁全绿，零违例** | icon 门禁 PASS、token 漂移 0、Apple 8/8 同步 |
| 移动端原型（app/wechat） | 干净 | 三份 CSS 与正典逐字节一致 |
| 正典自身 | 1 处在册残留（登记待裁决） | v1-new stepper 完成态 Unicode `✓` 与规范规则 2 自矛盾 |

---

## 1. W 线登记册（Web 端）

### W-1【已修 · 主项】落地页主题全面脱标 → token 化重构
`docs/.vitepress/theme/style.css`（部署于 lightble.i2kai.com）为 VitePress 默认主题 + 自造 `smartble-*` 皮肤，三类红线全踩：

| 类 | 违例值（修前） | 处置（修后） |
|---|---|---|
| 色彩 | 品牌浅阶 `#2f87ff`/`#56a9ff`/`#1558d1`/`#0f43a3`；正文 `#13243d`；次级 `#60758f`（且是 `--c-mut #60758D` 的手误变体）；背景 `#f4f8ff`/`#eaf2fc`；卡线 `rgba(19,64,126,.1)`；徽章 Material 系 `#b71c1c`/`#5d4037`/`#555`/`#777` | 全部收编 token：`--c-primary`/`--c-primary-deep`/`--c-text`/`--c-sub`/`--c-bg`/`--c-fill`/`--c-line`；徽章语义化（preview→primary 族 / not-released→fill+mut / blocked→danger 族 / reference→warning 族，`#C77E14` 为正典衍生警告文字色，与 v1-new components.css chip.warning 同源） |
| 圆角 | 18/22/26/32/36px 全脱阶（token 上限 r-xl=20） | 卡片/图 `--r-xl`、状态带 `--r-lg`、胶囊 `--r-round` |
| 字号 | 13/14/16/17/18/20/22/34px 及 clamp 上限 42/58px 脱阶 | 收编 `--fs-*` 阶梯（见例外 ①） |
| 阴影 | `0 18px 44px`/`0 24px 60px`/`0 26px 60px`/`0 14px 34px` 自造 | `--shadow-1`/`--shadow-2`/`--shadow-primary` |
| 动效 | `0.22s ease` | `--dur` `--ease` |
| 图标 | `.smartble-platform-icon`/`.smartble-download-icon` 为 font-size 式文本图标位（**无消费者的死规则**） | 删除 + 注释登记（卡片图标回归须走 ICON_CATALOG SVG） |

重构方式：文件头建立「设计令牌投影」块（SSOT 指向 TOKEN.md / design-tokens.json），VitePress `--vp-c-brand` ramp 全部映射 token。视觉验证：本地构建 + 无头截图（before/after 各 2 帧，见本目录），AI 视觉审查 PASS（无排版破损、品牌蓝统一、状态徽章语义分明、导航链接对比度正常）。

### W-2【已修 · 阻断级】docs 站构建链自 2026-09-09 起全断
`npm run docs:build` 三类连环错误（deploy-docs.yml 触发即挂 → **线上 Pages 部署事实中断**，用户看到的站点是最后一次成功部署的旧快照）：
1. `docs/plans/2026-09-09-windows-first-mac-followup-development-plan.md`：`StateFlow<ProvisionUiState>`、`values-<locale>` 未包反引号 → Vue SFC 判未闭合标签 → 修复（包 code span，零语义变化）；
2. `docs/specs/08_development/PERMISSION.md:76`：表格单元裸 `AppError{layer: …}` → Vue 表达式解析劫持 → 修复（包 code span）；
3. 66 个「目录指针/源码指针」死链（specs 溯源写法，如 `[02_product](../02_product/)`、指向 docs 外的 `app_icons.dart`）→ config 增加定向 `ignoreDeadLinks`（仅豁免目录/源码指针形态，**不掩盖指向具体 .md 的真实死链**）。

修后 `docs:build` 全绿（本目录 4 帧截图即本地构建产物渲染）。

### W-3【登记 · 待裁决】营销展示型字号超阶
hero clamp 上限 42/58px 超 token 阶梯上限（`--fs-display` 24px）。本轮以 `clamp(var(--fs-display), …, 42/58px)` 锚定下限，上限保留为登记例外——建议 07_design_system 增设营销阶梯（如 `--fs-display-lg`）后回填。同登记：区块节奏间距 84/88/96px（4px 网格对齐，超命名令牌上限 32px）。

### W-4【已修】Web 原型 pages.css `.brandcard` 死块
正典 v1.0.8（2026-09-04 用户走查「功能第一」裁决）已从基准删除 `.brandcard`（全宽渐变横幅 + 装饰圆），三壳同步清除、Web 壳当时声明「无 P009 不涉及」——**但 Web 壳 pages.css 实际残留全套 5 条规则**（含圈外 hex `#3F86FF`）。本轮删除 + 墓碑注释。

### W-5【已修】Web 原型 components.js devCard 未同步修正①
2026-09-03 走查修正①（SHID 卡保留标准连接入口 + 叠加配置入口，产品模型 §0）已同步 app/wechat/desktop 三壳，Web 壳的 `C.devCard` 仍是旧版二选一分支。该函数在 Web 为死代码（web.js 用本地 `webDevCard`，其双入口实现正确），但属潜在地雷。本轮与正典**字节对齐**（diff = 0）。

### W-6【豁免登记】Web 原型系统层还原值
`⋮` 窗框字符、红绿灯 `#FF5F57/#FEBC2E/#28C840`、Chrome 还原色 `#1A73EE/#F8F9FA/#5F6368/#202124` 等——web.css 头注声明的「平台还原层」（浏览器/OS 系统层还原，非 Web 业务界面），按既有口径豁免。

---

## 2. M 线登记册（移动端）

| # | 项 | 判定 | 证据 |
|---|---|---|---|
| M-1 | uniapp 图标门禁 `check-icon-usage` | **PASS** | dart 63 文件 + vue 33 文件 · 目录 35 枚 · 镜像同步 |
| M-2 | uniapp token 门禁 `check-token-usage` | **PASS** | 登记色 49 · banned 14 清零 · LEGACY_DRIFT 0 |
| M-3 | Apple 双线 token 门禁 `check:apple-tokens` | **PASS** | 8 输出逐字节 in-sync（uniapp/flutter/iOS/macOS 全族） |
| M-4 | flutter 硬编码 `✓` 扫描 | 非违例 | 唯一命中为 hid_diagnostics_page.dart:288 **退役记录注释**（UI-G2 已换 B7 stIcon 五态） |
| M-5 | app/wechat 原型 CSS | 与正典**逐字节一致** | tokens/components/pages 三文件 diff=0；devCard 修正① 三壳均已同步 |
| M-6 | 平台协议 parity 门禁 | PASS | js 71/71 · dart 59/59 · swift 32/32（kotlin BLOCKED 为在册 JDK 环境状态） |

**移动端结论：实现与原型两层均无脱标。** 用户对移动端的担忧可以放下——前三轮 UI-CONV 收敛（LEGACY_DRIFT 清零 + Apple 钉子）后的门禁体系仍在全绿状态。

---

## 3. C 线（正典自身，登记待裁决）

- **C-1**：v1-new `components.js:121` stepper 完成态用 Unicode `✓` 作图标，与 TOKEN.md 规则 2（禁 Unicode 字符图标）自矛盾；实现侧（uniapp/flutter）已无 `✓`，仅原型正典残留。修复涉及「基准+四壳字节重同步 + ?v= 戳」既定流程，不本轮单方面改——登记待下轮正典维护批量处理。

---

## 4. 变更清单

| 文件 | 变更 |
|---|---|
| `docs/.vitepress/theme/style.css` | token 化重构（含令牌投影块 + 死规则清理 + 例外登记头注） |
| `docs/.vitepress/config.mjs` | 定向 ignoreDeadLinks（目录/源码指针豁免，附原因注释） |
| `docs/plans/2026-09-09-windows-first-mac-followup-development-plan.md` | 2 处泛型/占位符包反引号（构建修复，零语义变化） |
| `docs/specs/08_development/PERMISSION.md` | 1 处 `AppError{…}` 包反引号（构建修复） |
| `docs/specs/prototype/platform/web/high-fi/assets/pages.css` | 删 .brandcard 死块（+墓碑注释） |
| `docs/specs/prototype/platform/web/high-fi/components/components.js` | devCard 与正典字节对齐 |
| `verification/web-ui-conv/20260911-landing/` | 本报告 + 4 帧证据截图（落地页 before/after × 全页/内容页）+ web 原型冒烟帧 |

## 5. 验证记录

- `npm run docs:build`（docs/）：修前 ✖（3 类错误）→ 修后 ✔ 全绿。
- 视觉：无头 Playwright 截图 before/after 各 2 帧；AI 视觉审查双 PASS（首页 + 内容页）。
- Web 原型：改动后冒烟渲染 console 0 error（web-proto-smoke.png）。
- 移动端门禁：§2 表格全 PASS 原样复跑。
- 注：线上 lightble.i2kai.com 要吃到本次修复需推送触发 deploy-docs.yml（**推送仍待用户放行**）。

## 6. 铁律遵守

全程无窗口置前/无合成点击（用户在用机）：渲染验证走本地 http.server + Playwright 无头通道；CDN 上传仅限本目录证据截图（Read 工具自动行为，4 帧，均为站点渲染内容，无桌面/隐私内容）。

---

# 第二轮：全维度收敛（间距 / 边角 / 圆角 / 字号 / 行高）· 2026-09-11 下午

用户复核指出：UI 设计规范不止配色——间距、边角、圆角等维度同受 TOKEN.md 约束（§2 字号/§3 间距 4px 网格/§4 圆角阴影；红线 3）。本轮按全维度重审。

## 7. 机制根因

- `check-token-usage.mjs` 只锁**色彩**（hex/banned/rgba + 4 值抽检）——间距/圆角/字号**无机器门禁**，红线 3 长期裸奔，页面半档值（10.5/11.5/12.5px、圆角 11/14px）静默漂移。
- 合规口径澄清：白名单 = design-tokens.json SSOT（font/space/radius 段）∪ **契约登记内部值**（COMPONENT_CONTRACT/PAGE_LAYOUT_CONTRACT/v1-new 实现：btn 18/13、chip 2/9、badge 3/10、modal 标题 16、TabBar 角标 9、信号条圆角 1、seg 段钮 7 等）。正典组件里的非网格值多数有登记出处，非违例。

## 8. 违例登记（W-7 系）

| # | 面 | 事实 | 处置 |
|---|---|---|---|
| W-7 | 落地页 style.css（上轮遗留） | 间距非网格值 10/14/6/2px；硬编码 8/4px；行高 1.65/1.7/1.8 ≠ 正典 1.55；kicker 用 fs-cap 而非正典 fs-micro 档；投影缺 --fs-micro/--r-sm/--dur-fast | 全清：非网格归 0；间距全 token 化；行高归 1.55（展示型行高入例外①）；kicker 归 fs-micro/800/+2px；三令牌补投影；例外头注扩至④条 |
| W-8 | uniapp 存量页面 7 文件（about×2/broadcast/hid×3/device） | 半档 rpx 漂移：21/23/25/27/28rpx 字号、22/28rpx 圆角、999rpx 手写 pill、9px 小字 | 纯值归一（不动 --ble-* 架构）：→ 22/24/26/30rpx 阶梯；圆角 → 24/32rpx；999rpx → var(--r-round)；deviceId → fs-micro；输入框 → r-sm；9px 小字 → 10px |
| W-9 | flutter 页面 7 文件 | 圆角 10/11/14 漂移；字号 14 游离；垂直距 26；4 处 16 字号角色错位 | 输入/下拉 10→8（r-sm）；卡 14→16（r-lg）；logo 11→12（r-md）；14→13（body）；26→24（sp-6）；16 按角色归 17（页题）/15（设备名/计数）；modal 标题 16 为契约登记值保留 |
| W-10 | design-system.css（别名层） | rpx 半档值 + 999rpx ×5 | 不动（DESIGN_SYSTEM_INDEX §5 存量登记，随页面迁移退役）；门禁归 report-only |

## 9. 新增机器门禁（红线 3 补钉）

- **`scripts/check-dimension-usage.mjs`** + `npm run check:dimensions`：间距/圆角/字号三维度静态扫描（rpx÷2 折算；em/% 跳过；var() 引用不检；@generated 段跳过）。
  - enforce：uniapp pages/components-ui/tokens.css + flutter ui/design/ui/pages/themes + docs 主题。
  - report-only：存量别名层/存量组件/widgets + v1-new 正典（校准靶，预期零未登记）。
  - 白名单：SSOT json 派生 ∪ 契约登记值集合（逐值带出处注释）；落地页例外文件级注入。
- DESIGN_SYSTEM_INDEX §3 门禁行已登记本门禁。
- 校准记录：正典校准靶首轮 10 命中经逐行核实全部有契约/正典出处 → 入白名单（1/7 圆角、9/16 字号、2.5/36/40/60 间距等）。

## 10. 验证记录（第二轮）

- `npm run check:dimensions`：修前 enforce 112 处违例 → 修后 **0 处（PASS）**；report-only 残留 = 存量组件 + 正典预览壳内部值（46/37/3 手机壳圆角等，登记性质）。
- `flutter analyze`（apps/flutter）：**No issues found!**（纯值替换无语法破坏）。
- `npm run docs:build`：✔ 全绿；无头截图 3 帧（dimension-after-home/content/platform）console 0 error；AI 视觉复核 PASS（全页帧曾报卡片文案「…」疑点，经源文件 grep 无省略号 + 局部高清帧复核确认系全页图缩放误读，文字完整）。
- 上轮三道门禁（icon/token/apple-tokens）口径不受影响（本轮零色彩改动）。

## 11. 遗留登记

- 存量组件（uniapp common/scan/hid、flutter widgets）仍有 report-only 维度值——随 UI-PARITY 组件迁移退役，不单独清洗。
- flutter 页面 fontSize 16（modal 标题契约档）现为全局白名单值，理论上可被页面挪用；phase-1 接受，phase-2 可收窄为文件级豁免。
