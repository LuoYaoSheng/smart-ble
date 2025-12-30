# Smart BLE - 硬件部分

## 目录结构

```
hardware/
├── common/              # 硬件公共代码
│   └── src/
│       ├── ble_server.h      # BLE 服务基类
│       ├── ble_characteristic.h  # 特征值基类
│       ├── protocol.h         # 通信协议定义
│       └── utils.h            # 工具函数
│
├── esp32/               # ESP32 (ESP32/ESP32-S2/S3/C3)
│   └── LightBLE/
│       ├── src/main.cpp
│       ├── platformio.ini
│       └── README.md
│
├── esp32-c3/            # ESP32-C3（待添加）
├── nrf52/               # nRF52832/52840（待添加）
└── stm32/               # STM32 + BLE 模块（待添加）
```

## 支持的硬件

| 硬件 | BLE 芯片 | 状态 | 开发环境 |
|------|----------|------|----------|
| ESP32 | ESP32 | ✅ 已完成 | PlatformIO |
| ESP32-C3 | ESP32-C3 | 计划中 | PlatformIO |
| ESP32-S3 | ESP32-S3 | 计划中 | PlatformIO |
| nRF52832 | nRF52832 | 计划中 | PlatformIO |
| nRF52840 | nRF52840 | 计划中 | PlatformIO |
| STM32 + BLE 模块 | 外接模块 | 计划中 | Arduino/PlatformIO |

## BLE 服务定义

### 主服务（灯控服务）
- **UUID**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **控制特征值**: `beb5483e-36e1-4688-b7f5-ea07361b26a8` (读写+通知)
- **通知特征值**: `beb5483e-36e1-4688-b7f5-ea07361b26a9` (读写+通知)

### 权限演示服务
- **UUID**: `4fafc201-1fb5-459e-8fcc-c5c9c331914c`
- 包含 7 种不同权限组合的特征值

## LED 控制命令

| 命令 | HEX | 效果 |
|------|-----|------|
| 开灯 | FF 01 | 常亮 |
| 关灯 | FF 00 | 关闭 |
| 快闪 | FF 02 | 200ms 闪烁 |
| 慢闪 | FF 03 | 1000ms 闪烁 |

## 开发指南

### ESP32 开发

```bash
cd hardware/esp32/LightBLE
platformio run --target upload
platformio device monitor
```

### 创建新硬件支持

1. 在对应目录创建项目
2. 实现 BLE 服务器基类接口
3. 实现相同的 UUID 和协议
4. 提交 PR
