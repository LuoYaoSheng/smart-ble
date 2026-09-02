# UI/UX Revalidation Report

```yaml
task_id: UI-UX-REVALIDATION-001
status: PASS
gate: TP-G3
baseline: 8042832
checkpoint: checkpoint/ui-ux-audit
date: 2026-09-02
mode: analysis-only
```

## 总览

| 项 | 结论 |
|---|---|
| **当前 UI 状态** | 视觉与配网向导已接近「可交付产品」；一级导航与通用 BLE 路径仍是 **Toolkit 开发者工具**人格 |
| **产品成熟度** | **混合型（双人格）** — Smart HID 主路径偏产品；扫描/已连接/广播/设备详情偏工程面板 |
| **E4 harness** | PAGE-001~010 Fake Runtime **全 PASS**（≠ 产品体验达标） |
| **问题数量** | P0 **4** · P1 **8** · P2 **9**（本轮新编号 UI-*；不替代历史 D0x 档案） |

### 一句话

> 下一轮体验改造应先划清 **Smart HID 主路径** 与 **专家调试沙箱**，再谈控件抛光；禁止用改测试冒充产品体验 PASS。

### 事实源对照

| 源 | 用途 |
|---|---|
| `docs/product-contract/09_HTML_PROTOTYPE_SPEC.md` | 交互母版：平台切换、状态矩阵、FLOW-001~010 |
| `docs/product-contract/03_USER_FLOWS.md` / `04_PAGE_CONTRACTS.md` | 流程与契约 |
| `docs/target-product/pages/PAGE-001..010` | 首屏、IA、状态机目标 |
| `docs/prototypes/unified-device-discovery.html` + `2026-08-22-all-pages-audit.md` | 可运行旧原型（新目录 `uniapp-reference/` **仍未落地**） |
| `docs/product-audit/07_*` / `15_*` | 历史设计问题与规范漂移 |
| `docs/gap-analysis/PAGE_E4_GAP_REPORT.md` | E4 可执行 ≠ UX 达标 |
| `apps/uniapp/pages/**` + composables/components/styles | 当前实现（只读） |

### 横切发现

1. **品牌分裂**：Navbar/分享「BLE Toolkit+」vs 配网页「SMART HID」——3 秒内角色不清。
2. **设计体系已存在**：`styles/design-system.css`（`--ble-*`）统一卡片/按钮/空态；`app_theme.css` 仍是另一套色板，有漂移风险。
3. **状态组件资产齐全**：`empty-state` / `error-banner` / `operation-state` / `scan-summary`——产品页用得好，工具页多靠 toast/log。
4. **Tab IA**：扫描 / 已连接 / 广播 / 关于——「广播」占一级对普通 HID 用户过重；HID 历史/诊断不在 Tab。
5. **原型债**：契约要求 `docs/prototypes/uniapp-reference/` 为唯一交互母版，当前仍依赖旧单文件原型。

---

# 页面评分表

评分维度综合：First Impression（3s）· IA · Interaction · State · Error Recovery · Visual Hierarchy · Product vs Tool · Consistency（0–5，越高越好）。

| 页面 | 路由 | UX 评分 | 问题等级 | 人格 | 改造建议 |
|---|---|---|---|---|---|
| PAGE-001 扫描 | `pages/index/index` | **3.6** | P1 | 产品壳 + 工具核 | **修改** |
| PAGE-002 HID 配网 | `pages/hid/add` | **4.4** | P2 | 产品（标杆） | **保持** + 文案 |
| PAGE-003 HID 详情 | `pages/hid/detail` | **3.1** | P1 | 薄产品页 | **修改** |
| PAGE-004 HID 历史 | `pages/hid/history` | **4.0** | P2 | 产品 | **保持** / IA 合并 |
| PAGE-005 诊断 | `pages/hid/diagnostics` | **3.3** | P1 | 产品 + 工程码 | **修改** |
| PAGE-006 设备详情 | `pages/device/detail` | **2.2** | **P0** | Dev Tool | **重构边界** |
| PAGE-007 已连接 | `pages/connected/index` | **3.0** | P1 | 工具会话管理 | **修改** |
| PAGE-008 广播 | `pages/broadcast/index` | **2.4** | **P0** | 纯 Dev Tool | **重构 IA** |
| PAGE-009 关于 | `pages/about/index` | **3.7** | P2 | 产品/营销 | **修改** |
| PAGE-010 版本 | `pages/about/version` | **3.5** | P2 | 发布工程页 | **保持**/对外简化 |

