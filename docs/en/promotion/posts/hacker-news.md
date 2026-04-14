> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# Hacker News 鍙戝竷鍐呭

## 鏍囬
```
Show HN: Smart BLE 鈥?Cross-platform BLE debugging tool with 8+ implementations
```

---

## 姝ｆ枃鍐呭

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

## 鍙戝竷寤鸿

- **鏈€浣虫椂闂?*锛氱編鍥芥椂闂?6:00-8:00 AM PT锛堝お骞虫磱鏃堕棿锛?
- **娆′匠鏃堕棿**锛氱編鍥芥椂闂?4:00-6:00 PM PT
- **娉ㄦ剰浜嬮」**锛?
  - HN 鍠滄绠€娲併€佷綆璋冪殑鍙戝竷椋庢牸
  - 閬垮厤杩囧害瀹ｄ紶鍜岃惀閿€璇█
  - 鎶€鏈粏鑺傝鍑嗙‘
  - 绗竴鏃堕棿鍥炲鎵€鏈夎瘎璁?
  - 濡傛灉娌′笂棣栭〉锛屼笉瑕侀噸澶嶅彂甯?

