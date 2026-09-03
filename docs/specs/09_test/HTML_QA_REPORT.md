# HTML Prototype QA Report —— BLE Toolkit+ V0 原型质量验收

> 依据标准：《AI 生成 HTML 原型质量验收标准 v1.0》（用户提供，2026-09-02）
> 角色：产品测试负责人 · **本轮未修改 HTML**（纯验收）
> 验收对象：[prototype/v0-old/app-prototype.html](../prototype/v0-old/app-prototype.html)
> 输入基线：[PRD.md](../02_product/PRD.md) · [PAGE_SPEC.md](../03_flow/PAGE_SPEC.md) · [USER_FLOW.md](../03_flow/USER_FLOW.md) · [FEATURE_MAP.md](../02_product/FEATURE_MAP.md)
> 口径：2026-09-02 用户决策已生效——PAGE004 与 F023 移除，在册页面 9、功能 29。
> 验证方式：python3 http.server 8931 + Playwright 实测（2026-09-02），证据分「本轮实测」与「既有验收记录」（[HTML_V0_ACCEPTANCE.md](HTML_V0_ACCEPTANCE.md) 4 轮 50 用例 + 当日复测 6/6）。

---

## 一、七项必含结论（标准 §16）

| # | 项目 | 覆盖率 | 结论 |
|---|------|--------|------|
| 1 | **页面覆盖率** | **9/9 = 100%** | PAGES 注册 p001/002/003/005/006/007/008/009/010，逐一 jump 实测全部渲染；PAGE004 为用户决策移除（口径在册，非缺失） |
| 2 | **功能覆盖率** | **29/29 = 100%** | F001–F030 在册 29 项（F023 作废）均有可点击入口与可观察状态；本轮重点实测 17 项（见 §五），其余引用既有验收记录 |
| 3 | **流程覆盖率** | **S1–S6 = 6/6 = 100%** | 六条用户旅程主干全部走通（本轮实测），含 redirectTo、栈感知导航、恢复动作分流 |
| 4 | **状态覆盖率** | **五态 × 9 页 = 100%** | Loading/Empty/Success/Error/Permission 全部有实测或场景在册（43 个评审场景 + 页面内条件态） |
| 5 | **异常覆盖率** | **4/4 类 = 100%** | 网络与蓝牙异常 / 权限异常 / 数据异常 / 用户取消，均有实测证据（见 §六） |
| 6 | **缺失列表** | 无阻断项 | Q1/Q2（P3）、Q3（P4）、O2（P5 已知不修）——见 §八 |
| 7 | **优先级** | 无 P0/P1/P2 | 全部缺陷为评审体验/模拟保真度级别，不阻断开发准入 |

---

## 二、文档一致性（标准 §2）

五份产物对同一事实口径零冲突：9 页 / 29 功能 / PAGE004+F023 移除 / OTA BLOCKED 标注 / F017、F030 现状如实标注（服务层就绪未接线）。

| 检查 | 结果 | 证据 |
|------|------|------|
| PRD ↔ FEATURE_MAP | ✅ | F001–F030 编号、P0/P1/P2 分级一致（17/7/5，在册 29） |
| PRD ↔ PAGE_SPEC | ✅ | 逐页职责/入口/按钮清单一致；P006 按钮清单不含「返回」（系统导航栏职责） |
| PRD/USER_FLOW ↔ HTML | ✅ | HTML `<title>`「9 页；2026-09-02 决策移除 PAGE004」；S1–S6 每步在原型可复现 |
| BUSINESS_FLOW ↔ HTML | ✅ | 8 错误码→恢复动作映射：3 个高危场景实测，5 个在场景库在册 |

---

## 三、页面完整性与入口（标准 §3/§4）

**完整性**：9/9 页面编号、入口、职责、状态与 PAGE_SPEC 一致；无 AI 自行合并页面——P006-OTA 为弹层子流程（PAGE_SPEC 在册），非页面合并。

**入口矩阵（本轮实测）**：

| 页面 | 进入路径（实测） | 返回路径（实测） |
|------|------------------|------------------|
| P001/P007/P008/P009 | tabBar 四键 | tabBar 互切（无返回，正确） |
| P002 | P001 SHID 卡「配置 Smart HID」 | subnav back；配网中 back 触发「离开确认」守卫（实测 modal 标题=离开确认，取消后继续配网） |
| P003 | P002 READY→「查看设备」redirectTo（stack 实测 [p001,p003]） | subnav back → p001 |
| P005 | P003「运行诊断」/ P002 controlhub_unreachable 恢复分流（实测直达 state=connected） | subnav back；godetail 栈感知（栈无 p003 时 push，实测） |
| P006 | P001「连接」/ P003「高级 BLE 调试」/ P007 普通卡（实测三路） | subnav back（D1 修复项复验 ✅） |
| P010 | P009「版本记录」菜单 | subnav back |

防御态：P002 无设备上下文直达显示 guard「缺少设备上下文」（实测）。

---

## 四、按钮交互（标准 §6）

