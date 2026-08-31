# PAGE-009 关于

> 路径：`pages/about/index`
> 文件：`apps/uniapp/pages/about/index.vue` + `config/product.js`
> 审核日期：2026-08-31
> 证据：E0；外链 E4/E5 UNPROVEN

## A. 用户任务与界面存在必要性

用户任务：识别产品名与真实版本、开源定位、**当前平台真实状态**、帮助与反馈、分享。其他小程序推广不得压过产品信息。

必要性：**保留 Tab**。内容必须改。

## B. 进入、参数、出口

Tab 进入。出口：版本记录 PAGE-010；官网/反馈外链或复制；微信跳转其他小程序；分享。

## C. 当前真实内容（从上到下）

1. Logo、`BLE Toolkit+`、`Version {{appVersion}}`、summary「跨平台 BLE 工具…」、芯片「UniApp · Vue 3」「开源跨平台」。
2. **更多小程序**（位置在应用信息之前）：萌喵圈、宝宝点滴。
3. 应用信息：系统平台/版本/型号；功能特性六条（扫描/过滤/连接/读写/通知/广播）；支持平台 chips：Android、iOS、Windows、macOS、Linux、微信小程序。
4. 相关链接：官方网站、版本记录、问题反馈、分享应用。
5. 页脚 © 年 BLE Toolkit+。

**没有**：仓库、文档、ESP32 教程、隐私、安全、许可证、平台限制、H5 不支持 BLE 的说明。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 |
|---|---|
| 品牌+真实版本 | 保留；来源需与 PAGE-010 对齐 |
| 更多小程序 | **下移或删除出首屏**；微信跳转可留在底部 |
| 功能特性 | 修改：与首版 Must 对齐，不暗示 OTA/HID 已验证 |
| 支持平台六端并列 | **删除当前展示**，改为 Android App / 微信 / H5 降级 / iOS 后续 |
| 官网/反馈/分享 | 保留 |
| 仓库/文档/ESP32/License | **缺失，需新增** |
| summary「跨平台」 | 修改为 UniApp 主线 |

官网 `https://lightble.i2kai.com/`；反馈 Gitee issues。微信外链复制。

## E. 操作表

| 操作 ID | 控件 | 显示 | 禁用 | 行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-031-WEB | 官方网站 | 始终 | 无 | App openURL；H5 window.open；微信复制 | 打开或「网址已复制」 | 复制失败系统 | 外部 | 无 |
| OP-033 | 版本记录 | 始终 | 无 | navigateTo version | PAGE-010 | 无 | PAGE-010 | 无 |
| OP-031-FB | 问题反馈 | 始终 | 无 | 同外链 | 复制/打开 | 失败反馈弱 | 外部 | 无 |
| OP-032 | 分享应用 | 始终 | H5 无 share 则复制 | 微信 share menu；App uni.share；H5 navigator.share | 系统 | 降级复制 | 系统 | 无 |
| OP-MP | 其他小程序卡片 | 始终 | 无 appId toast | `navigateToMiniProgram` | 打开 | modal 无法打开 | 其他小程序 | 无 |

## F. 状态表

idle 为主。loading：版本读取 plus 异步。error：跳转失败 modal。unsupported：H5/微信外链降级。其余 N/A。

## G. 字段来源

| 字段 | 来源 |
|---|---|
| 名称/summary/网站/反馈 | `PRODUCT_INFO` 静态 |
| 版本 | App widget / 微信 accountInfo / fallback 1.0.5 |
| 系统信息 | `uni.getDeviceInfo` |
| 平台列表 | `PRODUCT_PLATFORMS` **静态且过宽** |
| 其他小程序 | 配置内 appId/path |

## H. 运行链路

`onLoad` getSystemInfo + getAppVersion。无 BLE。

## I. 依赖

网络仅外链。微信跳转依赖对方小程序与权限。无 ESP32。

## J. 第一断点

- P1：平台 chips 宣称 Windows/macOS/Linux 完整出现在产品页。
- P1：推广区压过产品信息。
- P2：缺 GitHub/ESP32/License；产品名 Mini kicker 与 Smart BLE 混用在其他页。

## K. 验收

- E4：版本号可见、PAGE-010 可进、复制链接、微信跳转失败可见。
- E5：Android 分享、微信正式分享卡片内容。

## L. 产品结论

**NEEDS_CHANGE**

保留页面，重排信息架构，删除未验证平台阵列。

## M. 需要用户决定的问题

1. 其他小程序：删除 / 折叠到页底 / 仅微信显示？
2. 反馈用 GitHub Issue 还是 Gitee（当前 Gitee）？
3. 是否展示尚未发布的 iOS？
