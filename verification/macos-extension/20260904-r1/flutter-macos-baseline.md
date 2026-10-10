# Flutter macOS 修改前基线 — run 20260904-r1

目录：`apps/flutter`（worktree smart-ble-macos，base dbb38a8）

## 命令结果

| 命令 | 结果 | 状态 |
|---|---|---|
| `flutter pub get` | 成功；但 pubspec.lock 漂移（Changed 107 dependencies，+251/-171） | **PASS_WITH_LIMITATION** |
| `dart format --output=none --set-exit-if-changed lib test` | 20 个文件将被重排（lib/ui/widgets 等），exit 1 | **FAIL（共享层既有状态，非 Mac 引入）** |
| `flutter analyze` | No issues found (2.9s) | **PASS** |
| `flutter test` | All tests passed（11 项；测试 VM 中 BleManager 初始化按预期报 platform unsupported 日志） | **PASS** |
| `flutter devices` | macOS (desktop) + iphone (wireless) + Chrome | PASS |
| `flutter build macos`（默认=Release） | ✓ Built build/macos/Build/Products/Release/smart_ble.app (46.2MB) | **PASS** |
| `flutter build macos --debug` | ✓ Built build/macos/Build/Products/Debug/smart_ble.app | **PASS** |
| `flutter run -d macos --no-resident` | App 启动，FBP 初始化，adapter→PoweredOn | **PASS** |

## 产物

| 产物 | 路径（不提交） | SHA256 |
|---|---|---|
| Release 主二进制 | `apps/flutter/build/macos/Build/Products/Release/smart_ble.app/Contents/MacOS/smart_ble` | `b49461584ac5dc593c2a285868bca5952c25954485536d4d66824d5f05e91ff7` |
| Bundle ID | `com.smartble.flutter`（本地默认值，见 Configs/AppInfo.xcconfig） | — |
| 版本 | 2.0.0 | — |

## 关键日志（flutter run，原文摘录）

```
[FBP-iOS] initializing CBCentralManager
[FBP-iOS] handleMethodCall: isSupported
Error: Message responses can be sent only once. Ignoring duplicate response on channel 'flutter_blue_plus/methods'.
[FBP-iOS] handleMethodCall: getAdapterState
[FBP-iOS] centralManagerDidUpdateState CBManagerStatePoweredOn
```

蓝牙权限：**首次运行未出现阻塞弹窗，直接 PoweredOn**（本机此前已授权 com.smartble.flutter）。

## 未提交内容与理由

- `apps/flutter/pubspec.lock`：共享 lock，pub get 漂移 **不提交**（本工作区已还原）。
- `apps/flutter/macos/Flutter/GeneratedPluginRegistrant.swift`：漂移导致 `path_provider_foundation`
  被移除，非 macOS 平台必需，**不提交**（已还原）。
- `apps/flutter/macos/Podfile.lock`：漂移副产物，**不提交**（已还原）。
- `build/`、`Flutter/ephemeral/`：构建产物，未跟踪、不提交。
- 未为了 build 通过修改 `apps/flutter/lib`（format FAIL 属共享层既有状态，仅记录）。

## 结论

构建/运行/测试/分析四项全绿；唯一红灯是共享层 dart format 既有漂移（Windows 主线事项）。
Flutter macOS Runner 在本机开箱即可构建与运行，BLE 权限链路通畅。
