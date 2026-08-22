# UniApp Smart HID Sequence and Ownership

Date: 2026-08-22
Decision: D2 option 3, shared BLE Runtime primitives with separate verified Smart HID workflow ownership

## Ownership

| Layer | Owns | Must not own |
|---|---|---|
| BLE Runtime | global WeChat callbacks, one connection attempt/session per device, UUID routing, read/write/Notify primitives | Smart HID recovery labels or candidate meaning |
| Provisioning transport | selected service/characteristics, MTU, ordered frames, callback registration | page state or duplicate Runtime listeners |
| Smart HID service/workflow | Device Info verification, Info/Status subscriptions, waiter lifecycle, provisioning transaction, diagnostics | a second BLE adapter/callback system |
| Composable/pages | visible fields, labels, navigation, confirmation prompts, secret clearing | protocol constants, recovery tables, waiter timing |

## Selected Device to Verified Session

```mermaid
sequenceDiagram
    participant User
    participant Scan
    participant Wizard
    participant HID as Smart HID service
    participant Transport
    participant Runtime
    participant Device

    User->>Scan: Tap Smart HID 配网 on selected device
    Scan->>Scan: stopScan("connect")
    Scan->>Wizard: navigate(deviceId)
    Wizard->>HID: connect(deviceId)
    HID->>Transport: connect(expected service, required chars, MTU)
    Transport->>Runtime: connectDevice(expectedServiceUuid)
    Runtime->>Device: one BLE connection + service discovery
    Runtime-->>Transport: session
    Transport->>Runtime: enable Info/Status Notify once
    HID->>Runtime: register Info/Status value listeners
    HID->>Device: read Device Info
    alt product + protocol + device ID valid
        HID-->>Wizard: verified info
        Wizard-->>User: show configuration
    else wrong identity or setup failure
        HID->>Runtime: close session and clear listeners
        HID-->>Wizard: explicit error
    end
```

## Candidate Write and Fast Status

```mermaid
sequenceDiagram
    participant User
    participant Wizard
    participant Workflow
    participant HID as Smart HID service
    participant Runtime
    participant Device

    User->>Wizard: Tap 下发配置
    Wizard->>Workflow: provisionAndWait(candidate)
    Workflow->>HID: create terminal Status waiter
    Note over Workflow,HID: waiter exists before first write
    Workflow->>HID: provisionCandidate(candidate, waiter)
    HID->>HID: canonical JSON → UTF-8 → framed chunks
    loop ordered frames
        HID->>Runtime: write INPUT frame
        Runtime->>Device: GATT write
    end
    Device-->>Runtime: Status Notify (may be immediate)
    Runtime-->>HID: routed Status bytes
    HID->>Workflow: resolve terminal waiter
    alt ready and no error
        Workflow-->>Wizard: ok
        Wizard-->>User: 配置完成
    else stable error / recovery / timeout / disconnect
        Workflow-->>Wizard: status/error
        Wizard-->>User: canonical recovery action
    end
```

## Recovery

```mermaid
flowchart TD
    A[Terminal result] --> B{error code}
    B -->|wifi_failed / invalid_payload| C[form: 修改配置]
    B -->|pairing_invalid / expired / used / ControlHub unreachable| D[pairing: 清 token 并重新扫码]
    B -->|mqtt_invalid| E[diagnostics: 进入诊断]
    B -->|storage_failed / timeout / disconnect / unknown| F[retry: 重新下发或重连]
```

`workflow.js` is the only recovery table. Pages map these action keys to labels and navigation only.

## Diagnostics Ownership

```mermaid
sequenceDiagram
    participant Page as Diagnostics page
    participant HID as Smart HID service
    participant Device

    Page->>Page: clear stale diagnostic snapshot
    Page->>HID: getSessionState()
    alt same device already connected
        Page->>HID: diagnose()
        Note over Page,HID: borrowed connection; page does not close it on back
    else historical/offline device
        Page-->>Page: show offline + reconnect confirmation
        Page->>HID: connect(deviceId)
        HID->>Device: verify Device Info
        Page->>HID: diagnose()
        Note over Page,HID: page owns this reconnect and closes it on unload
    end
    HID-->>Page: live rows or explicit failure
```

## Advanced BLE

`高级 BLE 调试` builds `/pages/device/detail?device=...` from a whitelisted, non-sensitive selected-device context. Generic detail then reuses an eligible Runtime session or reconnects explicitly; it never sends the user back to Scan without context.

## Required Real Evidence

- strong and weak discovery plus wrong identity rejection
- immediate terminal Status after first write
- every stable recovery code
- timeout and passive disconnect waiter cleanup
- borrowed vs owned diagnostics navigation
- advanced route followed by a real GATT operation
