# Smart BLE 页面能力覆盖审计（PAGE_CAPABILITY_COVERAGE_AUDIT）

> 版本：1.0 · 审计日期：2026-09-03 · 第 12 份评审文件
> 审计角色：页面能力覆盖完整性审计（只审不改——本轮**未修改任何代码或规范**）
> 事实源优先级（严格依次）：① [02_product](../02_product/)（PRD / FEATURE_MAP / PRODUCT_MODEL / STATE_MODEL）② [03_flow](../03_flow/)（USER_FLOW / PAGE_FLOW / PAGE_SPEC）③ [05_sequence](../05_sequence/) ④ [07_design_system](../07_design_system/) ⑤ [prototype](../prototype/)（v1-new + platform 四实例）。
> 审计问题定义：产品定义的能力是否完整映射到页面、入口、状态与交互路径——遗漏页面 / 遗漏入口 / 遗漏状态 / 页面在但功能不可达 / 功能在但无 UI 承载 / 状态定义但页面未表现 / HTML 与 PRD/PAGE_SPEC 不一致。
> 方法：静态通读（specs 全量 + v1-new 全部实现文件 + 平台实例说明文档）+ 全仓 grep + **Playwright 运行时实证**（临时起服 8943，加载 v1-new，逐路径点击 P005「重新检测」捕获 console/pageerror）。
> 禁止事项遵守：未据个人理解新增功能、未据竞品补页面、未据旧代码推断产品需求；每条结论附文件路径+小节。

---

## 1. 总体结论

**有条件通过：修复 1×P0 + 2×P1 后可进入 D1 开发。**

- **产品定义层无缺口**：29 在册功能（F001–F030 去 F023，FEATURE_MAP §2）中 27 项有完整页面承载与可达入口；F017 无页面入口（P-04 关闭决策）、F030 不做（P-05 关闭决策）均为规范内闭环，非遗漏。9 页（P001–P010 除 P004）与 PAGE_SPEC 一一对应，无无效页面、无孤儿页面。
- **原型实现层存在 1 个 P0 运行时缺陷**：P005「重新检测」按钮点击即抛 `p005Diagnose is not defined`（引用存在、定义缺失），F024 的核心用户动作与 `checking→live` 状态转换经用户操作**不可达**；该缺陷随内核字节同步波及 wechat/app/desktop 三壳（web 无此页不涉及）。详见 §7【P0-1】。
- **2 个 P1**：F020 扫码失败三分类（取消/权限/失败）无 UI 分支且不可达（页面留有从未赋值的 `qrErr` 死状态字段）；P006 自 P003/P007 进入不按 PAGE_SPEC §6「进入即连接复用」执行（自 P001 进入自动连接，自 P007 进入显示「未连接」与会话事实矛盾）。详见 §7【P1-1】【P1-2】。
- **7 个 P2**：均为演示数据/字段级展示缺口（P001 已连接计数文案、P009 品牌卡字段、P010 限制条数 3/8、授权拒绝场景、F005 fallback 中间级、扫描瞬态、OTA 相位子集），不阻塞开发——开发实现以规范为准，不受 mock 演示范围限制。
- 状态机覆盖总体健康：STATE_MODEL §1 九台状态机在页面层基本可达可表现（逐组核对见 §5）；Smart HID「特殊设备 = 标准设备能力 × Profile 扩展」红线合规（§4 S2 节）。
- 历史验证记录（v1-new 26/26、四实例多轮 Playwright、A-01/A-02 回归）**均未覆盖 P005「重新检测」按钮点击**——场景库对 p005 采用直接置态方式（app.js:447-459 场景定义不经过该动作），这是 P0 缺陷存活至今的原因，也再次印证 09_test 空态/动作断言固化的必要性（09_test/HTML_QA_REPORT 遗留建议）。

---

## 2. 功能覆盖矩阵（F001–F030）

> 列口径：**PRD 定义** = PRD.md §5 功能列表（摘录）；**入口位置** = 用户可达入口（含动作，动作→结果全链契约见 08_development/API_ACTION_MATRIX.md）；**状态覆盖** = STATE_MODEL §1/STATE_MACHINE §1–§9 状态在页面的表现；**HTML 是否体现** = prototype/v1-new（三壳内核同源）实际呈现。所属域沿用 FEATURE_MAP §1 六域。

### 2.1 设备发现域

