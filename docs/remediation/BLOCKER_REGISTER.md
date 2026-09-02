# Blocker 登记（TP-G2-R1 / E5 环境复核 + Smart HID Workflow）

```yaml
status: REVIEW
gate: TP-G4-E5-ENV
content_hash: 12439a5271322a6021324d093f2142649a01b59ed681d1809a0792e2e3f55a61
```

| ID | 类型 | 状态 | 说明 | Task |
|---|---|---|---|---|
| BLK-TOOL-PLAYWRIGHT | TOOLCHAIN | CLEARED | @playwright/test 未安装 → 页面 E4 BLOCKED_BY_TOOLCHAIN | ENV-PLAYWRIGHT-001 |
| BLK-TEST-PAGE-DRIVER | TESTABILITY | CLEARED | TARGET_PAGE_DRIVER 未实现 | TEST-PAGE-DRIVER-001 |
| BLK-TOOL-PLATFORMIO | TOOLCHAIN | CLEARED | PlatformIO 6.1.18 可用；fixture `pio run` SUCCESS（本轮禁止 upload） | ESP32-BUILD-001 / E5-ENV-REVALIDATION |
| BLK-HW-ANDROID | FIXTURE | OPEN | adb 仅 emulator；无物理 Android → HARDWARE_PENDING | VERIFY-ANDROID-001 / B-004 |
| BLK-HW-ESP32 | FIXTURE | OPEN | 无 ESP32 USB 串口 → BLOCKED_BY_HARDWARE | VERIFY-ESP32-001 / B-005 |
| OTA-E5-BLOCKER | FIXTURE+TOOLCHAIN | OPEN | **OTA-E5-BLOCKED**（E5-ENV-REVALIDATION）：B-004/B-005/B-006 未清除 | OTA-E5-VERIFICATION |
| B-004 | FIXTURE | OPEN | Android physical device unavailable（仅模拟器，不算 E5） | E5-ENV-REVALIDATION |
| B-005 | FIXTURE | OPEN | ESP32 serial unavailable（`pio device list` 无 USB 测试板） | E5-ENV-REVALIDATION |
| B-006 | TOOLCHAIN | OPEN | Android APK build unavailable（HBuilderX Vite IIFE/code-splitting） | E5-ENV-REVALIDATION |

本轮禁止：upload / adb install / 真机 BLE / 宣称 E5 PASS / 自动执行 OTA-E5-VERIFICATION / Smart HID E5。

证据：`verification/e5-env-review/20260902-1446-e5-env/` · 历史 E5：`docs/verification/evidence/E5-OTA-001.md`
