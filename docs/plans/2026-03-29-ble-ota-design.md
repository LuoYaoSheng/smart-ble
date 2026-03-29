# BLE OTA Design

## Goal

Add a teaching-friendly BLE OTA upgrade path for the ESP32 firmware and the Android client. The first deliverable should favor clarity over throughput, while still being realistic enough to evolve into a production-grade flow later.

## Why BLE OTA

This repository is centered on BLE debugging and protocol learning. A BLE-native OTA path fits the project better than Wi-Fi OTA because it demonstrates:

- custom GATT service design
- MTU and chunked transfer behavior
- firmware state machines
- progress / error reporting over notifications

## Scope

Phase 1 targets:

- ESP32 firmware in `hardware/esp32/LightBLE/`
- Android native app in `apps/android/`

Phase 1 excludes:

- iOS / Flutter / desktop OTA UI
- signed firmware verification
- resume-from-breakpoint
- encrypted transport

## Proposed GATT Protocol

Service UUID:

- `4fafc201-1fb5-459e-8fcc-c5c9c331914d`

Characteristics:

- `...26c0` control: `READ | WRITE | NOTIFY`
- `...26c1` data: `WRITE | WRITE_NR`
- `...26c2` status: `READ | NOTIFY`

Control payloads use JSON UTF-8 messages:

```json
{ "action": "start", "size": 786432, "chunk_size": 180, "firmware_version": "1.1.0" }
{ "action": "commit" }
{ "action": "abort" }
```

Status notifications use JSON:

```json
{ "type": "ota", "status": "ready" }
{ "type": "ota", "status": "progress", "received": 32768, "total": 786432, "percent": 4 }
{ "type": "ota", "status": "success", "rebooting": true }
{ "type": "ota", "status": "error", "message": "size_mismatch" }
```

## Firmware Plan

Use Arduino `Update.h` to write the inactive OTA partition. On `start`, validate `size`, call `Update.begin(size)`, reset counters, and publish `ready`. On each data write, append bytes with `Update.write(...)`, update `received`, and periodically notify progress. On `commit`, verify `received == total`, call `Update.end(true)`, notify success, delay briefly, then `ESP.restart()`. On `abort` or any write failure, call `Update.abort()` and notify an error state.

## Android Plan

Add an OTA section to the device detail screen:

- file picker via `ACTION_OPEN_DOCUMENT`
- firmware metadata display: name, size
- start / cancel actions
- progress bar bound to OTA status notifications

The Android BLE layer should:

- request MTU 247 on connect when available
- send `start`
- stream firmware in sequential chunks sized to `min(mtu - 3, negotiated_chunk_size)`
- wait for each write callback before sending the next chunk
- send `commit` only after all chunks are acknowledged

## Safety Rules

- Reject OTA while the device is disconnected
- Block normal write operations during OTA
- Cap the accepted firmware size
- Treat any disconnect during OTA as failure
- Keep the old firmware until `Update.end(true)` succeeds

## Teaching Notes

Document the protocol in `docs/03-ble-protocol.md` only after Phase 1 is implemented. Until then, this file is the source of truth for OTA design decisions.

## Milestones

1. Add OTA service and status notifications to ESP32 firmware
2. Add Android OTA file picker, control messages, and progress UI
3. Add sequential write-ack flow and MTU-aware chunk sizing
4. Verify with a real ESP32 firmware binary end to end
