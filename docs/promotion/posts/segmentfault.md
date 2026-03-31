# SegmentFault 发布内容

## 标题
```
Smart BLE：一款真正开源的跨平台蓝牙调试工具，8+ 种实现全部开放
```

---

## 正文内容

```markdown
# Smart BLE：一款真正开源的跨平台蓝牙调试工具，8+ 种实现全部开放

## 项目介绍

**Smart BLE** 是一款专业的低功耗蓝牙（BLE）调试工具，提供 8+ 种跨平台实现，内置 ESP32 完整固件，MIT 协议完全开源。

## 核心亮点

### 🔓 完全开源

- 前端代码：uni-app、Flutter、Android、iOS
- 桌面端：Electron、Tauri、macOS、Avalonia
- 硬件固件：ESP32 完整固件
- 协议设计：BLE 服务、数据格式全部公开

### 🔌 8+ 种平台实现

| 平台 | 技术栈 | 状态 |
|------|--------|------|
| uni-app | Vue 3 | ✅ |
| Flutter | flutter_blue_plus | ✅ |
| Electron | noble | ✅ |
| Tauri | Rust + btleplug | ✅ |
| macOS 原生 | AppKit | ✅ |
| Avalonia | .NET 8 | ✅ |

### 🤖 硬件固件支持

- ESP32 完整固件
- LED 控制
- JSON 数据交互
- 端到端测试

## 核心功能

**设备端（Central 模式）**
- 设备扫描（信号强度/名称过滤）
- 连接管理（服务发现、特征值读写）
- 通知订阅（实时数据监控）
- 操作日志

**外设端（Peripheral 模式）**
- BLE 广播（自定义名称、UUID）
- 手机变身蓝牙设备

## 快速开始

```bash
# 克隆项目
git clone https://github.com/luoyaosheng/smart-ble.git

# uni-app 版本
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin

# Flutter 版本
cd smart-ble/apps/flutter
flutter pub get
flutter run

# ESP32 固件
cd smart-ble/hardware/esp32
idf.py build && idf.py flash monitor
```

## 适用场景

- 蓝牙设备开发调试
- 跨平台 BLE 开发学习
- ESP32 硬件开发
- 物联网项目参考

## 项目地址

GitHub: https://github.com/luoyaosheng/smart-ble
Gitee: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/

如果觉得有帮助，欢迎给个 Star ⭐

---

*标签：蓝牙、BLE、开源、ESP32、Flutter、uni-app*
```

---

## 发布建议

- **分类**：软件开发 / 嵌入式开发 / 开源项目
- **标签**：`蓝牙` `BLE` `开源` `ESP32` `Flutter`
- **发布时间**：工作日 10:00-12:00
