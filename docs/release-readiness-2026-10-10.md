# Smart BLE Open 发布准备状态（2026-10-10）

当前唯一工程是 `smart-ble/`。旧 `smart-ble-macos` 与 Apple Native 的提交已合入；旧现场（含忽略的构建环境）保存在工作区 `.archives/smart-ble/2026-10-10/`，旧路径链接到唯一工程。所有技术实现继续接受同一产品契约与独立发布验证。

产品版本 `1.0.5`，移动 build number `101`，统一移动应用 ID `com.i2kai.open.smartble`。发布主体为个人，公开支持邮箱 `121912336@qq.com`。同一 ID 的 Kotlin、SwiftUI、Flutter、UniApp 是可替换实现；每个商店版本选择一个经过验收的包，不能把不同实现作为同一 build number 重复提交。新 ID 与旧 ID 是不同安装身份。

## 已完成验证

[候选构建运行 38023481655](https://github.com/LuoYaoSheng/smart-ble/actions/runs/38023481655) 在提交 `4491fd49f140a3ceeba51b2fa0e73d5f81caf278` 全部 23 项通过，23 份产物归档均存在。

| 实现 | 已构建的系统 / CPU | 产物 |
| --- | --- | --- |
| Kotlin | Android；不含原生库 | APK、AAB |
| Flutter | Android arm64-v8a / armeabi-v7a / x86_64；iOS arm64；macOS arm64 / x86_64；Windows x64 / arm64 | APK、AAB、Archive、完整桌面应用 |
| SwiftUI | iOS arm64 | Archive |
| AppKit | macOS arm64 / x86_64 | Universal app |
| Electron | Windows x64 / arm64；Linux x64 / arm64；macOS arm64 / x86_64 | NSIS / portable；deb / rpm / AppImage；DMG / zip |
| Tauri | Windows x64 / arm64；Linux x64 / arm64；macOS arm64 / x86_64 | MSI / NSIS；deb / AppImage / rpm；DMG |
| Avalonia | Windows x64 / arm64 | 完整自包含应用归档 |
| Wails | Windows x64 / arm64 | 原生可执行文件 |
| Qt | Windows x64 | 完整 PyInstaller 应用归档；ARM64 另行复核 |
| UniApp | H5、App 资源编译 | 原生安装包尚未完成 |

Windows ARM64 Flutter 使用官方 SDK 源码引导原生 Dart/引擎，程序与插件 PE Machine 校验通过。Electron 在 Windows WinRT / macOS CoreBluetooth 的实际包内原生模块加载、Windows 主程序 CPU 与 macOS universal 模块校验通过；Linux 包内加载与 ELF 架构检查正在补齐。完整应用目录/Archive 按完整包归档，缺少当前系统必需格式即失败。

Kotlin 与 Flutter 的正式 Android APK/AAB 已在本机创建并验签。keystore 和密码位于仓库外的受限权限目录，仓库只保存公钥指纹。报告记录 SHA256、源码树、实际包名/版本/build number、target SDK 36 及签名校验；当前应用与共享核心源码树仍与报告一致。

- Kotlin 报告：`.tmp/release/android-darwin-arm64/signed/report.json`。
- Flutter 报告：`.tmp/release/flutter-android-darwin-arm64/signed/report.json`；12 个 64 位原生库 ELF 与 ZIP 的 16 KB 对齐均通过。
- 软件验证包括 Flutter 144 项、Kotlin 100 项、iOS 31 项、AppKit 19 项、Avalonia Windows 86 项、Qt 45 项、桌面共享 170 项、Wails 3 项纯会话测试及 UniApp 27 个单测文件 / 15 静态门。软件门的最新运行状态以机器矩阵为准。

## 仍未验收

候选构建通过与已签名 Android 包不等于商店可发布。机器状态见 [platform-matrix.json](../release/platform-matrix.json)。

- 基础 CI 的两项 iOS UI 失败正在修复；不能宣称所有软件门已通过。iOS 结构审计与全量无障碍合规分开记录，历史 contrast / Dynamic Type / textClipped 豁免和真机 VoiceOver 仍需复核。
- Qt Windows ARM64 原生包复核中；不把 x64 仿真作为原生 ARM64。
- 每种实现的真实 BLE、Smart HID READY/恢复、OTA 取消/失败/重启版本核验，以及干净安装/升级仍需当前版本真机证据。附近扫描结果与模拟器、单测不能替代该证据。
- UniApp 还需 HBuilderX / 自定义原生基座、原生 SDK 审计和正式签名包；H5 与 App 资源编译不等于原生包。
- App Store 导出上次返回 No Accounts / 新 ID 的分发 profile 缺失。Xcode 已打开供用户配置，尚未取得成功导出证据。
- macOS 正式分发签名、公证与 Windows Authenticode 尚未验收。
- 用户已明确暂缓其他上架资料；公开隐私 URL、各商店 SDK/权限申报、主体认证和商店提交保持未完成。没有执行商店上传或正式分发。

代码收敛与后续修复在 [草稿 PR #2](https://github.com/LuoYaoSheng/smart-ble/pull/2)；保留完整修改供复核，不将当前构建状态当成发布批准。
