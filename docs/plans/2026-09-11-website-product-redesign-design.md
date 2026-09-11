# 官网产品化重设计（lightble.i2kai.com）· 设计文档

> 日期：2026-09-11
> 状态：待用户评审
> 范围：`docs/index.md`、`docs/en/index.md`（新增）、`docs/status/index.md`（新增）、`docs/.vitepress/config.mjs`、`docs/.vitepress/theme/`、`docs/public/`（新增素材）、`docs/specs/07_design_system/TOKEN.md`（v1.0 → v1.1）
> 技术路线：VitePress 同栈深化（方案 A），部署链零改动

## 1. 背景与问题

官网 `https://lightble.i2kai.com/`（VitePress，部署于 GitHub Pages）当前信息架构为 2026-08-31 WEB-001 评审后按"E5 前诚实状态"重写的版本。问题：

- 观感是**内部工程状态看板**而非产品官网：九宫格平台状态矩阵、七张流程状态卡、四张禁用下载卡、内部术语（E5/E6、TP-G2-R1、Gap Summary、Remediation Order、artifacts=[]）全部堆在首页
- 视觉层：单一蓝色滥用（品牌色/链接/徽章/CTA/图标同色）、徽章密度过高、hero 层级崩坏（版本号占据 H1 位）、卡片密度 25+ 无留白节奏
- 主 CTA 指向内部规范而非产品动作
- 无真实产品截图、无 sitemap/robots/结构化数据

## 2. 决策记录（用户已确认）

| # | 决策 | 选择 |
|---|---|---|
| D1 | 站点定位 | 产品化官网（面向外部访客讲产品价值） |
| D2 | 首页架构 | 产品叙事 + 工程状态收纳到独立 `/status` 子页 |
| D3 | 范围 | 首页 + 全站外壳（导航/页脚/文档页框架统一） |
| D4 | 素材 | 真机截图（项目内现成）+ 生成氛围图（仅装饰） |
| D5 | 语言 | 首页中英双语，文档保持中文 |
| D6 | 技术路线 | 方案 A：VitePress 同栈深化（否决 Astro 换栈） |

## 3. 信息架构

```
/            产品化首页（中文，layout: home）
/en/         产品化首页（英文，结构与中文一致）
/status/     项目状态与路线图（工程状态全量，中文）
/specs/ /tutorials/ 等   现有文档 URL 全部保留，不动
```

顶部导航（全站统一）：`Logo + Smart BLE` ｜ 功能（首页锚点）｜ 文档 ｜ 状态 ｜ GitHub（外链图标） ｜ 中/EN 切换。

## 4. 首页分区规格（/ 与 /en/）

自上而下七个区块：

| # | 区块 | 内容 | 要点 |
|---|---|---|---|
| 1 | Hero | 产品主张大标题（营销字号档）+ 一句话价值说明 + 主 CTA「快速开始」→ `/tutorials/01_introduction_and_setup` + 次 CTA「GitHub」+ 低调版本徽章 `v1.0.5 · PREVIEW` | 右侧真机截图组合视觉 + 生成氛围背景；版本徽章是首页唯一徽章 |

Hero 文案草案（实施时可润色，语义不得越诚实红线）：
- 中文主张：`一套工具，调通每一台 BLE 设备`；价值说明：`扫描、连接、读写、订阅、广播与 ESP32 验证，收进同一条工作流。`
- 英文主张：`One toolkit to debug and verify every BLE device`；价值说明：`Scan, connect, read, write, subscribe, broadcast — and verify on real ESP32 hardware.`
| 2 | 能力区 | 6 卡产品语言：扫描与广播解析 / 连接与服务发现 / 读写与订阅 / 多设备与日志 / 手机 Peripheral 广播 / OTA 与固件验证 | 不带大徽章；每卡可有一行小字状态说明（中性灰） |
| 3 | 工作流 | Scan → Connect → Inspect → Broadcast 四段横向流程 | WEB-001 评审明确保留的骨架 |
| 4 | 平台主线 | 三主角卡：UniApp Android / 微信小程序 / LightBLE ESP32 | 卡内状态措辞固定：UniApp Android「客户端主线 · 开发预览」、微信小程序「工具入口 · 开发预览」、LightBLE ESP32「固件验证 · 开发中」；下方一行"Flutter/Tauri 等为历史参考实现"→ 链接 `/status/` |
| 5 | 产品视觉 Gallery | 3-5 张 `apps/uniapp` 精选真机截图 | webp ≤150KB/张，lazy load |
| 6 | 开源与参与 | GitHub / Issue / 贡献指南 / MIT License / 「项目状态与路线图」入口卡 | Security 卡保留现状（如实注明待补充，不造假链接） |
| 7 | 页脚 | 简版导航 + 状态一行 + 版权 | 全站统一（见 §7） |

文案原则：营销区用产品语言讲价值与场景；状态五态词（VERIFIED/PREVIEW/BLOCKED/UNSUPPORTED/NOT_RELEASED）只出现在状态语境（版本徽章、/status 页），不混入营销文案。

## 5. 状态子页规格（/status/）

承接首页移除的全部工程状态内容，面向协作者/审核者：

