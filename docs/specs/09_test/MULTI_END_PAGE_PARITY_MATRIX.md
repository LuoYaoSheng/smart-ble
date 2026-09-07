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

| 页面 | U-WX | U-AND | F-AND | 差异归因 | 证据 |
|---|---|---|---|---|---|
| P001 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — | — |
| P006 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — | — |
| P007 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — | — |
| P008 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — | — |
| P002 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — | — |
| P003 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — | — |
| P005 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — | — |
| P009 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — | — |
| P010 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — | — |

> 每格回填格式：`STRUCTURE_PASS/BEHAVIOR_PASS/STATE_PASS/VISUAL_PASS`（四项全过才可写 PAGE_PASS 汇总）；任一维 FAIL 须链接缺陷编号。
