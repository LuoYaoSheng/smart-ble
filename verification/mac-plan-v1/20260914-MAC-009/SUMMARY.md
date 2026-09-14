# MAC-009 证据：ESP32 全环境构建 + STM32 边界裁定

- Host: macOS / PlatformIO（core 工具链，espressif32 + Arduino + NimBLE 1.4）

## ESP32 五环境构建（2026-09-14，全部 SUCCESS）

| 环境 | 角色 | firmware.bin | RAM | Flash |
|---|---|---|---|---|
| fixture_peripheral | GATT 服务夹具（ESP32 经典） | sha256 77056fa2… · 648K | 36316/327680（11.1%） | 655917/1572864（41.7%） |
| fixture_observer | 观察端夹具（ESP32 经典） | sha256 4341109e… · 616K | 30136（9.2%） | 570217（36.3%） |
| fixture_peripheral_s3 | GATT 服务夹具（ESP32-S3 16MB，物理夹具） | sha256 f4ba4346… · 560K | 30472（9.3%） | 528605（33.6%） |
| fixture_observer_s3 | 观察端夹具（S3） | sha256 48d64c38… · 516K | 35756（10.9%） | 621245（39.5%） |
| fixture_shid_sim_s3 | Smart HID 模拟夹具（S3） | sha256 8eadecf3… · 520K | 29144（8.9%） | 527641（33.5%） |

- 默认 `pio run` 覆盖 peripheral + observer 双环境（EXIT=0）；S3 三环境 `pio run -e …` 全绿（EXIT=0）。
- bootloader/partitions 产物随各 env 生成于 `.pio/build/<env>/`；烧录：`pio run -e fixture_peripheral_s3 -t upload`（UPLOAD_PORT 可选，DEC-012 自动探测）。
- OTA CDC：无独立 CDC env——OTA 服务端在 peripheral 固件内（src/ota_server.cpp），串口事件在 src/serial_events.cpp；OTA 真机链属 E5（见 MAC-007 UIS-18-OTA 在册分歧）。

## 文档冲突修正

- 05_PLATFORM_MATRIX / 10_LANDING_PAGE_SPEC / docs/index.md：`ESP-IDF` → `PlatformIO + Arduino（NimBLE）`（与实际工具链一致）。

## STM32 边界裁定（二选一 → 正式降级为协议样板）

- 现状核查：无 .ioc / 链接脚本 / HAL / 启动代码 / 构建配置——不可构建。
- 裁定：`hardware/stm32/BlePeripheralMock/` 正式定位为**协议样板**（承载协议与模块划分参考），不构建、不随发布分发固件；README 加范围裁定横幅，hardware/README 与根 README 同步改口。转为可构建工程前不得移除该声明。

## 状态与限制

- 烧录与真机 E5（广播契约/字节级写/OTA）维持既有状态：物理夹具在用户处，BOOT+RST 解锁操作待用户（历史在册）；本轮仅证构建面。

- Status: PASS_WITH_OBS
