# 多实现线一致性矩阵（CROSS_IMPLEMENTATION_PARITY_MATRIX）

- 状态：执行中（2026-09-06 用户确认所有原生/跨平台实现均按原型稿开发）；每个 Gate 完成后回填
- 实现线：U-WX（微信小程序）/ U-AND（UniApp Android）/ F-AND/F-MAC（Flutter）/ N-MAC（AppKit）/ N-IOS（SwiftUI）/ K-AND（Kotlin Compose）
- 判定规则：同功能同验收 ID 同预期；差异必须能追溯到 `10_platform` / `08_development` 的规范来源，否则视为缺陷
- Windows 硬件基线：Flutter Android + ESP32 V1 零配对与 T2–T7/第二手机已完成；扫描 F001–F005 真机 PASS。详见 `WINDOWS_MOBILE_V1_MASTER_MATRIX.md` 与 `verification/windows-mobile-v1/20260905-1726-1b793ca/`。

## 1. 不得因实现线不同而不同的行为（硬一致项）

| 项 | 规范来源 | 当前结论 |
|---|---|---|
| 扫描时长 5 秒 | 产品规范 F001 | 待 Gate M2 回填 |
| deviceId 去重 / 节流 1s / RSSI 排序 / 上限 100 | F001–F002 | 待 Gate M2 回填 |
| 显示名「未命名 BLE · ID后四位」 | R05 | 待 Gate M2 回填（F-AND 现状「未知设备」已知偏差） |
| 连接超时 10 秒 | DEC-013 | 待 Gate M3 回填（F-AND 现状 30s 已知偏差） |
| 8 态连接状态机 | 状态模型 | 待 Gate M3 回填 |
| 重连 3 次 / backoff 1s·3s·5s | F012 | 待 Gate M3 回填（F-AND 现状 2/4/6s 已知偏差） |
| 写队列：同设备串行、跨设备并行、深度 16、单写 5s | F010 | 待 Gate M3 回填 |
| Notify 三元组隔离 | F011 | 待 Gate M3 回填 |
| Profile 双入口（连接 / 配置 Smart HID） | F018 | 待 Gate M5 回填 |
| 配网错误恢复 8 类唯一动作 | PROVISIONING_V1 | 待 Gate M5 回填 |
| 31B 广播预算与超限阻止 | F015 | 待 Gate M6 回填 |
| 日志脱敏口径 | F026 | 待 Gate M7 回填 |
| 零本地持久化（冷启动为空） | F028/存储策略 | 待 Gate M1 回填 |
| OTA = BLOCKED P-03 口径 | F025/P-03 | 待 Gate M8 回填 |

## 2. 允许的平台差异（须注明规范来源）

| 差异 | 规范来源 | 说明 |
|---|---|---|
| 权限弹窗形态与时机 | 10_platform/PERMISSION | 系统弹窗 UI 不同、申请链等价 |
| 分享方式 | 10_platform | U-WX 微信卡片；App 线系统分享 |
| 外链方式 | 10_platform | U-WX 受限；App 线系统浏览器 |
| 广播插件/API | 10_platform | wx.createBLEPeripheralServer / LysBlePeripheral / flutter_ble_peripheral |
| 微信开发者工具限制 | 10_platform | 工具内 unsupported 属预期（C1 supported_limited） |
| Android 系统设置入口 | 10_platform | 永久拒绝引导路径 |
| 控件原生外观轻微差异 | 07_design_system | 信息层级/文案/间距/颜色语义仍须对齐 |

## 3. 功能×实现线记分卡（每 Gate 更新）

| 功能 | 验收 | 页面 | U-WX | U-AND | F-AND | 实际差异 | 合理 | 证据 |
|---|---|---|---|---|---|---|---|---|
| F001 扫描会话 | R01 | P001 | — | — | — | — | — | — |
| F002 节流合并 | R01 | P001 | — | — | — | — | — | — |
| F003 筛选 | R02 | P001 | — | — | — | — | — | — |
| F004 广播详情 | R03 | P001 | — | — | — | — | — | — |
| F005 双入口 | R04 | P001 | — | — | — | — | — | — |
| F006 连接 | R05 | P006 | — | — | — | — | — | — |
| F007 服务发现 | R06 | P006 | — | — | — | — | — | — |
| F008 Read | R07 | P006 | — | — | — | — | — | — |
| F009 Write | R08 | P006 | — | — | — | — | — | — |
| F010 写队列 | R08 | P006 | — | — | — | — | — | — |
| F011 Notify | R09 | P006 | — | — | — | — | — | — |
| F012 断开重连 | R10 | P006/P007 | — | — | — | — | — | — |
| F013 多设备 | R11 | P007 | — | — | — | — | — | — |
| F014–F016 外围广播 | R12 | P008 | — | — | — | — | — | — |
| F017 通信日志 | R13 | P006 | — | — | — | — | — | — |
| F018–F024 Smart HID | R14–R20 | P002/P003/P005 | — | — | — | — | — | — |
| F025 OTA（BLOCKED） | R21 | P006 | — | — | — | — | — | — |
| F026 关于/日志脱敏 | R22 | P009 | — | — | — | — | — | — |
| F027 版本记录 | R23 | P010 | — | — | — | — | — | — |
| F028 零持久化 | R24 | 全局 | — | — | — | — | — | — |
| F029 推广承接 | R25 | P009 | — | — | — | — | — | — |
| F030 不做国际化 | R26 | 全局 | — | — | — | — | — | — |

