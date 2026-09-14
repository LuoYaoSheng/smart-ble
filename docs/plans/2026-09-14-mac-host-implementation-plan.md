# Mac Host Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 由 Mac 主机完成除 Windows 专项外的全部平台实现、共享核心、固件、官网、CI、发布元数据和最终跨平台收口。

**Architecture:** `docs/specs/` 与 `docs/product-contract/` 继续作为全平台产品正典，JavaScript/TypeScript、Dart、Kotlin、Swift 和 Rust/C++ 实现通过共享向量与同一页面契约保持一致。Mac 是产品与发布整合主机；Windows 计划只回传 Windows 专项代码和证据，由 Mac 统一进入最终矩阵与发布门禁。

**Tech Stack:** macOS、Node.js、UniApp/Vue 3/Pinia/Vite、Flutter/Dart/Riverpod、Kotlin/Compose、SwiftUI/AppKit/CoreBluetooth、Electron、Tauri/Rust、VitePress、PlatformIO/Arduino/NimBLE、GitHub Actions。

---

## 0. 文档控制

| 字段 | 值 |
|---|---|
| 文档状态 | `CURRENT` |
| 文档版本 | `1.0` |
| 当前基线 | `refactor/uniapp-v1@718b3c0` |
| 执行主机 | Mac |
| 主负责人 | Mac 整合线 |
| 对应 Windows 计划 | [2026-09-14-windows-host-implementation-plan.md](./2026-09-14-windows-host-implementation-plan.md) |
| 历史来源 | [2026-09-11-dual-machine-scope-and-plan.md](./2026-09-11-dual-machine-scope-and-plan.md) |
| 最后更新 | 2026-09-14 |

本文件是非 Windows 平台和全产品总进度的唯一计划入口。旧双机计划只作为历史证据。

## 1. Mac 负责范围

| 领域 | Mac 负责内容 |
|---|---|
| UniApp | App/H5，以及微信目标是否保留后的实现或退役收口 |
| Flutter | Android、iOS、macOS、Web/Linux 可构建边界和统一页面行为 |
| Android 原生 | Kotlin + Compose 实现、测试、APK；真机可在 Mac 或请求 Windows 代跑，但所有代码仍归 Mac |
| Apple 原生 | SwiftUI iOS、AppKit macOS、SmartHidCore、Xcode/SwiftPM、签名和真机验证 |
| 桌面非 Windows | Electron macOS/Linux、Tauri macOS/Linux；修改共享桌面文件前遵守 Windows 写锁 |
| Web | VitePress 官网、状态页、交互原型和公开声明 |
| Core | JS/TS Core、Apple Core、跨语言协议向量、资产生成 |
| Hardware | ESP32 全环境；STM32 实现边界和可构建性 |
| 工程治理 | Makefile、CI、发布工作流、版本/元数据、最终矩阵、合入 main |

Mac 不直接宣称 Windows 完成；只消费 Windows 计划的可复现证据。

## 2. 状态、证据与进度规则

状态只允许使用 `TODO / IN_PROGRESS / PASS / PASS_WITH_OBS / FAILED / BLOCKED`，定义与 Windows 计划一致。

证据目录格式：`verification/mac-plan-v1/YYYYMMDD-MAC-xxx/`。

任务改成 `PASS` 前必须同时具备：

1. 当前 commit。
2. 精确命令和退出码。
3. 自动化结果。
4. 需要真机的能力必须有真机/硬件证据。
5. 影响发布声明时，发布元数据和官网状态同步更新。

## 3. 总进度看板

