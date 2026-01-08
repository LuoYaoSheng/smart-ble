# GitHub Release 内容

## 标题
```
🎉 Smart BLE v2.0.0 - 跨平台蓝牙调试工具，8+ 种实现全面开源！
```

---

## 正文内容

```markdown
## 🎧 Smart BLE v2.0.0

专业的跨平台蓝牙(BLE)调试工具，**8+ 种实现 + 硬件固件 + 完全开源**

---

## ✨ 为什么选择 Smart BLE？

| 痛点 | Smart BLE 解决方案 |
|------|-------------------|
| 🔴 调试工具不统一 | 🟢 **8+ 种实现**，覆盖所有主流平台 |
| 🔴 代码不完整/闭源 | 🟢 **完全开源**，硬件固件也开放 |
| 🔴 学习资料零散 | 🟢 **完整文档** + 真实硬件示例 |
| 🔴 软硬件分离 | 🟢 **端到端方案**，App + ESP32 固件 |

---

## 🚀 本版本亮点

### 8+ 种平台实现
- ✅ **uni-app** (Vue 3) - 小程序/App/H5 一套代码
- ✅ **Flutter** - Android/iOS/macOS 完整支持
- ✅ **Electron** - Win/Mac/Linux 全覆盖
- ✅ **Tauri** - Rust 后端，仅 ~10MB
- ✅ **macOS 原生** - AppKit 原生体验
- ✅ **Avalonia** - .NET 8 + C#

### 完全开源
- 📱 所有前端代码
- 💻 所有桌面端实现
- 🔌 ESP32 硬件固件
- 📚 完整项目文档
- 🆓 **MIT 协议，商用无忧**

---

## 📊 功能一览

### 设备端（Central 模式）
- 🔍 智能设备扫描（信号强度/名称过滤）
- 🔌 一键连接管理（服务自动发现）
- 📝 特征值读写（UTF-8 / HEX 双格式）
- 🔔 通知订阅（实时数据监控）
- 📋 实时操作日志

### 外设端（Peripheral 模式）
- 📡 BLE 广播（自定义名称、UUID）
- 📱 手机变身蓝牙设备，用于测试

### 硬件支持
- 🤖 **ESP32 完整固件**，直接可用
- 💡 LED 控制（常亮/快闪/慢闪）
- 📄 JSON 格式数据交互

---

## 🚀 快速开始

### uni-app 版本（推荐新手）
```bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
```

### Flutter 版本
```bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
```

### 桌面端 Electron
```bash
cd smart-ble/apps/desktop/electron
npm install
npm start
```

### ESP32 硬件
```bash
cd smart-ble/hardware/esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## 📚 文档

- [功能规格](https://github.com/luoyaosheng/smart-ble/blob/main/docs/01-functional-specs.md)
- [数据流图](https://github.com/luoyaosheng/smart-ble/blob/main/docs/02-data-flow.md)
- [BLE 协议](https://github.com/luoyaosheng/smart-ble/blob/main/docs/03-ble-protocol.md)
- [UI 流程](https://github.com/luoyaosheng/smart-ble/blob/main/docs/04-ui-flows.md)
- [平台差异](https://github.com/luoyaosheng/smart-ble/blob/main/docs/05-platform-differences.md)

---

## 🎯 适用场景

| 用户类型 | 推荐使用方式 |
|---------|-------------|
| 蓝牙设备开发者 | 直接使用 App 作为日常调试工具 |
| 跨平台开发者 | 参考代码，移植到自己的项目 |
| 嵌入式工程师 | 使用 ESP32 固件作为开发模板 |
| 蓝牙学习者 | 阅读代码 + 烧录硬件，实践学习 |
| 企业用户 | 基于 MIT 协议进行二次开发 |

---

## 🤝 贡献

欢迎任何形式的贡献！

- 🐛 [报告问题](https://github.com/luoyaosheng/smart-ble/issues)
- 💡 [功能建议](https://github.com/luoyaosheng/smart-ble/issues)
- 🔧 [提交 PR](https://github.com/luoyaosheng/smart-ble/pulls)
- 📖 [完善文档](https://github.com/luoyaosheng/smart-ble)

---

## 📄 许可证

[MIT License](https://github.com/luoyaosheng/smart-ble/blob/main/LICENSE)

---

## 🔗 相关链接

- **GitHub**: https://github.com/luoyaosheng/smart-ble
- **Gitee**: https://gitee.com/luoyaosheng/smart-ble/tree/refactor%2Fmulti-platform/
- **文档**: https://github.com/luoyaosheng/smart-ble/tree/main/docs

---

**如果这个项目对你有帮助，请给一个 Star ⭐**

**让蓝牙开发，从此简单！**
```
