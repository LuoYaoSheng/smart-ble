# MAC-008 证据：共享 Core / 协议 / 资产单源锁定（本轮基线复核）

- Host: macOS / Node 24.12 / JDK 17(temurin) / Xcode / Flutter dart

## 基线复核（2026-09-14）

| 门禁 | 结果 |
|---|---|
| JS Core（core/ jest） | 11/11 PASS |
| Apple Core（SmartHidCore swift test） | 32/32 PASS |
| Smart HID V1 platform parity | js 71/71 · dart 59/59（errorRecovery+4 常量为声明式豁免：恢复映射不在 Dart 镜像职责）· kotlin 71/71 · swift 32/32 → parity PASS |
| 资产单源（generate_assets --check 全量+主题） | 8 个输出全部 in-sync |
| Smart HID contract lock | PASS（c0b5a25b…，canonical ef450679…，vectors ×50 canon-locked） |
| 桌面 bundle 协议一致性（smart-hid-bundle.desktop） | 9/9 |
| check-dimension-usage / F023 零持久化 / F030 无 i18n | 全 PASS |

## 环境注记

- kotlin parity 线需要 `JAVA_HOME`（JDK 17–19）与 `ANDROID_HOME` 同时在场；
  默认 shell 缺失时 lane 正确落 BLOCKED（在册状态，不误报）。
- `core/tests/BleUtils.test.js` 为 Jest 用例（11/11），不得用 node --test 直跑。

## 尚未完成（本轮 Observations → 后续轮次）

1. 向量扩展：OTA manifest 与日志脱敏两套跨语言向量尚未进入 smart-hid-v1-vectors.json
  （现由各端平行测试覆盖：log-redaction-target / dart log_redaction / desktop
   log-redaction / swift；OTA 由 ota-contract 各端测试覆盖）。扩展需同时改
   js/dart/kotlin/swift 四个执行器，属新增工作，不在本轮基线复核内。
2. 台账：向量 platforms 声明差异（dart 豁免 errorRecovery）已在向量文件内单源声明。

- Status: PASS_WITH_OBS
