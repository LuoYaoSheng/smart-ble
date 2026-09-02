# OTA E5 正向流程记录

**STATUS:** BLOCKED — 未进入真实 BLE OTA 事务

## First Breakpoint

| # | 步骤 | 要求 | 实际 | 结果 |
|---|---|---|---|---|
| 0 | 硬件 + App | ESP32 已烧写 + UniApp APK 已安装 | ESP32 无 USB 端口；APK 编译失败 | **BLOCKED** |
| 1 | Package validation | `validateFirmwarePackage` PASS | 仅静态 manifest 准备，未在 App 运行 | NOT EXECUTED |
| 2 | STATUS subscribe | ESP32 notify ready | 无连接 | NOT EXECUTED |
| 3 | CTRL start | payload 含 op/target/sha256 | 无连接 | NOT EXECUTED |
| 4 | READY | ESP32 READY | — | NOT EXECUTED |
| 5 | DATA | chunk + progress | — | NOT EXECUTED |
| 6 | CTRL commit | COMMIT | — | NOT EXECUTED |
| 7 | STATUS success | SUCCESS | — | NOT EXECUTED |
| 8 | Reboot | 设备重启 | — | NOT EXECUTED |
| 9 | Reconnect | Session reconnect | — | NOT EXECUTED |
| 10 | Version readback | firmware_version == target_version | — | NOT EXECUTED |

## 失败场景（HASH_ERROR）

**状态：** NOT EXECUTED（无 App 运行时环境）

**预期 first breakpoint：** Package validation FAIL → 无 CTRL start / 无 DATA

## Abort 验证

**状态：** NOT EXECUTED

## Disconnect 验证

**状态：** NOT EXECUTED

## Flash 尝试摘要

见 `flash-log.txt` — `pio upload` 误选 Bluetooth 串口，esptool 连接 ESP32 失败。