| ID | 工作包 | 当前状态 | 当前事实 | 依赖 |
|---|---|---|---|---|
| MAC-001 | 平台范围决策与正典冻结 | `PASS_WITH_OBS` | 路线 B 落正：用户 2026-09-11 已裁决全端撤小程序，2026-09-14 按 Route B 将三份正典、五份目标契约、schema、门禁脚本、gap 报告与目标文档全部收窄到单一解释（三平台/91 测试/30 CLAIM/80 FEAT/65 REQ/88 OP）；Windows 侧消费本结论更新 WIN-002 桌面元数据断言 | 用户确认保留或退役微信（已确认：退役） |
| MAC-002 | 恢复统一验证全绿 | `PASS` | make verify 五线全绿（uniapp/flutter/android-JDK17/apple 三步/tauri）；desktop 95/95；metadata --check PASS；verify-target 408/108/544 全 0 fail（证据 20260914-MAC-002） | MAC-001 |
| MAC-003 | UniApp App/H5 范围收口 | `PASS_WITH_OBS` | ARCHITECTURE/README 收正（Vue3+App/H5）、node:crypto 外置告警清零、mock 默认 android；verify-uniapp 26+14 全绿、build:h5 DONE、页面层 226 pass/0 fail（证据 20260914-MAC-003） | MAC-001、MAC-002 |
| MAC-004 | Flutter 多端候选版 | `PASS_WITH_OBS` | 三端构建全成（apk/iphonesimulator/macos.app）；iOS 平台脚手架补齐；未用依赖 flutter_platform_widgets 移除后 122/122 复验；E5 真机 BLOCKED；Artifact 登记归 MAC-011 | MAC-002、MAC-008 |
| MAC-005 | Kotlin Android 原生页面对齐 | `PASS_WITH_OBS` | 九页可达（新增 P002/P003/P005 三屏+双入口+分流+15 测试）；assembleDebug + 75/75 单测；E5 真机 BLOCKED（证据 20260914-MAC-005） | MAC-002、MAC-008 |
| MAC-006 | SwiftUI iOS 发布链 | `PASS_WITH_OBS` | UIPasteboard 门控修复（SwiftPM macOS 编译过）；Simulator test 全过；Archive+真机安装+启动全成（iPhone 11 Pro）；App Store 导出凭据红线 NOT_RUN（证据 20260914-MAC-006） | MAC-002、MAC-008 |
| MAC-007 | AppKit macOS 发布链 | `PASS_WITH_OBS` | 新增 SmartBLEMacTests 7/7；深度验证 40 行 EXIT=0（真实 BLE/快照/bundle/沙盒/soak）；修复分发 bundle 资源缺失崩溃；OTA 契约分歧 R-1/R-2 待用户裁决（证据 20260914-MAC-007） | MAC-008 |
| MAC-008 | 共享 Core/协议/资产单源 | `PASS_WITH_OBS` | JS 11/11、Swift 32/32、parity 四线（js71/dart59豁免/kotlin71/swift32）、资产 8/8 in-sync、contract lock、桌面 bundle 9/9 全绿；OTA/脱敏向量扩展未做（证据 20260914-MAC-008） | MAC-001、MAC-002 |
| MAC-009 | ESP32/STM32 硬件线 | `PASS_WITH_OBS` | ESP32 五环境全绿（默认双环境+S3 三环境，SHA/RAM/Flash 落证据）；ESP-IDF 口径冲突修正；STM32 正式降级协议样板（横幅+文档改口）；真机烧录/E5 待用户 BOOT+RST（在册） | MAC-008 |
| MAC-010 | macOS/Linux 桌面实现 | `PASS_WITH_OBS` | Electron DMG/ZIP + Tauri App/DMG 当日构建全成且蓝牙声明齐备（零共享源码改动）；macOS 真 BLE 面由 MAC-007 原生线 + 2026-09-12 Electron 历史证据覆盖；Linux 归 MAC-011 CI | WIN-002～WIN-004 写锁协调 |
| MAC-011 | 官网、CI、发布与 Artifact 管线 | `PASS_WITH_OBS` | CI 五线重写（分支/Apple 三步/JDK21/UniApp 全量/Tauri Linux bundle）；Release 改候选产物不自动发布；官网 SSR 崩溃修复（status 页死键）；元数据/限制同步；pages 脚本改 Playwright（证据 20260914-MAC-011） | MAC-001～MAC-010、WIN-009 |
| MAC-012 | 跨平台总验收与合入 main | `IN_PROGRESS` | 终验全绿（make verify/目标套件/desktop/metadata/官网）；FINAL-REPORT 已出；合入 main 待用户批准；WIN-010 Windows 报告吸收待 Windows 线回传 | MAC-002～MAC-011、WIN-010 |

完成率统计：`PASS` 2 / `PASS_WITH_OBS` 10 / `IN_PROGRESS` 1（MAC-012）/ `FAILED` 0 / `BLOCKED` 0 / `TODO` 0。

### 2026-09-14 · MAC-012（阶段一：终验与归档）

- Status: IN_PROGRESS（合入 main 门槛=用户批准 + WIN-010 吸收）
- Commit: <本次>
- Host: macOS 全工具链
- Commands: `make verify`；`node scripts/verify-target.mjs --mode=all`；`node --test tests/desktop/*.test.mjs`；`node scripts/generate-release-metadata.mjs --check`；`cd docs && npm run docs:build`
- Result: 全绿（明细见 FINAL-REPORT 第二节）；分支卫生核查无误提交产物
- Hardware: 汇总见 FINAL-REPORT 第三节
- Evidence: verification/mac-plan-v1/FINAL-REPORT.md
- Public status impact: 保持 PREVIEW（无对外发布物）；官网/状态页/元数据一致
- Observations: 未决项五条（用户决策四 + Windows 报告一）见 FINAL-REPORT 第四节
- Sync gap（§6.4 登记，2026-09-14 深夜）：Gitee=8bbf1fa 全量；GitHub 停在 c3ccb06，缺 16 提交——根因：本机 gh OAuth token 无 workflow scope，推送含 .github/workflows 变更被拒。修复：用户执行 `gh auth refresh -h github.com -s workflow` 后 `git push github refactor/uniapp-v1`（历史已就绪，无需改写）。
- Windows 吸收进展：WIN-001（Windows 基线建档）+ WIN-002（desktop 95/95，M1 平台断言改为消费正典生成元数据、对微信裁决中立——优于 Mac 的硬编码 3 键机械修订，rebase 取 Windows 版）；WIN-009/010 仍待回传。
- Next: 用户批准后合入 main + Tag；Windows 线 WIN-010 回传后关闭 MAC-012

