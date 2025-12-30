# Smart BLE - 跨平台蓝牙调试工具

<div align="center">
  <h3>专业的蓝牙调试工具，支持多平台开发与教学</h3>
  <p>
    <a href="#项目架构">项目架构</a> ·
    <a href="#功能特性">功能特性</a> ·
    <a href="#快速开始">快速开始</a> ·
    <a href="#文档">文档</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/版本-2.0.0--dev-blue.svg" alt="版本" />
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="协议" />
    <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Flutter%20%7C%20桌面-lightgrey.svg" alt="平台" />
  </p>
</div>

<div align="center">
  <img src="./qr_code.jpg" alt="微信小程序码" width="200" />
  <p>扫码使用微信小程序版本</p>
</div>

---

## 📢 项目公告

Smart BLE 正在进行重大架构升级！🚀

本项目正在重构为支持多平台的跨框架蓝牙开发项目，目标是：
- ✅ **多平台支持**：uni-app、Flutter、原生 Android/iOS、桌面端
- ✅ **教学友好**：清晰的代码结构、详细注释、系列教程
- ✅ **硬件扩展**：ESP32、nRF52、STM32 等多种硬件支持

当前分支：`refactor/multi-platform`

---

## 🌐 相关链接

- **项目文档**：[docs/](./docs)
- **问题反馈**：[Issues](https://gitee.com/luoyaosheng/smart-ble/issues)
- **更新日志**：[docs/changelog.md](./docs/changelog.md)

---

## 💡 项目简介

Smart BLE 是一款专业的低功耗蓝牙（BLE）调试工具，旨在帮助开发者进行蓝牙设备的开发、测试和调试。项目同时也是一个优秀的学习资源，展示了如何在不同平台上实现 BLE 功能。

- **版本**：2.0.0-dev（重构中）
- **框架**：uni-app + Vue 3（Flutter 版本开发中）
- **开源协议**：MIT
- **支持平台**：微信小程序、iOS、Android、Flutter（移动端+桌面端）

---

## 🏗️ 项目架构

### 新架构设计

```
smart-ble/
├── docs/                        # 项目文档
│   ├── 01-functional-specs.md   # 功能规格文档
│   ├── 02-data-flow.md          # 数据流图
│   ├── 03-ble-protocol.md       # BLE 协议定义
│   ├── 04-ui-flows.md           # UI 流程文档
│   └── 05-platform-differences.md # 平台差异说明
│
├── core/                        # 蓝牙抽象层（跨平台共享）
│   ├── ble-core/                # BLE 核心抽象接口
│   │   ├── interfaces/          # TypeScript 接口定义
│   │   ├── types/               # 公共类型定义
│   │   └── utils/               # 通用工具函数
│   └── protocols/               # 协议定义
│       └── smart-ble-protocol.ts # ESP32 协议
│
├── SmartBLE/                   # uni-app 版本（现有）
│   ├── pages/                   # 页面文件
│   ├── utils/                   # 工具函数
│   └── nativeplugins/           # 原生插件
│
└── EspBLE/                     # ESP32 硬件部分
    └── LightBLE/                # ESP32 固件
```

### BLE 抽象层设计

项目核心是一个跨平台的 BLE 抽象层，定义了统一的接口：

```typescript
interface IBLEAdapter {
    // 初始化
    initialize(): Promise<void>
    getState(): Promise<AdapterState>

    // 扫描
    startScan(options?: ScanOptions): Promise<void>
    stopScan(): Promise<void>
    onDeviceFound(callback: (device: ScanResult) => void): void

    // 连接
    connect(deviceId: string): Promise<void>
    disconnect(deviceId: string): Promise<void>

    // 数据操作
    readCharacteristic(...): Promise<DataBuffer>
    writeCharacteristic(...): Promise<void>
    setCharacteristicNotification(...): Promise<void>

    // 广播
    startAdvertising(options: AdvertisingOptions): Promise<void>
}
```

---

## ✨ 功能特性

### 🔍 蓝牙设备扫描
- 实时扫描附近 BLE 设备
- 信号强度过滤（-100dBm ~ 0dBm）
- 设备名称前缀过滤
- 隐藏无名称设备选项
- 节流处理（1秒间隔）防止 UI 卡顿
- 自动停止扫描（默认 5 秒）

### 📱 设备连接与管理
- 一键连接/断开
- 服务自动发现
- 特征值读写操作
- 通知/指示订阅
- 实时数据监控
- 操作日志记录

### 📡 BLE 广播（外设模式）
- 自定义设备名称
- 自定义服务 UUID
- 厂商数据配置
- Android/iOS 原生插件支持
- 微信小程序外设模式

### 🔌 硬件支持
- **ESP32**：完整的 BLE 服务示例
- LED 控制（常亮/快闪/慢闪）
- JSON 格式数据交互
- 多权限特征值演示

---

## 📦 开发文档

### 核心文档

| 文档 | 描述 |
|------|------|
| [功能规格文档](./docs/01-functional-specs.md) | 功能清单、优先级、权限说明 |
| [数据流图文档](./docs/02-data-flow.md) | 扫描/连接/读写/广播流程 |
| [BLE 协议定义](./docs/03-ble-protocol.md) | 标准 UUID、ESP32 协议 |
| [UI 流程文档](./docs/04-ui-flows.md) | 页面布局、组件结构、视觉规范 |
| [平台差异说明](./docs/05-platform-differences.md) | 微信小程序/Android/iOS 差异 |

### API 文档

- [uni-app 蓝牙 API](https://uniapp.dcloud.net.cn/api/system/ble.html)
- [微信小程序 BLE API](https://developers.weixin.qq.com/miniprogram/dev/device/ble/wx.openBluetoothAdapter.html)

---

## 🚀 快速开始

### 安装依赖

```bash
cd SmartBLE
npm install
```

### 运行项目

```bash
# 微信小程序
npm run dev:mp-weixin

# H5 版本
npm run dev:h5

# App（Android/iOS）
npm run dev:app
```

### ESP32 硬件编译

```bash
cd EspBLE/LightBLE
platformio run --target upload
```

---

## 📱 应用截图

<div align="center">
  <div>
    <img src="./doc/images/默认页.jpg" alt="默认界面" width="200" style="margin: 5px;" />
    <img src="./doc/images/搜索设备.jpg" alt="搜索设备" width="200" style="margin: 5px;" />
    <img src="./doc/images/广播页.jpg" alt="广播页" width="200" style="margin: 5px;" />
  </div>
  <div style="margin-top: 10px;">
    <img src="./doc/images/连接详情1.jpg" alt="设备详情" width="200" style="margin: 5px;" />
    <img src="./doc/images/连接详情2.jpg" alt="服务列表" width="200" style="margin: 5px;" />
    <img src="./doc/images/连接详情3.jpg" alt="特征值操作" width="200" style="margin: 5px;" />
  </div>
</div>

---

## 🔌 硬件部分

### ESP32 服务定义

**主服务（灯控服务）**
- UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- 控制特征值: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- 通知特征值: `beb5483e-36e1-4688-b7f5-ea07361b26a9`

**权限演示服务**
- UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914c`
- 包含 7 种不同权限组合的特征值

### LED 控制命令

| 命令 | HEX 格式 | 效果 |
|------|----------|------|
| 开灯（常亮） | FF 01 | LED 常亮 |
| 关灯 | FF 00 | LED 关闭 |
| 快闪 | FF 02 | 200ms 闪烁 |
| 慢闪 | FF 03 | 1000ms 闪烁 |

---

## 📋 版本记录

### v2.0.0-dev (2024-12-30)
- 🏗️ 架构重构：创建 BLE 抽象层
- 📚 完善项目文档（5 篇核心文档）
- 🔧 提取通用工具函数
- 📋 定义 ESP32 协议规范

### v1.0.4 (2024-03-25)
- ✨ 集成 EspBLE 蓝牙开发板支持
- 📡 支持 ESP32 设备的蓝牙通信
- 🔧 优化硬件交互体验

### v1.0.1 (2024-03-21)
- ✨ 支持 UTF-8 和 HEX 格式数据写入
- 🎨 优化 UI 交互体验
- 📊 优化日志显示

---

## 📝 权限说明

### Android 权限
- BLUETOOTH / BLUETOOTH_ADMIN
- BLUETOOTH_SCAN / BLUETOOTH_CONNECT / BLUETOOTH_ADVERTISE (Android 12+)
- ACCESS_FINE_LOCATION

### iOS 权限
- NSBluetoothAlwaysUsageDescription
- NSBluetoothPeripheralUsageDescription

### 微信小程序权限
- scope.userLocation
- scope.bluetooth

---

## 🤝 贡献指南

欢迎提交问题和改进建议！我们欢迎任何形式的贡献：
- 🐛 报告问题
- 💡 提交功能建议
- 🔧 提交代码改进
- 📖 完善文档

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议
