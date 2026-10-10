# 2026-09-10 Mac 收尾开发计划（apple-native 终局轮）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 关闭 Apple 原生线（N-MAC/N-IOS）在四轮 UI 审计后剩余的全部可自主开发项：OTA 契约对齐（R-1/R-2）、无障碍 Gate（Dynamic Type/VoiceOver 代理审计/键盘遍历/对比度）、一致性矩阵回填，产出证据并提交。

**Architecture:** OTA 状态判定与 start 帧构造从 OtaManager 抽为纯逻辑（可被 CoreUnit/SwiftPM 断言），契约事实源 = `contracts/target/ota-package.schema.json` + 固件 `ota_server.cpp`；iOS 字体改为环境感知的 ScaledFont（默认档位像素不变，保住已审计的 UI 对齐）；无障碍自动化走 Xcode `performAccessibilityAudit` + AX 字号档 launch-argument 冒烟。

**Tech Stack:** Swift（AppKit / SwiftUI / SwiftPM）、Xcode XCTest（unit + UI tests）、CoreBluetooth（不动）、JSON Schema 契约。

## Global Constraints

- 正典事实源：`docs/specs/README.md` 入口；OTA 包契约 = `contracts/target/ota-package.schema.json`（target 枚举 `lightble-peripheral|lightble-observer`、`firmware_version` SemVer、`size`、`sha256`）；固件侧校验在 `hardware/esp32/LightBLE/src/ota_server.cpp:207-244`（`missing_target` / `invalid_target` / `missing_target_version`）。
- 诚实口径：模拟器/单测 ≠ 真机 BLE PASS；真机 OTA/配网 E2E 维持 P-03 BLOCKED（等 ESP32 烧录）。矩阵回填只引用在册证据，不预填 PASS。
- UI 默认态不回归：Dynamic Type 迁移后默认档（.large）字号必须与现值逐点相等（UIFontMetrics 在默认 trait 下 scaledValue(for:) == 原值）。
- Conventional Commits，按子系统分任务提交；**禁 `git add -A`**（有并行会话先例），只 add 本任务文件；**不推送远端**（34 提交欠账等用户放行）。
- 验证命令：macOS `cd apps/desktop/macos/SmartBLE-mac && swift build && swift run SmartBLE-mac --unit-core && swift run SmartBLE-mac --smoke-pages`；iOS `cd apps/ios && swift test`；UI 测试 `xcodebuild -project SmartBLE.xcodeproj -scheme SmartBLETests|SmartBLEUITests -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' CODE_SIGNING_ALLOWED=NO test`。

## 背景：本轮从哪来

- 功能 Gate `verification/apple-native-v1/20260909-mac-a2/functional-summary.md`：PASS_WITH_BLOCKED_E5；E5 签名已由 Phase 4 解锁，息屏后台 BLE PASS（`4c19a58`）。
- UI 四轮审计（ui-audit → round2 → flow-states → tabbar）：9 页关键状态级全 PASS；每轮结尾一致点名剩余缺口 = **VoiceOver/Dynamic Type/键盘遍历**与**物理真机**。
- Phase 2 登记的两个 OTA 契约风险：R-1（App 发 `target=版本号` 且无 `target_version`，真固件必拒 `invalid_target`）、R-2（JSON 回值分支 `stateWords.contains("fail")` 精确匹配漏检 `"failed"`，失败拖成 30s 超时）。
- 主线 `refactor/uniapp-v1` 干净，领先 github 34 提交；本计划全部在主线执行。

## 等用户解锁项（本轮不做，防止越权）

1. ESP32 BOOT+RST 烧录 → Phase 7 四线转正（GATT 字节级/OTA E2E/配网 E2E/广播可见/n≥2）。
2. R-1 若最终决定"改固件契约"而非"App 对齐"→ 回滚 T3 的 App 侧改动（决策文档含双方案对比）。
3. 34 提交推送双远端。

---

### Task 1: 计划成文（本文件）

**Files:** Create `docs/plans/2026-09-10-mac-closeout-dev-plan.md`
- [x] 写入本计划（含 R-1/R-2 代码级证据、任务分解、验证命令、等待项）
- [x] 提交 `docs(plans): mac closeout dev plan — ota contract alignment + accessibility gate + matrix backfill`

### Task 2: R-2 — OTA 状态分类器纯逻辑化 + failed 漏检修复（macOS）

**Files:**
- Create: `apps/desktop/macos/SmartBLE-mac/Sources/Core/OtaStatusClassifier.swift`
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/Core/OtaManager.swift:346-381`（handleStatus 改为调分类器）
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/Core/CoreUnit.swift`（新增用例组）

**Interfaces:**
- Produces: `enum OtaDeviceEvent { case ready, success, ok, error(String) }`；`OtaStatusClassifier.classify(_ data: Data) -> OtaDeviceEvent?`（纯函数，无 BLE 依赖）

