# WEB-001 公开落地页

> 文件：`docs/index.md`、`docs/.vitepress/config.mjs`、`docs/.vitepress/theme/style.css`
> 本轮：**只审核不修改**
> 审核日期：2026-08-31
> 证据：E0 源码；`npm run docs:build` exit 0（E3 可构建 ≠ 声明真实）

## A. 用户任务与界面存在必要性

访问者要在一分钟内知道：Smart BLE 是什么、哪个版本可用、能做什么、如何用 ESP32 复现、去哪体验/下载/贡献。

必要性：**保留为对外产品界面**，但当前 IA 与首版主线冲突，必须重写后再发布。

## B. 进入、参数、出口、深链

| 方向 | 事实 |
|---|---|
| 进入 | `https://lightble.i2kai.com/`（og:url）；GitHub Pages workflow；README 徽章也指向 Releases |
| 参数 | 无 |
| 出口 | 站内 product-contract、tutorials、MASTER；GitHub repo/releases |
| 深链 | `#download-hub` |
| 返回 | 浏览器后退 |

无微信二维码、无 APK 直链、无固件包。

## C. 当前真实内容（逐区块）

### 1. Hero（frontmatter）

- 产品名：Smart BLE
- 定位：`跨平台 BLE 控制台与统一协议内核`
- 版本/状态：**无**
- 主 CTA：UniApp 产品规范 → `/product-contract/`
- 次 CTA：快速开始、下载全部平台、架构白皮书 `/MASTER_ARCHITECTURE`
- 图：`/brand/icon.png`

### 2. Signal cards

- **6+ 运行入口**（UniApp、Flutter、Tauri、Electron、Android、iOS 与硬件示例同时维护）
- 1 协议核心
- 4 核心任务（扫描、连接、广播、服务调试）
- SSOT 品牌分发

### 3. Product Story

「不是某一端的 BLE 小工具，而是一整套跨平台调试控制台」；对用户/开发者强调多平台同一工作流。图 `/brand/hero.png`。

### 4. Workflow

Scan → Connect → Inspect（含 OTA）→ Broadcast。无「多设备/日志」「手机广播/OTA」「ESP32 验证」作为独立闭环节点。无 Observer。

### 5. Platform Matrix

| 卡 | Badge | 问题 |
|---|---|---|
| UniApp / 微信 | Public Entry | 角色偏「传播」而非首版主运行时 |
| Flutter | **Mobile Mainline** | 与契约相反 |
| Tauri / Electron | Workbench | 与首版并列 |
| Android 原生 | Native | 非 UniApp Android |
| iOS / macOS | Native | 非首版 |
| ESP32 | Hardware | 未分 Peripheral / Observer |

### 6. Download Hub

四张卡：Android APK、Windows、macOS、源码。前三均 `releases/latest`。文案把 Android 写成「原生入口」。

### 7. Learning Paths

快速上手、广播进阶、**架构白皮书 MASTER**、硬件哲学。旧 MASTER 仍是主要学习 CTA。

### 8. 配置层 Nav / Sidebar / SEO

见基线 §7。OG title「大一统开发库」。Sidebar 虽已有 UniApp 正典分组，首页 Hero 未对齐。

## D. 保留 / 修改 / 删除 / 缺失判断

### 当前保留区块（演进，不换技术栈）

- 产品名 Smart BLE
- 品牌色/图标资产路径
- 指向 `product-contract/` 的入口（应升为主 CTA 之一）
- GitHub social link
- Workflow 四段故事骨架（需改文案与补 ESP32）

### 当前删除区块（公开发布前）

- 「6+ 运行入口」数字卡
- Flutter Mobile Mainline 卡（或改为 Reference 且不可下载）
- 「下载全部平台」CTA
- Windows / macOS 作为主下载卡（无首版产物时）
- 把 Android 下载暗示为 UniApp 的同一 Release（在产物未分离前整卡删除或标 NOT_RELEASED）

### 当前重写区块

- Hero 定位与 tagline
- Product Story
- Platform Matrix 状态词（只允许 VERIFIED/PREVIEW/BLOCKED/UNSUPPORTED/NOT_RELEASED）
- Download Hub
- Learning Paths 优先级（契约/原型/ESP32/证据 > MASTER）
- SEO/OG/description/keywords

### 需要新增区块

- 当前版本 + 公开状态
- 微信二维码/小程序入口
- UniApp Android 真实产物（有 SHA 才显示下载）
- Peripheral 固件与 Observer 固件（或明确 NOT_RELEASED）
- 在线 10 页原型
- 真实截图
- 测试证据摘要
- 已知限制
- Smart HID Profile（PREVIEW，E5 后置）
- 贡献 / Security / License
- 三条 5 分钟路径（微信 / Android / ESP32）

## E. 操作表（公开 CTA）