**均分 ≈ 3.3 / 5**（可演示、未统一人格）。

---

# P0 问题

影响：产品叙事冲突或普通用户掉进不可理解的工程面板。

## UI-P0-001

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-006 通用设备详情 |
| **问题** | 首屏即工程面板化（GATT 树 + 日志导出 + HEX 写），无「普通 / 高级」分层；从 HID 详情「高级 BLE 调试」可无门槛进入 |
| **当前** | 顶栏「清空/导出日志」与「连接」同级；服务面板五态完备但对消费者无业务语义 |
| **目标** | 定位为「手机上的 BLE 万用表 / 专家模式」：入口降级、首屏连接优先、日志默认折叠；产品用户默认不落此页 |
| **建议** | Phase 1：入口二次确认 + 顶栏精简；Phase 2：可选「简易视图」（仅连接态 + 常用操作） |

## UI-P0-002

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-008 广播 |
| **问题** | 纯协议表单（UUID/厂商数据/功率）占 **Tab 一级**，与 Smart HID 产品叙事冲突最大 |
| **当前** | 「开始广播」「检查支持」+ 操作日志；缺「是否被 ESP32 Observer 看到」的用户语言证据条（目标契约要求 Observer 提示） |
| **目标** | 学习/验证场景保留能力，但 IA 上移到「实验室/高级」；Tab 留给主任务；提供「一键演示」折叠高级字段 |
| **建议** | Phase 1：Tab 降权或改「实验室」；补 Observer 证据提示；Phase 2：简易模式 |

## UI-P0-003

| 字段 | 内容 |
|---|---|
| **页面** | 全局品牌 / 导航 |
| **问题** | 「BLE Toolkit+」与「Smart HID 配网产品」双人格并存，冷启动 3 秒无法判断主任务 |
| **当前** | 分享文案、关于页、扫描 navbar 偏 Toolkit；配网页偏 SMART HID |
| **目标** | 单一主叙事（建议：**Smart BLE = 发现 + Smart HID 配网**；通用调试为明确二级） |
| **建议** | Phase 1：文案与分享统一；首页任务分流 CTA |

## UI-P0-004

| 字段 | 内容 |
|---|---|
| **页面** | 原型母版 |
| **问题** | 契约要求 `docs/prototypes/uniapp-reference/` 为唯一交互原型；目录未落地，无法用平台/场景切换器做 UX 签收 |
| **当前** | 仅有历史 `unified-device-discovery.html` |
| **目标** | 按 `09_HTML_PROTOTYPE_SPEC` 重建可切换原型，再驱动 UniApp 改造 |
| **建议** | Phase 1 并行建立原型母版（文档/前端静态），不阻塞代码边界划分 |

---

# P1 问题

体验问题：可完成任务，但路径长、易误触、状态不全或口径分裂。

## UI-P1-001

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-001 |
| **问题** | 设备卡主体点击 = 广播详情，与「连接 / 配网」主路径竞争；Profile 双按钮认知负担高 |
| **当前** | 符合旧原型 FLOW-002（点卡片看广播），但对赵哥（配网）不直觉 |
| **目标** | 卡片主点击 = 主动作（连接或配网）；广播数据进「详情/⋯」次级 |
| **建议** | 修改卡片交互优先级；保留广播弹窗能力 |

## UI-P1-002

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-001 |
| **问题** | 区块文案重复（历史 D01：「附近设备」「已连接」多处出现）；已配置 HID 区与 PAGE-004 重叠 |
| **目标** | 单一「已知设备」入口策略；扫描区只保留发现列表 |
| **建议** | 与 PAGE-004 合并 IA；清理重复标题 |

## UI-P1-003

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-001 |
| **问题** | Device Card 信号/能力/状态/来源表达不完整或工具化（RSSI 数字为主，能力徽章弱） |
| **目标** | 目标契约：显示名、RSSI、强/弱匹配、Profile 动作一目了然；来源（扫描/历史）可区分 |
| **建议** | 强化能力与下一步标签；弱化原始广播噪音 |

## UI-P1-004

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-007 |
| **问题** | Session 口径分裂：Smart HID 配网会话不进「已连接」列表，空态文案偏工程；无用户语言解释「这里列什么」 |
| **目标** | 用户语言：「正在调试的通用连接」vs「配网中的 Smart HID」；禁止裸露 owner / subscription_count |
| **建议** | 统一连接模型展示或把本 Tab 降为扫描子视图 |

