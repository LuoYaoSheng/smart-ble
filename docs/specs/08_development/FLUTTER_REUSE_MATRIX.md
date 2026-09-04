# Flutter 复用矩阵（FLUTTER_REUSE_MATRIX）

- 状态：初版（Phase B 首轮，2026-09-04，基线 commit `dbb38a8`）
- 用途：Gate M1–M8 改造时判定 `apps/flutter` 现有代码的 复用 / 重构 / 删除 / 新增。
- 判定原则：产品语义以 specs 为准；Flutter 侧技术形态可用 Dart/Flutter 惯用方式，但行为不得偏离产品。

## 1. 模块级判定

| 现有模块 | 位置 | 判定 | 说明 |
|---|---|---|---|
| 扫描页 | `lib/ui/pages/device_list_page.dart` | 重构对齐 | 骨架保留；显示名 fallback、筛选、空态、Profile 入口按 P001 规范改 |
| GATT 详情页 | `lib/ui/pages/device_detail_page.dart` | 重构对齐 | 移除 flutter_blue_plus 直接依赖；状态机/写队列/Notify 接 M3 语义 |
| 已连接页 | `lib/ui/pages/connected_devices_page.dart` | 重构对齐 | Tab 文案、Session 投影、Smart HID 路由到 P003（M5） |
| 广播页 | `lib/ui/pages/broadcast_page.dart` | 重构对齐 | 31B 预算校验、生命周期清理（M6） |
| 关于页 | `lib/ui/pages/about_page.dart` | 重构对齐 | App 平台行为：系统浏览器/分享/落地页；补 P010 入口（M7） |
| Smart HID（页/服务/Profile） | — | 新增 | P002/P003/P005 + Profile 注册表 + 配网状态机（M5） |
| 版本记录 | — | 新增 | P010（M7） |
| BleManager singleton | `lib/core/ble/ble_manager.dart` | 重构（降级为 Platform Adapter 候选） | 剥离状态所有权：状态移交 Session Registry + Riverpod；Stream 广播改为 adapter 事件源；connect 30s→10s、backoff 2/4/6→1/3/5 |
| CommandQueue | `lib/core/ble/command_queue.dart` | 重构 | 补深度 16、单写 5s 超时、同设备串行/跨设备并行、重连取消 |
| BlePeripheralManager | `lib/core/ble/ble_peripheral_manager.dart` | 复用+验证 | flutter_ble_peripheral 适配保留；M6 真机验证权限/31B/清理 |
| OtaManager + ota_dialog | `lib/core/ble/ota_manager.dart`、`lib/ui/widgets/ota_dialog.dart` | 重构（BLOCKED 形态） | 按 F025「第 0 步+10 步」重排；不得宣称端到端已验证（M8） |
| 数据模型 | `lib/core/models/*.dart` | 复用+修订 | displayName 改「未命名 BLE · ID后四位」；字段语义对齐 DATA_MODEL |
| 设计系统 | `lib/ui/theme`、AppTheme | 重构对齐 | Token 映射 prototype/platform/app |
| 公共组件（service_tile、write_dialog、log_panel 等） | `lib/ui/widgets/` | 复用+修订 | 文案/层级/状态对齐 App 原型；log_panel 脱敏口径核验 |
| i18n（arb + AppLocalizations） | `lib/l10n/` | 收缩 | F030：不提供语言切换、不宣称双语；Framework 控件 delegate 可留；产品文案未引用的 arb 条目按 dead code 清理 |
| shared_preferences 依赖 | `pubspec.yaml:30` | 删除 | 零持久化；`flutter pub get` 更新 lock |
| PageView 导航 | `lib/main.dart:70` | 修改 | 禁横滑（NeverScrollableScrollPhysics）或移除，只保留 Tab 导航 |
| 测试 | `test/`（11 项） | 复用+扩展 | 现测试保留；按 20 文件 format 偏差先统一 `dart format`；每 Gate 补失败测试先行 |
| `local.properties` | `apps/flutter/android/`（未跟踪） | 不动 | 已忽略、本机为 Windows 路径 |

## 2. 跨实现线共享资产（Flutter 侧等价实现的义务）

| 共享资产 | 位置 | Flutter 侧处理 |
|---|---|---|
| Smart HID 配网正典 | Smart-HID-Workspace `protocols/ble/PROVISIONING_V1.md` | Dart 等价实现，语义与 U-WX/U-AND 一致（UUID STRONG、framed-v1、token 仅内存、8 类错误恢复） |
| 协议镜像 | `core/protocols/hid-provisioning-protocol.ts` | 不直接 import（跨语言）；以契约锁（`smart-hid-contract.lock.json`）值对齐 Dart 常量 |
| MQTT 公开定义 | `core/protocols/hid-command-schema.ts` | 同上，Dart 常量镜像 |
| Profile 扩展原则 | `docs/specs/08_development/DEVICE_PROFILE_RULE.md` | Flutter 侧 Profile 注册表同规则（UUID STRONG / 名称 WEAK） |
| 错误语义 | `docs/specs/08_development/ERROR_CODE.md` | 状态码/恢复动作与 U 线同语义 |
| 平台差异 | `docs/specs/10_platform/PLATFORM_EXTENSION.md` | F-AND 差异仅限：权限弹窗、系统分享/浏览器、广播插件 API |

## 3. 明确不迁移/不保留项

- 「未知设备」显示文案（R05 冲突）；
- 2s/4s/6s 退避常量与 30s 连接超时；
- Widget 直连 flutter_blue_plus 的调用路径；
- 产品文案的中英双语入口（F030）；
- P004 历史任何形态（已删除，禁止恢复）。