| 操作 ID | 控件 | 显示 | 禁用 | 行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| WEB-OP-002 | UniApp 产品规范 | 始终 | 无 | 站内 | 契约首页 | 404 即发布失败 | `/product-contract/` | 无 |
| WEB-OP-003 | 下载全部平台 | 始终 | 无 | 锚点 | 滚到三张假下载 | 产物角色错误 | `#download-hub` | 无 |
| WEB-OP-004 | 架构白皮书 | 始终 | 无 | MASTER | 旧文档 | 权威过高 | `/MASTER_ARCHITECTURE` | 无 |
| WEB-OP-016 | Android 下载 | 始终 | 无 | GitHub latest | 可能下到 Flutter APK | 无 UniApp 产物 | 外部 | 无 |
| WEB-OP-017/018 | Win/mac | 始终 | 无 | 同一 latest | 可能 MSI 或空 | 非首版 | 外部 | 无 |
| WEB-OP-019 | 源码 | 始终 | 无 | GitHub | 仓库 | 用户名大小写通常可解析 | 外部 | 无 |
| 学习四卡 | 教程/MASTER/硬件 | 始终 | 无 | 站内 | 页面存在 | 与首版优先级不符 | 站内 | 无 |

无二维码操作。无固件下载操作。

## F. 状态表

| 状态 | 适用 |
|---|---|
| idle | 静态页 |
| loading | VitePress 客户端 hydration；核心内容应无 JS 可读（规范要求） |
| empty | N/A |
| success | 构建成功 ≠ 链接真实 |
| error | 未在页内展示 404/下载失败 |
| permission denied | N/A |
| unsupported | 暗色/键盘：未在本轮做无障碍 E4（记录为 UNPROVEN） |
| disconnected | N/A |
| timeout | 外链 |
| cancelled | N/A |

## G. 字段来源

全部手工写在 `index.md` / `config.mjs`。**不是** release metadata、不是 VERSION、不是测试矩阵。数字「6+」「1」「4」是营销而非证据。

## H. 真实运行链路

作者编辑 md → `npm run docs:build` → `deploy-docs.yml` → GitHub Pages。本轮 build exit 0。下载链路：浏览器 → GitHub Releases（由 `release-build.yml` 在 tag 时上传 Flutter APK + Tauri MSI）。

## I. 依赖

GitHub Releases、lightble.i2kai.com 域名、品牌图、未来微信二维码与 APK/固件存储。ESP32 文档分散在 tutorials/hardware。

## J. 第一断点

- P0：假下载 + 错误主线定位。
- P0：Release 产物与 UniApp 首版不符。
- P1：SEO 大一统。
- P1：缺版本/证据/限制/双模式固件。
- P2：MASTER 优先级；无原型/截图/二维码。

## K. 自动化与真机

- 本轮：VitePress production build PASS。
- 应有未建：链接检查、claim contract test、artifact SHA、QR 可达、og 抓取。
- 手机/桌面/暗色/键盘/alt：本轮未做浏览器矩阵（UNPROVEN）。Hero 图有 alt「Smart BLE Brand Icon」；hero.png alt「Smart BLE product hero」。

## L. 产品结论

**NEEDS_CHANGE**

### E5 前「诚实开发状态」信息架构

1. Hero：开源 BLE 调试工具；**当前主线 UniApp Android + 微信小程序 + LightBLE**；状态 **PREVIEW**；禁止「全平台可用」。
2. 主 CTA：在线原型或产品契约；次 CTA：ESP32 从零构建；GitHub。
3. 平台表：Android PREVIEW、微信 PREVIEW、iOS NOT_RELEASED、H5 UNSUPPORTED（BLE）、其他客户端 REFERENCE。
4. 下载：无真实 UniApp APK 则 **不显示下载按钮**，写 NOT_RELEASED。
5. ESP32：只承诺 Peripheral 源码可构建；Observer NOT_RELEASED。
6. Smart HID：PREVIEW，不作为已验证卖点。
7. 限制：无 E5、OTA 实验、COM3、广播名漂移。

### Release 后最终信息架构

按 `10_LANDING_PAGE_SPEC.md`：版本驱动、三真入口（微信/Android/ESP32）、证据、限制、贡献与许可证。下载只绑定 SHA 产物。

### 假下载 / 错误定位 / 无证据声明（清单）

见 `docs/verification/landing-page-link-and-claim-matrix.md` WEB-OP-001～030。全部不得标 VERIFIED。

## M. 需要用户决定的问题

1. 域名继续 lightble.i2kai.com 还是与 GitHub Pages 统一？
2. 在 E5 完成前，落地页是改成诚实 PREVIEW，还是保持现状但不上正式传播？
3. Flutter/Tauri 下载是否从首页彻底移除，只留「参考实现」文档链？
4. 微信入口：正式码、体验版码还是仅 AppID 文字？
