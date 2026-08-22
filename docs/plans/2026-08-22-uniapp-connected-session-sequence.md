# UniApp Connected Session Sequence

Date: 2026-08-22
Related:
- `2026-08-21-smart-ble-interaction-sync-spec.md`
- `2026-08-21-smart-ble-page-wireframes.md`

## Purpose

This document records the actual session lifecycle for the UniApp mini program after introducing a dedicated `Connected` tab.

It exists for two reasons:

1. the connected-device entry is now a real product surface, not a placeholder
2. the previous implementation had lifecycle drift: leaving the detail page closed the BLE session, which made the `Connected` tab concept misleading

## Scope

This document covers:

- scan-page connect entry
- device-detail session creation and reuse
- connected-tab list maintenance
- explicit disconnect
- passive disconnect
- scan permission gate before discovery

It does not redefine GATT read/write/notify framing or Smart HID protocol details.

## Current State Model

The runtime now has three layers that must stay aligned:

1. `ble-runtime`
   owns real BLE sessions and adapter callbacks
2. `ble store`
   owns connected-device metadata and scan results; delegates runtime-session binding to `connected-session-registry`
3. `page instances`
   own only page-local UI subscriptions such as logs, notify toggles, and reconnect timers

Key rule:

- page unload must no longer equal session close

## Fixed Issues

Before this pass:

- leaving `pages/device/detail.vue` closed the runtime session in `onUnload`
- reopening a device from `Connected` could show connected UI but had no `bleSession` bound for read/write actions
- connected-list state could drift from scan-list state

After this pass:

- sessions are bound in `bleStore.bindConnectedSession(...)`
- concurrent Runtime connects for one device share one in-flight attempt
- session replacement unsubscribes the old registry callback before binding the new one
- detail pages reattach with `bleStore.getRuntimeSession(deviceId)`
- explicit disconnect uses `bleStore.disconnectConnectedDevice(...)`
- scan list mirrors connected status through store sync

## Sequence 1: Scan To Connected Session

```mermaid
sequenceDiagram
    participant User
    participant ScanPage as Scan Page
    participant Permission as scan-permission.js
    participant Store as ble store
    participant Runtime as ble-runtime
    participant Detail as Device Detail Page

    User->>ScanPage: Tap "开始扫描"
    ScanPage->>Permission: requestBleScanPermission()
    Permission->>Runtime: openBluetoothAdapter()
    Permission-->>ScanPage: ok / denied
    ScanPage->>Store: startScan(5000, "home-scan")
    Store->>Runtime: start discovery session
    Runtime-->>Store: discovery results
    Store-->>ScanPage: filteredDevices update

    User->>ScanPage: Tap "连接"
    ScanPage->>Store: stopScan("connect")
    ScanPage->>Detail: navigateTo(device)
    Detail->>Store: initConnectedDevice(device)
    Detail->>Runtime: connectDevice(deviceId)
    Runtime-->>Detail: session + services
    Detail->>Store: bindConnectedSession(device, session, services)
    Store-->>ScanPage: device.connected = true
    Store-->>ConnectedTab: connectedDevicesList +1
```

## Sequence 2: Reopen From Connected Tab

```mermaid
sequenceDiagram
    participant User
    participant ConnectedTab as Connected Tab
    participant Store as ble store
    participant Detail as Device Detail Page

    User->>ConnectedTab: Tap connected device card
    ConnectedTab->>Detail: navigateTo(device)
    Detail->>Store: getRuntimeSession(deviceId)
    alt session exists and alive
        Store-->>Detail: existing session
        Detail->>Detail: bindPageSession(existing session)
        Detail-->>User: read/write/notify continue to work
    else stale connected flag only
        Detail->>Store: updateDeviceConnectionStatus(false)
        Detail->>Detail: initBluetoothAdapter()
        Detail-->>User: reconnect path starts
    end
```

## Sequence 3: Explicit Disconnect

```mermaid
sequenceDiagram
    participant User
    participant Detail as Device Detail / Connected Tab
    participant Store as ble store
    participant Runtime as ble-runtime

    User->>Detail: Tap "断开"
    Detail->>Store: disconnectConnectedDevice(deviceId, options)
    Store->>Runtime: closeDevice(deviceId)
    Runtime-->>Store: session invalidated
    Store->>Store: clear runtime session binding
    Store->>Store: update connected status false
    alt remove = true
        Store->>Store: removeConnectedDevice(deviceId)
    end
    Store-->>Detail: status update
```

## Sequence 4: Passive Disconnect

