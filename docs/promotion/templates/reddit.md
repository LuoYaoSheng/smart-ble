# Reddit 发帖模板

## 标题

```
[Release] Smart BLE - An open-source cross-platform BLE debugging tool with 8+ implementations and ESP32 firmware
```

---

## 内容模板

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
- **uni-app** (Vue 3) - Mini-program, App, H5 with one codebase
- **Flutter** - Android, iOS, macOS with flutter_blue_plus
- **Electron** - Win/Mac/Linux with noble
- **Tauri** - Rust backend with btleplug (~10MB bundle size)
- **macOS Native** - Swift + AppKit
- **Avalonia** - .NET 8 + C# for Windows

### 2. Fully Open Source
- All frontend code open
- All desktop implementations open
- ESP32 firmware included
- MIT License

### 3. Hardware Support
- Complete ESP32 firmware
- LED control (steady/fast/slow blink)
- JSON data exchange
- Multiple permission characteristics

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

**uni-app:**
\`\`\`bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
\`\`\`

**Flutter:**
\`\`\`bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
\`\`\`

**ESP32 Firmware:**
\`\`\`bash
cd smart-ble/hardware/esp32
idf.py build && idf.py flash monitor
\`\`\`

## Links

- **GitHub**: https://github.com/luoyaosheng/smart-ble
- **Docs**: https://github.com/luoyaosheng/smart-ble/tree/main/docs

## Who is this for?

- Bluetooth device developers
- Cross-platform app developers
- Embedded engineers
- BLE learners

If you find this project helpful, please give it a Star ⭐

Feedback and contributions are welcome!
```

---

## 发布建议

### r/ESP32

- **标题**: `[Project] Smart BLE - Cross-platform BLE debugging tool with ESP32 firmware support`
- **标签**: `Project`, `BLE`, `Bluetooth`
- **发布时间**: 美国时间 9:00-11:00

### r/Bluetooth

- **标题**: `[Release] Smart BLE - Open-source cross-platform BLE debugging tool`
- **标签**: `Release`, `Open Source`, `Development`
- **发布时间**: 美国时间 9:00-11:00

### r/noble

- **标题**: `[Showcase] Smart BLE - BLE debugging tool using noble for desktop`
- **标签**: `noble`, `BLE`, `Showcase`
- **发布时间**: 美国时间 9:00-11:00

### r/FlutterDev

- **标题**: `[Showcase] Smart BLE - Cross-platform BLE debugging tool built with Flutter`
- **标签**: `Showcase`, `Bluetooth`, `flutter_blue_plus`
- **发布时间**: 美国时间 9:00-11:00

### 注意事项

- 按各 subreddit 规则发帖
- 及时回复评论
- 不要在多个 subreddit 同时发布（避免被标记为 spam）
- 可以先发 r/ESP32，再根据效果考虑其他社区
