# E5 Device Registry

| Field | Value |
|---|---|
| **TASK** | E5-ENV-UNIFIED-001 |
| **Updated** | 2026-09-02 |
| **Policy** | No fictional devices |

## Android

| Field | Value |
|---|---|
| physical count | **0** |
| Status | **BLOCKED** |

### Emulators (not E5)

| serial | model | product | E5 eligible |
|---|---|---|---|
| emulator-5554 | sdk_gphone64_arm64 | sdk_gphone64_arm64 | **NO** (`emulator_not_e5`) |

> When a physical device is connected, record: model, Android version (`ro.build.version.release`), serial.

## ESP32

| Field | Value |
|---|---|
| board expected | esp32dev (WROOM) |
| chip expected | ESP32 |
| USB serial ports | **none** |
| Status | **BLOCKED** (`serial_missing`) |

`pio device list` only shows `/dev/cu.debug-console` and `/dev/cu.Bluetooth-Incoming-Port` (not ESP32).

## BLE

| Field | Value |
|---|---|
| Host Bluetooth | On (macOS) |
| Phone↔ESP32 airlink | **NOT VERIFIABLE** (no physical Android + no ESP32 serial) |