1. **页面头**：`项目状态与路线图` + 当前版本 + overall_status（数据仍从 `public/release/latest.json` 读取）
2. **平台矩阵**：原九宫格（Android/微信/H5/iOS/REFERENCE/Peripheral/Observer/OTA/Smart HID），徽章五态样式保留
3. **流程状态**：原七张流程卡（含 BLOCKED 标注）
4. **产物与发布计划**：原四张禁用下载卡改造为表格（产物 / 计划形态 / 当前状态 / 发布条件），明确"无 SHA 不挂下载"
5. **已知限制**：limitations 列表（保留 noscript 回退）
6. **证据与元数据**：Release Metadata JSON 链接、gap-analysis、remediation、target-product/target-tests 入口（内部术语在此页允许）

## 6. 视觉规格

- **主色不变**（token SSOT v1.0 投影），蓝色收敛到三处用途：主 CTA、关键强调、链接
- 徽章降饱和或中性灰；红色（danger）只允许出现在 `/status` 页
- 大标题用 `--c-text` 深海军蓝强对比；次要信息用 `--c-sub`/`--c-mut` 灰阶；success 青色少量正向点缀
- **设计系统升版 v1.0 → v1.1**：增设营销字号档（display-lg/display-xl，含 clamp 上限与行高字距）与区块节奏档（36–96px section spacing），把 style.css 现存登记例外 ①② 正式收编清零；同步更新 `07_design_system/TOKEN.md` 与 style.css 文件头注释
- Hero 氛围：升级现有 radial 渐变 + 生成氛围图（深蓝低饱和 BLE 信号波形/网格抽象，**纯装饰，不得伪造产品界面**）

## 7. 外壳规格

- `config.mjs` nav 重排（§3）；全站页脚：VitePress `themeConfig.footer` + theme 增强组件（状态一行「当前状态 PREVIEW · 查看完整状态 →」+ 简导航 + 版权）
- 文档页侧边栏/正文框架不动，随 token 更新自然统一
- **暗色本轮锁定浅色**（`appearance: false`）：现有暗色从未适配（WEB-001 记录 UNPROVEN），锁浅色减半测试面；暗色列入后续轮

## 8. 双语规格

- `config.mjs` 增加 `locales`：root=zh，`en`（`/en/`）只含 index.md
- 语言切换：nav 右侧「中 / EN」链接项（简单可靠，不引入切换组件）
- `/en/` 的文档类链接指回中文文档并标注 *Chinese docs*
- hreflang 由 `sitemap: true` + locales 结构自动生成，两种语言独立 URL

## 9. 素材规格

| 素材 | 来源 | 处理 |
|---|---|---|
| 真机截图 3-5 张 | `apps/uniapp` 现有 PNG（174 张内精选：扫描列表/设备详情/日志） | 压缩 webp ≤150KB/张，存 `docs/public/gallery/` |
| Hero 氛围图 | 生图服务生成 1536×1024 | 深蓝低饱和抽象信号波形，存 `docs/public/brand/` |
| icon.png / share.png | 现有 | 本轮复用 |

## 10. SEO 与性能

- `sitemap: true`（hostname `https://lightble.i2kai.com`）+ `public/robots.txt`
- JSON-LD `SoftwareApplication`：诚实标注 prerelease，不标 released/version 造假
- og/twitter meta 保留；gallery lazy load；hero 资源 preload
- dist 33MB 为全文档体积，与首页加载无关，不做处理

## 11. 诚实约束红线（不可违反）

1. 无真实产物（APK/固件/SHA）不得出现可点击下载入口
2. 无 E5/E6 证据不得声明 VERIFIED / RELEASED
3. 状态五态词语义不得弱化或复用为营销词
4. 生成图仅用于装饰，不得伪造产品界面/截图
5. Security 入口无 SECURITY.md 则如实注明，不造假链接
6. 所有工程状态信息**降级收纳**到 /status，不删除

## 12. 验收标准

1. `npm run docs:build` exit 0；站内链接零 404（含 /en/ 与 /status/）
2. 本地 `vitepress serve` + Chrome 截图自查：桌面 1440 与移动 390 两档
3. 诚实正典核对：对照 `docs/verification/landing-page-link-and-claim-matrix.md`，全站无假下载、无越级状态声明
4. `/en/` 渲染正确，中英切换往返无损（首页 ↔ /en/）
5. Lighthouse（桌面）基线记录：性能 / SEO / 可访问性分数存档
6. TOKEN.md v1.1 与 style.css 登记例外清零（文件头注释更新）

## 13. 非目标（本轮不做）

- Astro 换栈 / 双构建链（已否决）
- 暗色模式适配
- 全站文档双语
- 文档内容层 IA 重组（导航/文档入口仅随外壳更新）
- share.png 重制、品牌视觉体系重做

## 14. 实施注记

- 工作树当前有并行会话在途改动（apps/android、apps/desktop 等）：**提交时仅 add 本轮涉及文件，禁 `git add -A`**
- 部署：push 到 main/master/refactor/multi-platform 触发 `deploy-docs.yml`；main 冻结 dbb38a8，上线节奏（何时 push 触发 Pages 部署）由实施计划与用户确认
- 可选加固（与本设计兼容，独立执行）：`docs/public/CNAME`（内容 `lightble.i2kai.com`）
