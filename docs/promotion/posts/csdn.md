# CSDN 发布内容

## 标题
```
一款真正开源的跨平台 BLE 调试工具：8+ 种实现 + 硬件固件，全部开放！
```

---

## 正文内容

```markdown
# 一款真正开源的跨平台 BLE 调试工具：8+ 种实现 + 硬件固件，全部开放！

## 摘要

Smart BLE 是一款专业的低功耗蓝牙调试工具，提供 8+ 种跨平台实现（uni-app、Flutter、Electron、Tauri、macOS、Avalonia 等），内置 ESP32 完整固件，完全开源，适合蓝牙开发调试和跨平台学习。

---

## 一、项目背景

作为蓝牙开发者，你是否遇到过这些困扰：

- 每个平台要用不同的调试工具
- 网上的开源代码要么不完整，要么只支持单一平台
- 软件工具和硬件固件往往分离

为了解决这些问题，我开发了 **Smart BLE** —— 一个真正完整、真正开源的跨平台蓝牙调试工具。

---

## 二、项目特点

### 2.1 完全开源

| 开源内容 | 说明 |
|---------|------|
| ✅ 前端代码 | uni-app、Flutter、Android、iOS 全部开放 |
| ✅ 桌面端代码 | Electron、Tauri、macOS 原生、Avalonia |
| ✅ 硬件固件 | ESP32 完整固件，可直接烧录使用 |
| ✅ 协议设计 | BLE 服务、数据格式、交互协议全部公开 |
| ✅ MIT 协议 | 商用无忧，可自由修改和分发 |

### 2.2 8+ 种平台实现

| 平台 | 技术栈 | 状态 |
|------|--------|------|
| uni-app | Vue 3 | ✅ 已完成 |
| Flutter | flutter_blue_plus | ✅ 已完成 |
| Electron | noble | ✅ 已完成 |
| Tauri | Rust + btleplug | ✅ 已完成 |
| macOS 原生 | AppKit | ✅ 已完成 |
| Avalonia | .NET 8 | ✅ 已完成 |

### 2.3 硬件固件支持

内置 ESP32 完整固件，包含：
- 自定义设备名称
- LED 控制（常亮/快闪/慢闪）
- JSON 格式数据交互
- 多权限特征值演示

---

## 三、核心功能

### 3.1 设备端（Central 模式）

```typescript
// 统一的 BLE 抽象接口
interface IBLEAdapter {
    initialize(): Promise<void>
    startScan(options?: ScanOptions): Promise<void>
    connect(deviceId: string): Promise<void>
    readCharacteristic(...): Promise<DataBuffer>
    writeCharacteristic(...): Promise<void>
    setNotification(...): Promise<void>
}
```

**功能清单**：
- 设备扫描（信号强度过滤、名称过滤）
- 连接管理（服务发现、特征值读写）
- 通知订阅（实时数据监控）
- 操作日志

### 3.2 外设端（Peripheral 模式）

- BLE 广播（自定义名称、UUID）
- 手机变身蓝牙设备，用于测试

---

## 四、快速开始

### 4.1 uni-app 版本

```bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
```

### 4.2 Flutter 版本

```bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
```

### 4.3 桌面端 Electron

```bash
cd smart-ble/apps/desktop/electron
npm install
npm start
```

### 4.4 ESP32 固件

```bash
cd smart-ble/hardware/esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## 五、项目结构

```
smart-ble/
├── apps/
│   ├── uniapp/           # Vue 3 版本
│   ├── flutter/          # Flutter 版本
│   ├── desktop/          # 桌面端
│   │   ├── electron/     # Electron 版本
│   │   ├── tauri/        # Tauri 版本
│   │   ├── macos/        # macOS 原生
│   │   └── avalonia/     # .NET 版本
│   ├── android/          # Android 原生
│   └── ios/              # iOS 原生
├── hardware/
│   └── esp32/            # ESP32 固件
├── docs/                 # 项目文档
└── core/                 # BLE 抽象层
```

---

## 六、适用场景

| 用户类型 | 推荐使用方式 |
|---------|-------------|
| 蓝牙设备开发者 | 直接使用 App 作为日常调试工具 |
| 跨平台开发者 | 参考代码，移植到自己的项目 |
| 嵌入式工程师 | 使用 ESP32 固件作为开发模板 |
| 蓝牙学习者 | 阅读代码 + 烧录硬件，实践学习 |

---

## 七、总结

Smart BLE 是一个功能完整、架构清晰的蓝牙调试工具项目，不仅提供了实用的调试功能，还展示了如何在不同平台上实现统一的 BLE 功能。

**项目地址**：
- GitHub: https://github.com/luoyaosheng/smart-ble
- Gitee: https://gitee.com/luoyaosheng/smart-ble/tree/refactor%2Fmulti-platform/

**开源协议**：MIT License

如果觉得有帮助，欢迎给个 Star ⭐

---

*关键词：BLE、蓝牙、调试工具、开源、ESP32、Flutter、uni-app、Tauri、跨平台、物联网*
```

---

## 发布建议

- **分类**：物联网 / 嵌入式 / 移动开发 / 开源项目
- **标签**：`#BLE` `#蓝牙` `#调试工具` `#开源项目` `#ESP32` `#Flutter` `#uni-app`
- **发布时间**：工作日 9:00-11:00
- **原创声明**：勾选原创
- **封面图**：准备项目架构图