| 编号 | 名称 | PRD 定义（§5） | 页面 | 入口位置 | 可达 | 状态覆盖 | 异常覆盖 | HTML | 缺口 |
|---|---|---|---|---|---|---|---|---|---|
| F001 | BLE 扫描 · P0 | 5s 会话/节流合并/RSSI 降序/上限 100/自动停+toast | P001 | 工具条主按钮；空态 A 的 action（p001-scan.js:23） | ✅ | 待开始/扫描中/完成标签+失败横幅（SM §7；starting/stopping 瞬态未呈现） | 扫描失败横幅含 code+重试（场景 app.js:427） | ✅ | P2-6 |
| F002 | 扫描权限前置 · P0 | 授权检查与引导（横幅+去设置） | P001 | 「开始扫描」前置触发（app.js:200-202） | ✅ | 蓝牙三态导航栏状态点（p001-scan.js:14,27） | 蓝牙未开 10001 modal / 平台不支持 / 扫描失败横幅（场景 ×3，app.js:427-429）；授权拒绝横幅分支无专门场景（app 实例已演示同型，app/PAGE_SPEC.md §2） | ✅ | P2-4 |
| F003 | 扫描筛选 · P0 | RSSI 滑杆+4 预设/前缀/隐藏无名/重置 | P001 | 「筛选」文字链 → filter-panel | ✅ | 空态双文案实时切换（filterList，p001-scan.js:53-61） | 重置回默认 | ✅ | — |
| F004 | 广播数据查看 · P0 | 弹窗展示广播各字段/复制/缺失如实标注 | P001 | 点设备卡本体（advdlg，app.js:225-247） | ✅ | 字段缺失三级标注（未提供/长度 0/整包不存在） | — | ✅（A-02 整改后 AD 逐段+Service Data/Service UUIDs） | — |
| F005 | 显示名智能解析 · P1 | name→AD 0x09/0x08→Profile→厂商→「未命名 BLE·ID后四位」 | P001 | 列表渲染（devCard，components.js:77,92） | ✅（被动呈现） | fallback 端点「未命名 BLE 设备/（未命名）」已证 | — | 部分 | P2-5（中间级无演示数据） |

### 2.2 GATT 调试域

| 编号 | 名称 | PRD 定义（§5） | 页面 | 入口位置 | 可达 | 状态覆盖 | 异常覆盖 | HTML | 缺口 |
|---|---|---|---|---|---|---|---|---|---|
| F006 | GATT 连接 · P0 | 8 态会话/服务发现/MTU | P006 | P001「连接」/P007 点卡/P003「高级 BLE 调试」 | ✅ | 服务面板五态 idle/connecting/ready/empty/error（p006-gatt.js:18-40；SM §1/§9） | 路由无效空态（p006-gatt.js:12-13）；连接超时重试文案 | ✅ | P1-2（进入自动连接不一致） |
| F007 | 服务树浏览 · P0 | 折叠列表/UUID 中文名/全部展开收起 | P006 | 服务面板（ready 态） | ✅ | 折叠/展开/批量切换 | 服务空态专用文案 | ✅ | — |
| F008 | 特征读取 · P0 | HEX+TEXT 双格式/3s 超时 | P006 | 特征行「读取」（app.js:299-301） | ✅ | 「接收」日志双格式 | 3s 超时文案 | ✅ | — |
| F009 | 特征写入 · P0 | TEXT/HEX 双模式/写队列/非法拦截 | P006 | 「写入」→ write-dialog（app.js:312-317） | ✅ | 模式切换/队列串行 | 空输入/非法 HEX 拦截 toast | ✅ | — |
| F010 | Notify 监听 · P0 | 防抖去重/断线清理 | P006 | 「开始监听⇄停止监听」（app.js:304-309） | ✅ | notifying 同步+推送日志 | 防抖文案 | ✅ | — |
| F011 | 通信日志 · P0 | 六色/清空/复制导出/容量上限 | P006 dock / P008 card | logbar 清空/导出（components.js:104-114） | ✅ | 六色类型+空态 | 空日志 toast「暂无日志」 | ✅ | — |
| F012 | 断线自动重连 · P0 | 被动断线/3 次 backoff/主动断开不重连 | P006/P007 | 被动断线场景（app.js:466-469）+主动断开 | ✅ | 重连日志（1/3 backoff→READY 恢复） | 写队列 abort 文案 | ✅ | — |
| F013 | 多设备会话管理 · P1 | 已连接列表/单台与批量断开/失败清单 | P007 | tabBar「已连接」 | ✅ | multi/one/双空态（p007-connected.js:5-20） | 批量断开部分失败 modal 清单（app.js:332-336） | ✅ | — |