记分值：`PASS / FAIL / BLOCKED(+原因) / NOT_RUN`；F-AND 在 Gate M1 前大量为 NOT_RUN 属预期（页面/功能尚未对齐），不得记 PASS。

## 4. 已登记的跨线偏差（Flutter 侧，来自 FLUTTER_PRODUCT_GAP_AUDIT）

- FEAT-F-001 README 平台宣称与 Runner 事实不符（M7 修）
- FEAT-F-002 Tab2 文案「连接」≠「已连接」（M1 修）
- FEAT-F-003 「未知设备」≠「未命名 BLE · ID后四位」（M2 修）
- FEAT-F-004 connect 30s ≠ 10s（M3 修）
- FEAT-F-005 backoff 2/4/6s ≠ 1/3/5s（M3 修）
- FEAT-F-006 PageView 横滑为规范外导航（M1 修）
- FEAT-F-007 i18n 产品化违背 F030（M1/M7 收缩）
- FEAT-F-008 shared_preferences 死依赖违背零持久化（M1 删）
- FEAT-F-009 BleManager Stream + Riverpod 双状态源（M4 重构）
- FEAT-F-010 Widget 直连 flutter_blue_plus（M3/M4 隔离）
- FEAT-F-011 写队列缺深度 16 / 单写 5s / 跨设备并行（M3 补）
- FEAT-F-012 OTA 现实现与 BLOCKED P-03 口径冲突（M8 改造）

## 5. 全平台/语言页面覆盖审计（2026-09-05 · macOS 合并后）

> 用户约束：开源项目应尽量让功能、页面、文案和协议在不同语言/平台间对齐。
> `✅` 表示存在对应可执行页面，`△` 表示能力被合并进其他页面或缺专属恢复流，`✕` 表示当前缺失；编译通过不等于真机验收。

| 实现线 | 语言/框架 | P001 扫描 | P002 配网 | P003 HID详情 | P005 诊断 | P006 GATT | P007 已连接 | P008 广播 | P009 关于 | P010 版本 | V1 零SMP |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| U-WX / U-AND | JavaScript + Vue/uni-app | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅（本轮 fail-fast 测试） |
| F-AND / F-MAC | Dart + Flutter | ✅ | ✅ | △ | △ | ✅ | ✅ | ✅ | ✅ | △ | ✅（59 tests） |
| N-MAC | Swift + AppKit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅（62 assertions + 17 page smoke） |
| N-IOS | Swift + SwiftUI | ✅ | ✕ | ✕ | ✕ | ✅ | ✅ | ✅ | ✅ | ✕ | 不适用（尚无 P002） |
| K-AND | Kotlin + Compose | ✅ | ✕ | ✕ | ✕ | ✅ | ✅ | ✅ | ✅ | ✕ | 不适用（尚无 P002） |

当前最大对齐缺口不是样式，而是原生 iOS/Kotlin Android 缺 P002/P003/P005/P010 与 Smart HID Profile 路由。后续实现必须复用同一 UUID、framed-v1、8 错误码、60 秒状态跟踪和 V1 明文直连语义，不得用静态页面冒充能力完成。

构建基线（2026-09-05）：N-IOS 已完成真机 arm64 签名构建/安装及模拟器 build/install/launch；K-AND 已在 JBR 21 下完成 `assembleDebug + testDebugUnitTest`。这些只证明现有页面可执行，不改变上表功能缺失判定。

### 2026-09-06 用户决策：所有实现线必须按原型补齐

- N-IOS、K-AND 的 P002/P003/P005/P010 从“差距记录”升级为**必须完成的开发范围**，不是可选平台裁剪。
- Flutter 的 P003/P005/P010 `△` 必须收敛为独立可达且行为完整的页面，除非正典先通过正式决策改变页面结构。
- N-MAC 与 uni-app 当前覆盖完整，后续共享内核调整必须保持页面与功能不回退。
- 实施计划：`docs/plans/2026-09-06-native-platform-prototype-parity.md`。
