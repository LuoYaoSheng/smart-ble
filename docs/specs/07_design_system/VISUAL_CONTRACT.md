# VISUAL_CONTRACT —— 三端视觉统一契约

> 2026-09-09 冻结 · UI-PARITY-G0。
> 效力：定义 U-WX / U-AND / F-AND 三端**必须逐像素一致**与**允许平台差异**的边界；对齐基准 = [`prototype/v1-new`](../prototype/v1-new)（P0xx 页面正典）。验收产物：[06_review/UI_G0_P001_ALIGNMENT.md](../06_review/UI_G0_P001_ALIGNMENT.md)。

---

## 1. 一致层（不可漂移）

| 维度 | 规则 | 依据 |
|---|---|---|
| 色彩 | 全部取自 design-tokens.json 分发产物（CSS var / AppTokens）；同语义同值 | TOKEN_REFERENCE §2 |
| 字号/字重/行高 | Token 字阶四档字重；标题 1.3 / 正文 1.55 | TOKEN_REFERENCE §3 |
| 间距/圆角/阴影 | Token 值；组件内几何登记于 COMPONENT_CONTRACT | TOKEN_REFERENCE §4-5 |
| 图标字形 | sprite 35 枚唯一字形；同一使用位同 id、同尺寸档、同语义色 | ICON_CATALOG / ICON_USAGE_MATRIX |
| 组件结构 | 13 正典组件的 DOM/Widget 树顺序、props 语义、状态映射一致 | COMPONENT_CONTRACT |
| 页面骨架 | tab/sub 两型的层级顺序、sticky/fixed 策略、gutter/底 padding | PAGE_LAYOUT_CONTRACT |
| 状态词与文案 | 状态词/按钮文案/空态文案逐字对齐原型（如三态蓝牙词、扫描按钮双态） | PAGE_SPEC / 原型 render |
| 动效 | 仅 spinner 800ms / pulse 1s / 按压 scale(.97) 120ms / 页面 fade 200ms | TOKEN.md §6 |

## 2. 差异层（平台例外白名单）

| 项 | U-WX | U-AND | F-AND | 依据 |
|---|---|---|---|---|
| TabBar 载体 | 原生 tabBar（png 对 + `#1B6DFF`） | 原生/自绘（AppTabBar.vue，字形渲染） | BottomNavigationBar 封装（AppTabBar，字形渲染） | 平台能力；ICON_CATALOG §6 |
| 图标渲染 | data-URI SVG background（无内联 svg 限制） | 同左 | flutter_svg `SvgPicture.string` | 平台限制 |
| 字体族 | 系统栈（`--font` 指定序列） | 同左 | Flutter 默认系（Roboto/PingFang 回退）；等宽 `monospace` 族 | TOKEN_REFERENCE §3 平台映射 |
| 单位 | rpx（px×2） | rpx | 逻辑像素（1:1） | TOKEN.md §8 |
| 状态栏/安全区 | 微信小程序原生处理 | 原生处理 | SafeArea + MediaQuery | PAGE_LAYOUT_CONTRACT §5 |
| 分享/外链等平台交互 | 平台三分支（PATTERN §9） | 同左 | 对应端分支 | PATTERN §9 |

差异层之外的任何视觉分歧均视为**缺陷**，登记入 06_review 对齐差异表并修复。

## 3. 验收方法（每页对齐时执行）

1. **结构比对**：页面区块清单 vs 原型 render() 输出的 DOM 序列（区块顺序、条件渲染分支、事件位）。
2. **样式取值比对**：抽查关键区块的 token 取值（色/字/距/角/影）vs components.css + pages.css。
3. **文案逐字比对**：按钮/状态词/空态文案 vs 原型字符串。
4. **图标位比对**：每个图标位的 id/尺寸/色彩 vs ICON_USAGE_MATRIX。
5. **状态覆盖**：六态模拟（默认/加载/成功/失败/空/权限，PATTERN §3）逐态截图入证据。
6. 产出差异表（`06_review/UI_G0_PXXX_ALIGNMENT.md`）：列「原型 / U-WX / U-AND / F-AND」四列 + 状态列（一致/差异/豁免）。

## 4. 门禁

- `scripts/check-icon-usage.mjs`：无 `Icons.*`/`CupertinoIcons.*`、无 Unicode 字符图标、无未登记图片（业务 UI 范围）。
- `scripts/check-token-usage.mjs`：无圈外 hex（白名单=登记值+系统 UI 文件）；旧 iOS 色（#007AFF/#34C759/#F2F2F7 等）清零。
- Flutter：`flutter analyze` + `flutter test`（widget_test 含 P001 结构与 35 字形锁定）。
- UniApp：`npm run build:mp-weixin` 通过 + `pages/page-flow.test.js` 流程断言。

## 5. 冻结后的变更流程

任何视觉变更（含新增页面）必须：改原型（sprite/tokens.css/页面 js）→ 改 design-tokens.json / ICON_CATALOG → 重跑生成器 → 三端实现同步 → 过 §4 门禁 → 更新对应 ALIGNMENT 文档。禁止单端先行改视觉。
