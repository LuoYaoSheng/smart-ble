# SmartBLE - macOS/iOS 原生版

使用 SwiftUI + CoreBluetooth 实现的原生 Apple 平台 BLE 调试工具。

> **产品规范（公共）**：本应用按 [docs/specs/](../../docs/specs/README.md) 产品基准规范开发——功能、页面、流程、交互、设计系统以规范为准；平台差异只在 [10_platform 差异设计](../../docs/specs/10_platform/PLATFORM_EXTENSION.md) 圈定范围内实现。

---

## 在产品家族中的角色

这个版本承担的是 `smart-ble` 家族里的原生 Apple 平台路线：

- 验证原生 iOS / macOS BLE 体验
- 提供与 Flutter、uni-app 的对照实现
- 沉淀 Apple 平台 BLE 教学内容

它不只是“一个客户端”，也是理解 CoreBluetooth、SwiftUI / Swift Package 实践的学习入口。

## 功能特性

### 扫描功能 (Central 模式)
- ✅ 扫描附近的 BLE 设备
- ✅ 显示设备名称、信号强度、广播数据
- ✅ 连接/断开设备
- ✅ 发现服务和特征值
- ✅ 读取特征值
- ✅ 写入特征值 (HEX/UTF-8)
- ✅ 启用/禁用通知

### 广播功能 (Peripheral 模式)
- ✅ 创建 BLE 广播
- ✅ 设置广播名称和服务 UUID
- ✅ macOS/iOS 完整支持

---

## 适合谁

- 想做原生 iOS BLE 工具的人
- 想研究 Apple 平台 BLE 细节的人
- 想和 Flutter / uni-app 对照学习的人

## 当前工程形态

当前 `apps/ios/` 同时保留两条入口：

- `Package.swift`
  用于 `swift build` / `swift run` 的开发验证入口，适合快速验证共享 SwiftUI + CoreBluetooth 代码是否可编译。
- `SmartBLE.xcodeproj`
  通过 `xcodegen` 从 `project.yml` 生成的原生 iOS App 工程，作为后续 TestFlight / App Store 上架主线。

如果目标是原生 iOS 正式发布，请以 `SmartBLE.xcodeproj` 为准，而不是只停留在 Swift Package 入口。

## 构建和运行

```bash
cd apps/ios
swift run
```

### 生成原生 Xcode 工程

```bash
cd apps/ios
xcodegen generate --spec project.yml --project .
```

### 构建 iOS Simulator

```bash
xcodebuild \
  -project SmartBLE.xcodeproj \
  -scheme SmartBLEiOS \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

### 使用 Xcode 打开

```bash
open SmartBLE.xcodeproj
```

## App Store / TestFlight 准备项

当前工程已经具备以下原生 App 基础件：

- `project.yml`：XcodeGen 工程事实源
- `SmartBLE.xcodeproj`：可打开的 iOS App 工程
- `SmartBLE/Resources/Info.plist`
- `SmartBLE/Resources/PrivacyInfo.xcprivacy`
- `SmartBLE/Resources/LaunchScreen.storyboard`
- `SmartBLE/Resources/Assets.xcassets/AppIcon.appiconset`
- `ExportOptions-AppStore.plist`
- 蓝牙权限文案与后台模式声明

正式上架前仍需要按真实账号与产品资料补齐：

1. `DEVELOPMENT_TEAM`
   已定稿为 `72MZZQB893`（本机开发团队，见 `docs/specs/10_platform/BUNDLE_IDS.md`），如换团队改 `project.yml` 后重跑 `xcodegen generate`。
2. `PRODUCT_BUNDLE_IDENTIFIER`
   已定稿为 `com.smartble.ios`（家族包名规划见 `docs/specs/10_platform/BUNDLE_IDS.md`，签名走团队通配 profile）。
3. App Store Connect 元数据
   包括截图、描述、隐私问答、年龄分级、支持网址等。
4. 真机验证
   包括蓝牙权限弹窗、后台蓝牙模式、广播能力和 OTA 路径。

### Archive 后导出模板

仓库已提供：

```text
apps/ios/ExportOptions-AppStore.plist
```

使用前请先把其中的 `REPLACE_WITH_TEAM_ID` 替换为真实团队 ID。

## 资源与品牌同步

原生 iOS 入口不再手工散落维护品牌资源，而是从共享资产链路统一分发：

- 源头：`core/assets-generator/meta/images/master_icon.png`
- 品牌图：`core/assets-generator/meta/images/generated/`
- iOS 运行时资源：`Sources/Resources/Brand/`
- iOS App 资源编排：`SmartBLE/Resources/Assets.xcassets/`

如需刷新图标、About Hero 或分享图，请先更新共享源，再运行：

```bash
python3 core/assets-generator/generate_assets.py
```

## 项目结构

```
Sources/
├── SmartBLEApp.swift        # App 入口
├── ContentView.swift         # 主视图 (标签页导航)
├── Views/
│   ├── ScanView.swift        # 扫描页面
│   ├── DeviceDetailView.swift # 设备详情页面
│   ├── BroadcastView.swift   # 广播页面
│   └── LogView.swift         # 日志页面
├── Manager/
│   └── BLEManager.swift      # CoreBluetooth 封装
└── Models/
    └── BLEModels.swift       # 数据模型

SmartBLE/
└── Resources/
    ├── Info.plist
    ├── PrivacyInfo.xcprivacy
    ├── LaunchScreen.storyboard
    └── Assets.xcassets/
```
