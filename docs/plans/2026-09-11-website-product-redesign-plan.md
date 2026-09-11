# 官网产品化重设计 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `docs/plans/2026-09-11-website-product-redesign-design.md`（含 D7–D9 修订）把 lightble.i2kai.com 从工程状态看板重建为产品化官网：BLE Toolkit+ 统一命名、微信小程序码主推、多版本真实获取路径、/status 收纳工程状态、/en/ 英文首页。

**Architecture:** VitePress 同栈深化。首页 frontmatter hero + 自定义七分区；工程状态整体迁移 /status/；theme 层加全站页脚组件与营销字号档；素材全部真实（小程序码 / automator 截图 / 生成氛围图仅装饰）。

**Tech Stack:** VitePress（docs/ 内已有 node_modules）、cwebp、magick、mcp image-gen。

## Global Constraints

- 对外命名统一 **BLE Toolkit+**（仓库内部名 smart-ble、域名 lightble.i2kai.com 不变）
- 诚实红线（spec §11）：无产物不放假下载；无 E5/E6 不写 VERIFIED/RELEASED；码图必须伴随「扫码」文字（TEST-R-009）；小程序码只用真实 `docs/qr_code.jpg`；工程状态只降级到 /status 不删除
- 版本徽章 `v1.0.5 · PREVIEW` 是首页唯一徽章
- 工作树有并行会话在途改动：**提交只 add 本轮涉及文件，禁 `git add -A`**
- 部署链零改动（push 触发 Pages 的分支不含当前分支 refactor/uniapp-v1，上线节奏由用户定）
- 构建：`cd docs && npm run docs:build` exit 0

---

### Task 1: 素材准备（码图 / 截图 / 氛围图）

**Files:**
- Create: `docs/public/qr/wechat-miniprogram.jpg`（cp 自 `docs/qr_code.jpg`，430×430）
- Create: `docs/public/gallery/scan.webp` `device-detail.webp` `broadcast.webp` `hid-detail.webp` `version-history.webp`（源：`apps/uniapp/unpackage/test-output/`，367×794）
- Create: `docs/public/brand/hero-duo.webp`（双截图并排合成，源 05+07）
- Create: `docs/public/brand/ambiance.webp`（生图，1536×1024，深蓝低饱和抽象信号波形，纯装饰）

**Steps:**

- [ ] 复制码图并建目录：
```bash
mkdir -p docs/public/qr docs/public/gallery
cp docs/qr_code.jpg docs/public/qr/wechat-miniprogram.jpg
```
- [ ] 压缩 gallery 五张（每张 ≤150KB）：
```bash
SRC=apps/uniapp/unpackage/test-output
cwebp -q 78 $SRC/automator-scan.png -o docs/public/gallery/scan.webp
cwebp -q 78 $SRC/page-flow/05-generic-detail.png -o docs/public/gallery/device-detail.webp
cwebp -q 78 $SRC/page-flow/07-broadcast.png -o docs/public/gallery/broadcast.webp
cwebp -q 78 $SRC/page-flow/02-hid-detail.png -o docs/public/gallery/hid-detail.webp
cwebp -q 78 $SRC/page-flow/06-version-history.png -o docs/public/gallery/version-history.webp
```
- [ ] 合成 hero 双截图（圆角+白边+并排）：
```bash
SRC=apps/uniapp/unpackage/test-output
magick $SRC/page-flow/05-generic-detail.png \( +clone -alpha extract -draw 'fill black polygon 0,0 24,0 fill white circle 24,24 24,24' \
  \( +clone -flip \) -compose Multiply -composite \( +clone -flop \) -compose Multiply -composite \
  \) -alpha off -compose CopyOpacity -composite \
  -bordercolor white -border 8 $SRC/_r1.png
# 同法生成 _r2.png 后并排：
magick $SRC/_r1.png $SRC/_r2.png -background none +append -trim +repage -resize '760x>' docs/public/brand/hero-duo.webp
rm $SRC/_r1.png $SRC/_r2.png
```
（圆角合成若失败，降级为 `-border 8 -bordercolor white` 白边直角并排即可，不为效果阻塞）
- [ ] 生成氛围图（mcp__image-gen__generate_image，prompt 要点：深海军蓝低饱和背景、抽象 BLE 无线电波/同心圆信号涟漪、细网格、微光蓝点缀、无文字无 UI 元素、简约科技插画）→ 转 webp 存 `docs/public/brand/ambiance.webp`
- [ ] 验收：`ls -la docs/public/qr docs/public/gallery docs/public/brand` 全部存在，截图 webp 均 ≤150KB：`find docs/public/gallery -size +150k` 输出为空

