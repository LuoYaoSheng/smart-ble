# Smart BLE 平台选择指南

> 你不需要一上来就理解所有实现。
> 先按目标选入口，再决定是否继续深入。

---

## 先说结论

如果你是第一次进入：

- 想最快体验：选 `BLE Toolkit+（Smart BLE 小程序版）`
- 想做跨平台移动：选 `Flutter`
- 想学桌面实现：先看 `Tauri`
- 想学原生移动：看 `Android` / `iOS`
- 想学硬件联动：看 `ESP32`

---

## 按目标选入口

## 1. 我只想最快体验 BLE

推荐：

- `BLE Toolkit+（Smart BLE 小程序版）`

适合：

- 第一次接触 BLE
- 想先理解扫描 / 连接 / 读写
- 不想先配环境

---

## 2. 我想做跨平台移动应用

推荐：

- `apps/flutter/`

适合：

- 想同时覆盖 Android / iOS
- 想学一套移动主线实现

---

## 3. 我想学原生移动能力

推荐：

- `apps/android/`
- `apps/ios/`

适合：

- 想看平台原生 API
- 想研究原生体验和能力边界

---

## 4. 我想学桌面 BLE 工具

推荐顺序：

1. `apps/desktop/tauri/`
2. `apps/desktop/electron/`
3. `apps/desktop/macos/`

说明：

- `Tauri` 更适合作为轻量桌面主入口
- `Electron` 更偏全功能和历史兼容
- `macOS Native` 更偏原生体验

---

## 5. 我想做硬件联动

推荐：

- `hardware/esp32/`
- [BLE 协议](./03-ble-protocol.md)
- [数据流图](./02-data-flow.md)

适合：

- 想让设备和客户端一起联调
- 想学 BLE 外设和协议交互

---

## 一张表看懂

| 目标 | 推荐入口 | 原因 |
|------|----------|------|
| 最快体验 | `BLE Toolkit+` | 不用先搭环境 |
| 跨平台移动 | `Flutter` | 统一移动主线 |
| Android 原生 | `apps/android/` | 直接看 Kotlin + Compose |
| iOS 原生 | `apps/ios/` | 直接看 Swift + CoreBluetooth |
| 桌面工具 | `Tauri` | 轻量且适合作为桌面入口 |
| 硬件联动 | `hardware/esp32/` | 最适合看端到端联调 |

---

## 下一步

- [Start Here](./START_HERE.md)
- [BLE FAQ](./BLE_FAQ.md)
- [平台差异](./05-platform-differences.md)
