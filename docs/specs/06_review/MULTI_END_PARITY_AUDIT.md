# MULTI_END_PARITY_AUDIT —— 多端一致性审计报告（第一轮）

> 日期：2026-09-07 · 执行分支 refactor/uniapp-v1 · Multi-end Parity Gate 第一轮
> 审计对象：U-WX（apps/uniapp→微信小程序）/ U-AND（apps/uniapp→Android App）/ F-AND（apps/flutter→Android App）
> 事实源优先级：产品规范（02_product）> 页面流程（03_flow）> 开发契约（08_development）> 公共原型（prototype/v1-new）> 平台原型（prototype/platform）> 当前实现
> 本轮性质：**静态审计 + 壳层修复（PARITY-G1）**。运行行为/视觉逐页验收为后续 Gate 范围，凡未运行验证的一律标 UNPROVEN，不写 PASS。

---

## 1. 总体结论

| # | 判断项 | 结论 | 依据 |
|---|---|---|---|
| 1 | 产品规范是否一致（9 页/4 Tab/编号） | **一致** | PRD §4.3/§6、PAGE_SPEC §0.1、PAGE_FLOW §1、FEATURE_MAP §1/§3 对 P004 移除与 9 页口径贯穿一致；未发现 SPEC_CONFLICT |
| 2 | 公共原型是否一致（v1-new） | **页面集一致**；逐页深审 UNPROVEN | v1-new/pages 恰 9 页；app.js 将 P004 渲染为「已移除 ✕」不可点击占位 |
| 3 | 微信平台原型是否一致 | **页面集一致**；逐页深审 UNPROVEN | platform/wechat/high-fi/pages 恰 9 页（无 p004） |
| 4 | App 平台原型是否一致 | **页面集一致**；逐页深审 UNPROVEN | platform/app/high-fi/pages 恰 9 页；app/PAGE_SPEC.md 自述「页面集与基准完全一致（9 页）」 |
| 5 | UniApp 微信（U-WX）是否一致 | **不一致**：P004 整链残留（路由+首页面板+本地持久化） | UNIAPP-G1-001（§7 表） |
| 6 | UniApp Android（U-AND）是否一致 | **不一致**：与 U-WX 同源（同一代码库编译） | 同 UNIAPP-G1-001 |
| 7 | Flutter Android（F-AND）是否一致 | **不一致**：Tab 文案/横滑导航/P003/P005/P010 页面缺口 | FLUTTER-G1-001/002/003（§7 表） |
| 8 | 测试矩阵是否可信 | **修复前不可信，已于本轮重建** | MATRIX-G1-001：F 编号错位 4 处确认 + R/F 非镜像映射错误；修复见 [CROSS_IMPLEMENTATION_PARITY_MATRIX.md](../09_test/CROSS_IMPLEMENTATION_PARITY_MATRIX.md) §0 |

**一句话结论**：规范与原型基准是干净的（9 页、4 Tab、P004 已移除口径三处一致）；偏差全部在两条实现线与旧测试矩阵——UniApp 残留了已删除的 P004 整链（含违反零持久化的本地存储），Flutter 的应用壳未对齐（Tab 文案、横滑导航、三页缺失/冒充）。

---

## 2. 页面覆盖表

| 页面 | 规范 | 公共原型 | 微信原型 | App 原型 | U-WX | U-AND | F-AND | 结论 |
|---|---|---|---|---|---|---|---|---|
| P001 扫描 | ✅ | ✅ | ✅ | ✅ | ✅ 存在 | ✅ 存在 | ✅ 存在 | 页面存在；面板残留见 UNIAPP-G1-001 |
| P002 配网 | ✅ | ✅ | ✅ | ✅ | ✅ 存在 | ✅ 存在 | ✅ 存在（provisioning_page.dart，1568 行） | 存在；逐页对齐 UNPROVEN |
| P003 HID 详情 | ✅ | ✅ | ✅ | ✅ | ✅ 存在 | ✅ 存在 | ❌ **Modal 冒充**（成功弹 sheet 自述「P003 尚未开放」） | FLUTTER-G1-003 |
| P004 历史 | **已移除（应不存在）** | 占位「已移除 ✕」 | 无此页 | 无此页 | ❌ **路由+页面文件+入口残留** | ❌ 同左 | ✅ 不存在 | UNIAPP-G1-001 |
| P005 诊断 | ✅ | ✅ | ✅ | ✅ | ✅ 存在 | ✅ 存在 | ❌ **Modal 冒充**（_DiagnosticsSheet pretty-print 两特征） | FLUTTER-G1-003 |
| P006 GATT | ✅ | ✅ | ✅ | ✅ | ✅ 存在 | ✅ 存在 | ✅ 存在 | 存在；逐页对齐 UNPROVEN |
| P007 已连接 | ✅ | ✅ | ✅ | ✅ | ✅ 存在 | ✅ 存在 | ✅ 存在 | 存在；Tab 文案 F-AND 偏差（G1-001） |
| P008 广播 | ✅ | ✅ | ✅ | ✅ | ✅ 存在 | ✅ 存在 | ✅ 存在 | 存在；逐页对齐 UNPROVEN |
| P009 关于 | ✅ | ✅ | ✅ | ✅ | ✅ 存在 | ✅ 存在 | ✅ 存在 | 存在；逐页对齐 UNPROVEN |
| P010 版本 | ✅ | ✅ | ✅ | ✅ | ✅ 存在 | ✅ 存在 | ❌ **缺失**（about 页无「版本记录」入口，版本信息内联于应用信息卡） | FLUTTER-G1-003 |

