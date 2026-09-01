# 当前构建与工具链

```yaml
status: REVIEW
last_reviewed: 2026-09-01
```

来源：`.tmp/tp-g2/environment/inventory.txt`

| 工具 | 状态 |
|---|---|
| OS | Darwin arm64 · Apple M4 |
| Git | 2.50.1 |
| Node | v24.12.0 |
| npm | 11.6.2 |
| Python | 3.14.5 |
| Java | Temurin 25 |
| HBuilderX.app | 默认路径未见；存在 `~/bin/cli` |
| PlatformIO (`pio`) | **缺失** |
| ADB | 1.0.41；`adb devices -l` **无设备** |
| 微信开发者工具 | `/Applications` 可见 |
| Playwright | **未安装** |
| ESP32 串口 | 未见 `/dev/tty.usb*`；仅 Bluetooth-Incoming / debug-console |

## 本轮允许/禁止

- 已执行：非破坏识别、docs build、verify-uniapp、目标 System/Current
- 禁止且未做：pio upload、erase、adb install、真机 BLE、E5 PASS
