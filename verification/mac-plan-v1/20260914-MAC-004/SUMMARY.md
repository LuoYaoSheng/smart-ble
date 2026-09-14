# MAC-004 证据：Flutter 多端候选版

- Host: macOS / Flutter（含捆绑 dart）/ Xcode / JDK（经 Gradle）

## 构建（2026-09-14）

| 目标 | 命令 | 结果 | 产物 |
|---|---|---|---|
| Android | `flutter build apk --debug` | ✓ | build/app/outputs/flutter-apk/app-debug.apk |
| iOS Simulator | `flutter create --platforms=ios .` 补脚手架后 `flutter build ios --simulator --no-codesign` | ✓ | build/ios/iphonesimulator/Runner.app |
| macOS | `flutter build macos` | ✓ | build/macos/Build/Products/Release/smart_ble.app（49.8MB，仅 ld 搜索路径 warning） |

## 测试基线

- `flutter analyze`：No issues found
- `flutter test`：122/122 All tests passed（含移除未使用依赖后复跑）
- 依赖治理：`flutter_platform_widgets ^6.0.2`（已停止维护）经全仓扫描 lib/test/integration_test 零引用 → 移除；analyze/test 复验全绿

## 状态与限制

- Web/Linux：仅声明真实插件支持范围（flutter_blue_plus 不支持 Web；Linux 未验证）——不构建不冒充。
- E5 真机（物理 Android/iPhone/Mac BLE 链）：本轮无真机排期 → BLOCKED（不以模拟器冒充）。
- 候选 Artifact：三端构建产物在本机 build/ 目录可复现；正式 Artifact 登记（版本/commit/SHA256）并入 MAC-011 发布管线，此前一律 Preview。
- iOS 首次构建出现一次 Linker 瞬态失败，二次构建成功（Xcode build done 5.3s）。

- Status: PASS_WITH_OBS