### 2.3 广播发射域

| 编号 | 名称 | PRD 定义（§5） | 页面 | 入口位置 | 可达 | 状态覆盖 | 异常覆盖 | HTML | 缺口 |
|---|---|---|---|---|---|---|---|---|---|
| F014 | 广播发射（微信）· P1 | peripheral 模式/冲突拦截/devtools 提示真机 | P008 | tabBar「广播」→ 开始广播 | ✅ | 徽章六值全可达（p008-broadcast.js:19-23；SM §5） | 活动连接冲突/devtools 拦截/启动失败（app.js:489-495） | ✅ | — |
| F015 | 广播发射（App）· P1 | LysBlePeripheral/权限与蓝牙开闭前置/模式功率可连接 | P008 | 同上（Android 场景/覆写层激活） | ✅（app 实例） | 同六徽章；picker×2+三开关由覆写层激活（app/PAGE_SPEC.md §2 P008 行） | 蓝牙未开 Intent/权限缺失 modal（app.js:341-342） | ✅ | — |
| F016 | 广播负载预算 · P1 | 31B 实时核算/超限阻止不截断 | P008 | 表单实时输入 | ✅ | N/31+超限红字+AD 逐项明细（p008-broadcast.js:50-57） | 超限禁用启动按钮（BR-05 不静默截断，p008-broadcast.js:60） | ✅ | — |
| F017 | 观察侧证据匹配 · P2 | 服务层就绪、无页面入口 | 无（P-04 关闭） | — | **有意不可达**（PRD 变更记录 D1 行：不做独立入口） | — | — | ✅（评审面板现状标注，COVERAGE_CHECKLIST F017 行） | 规范内闭环（N-5 红线：开发不得加入口） |

### 2.4 Profile 配网域

| 编号 | 名称 | PRD 定义（§5） | 页面 | 入口位置 | 可达 | 状态覆盖 | 异常覆盖 | HTML | 缺口 |
|---|---|---|---|---|---|---|---|---|---|
| F018 | Profile 设备识别 · P0 | UUID STRONG/前缀 WEAK/徽章与专属动作 | P001（徽章）/P007（分流） | 扫描期自动匹配；SHID 卡双入口（components.js:96-99） | ✅ | STRONG/WEAK 双徽章（mock.js:19,51） | 无匹配走通用路径（PR-6） | ✅ | — |
| F019 | 配网向导 · P0 | 三阶段/步骤条/断线续填/离开确认 | P002 | SHID 卡「配置」/P003「重新配置」/P005「重新配网」 | ✅ | phase 三态+四行进度五态+工作流四态（SM §3/§4） | 身份验证失败/断线续填/离开确认（BR-10，app.js:151-158） | ✅ | — |
| F020 | ControlHub 配对码扫码 · P0 | shid://pair 解析/回填/token 内存 5min/取消权限失败分类 | P002 | configure 阶段大动作卡（p002-provision.js:48-52） | ✅（仅成功路径） | badge 必需→已获取 | **取消/权限/失败三分类提示无分支、无场景**（qrErr 字段定义后从未赋值，p002-provision.js:8 vs app.js:255-256 恒成功） | 部分 | **P1-1** |
| F021 | 分帧加密写入+状态跟踪 · P0 | framed-v1/加密写重试/STATUS 60s | P002 | 「下发配置」（canSubmit 联动） | ✅ | 四行推进至 READY（app.js:134-150） | 8 错误码中 3 类+timeout 有场景（app.js:436-438,258-259） | ✅ | — |
| F022 | 配网错误恢复 · P0 | 8 错误码→中文提示+恢复动作 | P002 | status 失败态恢复按钮（p002-provision.js:60-61） | ✅ | 四分流按钮文案随错误变（form/pairing/diagnostics/retry） | — | ✅ | — |
| ~~F023~~ | ~~已配网设备历史~~ | **已移除（2026-09-02）** | — | — | 不得复刻 | — | — | ✅（评审面板 PAGE004 ✕ 标注，app.js:97-98） | 红线行（N-4） |
| F024 | Smart HID 诊断 · P1 | 五项链路/错误码详情/栈感知导航 | P005 | P003「运行诊断」/P002 恢复 diagnostics | 入口 ✅；**主动作断** | 六态字面支持（p005-diagnostics.js:9）；**checking→live 经用户动作不可达**（见 P0-1） | offline 连接确认/error 场景 ✓（app.js:458-459） | 部分 | **P0-1** |

