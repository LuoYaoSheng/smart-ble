# Smart BLE 统一工程与全实现发布计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 唯一开发入口为 smart-ble；所有现有实现按相同产品契约验证，逐实现、操作系统及 CPU 架构记录构建、真机和发布状态。

**Architecture:** apps 保留不同技术实现，core 与 docs/specs 保持共享契约。所有实现均纳入发布检查，旧 REFERENCE/Experimental 标签不能替代正确性验收；平台固有限制必须登记并提供可用降级。实现完成、构建通过、真机通过、商店签名与提交各自独立，不从其中一层推断另一层。

**Tech Stack:** UniApp、Flutter、Kotlin/Compose、SwiftUI/AppKit、Electron、Tauri、Avalonia、Qt、Wails，ESP32 夹具。

## 设计与范围

- 采用一个 Git 主仓及 main 开发入口；macOS/Apple Native 两分支均已是 refactor/uniapp-v1 的祖先，不再维护平行工程。历史工作树保存源码和全部忽略文件后解除 Git 工作树登记，旧路径作为统一入口别名。
- 保留全部现有技术实现，按实际支持的操作系统展开矩阵。windows/linux 空占位目录不另算已实现产品。H5 受浏览器 API 限制，不宣称与原生 BLE 能力等价；微信目标维持退役。
- VERSION 为产品版本源；商店 build number 独立单调。用户于本轮批准新包名：iOS/Android/UniApp/Flutter 共用 com.i2kai.open.smartble；保留代码 namespace，正式商店选择一个已验收构建。旧包属于独立安装身份，不假称原包原位升级。
- 本轮默认准备 Apple App Store、国内 Android 商店及桌面正式分发；用户指定其他渠道后扩展。签名材料从环境或系统证书读取，不入库。未取得真实签名、真机证据与商店验证时状态保持待验。
- 备选为继续分别维护各工作树或只发布某个框架；都不满足用户本轮“一个工程、每种架构与平台均正确”的要求。

## Task 1: 主线收敛与历史现场保存

**Files:** 根 README、AGENTS、docs/plans/ 本文件；Git 主线/历史工作树登记。

1. 校验 worktree 干净、无独有未跟踪文件，验证两分支 merge-base。
2. 将 refactor/uniapp-v1 fast-forward 到本地 main。
3. 将旧现场移至工作区档案目录，保存 Git 来源、忽略文件和构建现场，解除工作树登记；旧路径链接主仓。
4. 检查 main 同时包含所有原分支提交与旧入口解析。

## Task 2: 全平台构建基线与发布矩阵

**Files:** Makefile、.github/workflows/ci.yml、release/、scripts/release/。

1. 为每个现有实现登记 supported OS、CPU、包格式、签名和硬件门。
2. 在本机复跑适用构建/单测；Windows/Linux 单独由对应 runner 取证。
3. 扩充 CI 覆盖 Avalonia/Qt/Wails/桌面共享测试，产物缺失必须失败，不能只安装依赖算通过。
4. 机器可读状态区分 PASS/FAILED/NOT_RUN/BLOCKED，未执行不得变 PASS。

## Task 3: 修复当前门禁与版本源

**Files:** Tauri Windows 广播辅助脚本装载、F023 检查、协议 parity JDK 解析、各平台版本配置、版本门禁。

1. 用失败门禁定位临时辅助文件违反 Z-2 的点；优先去掉文件写入，避免放宽用户存储约束。
2. 协议向量 JDK 探测复用 Android 工具链能力，避免已安装 JDK 被判 BLOCKED。
3. 所有包与原生二进制版本对齐 VERSION；扩展一致性门禁，去掉硬编码“只能 1.0.5”。
4. 单测、静态门禁及对应平台构建通过后继续。

## Task 4: 移动商店构建链

**Files:** apps/android Gradle、apps/flutter/android、UniApp manifest、iOS 配置与 scripts/release/。

1. 官方要求核验：API 36 作为现代 Android 兼容基线（不等同于国内商店要求），Apple Xcode 26/iOS 26 SDK（2026-10-10）。
2. 原生 Android 更新兼容 AGP/Gradle/API，提供真实环境签名的 AAB 入口；无签名不得 fallback debug 后宣称可上架。
3. Flutter Android 版本/签名/AAB；iOS Archive/export 配置；权限和隐私说明按实际功能设置。
4. 构建 APK/AAB 与无签名 Archive 验证软件，签名导出与商店上传独立登记。

