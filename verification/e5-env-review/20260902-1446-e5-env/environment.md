# E5 Environment Revalidation

| 字段 | 值 |
|---|---|
| **TASK_ID** | E5-ENV-REVALIDATION |
| **RUN_ID** | `20260902-1446-e5-env` |
| **Git HEAD** | `174f9e6` |
| **Checkpoint** | `checkpoint/tp-g4-env-review-174f9e6` |
| **Date** | 2026-09-02 |
| **Overall** | **OTA-E5-BLOCKED** |

## HOST

| 项 | 值 |
|---|---|
| OS | macOS 26.5.2 (Darwin 25.5.0 arm64, Build 25F84) |
| CPU | Apple M4 |
| Node | v24.12.0 |
| npm | 11.6.2 |

## BUILD

| 项 | 值 |
|---|---|
| HBuilderX | **存在** — `/Applications/HBuilderX.app` · 5.24.2026081301 |
| Android SDK | **存在** — `/Users/luoyaosheng/Library/Android/sdk` (`ANDROID_HOME`) |
| ADB | 1.0.41 / 36.0.0-13206524 |
| Java | OpenJDK 25.0.1 (Temurin) |

## ESP32

| 项 | 值 |
|---|---|
| PlatformIO | 6.1.18 (`~/.platformio/penv/bin/pio`) |
| `pio device list` | `/dev/cu.debug-console`、`/dev/cu.Bluetooth-Incoming-Port` only |
| USB serial (ESP32) | **未检测到** → `BLOCKED_BY_HARDWARE` |
| `fixture_peripheral` `pio run` | **SUCCESS**（未 upload） |
| Peripheral firmware.bin SHA256 | `bd3c7bb006c54bc31aa0c90580d9cae372cfa1fc0d1f3fc262a59bfa17f4b8ea` (674960 bytes) |
| `fixture_observer` `pio run` | **SUCCESS**（未 upload） |
| Observer firmware.bin SHA256 | `977acb505b93633a73aad47004405b24049d66648191d9849346018bcc5c6980` (639328 bytes) |

## ANDROID

| 项 | 值 |
|---|---|
| `adb devices -l` | emulator-5554 / 5556 / 5558（均为 `sdk_gphone64_arm64`） |
| physical | **0** → `BLOCKED_BY_DEVICE` |
| emulator | 3（Android 15 / sdk_gphone64_arm64）— **不算 E5** |

## BLUETOOTH

| 项 | 值 |
|---|---|
| Host Bluetooth | State **On** (BCM_4388C2) |
| Connected peripherals | iPhone (BLE)、Magic Keyboard、Magic Trackpad |
| E5 phone↔ESP32 BLE link | **不可验证**（无物理 Android + 无 ESP32 板） |

## Android APK Build Check（只检查）

| 字段 | 值 |
|---|---|
| command | `/Applications/HBuilderX.app/Contents/MacOS/cli launch app-android --project apps/uniapp --deviceId emulator-5554 --compile true` |
| result | **FAIL** |
| FIRST_BREAKPOINT | `Invalid value "iife" for option "output.format" - UMD and IIFE output formats are not supported for code-splitting builds.` |
| log | `apk-build-attempt.log` |
| 业务代码修改 | **禁止 / 未做** |

## 结论

不满足 OTA-E5-READY（缺物理 Android、ESP32 USB、可构建 APK）。保持 **OTA-E5-BLOCKED**。本轮未执行 Flash / OTA / Release。
