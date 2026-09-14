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

- Status: PASS_WITH_OBS（CI 实跑证据待推送后 Actions 首跑；Linux bundle 在 CI 首跑验证）
