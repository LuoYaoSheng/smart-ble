# SmartBLE Platform Comparison & Alignment Guide

## Overview

This document compares all SmartBLE implementations with the **UniApp version as the reference implementation**. It identifies key differences in flow, structure, operations, and UI/UX patterns.

---

## 1. Page Structure Comparison

### UniApp (Reference)
```
pages/
├── index/           # Main scan page + device list
├── device/
│   └── detail.vue   # Device detail operations page
├── broadcast/
│   └── index.vue    # BLE broadcasting page
└── about/
    └── index.vue    # About page
```

**Navigation Pattern:** Multi-page navigation with `uni.navigateTo()`

### Android (Kotlin + Jetpack Compose)
```
screens/
├── DeviceListScreen.kt    # Device list & scan UI
├── DeviceDetailScreen.kt  # Service/char operations
├── BroadcastScreen.kt     # Broadcasting UI
└── AboutScreen.kt         # About page
```

**Navigation Pattern:** Multi-screen navigation with `NavController`
**Status:** ✅ **ALIGNED** - Follows same structure as UniApp

### iOS/macOS (Swift + SwiftUI)
```
Views/
├── ScanView.swift          # Device list & scan UI
├── DeviceDetailView.swift  # Service/char operations
├── BroadcastView.swift     # Broadcasting UI
└── LogView.swift           # Log panel (separate)
```

**Navigation Pattern:** Multi-view navigation with `NavigationLink`
**Status:** ✅ **ALIGNED** - Follows same structure as UniApp

### Tauri (Rust + Web)
```
index.html (single page)
├── deviceListView      # Device list view (tab-based)
├── deviceDetailView    # Device detail (overlay view)
├── broadcastView       # Broadcasting view (tab-based)
└── aboutView           # About view (tab-based)
```

**Navigation Pattern:** Single-page application with tab switching
**Status:** ⚠️ **DIFFERENT** - Uses tab-based navigation instead of page navigation

---

## 2. Scan Flow Comparison

### UniApp (Reference)
| Step | Behavior |
|------|----------|
| Start Scan | `startBluetoothDevicesDiscovery()` |
| Auto-stop | ✅ After 5 seconds |
| Device Updates | Throttled to 1 second intervals |
| Device List | Sorted by RSSI (strongest first) |
| Stop on Connect | ✅ Yes - stops scan before connecting |

### Android
| Step | Behavior |
|------|----------|
| Start Scan | `bluetoothLeScanner.startScan()` |
| Auto-stop | ✅ After 60 seconds (configurable) |
| Device Updates | Real-time via `onScanResult` |
| Device List | Sorted by RSSI |
| Stop on Connect | ✅ Yes |

**Status:** ⚠️ **MINOR DIFFERENCE** - Auto-stop timeout differs (60s vs 5s)

### iOS/macOS
| Step | Behavior |
|------|----------|
| Start Scan | `centralManager.scanForPeripherals()` |
| Auto-stop | ✅ After 60 seconds |
| Device Updates | Real-time via `didDiscover` |
| Device List | Sorted by RSSI |
| Stop on Connect | ✅ Yes |

**Status:** ⚠️ **MINOR DIFFERENCE** - Auto-stop timeout differs (60s vs 5s)

### Tauri
| Step | Behavior |
|------|----------|
| Start Scan | `central.start_scan()` |
| Auto-stop | ✅ After 5 seconds |
| Device Updates | Every 1 second via polling |
| Device List | Sorted by RSSI |
| Stop on Connect | ✅ Yes |

**Status:** ✅ **ALIGNED** - Matches UniApp's 5-second auto-stop

---

## 3. Connect/Disconnect Flow Comparison

### UniApp (Reference) - CRITICAL PATTERN

```
┌─────────────────────────────────────────────────────────────┐
│ index.vue (Device List)                                     │
├─────────────────────────────────────────────────────────────┤
│ 1. User clicks "Connect" button on device item              │
│ 2. stopBluetoothDevicesDiscovery()                          │
│ 3. uni.navigateTo({ url: '/pages/device/detail' })         │
│ 4. Detail page loads with device info                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ detail.vue (Device Detail)                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Page has connection toggle button                        │
│ 2. User clicks toggle → createBLEConnection()               │
│ 3. On connection → discover services & characteristics      │
│ 4. User can operate (read/write/notify)                     │
│ 5. User can toggle to disconnect                            │
│ 6. Click back button → navigateBack()                       │
│    ⚠️ NO AUTO-DISCONNECT on back                            │
└─────────────────────────────────────────────────────────────┘
```