- [x] **2.1 先写失败测试**：CoreUnit 新增 `OTA-CLS-*` 用例——`{"event":"failed","code":"OTA_ERR_STATE"}` 必须判为 `.error`（当前实现会漏检，跑 `--unit-core` 应 FAIL）
- [x] **2.2 跑 `swift run SmartBLE-mac --unit-core` 确认新用例失败**（红）
- [x] **2.3 实现**：新建 `OtaStatusClassifier`——JSON 分支收集全部字符串值后**子串匹配**（`ready`/`success`/`ok`/`error`/`fail`，大小写不敏感），文本分支保持现行 `contains` 语义；`OtaManager.handleStatus` 删除内联解析、改调分类器（verifying 分支不动）
- [x] **2.4 跑 `--unit-core` 全绿**（62+新增）
- [x] **2.5 提交** `fix(macos-ota): classify failed-status frames via substring match (R-2)`

### Task 3: R-1 — macOS OTA start 帧契约对齐 + 决策文档

**Files:**
- Create: `docs/specs/06_review/OTA_CONTRACT_R1_R2_DECISION.md`
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/Core/OtaManager.swift`（manifest 解析 + start payload）
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/Core/CoreUnit.swift`（payload builder 用例）

**Interfaces:**
- Produces: `OtaStartPayload.build(manifest: OtaManifestInfo?, fileName: String?, fileSize: Int, chunkSize: Int, sha256: String) -> [String: Any]`（纯函数）；manifest 解析白名单从 `version/size/sha256` 扩为契约六字段（`format_version/target/hardware/firmware_version/size/sha256`，legacy `version` 兼容保留）

- [x] **3.1 决策文档**：R-1 双方案对比——A=App 对齐冻结契约（schema+固件已是正典，推荐）；B=改固件放宽 target（破坏冻结契约，需用户另批）；R-2 已按缺陷直接修复（Task 2）。附固件拒绝路径代码行号
- [x] **3.2 先写失败测试**：CoreUnit `OTA-START-*`——有 manifest（target=lightble-peripheral, firmware_version=1.2.3）时 payload 必须含 `target:"lightble-peripheral"` + `target_version:"1.2.3"`；无 manifest 时 target 缺省不得发版本号（当前实现 FAIL）
- [x] **3.3 实现**：manifest 解析增加 `target`（枚举校验，非法→`OTA_PACKAGE_INVALID`）与 `firmware_version`（SemVer，legacy `version` 回退）；start 帧发 `op/target/target_version/size/chunk_size/sha256`；无 manifest 时按正典"跳过包校验"口径——start 帧 `target` 用 UI 侧显式缺省值并在日志注明（不发伪造枚举）
- [x] **3.4 `--unit-core` 全绿 + 决策文档提交** `feat(macos-ota): align start frame with frozen package contract (R-1)`

### Task 4: iOS OTA start 帧对齐

**Files:**
- Modify: `apps/ios/Sources/Manager/OtaManager.swift:87-93`
- Test: `apps/ios/Tests/SmartBLETests/`（新增 payload 断言）

- [x] **4.1 审计现状**：现发 `{"action":"start","size":…,"chunk_size":…,"firmware_version":"iOS-build"}` —— 键名 `action`≠契约 `op`、无 `target/target_version/sha256`（真固件必拒）
- [x] **4.2 对齐**：改为 `op/target/target_version/size/chunk_size/sha256` 六键；target/target_version 来源与 macOS 同口径（manifest 优先、缺省日志注明）；SwiftPM 测试断言六键齐全
- [x] **4.3 `cd apps/ios && swift test` 全绿（12+新增）**
- [x] **4.4 提交** `fix(ios-ota): align start frame with frozen package contract`

### Task 5: iOS Dynamic Type 全量迁移（默认尺寸不变）

**Files:**
- Create: `apps/ios/Sources/Design/ScaledFont.swift`
- Modify: `apps/ios/Sources/Design/NativeComponents.swift`（12 处）+ 13 个视图文件共 ~92 处 `.font(.system(size:…))`
- Test: `apps/ios/Tests/SmartBLETests/ScaledFontTests.swift`

**Interfaces:**
- Produces: `extension View { func scaledFont(_ size: CGFloat, _ weight: Font.Weight = .regular, relativeTo: Font.TextStyle = .body, design: Font.Design = .default) -> some View }`——内部 `@Environment(\.sizeCategory)` + `UIFontMetrics(forTextStyle:).scaledValue(for:compatibleWith:)`；默认档 scaledValue == 原值（数学事实，测试断言）

- [x] **5.1 基建 + 单测**：默认 trait 下 17pt→17pt；AX 档 > 原值（用 UITraitCollection 构造，无需 UI 测试）
- [x] **5.2 逐文件迁移**（每文件后 `swift build`）：NativeComponents → BroadcastView(14) → AboutView(14) → ServicePanel(11) → ScanView(9) → DeviceCard(8) → DeviceDetailView(6) → FilterPanel(5) → ConnectedDevicesView(4) → ProvisioningView(3) → LogPanel(3) → 其余 3 处
- [x] **5.3 回归**：`swift test` + Xcode 全套绿；默认档像素不变以数学等价证明（scaledFont 默认 trait 逐点相等，ScaledFontTests）+ 像素敏感 UI 测试（TabBar/FlowState/审计五套）零回归
- [x] **5.4 提交** `feat(ios-a11y): scale all typography with Dynamic Type (default size unchanged)`

