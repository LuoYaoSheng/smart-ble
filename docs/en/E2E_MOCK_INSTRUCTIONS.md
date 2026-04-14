> [!NOTE]
> English translation is currently work-in-progress. Displaying the original Chinese text for now.

# Cross-Platform E2E Mock Testing Guide

This guide describes how to use the built-in Dummy BLE Adapter (Mock Mode) to run automated UI validation and End-to-End (E2E) tests. By enabling `USE_MOCK_BLE`, the clients will bypass the actual OS Bluetooth stack and instead inject a simulated device, allowing test runners to verify filtering, connection UI, and state management without physical hardware.

## 1. Overview of Mock Devices
When Mock Mode is enabled, the scanner will immediately identify the following simulated device upon pushing the `Scan` button:
*   **Id:** `MOCK-11:22:33:44:55:66`
*   **Name:** `Dummy-BLE-01`
*   **RSSI:** `-45`
*   **Connectable:** `true`
*   **Services Implemented:** `180A` (Device Information), `180D` (Heart Rate) / `FFF0` (Custom)

## 2. Enabling Mock Mode per Platform

### 2.1 Flutter (Android/iOS)
The Mock flag is provided via the Dart `--dart-define` compilation environment.
**Running locally:**
```bash
flutter run --dart-define=USE_MOCK_BLE=true
```
**CI/CD Integration Testing:**
```bash
flutter test integration_test/app_test.dart --dart-define=USE_MOCK_BLE=true
```

### 2.2 Tauri (macOS/Windows)
The web view checks the URL search parameters to activate the Mock E2E injection.
**Development Run:**
Normally Tauri runs via `cargo tauri dev`. To inject the UI flag locally, you can modify the initialization in `src/main.js` or set an environment flag that adds `?mock=true` to the webview URL. For manual browser debugging of the `<device-card>`:
```javascript
// In developer tools console
window.location.search = "?mock=true";
```

### 2.3 Electron (macOS/Windows/Linux)
Similar to Tauri, Electron's frontend renderer `public/app.js` is isolated and listens to the query parameter.
**Quick Start:**
Launch the app, open DevTools (`Cmd/Ctrl+Option+I`), and type:
```javascript
window.location.search = "?mock=true";
```

## 3. Recommended E2E Test Flow
When running UI automation (e.g. Playwright / Appium / Patrol), script your actions as follows:

1.  **Initialize Application**: Verify that "BLE Toolkit+" renders and the default state shows Bluetooth as running/stubbed.
2.  **Start Scan**: Click `[馃攳 寮€濮嬫壂鎻廬`. Verify the `Dummy-BLE-01` card appears within 1 second.
3.  **UI Filters**: 
    - Set the "鍚嶇О鍓嶇紑" filter to `Dummy`. Verify the card stays.
    - Set the "鍚嶇О鍓嶇紑" filter to `ESP`. Verify the list becomes empty.
    - Clear the filter.
4.  **Connect Device**: Click `[杩炴帴]` on the `Dummy-BLE-01` card.
    - Assert that the UI pivots to the `<ConnectedDevicesPage>` Tab or `<DeviceDetailView>`.
    - Assert that Connection State shows "Connected".
5.  **Multi-Device Tabs**:
    - Assert the `[宸茶繛鎺ヨ澶嘳` (Connected Devices) tab displays a badge of `1`.
6.  **Disconnect**:
    - Click `[鏂紑]`. Assert the Connected Devices tab displays "鏆傛棤宸茶繛鎺ヨ澶? (No connected devices empty state).

## 4. Current Parity Status
| Feature | Flutter | Tauri | Electron | UniApp | iOS Native |
|---------|---------|-------|----------|--------|------------|
| Mock Injector Available | 鉁?Yes | 鉁?Yes (Query Param) | 鉁?Yes (Query Param) | 馃毀 Planned | 馃毀 Planned |
| Automated E2E Framework | `Patrol` | `Playwright/Tauri` | `Playwright` | `Minium` | `XCTest` |

*(Note: UniApp test automation should use WeChat's Minium framework, while iOS Native uses XCTest UI testing.)*

