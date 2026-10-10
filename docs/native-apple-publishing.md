# 原生 iOS 与 Mac 上架

本轮正式上架选择 SwiftUI iOS 与 AppKit macOS。统一入口为仓库根目录 `SmartBLE-Apple.xcworkspace`，包含 `SmartBLEiOS` 和 `SmartBLEMac` 两个独立原生应用目标。原有 Flutter、Tauri 等实现保留。

两端 Bundle ID 都是 `com.i2kai.open.smartble`，版本 `1.0.5`、build `101`。App Store Connect 创建一个 Smart BLE Open 应用记录并添加 iOS、macOS 两个平台；每个平台分别提交构建、截图与审核资料。这是 Apple 支持的多平台分发方式：[添加平台](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-platforms)。

## 当前可用工程

- iOS：`apps/ios/SmartBLE.xcodeproj`，scheme `SmartBLEiOS`。
- Mac：`apps/desktop/macos/SmartBLE-mac/SmartBLEMac.xcodeproj`，scheme `SmartBLEMac`，源配置 `project.yml`，可用 `xcodegen generate --spec apps/desktop/macos/SmartBLE-mac/project.yml` 重建。
- Mac 新 Xcode 目标已完成无签名 Archive；`x86_64 + arm64`、Bundle ID、1.0.5/101、九张资源插图及隐私清单已核验。归档位置 `.tmp/release/apple-native/SmartBLEMac.xcarchive`。沙盒、蓝牙、相机能力已配置；无签名 Archive 仍不能上传。

## 账号与签名

1. 用准备发布的付费 Apple Developer 个人账号登录 Xcode → Settings → Accounts。
2. 确认该账号的 Team ID。当前电脑的开发证书属于 `L5Q7JP9RH9`，分发证书属于 `72MZZQB893`，不能仅凭证书存在假定是同一发布团队。
3. 在 workspace 中分别选择两个应用 target，进入 Signing & Capabilities，勾选 Automatically manage signing，选择同一个已确认 Team。原 iOS Team 配置暂未代替用户改动。
4. 在该 Team 注册明确的 App ID `com.i2kai.open.smartble`，并在 App Store Connect 建立应用记录。iOS 与 Mac 的分发描述文件分别匹配其平台、同一 Team 与 Bundle ID。Apple 允许 Xcode 管理分发 profiles：[官方说明](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile)。

账号密码、证书私钥、API 私钥不放聊天或 Git。当前尚无本次新 Mac 目标的正式分发签名/导出成功证据。

## 分别生成与上传构建

- iOS：选 `SmartBLEiOS`，目标选通用 iOS 真机，Product → Archive；Organizer → Distribute App → App Store Connect，先验证再上传。
- Mac：选 `SmartBLEMac`，目标选通用 Mac（Apple Silicon 与 Intel），Product → Archive；Organizer → Distribute App → App Store Connect，先验证再上传。

Mac App Store 要求 App Sandbox，当前目标已配置；Mac 商店安装包与官网 Developer ID 分发是各自的签名流程：[Apple 分发说明](https://developer.apple.com/macos/distribution/)。本轮以上述两个商店平台为主。

## 提交审核前

上传成功后，先用 TestFlight 检查 iPhone 与 Mac 的真实蓝牙、扫码、配网、OTA 取消/失败/重启和安装升级。为审核提供蓝牙硬件使用说明及可复现操作；软件构建、UI fixture 不能替代真机证据。

App Store Connect 仍需各平台截图、描述、公开支持与隐私政策 URL、隐私回答、年龄分级及审核说明。发布主体为个人，公开邮箱 `121912336@qq.com`；此前用户暂缓的其他资料没有擅自填写或提交。iOS 结构审计通过与完整无障碍合规分别记录。

账号/Team 确认后继续正式 Archive、导出验证与上传准备，审核通过后的公开发布单独确认状态。没有执行本轮商店上传。
