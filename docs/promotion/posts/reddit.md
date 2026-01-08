# Reddit 发布内容

## r/ESP32 标题
```
[Project] Smart BLE - Open-source cross-platform BLE debugging tool with ESP32 firmware
```

---

## 正文内容

```markdown
Hi everyone,

I'd like to share my open-source project — **Smart BLE**, a cross-platform Bluetooth Low Energy debugging tool.

## Background

As a Bluetooth developer, I was frustrated with:
- Different tools for different platforms
- Incomplete open-source code scattered everywhere
- Software tools separated from hardware firmware

So I built a **complete, truly open-source** solution.

## Key Features

### 1. 8+ Platform Implementations

- **uni-app** (Vue 3) - One codebase for mini-program, iOS, Android, H5
- **Flutter** - Android, iOS, macOS with flutter_blue_plus
- **Electron** - Win/Mac/Linux with noble
- **Tauri** - Rust backend with btleplug (~10MB bundle size)
- **macOS Native** - Swift + AppKit
- **Avalonia** - .NET 8 + C# for Windows

### 2. Fully Open Source

- All frontend code open
- All desktop implementations open
- **ESP32 firmware included**
- MIT License

### 3. ESP32 Hardware Support

Complete ESP32 firmware with:
- Custom device name
- LED control (steady/fast/slow blink)
- JSON data exchange
- Multiple permission characteristics

```cpp
// LED Control Commands
#define LED_ON     0xFF01
#define LED_OFF    0xFF00
#define LED_FAST   0xFF02
#define LED_SLOW   0xFF03
```

## Core Functions

**Central Mode:**
- Device scanning with RSSI/name filtering
- Connection management with auto service discovery
- Characteristic read/write (UTF-8 & HEX)
- Notification subscription with real-time monitoring
- Operation logs

**Peripheral Mode:**
- BLE advertising (custom name, UUID, manufacturer data)
- Turn phone into a BLE device for testing

## Quick Start

**ESP32 Firmware:**
```bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/hardware/esp32
idf.py build && idf.py flash monitor
```

**Flutter App:**
```bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
```

**uni-app (WeChat Mini Program):**
```bash
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
```

## Links

- **GitHub**: https://github.com/luoyaosheng/smart-ble
- **Gitee**: https://gitee.com/luoyaosheng/smart-ble/tree/refactor%2Fmulti-platform/
- **Docs**: https://github.com/luoyaosheng/smart-ble/tree/main/docs

## Who is this for?

- Bluetooth device developers
- Cross-platform app developers
- Embedded engineers working with ESP32/nRF52/STM32
- BLE learners

If you find this project helpful, please give it a Star ⭐

Feedback and contributions are welcome!
```

---

## 其他 Subreddit 变体

### r/Bluetooth
标题：`[Release] Smart BLE - Open-source cross-platform BLE debugging tool`
内容：同上，但减少 ESP32 部分，增加 BLE 功能描述

### r/FlutterDev
标题：`[Showcase] Smart BLE - Cross-platform BLE debugging tool built with Flutter`
内容：突出 Flutter 技术栈

### r/noble
标题：`[Showcase] Smart BLE - BLE debugging tool using noble for desktop`
内容：突出 noble 和桌面端开发

---

## 发布建议

- **发布时间**：美国时间 9:00-11:00 AM
- **标签**：`Project`, `BLE`, `Bluetooth`, `Open Source`, `ESP32`
- **注意事项**：
  - 按各 subreddit 规则发帖
  - 及时回复评论
  - 不要在多个 subreddit 同时发布（避免被标记为 spam）