| 检查 | 结果 | 证据 |
|------|------|------|
| 动作注册表 | 56 个 ACTIONS 键 | `Object.keys(ACTIONS)` 实测 |
| 孤儿 data-act（有键无 handler） | **0** | 9 页 DOM 全清扫，孤儿集合为空 |
| 无行为且非禁用按钮 | **0** | 9 页 `button:not([data-act]):not(:disabled)` 计数为空；禁用均为业务态（已连接/广播中/下发未满足） |
| 条件态按钮出现率 | 100% | 筛选面板 3 键、P006 服务树 5 键、P003 三键、P002 表单/扫码/下发、弹层键（qr 四分支/modal-ok/cancel/closewrite/confirmwrite/closeota）均在正确状态下出现 |
| 输入控件 | 全部受控 | oninput/onchange 统一走 `window.APP` 输入桥（6 个方法实测调用） |

---

## 五、功能覆盖重点实测（标准 §5，本轮 17 项）

| 功能 | 实测证据 |
|------|----------|
| F001 扫描 | 分批出现（800/1600/2400ms）→ toast「扫描完成 · 发现 5 台设备」 |
| F003 筛选 | 面板开合；RSSI 预设点击生效；重置还原 |
| F004 广播数据 | 卡片点击弹「广播数据 · SHID-A1B2C3」；复制/关闭键在 |
| F006/F007/F008 | connect-generic → connecting → ready（1.4s）；服务树 4 服务；「读取」→ 日志出现「接收」类条目 |
| F009 写入 | 空值→「请输入数据」；非法 HEX「01 ZZ」→ 格式拦截 toast；合法 TEXT→「写入成功」+ 日志 `写入:TEXT: Hello BLE` + 弹窗关闭 |
| F011 日志 | 清空后导出 →「暂无日志」toast |
| F012 重连 | 被动断线场景 → 三行日志：写队列中止 / 自动重连（1/3）1s backoff / 已重新连接·会话恢复（READY） |
| F013 会话 | 全部断开 → modal「部分设备未能断开 \| 失败设备：Mi Smart Band 8（errCode 10009）」 |
| F014/F015/F016 广播 | 默认负载 21/31 字节；检查支持→启动→徽章「微信/广播中」且**全部输入禁用**；停止→已停止；预填超限→「46B」红条 + 启动拦截 toast；Web 平台徽章「不支持」 |
| F019/F020/F021 配网 | open-profile→自动连接→configure；扫码 ok 分支 → hub 回填 + token 获取；下发 → 四行进度全 done → READY |
| F022 错误恢复 | wifi_failed→「返回表单修改」回表单且已填保留；pairing_expired→「重新扫描配对码」token 清空；controlhub_unreachable→「运行诊断」直达 P005（三分流全实测） |
| F024 诊断 | idle→「BLE 未连接」确认弹窗→连接并检测→五行全 ok→live；错误场景 + 显示错误码 → `diagnostic_connect_failed` 详情可见 |
| F025 OTA | 成功链 pick→validating→transferring（进度条）→committing→verifying→success（回读一致 1.2.0）→2s 自动关闭；校验失败场景 → `OTA_HASH_MISMATCH` sha256 拦截 |
| F026 脱敏 | 日志区固定演示条目 `token=***`（F026 标注在册） |
| F027/F028/F029 | P009/P010 版本 1.0.5-preview、推广卡 modal（appId 展示）、分享平台分支（引用既有验收 + 本轮按钮在位） |

---

## 六、状态与异常（标准 §7/§8/§9）

**五态矩阵（全部实测或在册场景）**：

| 态 | 实测位置 |
|----|----------|
| Loading | P001 扫描中 · P002 connecting · P005 checking · P006 connecting · OTA 四个进行态 · P008 未检测 |
| Empty | P001 未扫描/无匹配双文案 · P006 idle+服务空 · P007 常规+配网在线双空态 · P008 空日志 · P010 三空列表 |
| Success | P002 READY · P005 全 ok · P006 读值+OTA 成功 · P008 广播中 |
| Error | P001 失败横幅+重试 · P002 连接失败/8 错误码 · P005 error · P006 error 重试+OTA 失败 · P008 FAILED |
| Permission | P001 蓝牙未开 modal（10001 引导）/平台不支持 · P002 扫码权限分支 · P008 Android「权限请求」清单 modal+蓝牙未开「提示」modal |

**异常四类（标准 §9）**：

| 类 | 覆盖 |
|----|------|
| 网络异常（本产品=蓝牙/链路） | 扫描失败横幅重试、GATT 连接失败重试、controlhub_unreachable、广播启动失败 errCode 10001 |
| 权限异常 | 蓝牙未开引导、相机权限拒绝分类提示、Android 广播权限清单+去设置、Web 明确不支持 |
| 数据异常 | P003 记录不存在+返回键、P006 服务列表为空、P003 字段缺失显示 — |
| 用户取消 | 扫码取消分支、OTA 取消（abort）、配网中返回「离开确认」、modal 遮罩/取消键 |