**Key UniApp Pattern:** Connection persists when navigating back to list. User manually disconnects.

### Android
```
DeviceListScreen → DeviceDetailScreen
├── Connect button triggers connection
├── Disconnect button available on detail screen
└── Back button → Navigate back (connection state maintained)
```

**Status:** ✅ **ALIGNED** - Maintains connection on back navigation

### iOS/macOS
```
ScanView → DeviceDetailView
├── Connect button triggers connection
├── Disconnect button available on detail view
└── Back button → Navigate back (connection state maintained)
```

**Status:** ✅ **ALIGNED** - Maintains connection on back navigation

### Tauri - ⚠️ DIFFERENT BEHAVIOR
```
DeviceListView → DeviceDetailView
├── Connect button triggers connection
├── Disconnect button available on detail view
└── Back button → goBack()
    ├── Auto-disconnect ✅ (DIFFERENT from UniApp!)
    ├── Navigate to list
    └── Auto-start scan ✅
```

**Status:** ⚠️ **DIFFERENT** - Auto-disconnects on back button

**Alignment Needed:** Tauri should maintain connection when going back to list (like UniApp).

---

## 4. Device Info Display

### UniApp (Reference)
- **Trigger:** Click device item (non-connect button area)
- **Display:** Modal dialog with advertising data
- **Content:** Name, ID, RSSI, Service UUIDs, Advertising Data (hex)

### Android
- **Trigger:** Click device item
- **Display:** Bottom sheet or dialog
- **Content:** Same as UniApp ✅

### iOS/macOS
- **Trigger:** Tap device row
- **Display:** Sheet or alert
- **Content:** Same as UniApp ✅

### Tauri
- **Trigger:** Click device item
- **Display:** Modal dialog
- **Content:** Same as UniApp ✅

**Status:** ✅ **ALL ALIGNED**

---

## 5. Filter Panel

### UniApp (Reference)
```
Filter Panel
├── RSSI Slider (-100 to -30) with presets [-100, -90, -70, -50]
├── Name Prefix Text Input
├── Hide Unnamed Checkbox
└── Reset Button
```

### Android, iOS, Tauri
**All implementations have the same filter controls.**

**Status:** ✅ **ALL ALIGNED**

---

## 6. Broadcast Page Comparison

### UniApp (Reference)
```
Broadcast Settings
├── Device Name Input
├── Service UUID Input
├── Manufacturer ID Input (hex)
├── Manufacturer Data Input
├── [Android Only]
│   ├── Advertise Mode Picker (Low Power/Balanced/Low Latency)
│   ├── TX Power Level Picker (Ultra Low/Low/Medium/High)
│   ├── Connectable Switch
│   ├── Include Device Name Switch
│   └── Add Service UUID Switch
└── Start/Stop Button
```

### Android
- Has all UniApp features ✅
- Platform-specific settings for Android ✅

### iOS/macOS
- Basic broadcast settings
- Missing: Advanced Android-specific options (expected)

### Tauri
- ⚠️ **MISSING FEATURES:**
  - No manufacturer ID input
  - No manufacturer data input
  - No advertise mode options
  - No TX power level options
  - No connectable switch
  - No include device name switch

**Status:** ⚠️ **TAURI NEEDS IMPROVEMENT** - Missing many broadcast options

---

## 7. Log Panel

### UniApp (Reference)
- Located on detail page
- Shows all operations (scan, connect, read, write, notify)
- Export button
- Clear button

### Android
- Log display in detail view
- Similar functionality ✅

### iOS/macOS
- Separate LogView.swift
- Accessible from detail view

### Tauri
- Log panel on detail view
- Shows operations
- Clear button
- ⚠️ Missing: Export button

