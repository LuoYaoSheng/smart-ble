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

> **执行结果（2026-09-07 当轮）**：下列范围全部完成并通过自动化回归——uniapp `build:mp-weixin` 构建通过且产物 0 处 P004/storage-key 引用、页面集静态断言 9/9、Flutter `analyze` 零问题 + `flutter test` 64/64（含新增 6 项壳层断言）。运行态复核（微信开发者工具 page-flow 测试、F-AND 真机走查）为下一 Gate 起步项，UNPROVEN。

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

---

## 11. 第二轮补录：PARITY-ICON 图标资产统一（2026-09-07，用户指令「所有端图标统一」）

### 11.1 审计发现（新增登记）

| 编号 | 差异 | 归因 | 严重度 | 状态 |
|---|---|---|---|---|
| UNIAPP-ICON-001 | tabBar 四枚 PNG 字形全部偏离正典：扫描=智能手表（应 scan 放大镜）、已连接=键盘（P004 时代 hid.png 遗留，应 link 链条）、广播=填充波（应 cast 描边）、关于=旧字形；页内 P005 诊断行用文字 ✓/! 替代正典 SVG check/warn/x；P002 进度行 fail 用 `!`（应 `✕`）、active 用 `…`（应 `·`） | UNIAPP_IMPLEMENTATION_DRIFT | P1 | 已修 |
| FLUTTER-ICON-001 | 全线 ~75 处 Material 图标（bluetooth_searching/devices_other/broadcast_on_personal 等 ~40 个字形）替代正典 35 枚 `i-*` sprite，视觉语言（填充/双态 outlined vs 1.8px 线性）整体偏离；tabBar 图标不受 IconTheme 控制需显式烤色 | FLUTTER_IMPLEMENTATION_DRIFT | P1 | 已修 |

正典依据：TOKEN.md §7（24×24 线性 / stroke 1.8 / currentColor / `i-*` sprite 唯一来源）；wechat 平台 COMPONENT_RULE.md 明确「C 注册表 ic 为唯一组件来源」——图标无平台差异豁免。

### 11.2 修复内容（同一提交序列 fix(parity)）

- 正典镜像：35 枚 sprite → `apps/uniapp/services/design/app-icons.js` + `apps/flutter/lib/core/design/app_icons.dart`（受锁定镜像，测试锁等价性）。
- U-WX/U-AND：tabBar PNG 按正典烤色重生成（81×81，#7B8FA5/#1B6DFF），旧 device/hid/broadcast/about 八个 PNG 删除；新增 `AppIcon` 组件（data-URI SVG）；P005 诊断行 ok/warn/fail 换正典 SVG、active/pending 保留 `·`；P002 进度行 `✕`/`·` 对齐；成功态 ✓→check 字形。
- F-AND：新增 `AppIcon`（flutter_svg）并替换全部 Material 图标（14 文件），tabBar 显式烤选中/未选中色；方向变体统一 `rotate`（返回箭头=chev-r 180°）。
- 映射与锁定：[DESIGN_TOKEN_PLATFORM_MAPPING.md](../09_test/DESIGN_TOKEN_PLATFORM_MAPPING.md) §1（Material→正典语义映射全表）；uniapp page-flow 2 条新测试 + flutter widget 2 条新测试。

### 11.3 验证

uniapp `build:mp-weixin` 通过（产物 tabBar=scan/link/cast/info，8 PNG，镜像入包）；node 静态断言（canon==mirror 35 枚）；flutter analyze 0 issue；flutter test 66/66（含 2 条图标门）。同设备三线截图留待视觉 Gate 按矩阵 §3 登记。

## 12. 第二轮补录：PARITY-ILL 空态插图/占位资产统一（2026-09-07，用户指令「需要的图标通过 ChatGPT2API 处理；占位图最好是透明底图」）

### 12.1 审计发现（新增登记）