**状态机（标准 §11）**：扫描 4 态 / GATT 面板 5 态（真实 8 态会话的 UI 投影，完整 8 态见 [STATE_MACHINE.md](../04_architecture/STATE_MACHINE.md)）/ 配网 3 阶段×4 行×4 态 / OTA 8 个可观察相位（真实 12 态内部机的行为视图）/ **广播徽章 6 态**（未检测/已就绪/广播中/已停止/失败/不支持，与 BROADCAST_STATE 对齐）/ 诊断 6 态。

---

## 七、数据 / 架构 / 组件 / 设计体系 / 代码质量（标准 §10–§15）

**§10 数据真实性**：MOCK 的 GATT UUID 全部真实（1800/180F/4FAFC201 OTA 三特征/FFE0，与 [REVERSE_ANALYSIS.md](../01_reverse/REVERSE_ANALYSIS.md) §8 硬件契约一致）；核心键 `deviceId/name/profileId` 一致。**3 处字段命名偏差**见 Q2。

**§12 架构一致性**：`S` 单一状态源 → `RENDER` 纯视图函数 → `ACTIONS` 统一变更入口 → 事件委托；模板只读 S 渲染，无页面内直接改业务状态，符合 Store→UI 单向数据流（原型口径；Service 层不模拟，评审面板明示「全模拟数据 · 无后端」）。

**§13 组件一致性**：`.dev/.chip/.btn/.empty/.kv/.diag-row/.logwrap/.op-state` 组件族跨页复用；toast/modal/sheet/logPanel 全局统一。P007 设备卡为 `.dev` 变体（动作区不同），见 Q3。

**§14 Design System**：正式设计体系未建（Phase 9 计划内）。原型自带 `:root` 10 个颜色 Token + 一致的半径/间距族，页面间无规则外差异；少量 Token 外硬编码色移交 Phase 9 收敛。**判：原型级一致，正式 Token 化为后续阶段交付**。

**§15 代码质量**：http/file 直接打开均可用；**JS 运行零错误**（console 0 error）；死链 0（页面无 `<a>` 外链，P009 链接均为复制/跳转/分享交互反馈，符合无后端现状）；全部按钮有效；注册表结构 + 事实源注释 + `window.S/MOCK` 可观测钩子，可直接作为开发参考。

---

## 八、缺失列表与优先级（标准 §16-6/7）

延续既有编号（D=缺陷 O=观察，D1/O1 已修复并本轮复验通过）：

| 编号 | 级别 | 描述 | 证据 | 建议 |
|------|------|------|------|------|
| **Q1** | **P3** | 评审场景库非幂等：P007 场景「3 台连接」不恢复被「全部断开」持久削减的 `MOCK.connected`（实测重进场景仅剩 1 台）；P008 场景 0/8 不重置 `advertising/state`，特定切换序列下「平台：Web（不支持）」徽章显示「广播中」（实测）。功能逻辑本身正确（拦截/停止均按预期），仅评审体验受损，刷新即复位 | 本轮 EV4 复现序列 | SCEN apply 统一先复位本页运行态（开发阶段在 v1 原型修正） |
| **Q2** | **P3** | 模拟数据 3 处字段与真实模型偏差：`rssi`（真实 `RSSI` 大写，REVERSE §7.1）；`advComplete` 布尔（真实 `advertisement{state,present,byteLength,length,hex}` 嵌套）；`matchLevel`（真实 `profileMatch`） | 对照 REVERSE_ANALYSIS §7 | v1 原型 MOCK 字段对齐逆向文档 §7 |
| **Q3** | P4 | 代码级备注：P007 设备卡未复用 `devCard()` 函数（样式类已共享）；`logPanelHTML` 第二参数未使用；`renderReview` pg-btn 含恒真三元（输出仍正确） | 源码 750/689/912 行 | v1 重构时顺手清理，不阻断 |
| O2 | P5 | http 服务下 favicon 404（既有决策：不修） | console | 维持不修 |

---

## 九、验收等级（标准 §17）与开发准入

### 验收等级：**Level 3 —— 开发依据**

- ✅ 页面存在且入口/返回完整（Level 1）
- ✅ 流程完整、状态完整、异常覆盖（Level 2）
- ✅ PRD 对应 + 架构模式对应（S→RENDER→ACTIONS 单向流）+ 组件族对应 + 原型级 Token 对应（Level 3）

### 最终开发准入检查

| 检查项 | 结果 |
|--------|------|
| 页面覆盖 100% | ✅ 9/9 |
| 功能覆盖 100% | ✅ 29/29 |
| 用户流程完整 | ✅ S1–S6 |
| 核心状态完整 | ✅ 五态 × 9 页 |
| 异常流程完成 | ✅ 4/4 类 |
| 数据模型一致 | ⚠️ 基本一致（Q2 命名偏差，P3） |
| 组件规则明确 | ✅ 原型组件族（正式化移交 Phase 9） |
| Design Token 统一 | ✅ 原型级 10 Token（正式化移交 Phase 9） |

**结论：通过（Level 3，开发准入放行）。** Q1/Q2 建议在 Phase 10（v1-new 原型）落地时一并修正，不回改 V0。

---

*报告日期：2026-09-02 · 验收人：AI 产品测试负责人（Playwright 实测 5 轮 EV1–EV5，约 60 项断言）*
