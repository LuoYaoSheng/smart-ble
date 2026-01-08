# Hacker News 模板

## 标题

```
Show HN: Smart BLE – Cross-platform BLE debugging tool with 8+ implementations
```

---

## 内容模板

```markdown
Hi HN,

I built Smart BLE [1], a cross-platform Bluetooth Low Energy debugging tool.

## Why

As a Bluetooth developer, I was frustrated with:
- Different tools for different platforms
- Incomplete open-source BLE implementations
- Software tools separated from hardware firmware

So I created a complete, truly open-source solution.

## What

8+ platform implementations:
- uni-app (Vue 3) - one codebase for mini-program, iOS, Android, H5
- Flutter - Android, iOS, macOS with flutter_blue_plus
- Electron - Win/Mac/Linux with noble
- Tauri - Rust backend with btleplug (~10MB)
- macOS Native - Swift + AppKit
- Avalonia - .NET 8

All fully open-source with ESP32 firmware included.

## Key Features

- Device scanning with RSSI/name filtering
- Connection management with auto service discovery
- Characteristic read/write (UTF-8 & HEX)
- Notification subscription
- BLE peripheral mode (advertising)
- Complete ESP32 firmware

## Quick Start

\`\`\`bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
\`\`\`

GitHub: https://github.com/luoyaosheng/smart-ble

Feedback welcome!

[1] https://github.com/luoyaosheng/smart-ble
```

---

## 发布建议

### 标题变体

可以尝试不同的标题风格：

1. `Show HN: Smart BLE – Cross-platform BLE debugging tool`
2. `Show HN: I built an open-source BLE tool with 8+ platform implementations`
3. `Show HN: Smart BLE – Open-source Bluetooth debugging with ESP32 firmware`

### 发布时间

- **最佳时间**：美国时间 6:00-8:00 AM PT（太平洋时间）
- **次佳时间**：美国时间 4:00-6:00 PM PT
- **避免时间**：周末、节假日

### 发布策略

1. **发帖前**：
   - 确保项目 README 清晰完整
   - 确保代码质量高
   - 准备好演示/截图

2. **发帖后**：
   - 第一时间回复所有评论
   - 保持礼貌和专业
   - 准备好回答技术问题
   - 不要过度宣传，保持低调

3. **如果没上首页**：
   - 不要重复发帖
   - 分析原因，改进项目
   - 1-2 个月后可以再次尝试

### 注意事项

- HN 社区喜欢简洁、低调的发布风格
- 避免过度宣传和营销语言
- 技术细节要准确
- 诚实描述项目的当前状态
- 准备好回答技术问题，特别是架构设计方面