```mermaid
sequenceDiagram
    participant Device
    participant Runtime as ble-runtime
    participant Store as ble store
    participant Detail as Device Detail Page
    participant ConnectedTab as Connected Tab

    Device-->>Runtime: connection lost
    Runtime->>Store: session disconnect callback
    Store->>Store: clear runtime session binding
    Store->>Store: update connected status false
    Runtime->>Detail: page disconnect callback
    alt detail page still active
        Detail->>Detail: clear local bleSession
        Detail->>Detail: log disconnect
        Detail->>Detail: optional reconnect timer
    else page already left
        Detail->>Detail: no UI side-effects
    end
    Store-->>ConnectedTab: connected list refresh
```

## Sequence 5: First-Time Scan Permission Gate

```mermaid
sequenceDiagram
    participant User
    participant ScanPage as Scan Page
    participant Permission as scan-permission.js
    participant Runtime as ble-runtime
    participant Weixin as WeChat Runtime

    User->>ScanPage: Tap "开始扫描"
    ScanPage->>Permission: requestBleScanPermission()
    Permission->>Weixin: getAppAuthorizeSetting()
    alt bluetooth permission denied
        Permission->>Weixin: showModal("需要蓝牙权限")
        Weixin->>Weixin: openAppAuthorizeSetting()
        Permission-->>ScanPage: bluetooth_permission_denied
    else permission available or not determined
        Permission->>Runtime: openBluetoothAdapter()
        alt system bluetooth unavailable
            Permission->>Weixin: showModal("无法开始扫描")
            Permission-->>ScanPage: bluetooth_unavailable
        else bluetooth ready
            Permission->>Weixin: getSetting()
            alt location already granted
                Permission-->>ScanPage: ok
            else location not granted
                Permission->>Weixin: authorize(scope.userLocation)
                alt authorization succeeds
                    Permission-->>ScanPage: ok
                else authorization denied
                    Permission->>Weixin: showModal("需要定位权限")
                    Permission-->>ScanPage: location_permission_denied
                end
            end
        end
    end
```

## Sequence 6: Scan / Broadcast Adapter Mode Handoff

```mermaid
sequenceDiagram
    participant User
    participant Scan as Scan Tab
    participant Broadcast as Broadcast Tab
    participant Mode as wx-peripheral-mode.js
    participant Store as ble store
    participant Weixin as WeChat Bluetooth Runtime

    User->>Broadcast: Switch from Scan to Broadcast
    Broadcast->>Store: read connectedDevicesList
    Broadcast->>Mode: open()
    alt active device sessions exist
        Mode-->>Broadcast: active_connections
        Broadcast-->>User: require disconnect before peripheral mode
    else no active sessions
        Mode->>Weixin: openBluetoothAdapter(mode=peripheral)
        alt adapter already open in central mode
            Mode->>Weixin: closeBluetoothAdapter()
            Mode->>Weixin: openBluetoothAdapter(mode=peripheral)
        end
        Broadcast->>Weixin: createBLEPeripheralServer()
    end

    User->>Scan: Leave Broadcast
    Broadcast->>Weixin: stopAdvertising() and close peripheral server
    Broadcast->>Mode: release()
    Mode->>Weixin: closeBluetoothAdapter() only when owner
    Scan->>Weixin: openBluetoothAdapter() on next scan
```

## Code Mapping

Primary files:

- scan permission gate:
  - `apps/uniapp/services/scan-permission.js`
- scan page orchestration:
  - `apps/uniapp/composables/use-ble-scan.js`
  - `apps/uniapp/pages/index/index.vue`
- WeChat adapter-mode ownership:
  - `apps/uniapp/services/wx-peripheral-mode.js`
  - `apps/uniapp/pages/broadcast/index.vue`
- connected session state:
  - `apps/uniapp/store/ble.js`
  - `apps/uniapp/services/connected-session-registry.js`
- connected tab:
  - `apps/uniapp/pages/connected/index.vue`
- device session page:
  - `apps/uniapp/pages/device/detail.vue`

## Guardrails

Future changes must preserve:

- `Connected` is meaningful only if leaving detail does not auto-close the session
- reopening from `Connected` must restore an operable session, not just a pretty status badge
- permission denial must always produce a visible user-facing explanation
- scan list and connected list must stay in sync for the same device

## Verification Notes

Code-level verification completed in this pass:

- all files under `tests/unit/*.test.mjs`
- `node tests/unit/scan-permission.test.mjs`
- `node tests/unit/scan-session.test.mjs`
- `node tests/unit/ble-runtime.test.mjs`
- `node tests/unit/connected-session-registry.test.mjs`
- `node tests/unit/wx-peripheral-mode.test.mjs`
- `node tests/unit/uniapp-ui-contract.test.mjs`
- Vue SFC parse check for all 24 UniApp `.vue` files
- WeChat DevTools visual and interaction check for Scan, permission failure, Connected, and Broadcast mode entry

Still required on a real device:

- real device validation for first-time bluetooth + location permission flow
- cross-page connected-session reuse validation