## Task 5: 桌面与完整功能验收

**Files:** 各 desktop 配置、脚本、CI、跨端矩阵与发布清单。

1. macOS arm64/x86_64 及签名/沙盒/公证链；Windows/Linux 支持矩阵和对应产物。
2. 各实现按同一流程检查扫描、连接、读写/Notify、断线恢复、多设备、广播、Profile/配网、日志脱敏、版本与生命周期。
3. Smart HID 与 OTA 真机使用版本锁定夹具；旧证据不能签收当前代码，取消/失败/重启路径必须取证。
4. 收口构建报告和剩余外部条件；完成前不提交商店或宣称完整发布。

## 当前基线

- smart-ble refactor/uniapp-v1 9ebc2d0；本地 main dbb38a8（落后 269 提交）。
- macOS 0b5d36a、Apple Native 8e078fc 均已合入 9ebc2d0。
- 10/10 基础检查：26 个 UniApp 单测文件、95 项桌面测试、跨仓契约和各语言向量通过；F023 临时脚本文件写入失败。默认 JDK25 被 parity 判 BLOCKED，显式 JDK17 复跑通过。
- Google Play: https://support.google.com/googleplay/android-developer/answer/11926878
- Apple: https://developer.apple.com/news/?id=ueeok6yw

## 执行记录

本文件随本轮实现更新；未列实测证据的步骤尚未完成。

### 2026-10-10 第一轮实现记录

- 主线 fast-forward 到 9ebc2d0；两个历史工作树完整移至 `.archives/smart-ble/2026-10-10/`，Git 只剩一个工作树；原路径为统一入口链接。
- 移动端按用户指令统一新 ID `com.i2kai.open.smartble`；正式 Android keystore 位于仓库外，公钥指纹入 `release/android-signing-public.json`。Kotlin/Flutter APK/AAB 已成功签名、验证；本轮后续源码修改须重新构建最终包。
- F023 临时 PS 脚本落盘改为 UTF-16LE EncodedCommand，包含 BOM/Unicode/Windows 命令长度回归；Electron 主进程去掉日志落盘、所有输出脱敏。
- 统一产品版本及 build number；补原生 macOS 沙盒蓝牙 entitlement、Flutter iOS/macOS 权限与 iOS 权限编译宏；UniApp 补 Barcode/相机、移除后台位置权限。
- Kotlin CCCD 等真实回执、Read/Write UI 不把提交当成功，Notify/Indicate 正确区分；Kotlin 与 E/T/G 重连延迟统一为 1/3/5 秒。Avalonia 旧设备通知和断开回调加设备归属，避免污染新设备面板和双重日志。
- Qt 原来仅五页，补齐九页和 Smart HID V1 配网/详情/诊断/版本：共享 50 向量、身份验证、带响应分帧、真实 READY/错误回执、60 秒超时、旧 READY 不冒充本次成功、设备切换清理与离开确认。九项测试（含 50 向量）通过；正式 Windows 包/空口仍待验。
- Flutter 停广播需原生状态确认、不吞错误；UTF-8 名称预算修复，新增四项回归；全量 analyze/test 133 项通过。
- 当前软件证据：UniApp 26 单测文件+15 静态门、H5/App 资源构建通过；桌面契约 100 项；iOS 24 单测+12 UI，改新 ID 后单测与 Archive 通过；AppKit 7 单测、双架构包和真实沙盒中央/外设蓝牙 poweredOn；Tauri 单测通过。
- Electron 更新至 44.7.0 / builder 26.15.3，双架构原生插件合并需排除编译临时文件；通用 DMG/zip 已构建。旧网络直连超时通过本机现有代理解决。
- App Store 导出实测返回 No Accounts/缺新 ID 的分发 profile；Xcode 已为用户打开，等待账号配置。已有证书不等于可导出 App Store 包。
- Windows/Linux 当前源码构建交由候选 CI，未跑的项保持 NOT_RUN；硬件全链、安装升级、真实分发签名、商店资料与提交仍开放。
