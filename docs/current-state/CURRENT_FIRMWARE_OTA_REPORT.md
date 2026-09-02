# CURRENT_FIRMWARE_REPORT（OTA-FIRMWARE-001 盘点）

> 生成阶段：Firmware Implementation（禁止先改后的静态盘点快照）

## PlatformIO

| 项 | 值 |
|---|---|
| env | `esp32dev` |
| platform | `espressif32` |
| board | `esp32dev` |
| framework | `arduino` |
| monitor_speed | `115200` |
| upload_speed | `921600` |
| partitions | `partitions_ota.csv` |

## Chip / Board

| 项 | 值 |
|---|---|
| mcu | `esp32` |
| cpu | `240MHz` |
| flash_mode | `qio` |
| psram | enabled (`BOARD_HAS_PSRAM`) |

## BLE Services（fixture_peripheral）

| Service | UUID |
|---|---|
| SVC-01 主服务 | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` |
| SVC-02 权限演示 | `4fafc201-1fb5-459e-8fcc-c5c9c331914c` |
| SVC-03 OTA | `4fafc201-1fb5-459e-8fcc-c5c9c331914d` |

## OTA Characteristics（精确 UUID）

| 角色 | UUID |
|---|---|
| CTRL | `beb5483e-36e1-4688-b7f5-ea07361b26c0` |
| DATA | `beb5483e-36e1-4688-b7f5-ea07361b26c1` |
| STATUS | `beb5483e-36e1-4688-b7f5-ea07361b26c2` |

## OTA 源码文件

| 文件 | 职责 |
|---|---|
| `include/ota_server.h` | OTA 状态机 / UUID / fault flags |
| `src/ota_server.cpp` | CTRL/DATA/STATUS handler、SHA256、NVS 版本 |
| `src/main.cpp` | BLE 服务装配、Device Info、串口 JSON |

## Flash Partition（`partitions_ota.csv`）

| 分区 | 类型 | 大小 |
|---|---|---|
| nvs | data/nvs | 0x5000 |
| otadata | data/ota | 0x2000 |
| app0 | app/ota_0 | 0x180000 |
| app1 | app/ota_1 | 0x180000 |
| spiffs | data/spiffs | 0x0F0000 |

## Storage 评估

- **OTA 写入**：ESP32 `Update` API → 非活动 OTA 分区（双分区安全切换）
- **版本读回**：NVS `smart_ble/fw_version`（commit success 后写入；boot 后 `activeFirmwareVersion()` 读取）
- **失败保护**：abort/validation fail → `Update.abort()`，不切换 boot 分区；旧固件继续运行
- **结论**：当前双分区架构支持安全 OTA staging；本轮不执行真实 flash/E5

## OTA Chain（任务完成后）

| 环节 | 状态 |
|---|---|
| OTA Package | DONE |
| OTA Client | DONE |
| OTA Firmware | DONE |
| OTA E5 | OPEN（等待批准，禁止自动执行） |

## 实现摘要（OTA-FIRMWARE-001）

- CTRL：`op` = `start` / `commit` / `abort`（JSON payload 对齐 Client Contract）
- DATA：顺序写入 + overflow 保护 + progress notify
- commit：size 校验 + SHA256 比对 → `OTA_HASH_MISMATCH` / `OTA_SIZE_MISMATCH`
- Device Info：`firmware_version` 来自 NVS（commit success 后更新）
- 串口：`{"type":"ota","state":...,"received":...,"total":...}`
- Fault injection：`OTA_FAULT_INJECTION=1` 编译开关

## 变更前 First Breakpoint

- 固件 CTRL 使用 `action` + `firmware_version`（非 Client Contract 的 `op` + `target_version` + `sha256`）
- commit 无 SHA256 复核
- Device Info 非 `system_info` schema
