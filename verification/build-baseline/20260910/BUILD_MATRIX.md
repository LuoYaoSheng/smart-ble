# Smart BLE 构建基线 · 2026-09-10（第一阶段验收）

> 本机：macOS (darwin 25.5.0, arm64)。范围：Mac 可编译链路七端全量构建。
> 结论：**10 项构建全部 PASS，0 FAIL**。真实 BLE 行为验证不在本表范围（属第二~七阶段）。

## 1. 构建结果总表

| # | 端 | 结果 | 耗时 | 命令（见 §2 前置环境） | 产物 | 备注 |
|---|---|---|---|---|---|---|
| 1 | Swift · macOS 原生 | **PASS** | 12.4s | `cd apps/desktop/macos/SmartBLE-mac && swift build` | `.build/debug/SmartBLE-mac` | 修复 `PageSmoke.swift:690` 截断残句（提交 61d02a4）后通过 |
| 1b | Swift · macOS 单测 | **PASS** | <5s | `./.build/debug/SmartBLE-mac --unit-core` | — | CoreUnit 62/62，failures=0 |
| 2 | Swift · iOS 原生 | **PASS** | ~40s | `xcodebuild -project apps/ios/SmartBLE.xcodeproj -scheme SmartBLEiOS -destination 'generic/platform=iOS Simulator' build` | DerivedData `.app` | 本地包 SmartHidCore 解析正常；真机/签名/TestFlight 属第四阶段 |
| 3 | Flutter · macOS | **PASS** | ~2min | `cd apps/flutter && flutter build macos --debug` | `build/macos/Build/Products/Debug/smart_ble.app` | 2 条 ld Metal toolchain 搜索路径 warning（无害）；Release/沙盒待第三阶段 |
| 4 | Flutter · Android | **PASS** | 51.8s(gradle) | `flutter build apk --debug` | `build/app/outputs/flutter-apk/app-debug.apk` | 3 条 javac 过时选项警告（无害） |
| 5 | Kotlin · Android | **PASS** | 1m26s | `cd apps/android && ./gradlew assembleDebug` | `app/build/outputs/apk/debug/app-debug.apk` | 需 `JAVA_HOME=JBR21` + `ANDROID_HOME`（见 §2）；37 tasks 全执行 |
| 6 | Electron | **PASS** | ~3min | `cd apps/desktop/electron && npm run build:mac` | `dist/BLE Toolkit+-1.0.0-arm64.dmg` + `-mac.zip`（含 blockmap） | ad-hoc 签名（identity 88705DA9…）；notarization 未配置按配置跳过；noble 原生依赖 rebuild 成功；**macOS 端不支持 Peripheral 广播（已知平台限制）** |
| 7 | Tauri | **PASS** | 1m43s(release) | `cd apps/desktop/tauri && tauri build` | `src-tauri/target/release/bundle/macos/BLE Toolkit+.app` + `dmg/BLE Toolkit+_1.0.0_aarch64.dmg` | 全局 npm CLI **1.6.3**（见 §2）；btleplug 0.11.8 编译正常；Peripheral 不支持（交给原生 macOS，第五阶段口径） |
| 8 | uni-app · 微信小程序 | **PASS** | ~30s | `cd apps/uniapp && npm run build:mp-weixin` | `unpackage/dist/build/mp-weixin/`（2.0MB，含 project.config.json） | 依赖必须 `npm ci --legacy-peer-deps`；⚠ `services/ota/package-validator.js` 引 `node:crypto` 被 vite externalized——OTA 包校验在小程序端实际不可用，**待第三/六阶段处理** |
| 9 | ESP32 · Peripheral 夹具 | **PASS** | 24.2s | `pio run -e fixture_peripheral_s3` | `.pio/build/fixture_peripheral_s3/firmware.bin` | S3 变体=实体夹具板（ESP32-S3 + CH343）；含 diag 变体未跑 |
| 10 | ESP32 · Observer 夹具 | **PASS** | 19.2s | `pio run -e fixture_observer_s3` | `.pio/build/fixture_observer_s3/firmware.bin` | 同上 |
| 11 | ESP32 · Smart HID 模拟器 | **PASS** | 14.4s | `pio run -e fixture_shid_sim_s3` | `.pio/build/fixture_shid_sim_s3/firmware.bin` | 配网协议模拟器（P002 验证刺激源） |

