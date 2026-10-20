# 本地 BLE OTA 协议与固件补齐 Implementation Plan

**Goal:** 不建设后台，完成本地固件包到设备重启版本回读的可信升级事务；在验证后合并 main，并同步 GitHub/Gitee。

**Architecture:** 保留 `manifest.json` + `firmware.bin` 六字段包契约。客户端负责文件授权、包校验、BLE 事务与实际版本回读；固件以有界队列接收 BLE 命令，在 loop 单独完成 Flash 和 SHA256，失败不得切换启动分区。设备回执 `success` 只表示提交完成，不能代替重启验证。

**Tech Stack:** ESP32/S3 Arduino + NimBLE + PlatformIO；SwiftUI/AppKit + SmartHidCore；UniApp/Flutter/桌面现有实现；Python 打包与固件宿主测试。

## 设计取舍

采用本地包导入，适合蓝牙开发工具且无需账号或服务端。在线固件目录与完整后台暂不实施。只认可设备实现的 OTA 服务与型号；Observer 当前为扫描固件，不因为 manifest 枚举包含它就宣称它支持 OTA。

增加 start 必填 `hardware`，设备按本机型号校验；版本必须与镜像中的实际 app descriptor 一致，不能从客户端请求写 NVS 后冒充已升级。所有客户端随本轮升级，旧缺少 hardware 的 start 明确拒绝。

## Task 1: 协议与可重复固件包

- 新增 `docs/ota-local-upgrade.md`：UUID、包字段、start/ready/data/commit/success/reboot/readback、错误码与平台边界。
- 新增 `scripts/ota/package-firmware.py` 与单测：校验真实 ESP 应用镜像头、芯片、镜像版本、分区大小；生成六字段 manifest 和 SHA256；拒绝覆盖已有包。
- 明确固件完整性摘要不等于厂商数字签名，也不提供远程设备管理。

## Task 2: 固件事务与实际代码测试

- 修复 `hardware/esp32/LightBLE/{include,src}/ota_server.*`：所有 Update/SHA/状态由 loop 拥有，有界队列、提交时清空暂存、长度/hash fail closed、取消/断线/无数据超时清理。
- 校验硬件、芯片和真实镜像版本；版本读回仅来自当前运行镜像；正确区分 ESP32/S3。
- 使用宿主 stub 编译并执行实际 `ota_server.cpp`，覆盖 commit 带尾部缓存、重复 start、取消、断线、超时、错误包和失败后重试。
- PlatformIO 构建 ESP32 和 S3 固件，不将模型测试称作真实设备升级。

## Task 3: 原生 Apple 与现有客户端对齐

- Apple 双端使用共享纯事务逻辑并连接真实 CoreBluetooth 回调；文件选择明确授权 .bin 和 manifest；ready 前不传数据，commit 确认前不成功，断线重启回读后才成功。
- UniApp/Flutter/Electron/Tauri/Wails/Qt/Avalonia 对齐 hardware、严格状态解析、manifest、错误和版本验证。实施复核发现 Kotlin 活跃 UI 仍调用旧 action/假版本流程，因此也替换为新事务引擎并测试，不保留可绕过的旧升级入口。
- 运行相应单测、原生构建、桌面协议测试与完整仓库相关检查。

## Task 4: 实机与发布证据

- 用户已表示有可重刷开发板，等待接入；确认芯片、串口、Flash 后使用对应固件。
- 如设备可用，验证 BLE 升级成功后版本、取消、hash/size 错误、断线后整包重试；保留串口/BLE 证据和固件 SHA。
- 没有设备或平台无法覆盖时明确记录 NOT_RUN，保持商店发布门禁；软件通过不等于 E5 通过。
- 更新 release 元数据、文档与当前验证记录；旧 1.0.5/101 安装包按源码证据保留，不冒充已包含本轮修复。

## Task 5: 审查、合并与镜像

- 审查所有改动，运行 `git diff --check`、metadata/config/version 检查及相关 CI。
- 提交可审查变更，经已授权流程合并 main，核对两个 remote main 一致。
- 上架前以修复后源码重新构建、签名并验包；实际发布仍以 E5 与商店验证状态为准。