### 2.5 OTA 域

| 编号 | 名称 | PRD 定义（§5） | 页面 | 入口位置 | 可达 | 状态覆盖 | 异常覆盖 | HTML | 缺口 |
|---|---|---|---|---|---|---|---|---|---|
| F025 | OTA 固件升级 · P1（BLOCKED） | 12 态/六重校验/分包/版本回读 | P006（子流程） | 「固件更新」仅 hasOtaService（p006-gatt.js:42） | ✅ | 演示 7 相位（pick/validating/transferring/committing/verifying/success/failed，app.js:172-185,385-391）；**BLOCKED 预警两处在位**（p006-gatt.js:54 页面 note + app.js:394 弹窗头 P-03） | sha256 不符终止/取消 abort | ✅（契约演示口径） | P2-7（12 态演示子集） |

> S5 专项判定：**BLOCKED 状态展示 ✓**（上述两处预警 + P010 限制卡第一条「OTA 端到端链路 BLOCKED」mock.js:105）；弹窗内流程为 mock 演示（选包按钮无真实文件选择），不构成「可执行升级流程」，符合 PAGE_SPEC §6 OTA 子流程「契约保留 + 端到端 BLOCKED」口径（DEVELOPMENT_SCOPE §5）。

### 2.6 系统信息与支撑域

| 编号 | 名称 | PRD 定义（§5） | 页面 | 入口位置 | 可达 | 状态覆盖 | 异常覆盖 | HTML | 缺口 |
|---|---|---|---|---|---|---|---|---|---|
| F026 | 日志脱敏 · P0 | 敏感键→***（R28） | 横切（P006/P008/P009） | 日志路径被动呈现 | ✅ | token=*** 条目（app.js:149,474）+ P009 页脚声明（p009-about.js:43） | — | ✅ | — |
| F027 | 版本元数据展示 · P2 | 关于页+版本页消费 Release Metadata | P009/P010 | tabBar「关于」→「版本记录」 | ✅ | verFallback 回退场景（app.js:498）+ 三列表空态（p010-versions.js:10-15） | — | ✅ | P2-3（限制条数 3/8） |
| F028 | 推广跳转 · P2 | navigateToMiniProgram 直跳/非微信渠道承接（部分实现：二维码待实现） | P009 | 推广卡（p009-about.js:21-24） | ✅ | 失败 modal 场景（app.js:499-501）；非微信承接 sheet 在 app/desktop/web 实例覆写层 | — | ✅ | 小程序码为示意图形（PRD §5 F028「二维码待实现」——开发期需真实预生成资源） |
| F029 | 分享 · P2 | 微信页面级分享/APP 系统分享/H5 navigator.share | P009 | 「分享应用」菜单 | ✅ | 平台分支 toast | 失败降级复制（app 实例覆写） | ✅ | 页面级 onShareAppMessage/onShareTimeline 属平台能力，原型不承载（开发期落地） |
| ~~F030~~ | ~~国际化~~ | **未实现且不做**（P-05 关闭） | — | — | 不得引入 | — | — | ✅（全中文现状=R30） | 红线行（N-6） |

---

## 3. 页面覆盖矩阵

| 页面 | 规范定义 | HTML 实现（v1-new） | 缺失/差异 |
|---|---|---|---|
| P001 扫描 | PAGE_SPEC.md §1 | pages/p001-scan.js | P2-1（工具条「M 台已连接」计数未呈现，PRD.md §6 PAGE001 展示内容；口径已在 TabBar 角标实现 app.js:79-83）；P2-6（starting/stopping 瞬态） |
| P002 配网向导 | PAGE_SPEC.md §2 | pages/p002-provision.js | P1-1（扫码失败三分类无分支）；无设备上下文守卫态为页面自加的防护态（p002-provision.js:17-19，与 P003 守卫同型，非违例） |
| P003 SHID 详情 | PAGE_SPEC.md §3 | pages/p003-hid-detail.js | —（记录不存在守卫 app.js:63-68、字段缺失「—」、协议未记录 chip、P-02 说明行、三出口齐备） |
| P004 历史 | PAGE_SPEC.md §4【已移除】 | 无实例；评审面板标注「PAGE004 ✕」（app.js:97-98） | —（符合移除决策） |
| P005 诊断 | PAGE_SPEC.md §5 | pages/p005-diagnostics.js | **P0-1（重新检测动作断）**；connected 态无预设场景（六态 word map 字面支持，p005-diagnostics.js:9） |
| P006 GATT 调试 | PAGE_SPEC.md §6 | pages/p006-gatt.js | P1-2（进入自动连接行为不一致）；IA-01 标题「GATT 调试」✓ |
| P007 已连接 | PAGE_SPEC.md §7 | pages/p007-connected.js | —（四 mode + 批量失败清单 + SHID 分流 app.js:325-329 齐备） |
| P008 广播 | PAGE_SPEC.md §8 | pages/p008-broadcast.js | —（六徽章/预算/平台分支/默认值预填 mock.js:133-137 齐备） |
| P009 关于 | PAGE_SPEC.md §9 | pages/p009-about.js | P2-2（品牌卡缺「技术栈 chips+总体状态」，PRD.md §6 PAGE009 展示内容） |
| P010 版本记录 | PAGE_SPEC.md §10 | pages/p010-versions.js | P2-3（当前限制 mock 3 条 vs PRD 口径 8 条）；平台状态双值显示✓（p010-versions.js:34-35） |

