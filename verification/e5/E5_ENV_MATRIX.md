# E5 Environment Matrix（统一）

| 字段 | 值 |
|---|---|
| **TASK** | E5-ENV-UNIFIED-001 |
| **Baseline** | `f2c2feb` |
| **Checker** | `scripts/e5/check-env.mjs` → `verification/e5/env/latest.json` |
| **Overall** | **BLOCKED** |

## Shared matrix

| 项 | OTA | Broadcast | Smart HID |
|---|---|---|---|
| Android APK | BLOCKED | BLOCKED | BLOCKED |
| Android physical | BLOCKED | BLOCKED | BLOCKED |
| ESP32 board | BLOCKED | BLOCKED | BLOCKED |
| BLE link | BLOCKED | BLOCKED | BLOCKED |
| Evidence | READY | READY | READY |

> Evidence 基础设施（目录 / checker / matrix / devices 模板）已统一 → **READY**。
> 真机执行条件未齐 → 各域 E5 仍 **BLOCKED**。

## Detail status

| Gate | Status | Notes |
|---|---|---|
| Android SDK / adb / Java | READY | toolchain present |
| HBuilderX APP **compile** | READY | IIFE/code-split fixed via `apps/uniapp/vite.config.js` |
| Android **APK artifact** | BLOCKED | cloud/custom pack missing cert/assets; no `.apk` produced (B-007) |
| Android physical device | BLOCKED | only emulator-5554；emulator_not_e5 (B-004 / E5-ENV-ANDROID) |
| ESP32 `pio run` fixtures | READY | peripheral + observer SUCCESS；not uploaded |
| ESP32 USB serial | BLOCKED | serial_missing (B-005 / E5-ENV-ESP32) |
| BLE airlink | BLOCKED | needs physical Android + ESP32 board |

## Domain readiness formula

```
DOMAIN_E5_READY ⇔
  Android APK READY
  ∧ Android physical READY
  ∧ ESP32 board READY
  ∧ BLE link READY
  ∧ Evidence harness READY
```

Current: **false** for OTA / Broadcast / Smart HID.

## Do not execute

OTA-E5-VERIFICATION · BROADCAST-E5 · SMART-HID-E5 · Release Pipeline