> 「存在」仅指静态可达，不构成结构/行为/状态/视觉任何维度 PASS。

---

## 3. 功能覆盖表（F001–F030 逐行，静态审计口径）

判定符号：✅ 静态证据存在 / ⚠ 存在但已知偏差 / ❌ 静态缺失 / ? UNPROVEN（需运行验证）。**本表不写 PASS。**

| F | 功能（FEATURE_MAP 口径） | 验收 | 页面 | U-WX | U-AND | F-AND | 备注 |
|---|---|---|---|---|---|---|---|
| F001 | BLE 扫描 | R01 | P001 | ? | ? | ?（扫描真机 PASS 见 WINDOWS_MOBILE_V1 矩阵，三线口径对齐 UNPROVEN） | — |
| F002 | 扫描权限前置 | R02 | P001 | ? | ?（Android 权限链） | ? | — |
| F003 | 扫描筛选 | R03 | P001 | ? | ? | ? | — |
| F004 | 广播数据查看 | R04 | P001 | ? | ? | ⚠（PARITY-004：A-AND 线厂商数据缺失；F-AND 待核） | — |
| F005 | 显示名智能解析 | R05 | P001 | ? | ? | ⚠（「未知设备」≠「未命名 BLE·ID后四位」，FEAT-F-003） | — |
| F006 | GATT 连接 | R06 | P006 | ? | ? | ⚠（connect 30s≠10s，FEAT-F-004） | — |
| F007 | 服务树浏览 | R07 | P006 | ? | ? | ? | — |
| F008 | 特征读取 | R08 | P006 | ? | ? | ? | — |
| F009 | 特征写入 | R09 | P006 | ? | ? | ⚠（写队列深度/单写超时/跨设备并行缺，FEAT-F-011） | — |
| F010 | Notify 监听 | R10 | P006 | ? | ? | ? | — |
| F011 | 通信日志 | R11 | P006 | ? | ? | ? | — |
| F012 | 断线自动重连 | R12 | P006/P007 | ? | ? | ⚠（backoff 2/4/6≠1/3/5，FEAT-F-005） | — |
| F013 | 多设备会话管理 | R13 | P007 | ? | ? | ?（F013 双手机真机测试进行中） | — |
| F014 | 微信外围广播 | R22/R24 | P008 | ? | 不适用（App 线走 F015） | 不适用 | — |
| F015 | App 外围广播 | R23/R24 | P008 | 不适用 | ? | ? | — |
| F016 | 31 字节预算 | R21 | P008 | ? | ? | ? | — |
| F017 | 观察侧证据匹配 | 无专属 R | 无页面消费 | ? | ? | ❌（无消费方，静态未见） | 服务层能力，逐功能 Gate 核 |
| F018 | Profile 设备识别 | R14 | P001 | ✅（profile 注册表+徽章） | ✅ 同左 | ✅（profile_registry 存在） | 入口细节 UNPROVEN |
| F019 | 配网向导 | R15 | P002 | ✅ 存在 | ✅ 存在 | ✅ 存在（三阶段） | — |
| F020 | 配对码扫码 | R16 | P002 | ✅ 存在 | ✅ 存在 | ✅ 存在（mobile_scanner） | — |
| F021 | 分帧明文写入 | R17 | P002 | ✅ 存在 | ✅ 存在 | ✅ 存在（provisioning_framing） | — |
| F022 | 配网错误恢复 | R18 | P002 | ✅ 存在 | ✅ 存在 | ⚠（diagnostics 恢复动作落到 Modal 而非 P005 页面，随 G1-003 修） | — |
| F023 | ~~设备历史~~ | R19 作废 | ~~P004~~ | ❌ **残留复刻** | ❌ 同左 | ✅ 未复刻 | UNIAPP-G1-001：路由/面板/持久化/TTL 全残留 |
| F024 | Smart HID 诊断 | R20 | P005 | ✅ 存在（五项链路） | ✅ 存在 | ❌ **Modal 冒充**（两特征 pretty-print ≠ 五项诊断行/四按钮/栈感知） | FLUTTER-G1-003 |
| F025 | OTA | R25 | P006 子流程 | ?（BLOCKED 口径） | ? | ⚠（现实现与 BLOCKED P-03 口径冲突，FEAT-F-012） | — |
| F026 | 日志脱敏 | R28 | 横切 | ? | ? | ? | — |
| F027 | 版本元数据展示 | R26 | P009/P010 | ✅ 存在 | ✅ 存在 | ⚠（P010 页缺失，仅 about 内联版本行） | FLUTTER-G1-003 |
| F028 | 小程序推广跳转 | R27 | P009 | ? | ?（非微信渠道=落地页+小程序码承接） | ? | — |
| F029 | 分享 | PAGE_SPEC §0.3 | P009+全局 | ? | ? | ? | — |
| F030 | 国际化【不做】 | R30 | 全局 | ✅ 全中文 | ✅ 全中文 | ⚠（Material i18n 基建接入 en/zh，FEAT-F-007 登记 M1/M7 收缩） | — |

