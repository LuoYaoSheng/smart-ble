# Smart BLE

<div align="center">

  # 🎧 跨平台蓝牙(BLE)调试工具
  # 8+ 种实现 · 硬件固件 · 完全开源

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![版本](https://img.shields.io/badge/版本-2.0.0--dev-blue.svg)](https://github.com/luoyaosheng/smart-ble)
  [![平台](https://img.shields.io/badge/平台-iOS%20%7C%20Android%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/luoyaosheng/smart-ble)
  [![Star](https://img.shields.io/github/stars/luoyaosheng/smart-ble?style=social)](https://github.com/luoyaosheng/smart-ble)
[![Gitee](https://img.shields.io/badge/Gitee-smart--ble-red?logo=gitee&logoColor=white)](https://gitee.com/luoyaosheng/smart-ble/tree/refactor%2Fmulti-platform/)

  **专业的 BLE 调试工具 | 跨平台开发最佳实践 | 教学友好**

  [功能特性](#-功能特性) · [快速开始](#-快速开始) · [文档](#-文档) · [贡献](#-贡献指南)

  <img src="./qr_code.jpg" alt="微信小程序" width="180" />

  扫码体验微信小程序版本

</div>

---

## ✨ 为什么选择 Smart BLE？

| 痛点 | Smart BLE 解决方案 |
|------|-------------------|
| 🔴 调试工具不统一 | 🟢 **8+ 种实现**，覆盖所有主流平台 |
| 🔴 代码不完整/闭源 | 🟢 **完全开源**，硬件固件也开放 |
| 🔴 学习资料零散 | 🟢 **完整文档** + 真实硬件示例 |
| 🔴 软硬件分离 | 🟢 **端到端方案**，App + ESP32 固件 |

---

## 🏗️ 项目架构

```
smart-ble/
├── 📱 移动端
│   ├── uniapp/           # Vue 3 ✅
│   ├── flutter/          # Flutter ✅
│   ├── android/          # Kotlin 🚧
│   └── ios/              # Swift 🚧
├── 💻 桌面端
│   ├── electron/         # JavaScript ✅
│   ├── tauri/            # Rust ✅
│   ├── macos/            # Swift ✅
│   └── avalonia/         # .NET 🚧
├── 🔌 硬件
│   └── esp32/            # ESP32 固件 ✅
├── 📚 文档
│   └── wechat-articles/  # 公众号系列文章
└── 🔧 核心
    └── ble-core/         # BLE 抽象层
```

---

## 🚀 支持的平台

| 平台 | 技术栈 | 状态 | 说明 |
|------|--------|------|------|
| **uni-app** | Vue 3 + uni-ui | ✅ 完成 | 小程序/App/H5 一套代码 |
| **Flutter** | flutter_blue_plus | ✅ 完成 | Android/iOS/macOS |
| **Electron** | noble | ✅ 完成 | Win/Mac/Linux |
| **Tauri** | Rust + btleplug | ✅ 完成 | 轻量级 (~10MB) |
| **macOS 原生** | AppKit | ✅ 完成 | 原生体验 |
| **Avalonia** | .NET 8 + C# | 🚧 部分实现 | Windows 原型验证 |
| **Android 原生** | Kotlin + Jetpack | 🚧 开发中 | 原生体验 |
| **iOS 原生** | Swift + SwiftUI | 🚧 开发中 | 原生体验 |

---

## 📊 功能对比

| 功能 | uni-app | Flutter | Electron | Tauri | macOS | Avalonia |
|:----:|:-------:|:-------:|:--------:|:-----:|:-----:|:--------:|
| 扫描设备 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 连接管理 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 服务发现 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 特征值读写 | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ |
| 通知订阅 | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ |
| BLE 广播 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 操作日志 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## ✨ 功能特性

### 🔍 智能设备扫描
- 实时扫描附近 BLE 设备
- 信号强度过滤（-100dBm ~ 0dBm）
- 设备名称/前缀过滤
- 自动节流，防止 UI 卡顿

### 🔌 设备连接管理
- 一键连接/断开
- 服务自动发现
- 特征值读写（UTF-8 / HEX）
- 通知订阅，实时数据监控

### 📡 BLE 广播（外设模式）
- 自定义设备名称、UUID
- 厂商数据配置
- 手机变身蓝牙设备，用于测试

### 📖 实时操作日志
- 按类型分类（信息/成功/错误）
- 完整记录每一步操作
- 问题排查，一秒定位

### 🤖 硬件深度支持
- **ESP32 完整固件**，直接可用
- LED 控制（常亮/快闪/慢闪）
- JSON 格式数据交互
- 多权限特征值演示

---

## 🚀 快速开始

### 方式一：uni-app 版本（推荐新手）

```bash
# 克隆项目
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp

# 安装依赖
npm install

# 微信小程序
npm run dev:mp-weixin

# H5 版本
npm run dev:h5

# App
npm run dev:app
```

### 方式二：Flutter 版本

```bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
```

### 方式三：桌面端 Electron

```bash
cd smart-ble/apps/desktop/electron
npm install
npm start
```

### 方式四：ESP32 硬件

```bash
cd smart-ble/hardware/esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## 📚 文档

| 文档 | 描述 |
|------|------|
| [功能规格](./docs/01-functional-specs.md) | 功能清单、优先级、权限说明 |
| [数据流图](./docs/02-data-flow.md) | 扫描/连接/读写/广播流程 |
| [BLE 协议](./docs/03-ble-protocol.md) | 标准 UUID、ESP32 协议 |
| [UI 流程](./docs/04-ui-flows.md) | 页面布局、组件结构 |
| [平台差异](./docs/05-platform-differences.md) | 各平台差异说明 |
| [公众号系列](./docs/wechat-articles/README.md) | 项目介绍文章系列 |

---

## 🎯 适用场景

| 用户类型 | 推荐使用方式 |
|---------|-------------|
| **蓝牙设备开发者** | 直接使用 App 作为日常调试工具 |
| **跨平台开发者** | 参考代码，移植到自己的项目 |
| **嵌入式工程师** | 使用 ESP32 固件作为开发模板 |
| **蓝牙学习者** | 阅读代码 + 烧录硬件，实践学习 |
| **企业用户** | 基于 MIT 协议进行二次开发 |

---

## 🤝 贡献指南

我们欢迎任何形式的贡献！

- 🐛 [报告问题](https://github.com/luoyaosheng/smart-ble/issues)
- 💡 [功能建议](https://github.com/luoyaosheng/smart-ble/issues)
- 🔧 [提交 PR](https://github.com/luoyaosheng/smart-ble/pulls)
- 📖 [完善文档](https://github.com/luoyaosheng/smart-ble)

---

## 📄 开源协议

[MIT License](LICENSE)

---

## 🌟 Star 历史

<a href="https://star-history.com/#luoyaosheng/smart-ble&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=luoyaosheng/smart-ble&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=luoyaosheng/smart-ble&type=Date&theme=light" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=luoyaosheng/smart-ble&type=Date" />
  </picture>
</a>

---

<div align="center">

  **如果这个项目对你有帮助，请给一个 Star ⭐**

  [官网](https://github.com/luoyaosheng/smart-ble) · [Gitee](https://gitee.com/luoyaosheng/smart-ble/tree/refactor%2Fmulti-platform/) · [文档](./docs) · [问题反馈](https://github.com/luoyaosheng/smart-ble/issues) · [更新日志](./docs/changelog.md)

</div>
