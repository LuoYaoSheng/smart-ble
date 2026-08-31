# WEB-001 落地页声明、入口与证据矩阵

> 状态：G1/G2 已对照 `docs/index.md` 与 `docs/.vitepress/config.mjs` 全文
> 更新：2026-08-31
> 原则：每个公开声明必须有事实源；每个 CTA 必须有真实目标；没有产物时不得显示成可下载。
> 公开状态只使用：VERIFIED / PREVIEW / BLOCKED / UNSUPPORTED / NOT_RELEASED

| ID | Section | Claim / CTA | 当前内容 | 事实源 | 当前证据 | 目标公开状态 | 目标链接/产物 | 自动化 | 当前状态 | 第一断点 |
|---|---|---|---|---|---|---|---|---|---|---|
| WEB-OP-001 | Hero | 产品定位 | 跨平台 BLE 控制台与统一协议内核 | `01_PRODUCT_SCOPE.md`、总计划 | 与 UniApp 首版主线冲突 | PREVIEW | 契约/当前版本 | 文案 contract test | FAIL | 仍以多平台大一统为主定位 |
| WEB-OP-002 | Hero | 主 CTA | UniApp 产品规范 | `docs/product-contract/` 存在 | E0 站内；E3 可构建 | PREVIEW | `/product-contract/` | link check | UNPROVEN | 正式体验/下载尚未建立 |
| WEB-OP-003 | Hero | 下载全部平台 | `#download-hub` | Release manifest 不存在 | 无对应完整产物 | NOT_RELEASED | 仅真实产物 | artifact/link test | FAIL | CTA 承诺高于当前交付 |
| WEB-OP-004 | Hero | 架构白皮书 | `/MASTER_ARCHITECTURE` | 当前正典是 product-contract | 历史文档仍可打开 | PREVIEW | 契约优先 | link/authority | FAIL | 旧文档优先级过高 |
| WEB-OP-005 | Signal | 6+ 运行入口 | 多平台同时维护 | Repo tree | 不代表可用和主线 | NOT_RELEASED | 平台状态区 | claim test | FAIL | 数字误导完整支持 |
| WEB-OP-006 | Product Story | 多平台统一工作流 | 所有端同一产品 | 首版边界 | 其他端未进首版 E5 | PREVIEW | UniApp+ESP32 闭环 | claim test | FAIL | 主故事与首版冲突 |
| WEB-OP-007 | Workflow | Scan | 扫描流程 | PAGE-001/矩阵 | E0–E1，E5 待定 | 由 evidence 决定 | PAGE-001 | evidence mapping | UNPROVEN | |
| WEB-OP-008 | Workflow | Connect | 连接流程 | PAGE-006 | E0–E1 | 由 evidence 决定 | PAGE-006 | evidence mapping | UNPROVEN | |
| WEB-OP-009 | Workflow | Inspect | GATT/日志/OTA | PAGE-006 | OTA E5 未完成且 BLOCKED | PREVIEW/BLOCKED | PAGE-006 | evidence mapping | UNPROVEN | OTA 不得标已验证 |
| WEB-OP-010 | Workflow | Broadcast | 手机广播 | PAGE-008 | 无 Observer 固件 | PREVIEW | PAGE-008/Observer | evidence mapping | UNPROVEN | Observer BLOCKED |
| WEB-OP-011 | Platform | UniApp/微信 | Public Entry | `05_PLATFORM_MATRIX.md` | 首版主线，无版本/证据 | PREVIEW | App/小程序入口 | status mapping | UNPROVEN | 需版本和证据 |
| WEB-OP-012 | Platform | Flutter | Mobile Mainline | 旧多端定位 | 非当前主线 | REFERENCE | 参考实现文档 | claim test | FAIL | 当前标签错误 |
| WEB-OP-013 | Platform | Tauri/Electron | Workbench | 旧多端定位 | 非首版 | REFERENCE | 参考文档 | claim test | NEEDS_CHANGE | 不应与首版并列 |
| WEB-OP-014 | Platform | Native Android/iOS | Native | 旧多端定位 | 非首版 | REFERENCE/NOT_RELEASED | 参考说明 | claim test | NEEDS_CHANGE | |
| WEB-OP-015 | Platform | ESP32 | Hardware | `06_ESP32_REFERENCE.md` | 仅 Peripheral 源码；无 Observer | PREVIEW/BLOCKED | 固件/教程/证据 | artifact/evidence | UNPROVEN | 仅旧示例；广播名漂移；COM3 |
| WEB-OP-016 | Download | Android APK | Releases latest | `release-build.yml` 构建 **Flutter APK** | 链接不能证明是 UniApp | NOT_RELEASED | 实际 UniApp APK+SHA | SHA/download | FAIL | 产物角色错误 |
| WEB-OP-017 | Download | Windows | 同一 latest | 首版范围 | 非首版；workflow 出 MSI | NOT_RELEASED | 不作为主下载 | link/claim | FAIL | 假主下载 |
| WEB-OP-018 | Download | macOS | 同一 latest | 首版范围 | workflow **不构建 macOS** | NOT_RELEASED | 不作为主下载 | link/claim | FAIL | 假主下载 |
| WEB-OP-019 | Download | 源码与文档 | `github.com/luoyaosheng/smart-ble` | 远端 `LuoYaoSheng/smart-ble` | 仓库存在；本轮未 HTTP 探测 | VERIFIED（仓库） | GitHub | link check | UNPROVEN | 需实际链接测试 |
| WEB-OP-020 | Quick Start | 微信 5 分钟 | 首页缺失 | AppID `wxf6c58b1dcac4c82d` | 无二维码 | PREVIEW | QR/步骤 | QR/link | NEEDS_CHANGE | 缺入口 |
| WEB-OP-021 | Quick Start | Android 5 分钟 | 缺失 | 无 UniApp artifact | 待发布 | PREVIEW | APK/安装 | download smoke | NEEDS_CHANGE | 缺入口 |
| WEB-OP-022 | Quick Start | ESP32 5 分钟 | 分散在 tutorials/hardware | Fixture docs | 未新电脑复现；pio 本机未装 | PREVIEW | 固件/源码/教程 | clean-machine | NEEDS_CHANGE | COM3；无 README |
| WEB-OP-023 | Prototype | 在线 10 页原型 | 首页无链接 | `docs/prototypes/unified-device-discovery.html` | 仓库内有，未上导航 | PREVIEW | 原型 URL | Playwright/link | NEEDS_CHANGE | |
| WEB-OP-024 | Screenshots | 真实 App 截图 | `/brand/hero.png` 概念图 | E4/E5 | 待生成 | PREVIEW | 实际截图 | asset check | NEEDS_CHANGE | |
| WEB-OP-025 | Evidence | 版本/commit/设备/run | 缺失 | release metadata 未建 | 无 | VERIFIED/PREVIEW | evidence page | schema/link | NEEDS_CHANGE | |
| WEB-OP-026 | Limitations | 已知限制 | 缺失 | 本基线 P0/P1 | 待建立 | 必有（非 VERIFIED 词） | limitations | schema | NEEDS_CHANGE | |
| WEB-OP-027 | Smart HID | 第一方 Profile | 产品故事弱 | HID 四页+契约锁 | 页面有，E5 后置 | PREVIEW | Profile 说明 | evidence mapping | NEEDS_CHANGE | |
| WEB-OP-028 | Contribute | Issue/Profile/Test | 分散；首页无 | CONTRIBUTING_GUIDE 在 sidebar | 部分存在 | VERIFIED | GitHub/指南 | link | NEEDS_CHANGE | |
| WEB-OP-029 | Security/License | Security/MIT | 首页无显著入口 | 待核 LICENSE/SECURITY 文件 | 本轮未打开 LICENSE 正文 | VERIFIED | 对应文档 | link | NEEDS_CHANGE | 不在本轮改首页 |
| WEB-OP-030 | SEO/OG | title/description/image/url | 大一统开发库；og:url lightble.i2kai.com | `config.mjs` head | 与首版冲突 | PREVIEW | 产品版本 metadata | metadata test | FAIL | 仍传播旧定位 |
| WEB-OP-031 | Nav | 导航四项 | 首页/契约/上手/MASTER | config nav | E0 | PREVIEW | 加原型/ESP32/GitHub 产品向 | nav test | NEEDS_CHANGE | MASTER 仍在 Nav |
| WEB-OP-032 | Sidebar | UniApp 正典分组已在前 | 后接 Flutter/Tauri 教程 | config sidebar | E0 | PREVIEW | 参考实现折叠 | structure test | NEEDS_CHANGE | 首页未跟随 sidebar 优先级 |
| WEB-OP-033 | Workflow 缺口 | 发现→…→ESP32 | 无多设备、无 ESP32 验证步、无 Observer | `10_LANDING_PAGE_SPEC.md` | 文案缺口 | PREVIEW | 闭环图 | content test | NEEDS_CHANGE | |
| WEB-OP-034 | CI/Release | 发布构建 | tag 出 Flutter+Tauri | `release-build.yml` | 与下载文案绑定 | NOT_RELEASED | 改为 UniApp+固件 | workflow audit | FAIL | 本轮不改 workflow |
| WEB-OP-035 | a11y | 键盘/焦点/暗色/alt | icon/hero 有 alt | 规范要求 | 本轮未做浏览器矩阵 | PREVIEW | 无障碍检查 | Playwright | UNPROVEN | |

## 发布阻断规则

以下任一成立时，WEB-001 不得标 `VERIFIED`：

- Android 下载没有对应 UniApp 产物和 SHA。
- 微信二维码无法进入正确小程序/页面。
- Peripheral/Observer 固件不可下载或无法从零复现。
- 平台状态高于 Android/微信 E5 结果。
- OTA 没有设备 success 与版本回读却标已验证。
- 下载卡片指向无关或旧客户端产物。
- release version、commit、关于页、版本页和首页不一致。
- 关键链接、二维码或下载文件 404。

## 本轮未做（不得写成 PASS）

- 未 HTTP 探测 GitHub Releases 是否 200。
- 未验证二维码（不存在）。
- 未在浏览器做手机/桌面/暗色/键盘走查。
- 未修改 `docs/index.md` 或 VitePress 配置。
