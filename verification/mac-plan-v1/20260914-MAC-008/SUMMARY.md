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

---

## 追加（2026-09-14 深夜 · 第二轮）：OTA/脱敏跨语言向量扩展落地

首轮登记的「向量扩展未做」已完成：

| 件 | 内容 |
|---|---|
| 向量单源 | `core/protocols/ble-product-v1-vectors.json`（独立于 canon-locked smart-hid 向量）：logRedaction 14 例（js/dart/kotlin）+ otaTargets 5 例 + otaSemVer 8 例（js/swift） |
| 检查器 | `scripts/check-product-parity.mjs` 四线（js 27/27 · dart 14/14 · kotlin 14/14 · swift 45/45 全 PASS） |
| 执行器 | dart `tool/product_parity.dart`；kotlin `ProductVectorParityTest.kt`（结果双出口）；swift `ProductContractVectorTests.swift`（13 例镜像消费） |
| 根级门禁 | verify-uniapp.sh 静态门禁 14→15（Product vectors parity） |

### 抓到并修复的真缺口（向量化的直接收益）

- **Kotlin F026 镜像缺口**：`LogRedaction.sanitizeJsonValue` 的 else 分支放行字符串元素，
  容器内 `"token=abc"` 不脱敏（JS 正典对容器内 string 一律再过模式脱敏）。已补
  `is String -> sanitizeLogString(value)`；Android 全量单测 76/76 复验。

### 新登记分歧（DIVERGENCE-REGISTER，per-platform expect，待裁决不得改写实现）

- **D-SEMVER-1**：`1.2.3+build.5` — JS 完整 SemVer 接受 / Swift 正则不接受。
- **D-SEMVER-2**：`01.0.0` — JS 严格拒绝前导零 / Swift `\d+` 接受。

（OTA manifest 全字段校验语义差异更大——JS 严格六字段 vs Swift 宽松+实测校验——
属 R-1/R-2 同族契约议题，本轮只向量化交集，不单方改契约。）

- Status（更新）: PASS（Observations 1 已销项）

---

## 追加（2026-09-15 上午 · 第三轮）：桌面车道并入（desktop lane）

二轮登记的「桌面 JS 线脱敏镜像未入 parity 车道」销项，详见
[ROUND3-20260915-desktop-lane.md](ROUND3-20260915-desktop-lane.md)：

- `check-product-parity.mjs` 新增 desktop 车道：**双副本字节门禁**（tauri/electron 镜像
  字节不等即 FAIL）+ **vm 沙箱求值**（无构建脚本挂 `globalThis.SmartBLELogRedaction`），
  只读消费 Windows 写锁区文件。
- `ble-product-v1-vectors.json`：logRedaction.platforms += desktop；meta 登记。
- 带 JDK17 复跑：js 27/27 · dart 14/14 · kotlin 14/14 · swift 45/45 · desktop 14/14
  ——**五线全执行全 PASS**；verify-uniapp 26+15 门禁全绿。

- Status（维持）: PASS

