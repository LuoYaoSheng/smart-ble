# N-IOS 真机测试补口：XCUITest on device 首跑 + 单元测试真机 — 验证报告

- 日期：2026-09-11（接 2026-09-10 Phase 4 §4.2 移交项「自动化 UI 回归（XCUITest on device）待排期」）
- 分支：refactor/uniapp-v1（HEAD 0192433）
- 设备：iPhone 11 Pro (iPhone12,3)，iOS 26.5.2，UDID `00008030-001211062EC0802E`
- 设备态实测：`developerModeStatus: enabled`；`passcodeRequired: false`；`unlockedSinceBoot: true`（devicectl lockState，2026-09-11 07:55）

## 1. 判定总表

| # | 项目 | 判定 | 关键证据 |
|---|---|---|---|
| 1 | 单元测试真机（SmartBLETests） | **PASS 24/24** | 6 套件全过：AppleSharedCoreWiring / Contrast / HidProvisionManager / NativePageContract / OtaContractFrame / ScaledFont；`Executed 24 tests, with 0 failures`（logs/unittest-device.log；UnitTests-device.xcresult）——**N-IOS 首份真机宿主内逻辑测试证据**（此前单测仅模拟器跑） |
| 2 | UI 自动化真机（SmartBLEUITests 11 用例） | **BLOCKED（环境）** | 2 次运行均失败于同一处：`SmartBLEUITests-Runner … The test runner failed to initialize for UI testing. (Underlying Error: Timed out while enabling automation mode.)`（logs/uitest-device.log；UITests-device.xcresult 含 devicectl diagnostics zip）。**非代码问题**：同会话内单元测试可正常装机/宿主运行（#1），证明签名链/安装/app 启动全通；卡点仅在 XCUITest automation mode 使能 |

## 2. 卡点诊断（automation mode 超时）

已排除：设备锁屏（unlockedSinceBoot=true）、开发者模式（enabled）、签名/安装/启动（单测真机全通过）。

剩余最可能原因（均需一次手机物理交互）：

1. **手机屏幕休眠**——automation mode 使能需点亮屏幕；
2. **手机上挂着待人工确认的自动化/信任弹窗**（首跑 XCUITest 常见，无人点按则超时）。

Mac 侧曾尝试 Xcode Devices 窗口「View Device Screen」查看手机画面以确诊：`devices://` URL 无处理器；开 Xcode 后 NSRunningApplication 置前 6 次全被 ZCode 抢回（front=ZCode ×6），GUI 探测按红线中止（防误点）。另：整屏 `screencapture -x` 再次出现黑屏异常（同 UI-CONV 轮已知坑，窗口裁剪通道正常）。

**解锁动作（用户）**：点亮手机屏幕并确认无待点弹窗（如有「允许/信任」类弹窗点允许）。之后可直接重跑：

```bash
cd apps/ios && xcodebuild test -project SmartBLE.xcodeproj -scheme SmartBLEiOS \
  -destination 'id=00008030-001211062EC0802E' -derivedDataPath build/DerivedData \
  -only-testing:SmartBLEUITests -resultBundlePath ../../verification/ios-device/<run>/UITests.xcresult
```

## 3. iPhone 真机覆盖度现状（截至本报告）

| 已在真机 PASS | 轮次 |
|---|---|
| 签名链（通配 profile×证书×设备）+ 构建 + 安装 + 首启存活 | 20260910-phase4 |
| 息屏后台 BLE 收发全环（10.5min：notify 接收/GATT 写下发/链路游标 LINK_UP） | e5/20260910-ios-bg-ble |
| 单元测试 24/24（真机宿主执行） | **本轮** |
| UI 自动化 11 用例 | ~~BLOCKED~~ → **2026-09-11 解除，12/12 PASS**（见 [../20260911-uitest-retry/REPORT.md](../20260911-uitest-retry/REPORT.md)；实际用例数 12，本表初记 11 系漏数） |

真机**视觉**证据（截图）仍空缺：vis1 轮 N-IOS 证据均为模拟器 simctl 通道；待 UI 自动化解锁后由 XCUITest 截图/XCTAttachment 补首份真机截图。

## 4. 证据清单

- `logs/unittest-device.log` —— 真机单测全量日志（PASS）
- `UnitTests-device.xcresult` —— 真机单测 result bundle（PASS）
- `logs/uitest-device.log` —— 第 2 次 UI 运行日志（第 1 次同错误被覆盖，两跑均留 EXIT=65 记录于会话）
- `UITests-device.xcresult` —— UI 运行 result bundle（含 devicectl_diagnostics.zip）
