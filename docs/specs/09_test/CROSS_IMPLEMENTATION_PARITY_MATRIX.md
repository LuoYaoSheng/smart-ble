# 多实现线一致性矩阵（CROSS_IMPLEMENTATION_PARITY_MATRIX）

- 状态：**记分卡已于 2026-09-07 依据 FEATURE_MAP/PRD §8 重建**（修复编号错位，见 §0）；每个 Gate 完成后回填
- 实现线：U-WX（微信小程序）/ U-AND（UniApp Android）/ F-AND/F-MAC（Flutter）/ N-MAC（AppKit）/ N-IOS（SwiftUI）/ K-AND（Kotlin Compose）
- 判定规则：同功能同验收 ID 同预期；差异必须能追溯到 `10_platform` / `08_development` 的规范来源，否则视为缺陷
- Windows 硬件基线：Flutter Android + ESP32 V1 零配对与 T2–T7/第二手机已完成；扫描 F001–F005 真机 PASS。详见 `WINDOWS_MOBILE_V1_MASTER_MATRIX.md` 与 `verification/windows-mobile-v1/20260905-1726-1b793ca/`。

## 0. 2026-09-07 编号错位修复记录（TEST_MATRIX_DEFECT）

旧记分卡存在 F 编号与 FEATURE_MAP/PRD §5 不一致的错位（分类 TEST_MATRIX_DEFECT），已按下表重建。**F 编号唯一事实源 = [FEATURE_MAP.md](../02_product/FEATURE_MAP.md) + [PRD.md](../02_product/PRD.md) §5；验收 R 编号事实源 = PRD §8（注意 R 与 F 不是一一对应，如 F016→R21、F018→R14、F026→R28）。**

已修复的错位示例（旧 → 新）：

| 旧行（错） | 错因 | 正确口径 |
|---|---|---|
| F002 节流合并 | 节流属于 F001 扫描会话 | F002 = 扫描权限前置 |
| F005 双入口 | 双入口是 F018 Profile 识别的入口结构 | F005 = 显示名智能解析 |
| F014–F016 合并"外围广播" | 三个独立功能 | F014 微信广播 / F015 App 广播 / F016 31 字节预算 |
| F017 通信日志 | 通信日志是 F011 | F017 = 观察侧证据匹配 |
| F018–F024 合并"Smart HID" | 七个功能且含已移除项 | 逐行拆开；F023 已移除不复刻 |
| F026 关于/日志脱敏 | "关于页"不是 F026 载体 | F026 = 日志脱敏（横切）；关于页 = P009 页面职责 |
| F028 零持久化 | 零持久化来自存储策略决策，非 F028 | F028 = 小程序推广跳转；零持久化见 §1 |
| 旧 §1 引用「31B 预算 F015 / 写队列 F010 / Notify F011 / 零持久化 F028」 | 编号漂移 | F016 / F009 / F010 / 存储策略 |

## 1. 不得因实现线不同而不同的行为（硬一致项）

| 项 | 规范来源 | 当前结论 |
|---|---|---|
| 扫描时长 5 秒 | F001 / R01 | 待 Gate M2 回填 |
| deviceId 去重 / 节流 1s / RSSI 排序 / 上限 100 | F001 / R01 | 待 Gate M2 回填 |
| 扫描权限前置（微信授权引导） | F002 / R02 | 待 Gate M2 回填 |
| 显示名「未命名 BLE · ID后四位」多级 fallback | F005 / R05 | 待 Gate M2 回填（F-AND 现状「未知设备」已知偏差） |
| 连接超时 10 秒 | DEC-013 / F006 | 待 Gate M3 回填（F-AND 现状 30s 已知偏差） |
| 8 态连接状态机 | F006 / STATE_MODEL | 待 Gate M3 回填 |
| 重连 3 次 / backoff 1s·3s·5s | F012 / R12 | 待 Gate M3 回填（F-AND 现状 2/4/6s 已知偏差） |
| 写队列：同设备串行、跨设备并行、深度 16、单写 5s | F009 | 待 Gate M3 回填 |
| Notify 三元组隔离 / 防抖去重 | F010 / R10 | 待 Gate M3 回填 |
| 通信日志六色/清空/导出 | F011 / R11 | 待 Gate M3 回填 |
| Profile 识别 STRONG/WEAK 与双入口 | F018 / R14 | 待 Gate M5 回填 |
| 配网错误恢复 8 类唯一动作 | F022 / R18 / PROVISIONING_V1 | 待 Gate M5 回填 |
| 31B 广播预算与超限阻止 | F016 / R21 | 待 Gate M6 回填 |
| 日志脱敏口径 | F026 / R28 | 待 Gate M7 回填 |
| 零本地持久化（冷启动为空） | 08_development/STORAGE_POLICY + PRD 变更记录 2026-09-02/03 | 待 Gate M1 回填 |
| OTA = BLOCKED P-03 口径 | F025 / R25 / P-03 | 待 Gate M8 回填 |

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