平台实例（对照 prototype/platform/）：

| 实例 | 页面集 | 依据 | 审计结论 |
|---|---|---|---|
| wechat | 基准 9 页（内核字节复制 + wxhost.js 宿主维度） | wechat/PAGE_SPEC.md §1 | 页面集完整；宿主/devtools 拦截 ✓；**共担 P0-1** |
| app | 基准 9 页（内核 + android.js 六覆写点） | app/PAGE_SPEC.md §1/§2 | 页面集完整；权限链/系统配对/广播增强/分享/推广承接 ✓；**共担 P0-1** |
| desktop | 基准 9 页（内核 + desktop.js） | desktop/PAGE_SPEC.md §1/§2 | 页面集完整；扫码+粘贴兜底/三栏/OS 维度 ✓；**共担 P0-1** |
| web | 6 屏子集（W1–W6，独立内核） | web/PAGE_SPEC.md §1 | **有意子集**（D3 暂缓）：缺 P003/P005/P007/P010 对应屏，缺失域显式 ✗+指引（W4/W5）；W2 SHID 双入口 ✓；无 p005 故不涉及 P0-1 |

无「无效页面」（HTML 无 PAGE_SPEC 之外的页面）；无「页面存在但规范未定义」项。

---

## 4. 入口遗漏清单（旅程 S1–S6 逐项）

| 旅程 | 检查点 | 结论 |
|---|---|---|
| S1 设备发现 | 首页进入扫描（默认 tab）/ 开始 / 停止 / 设备卡点击（advdlg）/ 连接入口（普通卡 primary + SHID 卡 soft，components.js:96-99）/ Profile 入口（配置 Smart HID primary） | ✅ 全部可达 |
| S2 配网 | 普通设备 → 仅「连接」无配网入口（DR-3 配网非连接必然 ✓）；Profile/SHID 设备 → 「配置 Smart HID」存在且与「连接」**不混淆**（双入口并存、主次分明） | ✅；配置入口存在 ✓ |
| S3 GATT | 服务列表 / Characteristic（props chips）/ Read / Write（弹窗）/ Notify / 日志（dock） | ✅ 全部可达 |
| S4 广播 | 广播查看（P001 弹窗）/ 广播解析（AD 逐段）/ 广播发送（P008）/ 参数设置（表单+Android 增强）/ 状态反馈（六徽章+日志） | ✅ 全部可达 |
| S5 OTA | BLOCKED 状态展示（两处预警+P010 限制卡）✓；流程为 mock 契约演示、无真实可执行升级 | ✅ 合规（PAGE_SPEC §6 子流程；DEVELOPMENT_SCOPE §5） |
| S6 多设备 | 多连接（3 台含 SHID）/ 会话列表 / 批量断开（含部分失败清单） | ✅ 全部可达 |

入口遗漏条目（按严重级）：

