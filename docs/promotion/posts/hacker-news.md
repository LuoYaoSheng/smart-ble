# Hacker News 发布内容

## 标题
```
Show HN: Smart BLE – Cross-platform BLE debugging tool with 8+ implementations
```

---

## 正文内容

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

**uni-app** (Vue 3)
- One codebase for mini-program, iOS, Android, H5
- 2000+ lines of code

**Flutter**
- Android, iOS, macOS with flutter_blue_plus
- Riverpod state management

**Electron**
- Win/Mac/Linux with noble
- Most complete feature set

**Tauri**
- Rust backend with btleplug
- ~10MB bundle size

**macOS Native**
- Swift + AppKit
- Native experience

**Avalonia**
- .NET 8 + C#
- Windows focused

All fully open-source with ESP32 firmware included.

## Key Features

Central Mode:
- Device scanning with RSSI/name filtering
- Connection management with auto service discovery
- Characteristic read/write (UTF-8 & HEX)
- Notification subscription
- Operation logs

Peripheral Mode:
- BLE advertising (custom name, UUID, manufacturer data)

## Quick Start

```bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
```

GitHub: https://github.com/luoyaosheng/smart-ble

Feedback welcome!

[1] https://github.com/luoyaosheng/smart-ble
```

---

## 发布建议

- **最佳时间**：美国时间 6:00-8:00 AM PT（太平洋时间）
- **次佳时间**：美国时间 4:00-6:00 PM PT
- **注意事项**：
  - HN 喜欢简洁、低调的发布风格
  - 避免过度宣传和营销语言
  - 技术细节要准确
  - 第一时间回复所有评论
  - 如果没上首页，不要重复发帖
