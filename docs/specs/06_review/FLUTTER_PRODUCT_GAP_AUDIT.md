# Flutter 产品差距审计（FLUTTER_PRODUCT_GAP_AUDIT）

- 状态：初版（Phase B 首轮，2026-09-04，基线 commit `dbb38a8`，分支 `refactor/uniapp-v1`）
- 审计对象：`apps/flutter`（F-AND = Flutter Android 并行正式实现线）
- 事实源：`docs/specs`（BLE Toolkit+ v1 产品基准）+ `docs/specs/prototype/v1-new` + `prototype/platform/app`
- 结论级定义：`CONFIRMED`（代码证据）/ `PARTIAL`（部分证据）/ `ABSENT`（未实现）/ `N_A`

## 1. 页面差距（§6.1）

| 产品页 | Flutter 当前映射 | 状态 | 处理 |
|---|---|---|---|
| P001 扫描 | `lib/ui/pages/device_list_page.dart` | CONFIRMED 存在 | 重构对齐 |
| P002 Smart HID 配网 | — | ABSENT | 新增 |
| P003 Smart HID 详情 | — | ABSENT | 新增 |
| P004 历史 | — | ABSENT（正确，禁止恢复） | 不得新增 |
| P005 Smart HID 诊断 | — | ABSENT | 新增 |
| P006 GATT 详情 | `lib/ui/pages/device_detail_page.dart` | CONFIRMED 存在 | 重构对齐 |
| P007 已连接 | `lib/ui/pages/connected_devices_page.dart` | CONFIRMED 存在 | 重构对齐 |
| P008 广播 | `lib/ui/pages/broadcast_page.dart` | CONFIRMED 存在 | 重构对齐 |
| P009 关于 | `lib/ui/pages/about_page.dart` | CONFIRMED 存在 | 重构对齐 |
| P010 版本记录 | — | ABSENT | 新增 |

页面文件总数仅 5 个，与规格 9 页面差 4 页（P002/P003/P005/P010）。

## 2. 二十项实现偏差逐项核验（§6.2）

| # | 偏差项 | 状态 | 代码证据 | 规范口径 |
|---|---|---|---|---|
| 1 | README 宣称 Android/iOS/Windows/macOS/Linux 支持，Runner 不齐 | CONFIRMED | `README.md`「支持平台: Android、iOS、Windows、macOS、Linux」；实际仅 `android/`、`macos/` 目录存在（windows/ios/linux/web 均无） | 按真实目录登记：Android=目标，macOS=BLOCKED_HOST，其余 NOT_CONFIGURED；README 待 Windows 基线审计后修正 |
| 2 | README「跨平台移动主线」表述 | CONFIRMED | 同上「它既是面向用户的正式跨平台移动入口」 | 本轮定位为 F-AND 并行正式实现线（Android） |
| 3 | 第二 Tab 文案「连接」 | CONFIRMED | `lib/main.dart:101` `label: '连接'` | 应为「已连接」（P007） |
| 4 | PageView 横向滑动 | CONFIRMED | `lib/main.dart:70` `PageView(controller:…)` 默认可横滑切页 | PAGE_FLOW 无横向滑动导航；应 `physics: NeverScrollableScrollPhysics()` 或移除 PageView |
| 5 | 自定义 i18n 构成产品功能 | CONFIRMED | `lib/main.dart:28-33` localizationsDelegates + supportedLocales；`lib/l10n/app_*.arb`（zh/en）；产品文案混入 arb（如 `device_unknown`） | F030 不做国际化；Framework delegate 可留（控件本地化），产品文案中文基准；arb 未使用项按 dead code 处理 |
| 6 | `shared_preferences` 依赖未使用 | CONFIRMED | `pubspec.yaml:30` 声明 `shared_preferences: ^2.2.2`；`lib/` 全目录 rg 无 import | 零本地持久化：删除该依赖 + `flutter pub get` 更新 lock |
| 7 | 无名设备显示「未知设备」 | CONFIRMED | `lib/core/models/ble_device.dart:43` `'未知设备 ($id)'`；`ble_scan_result.dart:31` `'未知设备'` | R05：应显示「未命名 BLE · ID 后四位」 |
| 8 | connect 默认 30 秒 | CONFIRMED | `lib/core/ble/ble_manager.dart:266` `Duration timeout = const Duration(seconds: 30)` | 产品连接超时 10 秒（DEC-013） |
| 9 | 重连 2s/4s/6s | CONFIRMED | `ble_manager.dart:306` `Duration(seconds: nextAttempt * 2)` 注释「指数退避: 2s, 4s, 6s」；`_maxReconnectAttempts = 3` | 重连 3 次正确，backoff 应为 1s/3s/5s |
| 10 | BleManager singleton + Stream 与 Riverpod 双状态源 | CONFIRMED | `ble_manager.dart:33-35` `_instance`/`factory`；`84/87/92` 三条广播 Stream；页面又以 Riverpod Provider 消费 | 架构要求：Session Registry 唯一事实源 + Riverpod 投影 |
| 11 | Widget 直接依赖 flutter_blue_plus | CONFIRMED | `lib/ui/pages/connected_devices_page.dart`、`device_detail_page.dart` 直接 import | Widget 不得直接调用 BLE 插件（平台适配层隔离） |
| 12 | 多设备 Session 真实隔离 | PARTIAL | `ble_manager.dart` 按 deviceId 维护 `_reconnectAttempts/_reconnectTimers` Map，存在多连接路径；但无 Session Registry 抽象，UI 层直连插件时绕过 | 需 Gate M4 重构验证 |
| 13 | 写队列深度 16 / 单写 5s 超时 / 同设备串行跨设备并行 | ABSENT（深度与超时）| `command_queue.dart` 为 FIFO+interval+循环队列：无深度上限（16）、无单写 5 秒超时、无按设备并行分组 | Gate M3 实现 |
| 14 | Notify 按 device/service/characteristic 三元组隔离 | PARTIAL | `ble_manager.dart:492` `listenCharacteristicValue` 单入口，订阅经 flutter_blue_plus 流转发；未验证三元组隔离语义 | Gate M3 验证 |
| 15 | Flutter Peripheral 能否真机真实广播 | PARTIAL（代码存在，未真机验证）| `lib/core/ble/ble_peripheral_manager.dart` 基于 flutter_ble_peripheral | Gate M6 真机验证（BLUETOOTH_ADVERTISE 权限、31B 预算、observer 客观确认） |
| 16 | Smart HID Profile/配网/诊断 | ABSENT | rg 全 lib/ 无 Smart HID 实现页/服务（仅 uuids/arb 偶然子串） | Gate M5 新增；无真实固件时 E1–E4 可做，E5 BLOCKED_HARDWARE |
| 17 | 关于/版本/推广/分享符合 App 平台原型 | PARTIAL | `about_page.dart` 存在；无版本记录（P010）入口 | Gate M7 对齐 App 平台行为（系统浏览器/系统分享/落地页承接） |
| 18 | OTA 错误宣称可用 | CONFIRMED（存在完整 OTA 实现与 UI） | `lib/core/ble/ota_manager.dart`（chunk 180B/20ms 延迟状态机）+ `lib/ui/widgets/ota_dialog.dart` + `device_detail_page` 入口 | F025 = BLOCKED P-03：文件选择/manifest/SemVer/SHA256 校验等前置步骤可实现，端到端 OTA 不得宣称已验证；现实现需审计改造成「第 0 步+10 步」规范形态 |
| 19 | 存在持久化设备/日志/用户状态 | ABSENT（未发现） | rg `shared_preferences|SharedPreferences` lib/ 无命中；未发现文件/DB 持久化路径 | 保持零持久化；冷启动为空测试在 Gate M1 补 |
| 20 | 页面状态覆盖 loading/empty/error/permission/unsupported/disconnected | PARTIAL | `device_list_page.dart` 有 error/permission 路径（permission_handler、蓝牙不可用横幅）；P006/P007/P008 状态覆盖不全；P002/P003/P005/P010 无页面 | 各 Gate 逐页补齐 |

