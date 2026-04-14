> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# Reddit 鍙戝笘妯℃澘

## 鏍囬

```
[Release] Smart BLE - An open-source cross-platform BLE debugging tool with 8+ implementations and ESP32 firmware
```

---

## 鍐呭妯℃澘

```markdown
Hi everyone,

I'd like to share my open-source project 鈥?**Smart BLE**, a cross-platform Bluetooth Low Energy debugging tool.

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

If you find this project helpful, please give it a Star 猸?

Feedback and contributions are welcome!
```

---

## 鍙戝竷寤鸿

### r/ESP32

- **鏍囬**: `[Project] Smart BLE - Cross-platform BLE debugging tool with ESP32 firmware support`
- **鏍囩**: `Project`, `BLE`, `Bluetooth`
- **鍙戝竷鏃堕棿**: 缇庡浗鏃堕棿 9:00-11:00

### r/Bluetooth

- **鏍囬**: `[Release] Smart BLE - Open-source cross-platform BLE debugging tool`
- **鏍囩**: `Release`, `Open Source`, `Development`
- **鍙戝竷鏃堕棿**: 缇庡浗鏃堕棿 9:00-11:00

### r/noble

- **鏍囬**: `[Showcase] Smart BLE - BLE debugging tool using noble for desktop`
- **鏍囩**: `noble`, `BLE`, `Showcase`
- **鍙戝竷鏃堕棿**: 缇庡浗鏃堕棿 9:00-11:00

### r/FlutterDev

- **鏍囬**: `[Showcase] Smart BLE - Cross-platform BLE debugging tool built with Flutter`
- **鏍囩**: `Showcase`, `Bluetooth`, `flutter_blue_plus`
- **鍙戝竷鏃堕棿**: 缇庡浗鏃堕棿 9:00-11:00

### 娉ㄦ剰浜嬮」

- 鎸夊悇 subreddit 瑙勫垯鍙戝笘
- 鍙婃椂鍥炲璇勮
- 涓嶈鍦ㄥ涓?subreddit 鍚屾椂鍙戝竷锛堥伩鍏嶈鏍囪涓?spam锛?
- 鍙互鍏堝彂 r/ESP32锛屽啀鏍规嵁鏁堟灉鑰冭檻鍏朵粬绀惧尯

