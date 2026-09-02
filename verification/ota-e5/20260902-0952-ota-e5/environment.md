# OTA E5 环境记录

| 字段 | 值 |
|---|---|
| **RUN_ID** | `20260902-0952-ota-e5` |
| **Git HEAD** | `4933d39` |
| **Checkpoint** | `checkpoint/tp-g4-ota-e5-4933d39` |
| **Date** | 2026-09-02 |

## 工具链

| 工具 | 版本 / 状态 |
|---|---|
| OS | macOS 26.5.2 (Darwin 25.5.0 arm64) |
| Node | v24.12.0 |
| npm | 11.6.2 |
| Java | OpenJDK 25.0.1 |
| PlatformIO | 6.1.18 (`~/.platformio/penv/bin/pio`) |
| HBuilderX | 5.24.2026081301 |
| ADB | `/Users/luoyaosheng/Library/Android/sdk/platform-tools/adb` |

## Android

| 字段 | 值 |
|---|---|
| `adb devices` | `emulator-5554`（sdk_gphone64_arm64） |
| Model | sdk_gphone64_arm64 |
| Android version | 15 |
| Bluetooth | enabled / state ON |
| **物理真机** | **未连接** |

## ESP32

| 字段 | 值 |
|---|---|
| Target chip | ESP32 WROOM (`esp32dev`) |
| `pio device list` | 仅 `/dev/cu.debug-console`、`/dev/cu.Bluetooth-Incoming-Port` |
| **USB 测试板** | **未检测到** |
| Upload 自动端口 | `/dev/cu.Bluetooth-Incoming-Port`（非 ESP32） |

## 本轮结论

真实 OTA E5 需要 **物理 ESP32 测试板 + 物理 Android 真机（UniApp APK）+ BLE 空口链路**。当前环境不满足，状态 **BLOCKED**。