---

## 4. 入口表（核心入口静态核对）

| 功能/页面 | 来源页面 | 控件 | 动作 | 目标 | U-WX | U-AND | F-AND |
|---|---|---|---|---|---|---|---|
| P006 通用调试 | P001 普通设备卡 | 「连接」按钮 | navigateTo（带 deviceId/name/rssi） | P006 | ✅ | ✅ | ✅（等扫描收尾语义 ?） |
| P002 配网 | P001 SHID 卡 | 「配置 Smart HID」 | navigateTo（setCurrentDevice） | P002 | ✅ | ✅ | ✅ |
| P003 详情 | P002 成功态 | 「查看设备」 | **redirectTo** | P003 | ✅ | ✅ | ❌（Modal sheet 冒充） |
| P002 重配 | P003 操作区 | 「重新配置」（主按钮） | setCurrentDevice+navigateTo | P002 | ✅ | ✅ | ❌（无 P003） |
| P005 诊断 | P003 | 「运行诊断」 | navigateTo（携 deviceId） | P005 | ✅ | ✅ | ❌（无 P003 入口） |
| P005 诊断 | P002 错误恢复 | 恢复按钮（diagnostics 类错误） | navigateTo | P005 | ✅ | ✅ | ⚠（落 Modal） |
| P006 高级调试 | P003 | 「高级 BLE 调试」 | navigateTo（暂存上下文） | P006 | ✅ | ✅ | ❌（无 P003） |
| P003 返回 | P005 | 「返回设备详情」 | **栈感知**（栈中有则 navigateBack） | P003 | ✅ | ✅ | ❌ |
| P002 重配 | P005 | 「重新配网」（READY 确认弹窗） | 栈感知 | P002 | ✅ | ✅ | ❌ |
| P006 点卡 | P007 | 设备卡本体 | navigateTo（profileId 分流） | P006/Profile 路由 | ✅ | ✅ | ⚠（仅推 P006，Profile 分流 ?） |
| P010 版本 | P009 | 「版本记录」菜单项 | navigateTo | P010 | ✅ | ✅ | ❌（菜单无此项） |
| ~~P004 历史~~ | ~~P001~~ | ~~「全部历史」~~ | ~~navigateTo~~ | ~~P004~~ | ❌ **残留** | ❌ 残留 | ✅ 无 |
| ~~P003 已知设备~~ | ~~P001 面板~~ | ~~「查看」~~ | ~~navigateTo~~ | ~~P003~~ | ❌ **残留** | ❌ 残留 | ✅ 无 |
| 返回首页 | P007 空态 | 「去扫描」 | switchTab | P001 | ✅ | ✅ | ?（空态按钮分流待核） |

---

## 5. 状态表

全域 12 态 + 9 台状态机（扫描 5 态/Session 8 态/广播 6 态/配网工作流/诊断/OTA 12 态/服务面板 5 态）的逐线核对矩阵已建立：[MULTI_END_STATE_PARITY_MATRIX.md](../09_test/MULTI_END_STATE_PARITY_MATRIX.md)（初始 NOT_AUDITED）。

本轮静态发现：