1. **【P0-1 关联】P005「重新检测」入口存在但动作断**——点击即 ReferenceError，入口形同虚设（app.js:276-282 引用无定义；运行时证据见 §7）。
2. **【P1-1】P002 扫码失败三分支不可达**——唯一扫码动作恒成功（app.js:255-256），「取消/权限/失败」分类提示（PAGE_SPEC.md §2 按钮表「扫描 ControlHub 配对码」行）在 v1-new 及三壳均无触发路径；v0-old 曾以模拟扫码弹窗演示四分支（09_test/COVERAGE_CHECKLIST.md F020 行），v1-new 重构时未迁移。
3. **【P1-2】P006 进入行为不一致**——自 P001 进入自动连接（app.js:213-217 调 p006Connect），自 P003/P007 进入停 idle 需手动连接（app.js:272-273,325-329 无调用）；PAGE_SPEC.md §6「操作与响应：进入（解析上下文→适配器→连接复用…）」要求进入即连接（复用会话），自 P007 进入显示「未连接」与已连接事实矛盾。
4. **平台能力入口（原型外，非缺陷，开发期落地）**：微信分享卡片落地（P001/P007/P008/P009/P010 进入条件之一，PAGE_SPEC.md §1/§7/§8/§9「进入条件」）；页面级 onShareAppMessage/onShareTimeline（F029）；chooseMessageFile 真实文件选择（P06-12）。
5. **无「PRD 功能完全没有页面」项**（F017 为 P-04 关闭决策，非遗漏）。

---

## 5. 状态遗漏清单（对照 STATE_MODEL.md §1 / STATE_MACHINE.md）

| 状态组 | 定义 | 页面表现 | 用户动作 | 转换路径 | 错误恢复 | 遗漏 |
|---|---|---|---|---|---|---|
| 扫描 | idle / scanning / empty(两文案) / found / failed | ✅（标签+列表+横幅，p001-scan.js:14-29） | 开始/停止/重试 ✅ | ✅ | 横幅+重试 ✅ | starting/stopping 瞬态未呈现（SM §7 四态；P2-6） |
| 连接 | disconnected / connecting / connected / ready / error | ✅（状态点+面板五态，p006-gatt.js:16-40） | 连接⇄断开/重试 ✅ | ✅ | error+重试 ✅ | P007 已连接会话进入 P006 呈现「未连接」（P1-2，状态失真） |
| 配网 | waiting / sending / success / failed | ✅（四行进度+READY 卡，p002-provision.js:56-73） | 下发/取消等待/查看设备/恢复 ✅ | ✅ | 四分流 ✅ | qrErr 死字段（P1-1 关联，p002-provision.js:8 从未赋值） |
| 广播 | idle(未就绪) / advertising / stopped / error(失败) | ✅（六值徽章，p008-broadcast.js:19-23） | 启停/检查支持 ✅ | ✅ | 失败日志+重试 ✅ | — |
| P005 诊断（附加组） | 六态（SM §8） | 字面支持 ✅（p005-diagnostics.js:9） | **重新检测断**（P0-1） | checking→live 经用户动作**不可达** | offline/error 场景 ✅ | **P0-1** |
| OTA（附加组） | 12 态（SM §6） | 7 相位演示 ✅ | 选包/取消 ✅ | ✅（主链） | hash 失败 ✅ | SUBSCRIBING/STARTING/READY 相位未演示（PAGE_SPEC.md §6 状态列表；P2-7） |

其余状态机（会话 8 态、重连、配网工作流、设备侧 STATUS）均经 P002/P006/P007 场景与动作可达可表现，无「状态模型定义但页面没有表现」的其他项。

---

## 6. 平台差异遗漏

| # | 项 | 结论 | 依据 |
|---|---|---|---|
| 1 | wechat 宿主系统维度（wxhost） | ✅ 无遗漏：宿主切换/devtools 三处拦截（横幅+检查不支持+启动拦截）/C1·C3 待裁决标注 | wechat/PAGE_SPEC.md §2/§3；wechat/PLATFORM_SPEC.md §2/§2b |
| 2 | app（Android）六覆写点 | ✅ 无遗漏：权限链/广播前置/系统配对 2s 重试/广播增强（picker+三开关+预算联动）/系统分享/推广承接；补充态已按 STATE_MODEL §3 登记（app/PAGE_SPEC.md §3） | app/PLATFORM_SPEC.md §3 |
| 3 | desktop 差异 | ✅ 无遗漏：配对码扫码为主+粘贴兜底/P006 三栏/OS 三形态+BlueZ 待验证提示/退出确认 | desktop/PAGE_SPEC.md §2/§3 |
| 4 | web 子集缺失 | **有意缺失，非遗漏**：缺 P003/P005/P007/P010 对应屏，系 D3 暂缓 + 「GATT 调试器」子集定位；缺失域显式 ✗+指引（W4/W5），W2 SHID 双入口与基准同口径 | web/PAGE_SPEC.md §1；10_platform/PLATFORM_EXTENSION.md §6 D3 行 |
| 5 | iOS 不演示 | 符合现状：iOS NOT_RELEASED（P008 platform 分支与默认值 SmartBLE-I 已预留，mock.js:136） | 10_platform §2.2/§3；PRD.md §1.2 |
| 6 | 三壳共担缺陷 | **P0-1 随内核字节同步波及 wechat/app/desktop 三实例**（grep 证实三壳 app.js 均为「有引用无定义」；web 独立内核无 p005 不涉及） | prototype/platform/README.md §2 共享口径；本轮 grep 证据 |
| 7 | 平台能力项（原型不承载、开发期落地清单） | 微信分享卡片入口 / 页面级分享 / navigateToMiniProgram 真实调用 / 小程序码真实预生成资源（F028 待实现）/ chooseMessageFile | PAGE_SPEC.md §9；PRD.md §5 F028 |