### 2026-09-14 · MAC-011

- Status: PASS_WITH_OBS
- Commit: <本次>
- Host: macOS / Node 24 / VitePress
- Commands: `cd docs && npm run docs:build`；`./scripts/verify-uniapp-pages.sh`；`node scripts/generate-release-metadata.mjs --check`；`node --test tests/desktop/*.test.mjs`
- Result: 官网 build complete（修复 status 页死键 SSR 崩溃）；pages 层 226 pass/0 fail；metadata --check PASS；desktop 95/95
- Hardware: N/A
- Evidence: verification/mac-plan-v1/20260914-MAC-011/
- Public status impact: 状态页/落地页/元数据三方一致（限制清单含 Release Pipeline 新口径与微信退役）；CI/Release YAML 重写待推送后 Actions 首跑取证
- Observations: HBuilderX uniapp.test 移除后 pages 脚本已切 Playwright；CI 实跑与 Linux bundle 证据在首跑后回填
- Next: MAC-012

### 2026-09-14 · MAC-010

- Status: PASS_WITH_OBS
- Commit: <本次（证据与计划）>
- Host: macOS arm64
- Commands: `cd apps/desktop/electron && npm run build:mac`；`cargo-tauri build`
- Result: 双线 DMG+ZIP/App 产物全成；NSBluetoothAlwaysUsageDescription 双双在位
- Hardware: 复验口径见证据（原生线当日 + Electron 2026-09-12 历史链）
- Evidence: verification/mac-plan-v1/20260914-MAC-010/
- Public status impact: none（产物登记归 MAC-011）
- Observations: 未触碰 Windows 写锁源码；Linux 构建在 MAC-011 CI 落地
- Next: MAC-011

### 2026-09-14 · MAC-009

- Status: PASS_WITH_OBS
- Commit: <本次>
- Host: macOS / PlatformIO
- Commands: `pio run`；`pio run -e fixture_peripheral_s3 -e fixture_observer_s3 -e fixture_shid_sim_s3`
- Result: 五环境 SUCCESS；RAM/Flash 全记录；STM32 协议样板裁定落文档
- Hardware: 构建面全证；真机烧录/E5 待用户（BOOT+RST 历史在册）
- Evidence: verification/mac-plan-v1/20260914-MAC-009/
- Public status impact: 05/10 号矩阵与落地页 ESP32 行改 PlatformIO+Arduino 口径；STM32 改「协议样板（不构建分发）」
- Observations: 无独立 OTA CDC env（OTA 服务端内嵌 peripheral 固件）；OTA 真机链属 E5 在册分歧
- Next: MAC-010/011

### 2026-09-14 · MAC-007

- Status: PASS_WITH_OBS
- Commit: <本次>
- Host: macOS / swift 5.9+
- Commands: `swift build`；`swift test`；`bash scripts/macos/verify-native-macos.sh mac-plan-20260914-r2`；`bash scripts/macos/make-app-bundle.sh --omit-bt-usage`
- Result: 模块测试 7/7；深度验证 EXIT=0（40 汇总行；UIS-18-OTA FAIL 为在册 OTA 契约分歧，NVC-05 BLOCKED 需第二观察端）；bundle 崩溃修复并复验
- Hardware: 本机 CoreBluetooth（环境外设连接+ATT+服务发现 NVC-04 PASS）；ESP32 夹具 OTA 链仍 FAIL（R-1/R-2 待裁决）
- Evidence: verification/mac-plan-v1/20260914-MAC-007/ + verification/macos-extension/mac-plan-20260914-r2/
- Public status impact: none
- Observations: make-app-bundle 资源 bundle 拷贝修复为分发级真 bug；公证 NOT_RUN（账号红线）
- Next: MAC-009

### 2026-09-14 · MAC-006

