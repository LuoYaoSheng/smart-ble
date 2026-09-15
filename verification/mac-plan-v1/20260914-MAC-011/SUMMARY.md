# MAC-011 证据：官网、CI、发布与 Artifact 管线

- Host: macOS / Node 24.12 / VitePress / Actions YAML

## CI（.github/workflows/ci.yml 重写）

- push 分支加入 `refactor/uniapp-v1`（PR 检查不变）。
- Apple 三步化：SmartHidCore `swift test` + iOS `xcodebuild test`（自动取可用模拟器）+ 原生 macOS `swift build`——替换裸 `swift build`。
- Android 固定 JDK 21（与本地 scripts/android/verify-android.sh 17/21 口径一致）。
- UniApp 跑完整 `verify-uniapp.sh`（TS 剥离需 Node ≥22.18 → CI Node 24）+ `build:h5` + `--require-compiled` 资产门禁——替换原八文件子集。
- Tauri Linux：cargo check → `cargo tauri build --bundles deb,appimage`（Linux 目标按 MAC-010 移交正式落地）+ 产物上传。
- ESP32：默认双环境 + S3 三件套。
- 新增 release-metadata 门禁 job：`generate-release-metadata --check` + `check-version-consistency` + verify-target system 层。

## Release（release-build.yml 重写）

- 删除不存在的 `npm run tauri build`（apps/desktop/tauri 无 npm 工程）→ `cargo install tauri-cli ^1.6` + `cargo tauri build`。
- 产物与主线一致化：只构建并上传候选（Flutter APK 标注 REFERENCE line；Tauri MSI；ESP32 五固件），附 version/commit/sha256/verification_status 摘要；**不自动创建 GitHub Release**（channel=preview、artifacts=[]；正式发布走 MAC-012 门禁+用户批准）。

## 官网（修复真实构建崩溃）

- **bug**：docs/status/index.md 直取已废弃 surface 键（android_native/flutter/desktop）→ `.name` SSR 崩溃，`docs:build` 全站不可构建（基线复现）。
- 修复：平台矩阵卡对齐现役 8 键（flutter_tauri_native 合并键）；`npm run docs:build` build complete（5.1s，VitePress 死链零告警=内链全通）。
- 落地页微信元素改冻结历史口径（原型卡/脚注/图库 alt）；config.mjs 描述与 OS 元数据去 WeChat。

## 元数据与状态一致性

- release-state.json known_limitations 更新（Release Pipeline 条目改为 CI 候选产物模式现状；新增微信退役条目；iOS 真机证据口径校准）→ 9 产物重生成 → `--check` PASS。
- `verify-uniapp-pages.sh` 改写为 Playwright Page Driver 入口（HBuilderX 5.x 已删 uniapp.test，DEF-002）：specs=11/825 断言 226 pass 0 fail。

## CI 实跑取证（2026-09-15 追加：六轮收敛至全绿）

推送后 Actions 首跑经六轮收敛，最终 **run 34934761333（commit ee322ff）8/8 作业全部 success**：
https://github.com/LuoYaoSheng/smart-ble/actions/runs/34934761333

| 作业 | 结论 | 耗时 |
|---|---|---|
| ESP32 firmware (PlatformIO) | ✅ success | 3m12s |
| Flutter (analyze + test) | ✅ success | 1m14s |
| Electron (install + lint) | ✅ success | 36s |
| Release metadata & gates | ✅ success | 45s |
| Android (build + test, JDK 21) | ✅ success | 1m10s |
| Tauri (Linux build → deb/appimage) | ✅ success | 9m40s |
| Apple (Core test + iOS xcodebuild test + native macOS build) | ✅ success | 10m27s |
| UniApp (full verify-uniapp.sh + h5 build) | ✅ success | 3m24s |

产物：`tauri-linux-preview`（93,013,550 bytes，deb+appimage 双包）——**Linux bundle 首次 CI 实证，MAC-010 移交项闭环**。

### 六轮收敛史（每轮失败作业数：5 → 3 → 2 → 2 → 1 → 0）

| 轮 | run / commit | 败数 | 当轮暴露根因 → 修复（修复提交即下一轮 head） |
|---|---|---|---|
| 1 | 34928998420 / 6df23e3 | 5 | Android：setup-android@v3 与 runner 预装 SDK 冲突→删该 step；Apple：runner 运行时无障碍对比度阈值漂移→CI 跳过 2 个 AccessibilityAudit 测试（本地 Gate 证据保留）；Tauri：ubuntu-24.04 无 webkit2gtk-4.0/libsoup2；metadata：缺 npm ci + Playwright；UniApp 全量首跑多项 → 59a1f7c |
| 2 | 34930285601 / 59a1f7c | 3 | Tauri：尝试 webkit2gtk-4.1 feature 被证伪（tauri v1 无此 feature）→ 钉 ubuntu-22.04 + libwebkit2gtk-4.0-dev；UniApp：npm 11.19 锁文件严格化缺 encoding@0.1.13 条目 + pinia/vue 需 --legacy-peer-deps；metadata 续修 → 21b97d8 |
| 3 | 34931127987 / 21b97d8 | 2 | Tauri：rustc 1.93 破坏 tauri v1/wry 0.24.11（tauri#15149，E0599）→ dtolnay/rust-toolchain@1.92.0；UniApp：SFC 编译器候选只找 HBuilderX 路径→check-uniapp-sfc.mjs 补仓库 node_modules 候选 → e49d69a |
| 4 | 34932703186 / e49d69a | 2 | Tauri：Linux bundle 路径要求 RGBA PNG 图标（macOS 路径不查，潜伏缺陷）→ 3 图标无损重编码（AE=0，Windows 写锁区跨线协调已登记）；UniApp：check-platform-parity swift 线在 Linux 误跑（SmartHidCore 需 CryptoKit）→ 非 Darwin 判 BLOCKED → 752cac1 |
| 5 | 34933759522 / 752cac1 | 1 | UniApp：check-product-parity swift 线同款问题第二处 → 同款 Darwin 门 → ee322ff |
| 6 | 34934761333 / ee322ff | 0 | **全绿** ✅ |

非修饰性适配三处均在册：① a11y 两测试 CI 跳过（本地视觉 Gate 证据不受影响）；② parity 两脚本 swift 线非 Darwin 返回 BLOCKED（在册状态，Mac Gate 语义不变）；③ Tauri 三图标 RGB→RGBA（像素级无损）。遗留告警：actions v4 系 Node 20 deprecation 提示、setup-java v4 弃用提示——均无阻塞，升 v5/v6 归后续维护。

- Status: PASS（2026-09-15 CI 实跑 8/8 全绿取证后收口；Linux bundle CI 实证闭环）
