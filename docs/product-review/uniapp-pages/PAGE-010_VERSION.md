# PAGE-010 版本记录

> 路径：`pages/about/version`
> 文件：`apps/uniapp/pages/about/version.vue`
> 审核日期：2026-08-31
> 证据：E0

## A. 用户任务与界面存在必要性

用户任务：看到**与运行时一致**的当前版本，以及带日期的新增/修复/优化历史。

必要性：**保留独立页**。关于页只显示一个 Version 字符串，历史需要空间。

## B. 进入、参数、出口

仅从 PAGE-009「版本记录」。无参数。`onShow` `pageScrollTo(0)`。微信可分享到本 path。

## C. 当前真实内容

硬编码 `versionHistory` 数组，首项：

- `v1.0.5` / `2026-08-29`
- 新增 Smart HID、Profile 契约锁；优化会话；修复空态/广播

其后 v1.0.4～v0.8.0（多为 2024 日期）。每项 type 芯片：新增/优化/修复。

无运行时版本比对，无「当前」标记，无 git commit，无「未发布能力」警告。v1.0.5 文案把 Smart HID/GATT 写得像已完成，与 E5 缺失并存。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 |
|---|---|
| 列表结构 | 保留 |
| 进入回顶 | 保留 |
| 静态数组 | 修改：应由 VERSION/release metadata 驱动 |
| 首项=运行时 | **缺失校验**；package.json 仍 1.0.0 |
| 宣称已完成的能力 | 修改：不得把 UNPROVEN 当已交付 |

## E. 操作表

| 操作 ID | 控件 | 显示 | 禁用 | 行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-033 | 打开本页 | 从关于 | 无 | navigateTo | 首项可见、在顶部 | 版本漂移应为产品 FAIL | 本页 | 无 |
| N/A | 条目点击 | 无链接 | — | 无 | — | — | — | — |
| SHARE | 微信分享 | MP | N/A | 分享本页 | 系统 | N/A | 本 path | 无 |

## F. 状态表

idle 展示。loading/empty/error/permission/unsupported/disconnected/reconnecting/timeout/cancelled = N/A。无空数组处理（永远有硬编码项）。

## G. 字段来源

静态产品配置（写死在 vue）。不是 VERSION 文件，不是 GitHub Release。

## H. 运行链路

无网络、无 BLE。

## I. 依赖

无硬件。发布后应与 GitHub Release / 关于页 / 落地页同一数字。

## J. 第一断点

- P1：三处版本漂移（package 1.0.0 / manifest 1.0.5 / 本页 v1.0.5）。
- P1：首项能力描述高于证据。

## K. 验收

- E4：首项等于关于页运行时版本（当前无自动断言）。
- 发布门禁：四者一致否则 FAIL。

## L. 产品结论

**NEEDS_CHANGE**

保留页面；改为单一版本源；首项声明与证据对齐。

## M. 需要用户决定的问题

1. 版本 SSOT：manifest versionName、独立 VERSION、还是 Git tag？
2. 微信审核版本与 versionFallback 不一致时（开发版 version 为空）如何显示？
