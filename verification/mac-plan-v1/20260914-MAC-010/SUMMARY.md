# MAC-010 证据：Electron / Tauri macOS 目标

- Host: macOS arm64 / electron-builder / tauri-cli 1.6.3

## 构建产物（2026-09-14）

| 线 | 命令 | 产物 | 蓝牙声明 |
|---|---|---|---|
| Electron | `npm run build:mac`（EXIT=0） | `BLE Toolkit+-1.0.5-arm64.dmg` + `-mac.zip`（dist/） | Info.plist `NSBluetoothAlwaysUsageDescription` = "This app needs access to Bluetooth" ✓ |
| Tauri | `cargo-tauri build` | `BLE Toolkit+.app` + `BLE Toolkit+_1.0.5_aarch64.dmg` | Info.plist `NSBluetoothAlwaysUsageDescription` = "This app needs Bluetooth access to scan for and connect to BLE devices." ✓ |

## 复验口径

- 本轮未修改 Electron/Tauri 共享源码（Windows 写锁区），仅构建验证——产物可复现。
- macOS 真实 BLE 功能面：原生 AppKit 线当日全链复验（见 MAC-007：扫描/连接/GATT NVC-04 PASS）；Electron 真 BLE 链最近证据 = 2026-09-12 UI Parity 轮（Electron 真BLE链全过，双远程可溯）。
- Linux（AppImage/deb/rpm + BlueZ 依赖说明）：归 MAC-011 CI 工作流（本轮无 Linux 受控环境）。
- Windows 侧桌面断言复核：WIN-002 拉取 MAC-001/002 结论后处理（tests/desktop 平台断言已由 Mac 机械更新并登记）。

- Status: PASS_WITH_OBS（Linux 归 MAC-011；Windows 复核交接在册）