| 编号 | 差异 | 归因 | 严重度 | 状态 |
|---|---|---|---|---|
| UNIAPP-ILL-001 | 4 组空态占位图（`static/placeholders/empty_{scan,connected,services,log}`）为 320×320 方形、圆角矩形渐变底、**不透明白底 PNG**（ch=3，角落像素≈#FDFEFE），与正典 B6 `C.ILL` 的 118×86 横构图透明底线性插画完全不符；P006 服务空态/P008 日志空态正典明确**无插图**（op-warn 文案块 / 单行 .logempty） | UNIAPP_IMPLEMENTATION_DRIFT | P1 | 已修 |
| FLUTTER-ILL-001 | 空态顶替字形偏离：P001 用 AppIcon set/scan、P007 用 `x` 字形（语义错误）、P010 纯文字行，均非正典 ILL；P006 服务空态文案合并为「正在发现服务或无可用服务...」且用 scan 字形（正典=op-warn warn 字形）；P007 空态文案偏离正典 | FLUTTER_IMPLEMENTATION_DRIFT | P1 | 已修 |
| UNIAPP-ILL-002 | P009 品牌卡用 512 位图 logo.png（正典=38px 渐变盒+bt 字形）；推广卡用 other-apps 两枚位图 PNG（正典=.promo 文字缩写块 abbr/bg/color 数据驱动）；`static/brand/about-hero.png` 无任何引用（死资产） | UNIAPP_IMPLEMENTATION_DRIFT | P2 | 已修 |
| FLUTTER-ILL-002 | P009 品牌行用 `assets/brand/icon.png` 位图；_PromoTile 用非正典紫渐变(#7B6DFF→#4A9EFF)+首字缩写；`assets/brand/icon.png`、`assets/brand/share.png`、`assets/icons/*.png`（5 枚平台图标）无代码引用（死资产，pubspec 一并裁撤） | FLUTTER_IMPLEMENTATION_DRIFT | P2 | 已修 |
| MATRIX-ILL-003 | 分享/启动器类必需位图（微信分享 imageUrl、F-AND launcher/splash）此前散手来源、无统一生产管线；U-AND（HBuilderX 打包）launcher 未在本轮范围 | TEST_MATRIX_DEFECT（管线缺口，非页面差异） | P2 | 已建管线（§1.6） |

正典依据：原型 `components/components.js` B6 empty-state（`C.ILL` 4 幅 + `C.empty`/`C.op`/`logPanel` 空态结构）；p009 品牌卡与推广卡渲染。占位/插画类资产正典即透明底（SVG 无背景矩形），无平台差异豁免。

### 12.2 修复内容

- 正典 ILL 镜像：`C.ILL`（radar/link/doc/box，118×86 透明底）→ `apps/uniapp/services/design/app-illustrations.js` + `apps/flutter/lib/core/design/app_illustrations.dart`（锁定镜像，`icon-gen/gen-ills.js` 生成）。
- U-WX/U-AND：新增 `AppIll` 组件；empty-state 换 `ill` 槽（P001 双态 radar/link + 正典文案与「开始扫描」动作、P007 link、P010 两处 doc）；P006 服务空态去插图、日志空态改单行 `.logempty` 文字（broadcast 传正典合并文案）；P009 品牌标=渐变盒+bt 字形、推广位=abbr 缩写块（product.js 增 abbr/bg/color）；`static/placeholders`（8 文件）、`static/other-apps`（2 文件）、`static/brand`（1 文件）删除。
- F-AND：空态换 AppIll（P001 radar/link、P007 link+正典文案、P010 _emptyBlock doc）；P006 服务空态=op-warn 文案块（warn 字形+正典文案）；品牌行=渐变盒+AppIcon bt；_PromoTile=数据驱动缩写块（product.dart 同源字段）；`assets/brand`、`assets/icons` 删除，pubspec assets 裁撤（全线 `Image.asset` 归零）。
- ChatGPT2API 位图管线（用户指令落地）：gpt-image-2 生成品牌 icon（白 BT 字形+蓝渐变，全出血）与分享卡（1024 居中构图），`analyze_image` 质检（Good/无 artifact）后经 sharp 落位：uniapp `logo.png`(512)/`share.png`(1024, palette 383KB)；F-AND `assets/images/icon.png`(512) + Android legacy mipmap（48–192 五密度）+ 原生 splash（256–1024 五密度）。管线登记于 [DESIGN_TOKEN_PLATFORM_MAPPING.md](../09_test/DESIGN_TOKEN_PLATFORM_MAPPING.md) §1.6。
- 透明底规则成文：占位/插画类=正典 SVG 镜像（透明底），AI 位图仅用于全出血必需槽位（§1.5/§1.6）。

### 12.3 验证

uniapp `build:mp-weixin` 通过（dist 含 ILL 镜像 `0 0 118 86`，`placeholders/` 零引用）；node 静态断言（ILL canon==mirror 4/4 逐字锁定、无 `<rect>`、源码/产物零占位引用、三个资产目录已删）；flutter analyze 0 issue；flutter test 67/67（新增 ILL 渲染门）。page-flow.test.js 新增 2 条 PARITY-ILL 静态测试（HBuilderX 内执行）。U-AND launcher（HBuilderX 打包域）与同设备三线截图留待后续 Gate。

## 13. 第三轮补录：P001 逐页四维对齐（2026-09-07，逐页 Gate 顺序 P001→P006→P007→P008→P002→P003→P005→P009→P010）

正典依据（四源）：`docs/specs/03_flow/PAGE_SPEC.md` §1 P001（结构①自绘导航栏②扫描工具条③附近设备面板④广播数据弹窗）；公共原型 `prototype/v1-new/pages/p001-scan.js` + `components/components.js`（C1 devCard/B6 empty/B8 ebanner/C.btn icon 位）；`assets/pages.css`（.navbar/.bt-chip/.scantool/.sec-t/.filter/.ad-sec）+ `components.css`（.dev/.sig q1–q4/.pre/.switch）；`08_development/ERROR_CODE.md`（平台码不上屏、BLE_00x 应用码可入 code chip）。双平台原型（wechat/app）对 P001 **无视觉版式差异**，仅行为域（授权弹窗/拒绝横幅/蓝牙关闭引流），不构成本轮差异项。

### 13.1 审计发现（U-WX 与 F-AND 两条实现线，基线=公共原型）

| 编号 | 差异 | 归因 | 严重度 | 状态 |
|---|---|---|---|---|
| U-P001-001 | 导航栏文案倒置：kicker「SmartBLE Mini」/title「BLE Toolkit+」（正典 kicker `BLE TOOLKIT+`/title `扫描`）；蓝牙状态词 5+ 态（「当前平台不支持 BLE」等）且胶囊底 chip（正典 3 态词 + 无底 dot+text）；kicker 弱化灰 | UNIAPP_IMPLEMENTATION_DRIFT | P1 | 已修 |
| U-P001-002 | 扫描工具条卡片化：额外「扫描」标题/状态 chip（待开始/需重试/已完成）/「N 台设备 · N 台已连接」计数行/无图标通栏大按钮（正典=纯行：scanLb 三态左 + 带 scan/stop 图标按钮右） | UNIAPP_IMPLEMENTATION_DRIFT | P1 | 已修 |
| U-P001-003 | 「附近设备」无中性计数 chip、无 chip 图标；列表被包进大 ble-card 容器（正典 .sec-t 平铺 + 设备卡独立成卡） | UNIAPP_IMPLEMENTATION_DRIFT | P2 | 已修 |
| U-P001-004 | 过滤面板自成 header（扫描过滤器/展开收起/摘要 chips）+预设档 -100/-85/-70/-55（正典 强[-40]/较好[-60]/一般[-70]/弱[-85]）+滑杆 max 0 step 1（正典 -40/5）+「信号强度」标签（正典 最弱信号/阈值 N dBm）+占位「例如 SHID / Light / Test」+开关 #1B6DFF（正典 #17C7A8）+红色药丸重置（正典 soft sm） | UNIAPP_IMPLEMENTATION_DRIFT | P1 | 已修 |
| U-P001-005 | 设备卡：头像「BLE/ON」文字（正典首字母渐变）、「未知设备」fallback（正典 未命名 BLE 设备/（未命名））、小米/华为生态猜测 chip（产品级发明，正典无）、meta 长引导文案（正典仅 sig+dBm）、四色信号条（正典 q4/q3 绿/q2 黄/q1 红）、JS 17 字符截断（正典 CSS 省略）、动作无图标、actionLabel「Smart HID 配网」（正典 配置 Smart HID）、footer 分隔线 | UNIAPP_IMPLEMENTATION_DRIFT | P1 | 已修 |
| U-P001-006 | 错误横幅：标题「扫描失败（code）」拼串、无 warn 字形/code chip/ghost-danger 重试（正典 B8：danger-weak 底+左 3px 边+code chip+refresh 重试） | UNIAPP_IMPLEMENTATION_DRIFT | P2 | 已修 |
| U-P001-007 | 广播弹窗：居中 modal+textarea 全量 dump+通栏大按钮（正典=底部弹层+kv 四行+深色 ad-sec 逐段/整包+缺失逐项标注+sm 按钮） | UNIAPP_IMPLEMENTATION_DRIFT | P1 | 已修 |
| F-P001-001 | AppBar title「BLE TOOLKIT+」无 kicker/无「扫描」标题；状态词 5 态（蓝牙已开启/已关闭/不可用/未授权/状态未知）+off 灰点（正典 3 态词+off 红点），自绘导航栏缺失 | FLUTTER_IMPLEMENTATION_DRIFT | P1 | 已修 |
| F-P001-002 | 体序倒置：FilterPanel 在 scantool 之上；无 .sec-t（附近设备标题/计数 chip/筛选 txtlink）；FilterPanel 自有 header（过滤条件/chev-d/计数徽章） | FLUTTER_IMPLEMENTATION_DRIFT | P1 | 已修 |
| F-P001-003 | 工具条：标签在按钮上方+通栏大按钮+自创「发现 N 台设备/显示 N/N 台」徽章行（正典=行内 label+右按钮，计数归 .sec-t chip） | FLUTTER_IMPLEMENTATION_DRIFT | P1 | 已修 |
| F-P001-004 | 过滤行：预设 全部/-90/-70/-50+滑杆 max -30（正典四档强/较好/一般/弱+max -40 step 5）+checkbox 隐藏无名（正典 switch 绿轨）+通栏重置按钮（正典 soft sm）+占位「输入设备名称前缀...」 | FLUTTER_IMPLEMENTATION_DRIFT | P1 | 已修 |
| F-P001-005 | 错误横幅=红字单行 Row（无 B8 结构/code chip/重试按钮），错误码与消息未分层 | FLUTTER_IMPLEMENTATION_DRIFT | P1 | 已修 |
| F-P001-006 | 空态缺「开始扫描」soft 动作按钮（正典 C.empty act，仅未扫描态显示） | FLUTTER_IMPLEMENTATION_DRIFT | P2 | 已修 |
| F-P001-007 | 设备卡动作无 hid/link 图标；广播弹窗 hex 区浅底 #F1F5FB（正典 .ad-sec 深色 ink 底+#8FA3C0 标头+#D6E2F5 hex） | FLUTTER_IMPLEMENTATION_DRIFT | P2 | 已修 |

全部 14 项归因均为**实现线漂移**（UNIAPP_IMPLEMENTATION_DRIFT ×7 / FLUTTER_IMPLEMENTATION_DRIFT ×7）：公共原型与 PAGE_SPEC 自 PARITY-G1 起即上述口径，无 BASE_PROTOTYPE_DEFECT / SPEC_CONFLICT；平台原型未引入 P001 视觉差异，无 ALLOWED_PLATFORM_DIFFERENCE 项。

### 13.2 修复内容

- **U-WX/U-AND（10 文件）**：`pages/index/index.vue`（navbar 正典 kicker/title/三态词+tone、.sec-t 平铺+计数 chip+txtlink、设备卡列表出卡容器、空态 act 仅未扫描态）；`scan-summary.vue` 重写为 .scantool 纯行（live 脉冲点+scan/stop 图标，正典无台数计数行——PAGE_SPEC「已连接计数」规则的正典展示位随已配置面板移除而消失，计算口径保留在 P007，登记为规格侧残留）；`app-navbar.vue`（statusTone 三态 dot、去胶囊底、kicker 主色 xbold）；`filter-panel.vue` 重写为正典四行（展开控制移交宿主 sec-t）；`device-card.vue` 重写（首字母头像/匹配 chip 注册表注入/未命名双 fallback/sig q1–q4 正典配色/CSS 省略/hid+link 图标/acts 无分隔线；conn 变体保留 P007 契约仅对齐共享视觉，meta 暂用正典默认文案）；`error-banner.vue` 重写为 B8（code chip 参数化）；`empty-state.vue` act 改 soft 色调+可选图标位；`advertisement-dialog.vue` 重写为底部弹层（kv 四行+深色 ad-sec 逐段【平台解析字段重建】/整包 hex/缺失标注/长度 0 警示）；`services/smart-hid/profile.js`（actionLabel=配置 Smart HID + chipStrong/chipWeak 正典文案）；`composables/use-ble-scan.js`（hasScanned 标记+chip 字段注入）；`services/ble-runtime/advertisement.js` 新增 `buildAdSegments()`（与 F-AND `_segments` 同口径的 AD 段重建纯函数）。
- **F-AND（4 文件）**：`device_list_page.dart` 重构（AppBar→自绘 .navbar + `btStatusWord/btDotColor` 静态映射、体序 ebanner→scantool→sec-t→filter→list、_buildDeviceBadge 退役计数归 sec-t、错误码/消息分层 BLE_001/BLE_003+B8 横幅+重试、空态 soft 开始扫描按钮（仅未扫描态）、_PulseDot 呼吸点）；`filter_panel.dart` 重写为正典四行（header/展开参数退役，_NameFilterField controller 同步逻辑原样保留——WIN-FAND-002）；`device_card.dart` _ActionChip 加图标位（hid/link，primary 白/soft 正文色）；`advertisement_sheet.dart` hex 区改深色 ink 段（_DarkSection/_SectionHd/_hexText，.miss 弱化色，复制按钮加 copy 图标；「整包 hex」因平台无原始帧逐项标注缺失，不以拼接冒充）。
- **测试先行（先红后绿）**：U-WX `page-flow.test.js` 新增 4 条 PARITY-P001 静态正典锁（navbar/scantool 文案、filter 四档与滑杆参数、devCard 结构与配色禁项、B8/advdlg 键串）；F-AND `widget_test.dart` 新增 `btStatusWord` 三态映射单测 + P001 结构 widget 测试（kicker/标题×2/三态词之一/待开始扫描/开始扫描×2/附近设备/筛选→四档展开→收起翻转），既有 2 处 `find.text('扫描') findsOneWidget` 更新为 `findsNWidgets(2)`（navbar 标题+Tab 同名）。

### 13.3 范围决策（非差异项）

1. **双平台原型仅行为域**：wechat（授权弹窗+去设置）/app（FINE_LOCATION→拒绝横幅 bluetooth_permission_denied→永久拒绝引导、蓝牙关闭→系统设置→回流续扫）无 P001 视觉版式差异，行为域已在 F002 实现线覆盖，本轮无新增项。
2. **BLE 状态映射**（F-AND）：on→蓝牙就绪（绿）；off/unauthorized→蓝牙未开启（红）；unavailable/unknown/turningOn/turningOff→平台不支持（默认灰）——正典三态词表无法一一映射 6 个底层态，瞬态并入「平台不支持」，unauthorized 并入「蓝牙未开启」（平台授权弹窗行为域消化）。
3. **匹配 chip 文案注册表化**：chipStrong/chipWeak 文案入 profile presentation（U-WX）/profile_registry（F-AND 已有 chipLabel），devCard 仅消费——后续设备家族按 profile 扩展，不再硬编码 Smart HID 字串于组件。
4. **AD 结构逐段**：正典 adStructures 为 mock 预置；两实现线均以平台解析字段重建（0x09/0x03/0x07/0xFF/0x16/0x0A），小端序口径一致（U-WX `buildAdSegments` ↔ F-AND `_segments`）；整包 hex 在无原始帧的平台标注缺失，不拼接冒充。
5. **Token 渐变差异延后**：uniapp `ble-btn--primary` 三停渐变（#155dff→#33b2ff→#7be0ff）与 `--ble-brand-deep` #134dbe 对正典（#1B6DFF→#0E4FC4）的全局漂移不在本页范围，P001 页内新样式直接取正典值，全局映射随 DESIGN_TOKEN_PLATFORM_MAPPING 视觉 Gate 轮统一。

### 13.4 验证

U-WX：`npm run build:mp-weixin` 通过；`npx jest -t "PARITY-P001"` 4/4 绿（静态正典锁；automator 全量流待 HBuilderX/devtools 环境）。F-AND：`flutter analyze` 0 issue；`flutter test` 69/69（含新增 P001 两测，全量绿）。同设备六态截图（393×852 → `verification/windows-mobile-v1/<run-id>/parity/P001/`）随视觉 Gate 执行（U-WX devtools 登录态与 U-AND HBuilderX 打包为既有阻塞，见 §12.3）。

## 14. 第四轮补录：UI-CONV Token 收敛 + Apple 镜像钉子 + 账本回正（2026-09-10，用户指令「UI 统一四步收口」）

### 14.1 背景与范围

用户质疑「HTML 原型→各端实现」统一链路真实进度。核查结论：G0（P001 样板）与 UI-G2（同日全页面结构对齐）为真实地基，但 (a) check-token-usage 的 LEGACY_DRIFT 白名单仍容忍约 40 个 v0 漂移 hex；(b) DESIGN_TOKEN_PLATFORM_MAPPING §2/§3 与三张 MULTI_END 矩阵大面积 NOT_AUDITED/占位，账本落后于实际；(c) Apple 双线（N-IOS/N-MAC）不在统一体系内，手写镜像无锁定。本轮三项收口：**漂移清零 → Apple 钉子 → 账本回正**。

### 14.2 漂移收敛（LEGACY_DRIFT 清零）

- **U-WX/U-AND（10 文件）**：`design-system.css`（--ble-cyan/--ble-gradient-brand 删除、bg-bottom/渐变/深字/成功块收敛正典——主按钮/pill 渐变改挂正典 `.btn.primary` 135° primary→primaryDeep，§13.3-5 登记的「三停渐变全局漂移」就此销案）；`uni.scss`（框架兜底 6 值对齐正典）；`provision-stepper`（当前步纯色化=正典 C6、done 挂 success-deep）、`provision-progress`（done/warn/fail 挂 deep/weak token=正典 prow）、`ota-dialog`/`app-card`/`broadcast`/`hid/add`（深字色→success/warning-deep、设备头像→正典 SHID 渐变）。
- **F-AND（2 文件）**：`provisioning_page.dart` 16 处深色阶/弱底 → AppTokens（错误块对齐正典 B8：danger 标题+sub 正文+dangerWeak 底；进度行对齐 prow；info 行→noteInfoFg；分割线→lineSoft；页底→bg）；`app_icons.dart` 兜底色→--c-text。
- **分类修正**：`config/product.dart` 推广位 bg/color 为产品内容数据（p009 缩写块数据，与 uniapp product.js 同源），移入 DATA_SKIP 豁免而非漂移容忍。
- **守卫同步**：`tests/unit/uniapp-ui-contract.test.mjs` stepper 断言由旧渐变模式改为正典纯色+success-deep。
- **check-token-usage.mjs**：LEGACY_DRIFT 置空（机制保留——再出圈外值直接 FAIL）。

### 14.3 Apple 镜像钉子（scripts/check-apple-tokens.mjs · npm run check:apple-tokens）

- 逐一比对 N-IOS `NativeDS` / N-MAC `DS` 与 design-tokens.json：色彩（含 macOS 别名定义解析、日志六色、ink 族）、圆角、macOS 间距 sp1–8；镜像内新增未登记色即 FAIL。
- **首跑即抓到真实漂移**：iOS `dangerWeak=#FEEFF0` ≠ 正典 `#FDEBEC`（macOS 侧正确）——已修正并经 iOS 全量测试验证（单元+4 套 UI 测试 TEST SUCCEEDED，iPhone 17 Pro Max 模拟器）。
- 覆盖差如实登记（mapping §2.5）：iOS 未镜像 successDeep/warningDeep（无消费位）、ink/log 族（不适用）；iOS 间距/阴影未成体系（mapping §3 差距行）。

### 14.4 账本回正

- `DESIGN_TOKEN_PLATFORM_MAPPING` §2（五线色彩映射）/§3（字号·圆角·间距·阴影）回填，N-IOS/N-MAC 列加入。
- `MULTI_END_VISUAL_PARITY_MATRIX` §1 核心 Token 行回填（PASS·生成/PASS·钉子分级，静态≠渲染级）；§2 归因列挂 UI-G2/UI-G1 证据；§3 登记 G1 P001 截图证据行+视觉 Gate 首跑阻塞。
- `MULTI_END_PAGE_PARITY_MATRIX` §3 四维记分卡：9 页 STRUCTURE 维回填（UI-G2），BEHAVIOR/STATE/VISUAL 诚实保持 NOT_AUDITED。
- `MULTI_END_COMPONENT_PARITY_MATRIX`：G1/G2 有据行回填 PASS·struct（P001 全节+P002-P010 主区块），无运行态证据的表单细节行保留 NOT_AUDITED；「已配置面板 修复中」stale 行销案。
- `MULTI_END_STATE_PARITY_MATRIX` §2 扫描会话五行按 G1 真机证据回填（E1/E2/E3 偏差如实登记）。

### 14.5 验证

```
node scripts/check-token-usage.mjs    → PASS（登记色 49 · banned 14 清零 · 漂移登记 0）
node scripts/check-icon-usage.mjs     → PASS（dart 63 · vue 34 · 目录 35 · 镜像同步）
node scripts/check-apple-tokens.mjs   → PASS（N-IOS 色17+圆角3 · N-MAC 色35+间距8+圆角4）
flutter analyze                       → No issues found
flutter test                          → 113/113 passed
npm run build:mp-weixin / build:app   → DONE ×2
bash scripts/verify-uniapp.sh         → PASS（28 unit files + 14 static gates）
xcodebuild test（iOS 模拟器）          → TEST SUCCEEDED（单元+AccessibilityAudit/AdvData/FlowState/TabBar UI）
--- 2026-09-10 晚补跑（视觉烟测，见 §14.6-1）---
simctl install/launch + io screenshot → N-IOS 四页 PNG（smoke-nios/）
微信 cli auto + automator screenshot  → U-WX 四页 PNG（smoke-uwx/；automator 补丁后全通）
screencapture -R + CGEvent Tab 点击   → F-AND 四页 PNG（smoke-fand/；绕过 guest screencap 故障）
devicectl install/launch（iPhone 真机）→ com.smartble.ios v2.0.0 装包+拉起 PASS
```

### 14.6 遗留登记（非本轮范围）

1. **视觉 Gate：烟测首跑完成，六态全量仍待**。2026-09-10 晚补跑（`verification/windows-mobile-v1/20260910-ui-conv/parity/smoke-{uwx,fand,nios}/`，12 张全部经视觉核验为真实 app 页面、正典结构）：
   - **U-WX ×4**（P001/P007/P008/P009 默认态）：微信开发者工具登录已恢复（`cli islogin → {"login":true}`，G1 阻塞解除），automator 通道打通——注意 devtools 3.17.2 的 `Tool.getInfo` 不再回 `SDKVersion`，`miniprogram-automator@0.12.1` 连接即崩，本地 node_modules 补丁容忍缺省后 connect/reLaunch/screenshot 全通。
   - **F-AND ×4**（同四页）：Pixel_API35 模拟器（DY21_AVD 损毁弃用）+ `app-debug.apk`；**guest 侧 `adb screencap` 故障**——窗口焦点/进程/EGL 渲染均为 app，截屏却恒返回桌面（两轮复现），改 **macOS 宿主窗口区域截屏**（`screencapture -R`，qemu 主窗 [100,100,411,942]）+ CGEvent 点击 Tab 绕过，四页落袋。
   - **N-IOS ×4**（同四页）：iPhone 17 Pro Max 模拟器 `simctl io screenshot`；Tab 导航经宿主 Simulator 窗口点击。**iPhone 11 Pro 真机**：最新构建 devicectl 装包+拉起 PASS（`com.smartble.ios` v2.0.0），但程序化截图无工具链（devicectl 无 screenshot 子命令、idevicescreenshot 未装、连接形态为 CoreDevice），真机像素级截图留人工/装 libimobiledevice 再议。
   - **U-AND 仍缺**：HBuilderX 打包域未装；Android 真机 adb/mdns 均不可见（未以调试形态连本机）。
   - 六态全量（含权限/错误/加载/弹窗态）按 §3 待办行推进；烟测默认态截图不折算为 VISUAL PASS（矩阵 §2 判定列维持 NOT_AUDITED）。
2. F-AND P001 三件旧 widget（advertisement_sheet/device_card/filter_panel）迁移 ui/design 后删除（G2 §5-1 原样保留；hex 全为注册值，非漂移）。
3. iOS 间距/阴影未成体系；iOS deep/ink/log token 未镜像（无消费位；接入时先扩镜像再过钉子）。
4. E1/E2/E3（10001 modal 文案/横幅形态/权限时机）待 F 域证据链更新窗口。

---

## 15. F028 推广区移除轮（2026-09-10 · 用户指示）

### 15.1 范围与执行

「关于页更多小程序」推广信息整链下线，正典与实现同步清除：

- **正典原型 v1-new**：`pages/p009-about.js`（区块+feats F028）、`app.js` `p009-promo` action、`mock-data/mock.js` promo 数组、`assets/components.css` `.promo` 规则（C11 编号退役）、README 两处。
- **平台高保真**：app/desktop/wechat `p009-about.js` 三件 + 各自内核 `app.js` action；`android.js`/`desktop.js` 覆写层（PROMO_LAND/qrDemo/承接 sheet 三个 action）；`web.js` W6 卡 + PROMO 数据 + 3 action；3× mock promo、4× components.css `.promo`。
- **U-WX**：`pages/about/index.vue`（模板/脚本/样式）、`config/product.js` RELATED_MINI_PROGRAMS、`components/about/app-card.vue` 组件删除（git rm）。
- **F-AND**：`about_page.dart` `_buildPromoCard`/`_PromoTile`、`product.dart` promos+PromoApp；check-token-usage `DATA_SKIP` 撤销（例外不再需要）。
- **N-IOS**：`AboutView.swift` promotionCard/promotionRow；TabBarUITests+AccessibilityAuditUITests 锚点「更多小程序」→「应用信息」。
- **N-MAC**：`P009AboutPage.swift` promos/推广卡/openPromo sheet + 孤儿组件 PseudoQRView 删除。

### 15.2 门禁与验证

```
node scripts/check-token-usage.mjs    → PASS（DATA_SKIP 撤销后仍 0 漂移）
node scripts/check-icon-usage.mjs     → PASS（vue 34→33 文件 = app-card 退役）
node scripts/check-apple-tokens.mjs   → PASS
flutter analyze / test                → 0 issue / 113/113
bash scripts/verify-uniapp.sh         → PASS（28+14；check-uniapp-assets 兄弟小程序身份由「锁入」改「锁出」）
xcodebuild build + test (iOS 模拟器)  → BUILD SUCCEEDED + 12/12 TEST SUCCEEDED
swift build (N-MAC)                   → Build complete
P009 三线重采（smoke-uwx/fand/nios）  → 均验证推广区零残留（§3 重采行）
```

### 15.3 账本同步

PRD（F028 行/U6/功能域图/页面结构/R27）、FEATURE_MAP、PRODUCT_MODEL、PAGE_SPEC §9、COMPONENT C11（退役）、FEATURE_IMPLEMENTATION_MATRIX、LEGACY_REUSE_MATRIX、RUNTIME_ARCHITECTURE（ExternalNavigationPort 收窄/差异圈 7→6 行）、API_SPEC、API_ACTION_MATRIX（P09-04 移除）、PLATFORM_ADAPTER_SPEC、10_platform §4 推广跳转行作废、COVERAGE_CHECKLIST、WINDOWS_MOBILE_V1_MASTER_MATRIX、CROSS_IMPLEMENTATION_PARITY_MATRIX、VISUAL/COMPONENT 矩阵、prototype v1-new/平台 README+PLATFORM_SPEC、target-product PAGE-009、MINIAPP_PAGE_MAP。历史归档（v0-old、verification、plans、product-review、01_reverse、06_review 既有轮记录、README 带日期审计行）按账本纪律不回溯修改。

### 15.4 残留清扫（同日补扫）

全仓关键词复扫（更多小程序/navigateToMiniProgram/promotion/_PromoTile/PseudoQRView/p009-promo/RELATED_MINI_PROGRAMS/other-apps）后补正 6 文件 8 处活文档漏标：apps/uniapp README 功能清单行、PAGE_FLOW P009 出口行、PAGE_CAPABILITY_COVERAGE_AUDIT F028 行（改删除线存档）+§4-7 落地清单（navigateToMiniProgram/小程序码不再是落地项）、DEPENDENCY_LIST 其他 API 枚举（navigateToMiniProgram 除名）+§6 外链资源（兄弟小程序 appId 移除、指向禁止身份锁出）、ASSET_INVENTORY app-card 行（删除线）+product.js 描述/other-apps 目录确认不存在。复扫后剩余命中均为：移除标注本体、带日期轮次日志、已修问题行、逆向记录（01_reverse/tests/target 原工程基线）、守护测试断言（page-flow.test.js:150）。

---

## 16. Apple Token 生成管道收编轮（2026-09-10 晚 · UI-CONV 欠账销案）

### 16.1 动机与方案

§14.3 的钉子机制（check-apple-tokens.mjs 值比对）是「正典改值 → Apple 静默漂移」缺口的**底线方案**；本 轮把 Apple 双线手写镜像收编进 `generate_assets.py --theme-only` 单源生成管线，钉子退役。

- **生成段标记**：N-IOS `NativeDesignTokens.swift` 内 `@generated:ios-tokens`（17 色 + 圆角 sm/md/lg）；N-MAC `DSTokens.swift` 内 `@generated:mac-colors`（35 色：brand 11 + 中性 8+card + ink 深色 3+inkMut≙derived.reviewLabel + 日志六色 12 字面量）与 `@generated:mac-scale`（sp1–8 + 圆角 sm..xl）。标记对之外的手写区（iOS ViewModifier/Dynamic Type 助手、macOS 字号助手/探针元数据）不受影响。
- **命名映射入生成器**：`IOS_BRAND`/`IOS_NEUTRAL`（ink≙text/page≙bg 平台命名）、`MAC_*` 清单化；inkMut 指向 derived.reviewLabel（#8FA3C0）。
- **`--check` 漂移门禁**：write_file 比对模式，`--theme-only --check` 对 8 个 theme 输出（app_theme.css×3 + app_colors.dart + tokens.css + app_tokens.dart + 两 Swift）逐字节比对，漂移/缺失退出码 1。
- **接线**：`npm run check:apple-tokens` → python 生成器 `--check`；scripts/check-apple-tokens.mjs 删除（§14.3 为其历史记录）；design-tokens.json `$meta.outputs` 增 ios/mac 两项 + apple 单位规则。

### 16.2 验证

```
generate_assets.py --theme-only --check → CHECK PASS：8 个输出全部同步（css/dart 零连带漂移）
swift build (N-MAC)                    → Build complete!（12.5s）
xcodebuild test (iPhone 17 Pro Max)    → 12/12 TEST SUCCEEDED（AccessibilityAudit 6 + AdvData 1 + FlowState 3 + TabBar 2）
```

### 16.3 账本同步

DESIGN_TOKEN_PLATFORM_MAPPING（机制总览 + §2.5 机制/I1 改生成口径 + §2.5 数据豁免随 F028 失效登记）、VISUAL 矩阵 §1（判定口径升级，Apple 列 `PASS·钉子`→`PASS·生成`，card 行 iOS 直用特例）、DESIGN_SYSTEM_INDEX §3/§4（门禁与载体行）。§14.3/§15 历史轮记录不回溯。

---

## 17. 视觉 Gate 可达态首轮（2026-09-10 晚 · vis1）

### 17.1 范围与产出

六态全量中不依赖硬件/打包域的**可达态**先行采集，三线 10 张全部经视觉模型逐字复核为真实页面：

| 线 | 采集物 | 通道 |
|---|---|---|
| U-WX | P001 空态A + 筛选展开（setData 直驱）+ P010 + P002 默认态（reLaunch 直达）×4 | automator（脚本归档 `20260910-ui-conv/vis1-uwx-capture.cjs`） |
| N-IOS | P001 空态A（**平台不支持 chip+禁用钮**=模拟器真实态，兼证 UI-G1 #11 平台不支持场景）+ 筛选展开（CGEvent 像素定位）+ P010 ×3 | simctl screenshot + Quartz CGWindowList/CGEvent（CUA 辅助功能授权失效后的既定绕行） |
| F-AND | P001 空态A（蓝牙不可用 chip）+ **Error B8 横幅**（bluetooth_unavailable+重试，E2 横幅形态模拟器复现）+ P010 ×3 | 宿主窗口 screencapture + adb input tap（窗口 411×942 ↔ guest 1080×2400 换算） |

### 17.2 如实登记的不可达项

- U-WX 扫描态：scan-summary 为自定义组件，automator 元素级穿透失败（探针证实 page 树仅 5 个 view、`>>>` 无效）；CGEvent 误触下拉刷新后弃用——留六态全量轮（真机预览或 HBuilderX 基座）。
- F-AND 筛选展开态：Flutter semantics 未开启时 uiautomator 拿不到节点（dump 返回 launcher 层），坐标定位未果；FilterPanel 四档行有 widget_test 断言 + U-WX/N-IOS 两线截图佐证。
- N-IOS 10001 modal：模拟器为「平台不支持」而非「蓝牙未开」，点扫描无 modal 反馈（chip 即正典反馈形态）；Error modal 态不可达。
- P002 F-AND/N-IOS、P003/P005/P006 连接态：需 BLE 设备对象，待夹具/真机。

### 17.3 账本同步

VISUAL §2（P001/P002/P010 归因列）+ §3（vis1 三行+全量行更新）；UI_G1 §3 U-WX 列补采回填 + §4-① 勾销（U-WX P001 判定升级 code+截图复核）；判定矩阵数值不动（E1 FAIL 行仍有效）。