## UI-P1-005

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-003 |
| **问题** | 无实时在线/Ready 态；像配置摘要而非设备首页；「高级 BLE」直通 P0 调试页 |
| **目标** | 首屏：是否在线、最近配置、下一步（诊断/重配）；高级调试折叠 |
| **建议** | 补会话态；高级入口降级 |

## UI-P1-006

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-005 |
| **问题** | 进入不自动检测；四竖排 secondary 按钮成「按钮墙」；字符状态点可读性弱 |
| **目标** | 进入自动跑一轮；结果驱动下一步（失败才强调重配网） |
| **建议** | 修改进入行为与 CTA 层级 |

## UI-P1-007

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-008 / PAGE-006 |
| **问题** | 错误恢复工具级完整（modal/log），但缺少「消费者下一步」模板；与 PAGE-001/002 的「原因 + 建议 + 主按钮」不一致（见历史 15_） |
| **目标** | 全应用统一错误模式 |
| **建议** | 抽取错误恢复模式，工具页也套用 |

## UI-P1-008

| 字段 | 内容 |
|---|---|
| **页面** | PAGE-001 权限 |
| **问题** | 权限永久拒绝后「去设置」链路弱于广播页；首屏平台/权限区目标契约要求可操作横幅 |
| **目标** | 与 FLOW-001 一致：拒绝必解释 + 设置入口 |
| **建议** | 对齐广播页权限 UX |

---

# P2 问题

优化项：不挡主路径，影响精致度与一致性。

## UI-P2-001

PAGE-002：英文 kicker（PROVISION STATUS）与中文混用；ControlHub/MQTT 缺「为什么扫码」一句话。

## UI-P2-002

PAGE-002：Wi-Fi 纯手填，无系统附近网络辅助（能力受平台限制，文案可先补）。

## UI-P2-003

PAGE-004：与首页已知设备重复；设备多时无搜索/排序。

## UI-P2-004

PAGE-009：推广「更多小程序」首屏权重高；缺「使用帮助/配网指南」。

## UI-P2-005

PAGE-010：英文状态词（PREVIEW/NOT_RELEASED）对终端用户；与关于页信息部分重复——对内保留、对外折叠。

## UI-P2-006

视觉：`app_theme.css` vs `design-system.css` 双色板；部分页自定义 navbar 与原生导航混用（历史 15_）。

## UI-P2-007

PAGE-001：5s 自动停扫对新手可能过短（目标 DEC-013 观察 10s）；属体验观察项。

## UI-P2-008

PAGE-006：写入对话框仅 HEX/TEXT，无业务语义提示；OTA 小按钮危险色但与日志操作同级。

## UI-P2-009

一致性：成功反馈有的 toast、有的 stepper、有的仅日志——需统一「短反馈 + 可回看」策略。

---

# 重点页面深度分析

## PAGE-001 Scan

| 维度 | 评估 |
|---|---|
| 是否知道扫描中 / 发现几个 / 如何连接 | **部分**：有开始/停止与列表；发现计数与筛选表达可加强；连接动作在卡上但主点击却是广播 |
| Device Card：信号 / 能力 / 状态 / 来源 | RSSI 有；能力/Profile 动作有但拥挤；来源（历史 vs 扫描）弱 |
| First Impression | 4/5 壳好，核偏工具 |
| 建议 | **修改**：任务分流（配网 vs 通用扫描）+ 卡片主动作 |

## PAGE-006 Device Detail

| 维度 | 评估 |
|---|---|
| 是否工程面板化 | **是**（目标契约本身定位「万用表」，但缺与产品路径的隔离） |
| Read/Write/Notify/OTA/Debug | 能力齐全；首屏过载 |
| 普通 / 高级模式 | **缺失** → P0 |
| 建议 | **重构边界**，能力可 Keep |

## PAGE-007 Connected

| 维度 | 评估 |
|---|---|
| Session 用户可理解？ | **弱**；HID 会话排除规则难懂 |
| owner / subscription_count | 实现层有 Registry 字段；UI 未直接裸露，但空态文案仍偏工程 |
| 建议 | **修改**：用户语言分组；或降级 IA |

## PAGE-008 Broadcast

