# Blocker 登记

```yaml
status: REVIEW
gate: TP-G2
```

| ID | 类型 | 状态 | 说明 |
|---|---|---|---|
| BLK-TOOL-001 | TOOLCHAIN | OPEN | Playwright 未安装 → 页面 E4 BLOCKED_BY_TOOLCHAIN |
| BLK-TOOL-002 | TOOLCHAIN | OPEN | PlatformIO 未安装 → ESP32 build NOT_EXECUTED |
| BLK-TOOL-003 | TOOLCHAIN | OPEN | HBuilderX.app 默认路径未见 → UniApp 正式包可能阻断 |
| BLK-HW-001 | FIXTURE | OPEN | `adb devices -l` 空列表 |
| BLK-HW-002 | FIXTURE | OPEN | 无 ESP32 USB 串口（`/dev/tty.usb*` 未见） |
| BLK-TEST-001 | TESTABILITY | OPEN | TARGET_PAGE_DRIVER 未实现（Actual API 抛 NOT_IMPLEMENTED） |

本轮禁止：upload / adb install / 真机 BLE / 宣称 E5 PASS。
