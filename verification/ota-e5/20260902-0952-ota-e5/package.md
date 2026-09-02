# OTA Package 准备（本地 TEST）

> 二进制文件存于本地 `packages/`（**不提交 git**）。manifest 与 sha256 见 `sha256.txt`。

## Package A — 正确升级包（未用于 E5 传输）

**目标版本：** `1.0.1-e5-test`

| manifest 字段 | 值 |
|---|---|
| format_version | 1 |
| target | `lightble-peripheral` |
| hardware | `esp32-wroom-32` |
| firmware_version | `1.0.1-e5-test` |
| size | 668256 |
| sha256 | `1989b210a91a741e19e38a5dce8a0bd48813688ec5797396e1e9079a1dde7c3d` |

- 来源：`pio run` 产物 `firmware.bin`（4933d39）
- 静态校验：`validateFirmwarePackage` 可通过（与 contract schema 一致）

## Package B — 错误包（HASH_ERROR 场景）

| manifest 字段 | 值 |
|---|---|
| target | `lightble-peripheral` |
| hardware | `esp32-wroom-32` |
| firmware_version | `9.9.9-bad` |
| size | 668256 |
| sha256 | `0000000000000000000000000000000000000000000000000000000000000000`（故意错误） |

**预期（E5）：** App `validateFirmwarePackage` → FAIL；**不得**发送 CTRL start / DATA。

## Package C — 错误包（TARGET_MISMATCH 备选）

| manifest 字段 | 值 |
|---|---|
| target | `lightble-observer`（设备为 peripheral） |
| sha256 | 与 Package A 相同 |

**预期：** `OTA_TARGET_MISMATCH`；不得进入 BLE OTA 事务。

## E5 执行状态

| Package | 静态准备 | E5 传输验证 |
|---|---|---|
| A 正确包 | DONE | **NOT EXECUTED**（无 ESP32 + 无 APK） |
| B HASH_ERROR | DONE | **NOT EXECUTED** |
| C TARGET_MISMATCH | DONE | **NOT EXECUTED** |