- Status: PASS_WITH_OBS
- Commit: <本次>
- Host: macOS / Xcode / iPhone 11 Pro 真机
- Commands: `swift build`；`make verify-apple-ios`；`xcodebuild archive`；`devicectl device install/process launch`
- Result: SwiftPM Build complete；Simulator TEST SUCCEEDED；Archive EXIT=0；真机 installed+launched
- Hardware: iPhone 11 Pro（iPhone12,3）安装+启动证据；完整 BLE E5 复验归总验矩阵
- Evidence: verification/mac-plan-v1/20260914-MAC-006/
- Public status impact: none
- Observations: App Store 导出 NOT_RUN（账号凭据红线）；launch 初次 OSStatus -10814 为错误 bundle id 重试（com.smartble.toolkit→com.smartble.ios）非缺陷
- Next: MAC-007

### 2026-09-14 · MAC-005

- Status: PASS_WITH_OBS
- Commit: <本次>
- Host: macOS / JDK 17 / Gradle 8.2
- Commands: `./gradlew assembleDebug testDebugUnitTest`；`node scripts/check-f023-zero-persistence.mjs`；`node scripts/check-platform-parity.mjs`
- Result: BUILD SUCCESSFUL；75/75（新增 15 例）；F023 PASS；kotlin parity 71/71
- Hardware: E5 未执行（BLOCKED；无真机排期，模拟器不冒充；代跑请求按需交 Windows）
- Evidence: verification/mac-plan-v1/20260914-MAC-005/
- Public status impact: none
- Observations: 复用 HidProvisionController/Transport 未建第二套协议实现；HBuilderX 通道不受影响
- Next: MAC-006

### 2026-09-14 · MAC-004

- Status: PASS_WITH_OBS
- Commit: <本次>
- Host: macOS / Flutter / Xcode
- Commands: `flutter build apk --debug`；`flutter create --platforms=ios .` + `flutter build ios --simulator --no-codesign`；`flutter build macos`；`flutter analyze`；`flutter test`
- Result: 三端产物全成；analyze 0；122/122（移除 flutter_platform_widgets 后复验）
- Hardware: E5 未执行（无真机排期，BLOCKED；模拟器不冒充）
- Evidence: verification/mac-plan-v1/20260914-MAC-004/
- Public status impact: none（Artifact 登记 MAC-011 前保持 Preview）
- Observations: iOS 首建一次 Linker 瞬态失败二建成；Web/Linux 仅声明支持范围不构建
- Next: MAC-005

### 2026-09-14 · MAC-003

- Status: PASS_WITH_OBS
- Commit: aef618f
- Host: macOS / Node 24.12
- Commands: `./scripts/verify-uniapp.sh`；`npm run build:h5`；`node scripts/verify-target.mjs --mode=current`
- Result: 26 单测文件+14 静态门禁 PASS；H5 构建无 externalized 告警；页面层 11 specs/825 断言 226 pass 0 fail；current 544/544
- Hardware: N/A
- Evidence: verification/mac-plan-v1/20260914-MAC-003/
- Public status impact: none
- Observations: HBuilderX 5.x CLI 已移除 uniapp.test（DEF-002）——verify-uniapp-pages.sh 需在 MAC-011 改写为 Playwright 入口；mock-bridge 默认平台已改 android
- Next: MAC-008（已完成，见后）→ MAC-004

### 2026-09-14 · MAC-008

- Status: PASS_WITH_OBS
- Commit: <本次>
- Host: macOS / Node 24.12 / JDK 17 / Xcode
- Commands: `cd core && npx jest`；`make verify-apple-core`；`JAVA_HOME=<17> ANDROID_HOME=<sdk> node scripts/check-platform-parity.mjs`；`python3 core/assets-generator/generate_assets.py --check`；`node scripts/check-smart-hid-contract.mjs`；`node --test tests/desktop/smart-hid-bundle.desktop.test.mjs`
- Result: 全绿（js 11/11、swift 32/32、parity 四线 PASS、资产 8/8、contract lock、bundle 9/9）
- Hardware: N/A
- Evidence: verification/mac-plan-v1/20260914-MAC-008/
- Public status impact: none（元数据漂移已在 MAC-002 清零）
- Observations: OTA manifest 与日志脱敏的跨语言向量扩展未做（需四端执行器同步改造，登记为后续轮次）；dart 豁免 errorRecovery 为向量内声明式口径
- Next: MAC-004

### 2026-09-14 · MAC-002