**Status:** ⚠️ **MINOR DIFFERENCE** - Export feature missing in Tauri

---

## 8. Key Alignment Issues Summary

| Issue | UniApp | Android | iOS | Tauri | Priority |
|-------|--------|---------|-----|-------|----------|
| Multi-page structure | ✅ | ✅ | ✅ | ❌ Tab-based | Medium |
| Connection persists on back | ✅ | ✅ | ✅ | ❌ Auto-disconnect | **HIGH** |
| Scan auto-stop (5s) | ✅ | ❌ 60s | ❌ 60s | ✅ | Low |
| Filter panel | ✅ | ✅ | ✅ | ✅ | - |
| Device info modal | ✅ | ✅ | ✅ | ✅ | - |
| Broadcast options | ✅ | ✅ | ⚠️ iOS limited | ❌ Missing | **HIGH** |
| Log export | ✅ | ✅ | ⚠️ Separate | ❌ Missing | Medium |

---

## 9. Recommended Changes

### Tauri - High Priority

1. **Connection Flow Change:**
   ```javascript
   // Current: goBack() auto-disconnects
   // Recommended: Keep connection alive (like UniApp)

   async function goBack() {
       // DON'T auto-disconnect
       // Just navigate back to list
       state.currentDevice = null;

       if (elements.deviceDetailView && elements.deviceListView) {
           elements.deviceDetailView.classList.remove('active');
           elements.deviceListView.classList.add('active');
       }

       // Optionally restart scan
       if (!state.scanning) {
           await startScan();
       }
   }
   ```

2. **Add Broadcast Options:**
   - Manufacturer ID input
   - Manufacturer data input
   - Advertise mode selector (where supported)
   - TX power level selector (where supported)

3. **Add Log Export Feature:**

### Android - Low Priority

1. Change scan auto-stop from 60s to 5s (match UniApp)

### iOS - Low Priority

1. Change scan auto-stop from 60s to 5s (match UniApp)

---

## 10. Feature Parity Matrix

| Feature | UniApp | Android | iOS | Tauri |
|---------|--------|---------|-----|-------|
| BLE Initialization | ✅ | ✅ | ✅ | ✅ |
| Device Scanning | ✅ | ✅ | ✅ | ✅ |
| Device Filtering | ✅ | ✅ | ✅ | ✅ |
| Device Connection | ✅ | ✅ | ✅ | ✅ |
| Service Discovery | ✅ | ✅ | ✅ | ✅ |
| Characteristic Read | ✅ | ✅ | ✅ | ✅ |
| Characteristic Write | ✅ | ✅ | ✅ | ✅ |
| Characteristic Notify | ✅ | ✅ | ✅ | ✅ |
| Device Disconnection | ✅ | ✅ | ✅ | ✅ |
| BLE Broadcasting | ✅ | ✅ | ✅ | ⚠️ Limited |
| Log Panel | ✅ | ✅ | ✅ | ✅ |
| Log Export | ✅ | ⚠️ | ✅ | ❌ |
| About Page | ✅ | ✅ | ✅ | ✅ |
| Device Info Modal | ✅ | ✅ | ✅ | ✅ |
| Connection Persistence | ✅ | ✅ | ✅ | ❌ |

---

## 11. UI/UX Consistency Checklist

All platforms should follow these UniApp patterns:

- [ ] Filter panel with RSSI slider, name prefix, hide unnamed
- [ ] Scan button with auto-stop after 5 seconds
- [ ] Device list sorted by RSSI (strongest first)
- [ ] Device item shows: Name, RSSI, Connect button
- [ ] Click device → show advertising data modal
- [ ] Click connect → navigate to detail, maintain connection on back
- [ ] Detail page has: Connection toggle, Service tree, Log panel
- [ ] Broadcast page has: Name, UUID, Manufacturer settings
- [ ] About page shows: App info, Tech stack, Links

---

## Conclusion

**Most Aligned:** Android and iOS follow UniApp structure closely.

**Needs Work:** Tauri implementation has the most differences:
1. Connection flow differs (auto-disconnect on back)
2. Broadcast page missing many options
3. Missing log export feature

**Recommended Action:** Update Tauri to match UniApp patterns for consistency.