## 2. 工具链固定（本机基线）

| 项 | 固定值 | 说明 |
|---|---|---|
| Android JDK | `JAVA_HOME=/Applications/Android Studio.app/Contents/jbr/Contents/Home`（JBR 21） | 系统 `java` 是 Temurin 25，Gradle 构建必须显式指 JBR 21；`apps/android/gradle.properties` 未写 `org.gradle.java.home`（保持仓库机器无关，环境注入） |
| Android SDK | `ANDROID_HOME=$HOME/Library/Android/sdk` | `apps/android` 无 local.properties（gitignore 口径），CI/新机靠环境变量 |
| Tauri CLI | 全局 npm `@tauri-apps/cli` **1.6.3**（`npm i -g @tauri-apps/cli@^1`） | 工程 tauri 1.5.4；cargo 侧 `tauri-cli 2.9.6` 保留共存不冲突；升级 Tauri 2 需单独立项 |
| PlatformIO | `~/.platformio/penv/bin`（Core 6.1.18） | 已追加进 `~/.zshrc`；`pio` 直接可用 |
| uni-app 依赖 | `npm ci --legacy-peer-deps` | 根因：`pinia@3.0.4` peer 要 `vue ^3.5.11`，工程锁 `vue 3.4.21`（dcloudio alpha 铁律）——**不能**通过升 vue 解决 |
| Flutter | 3.38.5 stable（gitee mirror） | macOS/Android 双目标同链路 |
| Xcode | `/Applications/Xcode.app`（iOS 模拟器目标验证通过） | — |

## 3. 三目录分工（worktree 盘点结论）

| 目录 | 分支 | 状态 | 用途 |
|---|---|---|---|
| `Open/smart-ble`（主开发目录） | `refactor/uniapp-v1` @ 61d02a4 | 干净，**领先 github 15 个提交待推** | 一切主线开发（含 Apple Native 功能链 12 提交 + 本轮 2 提交） |
| `Open/smart-ble-apple-native` | `feature/apple-native-core` @ 8e078fc | 干净（停在主链中点的旧指针） | 专项分支用途；如需对齐最新可 `git merge ff` 由用户决定 |
| `Open/smart-ble-macos` | `spike/macos-extension-v1` @ 0b5d36a | 干净，与 github 同步 | r1-r6 spike 冻结态，只读参照 |

## 4. 本轮修复与踩坑（新增）

1. **`PageSmoke.swift:690` 截断残句**：今晨 flow-states 会话留下 `&& button(t???` 半截代码导致 SwiftPM 编译失败；按上下文补全为 `button(titled: "查看设备") != nil`（P002 成功态确有该按钮，`p002-view`）。提交 61d02a4。
2. **管道吞退出码**：后台命令 `cmd | tail` 的退出码来自 tail——`npm ci` ERESOLVE 失败被报成 exit 0、uniapp wrapper exit 2 也被吞。与记忆中 pipefail 假故障同族的反向坑。**构建验证一律落盘全量日志再判读。**
3. **Electron 首跑 `ERR_ELECTRON_BUILDER_CANNOT_EXECUTE`**：多构建并行下载 Electron 27.3.11 运行时（93MB）时子进程失败；app-builder 二进制本身可执行。干净重跑一次通过——判定为下载竞态，非工程缺陷。
4. **uni-app `npm ci` 必须 `--legacy-peer-deps`**（见 §2）；且**必须在 `apps/uniapp` 目录执行**——本轮一次跑错目录把 electron 的 node_modules 重装了一遍（无害但白跑）。

## 5. 第一阶段验收判定

- Swift（macOS+iOS）✅ / Flutter（macOS+Android）✅ / Android（Kotlin）✅ / Electron ✅ / Tauri ✅ / uni-app ✅ / ESP32 ✅ —— **验收通过**。
- 遗留（不阻塞，移交对应阶段）：uni-app `node:crypto` externalized 警告（OTA 包校验）、Electron notarization 未配置、Flutter Release/沙盒构建（第三阶段）、iOS 真机签名（第四阶段）、ESP32 非 S3 变体与 diag 变体未构建（第七阶段按需）。
