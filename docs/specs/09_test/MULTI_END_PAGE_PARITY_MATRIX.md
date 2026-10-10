# 多端页面一致性矩阵（MULTI_END_PAGE_PARITY_MATRIX）

- 创建：2026-09-07 · Multi-end Parity Gate
- 验收对象：U-WX（apps/uniapp→微信）/ U-AND（apps/uniapp→Android）/ F-AND（apps/flutter→Android）
- 事实源：[PAGE_SPEC.md](../03_flow/PAGE_SPEC.md) + [PAGE_FLOW.md](../03_flow/PAGE_FLOW.md) + `prototype/v1-new` + `prototype/platform/{wechat,app}`
- 判定值：`STRUCTURE_PASS / BEHAVIOR_PASS / STATE_PASS / VISUAL_PASS / FAIL / NOT_AUDITED / BLOCKED`
- 规则：**不得预填 PASS**；每页必须给出四维独立判定（不能只写 PAGE_PASS）；差异须归因（八类分类见 MULTI_END_PARITY_AUDIT §7）。

## 1. 页面集合覆盖表

| 页面 | 页面名（PAGE_SPEC 口径） | 规范 | 公共原型 v1-new | 微信原型 | App 原型 | U-WX | U-AND | F-AND | 结论 |
|---|---|---|---|---|---|---|---|---|---|
| P001 | 扫描首页 | ✅ | ✅ | NOT_AUDITED | NOT_AUDITED | 存在 | 存在 | 存在 | NOT_AUDITED |
| P002 | Smart HID 配网向导 | ✅ | ✅ | NOT_AUDITED | NOT_AUDITED | 存在 | 存在 | 存在 | NOT_AUDITED |
| P003 | Smart HID 设备详情 | ✅ | ✅ | NOT_AUDITED | NOT_AUDITED | 存在 | 存在 | 存在（PARITY-G1 补独立页面+redirectTo 语义；四维 NOT_AUDITED） | NOT_AUDITED |
| P004 | ~~Smart HID 历史~~（应不存在） | 已移除 | 占位「已移除 ✕」 | NOT_AUDITED | NOT_AUDITED | **已移除（G1，构建产物验证 0 引用）** | 同 U-WX | 不存在 | 页面集合合规（运行复核待 U-WX 工具线） |
| P005 | Smart HID 诊断 | ✅ | ✅ | NOT_AUDITED | NOT_AUDITED | 存在 | 存在 | 存在（PARITY-G1 补独立页面，五行/四按钮结构就位；行为深对齐 NOT_AUDITED） | NOT_AUDITED |
| P006 | 通用设备详情（GATT） | ✅ | ✅ | NOT_AUDITED | NOT_AUDITED | 存在 | 存在 | 存在 | NOT_AUDITED |
| P007 | 已连接设备 | ✅ | ✅ | NOT_AUDITED | NOT_AUDITED | 存在 | 存在 | 存在 | NOT_AUDITED |
| P008 | BLE 广播 | ✅ | ✅ | NOT_AUDITED | NOT_AUDITED | 存在 | 存在 | 存在 | NOT_AUDITED |
| P009 | 关于 | ✅ | ✅ | NOT_AUDITED | NOT_AUDITED | 存在 | 存在 | 存在（G1 补「版本记录」菜单项=4 项菜单） | NOT_AUDITED |
| P010 | 版本记录 | ✅ | ✅ | NOT_AUDITED | NOT_AUDITED | 存在 | 存在 | 存在（PARITY-G1 补独立页面+入口；F027 数据深接线 NOT_AUDITED） | NOT_AUDITED |

> 「存在」仅表示有可执行页面/路由，不构成任何维度 PASS。

## 2. 应用壳与导航（PARITY-G1 验收位）

> 2026-09-07 PARITY-G1 回填。验证方式：U-WX/U-AND = pages.json 静态断言 + build:mp-weixin 构建产物检查；F-AND = flutter widget 测试（64/64）+ analyze 零问题。运行态（真机/开发者工具）复核仍属 UNPROVEN，不因此写页面级 PASS。

