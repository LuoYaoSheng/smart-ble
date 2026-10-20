# 当前固件 OTA 状态（2026-10-20）

本轮补齐本地 BLE OTA，不建设管理后台。完整协议、包生成命令与错误处理见 [本地升级说明](../ota-local-upgrade.md)。本报告替代此前“NVS 写入请求版本即读回”的旧实现描述；历史证据保留在 Git 和 verification 目录。

## 已落实

- CTRL 使用 `op=start/commit/abort`；start 必须包含 target、hardware、target_version、size、chunk_size、sha256。
- ESP32 Peripheral 身份为 `lightble-peripheral / esp32-wroom-32`；S3 为 `lightble-peripheral / esp32-s3`。Observer 当前是扫描固件，不提供 OTA。
- BLE 回调仅向有界 FreeRTOS FIFO 投递数据，loop 独占 Flash/SHA/状态。commit 时继续排空暂存，不再因停止 drain 卡住。
- SHA 缺失、错误长度、错误摘要、镜像芯片或实际版本不符、队列溢出、断线和超时均失败关闭；取消清理，不承诺断点续传。
- 版本来自当前编译镜像；构建后核对实际应用描述符，禁止从 NVS/请求字段伪造“已升级”。
- 客户端成功必须完成真实断开、重连和 INFO 实际版本校验；设备 `success` 回执仅代表 Flash 提交。
- `scripts/ota/package-firmware.py` 只生成来自实际应用镜像的本地六字段包，检查芯片、版本、段边界、checksum、附加 SHA256 和分区上限。

## 分区与入口

`hardware/esp32/LightBLE/partitions_ota.csv` 保留 app0/app1 双分区，每个 0x180000；不更改已有设备的分区布局。失败传输不切换启动分区；断电和启动回滚必须另做真实板卡验证。

| 入口 | 内容 |
| --- | --- |
| `ota_server.cpp/.h` | 实际固件事务和有界命令队列 |
| `device_info.cpp` | target/hardware/当前运行版本 |
| `scripts/ota/test-firmware-host.py` | 用宿主 API stub 编译执行实际 ota_server.cpp |
| `scripts/ota/package-firmware.py` | 本地真实固件包生成与校验 |
| `platformio.ini` | ESP32/S3 baseline 与 1.0.1 OTA target 环境 |

## 验证边界

宿主状态机、单元测试、模拟器和构建是软件证据，均不能替代真实 Flash/BLE。当前进展见 `release/ota-verification-2026-10-20.json`。用户表示有可重刷开发板，等待接入；尚未完成的实机项目保留 NOT_RUN，OTA 不提升为 VERIFIED，商店不提交。

Kotlin Android 的活跃旧 OTA 页面已接入新事务引擎，双文件授权、逐帧回执与重启版本回读已通过 113 个单测（含新增 13 个 OTA 用例）及 debug 构建；仍待真机验证。原生 SwiftUI iOS、AppKit macOS 为 Apple 后续上架实现；修复后的源码需重新打包，10 月 19 日的 1.0.5/101 包不包含这些修复。