---

## 7. P0 / P1 / P2 问题清单

### P0（核心功能不可用/流程断裂/状态不可达）

**【P0-1】P005「重新检测」点击即 ReferenceError，F024 核心动作与 checking→live 转换经用户操作不可达（四实例同病）**

- 现象：点击 P005 主按钮「重新检测」无任何反应，console 抛 `p005Diagnose is not defined`；offline 态经「连接并检测」确认后同样断裂。
- 证据：
  - 引用存在：prototype/v1-new/app.js:280、:282（`p005Diagnose()` 两处调用）；
  - 定义缺失：v1-new 全目录 + 三壳覆写层（wxhost.js/android.js/desktop.js）grep 无任何 `p005Diagnose` 定义（web/high-fi 亦无，其为独立内核）；
  - 运行时实证（Playwright，临时服务 8943）：idle 直点与 offline→modal 确认两路径均捕获 `PAGEERROR: p005Diagnose is not defined` ×2，状态分别停滞于「尚未检测」「设备未连接」；
  - 波及面：wechat/app/desktop 三壳 app.js 为基准字节拷贝（prototype/platform/README.md §2），同病；web 无 p005 页不涉及；
  - 引入时点：git HEAD 版本即存在（commit 2b25725 及入库 commit 9b91cc7 均为「有引用无定义」），自内核诞生即有；历轮 Playwright 断言未点击过该按钮（p005 场景直接置态，app.js:447-459），故存活至今。
- 违反：PRD.md §8 R20（重新检测=核心验收动作）；PAGE_SPEC.md §5「按钮列表与行为·重新检测」行；用户规则「页面流程无法完成/状态无法达到」。
- 判级：P0。

### P1（功能有入口但缺状态/流程不一致/异常路径缺失）

**【P1-1】F020 扫码失败三分类（取消/权限/失败）无 UI 分支、不可达**

- 证据：prototype/v1-new/pages/p002-provision.js:8 定义 `qrErr:null` 后**全仓无任何赋值/渲染**（死状态字段）；prototype/v1-new/app.js:255-256 `p002-qr` 动作恒成功（直接回填+toast）。
- 违反：PAGE_SPEC.md §2 按钮表「扫描 ControlHub 配对码」行（「失败按取消/权限/失败分类提示」）；PRD.md §5 F020 描述。09_test/COVERAGE_CHECKLIST.md F020 行记载的「成功/取消/权限/失败四分支」为 v0-old 原型口径，v1-new 重构未迁移。
- 判级：P1（异常路径缺失）。

**【P1-2】P006 进入自动连接行为不一致，P007 已连接会话进入显示「未连接」**

- 证据：prototype/v1-new/app.js:213-217（P001 入口：`go('p006')` 后调 `p006Connect()` 自动连接）vs app.js:272-273（P003「高级 BLE 调试」）与 app.js:325-329（P007 点卡）均仅 `go('p006')`，页面停留 idle/未连接（p006-gatt.js:5-8 defaults）。
- 违反：PAGE_SPEC.md §6「操作与响应·进入（解析上下文→适配器→**连接复用**→超时→重试→GATT 发现）」；PRD.md §6 PAGE006 同口径。自 P007 进入的设备已在连接列表（MOCK.connected），呈现「未连接」为状态失真。
- 判级：P1（页面流程不一致+状态呈现失真；流程未断裂可手动连接，故不升 P0）。

### P2（字段/文案/演示数据缺口——不阻塞开发）