### Task 6: iOS 无障碍审计 UI 测试 + AX 字号冒烟

**Files:**
- Modify: `apps/ios/SmartBLE/UI/`（SmartBLEUITests target，新增 `AccessibilityAuditUITests.swift`）
- 复用：既有 launch-argument 确定性状态机（flow-states 审计同款）

- [x] **6.1** `try app.performAccessibilityAudit()` 覆盖 P001 默认/筛选展开/P009/P010 四态（audit 类型全开；已知系统弹窗差异按 fullers 豁免登记）
- [x] **6.2** AX 大档冒烟：launch arguments 强制 `.accessibilityExtraLarge`，断言关键元素存在且无截断标志（`performAccessibilityAudit` 的 dynamicType 检查兜底）
- [x] **6.3** Xcode UI scheme 跑绿（现有 5 UI 测试不回归）
- [x] **6.4 提交** `test(ios-a11y): automated accessibility audit + AX text-size smoke`

### Task 7: macOS 键盘遍历 + 双端 WCAG 对比度断言

**Files:**
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/UI/Kit.swift`、`MainWindowController.swift`（initialFirstResponder/焦点环/可达性）
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/Core/CoreUnit.swift`（对比度用例）
- Test: `apps/ios/Tests/SmartBLETests/ContrastTests.swift`（iOS 侧同函数移植）

**Interfaces:**
- Produces: `ContrastRatio.wcag(_ fg: UIColor|NSColor hex, _ bg: …) -> Double`（纯函数）；正典 token 对（text/sub/mut × bg/card、白字 × primary/success/danger/warning）逐对断言 ≥4.5（正文）或如实登记失败项为设计正典约束

- [x] **7.1 对比度**：先跑出全 token 对数值表；通过项写死断言，失败项（预期 mut 弱文字可能 <4.5）写入审计文档为 ALLOWED(设计正典约束)，**不改正典色值**
- [x] **7.2 键盘遍历**：审计四 Tab 页 + 二级页——NSControl 全部可聚焦、Tab 序=视觉序、Escape/Return 语义；修复 initialFirstResponder 与自定义按钮 focusRing；以人工清单 + 代码 diff 记录，注明"合成键盘事件需辅助功能权限，自动化留待设备 Gate"（诚实口径）
- [x] **7.3 CoreUnit 全绿 + 提交** `feat(macos-a11y): keyboard traversal audit fixes + wcag contrast assertions`

### Task 8: 一致性矩阵回填（N-MAC/N-IOS 列）

**Files:**
- Modify: `docs/specs/09_test/CROSS_IMPLEMENTATION_PARITY_MATRIX.md`（§3 记分卡加两列；§5 注记新证据）

- [x] **8.1** 逐 F 行（F001–F029）按在册证据回填 N-MAC/N-IOS：证据源 = mac-a2 functional-summary、phase-2 REPORT（真无线电 PASS/BLOCKED 项）、Phase 4/E5、BG BLE（`4c19a58`）、CoreUnit/PageSmoke、本轮 Task 2–7 新增用例；真机未证项如实 `NOT_RUN(真机)`/`BLOCKED(P-03)`
- [x] **8.2** §1 硬一致项中 Apple 侧已有证据的行（扫描 5s/超时 10s/重连 1·3·5/写队列/零持久化/OTA P-03）补注 Apple 结论
- [x] **8.3 提交** `docs(parity): backfill N-MAC/N-IOS scorecard from recorded evidence`

### Task 9: 全量验证 + 收口证据 + 提交

- [x] **9.1** macOS：`swift build` + `--unit-core` + `--smoke-pages`（预期 62+N / 17+ 全绿）
- [x] **9.2** iOS：`swift test` + Xcode unit/UI scheme 全绿
- [x] **9.3** 证据：`verification/apple-native-v1/20260910-closeout/audit.md`（本轮全部判定 + 截图/输出摘录 + 剩余开口清单）
- [x] **9.4** 提交 `docs(verify): mac closeout round evidence`；工作树收干净（不推送）

## Self-Review 结论

- 覆盖检查：四轮 UI 审计点名的剩余缺口（VoiceOver 代理审计/Dynamic Type/键盘/对比度）→ Task 5/6/7；Phase 2 R-1/R-2 → Task 2/3/4；Phase 五第 3 条矩阵回填 → Task 8；E6/发布管线 → 等待项 + Task 9 证据（clean-machine E6 语义未在正典定义，本轮不虚构范围，待用户澄清或按新克隆目录近似另行立项）。
- 类型一致性：`OtaDeviceEvent`/`OtaStartPayload`/`scaledFont`/`ContrastRatio.wcag` 在产出任务中定义、消费任务中同名引用。
- 无占位符：每个实现步骤均给出确切文件/行为/验证命令。