| 发现 | 线 | 归因 |
|---|---|---|
| F-AND P005 缺「offline→modal 连接并检测」等页面态（页面本身缺失） | F-AND | FLUTTER_IMPLEMENTATION_DRIFT（随 G1-003） |
| F-AND 连接超时/重连退避数值与正典不符（30s/2-4-6s） | F-AND | FLUTTER_IMPLEMENTATION_DRIFT（已登记 FEAT-F-004/005，M3 修，非 G1 范围） |
| U-WX/U-AND 已配置面板状态（knownDevices 非空）属已移除功能状态 | U-WX/U-AND | UNIAPP_IMPLEMENTATION_DRIFT（随 G1-001） |

## 6. 视觉表

逐页视觉项与设计 Token 全局映射已建立：[MULTI_END_VISUAL_PARITY_MATRIX.md](../09_test/MULTI_END_VISUAL_PARITY_MATRIX.md)（初始 NOT_AUDITED）。本轮仅登记结构性视觉事实：

| 发现 | 线 | 归因 |
|---|---|---|
| F-AND Tab2 文案「连接」 | F-AND | FLUTTER_IMPLEMENTATION_DRIFT（G1-001，P2） |
| F-AND BottomNavigationBar 图标语义与 PATTERN 对齐情况未核 | F-AND | UNPROVEN |
| U-WX 首页「已配置 Smart HID」面板视觉块 | U-WX/U-AND | UNIAPP_IMPLEMENTATION_DRIFT（G1-001） |

---

## 7. 差异归因总表（本轮全部发现）

| 编号 | 差异描述 | 分类 | 严重度 | 处置 |
|---|---|---|---|---|
| UNIAPP-G1-001a | pages.json:24-30 仍注册 pages/hid/history（P004） | UNIAPP_IMPLEMENTATION_DRIFT | P1 | PARITY-G1 修复 |
| UNIAPP-G1-001b | index.vue:17-30 「已配置 Smart HID」面板（全部历史/查看/移除）残留 | UNIAPP_IMPLEMENTATION_DRIFT | P1 | PARITY-G1 修复 |
| UNIAPP-G1-001c | store/hid.js uni.setStorageSync 持久化 known_devices（KEY `smart_ble.smart_hid.known_devices.v1`）违反零持久化 | UNIAPP_IMPLEMENTATION_DRIFT | **P0**（数据落盘违背安全约定） | PARITY-G1 修复（转纯内存会话快照） |
| UNIAPP-G1-001d | known-devices.js 90 天 TTL + 20 条上限（F023 已移除功能的机制复刻） | UNIAPP_IMPLEMENTATION_DRIFT | P1 | PARITY-G1 修复（保留 normalize 清洗，删 TTL 语义与持久化配套） |
| UNIAPP-G1-001e | profile.js:46 / profile-navigation.js:80 注册 history 路由与 fallback | UNIAPP_IMPLEMENTATION_DRIFT | P2 | PARITY-G1 修复 |
| UNIAPP-G1-001f | page-flow.test.js 期望含 P004 与 knownDevices 注入（测试迎合偏差） | TEST_MATRIX_DEFECT | P1 | PARITY-G1 重写（含「P004 不存在」断言） |
| FLUTTER-G1-001 | main.dart:101 Tab2「连接」≠「已连接」 | FLUTTER_IMPLEMENTATION_DRIFT | P2 | PARITY-G1 修复 |
| FLUTTER-G1-002 | main.dart:70-83 PageView 可横滑主 Tab（PAGE_SPEC §0.1 仅 switchTab 语义） | FLUTTER_IMPLEMENTATION_DRIFT | P1 | PARITY-G1 修复（禁横滑，保留点击切换） |
| FLUTTER-G1-003a | P003 缺失：P002 成功「查看设备」以 Modal sheet 冒充（弹层自述「尚未开放」） | FLUTTER_IMPLEMENTATION_DRIFT | P1 | PARITY-G1 补独立页面+pushReplacement（redirectTo 语义） |
| FLUTTER-G1-003b | P005 缺失：诊断=两特征 pretty-print Modal，无五项行/四按钮/栈感知 | FLUTTER_IMPLEMENTATION_DRIFT | P1 | PARITY-G1 补独立页面（结构对齐；五行数据映射细节后续 Gate 深化） |
| FLUTTER-G1-003c | P010 缺失：about 无「版本记录」入口，版本信息内联 | FLUTTER_IMPLEMENTATION_DRIFT | P1 | PARITY-G1 补独立页面+入口 |
| FLUTTER-G1-004 | MaterialApp localizationsDelegates/supportedLocales(en/zh) i18n 基建（F030=不做） | FLUTTER_IMPLEMENTATION_DRIFT | P2 | 已登记 FEAT-F-007，M1/M7 收缩（不扩 G1 边界） |
| MATRIX-G1-001 | 旧 CROSS_IMPLEMENTATION_PARITY_MATRIX F 编号错位（F002/F005/F017/F028 等错写 + F014-F016/F018-F024 合并 + R/F 误当镜像） | TEST_MATRIX_DEFECT | P1 | **本轮已修复**（记分卡重建） |
| BASE-PROTOTYPE | v1-new 与规范的逐页深级一致性 | — | — | UNPROVEN（页面集层面已核一致；逐页细节随 PARITY-G2 起核，发现真缺陷再修原型） |
| SPEC-CONFLICT | 本轮未发现（9 页/4 Tab/P004 移除/编号四源一致） | — | — | 无需裁决项 |

