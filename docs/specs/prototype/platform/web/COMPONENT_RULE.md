# COMPONENT_RULE · Web（组件规则）

> 平台设计说明之四 · 2026-09-03

## 1. 设计系统（单一来源 · 字节复制）

`high-fi/assets/{tokens,components,pages}.css`、`high-fi/components/components.js` **字节复制自基准 v1-new**。Web 自身界面不新增任何设计值；组件口径同基准 COMPONENT.md。

## 2. 系统层豁免（web.css）

`high-fi/assets/web.css` 为**浏览器还原层**：窗框地址栏 / 设备选择器弹窗（requestDevice，浏览器渲染、页面不可定制）/ 下载条。色值为 Chrome 风格平台还原值（#1A73EE 系），文件头注声明豁免。另含差异屏辅助类（refbar/difrow/swrow/opt-row，与 app/android.css 同口径复制，走 tokens 变量）。

## 3. Web 特有口径

| 项 | 规则 |
|---|---|
| 域可用性徽章 | 复用基准 `.stword / .st-*`（09_test 状态词）：VERIFIED/UNSUPPORTED/PREVIEW/BLOCKED，语义见 PAGE_SPEC §2 |
| 大屏日志 | W3 日志面板复用 `logPanel(cardv)`；更大屏适配为开发期事项（SOP §12 允许布局调整） |
| 演示数据 | 选择器设备清单 / GATT 树 / 读写值为演示值（PAGE_SPEC §3 登记），开发期以真机为准 |

## 4. 红线

- 缺失域必须显式 ✗ + 指引，禁止半实现或静默隐藏入口（10_platform §7 检查 1）；
- 候选增强（URL 预填）组件位保留拦截提示；
- 环境不满足时不得绕过门禁直接进入功能页。