| 项 | 规范来源 | U-WX | U-AND | F-AND | 结论 |
|---|---|---|---|---|---|
| TabBar 恰 4 项：扫描/已连接/广播/关于 | PAGE_SPEC §0.1 | PASS（pages.json） | PASS（同代码库） | PASS（widget test） | 壳层 PASS |
| Tab2 文案 =「已连接」 | PAGE_SPEC §0.1 | PASS | PASS | PASS（FLUTTER-G1-001 已修，widget test 断言「连接」findsNothing） | 壳层 PASS |
| 主 Tab 仅点击切换（无横滑） | PAGE_SPEC §0.1（仅 switchTab 语义） | PASS（tabBar 原生） | PASS | PASS（NeverScrollableScrollPhysics + 拖动测试，FLUTTER-G1-002 已修） | 壳层 PASS |
| 二级页 navigateTo 入栈 | PAGE_SPEC §0.1 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P002 成功 →P003 redirectTo（不回到已完成向导） | PAGE_SPEC §0.1 | NOT_AUDITED | NOT_AUDITED | PASS（pushReplacement，静态+测试） | 壳层 PASS（运行复核待） |
| P005 栈感知返回 P003/P002 | PAGE_FLOW §1①② | NOT_AUDITED | NOT_AUDITED | PASS（fromDetail/fromWizard 栈感知实现，静态） | 壳层 PASS（运行复核待） |
| P004 路由/入口/构建产物不存在 | PRD 变更记录 2026-09-02 | PASS（路由删+面板删+构建产物 0 引用） | PASS（同） | PASS（无此页） | 壳层 PASS |
| 页面标题与 PAGE_SPEC 一致 | PAGE_SPEC 各页 | NOT_AUDITED（逐页） | NOT_AUDITED | NOT_AUDITED | — |
| 零本地持久化（冷启动为空） | 08_development/STORAGE_POLICY | PASS（Storage 读写删除，known_devices 键产物 0 引用） | PASS（同） | PASS（HidSessionStore 纯内存 + 测试；shared_preferences 已于先前移除） | 壳层 PASS（运行复核待） |

## 3. 逐页四维记分卡（PARITY-G2 起按 P001→P006→P007→P008→P002→P003→P005→P009→P010 顺序回填）

> 2026-09-10 UI-CONV 回填口径：**STRUCTURE 维**由 UI-G2（2026-09-09 全页面轮：导航/组件/文案/图标位静态对齐 + 构建/测试门禁，[UI_G2_FULLPAGE_ALIGNMENT.md](../06_review/UI_G2_FULLPAGE_ALIGNMENT.md)）回填；**BEHAVIOR/STATE/VISUAL 三维**仍 NOT_AUDITED（须运行态证据——行为流测试/状态机复核/六态截图，属视觉 Gate 与真机回归窗口）。U-WX 为 code-verified（与 U-AND 同仓同码 + build 产物断言），运行态复核待开发者工具。

| 页面 | U-WX | U-AND | F-AND | 差异归因 | 证据 |
|---|---|---|---|---|---|
| P001 | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | 同 U-WX（+G1 真机行为证据 9/11 项，E1 偏差登记） | STRUCTURE_PASS（+G1 真机像素证据；E2/E3 偏差登记） | UI-G2 §1 P001 + UI-G1 11 项判定 | UI_G2 §1；UI_G1_P001_FINAL §1（uiautomator 逐字+像素）；build:mp-weixin DONE · flutter analyze/test 绿 |
| P006 | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | 同 U-WX | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | UI-G2 §1 P006：ServicePanel 五态+LogPanel dock 接管旧件；标题 IA-01 对齐 | UI_G2 §1 + 门禁（verify-uniapp 28+14 · flutter 113/113） |
| P007 | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | 同 U-WX | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | UI-G2 §1 P007：AppNavbar SESSIONS+DeviceCard conn+AppEmpty+sumcard | 同上 |
| P008 | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | 同 U-WX | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | UI-G2 §1 P008：AppNavbar PERIPHERAL+AppBadge 三态+LogPanel card | 同上 |
| P002 | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | 同 U-WX | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | UI-G2 §1 P002：AppSubnav+离开确认复用；UI-CONV 2026-09-10 stepper/进度/错误块 token 收敛 | 同上 + check-token-usage 漂移 0 |
| P003 | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | 同 U-WX | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | UI-G2 §1 P003：AppBadge/AppChip/AppListRow/AppButton×3+info 条 | 同上 |
| P005 | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | 同 U-WX | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | UI-G2 §1 P005：AppStatusIcon 五态行+正典词表（文本字形退役） | 同上 |
| P009 | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | 同 U-WX | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | UI-G2 §1 P009：AppNavbar ABOUT+品牌渐变挂 token | 同上 |
| P010 | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | 同 U-WX | STRUCTURE_PASS / NOT_AUDITED / NOT_AUDITED / NOT_AUDITED | UI-G2 §1 P010：AppSubnav+AppEmpty doc×2 | 同上 |

> 每格回填格式：`STRUCTURE_PASS/BEHAVIOR_PASS/STATE_PASS/VISUAL_PASS`（四项全过才可写 PAGE_PASS 汇总）；任一维 FAIL 须链接缺陷编号。