| 维度 | 评估 |
|---|---|
| 是否知道广播成功被发现 | **否**（日志/状态 pill 有，缺 Observer 证据用户语言） |
| 建议 | **重构 IA** + Observer 提示条 |

## PAGE-002 Smart HID

| 维度 | 评估 |
|---|---|
| 首次使用流程 | **清晰**（连接→填写→状态）；标杆页 |
| 是否过早暴露 Profile/Token/Diagnostic | Token 仅扫码内存、不落历史——合规；Diagnostic 不在本页主路径——良好 |
| 建议 | **保持**结构；P2 文案与 Wi-Fi 辅助 |

---

# 页面改造建议（保持 / 修改 / 重构）

| 页面 | 决策 | 说明 |
|---|---|---|
| PAGE-001 | **修改** | 任务分流、卡片主动作、清理文案重复 |
| PAGE-002 | **保持** | 全应用 UX 标杆；仅文案/辅助 |
| PAGE-003 | **修改** | 在线态 + 下一步；高级入口降级 |
| PAGE-004 | **保持** | 空态诚实；与首页 IA 合并策略 |
| PAGE-005 | **修改** | 自动检测 + CTA 收敛 |
| PAGE-006 | **重构（边界）** | 专家模式沙箱，不删能力 |
| PAGE-007 | **修改** | 连接模型用户语言 / 或降为子视图 |
| PAGE-008 | **重构（IA）** | 移出主 Tab 或实验室化 |
| PAGE-009 | **修改** | 帮助入口；推广降权 |
| PAGE-010 | **保持** | 对内完整；对外简化文案 |

---

# 推荐执行顺序

## Phase 1 — 人格与边界（不改 BLE 协议）

1. 统一品牌叙事与分享文案（UI-P0-003）。
2. PAGE-006 入口降级 + 首屏精简（UI-P0-001）。
3. PAGE-008 Tab/实验室 IA 决策 + Observer 提示（UI-P0-002）。
4. PAGE-001 卡片主动作与任务分流（UI-P1-001/003）。
5. （并行）落地 `docs/prototypes/uniapp-reference/`（UI-P0-004）。

## Phase 2 — 主路径打磨

1. PAGE-003 设备首页态；PAGE-005 自动诊断（UI-P1-005/006）。
2. PAGE-007 连接口径用户语言（UI-P1-004）。
3. 全应用错误恢复模板对齐（UI-P1-007/008）。
4. PAGE-001/004 已知设备 IA 合并（UI-P1-002）。

## Phase 3 — 精致度与一致性

1. 双主题色板收敛；navbar 规范（UI-P2-006）。
2. PAGE-002/009/010 文案与帮助（UI-P2-001/004/005）。
3. PAGE-006 写对话框与 OTA 层级（UI-P2-008）。
4. 成功反馈一致性（UI-P2-009）；扫描时长观察（UI-P2-007）。

---

# 与历史审计关系

| 历史项 | 本轮 |
|---|---|
| D01 文案重复 | 升入 UI-P1-002，仍有效 |
| D07 配网中间态 | 部分已由 `use-smart-hid-provisioning` 改善；保留观察 |
| 假完成清单中旧「高级 BLE 假按钮」 | 现状已能进入 PAGE-006——**问题从假完成转为过度可达（P0）** |
| PAGE E4 全 PASS | **不关闭**本报告任何 UX 项 |

---

# 非目标（本轮已遵守）

- 未修改 `apps/uniapp/pages|components|styles`
- 未修改 Runtime / BLE / OTA / ESP32
- 未修改测试以「刷 PASS」

---

# 附录：状态矩阵快照（实现侧）

| 页面 | loading | empty | success | error | permission | offline/断线 |
|---|---|---|---|---|---|---|
| 001 | partial | yes | partial | yes | partial | n/a |
| 002 | yes | n/a | yes | yes | partial | yes |
| 003 | no | partial | no | partial | no | no |
| 004 | no | yes | n/a | n/a | n/a | n/a |
| 005 | yes | idle | yes | yes | partial | yes |
| 006 | yes | yes | toast/log | panel+log | weak | via disconnect |
| 007 | no | yes | n/a | toast/modal | no | via disconnect |
| 008 | partial | log empty | pill | yes | yes | bluetooth modal |
| 009 | n/a | n/a | n/a | modal | n/a | n/a |
| 010 | n/a | notes | n/a | toast | n/a | n/a |
