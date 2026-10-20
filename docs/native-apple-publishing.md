# 原生 iOS 与 Mac 上架

本轮正式上架选择 **SwiftUI iOS 与 AppKit macOS**，应用名称统一为 **蓝析BLE工具箱**。统一入口为仓库根目录 `SmartBLE-Apple.xcworkspace`，包含 `SmartBLEiOS`、`SmartBLEMac` 两个独立原生应用目标。

两端 Bundle ID 均为 `com.i2kai.open.smartble`，版本 **1.0.5 / build 101**。App Store Connect 使用一个应用记录添加 iOS、macOS 两个平台，各自准备构建、截图及审核资料：[Apple 添加平台说明](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-platforms)。其他客户端实现继续保留和验证。

## 2026-10-19 已生成的历史上架包

> 2026-10-20：本地 OTA 事务与固件正在补齐；下列包不包含本轮修复，保留作历史验包证据。须完成真实设备验证后，从修复后的源码重新归档、签名和验包，再进入上传流程。见 [OTA 当前说明](./ota-local-upgrade.md)。

| 平台 | 原生实现 | 当前安装包 | 架构 |
| --- | --- | --- | --- |
| iOS | SwiftUI | `.tmp/release-delivery/2026-10-19/apple/蓝析BLE工具箱-1.0.5-ios-原生-AppStore.ipa` | arm64 |
| Mac App Store | AppKit | `.tmp/release-delivery/2026-10-19/apple/蓝析BLE工具箱-1.0.5-macos-原生-AppStore.pkg` | arm64、x86_64 通用版 |

两包均已使用用户指定的 **longcan cai / 72MZZQB893** 团队正式签名，并从 Xcode 以 `app-store-connect` 方式导出。完整 SHA256、来源源码树、包内名称与签名证据见 `release/apple-native-store-build.json`；本地副本为交付目录的 `apple/report.json`。

已检查的是实际导出包：

- iOS：中文显示名、统一 Bundle ID、1.0.5/101、Apple Distribution 签名、App Store profile，无设备列表，`get-task-allow=false`；编译后的 iPhone/iPad 图标、Assets.car、启动屏和隐私清单均在包内。
- Mac：中文显示名、统一 Bundle ID、1.0.5/101；应用签名和该团队的 `3rd Party Mac Developer Installer` 安装器签名均通过。实际 Mach-O 为 arm64/x86_64，保留 `app-sandbox`、`device.bluetooth`、`device.camera`，没有调试 entitlement。
- 上述检查是本地验包与验签；**商店上传、Apple 服务端验证、TestFlight、真实 BLE 和安装升级验证尚未执行**。

历史 BLE Toolkit+ 包保留在旧本地目录及 Git 历史中，不再作为当前交付包。此次首次导出的 iOS 包因缺资源已移入 `.tmp/release-build-stale/2026-10-19/apple-missing-resources/`，不属于有效交付。

## 工程与可重复构建

- iOS：`apps/ios/SmartBLE.xcodeproj`，scheme `SmartBLEiOS`，生成配置 `apps/ios/project.yml`。
- Mac：`apps/desktop/macos/SmartBLE-mac/SmartBLEMac.xcodeproj`，scheme `SmartBLEMac`，生成配置为同目录 `project.yml`。
- iOS 的应用图标、启动屏及隐私清单已改为 XcodeGen `sources` 中明确的资源构建阶段；原先 target 下的 `resources` 字段未进入实际工程。发布脚本现在直接验证归档内的资源，避免只确认源文件存在。
- 所有 Mac 候选包会递归检查包内 Mach-O，包括 framework、dylib、原生扩展与主程序，均须包含 arm64/x86_64。

本轮签名归档位于交付目录的 `apple/ios.xcarchive`、`apple/macos.xcarchive`。本机使用新构建的 Release 归档、已安装的商店 profile 与指定团队的 Apple Distribution 身份完成签名，再通过 Xcode 导出；Mac 在签名时保留沙盒等 entitlements。具体本地步骤保存在交付目录的 `apple/sign-and-export.py`，不包含密码或私钥。

签名材料留在本机钥匙串及外部配置，不能提交 Git。Mac App Store 包与官网 Developer ID 分发有各自的签名流程：[Apple Mac 分发说明](https://developer.apple.com/macos/distribution/)。本次原生 Mac PKG 用于 Mac App Store 提交。

## 后续上传与审核

在 Xcode Organizer 打开两个归档，分别选择 App Store Connect 分发，先验证再上传。上传后用 TestFlight 检查真实蓝牙、扫码、Smart HID 配网、OTA 取消/失败/重启和安装升级，并准备审核可复现步骤。

发布主体为个人，公开邮箱 `121912336@qq.com`，官网及隐私政策为 `https://lightble.i2kai.com/`、`https://lightble.i2kai.com/privacy`。商店仍需各平台截图、描述、隐私回答、年龄分级与审核说明；此前用户暂缓的资料没有擅自填写或提交。本轮没有执行商店上传。