- Status: PASS
- Commit: 764d8e9 + 4d6a2ba（本次）
- Host: macOS / Node 24.12 / Xcode / JDK 17(temurin) / Gradle 8.2 / cargo
- Commands: `make verify`（五线）；`node --test tests/desktop/*.test.mjs`；`node scripts/generate-release-metadata.mjs --check`；`node scripts/verify-target.mjs --mode=all`
- Result: uniapp 26 单测文件+14 静态门禁；flutter analyze 0/122 测试；android JDK17 BUILD SUCCESSFUL；apple Core 32/32 + iOS Xcode TEST SUCCEEDED(2+12) + macOS swift build；tauri cargo check；desktop 95/95；SYSTEM 408/408 · HARNESS 108/108 · CURRENT 544/544
- Hardware: N/A（E5 真机线属 MAC-004~007/009）
- Evidence: verification/mac-plan-v1/20260914-MAC-002/
- Public status impact: release 元数据 9 产物重生成，latest.json 漂移清零
- Observations: tests/desktop 平台断言 4→3 键为 Windows 写锁区机械修订，WIN-002 拉取后复核；java_home -v 21 回退默认 JVM 的坑已在脚本内实测校验
- Next: MAC-003

### 2026-09-14 · MAC-001

- Status: PASS_WITH_OBS
- Commit: <本次提交>
- Host: macOS / Node 24.12
- Commands: `node scripts/target/{check-target-platforms,check-target-landing-claims,check-target-traceability,check-target-contract,check-target-pages,check-target-flows,check-target-protocols}.mjs`（全 PASS）；`node scripts/verify-target.mjs --mode=all`（SYSTEM 408/408、HARNESS 108/108、CURRENT 540/543——剩 3 失败属 MAC-002 范围）
- Result: 路线 B（退役）落正。改动：`docs/product-contract/05_PLATFORM_MATRIX.md`（退役记录专节）、`docs/specs/10_platform/PLATFORM_EXTENSION.md`（退役横幅）、`docs/specs/11_ecosystem/PLATFORM_CAPABILITY_MATRIX_v1.0.md`（范围口径）、`docs/product-contract/10_LANDING_PAGE_SPEC.md`（微信码主推撤除）、`docs/target-product/{01,03,08,18,22}` 与 `web/WEB-001`、`pages/PAGE-{001,009,010}`；契约 `platform/product/landing/pages/test-traceability`（三平台、80 FEAT/65 REQ/30 CLAIM/91 TEST/88 OP、TEST-W 套件+TEST-H-008+TEST-R-009 移除、OP-P001-15/OP-P009-11/OP-P010-03/OP-W001-04 移入 deprecated）；`release/release-manifest.schema.json`（去 wechat_qr/wechat surface）；脚本 `check-target-platforms/check-target-landing-claims/generate-gap-report/sync-feature-priorities/e5/check-env`；harness 变异 `contract-mutations`（3 处 wechat 断言改用存活平台）；fixtures/manifests 重生成
- Hardware: N/A
- Evidence: verification/mac-plan-v1/20260914-MAC-001/
- Public status impact: 平台范围单一解释确立；官网落地页实装（docs/index.md 微信原型卡/截图区）与 latest.json 重生成分别移交 MAC-011 / MAC-002
- Observations: Windows 计划的 WIN-002 需消费本结论更新桌面元数据断言（经本文件传递，无直接通知通道）；audit/、docs/product-audit/、docs/prompts/、docs/smart-hid/MINIAPP_*.md、prototype/platform/wechat/ 为冻结历史证据保留
- Next: MAC-002

## 4. 实施任务

### MAC-001：确认微信目标并冻结平台范围

**Files:**

- Modify: `docs/product-contract/05_PLATFORM_MATRIX.md`
- Modify: `docs/specs/10_platform/PLATFORM_EXTENSION.md`
- Modify: `docs/specs/11_ecosystem/PLATFORM_CAPABILITY_MATRIX_v1.0.md`
- Modify: `docs/public/release/latest.json` only through generator

**Decision:**

- 路线 A：保留微信小程序。恢复 `dev:mp-weixin` / `build:mp-weixin`、微信 Peripheral 模块和对应测试。
- 路线 B：正式退役微信运行目标。删除活跃测试/构建/发布声明，仅保留历史文档和二维码传播入口的明确说明。

**Steps:**

1. 由用户选择 A 或 B；未确认前状态保持 `BLOCKED`。
2. 搜索 `wechat / 微信 / mp-weixin / wx-peripheral` 的所有活跃引用并生成影响清单。
3. 在产品矩阵和发布状态中一次性写明最终范围。
4. 给 Windows 计划发送结论，使 WIN-002 能更新桌面元数据断言。

**Acceptance:** 代码、测试、README、官网、元数据对微信只有一种有效解释。

### MAC-002：恢复根级验证和元数据门禁

**Files:**

- Modify: `tests/unit/scan-permission.test.mjs`
- Modify: `tests/target/integration/permission-flow-target.test.mjs`
- Modify according to MAC-001: `tests/target/integration/peripheral-owner-target.test.mjs`
- Modify: `scripts/generate-release-metadata.mjs`
- Modify: `release/release-state.json`
- Regenerate: `release/release-manifest.json`
- Regenerate: `docs/public/release/latest.json`
- Regenerate: `apps/ios/Sources/Resources/Release/release-manifest.json`
- Modify: `Makefile`

