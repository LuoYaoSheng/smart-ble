# Smart BLE

> `lys: 跨平台 BLE 调试工具与实践样板项目`
>
> Part of the lys personal open source system.

跨平台 BLE 调试工具，覆盖小程序、跨平台移动、原生移动、桌面端和硬件示例。  
这个仓库不是单一实现，而是一个围绕 BLE 调试、教学和跨平台实践展开的产品家族。

---

## 项目定位

`Smart BLE` 解决的不是“某个平台缺一个调试工具”，而是：

- BLE 调试工具分散，体验不统一
- 学习资料零散，软硬件脱节
- 不同平台实现难以横向对比

因此这个仓库同时提供：

- 可直接使用的 BLE 调试工具
- 多平台实现对照样例
- 硬件示例与协议参考

---

## 快速选择

根据你的目标直接进入对应入口：

- 微信小程序 / H5 / uni-app App：[`apps/uniapp/`](./apps/uniapp/)
- 跨平台移动版：[`apps/flutter/`](./apps/flutter/)
- Android 原生版：[`apps/android/`](./apps/android/)
- iOS / macOS 原生版：[`apps/ios/`](./apps/ios/)
- 轻量桌面版：[`apps/desktop/tauri/`](./apps/desktop/tauri/)
- 全功能桌面版：[`apps/desktop/electron/`](./apps/desktop/electron/)
- macOS 原生桌面版：[`apps/desktop/macos/`](./apps/desktop/macos/)
- 硬件示例：[`hardware/esp32/`](./hardware/esp32/)

---

## 产品家族说明

这个仓库当前包含多种实现：

| 方向 | 技术栈 | 角色 |
|------|--------|------|
| uni-app | Vue 3 + uni-ui | 小程序与轻量传播入口 |
| Flutter | Flutter + Dart | 跨平台移动主线 |
| Android 原生 | Kotlin + Jetpack Compose | 原生 Android 探索与增强 |
| iOS 原生 | Swift Package + SwiftUI + CoreBluetooth | 原生 iOS / macOS 探索与增强 |
| Tauri | Rust + btleplug | 轻量桌面入口 |
| Electron | Node.js + noble | 全功能桌面实现 |
| macOS Native | Swift + AppKit | 原生 macOS 桌面体验 |
| Avalonia | .NET 8 + C# | Windows 原型验证 |
| ESP32 | PlatformIO + Arduino | 硬件联动与协议示例 |

对外主入口只有一个：`lys-smart-ble`。  
历史仓库 `LightBLE`、`SmartBLE-iOS` 只保留迁移与历史资产价值。

---

## 多分支多模式定位

`smart-ble` 的核心特点不是“支持很多平台”这么简单，而是它本身就是一个多分支、多模式的 BLE 工具家族：

```text
lys-smart-ble
├── 小程序版       → uni-app（Vue 3）
├── 移动版         → Flutter（跨平台）
├── 桌面轻量版     → Tauri（Rust）
├── 桌面完整版     → Electron（JavaScript）
├── macOS 原生版   → Swift（AppKit）
├── iOS 原生版     → Swift（开发中，已有实现）
├── Android 原生   → Kotlin（开发中，已有实现）
├── ESP32 固件     → PlatformIO + Arduino
└── STM32 固件     → 规划中
```

这也是为什么这个仓库需要同时保留：

- 多平台并行维护
- 代码开源
- 教学友好
- 硬件固件开放

---

## 仓库结构

```text
smart-ble/
├── apps/
│   ├── uniapp/
│   ├── flutter/
│   ├── android/
│   ├── ios/
│   └── desktop/
│       ├── tauri/
│       ├── electron/
│       ├── macos/
│       ├── windows/
│       └── linux/
├── core/
├── hardware/
│   ├── common/
│   └── esp32/
└── docs/
```

---

## 维护分层

| 层级 | 平台 | 说明 |
|------|------|------|
| 主要入口 | uni-app、Flutter、Tauri | 当前优先保证可用性和对外表达 |
| 增强与对照 | Android 原生、iOS 原生、Electron、macOS Native | 已有实现，承担原生探索、教学和历史兼容价值 |
| 实验性 | Avalonia、其他未来探索 | 原型验证，不承诺同等投入 |

---

## 核心能力

- BLE 设备扫描与过滤
- 连接 / 断开与服务发现
- 特征值读写（UTF-8 / HEX）
- 通知订阅与实时日志
- 外设模式 / BLE 广播（依平台能力而定）
- ESP32 示例固件与协议联动

---

## 快速开始

### uni-app

```bash
cd apps/uniapp
npm install
npm run dev:mp-weixin
```

### Flutter

```bash
cd apps/flutter
flutter pub get
flutter run
```

### Android 原生

```bash
cd apps/android
./gradlew assembleDebug
```

### iOS / macOS 原生

```bash
cd apps/ios
swift run
```

### Tauri 桌面版

```bash
cd apps/desktop/tauri
cargo tauri dev
```

### Electron 桌面版

```bash
cd apps/desktop/electron
npm install
npm start
```

### ESP32 硬件示例

```bash
cd hardware/esp32/LightBLE
pio run
pio run --target upload
pio device monitor
```

---

## 文档

- [功能规格](./docs/01-functional-specs.md)
- [数据流图](./docs/02-data-flow.md)
- [BLE 协议](./docs/03-ble-protocol.md)
- [UI 流程](./docs/04-ui-flows.md)
- [平台差异](./docs/05-platform-differences.md)
- [公众号系列](./docs/wechat-articles/README.md)

---

## 适用人群

- BLE 设备开发者
- 跨平台客户端开发者
- 嵌入式工程师
- BLE 学习者
- 需要教学样例和多实现对照的人

---

## 许可协议

[MIT License](LICENSE)