## 3. 功能×实现线记分卡（2026-09-07 重建；每 Gate 更新）

> F 编号/名称逐字对齐 FEATURE_MAP §1；验收 R 编号对齐 PRD §8。F017/F029 在 PRD §8 无专属 R 条目，如实标注。页面映射依据 FEATURE_MAP §3。

| 功能 | 名称（FEATURE_MAP 口径） | 验收（PRD §8） | 页面 | U-WX | U-AND | F-AND | 实际差异 | 合理 | 证据 |
|---|---|---|---|---|---|---|---|---|---|
| F001 | BLE 扫描（5s 会话/节流合并/自动停） | R01 | P001 | — | — | — | — | — | — |
| F002 | 扫描权限前置（微信授权引导） | R02 | P001 | — | — | — | — | — | — |
| F003 | 扫描筛选（RSSI/前缀/隐藏无名） | R03 | P001 | — | — | — | — | — | — |
| F004 | 广播数据查看（原始数据弹窗/复制） | R04 | P001 | — | — | — | — | — | — |
| F005 | 显示名智能解析（多级 fallback） | R05 | P001 | — | — | — | — | — | — |
| F006 | GATT 连接（8 态/发现/MTU） | R06 | P006 | — | — | — | — | — | — |
| F007 | 服务树浏览（折叠/UUID 中文名） | R07 | P006 | — | — | — | — | — | — |
| F008 | 特征读取（HEX+TEXT，3s 超时） | R08 | P006 | — | — | — | — | — | — |
| F009 | 特征写入（TEXT/HEX，写队列串行） | R09 | P006 | — | — | — | — | — | — |
| F010 | Notify 监听（防抖去重） | R10 | P006 | — | — | — | — | — | — |
| F011 | 通信日志（六色/清空/导出） | R11 | P006 | — | — | — | — | — | — |
| F012 | 断线自动重连（3 次 backoff） | R12 | P006/P007 | — | — | — | — | — | — |
| F013 | 多设备会话管理（批量断开） | R13 | P007 | — | — | — | — | — | — |
| F014 | 微信外围广播 | R22 + R24 | P008 | — | — | — | — | — | — |
| F015 | App 外围广播（LysBlePeripheral） | R23 + R24 | P008 | — | — | — | — | — | — |
| F016 | 31 字节负载预算（不静默截断） | R21 | P008 | — | — | — | — | — | — |
| F017 | 观察侧证据匹配（服务层就绪） | 无专属 R（PRD §8 未覆盖，服务层验收） | 无页面消费 | — | — | — | — | — | — |
| F018 | Profile 设备识别（UUID STRONG/前缀 WEAK） | R14 | P001 | — | — | — | — | — | — |
| F019 | Smart HID 配网向导（三阶段/断线续填/离开确认） | R15 | P002 | — | — | — | — | — | — |
| F020 | ControlHub 配对码扫码（shid://pair） | R16 | P002 | — | — | — | — | — | — |
| F021 | 分帧明文写入 + 状态机跟踪（60s） | R17 | P002 | — | — | — | — | — | — |
| F022 | 配网错误恢复（8 错误码→动作） | R18 | P002 | — | — | — | — | — | — |
| F023 | ~~设备历史~~【已移除 2026-09-02，不得复刻】 | R19（已作废） | ~~P004~~ | 不适用 | 不适用 | 不适用 | 见 §4.2 登记项 UNIAPP-G1-001 | — | — |
| F024 | Smart HID 诊断（五项链路） | R20 | P005 | — | — | — | — | — | — |
| F025 | OTA 固件升级（端到端 BLOCKED） | R25 | P006 子流程 | — | — | — | — | — | — |
| F026 | 日志脱敏（敏感键→***） | R28 | 横切（P006 日志等） | — | — | — | — | — | — |
| F027 | 版本元数据展示（Release Metadata 投影） | R26 | P009/P010 | — | — | — | — | — | — |
| F028 | 小程序推广跳转 | R27 | P009 | — | — | — | — | — | — |
| F029 | 分享（微信/APP/H5 分支） | 无专属 R（PAGE_SPEC §0.3 分享约定验收） | P009 + 全局 | — | — | — | — | — | — |
| F030 | 国际化【不做，UI 全中文硬编码】 | R30（现状确认） | 全局 | — | — | — | — | — | — |
| （附）平台降级（Web/H5 明确不支持） | R29（非 F 编号项） | R29 | 全局 | — | — | — | — | — | — |

