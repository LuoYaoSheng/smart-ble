# Firmware Build（TEST ONLY — 非生产发布）

| 字段 | 值 |
|---|---|
| env | `esp32dev` |
| platform | `espressif32` |
| board | `esp32dev` |
| framework | `arduino` |
| build mode | release |
| **firmware_version（编译宏）** | `1.0.0`（`-DFIRMWARE_VERSION="1.0.0"`） |
| git sha | `4933d39` |
| binary path（本地，未提交） | `hardware/esp32/LightBLE/.pio/build/esp32dev/firmware.bin` |
| binary size | 668256 bytes |
| binary sha256 | `1989b210a91a741e19e38a5dce8a0bd48813688ec5797396e1e9079a1dde7c3d` |
| `pio run` | **SUCCESS** |
| `pio run -t upload` | **FAILED**（无 ESP32 串口） |

## 说明

- 本轮构建仅用于 TEST 证据与 OTA package 准备，**不是** GitHub Release / 生产固件目录替换。
- Flash 未执行成功；boot version / device info 串口读回 **未采集**。