### Task 2: config.mjs 重写（命名/导航/locales/sitemap/SEO）

**Files:**
- Modify: `docs/.vitepress/config.mjs`（整体重写）

**关键内容（完整落盘）:**
- `title: "BLE Toolkit+"`；description 产品语言 + PREVIEW 一句
- `appearance: false`（锁浅色，spec §7）
- `sitemap: { hostname: 'https://lightble.i2kai.com' }`
- `locales: { root: { label: '简体中文', ... }, en: { label: 'English', ... } }`；en 侧 nav：Features `/#features` / Docs `/product-contract/`（*Chinese docs*）/ Status `/status/` / 「中文」`/`
- nav（中文）：功能 `/#features` ｜ 文档 `/product-contract/` ｜ 状态 `/status/` ｜ 「EN」`/en/`
- sidebar 保持现状不动（文档树不变）
- head 更新：canonical/og 全部 BLE Toolkit+ 化；keywords 加 `BLE Toolkit+`；og:image 仍 `/brand/share.png`；新增 JSON-LD：
```js
['script', { type: 'application/ld+json' }, JSON.stringify({
  '@context': 'https://schema.org', '@type': 'SoftwareApplication',
  name: 'BLE Toolkit+', applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Android, WeChat Mini Program, ESP32',
  url: 'https://lightble.i2kai.com/',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  description: '跨平台 BLE 调试与验证工具（开发预览阶段）',
  softwareVersion: '1.0.5-preview'
})]
```
- [ ] 验收：`cd docs && npm run docs:build` exit 0；`dist/sitemap.xml` 存在且含 `/en/` 与 `/status/`

### Task 3: theme 外壳（页脚组件 + 营销字号档样式）

**Files:**
- Create: `docs/.vitepress/theme/Layout.vue`
- Create: `docs/.vitepress/theme/SiteFooter.vue`
- Modify: `docs/.vitepress/theme/index.js`
- Modify: `docs/.vitepress/theme/style.css`（追加，token 头注释更新）

**SiteFooter.vue 核心：**
```vue
<template>
  <footer class="sb-footer">
    <div class="sb-footer-inner">
      <div class="sb-footer-brand">
        <img src="/brand/icon.png" alt="BLE Toolkit+ icon" width="28" height="28">
        <span>BLE Toolkit+</span>
      </div>
      <nav class="sb-footer-nav">
        <a href="/#features">功能</a><a href="/#get">获取</a>
        <a href="/status/">项目状态</a><a href="/product-contract/">文档</a>
        <a href="https://github.com/luoyaosheng/smart-ble" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <p class="sb-footer-status">
        当前状态 PREVIEW（v1.0.5）·
        <a href="/release/latest.json">Release Metadata</a> ·
        © 2026 BLE Toolkit+ · MIT License
      </p>
    </div>
  </footer>
</template>
```
**Layout.vue：** `<DefaultTheme.Layout><template #layout-bottom><SiteFooter/></template></DefaultTheme.Layout>`
**index.js：** wrap DefaultTheme + 注册 Layout。
**style.css 追加：** 营销档 `--fs-display-lg: clamp(36px, 5vw, 58px)`（行高 1.08）/ `--fs-display-md: clamp(28px, 4vw, 42px)`（行高 1.04）；区块节奏 `--sec-md: 48px; --sec-lg: 64px; --sec-xl: 96px`；`.sb-get-qr-card`（码卡：白卡+码图 180px+扫码文案）、`.sb-get-card`（获取卡，真实链接样式）、`.sb-hero-badge`（低调版本徽章）、gallery 网格、`.sb-footer` 样式；文件头登记例外①②改注「已收编 v1.1」。
- [ ] 验收：build exit 0；首页与 /status/ 均渲染页脚

### Task 4: 首页重写 docs/index.md

**Files:**
- Modify: `docs/index.md`（整体重写）