**Steps:**

1. 为权限服务增加可注入平台面，先让测试证明当前 `uni is not defined`。
2. 修正权限测试夹具，保持真实 UniApp 运行时调用路径不被 mock 替代。
3. 根据 MAC-001 恢复或移除微信 Peripheral 集成目标。
4. 从 `release-state.json` 单向生成全部平台元数据，禁止手改生成物。
5. 将 Android 验证固定到 JDK 17/21；默认 JDK 25 时给出明确错误。
6. 将 Apple 根级验证改成共享 Core `swift test` + iOS Xcode build/test + 原生 macOS build。
7. 依次运行：

```bash
make verify
node --test tests/desktop/*.test.mjs
node scripts/generate-release-metadata.mjs --check
node scripts/verify-target.mjs --mode=all --format=json
```

**Acceptance:** 根级门禁 0 失败；目标套件保持系统 0 fail、Harness 0 fail、Current 0 fail。

### MAC-003：UniApp 运行目标收口

**Files:**

- Modify: `apps/uniapp/package.json`
- Modify: `apps/uniapp/README.md`
- Modify: `apps/uniapp/ARCHITECTURE.md`
- Modify: `apps/uniapp/services/scan-permission.js`
- Modify as decided: `apps/uniapp/services/wx-peripheral-*.js`
- Modify: `apps/uniapp/services/ota/package-validator.js`

**Steps:**

1. 将架构文档从 Vue 2 修正为实际 Vue 3，构建命令与 package scripts 完全一致。
2. H5 继续明确为 BLE 降级/页面预览，不伪装真实 BLE 成功。
3. 处理 H5 构建对 `node:crypto` 的外置：浏览器路径使用 Web Crypto，Node 路径保留兼容实现。
4. 按 MAC-001 完成微信构建恢复或退役清理。
5. 跑 UniApp 单测、SFC parse、H5 build、页面 Playwright；若保留微信，再跑小程序构建和真机门禁。

**Acceptance:** UniApp 所有活跃目标都有真实构建命令、0 测试失败和明确能力降级。

### MAC-004：形成 Flutter 多端候选版

**Files:**

- Modify as needed: `apps/flutter/lib/**`
- Modify as needed: `apps/flutter/test/**`
- Modify as needed: `apps/flutter/integration_test/**`
- Review: `apps/flutter/pubspec.yaml`

**Steps:**

1. 保持现有 122 项测试为不可回退基线。
2. 用测试锁定九个活动页面、Smart HID、OTA、日志脱敏、重连和平台状态词。
3. 评估已停止维护的 `flutter_platform_widgets`；无必要不做大版本升级。
4. 分别构建 Android、iOS Simulator、macOS；Web/Linux 只声明真实插件支持范围。
5. 在物理 Android/iPhone/Mac 上按平台能力完成 E5；无硬件时保持 BLOCKED。
6. 生成候选 Artifact，但在总发布门禁前保持 Preview。

**Acceptance:** analyze 0、全部单测/集成测试通过，三个主要目标能构建，真机证据与状态声明一致。

### MAC-005：补齐 Kotlin Android 原生产品页面

**Files:**

- Create: `apps/android/app/src/main/java/com/smartble/ui/screen/ProvisioningScreen.kt`
- Create: `apps/android/app/src/main/java/com/smartble/ui/screen/HidDeviceDetailScreen.kt`
- Create: `apps/android/app/src/main/java/com/smartble/ui/screen/HidDiagnosticsScreen.kt`
- Modify: `apps/android/app/src/main/java/com/smartble/ui/MainActivity.kt`
- Modify: `apps/android/app/src/main/java/com/smartble/ui/components/DeviceCard.kt`
- Test: `apps/android/app/src/test/java/com/smartble/core/profile/**`

**Steps:**

1. 先写 P002/P003/P005 路由、状态、恢复动作和零持久化失败测试。
2. 复用已有 `HidProvisionController` 与 `HidProvisionTransport`，不再创建第二套协议实现。
3. 扫描卡提供 Smart HID 与高级 GATT 双入口；已连接页按 Profile 分流。
4. 接通二维码/手动粘贴、断线恢复、诊断和敏感字段清理。
5. 使用 JDK 17/21 执行 `./gradlew assembleDebug testDebugUnitTest`。
6. Mac 可用 Android 设备时真机测试；否则只把安装代跑请求交给 Windows，不转移代码所有权。

**Acceptance:** Android 原生九页可达，Smart HID 不再只有 Core 而没有 UI，构建和测试全绿。

