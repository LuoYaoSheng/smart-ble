# Apple Native 收尾轮（Mac Closeout）· 2026-09-10

```yaml
branch: refactor/uniapp-v1
baseline: bd3be1c（计划成文）→ 5d59358 / 2d6e79c / 605abf4 / 76c3789 / 5c09e6e
plan: docs/plans/2026-09-10-mac-closeout-dev-plan.md
result: PASS_WITH_DOCUMENTED_CONSTRAINTS
scope: OTA 契约对齐（R-1/R-2）· 无障碍 Gate（iOS Dynamic Type/命中区/审计 + macOS 键盘/对比度）· 一致性矩阵回填
```

## 1. OTA 契约对齐（R-1 / R-2）

- **决策**：方案 A——App 对齐冻结契约（`contracts/target/ota-package.schema.json` + `ota_server.cpp`）；
  决策文档 `docs/specs/06_review/OTA_CONTRACT_R1_R2_DECISION.md`。
- **共享层**：`core/apple/SmartHidCore/OtaContract.swift`——`OtaStatusClassifier`（JSON/文本统一子串匹配；
  固件 `failed`/`aborted` 帧旧实现漏检拖 30s 超时，R-2 修复）、`OtaStartPayload`（op/target/target_version/
  size/chunk_size/sha256 六键；无 manifest 不伪造枚举）、`OtaManifest`（契约六字段解析 + legacy `version` 兼容
  + sha256Hex）。共享核心测试 22/22（含 OtaContract 13 例）。
- **双端消费**：macOS OtaManager 重选包清旧 manifest 态；iOS start/commit 帧从 `action` 键对齐到 `op` 契约。
- **验证**：CoreUnit CU-56..66（80 断言全绿）；UIS-16 包校验冒烟在新解析下全 PASS；
  **UIS-18-OTA 对未烧录旧固件的 ESP32 真机跑：ready 超时如实 FAIL**（DEV-014 修复待烧录，Phase 7 解锁；
  不以此回退契约对齐——单测与 UIS-16 已证帧形状与解析正确）。

## 2. 无障碍 Gate（四轮 UI 审计点名的剩余缺口）

### iOS（N-IOS）

- **Dynamic Type 全量接入**：`ScaledFont`（UIFontMetrics.scaledFont 桥接，字体描述符携带 textStyle，
  默认档逐点相等——UI 审计基线不回归）；92 处 `.system(size:)` + 38 处不缩放语义
  （SwiftUI `.caption/.caption2/.footnote` 为固定字号）全量迁移；`ScaledFontTests` 5 例数学断言。
- **命中区 ≥44pt**：`nativeHitTarget()` 应用于筛选/重置/预设/eye 切换/P002 动作/设备卡动作/复制版本等
  12 组控件；eye 补 AX 标签；装饰性插画/节图标/品牌字 `accessibilityHidden`。
- **自动化审计**：`AccessibilityAuditUITests` 五套（P001 关键态 / P002 流态 / P003+P005 / P009+P010 结构审计
  + AX-XXXL 冒烟），iPhone 17 Pro Max 模拟器全绿；`testAuditIssueInventoryDiagnostic` 全量逐元素清单在案
  （`a11y-inventory-round2.log`，141 行）。
- **豁免三类（有据）**：
  1. `contrast`——正典调色板冻结值（见 §3 数值）；
  2. `dynamicType`/`textClipped`——正典固定布局容器（单行设备名/MAC、44pt 头像磁贴、31pt 刻度标签、
     紧凑按钮、系统弹窗、系统输入框占位）；缩放真实生效由 AX 冒烟 + ScaledFontTests 证明；
  3. "Label not human-readable"——Release Metadata 投影（F027）的版本/状态 chip 为正典数据值。

### macOS（N-MAC）

- 三处 `focusRingType .none → .exterior`（DSButton/MenuRowButton/TabButton）——键盘焦点环恢复
  （仅聚焦时显示，默认态像素不变）；`initialFirstResponder = 扫描 Tab`。
- 键盘遍历自动化（合成键盘事件）需要辅助功能权限，留待设备 Gate——人工口径：全部交互控件为
  NSButton 子类（默认进 keyViewLoop），焦点环已可见。

## 3. 正典 token WCAG 对比度（双端断言 · CU-67..73 / ContrastTests）

| 对 | 实测 | 判定 |
|---|---|---|
| text #18222E on card/bg | 16.07 / 15.48 | AA PASS |
| sub #42536A on card/bg | 7.84 / 7.56 | AA PASS |
| mut #60758D on card/bg | 4.74 / 4.57 | AA PASS |
| primary #1B6DFF ↔ white | 4.49 | 大字号/图形件 PASS；小号正文差 0.01 AA——正典约束在案 |
| danger #F2555F ↔ white | 3.37 | 大字号/图形件口径 |
| success #17C7A8 ↔ white | 2.15 | **正典硬约束**：仅状态语义/图标，禁正文——数值锁档防漂移 |
| warning #FF9F43 ↔ white | 2.04 | 同上 |

## 4. 一致性矩阵回填

§3 记分卡补 N-MAC/N-IOS 两列（29 行）：PASS 仅限自动化/真无线电实证；协议层 PASS 与 E2E BLOCKED 拆分；
真机未验 NOT_RUN；平台差异 N/A。§1 补 Apple 线硬一致项现值。详见矩阵 §5"2026-09-10 Mac 收尾轮"。

## 5. 验证汇总

| Gate | 结果 |
|---|---|
| 共享核心 swift test | 22/22（9 向量 + 13 OTA 契约） |
| macOS CoreUnit（--unit-core） | **80/80**（含 CU-56..66 契约 / CU-67..73 对比度） |
| macOS PageSmoke（--smoke-pages） | 18 PASS + 1 FAIL(UIS-18-OTA·旧固件未烧录) + 1 SKIP |
| iOS SwiftPM swift test | 18/18（宿主切片） |
| iOS Simulator 全套（Xcode） | 单测 20/20 + UI 11/11（无障碍五套含 AX 冒烟） |

证据文件：`core-unit.log` / `page-smoke.log` / `ios-suite-summary.txt` / `a11y-inventory-round2.log`。

## 6. 剩余开口（转后续 Gate）

1. **ESP32 烧录解锁**（用户 BOOT+RST 一次）：UIS-18-OTA 转正、F008/F009/F010 字节级、配网/OTA E2E、
   广播外部可见、n≥2 并行——Phase 7 范围。
2. 真机 VoiceOver 朗读顺序 / Switch Control / macOS 全键盘遍历自动化——设备/权限 Gate。
3. 摄像头扫码实景（带摄像头设备）。
4. clean-machine E6（正典未定义，待澄清后另行立项）。
5. 主线领先远端提交未推送（含本轮 6 笔）——等用户放行。
