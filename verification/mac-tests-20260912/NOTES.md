# Mac 全端测试轮 — 2026-09-12

用户指令「开始所有mac端测试」：凡本 Mac 可跑的测试线全部执行。修复 3 处后全绿。

## 结果矩阵

| 线 | 命令 | 结果 |
|---|---|---|
| SmartHidCore（共享核心） | `swift test` | ✅ 32/32（0 failures） |
| SmartBLE-mac（N-MAC） | `swift build` | ✅ Build complete（无测试目标） |
| iOS 原生（单测+XCUITest） | `xcodebuild test -scheme SmartBLEiOS -destination 'iOS Simulator,name=iPhone 17 Pro Max'` | ✅ ** TEST SUCCEEDED **（UI 套件可见 11 例全过：A11Y 审计×5 + AdvData×1 + FlowState×3 + TabBar×2） |
| Flutter | `flutter test` + `flutter analyze` | ✅ 122/122 全过 + analyze 0 issues（修复后） |
| Android JVM 单测 | `JAVA_HOME=JBR21 ANDROID_HOME=…sdk ./gradlew :app:testDebugUnitTest` | ✅ 60/60（修复后，BUILD SUCCESSFUL） |
| Tauri 后端 | `cargo test`（src-tauri） | ✅ 编译净、0 测试存在（exit 0） |
| Electron | `node --check` src 2 文件 + public 8 文件 | ✅ 10/10 语法全过（无测试脚本；本轮早前 CDP 10 视图真 BLE 烟测已过） |
| uniapp H5 | `npm run build:h5` | ✅ Build complete（vite 对 ota/package-validator 的 node:crypto 外置为已知警告） |

## 发现并修复的 3 处

1. **Flutter ble_manager 真缺陷**（apps/flutter/lib/core/ble/ble_manager.dart `initialize()` catch 分支）：
   初始化抛异常（如宿主平台不支持 flutter_blue_plus）时只 print 不落状态 → state 永停 null →
   芯片永卡「初始化中…」——与 Electron ac71509 同类的卡瞬态缺陷。修复：catch 内补发
   `BleState.unavailable`，落定为「平台不支持」。
2. **Flutter widget_test 滞后**（test/widget_test.dart）：两条断言仍在旧三态口径
   （null/unknown→平台不支持）。同步四态：null/unknown/turningOn/turningOff→「初始化中…」
   （并补齐 turning* 两例）；结构测试的芯片词表加「初始化中…」。测试名从
   "canon 3-state vocabulary" 更名 "canon vocabulary + desktop transient"。
3. **Android VersionMetadata 滞后**（裁撤小程序轮遗留）：latest.json 数据已无 wechat
   （正典六键），但 VersionMetadata.kt 两个有序键清单仍带死键 wechat（运行时被 mapNotNull
   滤掉）、VersionMetadataTest 仍断言旧七键 → 60 挂 2。修复：源码两个清单删 wechat（注释
   七键→六键）、g3/m1 断言同步、m2 注入向量删 wechat 块。

## 备查

- iOS A11Y-INVENTORY 为诊断性用例：p009/p010 的 NOT_RELEASED 等徽标对比度有记录性发现
  （不判死）；正式 Gate 用例全过。此前无障碍 Gate 轮已裁决过同类项。
- 通知系统报的后台任务 exit code 可能为管道尾命令（tail）的退出码，本轮两次以
  `${pipestatus[1]}` 实测纠偏（Android 真实 exit=1 → 修复后 0）。
- Web 官网 docs:build 本轮早前（fb8e317）已验证，不重复。
- Avalonia（无 dotnet）与 Qt/linux 壳按 AGENTS.md 归 Windows 机专项，不在本 Mac 范围。