补充核验（非 §6.2 清单但属规范差异）：

- 扫描会话超时：`ble_manager.dart:215` `Duration(seconds: 5)` —— 与 5 秒口径一致（保留）；
- 扫描节流 1s 合并 / deviceId 去重 / RSSI 排序 / 上限 100：未见明确实现，Gate M2 核验；
- `apps/flutter/android/local.properties` 未被 Git 跟踪（`git ls-files` 为空）且已被 `android/.gitignore` 忽略 —— 任务书 §4.2 的 macOS 路径残留问题在本机已随 Windows 重新生成消解，仓库无需变更。

## 3. Windows 修改前基线（2026-09-04 实测）

| 命令 | 结果 |
|---|---|
| `flutter pub get` | PASS（1 discontinued、64 outdated 提示，非阻塞） |
| `dart format --output=none --set-exit-if-changed lib test` | FAIL（32 文件中 20 个与 format 规范有偏差；未写回） |
| `flutter analyze` | PASS（No issues found! 11.5s） |
| `flutter test` | PASS（11 项全过；宿主侧 `flutter_blue_plus unsupported` 打印属预期，测试用 mock） |
| `flutter build apk --debug` | 见 `verification/windows-mobile-v1/20260904-win-b1/flutter-build-apk.txt` |
| `flutter devices` | 4 设备（SM-G9910 真机 android-arm64 / windows / chrome / edge） |
| 真机 `flutter run` | 首轮基线按任务书仅记录构建层；交互式真机会话留待 Gate 验证 |

## 4. 对 Gate 开发的直接输入

1. **M1**：Tab2 文案、PageView 禁滑、9 页面路由骨架（新增 4 页）、App 平台 Token、arb dead-code 处理、`shared_preferences` 移除。
2. **M2**：显示名 fallback 改「未命名 BLE · ID后四位」、节流/去重/排序/上限/筛选核验补齐。
3. **M3**：connect 10s、backoff 1/3/5s、写队列（深度 16、单写 5s、同设备串行跨设备并行）、Notify 三元组隔离、旧运行回调失效。
4. **M4**：Session Registry 抽象，替代 BleManager Stream + Riverpod 双源。
5. **M5**：Smart HID Profile/配网/详情/诊断全新增（协议镜像复用 `core/protocols/hid-provisioning-protocol.ts` 的语义，Dart 侧等价实现）。
6. **M6**：Peripheral 真机广播验证（权限/31B/observer）。
7. **M7**：README 修正、P010 版本记录、App 平台分享/外链行为。
8. **M8**：OTA 改 BLOCKED 形态（第 0 步+10 步），现有 ota_manager 审计改造。

## 5. 本审计不修改任何 Flutter 产品代码

按任务书 §26，Windows 首轮只登记事实，不开始大规模重构。
