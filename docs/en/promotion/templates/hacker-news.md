> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# Hacker News 妯℃澘

## 鏍囬

```
Show HN: Smart BLE 鈥?Cross-platform BLE debugging tool with 8+ implementations
```

---

## 鍐呭妯℃澘

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

## 鍙戝竷寤鸿

### 鏍囬鍙樹綋

鍙互灏濊瘯涓嶅悓鐨勬爣棰橀鏍硷細

1. `Show HN: Smart BLE 鈥?Cross-platform BLE debugging tool`
2. `Show HN: I built an open-source BLE tool with 8+ platform implementations`
3. `Show HN: Smart BLE 鈥?Open-source Bluetooth debugging with ESP32 firmware`

### 鍙戝竷鏃堕棿

- **鏈€浣虫椂闂?*锛氱編鍥芥椂闂?6:00-8:00 AM PT锛堝お骞虫磱鏃堕棿锛?
- **娆′匠鏃堕棿**锛氱編鍥芥椂闂?4:00-6:00 PM PT
- **閬垮厤鏃堕棿**锛氬懆鏈€佽妭鍋囨棩

### 鍙戝竷绛栫暐

1. **鍙戝笘鍓?*锛?
   - 纭繚椤圭洰 README 娓呮櫚瀹屾暣
   - 纭繚浠ｇ爜璐ㄩ噺楂?
   - 鍑嗗濂芥紨绀?鎴浘

2. **鍙戝笘鍚?*锛?
   - 绗竴鏃堕棿鍥炲鎵€鏈夎瘎璁?
   - 淇濇寔绀艰矊鍜屼笓涓?
   - 鍑嗗濂藉洖绛旀妧鏈棶棰?
   - 涓嶈杩囧害瀹ｄ紶锛屼繚鎸佷綆璋?

3. **濡傛灉娌′笂棣栭〉**锛?
   - 涓嶈閲嶅鍙戝笘
   - 鍒嗘瀽鍘熷洜锛屾敼杩涢」鐩?
   - 1-2 涓湀鍚庡彲浠ュ啀娆″皾璇?

### 娉ㄦ剰浜嬮」

- HN 绀惧尯鍠滄绠€娲併€佷綆璋冪殑鍙戝竷椋庢牸
- 閬垮厤杩囧害瀹ｄ紶鍜岃惀閿€璇█
- 鎶€鏈粏鑺傝鍑嗙‘
- 璇氬疄鎻忚堪椤圭洰鐨勫綋鍓嶇姸鎬?
- 鍑嗗濂藉洖绛旀妧鏈棶棰橈紝鐗瑰埆鏄灦鏋勮璁℃柟闈?