**ALLOWED_PLATFORM_DIFFERENCE 登记预检**：Android 权限弹窗/系统分享/外链方式/广播插件 API（10_platform）为合法差异位，逐页 Gate 中引用具体条目登记，本轮未发现滥用此分类的差异。

---

## 8. 严重度汇总

| 严重度 | 数量 | 编号 |
|---|---|---|
| P0 | 1 | UNIAPP-G1-001c（本地持久化违反安全约定） |
| P1 | 9 | UNIAPP-G1-001a/b/d/f、FLUTTER-G1-002/003a/b/c、MATRIX-G1-001（已修） |
| P2 | 4 | UNIAPP-G1-001e、FLUTTER-G1-001/004 |
| P3 | 0 | — |

---

## 9. PARITY-G1 修复范围（本轮执行）

**UniApp（U-WX/U-AND 同源修复）**
1. 删除 pages.json 的 P004 路由注册 → 9 页
2. 删除首页「已配置 Smart HID」面板及其全部交互（openHidHistory/openKnownHidDevice/removeKnownHidDevice/prune 调用）
3. store/hid.js：known_devices 转**纯内存会话快照**（冷启动为空；P003「最近配置」lastWifi/lastHub 内存快照语义保留，PAGE_SPEC §3 口径）；删除 uni.setStorageSync/getStorageSync
4. known-devices.js：删 TTL 语义（内存态无 90 天过期概念），保留 normalize 清洗
5. profile.js / profile-navigation.js：删 history 路由注册与 fallback
6. 删除 pages/hid/history.vue 页面文件
7. page-flow.test.js：重写 P004 相关断言 → 「P004 不存在 + pages.json 恰 9 页 + 首页无已配置面板」

**Flutter（F-AND）**
1. Tab2 文案「连接」→「已连接」
2. 主 Tab 禁横滑（PageView → 不可滑动结构，点击切换保留）
3. 新增 P003/P005/P010 三个独立职责页面 + 入口/路由：
   - P002 成功「查看设备」→ pushReplacement 进入 P003（redirectTo 语义）
   - P002 错误恢复 diagnostics / P003「运行诊断」→ P005 页面
   - P009「版本记录」菜单 → P010 页面
   - P003 三出口（重新配置→P002 / 运行诊断→P005 / 高级 BLE 调试→P006）；P005 双栈感知出口按 Flutter 导航栈等价实现
4. 不动业务行为数值（连接超时/退避等 M3 范围项），不扩边界

**边界外（后续 Gate）**：逐页结构/行为/状态/视觉四维对齐（PARITY-G2 起，P001 先行）、Token 映射表、真机截图对比、F-AND 已登记的 M2/M3/M7 域内缺陷修复。

---

## 10. 复核结论（任务书第五节对照）

| 已知问题 | 复核结果 |
|---|---|
| UniApp P004 残留 | **属实且更重**：不止路由——首页面板+持久化+TTL+测试期望整链残留（UNIAPP-G1-001a–f） |
| Flutter Tab 文案 | 属实（main.dart:101「连接」） |
| Flutter 横滑主 Tab | 属实（PageView + onPageChanged 联动）；PAGE_SPEC/PAGE_FLOW 全文无任何横滑定义 → FLUTTER_IMPLEMENTATION_DRIFT 成立 |
| Flutter 页面缺口 | 属实：P003/P005 为 Modal 冒充、P010 缺失（provisioning_page.dart 存在≠P003/P005/P010 完成，旧 FLUTTER_PRODUCT_GAP_AUDIT 的 △ 结论在本轮被坐实并细化） |
| 旧 Flutter 审计过期 | 部分过期：provisioning/profile_registry/framing/transport 等新代码已合入（F018-F022 静态存在），但壳层三项结论（Tab/横滑/页面缺口）仍然有效 |
| 测试矩阵错位 | 属实并已修复（MATRIX-G1-001） |