**结构（frontmatter hero + 六个自定义 section）：**
- hero：name `BLE Toolkit+`、text `一套工具，调通每一台 BLE 设备`、tagline 价值句（spec §4 草案）、actions：brand「微信扫码使用」→ `/#get`、alt「查看文档」→ `/product-contract/`、alt「GitHub」外链；image `/brand/hero-duo.webp`
- `#get` 获取区：**微信码大卡**（`/qr/wechat-miniprogram.jpg` + alt「BLE Toolkit+ 微信小程序码」+ 文案含「微信扫码使用小程序」文字等价 + 说明「无需安装，扫码即用」）+ Android 卡（「安装包筹备中 · 从源码构建」→ `/tutorials/platforms/uniapp`）+ ESP32 卡（「固件源码构建」→ `/tutorials/hardware/01_Hardware_Philosophy`）+ 源码卡（GitHub 克隆外链）
- `#features` 能力区 6 卡（spec §4：扫描与广播解析/连接与服务发现/读写与订阅/多设备与日志/手机 Peripheral 广播/OTA 与固件验证；每卡一行中性灰小字）
- 工作流 Scan→Connect→Inspect→Broadcast 四段
- 平台主线 3 卡：BLE Toolkit+ for Android「客户端主线 · 开发预览」/ BLE Toolkit+ 微信小程序「工具入口 · 开发预览」/ BLE Toolkit+ ESP32 固件「固件验证 · 开发中」+ 尾行 Flutter/Tauri 参考实现 → `/status/`
- Gallery 5 张 webp lazy
- 开源与参与：GitHub/Issue/贡献/MIT/状态入口 + Security 如实注明
- script setup 仅保留版本徽章数据（import latest.json 取 app_version/overall_status）
- [ ] 验收：build exit 0；`grep -c '下载' docs/index.md` 不出现假下载按钮；含「扫码」字样（TEST-R-009）；`node --test tests/target/release/links-and-qr.test.mjs` PASS

### Task 5: /status/index.md（工程状态全量迁移）

**Files:**
- Create: `docs/status/index.md`

**内容：** 迁移原 index.md 全部工程状态：状态带（版本+overall）、九宫格平台矩阵（读 latest.json，五态徽章）、七流程卡（含 BLOCKED）、产物表（表格化：产物/计划形态/当前状态/发布条件）、已知限制（limitations + noscript 回退）、证据与元数据（Release Metadata/gap-analysis/remediation/target-product/target-tests）。内部术语在本页允许。frontmatter `title: 项目状态与路线图`。
- [ ] 验收：build exit 0；原 index.md 的全部状态信息在新页面可检索（E5、TP-G2-R1、Remediation 等关键词 grep 命中）

### Task 6: /en/index.md（英文首页）

**Files:**
- Create: `docs/en/index.md`

**内容：** 同构首页英文版；hero 英文文案（spec §4 草案）；#get 区码图同图、文案 "Scan with WeChat to use the mini program"；文档链接指中文文档并标 *Chinese docs*；低涉英语措辞不越诚实红线（developing preview / not yet released）。
- [ ] 验收：build exit 0；`/en/` 在 sitemap 中；中英往返链接正确

### Task 7: robots.txt / latest.json / TOKEN.md v1.1

**Files:**
- Create: `docs/public/robots.txt`：
```
User-agent: *
Allow: /
Sitemap: https://lightble.i2kai.com/sitemap.xml
```
- Modify: `docs/public/release/latest.json` — 仅 `wechat_qr.image: "/qr/wechat-miniprogram.jpg"`（status 与 known_limitations 不动，spec §11-8）
- Modify: `docs/specs/07_design_system/TOKEN.md` — v1.0 → v1.1：收编营销字号档（display-md/display-lg 含 clamp/行高/字距）与区块节奏档（48/64/96px），changelog 注明来源（官网重设计轮）
- [ ] 验收：`curl -s localhost:port/robots.txt` 内容正确；TOKEN.md 版本行 v1.1

### Task 8: 构建 + 视觉验收 + 诚实核对

- [ ] `cd docs && npm run docs:build` exit 0，无 dead link 报错
- [ ] `npx vitepress serve docs` 后台起服务；chrome-devtools 截图桌面 1440 / 移动 390：首页（hero/#get/码图加载）、/status/、/en/ 三页
- [ ] 检查项：首屏可见「微信扫码使用」CTA 与小程序码；无假下载；徽章唯一；BLE Toolkit+ 命名一致；页脚全站渲染
- [ ] `node --test tests/target/release/links-and-qr.test.mjs` PASS

### Task 9: 提交（仅本轮文件）

```bash
git add docs/index.md docs/en docs/status docs/public/qr docs/public/gallery \
  docs/public/brand/hero-duo.webp docs/public/brand/ambiance.webp \
  docs/public/robots.txt docs/public/release/latest.json \
  docs/.vitepress/config.mjs docs/.vitepress/theme \
  docs/specs/07_design_system/TOKEN.md docs/plans/2026-09-11-website-product-redesign-design.md \
  docs/plans/2026-09-11-website-product-redesign-plan.md
git commit -m "docs(site): 官网产品化重设计——BLE Toolkit+ 命名统一、微信小程序码主推、/status 状态收纳、/en 英文首页"
```
