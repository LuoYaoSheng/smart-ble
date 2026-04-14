> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# Reddit 鍙戝竷鍐呭

## r/ESP32 鏍囬
```
[Project] Smart BLE - Open-source cross-platform BLE debugging tool with ESP32 firmware
```

---

## 姝ｆ枃鍐呭

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
- **Gitee**: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/
- **Docs**: https://github.com/luoyaosheng/smart-ble/tree/main/docs

## Who is this for?

- Bluetooth device developers
- Cross-platform app developers
- Embedded engineers working with ESP32/nRF52/STM32
- BLE learners

If you find this project helpful, please give it a Star 猸?

Feedback and contributions are welcome!
```

---

## 鍏朵粬 Subreddit 鍙樹綋

### r/Bluetooth
鏍囬锛歚[Release] Smart BLE - Open-source cross-platform BLE debugging tool`
鍐呭锛氬悓涓婏紝浣嗗噺灏?ESP32 閮ㄥ垎锛屽鍔?BLE 鍔熻兘鎻忚堪

### r/FlutterDev
鏍囬锛歚[Showcase] Smart BLE - Cross-platform BLE debugging tool built with Flutter`
鍐呭锛氱獊鍑?Flutter 鎶€鏈爤

### r/noble
鏍囬锛歚[Showcase] Smart BLE - BLE debugging tool using noble for desktop`
鍐呭锛氱獊鍑?noble 鍜屾闈㈢寮€鍙?

---

## 鍙戝竷寤鸿

- **鍙戝竷鏃堕棿**锛氱編鍥芥椂闂?9:00-11:00 AM
- **鏍囩**锛歚Project`, `BLE`, `Bluetooth`, `Open Source`, `ESP32`
- **娉ㄦ剰浜嬮」**锛?
  - 鎸夊悇 subreddit 瑙勫垯鍙戝笘
  - 鍙婃椂鍥炲璇勮
  - 涓嶈鍦ㄥ涓?subreddit 鍚屾椂鍙戝竷锛堥伩鍏嶈鏍囪涓?spam锛?