记分值：`PASS / FAIL / BLOCKED(+原因) / NOT_RUN`；各线在对应 Gate 完成前为 NOT_RUN 属预期（页面/功能尚未对齐），不得记 PASS。**禁止把 F014–F016、F018–F024 再合并记分。**

## 4. 已登记的跨线偏差

### 4.1 Flutter 侧（来自 FLUTTER_PRODUCT_GAP_AUDIT，历史登记）

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

### 4.2 2026-09-07 Multi-end Parity Gate 新登记（详见 `../06_review/MULTI_END_PARITY_AUDIT.md`）

| 编号 | 实现线 | 偏差 | 分类 | 严重度 | 处置 Gate |
|---|---|---|---|---|---|
| UNIAPP-G1-001 | U-WX/U-AND | P004 路由/首页「已配置 Smart HID」面板/known_devices 本地持久化残留（违反 2026-09-02 移除决策与零持久化） | UNIAPP_IMPLEMENTATION_DRIFT | P1 | **PARITY-G1 已修（2026-09-07）**：路由删/面板删/Store 转纯内存/TTL 删/服务层路由删/history.vue 删/测试重写；build:mp-weixin 产物 0 引用 |
| FLUTTER-G1-001 | F-AND | Tab2「连接」≠「已连接」 | FLUTTER_IMPLEMENTATION_DRIFT | P2 | **PARITY-G1 已修**（widget test 断言） |
| FLUTTER-G1-002 | F-AND | PageView 横滑主 Tab 为规范外导航（PAGE_SPEC §0.1 仅 switchTab/点击） | FLUTTER_IMPLEMENTATION_DRIFT | P1 | **PARITY-G1 已修**（NeverScrollableScrollPhysics + 拖动测试） |
| FLUTTER-G1-003 | F-AND | P003/P005 由 Modal sheet 冒充、P010 缺失（9 页集合不完整，无独立路由） | FLUTTER_IMPLEMENTATION_DRIFT | P1 | **PARITY-G1 已修**：三页补独立页面+入口+pushReplacement/栈感知；逐页四维对齐留 PARITY-G2+ |
| FLUTTER-G1-004 | F-AND | MaterialApp i18n 基建（en/zh）与 F030「不做」相悖 | FLUTTER_IMPLEMENTATION_DRIFT | P2 | FEAT-F-007 登记，M1/M7 收缩（G1 不扩边界） |
| MATRIX-G1-001 | 测试矩阵 | 旧记分卡 F 编号错位（见 §0） | TEST_MATRIX_DEFECT | P1 | 已于 2026-09-07 修复 |

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

> 2026-09-07 更正：U-WX/U-AND 行曾记 P003/P005 `✅`——P004 路由与首页历史面板残留曝光后（§4.2 UNIAPP-G1-001），该行按页面存在性维持 `✅`，但页面集合合规性（9 页、无 P004、零持久化）在 PARITY-G1 修复前为 FAIL 口径，修复后以 PARITY-G1 回填为准。

构建基线（2026-09-05）：N-IOS 已完成真机 arm64 签名构建/安装及模拟器 build/install/launch；K-AND 已在 JBR 21 下完成 `assembleDebug + testDebugUnitTest`。这些只证明现有页面可执行，不改变上表功能缺失判定。

### 2026-09-06 用户决策：所有实现线必须按原型补齐

- N-IOS、K-AND 的 P002/P003/P005/P010 从"差距记录"升级为**必须完成的开发范围**，不是可选平台裁剪。
- Flutter 的 P003/P005/P010 `△` 必须收敛为独立可达且行为完整的页面，除非正典先通过正式决策改变页面结构。
- N-MAC 与 uni-app 当前覆盖完整，后续共享内核调整必须保持页面与功能不回退。
- 实施计划：`docs/plans/2026-09-06-native-platform-prototype-parity.md`。

### 2026-09-07 Multi-end Parity Gate 启动

- 三线（U-WX / U-AND / F-AND）统一按 `prototype/v1-new` + `prototype/platform/{wechat,app}` 验收；禁止互相抄实现。
- 页面/组件/状态/视觉四张专项矩阵见 `MULTI_END_PAGE_PARITY_MATRIX.md` / `MULTI_END_COMPONENT_PARITY_MATRIX.md` / `MULTI_END_STATE_PARITY_MATRIX.md` / `MULTI_END_VISUAL_PARITY_MATRIX.md`（初始 NOT_AUDITED，不预填 PASS）。
- 总审计报告：`../06_review/MULTI_END_PARITY_AUDIT.md`。
