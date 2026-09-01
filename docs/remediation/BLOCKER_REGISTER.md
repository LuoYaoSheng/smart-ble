# Blocker 登记（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 533f6380d58101d7514b159f5f99ab44cb537c34731a2d354416d91c7b7fe64c
```

| ID | 类型 | 状态 | 说明 | Task |
|---|---|---|---|---|
| BLK-TOOL-PLAYWRIGHT | TOOLCHAIN | CLEARED | @playwright/test 未安装 → 页面 E4 BLOCKED_BY_TOOLCHAIN | ENV-PLAYWRIGHT-001 |
| BLK-TEST-PAGE-DRIVER | TESTABILITY | OPEN | TARGET_PAGE_DRIVER 未实现 | TEST-PAGE-DRIVER-001 |
| BLK-TOOL-PLATFORMIO | TOOLCHAIN | OPEN | PlatformIO 可能未安装 → ESP32 build NOT_EXECUTED（本轮禁止 upload） | ESP32-BUILD-001 |
| BLK-HW-ANDROID | FIXTURE | OPEN | adb devices 可能为空 → HARDWARE_PENDING | VERIFY-ANDROID-001 |
| BLK-HW-ESP32 | FIXTURE | OPEN | 无 ESP32 USB 串口 / Observer 夹具 → BLOCKED_BY_FIXTURE | VERIFY-ESP32-001 |

本轮禁止：upload / adb install / 真机 BLE / 宣称 E5 PASS。
