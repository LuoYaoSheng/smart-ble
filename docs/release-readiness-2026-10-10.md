# Smart BLE Open 发布准备状态（2026-10-10）

当前唯一工程是 `smart-ble/`。旧 `smart-ble-macos` 与 Apple Native 的提交已合入；旧现场（含忽略的构建环境）保存在工作区 `.archives/smart-ble/2026-10-10/`，旧路径链接到唯一工程。所有技术实现继续接受同一产品契约与独立发布验证。

产品版本 `1.0.5`，移动 build number `101`，统一移动应用 ID `com.i2kai.open.smartble`。发布主体为个人，公开支持邮箱 `121912336@qq.com`。同一 ID 的 Kotlin、SwiftUI、Flutter、UniApp 是可替换实现；每个商店版本选择一个经过验收的包，不能把不同实现作为同一 build number 重复提交。新 ID 与旧 ID 是不同安装身份。

## 已完成验证

[候选构建运行 38030372953](https://github.com/LuoYaoSheng/smart-ble/actions/runs/38030372953) 在 PR head `1eb6b704d1a25be962361a1cf3130252073b853e` 全部 24 项通过，24 份产物归档均存在。报告分别记录实际 checkout（PR synthetic merge）与应用源码树。

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
| Qt | Windows x64 / arm64 | 完整 PyInstaller 应用归档 |
| UniApp | H5、App 资源编译 | 原生安装包尚未完成 |

Windows ARM64 Flutter 使用官方 SDK 源码引导原生 Dart/引擎，程序与插件 PE Machine 校验通过。Electron 在 Windows WinRT / macOS CoreBluetooth 的实际包内原生模块加载、Windows 主程序 CPU 与 macOS universal 模块校验通过；Linux x64 / ARM64 的最终主程序、原生 ELF 模块和包内 HCI 加载也已在新 CI 通过。完整应用目录/Archive 按完整包归档，缺少当前系统必需格式即失败。

Kotlin 与 Flutter 的正式 Android APK/AAB 已在本机创建并验签。keystore 和密码位于仓库外的受限权限目录，仓库只保存公钥指纹。报告记录 SHA256、源码树、实际包名/版本/build number、target SDK 36 及签名校验；这些是历史签名证据；本轮名称、隐私/关于文案和 Flutter 初始化修复改变了源码，当前正式 Android 包必须重新构建后才能分发。

- Kotlin 报告：`.tmp/release/android-darwin-arm64/signed/report.json`。
- Flutter 报告：`.tmp/release/flutter-android-darwin-arm64/signed/report.json`；12 个 64 位原生库 ELF 与 ZIP 的 16 KB 对齐均通过。
- 软件验证包括 Flutter 144 项、Kotlin 100 项、iOS 31 项、AppKit 19 项、Avalonia Windows 86 项、Qt 45 项、桌面共享 170 项、Wails 3 项纯会话测试及 UniApp 27 个单测文件 / 15 静态门。[基础 CI](https://github.com/LuoYaoSheng/smart-ble/actions/runs/38030372948) 全部 8/8 成功，iOS 31 项单测和 11 项界面测试均通过。

Qt 的新增 Windows ARM64 [构建任务](https://github.com/LuoYaoSheng/smart-ble/actions/runs/38027084309/job/114140118989) 已通过 45 项测试、打包与 123 个原生 PE 二进制架构检查（0xAA64），完整产物已上传；未使用 x64 仿真。

Linux Electron 的最终 ELF 主程序与 x64 15 个 / ARM64 9 个原生模块架构核验、包内 HCI N-API 加载已在新 CI 通过。该加载验证不初始化适配器，真实空口仍单独待验。

iOS 的预览初始化竞态、窄屏详情宽度、复制反馈和按钮命中区已修复。结构审计保留全部既定检查，恢复 P003/P005，未新增豁免。macOS 包内实际版本、蓝牙/相机用途说明与主程序双架构均已校验。上述 CI 为记录提交的历史证据；当前 Windows 状态和统一名称修改需要新的候选构建。

## 仍未验收

候选构建通过与已签名 Android 包不等于商店可发布。机器状态见 [platform-matrix.json](../release/platform-matrix.json)。

- iOS 结构审计已通过；全量无障碍合规分开记录，历史 contrast / Dynamic Type / textClipped 豁免和真机 VoiceOver 仍需复核。
- 每种实现的真实 BLE、Smart HID READY/恢复、OTA 取消/失败/重启版本核验，以及干净安装/升级仍需当前版本真机证据。附近扫描结果与模拟器、单测不能替代该证据。
- UniApp 还需 HBuilderX / 自定义原生基座、原生 SDK 审计和正式签名包；H5 与 App 资源编译不等于原生包。
- 原生 Apple 路线已由用户选择 Team 72MZZQB893，iOS/Mac 共用新 Bundle ID，正式 IPA/PKG 已成功导出并验签。App Store Connect 上传、真机 TestFlight 及审核仍未执行；见 native-apple-publishing.md。
- 原生 Mac App Store 包签名与沙盒/蓝牙/相机能力已验收；官网 Developer ID 分发、公证及 Windows Authenticode 仍未验收。
- 用户已明确暂缓其他上架资料；公开隐私 URL、各商店 SDK/权限申报、主体认证和商店提交保持未完成。没有执行商店上传或正式分发。

代码收敛与后续修复在 [草稿 PR #2](https://github.com/LuoYaoSheng/smart-ble/pull/2)；保留完整修改供复核，不将当前构建状态当成发布批准。

## Windows 虚拟机与统一名称后续

用户确认所有客户端显示名为 **BLE Toolkit+**，没有 USB 蓝牙适配器时先完成软件验证。窗口、系统显示名称、Mac `.app` 与安装包产品名称已统一；内部工程/目标名称和 `com.i2kai.open.smartble` 保留。

最新本地回归：Flutter 149 项且 analyze 无问题，Windows ARM64 Avalonia 106 项，桌面共享 190 项，Qt 48 项（Windows 实机复核正向测试时限修复中）。SwiftUI 更名后 31 项单测通过。iOS IPA 与 Universal Mac PKG 已重新签名导出并逐包核对名称、Team、签名、描述文件及沙盒/蓝牙/相机权限，见 `release/apple-native-store-build.json`。

虚拟机软件状态与真实无线功能分开记录；无适配器的可用性查询已实际返回 `noAdapter`。详细步骤与最终证据见 `docs/windows-vm-software-validation.md`。