### MAC-006：修复并完成 SwiftUI iOS 发布链

**Files:**

- Modify: `apps/ios/Sources/Views/ScanView.swift`
- Modify: `apps/ios/Package.swift`
- Modify: `apps/ios/project.yml`
- Modify: `apps/ios/Tests/**`
- Modify: `Makefile`

**Steps:**

1. 将 `UIPasteboard` 等 UIKit API用 `canImport(UIKit)` 或平台适配器隔离，避免 SwiftPM macOS 编译失败。
2. 明确 `SmartBLE.xcodeproj` 是 iOS 发布入口，Swift Package 只承担可兼容的开发验证。
3. 跑 Xcode iOS Simulator build、单测和 XCUITest，保持既有页面与无障碍用例通过。
4. 在物理 iPhone 验证蓝牙权限、扫描、连接、GATT、Peripheral、Smart HID 和 OTA。
5. 完成签名、Archive、导出和安装；凭据不入库。

**Acceptance:** 根级 Apple 门禁通过，Simulator 与真机各有证据，Archive 可导出。

### MAC-007：完成原生 macOS AppKit 发布链

**Files:**

- Modify: `apps/desktop/macos/SmartBLE-mac/Package.swift`
- Modify as needed: `apps/desktop/macos/SmartBLE-mac/Sources/**`
- Create: `apps/desktop/macos/SmartBLE-mac/Tests/SmartBLEMacTests/**`
- Modify: `scripts/macos/verify-native-macos.sh`

**Steps:**

1. 给原生 macOS 模块增加纯逻辑与页面契约测试 Target。
2. 保持扫描、GATT、广播、重连、Smart HID 和 OTA 的真实 BLE 基线。
3. 复验历史 OTA 已知项，确保固件更新后不再沿用旧失败结论。
4. 构建 `.app`，检查 Info.plist、Entitlements、蓝牙/相机用途说明。
5. 完成 ad-hoc Preview；正式公证等待 Apple 账号条件。

**Acceptance:** `swift build/test` 全绿，真实 Mac BLE 通过，打包应用可在干净用户环境启动。

### MAC-008：锁定共享 Core、协议与资产单源

**Files:**

- Modify as needed: `core/ble-core/**`
- Modify as needed: `core/protocols/**`
- Modify as needed: `core/apple/SmartHidCore/**`
- Modify as needed: `core/assets-generator/**`
- Modify: `scripts/check-platform-parity.mjs`

**Steps:**

1. 保持 JS Core 11/11、Apple Core 32/32 为最低基线。
2. 扩展跨语言向量，覆盖 UUID、QR、framing、状态、错误恢复、OTA manifest 和日志脱敏。
3. 所有生成资产使用 `--check` 模式检测漂移；禁止端内手改生成物。
4. 核对 JavaScript、Dart、Kotlin、Swift、桌面 bundle 的协议值。
5. 运行 `check-platform-parity`、Smart HID contract 和资产/token/icon 门禁。

**Acceptance:** 所有消费者与共享向量一致，无生成物漂移，无敏感信息进入日志。

### MAC-009：ESP32 完整环境与 STM32 边界

**Files:**

- Modify as needed: `hardware/esp32/LightBLE/**`
- Modify as needed: `hardware/stm32/BlePeripheralMock/**`
- Modify: `hardware/README.md`
- Modify: `docs/product-contract/06_ESP32_REFERENCE.md`

**Steps:**

1. 执行默认 `pio run`，覆盖 Peripheral 与 Observer，而不只单个 S3 环境。
2. 单独构建 `fixture_peripheral_s3`、`fixture_observer_s3`、`fixture_shid_sim_s3` 和 OTA CDC 目标。
3. 记录每个固件的 SHA、RAM/Flash、启动 JSON 和烧录步骤。
4. 修正文档中“ESP-IDF”与实际 PlatformIO + Arduino 的冲突。
5. 对 STM32 做二选一：补齐 `.ioc`、链接脚本、HAL/启动代码并真实构建；或正式降级为协议样板，删除“可直接构建”的声明。

**Acceptance:** ESP32 全环境构建全绿；STM32 有诚实且可验证的状态，不再以缺文件工程冒充完成实现。

### MAC-010：Electron/Tauri 的 macOS 与 Linux 目标

**Files:**

- Modify with Windows lock coordination: `apps/desktop/electron/**`
- Modify with Windows lock coordination: `apps/desktop/tauri/**`
- Evidence: `verification/mac-plan-v1/<date>-MAC-010/`

**Steps:**

