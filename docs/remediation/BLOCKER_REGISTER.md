# Blocker 登记（E5-ENV-UNIFIED-001）

```yaml
status: REVIEW
gate: TP-G4-E5-ENV-UNIFIED
task: E5-ENV-UNIFIED-001
```

| ID | 类型 | 状态 | 说明 | Task |
|---|---|---|---|---|
| BLK-TOOL-PLAYWRIGHT | TOOLCHAIN | CLEARED | Playwright 已可用 | ENV-PLAYWRIGHT-001 |
| BLK-TEST-PAGE-DRIVER | TESTABILITY | CLEARED | TARGET_PAGE_DRIVER 已实现 | TEST-PAGE-DRIVER-001 |
| BLK-TOOL-PLATFORMIO | TOOLCHAIN | CLEARED | PlatformIO 可用；fixture `pio run` SUCCESS | ESP32-BUILD-001 |
| **E5-ENV-ANDROID** | FIXTURE | **OPEN** | 无物理 Android；APK 包体未产出 | E5-ENV-UNIFIED-001 |
| **E5-ENV-ESP32** | FIXTURE | **OPEN** | 无 ESP32 USB serial | E5-ENV-UNIFIED-001 |
| B-004 | FIXTURE | OPEN | Android physical device unavailable（仅 emulator；emulator_not_e5） | E5-ENV-UNIFIED-001 |
| B-005 | FIXTURE | OPEN | ESP32 serial unavailable | E5-ENV-UNIFIED-001 |
| B-006 | TOOLCHAIN | **CLEARED** | HBuilderX IIFE/code-splitting 已通过 `vite.config.js` E5 profile 修复；APP compile PASS | E5-ENV-UNIFIED-001 |
| B-007 | TOOLCHAIN | OPEN | Android APK pack unavailable（cloud/custom pack 缺证书/资源；无 `.apk`） | E5-ENV-UNIFIED-001 |
| OTA-E5-BLOCKER | FIXTURE+TOOLCHAIN | OPEN | 依赖 E5-ENV-ANDROID + E5-ENV-ESP32 + B-007 | OTA-E5-VERIFICATION |
| BROADCAST-E5-BLOCKER | FIXTURE | OPEN | 同共享环境依赖 | BROADCAST-E5 |
| SMART-HID-E5-BLOCKER | FIXTURE | OPEN | 同共享环境依赖 | VERIFY-SMART-HID-001 |

## 共同依赖

| Domain | Android physical | ESP32 serial | APK | Evidence harness |
|---|---|---|---|---|
| OTA | OPEN | OPEN | OPEN | READY |
| Broadcast | OPEN | OPEN | OPEN | READY |
| Smart HID | OPEN | OPEN | OPEN | READY |

本轮禁止：upload / adb install / 真机 BLE / 宣称任一 E5 PASS / 自动执行 OTA·Broadcast·Smart-HID E5 / Release。

证据：`verification/e5/` · checker：`scripts/e5/check-env.mjs`
