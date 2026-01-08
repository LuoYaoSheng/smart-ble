# GitHub Release 模板

## 标题

```
🎉 Smart BLE v2.0.0 - 跨平台蓝牙调试工具，8+ 种实现全面开源！
```

---

## 内容模板

```markdown
# 🎧 Smart BLE v2.0.0

专业的跨平台蓝牙(BLE)调试工具，8+ 种实现 + 硬件固件，完全开源！

## ✨ 亮点特性

- 🎯 **8+ 种平台实现**：uni-app、Flutter、Electron、Tauri、macOS、Avalonia
- 🔓 **完全开源**：前端代码 + 桌面端代码 + ESP32 硬件固件
- 🤖 **端到端方案**：App 调试 + ESP32 固件，一站式解决
- 📚 **教学友好**：完整文档 + 系列教程 + 详细注释
- 🆓 **MIT 协议**：商用无忧

## 📦 支持的平台

| 平台 | 技术栈 | 状态 |
|------|--------|------|
| uni-app | Vue 3 | ✅ |
| Flutter | flutter_blue_plus | ✅ |
| Electron | noble | ✅ |
| Tauri | Rust + btleplug | ✅ |
| macOS 原生 | AppKit | ✅ |
| Avalonia | .NET 8 | ✅ |

## 🚀 快速开始

### uni-app 版本
\`\`\`bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
\`\`\`

### Flutter 版本
\`\`\`bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
\`\`\`

### ESP32 固件
\`\`\`bash
cd smart-ble/hardware/esp32
idf.py build && idf.py flash monitor
\`\`\`

## 📚 文档

- [项目文档](https://github.com/luoyaosheng/smart-ble/tree/main/docs)
- [快速开始](https://github.com/luoyaosheng/smart-ble#-快速开始)
- [API 文档](https://github.com/luoyaosheng/smart-ble/tree/main/docs)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](https://github.com/luoyaosheng/smart-ble/blob/main/LICENSE)

---

**如果这个项目对你有帮助，请给一个 Star ⭐**
```
