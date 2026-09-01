# 当前 ESP32 LightBLE 实现

```yaml
status: REVIEW
last_reviewed: 2026-09-01
```

路径：`hardware/esp32/LightBLE/src/main.cpp`

| 项 | 当前事实 |
|---|---|
| 模式 | 仅 Peripheral Server；**无 Observer 源码** |
| 设备名 | `#define DEVICE_NAME "BLEToolkit-Server"`；`NimBLEDevice::init("ESP32-BLE-Server")` 不一致 |
| 服务 | 灯控 / 权限演示 / OTA（3 服务） |
| OTA CTRL | 已实现 JSON action start/commit/abort |
| LED | LED_PIN 2；部分写特征控制；**无完整 FF00..FF03 指令表**（Current firmware FAIL） |
| Observer 广播名 | Current FAIL：固件不含 `BLEToolkit-Observer` |
| 本轮硬件 | PlatformIO 未安装；未见 USB 串口；**NOT FLASHED / HARDWARE_PENDING** |
