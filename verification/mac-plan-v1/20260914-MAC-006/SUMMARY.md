# MAC-006 证据：SwiftUI iOS 发布链

- Host: macOS / Xcode；真机 iPhone 11 Pro（iPhone12,3，UDID 1A7C9E98-8481-53BE-8926-0D6A5D291387，已配对）

## 修复与验证（2026-09-14）

| 项 | 结果 |
|---|---|
| UIPasteboard 隔离 | ScanView.swift 剪贴板回显探针（#if DEBUG）补 `#if os(iOS)` 门控；SwiftPM macOS `swift build` Build complete（此前 cannot find 'UIPasteboard'） |
| 入口声明 | apps/ios/README.md 已明确：SwiftPM=开发验证入口、SmartBLE.xcodeproj=iOS 正式发布入口（既有） |
| Simulator build/test | `make verify-apple-ios`：xcodebuild test（iPhone 17 Pro Max）TEST SUCCEEDED（SmartBLETests + XCUITest 12，见 MAC-002 证据） |
| Archive | `xcodebuild archive -scheme SmartBLEiOS -destination generic/platform=iOS` → SmartBLE.app（Team 72MZZQB893 开发签名）EXIT=0 |
| 真机安装 | `devicectl device install app` → App installed |
| 真机启动 | `devicectl device process launch com.smartble.ios` → Launched |

## 状态与限制

- 真机 E5 完整 BLE 链（权限→扫描→连接→GATT→Peripheral→Smart HID→OTA）：本轮完成设备侧安装+启动证据；完整链历史证据见 Phase 4 真机四块（签名链/息屏BLE/单测/XCUITest），端到端复验归 E5 矩阵（MAC-012 汇总）。
- App Store 导出（ExportOptions-AppStore）：需 Apple 开发者账号正式凭据 → NOT_RUN（红线：凭据不入库）。

- Status: PASS_WITH_OBS