1. 等 Windows 对共享目录解除写锁后再拉取最新提交。
2. Electron macOS 构建 DMG/ZIP，Tauri macOS 构建 App/DMG，验证蓝牙权限声明。
3. 在 Mac 上复验扫描、连接、服务发现和平台正确降级；不得以 Windows 证据代替 Mac。
4. Linux 使用 GitHub Actions 或受控 VM 构建 AppImage/deb/rpm，并验证 BlueZ 依赖说明。
5. 共享 UI/协议修复必须回跑 WIN-002 桌面测试，避免破坏 Windows。

**Acceptance:** macOS 两线构建与基本真实 BLE 通过；Linux 至少完成 CI 构建和能力限制说明。

### MAC-011：修复官网、CI、发布与 Artifact 管线

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release-build.yml`
- Modify: `release/release-state.json`
- Modify: `scripts/generate-release-metadata.mjs`
- Modify: `docs/package.json`
- Modify as needed: `docs/.vitepress/**`

**Steps:**

1. CI push 分支加入 `refactor/uniapp-v1`，或明确所有改动必须经 PR 后由 required checks 阻断。
2. Apple CI 不再使用当前失败的裸 `swift build`；改为共享 Core test、iOS Xcode build/test、原生 macOS build。
3. Android CI 固定 JDK 21；UniApp CI运行完整 `verify-uniapp.sh` 而不是不完整子集。
4. Tauri Release 改用 Cargo/Tauri CLI，删除不存在的 `npm run tauri build`。
5. 发布 Artifact 与实际主线一致，消费 WIN-009 的 Windows 产物并加入 Android/iOS/macOS/固件目标。
6. 所有 Artifact 写入版本、commit、SHA256、平台和验证状态；未验证产物只能 Preview。
7. 执行 VitePress build、链接检查、公开声明测试和 release metadata `--check`。

**Acceptance:** CI/Release 从干净 clone 可运行；官网状态、元数据和实际 Artifact 一致。

### MAC-012：跨平台总验收、合入 main 与正式进度归档

**Files:**

- Update: `docs/plans/2026-09-14-mac-host-implementation-plan.md`
- Consume: `verification/windows-plan-v1/FINAL-REPORT.md`
- Create: `verification/mac-plan-v1/FINAL-REPORT.md`
- Modify: `docs/specs/09_test/**`
- Modify: `docs/current-state/**`

**Steps:**

1. 吸收 WIN-010，不复述或伪造 Windows 结果。
2. 运行根级统一验证、目标套件、所有平台构建和页面测试。
3. 按平台回填功能、页面、真机、Artifact、已知限制和证据链接。
4. 清理 `refactor/uniapp-v1` 相对 `main` 的文档冲突、生成产物和无意提交的构建目录。
5. 生成候选 Release，并完成干净安装与回滚演练。
6. 只有所有必需项 `PASS/PASS_WITH_OBS` 且用户批准后，才合入 `main` 并发布 Tag。

**Acceptance:** 两份计划全部结论化；主矩阵、当前状态、官网与 Release 一致；main 合入可审计、可回滚。

## 5. 每次进度回填模板

```markdown
### YYYY-MM-DD · MAC-xxx

- Status: PASS | PASS_WITH_OBS | FAILED | BLOCKED
- Commit: <sha>
- Host: <macOS / Xcode / toolchain>
- Commands: <exact commands>
- Result: <pass/fail counts and artifact>
- Hardware: <device / firmware sha or N/A>
- Evidence: verification/mac-plan-v1/<run>/
- Public status impact: <metadata/docs update or none>
- Observations: <remaining issue or none>
- Next: <next task id>
```

## 6. 跨主机同步协议

1. 任一主机开始任务前先拉取两个远端并确认同 SHA。
2. Windows 默认持有 Electron/Tauri/Avalonia 与 `tests/desktop` 写锁；Mac 默认持有其余目录。
3. 共享目录同一时间只能有一个活动任务；交接时必须先提交、推送、通知对方 pull。
4. GitHub 与 Gitee 同时推送；一个远端失败时必须在计划中登记精确差距。
5. 不把未提交工作目录直接复制到另一台机器作为交接方式。
6. 每个任务一个或少量聚焦提交，提交信息使用 Conventional Commits。

## 7. 全产品完成定义

只有同时满足以下条件，Mac 计划才能将项目标记完成：

- MAC-001 的平台范围已经由用户确认并贯穿代码、测试、文档和官网。
- `make verify`、桌面测试、目标套件和元数据检查全部 0 失败。
- UniApp、Flutter、Android 原生、iOS、原生 macOS、桌面和固件都有诚实的构建/验证状态。
- Windows 最终报告已吸收，Windows 矩阵无悬空项。
- 需要真实 BLE 的发布能力有真机/夹具证据；模拟器不能代替 E5。
- Artifact、SHA256、版本、commit、公开状态完全一致。
- 当前分支可以安全合入 main，并具备回滚路径。