| # | 问题 | 依据 |
|---|---|---|
| P2-1 | P001 工具条「N 台设备·M 台已连接」的 **M（已连接计数）未呈现**（N 已有 chip）；口径本身已在 TabBar 角标正确实现（app.js:79-83 通用连接+SHID 在线 +1） | PRD.md §6 PAGE001 展示内容 |
| P2-2 | P009 品牌卡缺「技术栈 chips + 总体状态」两个字段（现为 logo/名称/版本/渠道/一句话描述） | PRD.md §6 PAGE009 展示内容第 1 项 |
| P2-3 | P010 当前限制卡 mock 仅 3 条，PRD 口径 8 条（UI 机制已证：列表渲染+空态） | PRD.md §6 PAGE010 展示内容；prototype/v1-new/mock-data/mock.js:105 |
| P2-4 | 授权拒绝横幅（reason 分类，如 bluetooth_permission_denied）无专门场景（ebanner 通路可承载任意 code；app 实例已演示同型分支） | PAGE_SPEC.md §1 异常处理·权限状态；app/PAGE_SPEC.md §2 P001 行 |
| P2-5 | 显示名 fallback 中间级（AD 0x09/0x08→Profile 名→厂商）无演示数据（mock 无「无 name 但 AD 0x09 有名」设备；端点「未命名 BLE」已证） | PAGE_SPEC.md §1 数据展示规则 |
| P2-6 | 扫描会话 starting/stopping 瞬态未呈现（工具条标签仅 待开始/扫描中/完成/失败） | 04_architecture/STATE_MACHINE.md §7 |
| P2-7 | OTA 12 态仅演示 7 相位主链（SUBSCRIBING/STARTING/READY 相位无演示） | PAGE_SPEC.md §6 状态列表；STATE_MACHINE.md §6 |

---

## 8. 开发前必须修复项

> 本审计未修改任何代码；以下为修复建议与波及面评估，**具体修复待用户另行下发任务**。

| # | 级别 | 必修项 | 建议修法 | 波及面 |
|---|---|---|---|---|
| M-1 | **P0（进开发前必须修）** | 补齐 `p005Diagnose` 定义（或等效实现 checking→live 检测流程） | 在 app.js 补函数：置 `state='checking'` → 定时后写入五项行结果与 `state='live'`（复用 app.js:448-453 场景数据）；或最小修复=把两处调用改为直接置态 | v1-new + wechat/app/desktop 四实例 app.js 字节同步 + 四壳升版本戳 + 回归断言**必须新增「点击重新检测」用例**（补上历轮断言盲区） |
| M-2 | P1（强烈建议） | F020 扫码失败三分类补分支与场景 | `p002-qr` 增加 qrErr 赋值路径（或加 3 个场景按钮：取消/权限/失败，复用 ebanner/toast 分类文案） | 同上四实例（若改内核）或仅基准+同步；PAGE_SPEC.md §2 已有文案契约 |
| M-3 | P1（强烈建议） | P006 进入自动连接统一（P003/P007 入口补 `p006Connect()` 或会话复用直接 ready） | app.js `p003-gatt`/`p007-open` 两动作补连接流调用；P007 入口建议直接呈现 ready（会话复用语义） | v1-new + 三壳同步 + 升戳 |
| M-4 | P2（可与开发并行） | P2-1～P2-7 | 多为 mock 数据/字段补齐；开发实现以规范为准，不受 mock 演示范围限制 | 原型层 |

**结论重申**：产品定义（02_product/03_flow）与页面映射关系**未发现缺口**；上述问题全部为原型实现层缺陷/演示缺口。M-1 修复并回归通过后，原型层即可作为 D1 开发（微信 + App·Android）的交互与视觉基准放行；M-2/M-3 建议随 M-1 同轮处理（均为 app.js 单文件级改动+四壳同步）。

---

## 附：审计证据登记

- 静态：v1-new 全部实现文件通读（app.js 508 行 / pages ×9 / components.js / mock-data）；specs 事实源全量（02_product 五件套 / 03_flow 三件套 / 04_architecture 状态机 / 07 组件 / 08_development 五件 / 09_test / 10_platform / 11_ecosystem 对齐注记 / prototype 平台四实例说明文档）。
- grep：`p005Diagnose` 全仓检索（v1-new + platform 四实例 + 覆写层）——仅三壳内核 app.js 各 2 处引用、0 处定义。
- 运行时：临时 `python3 -m http.server 8943` + Playwright（chromium）加载 v1-new，执行 P005 两路径点击，捕获 `PAGEERROR: p005Diagnose is not defined` ×2；临时服务与脚本已随审计结束清理。
- git：`git log -- docs/specs/prototype/v1-new/app.js`（2b25725 / 9b91cc7）+ `git show HEAD:...` 确认缺陷自入库即存在。
