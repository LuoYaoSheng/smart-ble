# HTML_DEVELOPMENT_READINESS_AUDIT —— HTML 原型开发前风险审计

> 审计日期：2026-09-03
> 审计对象：`docs/specs/prototype/v1-new/`（基准原型 V1）+ `docs/specs/prototype/platform/{wechat,app,desktop,web}/`（四平台实例，low-fi + high-fi）
> 审计依据：[PRD.md](../02_product/PRD.md)（含 2026-09-02/03 变更记录）· [PAGE_SPEC.md](../03_flow/PAGE_SPEC.md) / [PAGE_FLOW.md](../03_flow/PAGE_FLOW.md) · [TOKEN.md](../07_design_system/TOKEN.md) / [COMPONENT.md](../07_design_system/COMPONENT.md) / [PATTERN.md](../07_design_system/PATTERN.md) · [PLATFORM_EXTENSION.md](../10_platform/PLATFORM_EXTENSION.md)
> 审计性质：**只读审计，未修改任何原型代码**。全部结论附文件/行级证据；两项 P1 均经 node 运行时复现确认。

---

## 0. 总体结论

**有条件通过（可进入开发准备，2 项 P1 建议先修复）。**

- 基准原型 v1-new 与三平台实例（wechat/app/desktop）架构干净：平台实例内核（9 页 + components.js + mock.js + app.js）与基准**逐字节一致**（diff 验证），平台差异全部收敛在末位加载的覆写层（wxhost.js / android.js / desktop.js），符合「先有产品，再有平台」原则与 Generic layers + profile extension 架构约束。
- Web 实例为独立子集内核（W1–W6，「GATT 调试器」形态），与 10_platform §6 D3 决策（开发暂缓、原型先行）一致。
- 用户指定的七类红线风险（本地存储 / OTA 提前实现 / 登录会员云端 / 平台改流程 / Profile 破坏普通流程 / 圈外按钮 / 功能缺失）**红线全部未破**；发现的问题集中在「组件 API 签名不匹配」「P0 功能字段不完整」「口径缝隙」三类，共 **2 项 P1 + 8 项 P2**。
- ⚠ 审计过程发现 README 声称的「Playwright 冒烟 26/26 通过」与实际状态矛盾（见 A-01：P001 首屏默认空态即渲染 `undefined`）——说明既有冒烟断言**未覆盖空态文案**，QA 空态覆盖存在盲区，修复后需补断言。

---

## 1. 七类专项风险核查（红线结论）

| # | 风险项 | 结论 | 证据 |
|---|---|---|---|
| 1 | HTML 有按钮但 PRD 未定义 | **✓ 通过** | 逐页比对 PAGE_SPEC 各页「按钮列表与行为」。产品界面内无圈外功能按钮。页面中出现的额外可点元素均属三类合法设施：①原型评审设施（左栏评审桌面 jump/scen，不在手机画面内）；②平台系统层还原（android.js 系统权限/配对/分享/设置/浏览器弹窗、desktop 窗控 ─ ▢ ✕、wx.css 胶囊、web 浏览器选择器——各 CSS 头注均有豁免声明）；③候选能力拦截演示（web W6「试一下（将拦截）」、App「保存为日志文件（候选·未决策）」、Desktop 文件导出候选——均显式标注「候选/未决策」并拦截，符合 10_platform §2/§7「增强项逐条决策做/不做」）。无登录/会员/云类圈外按钮。 |
| 2 | PRD 有功能但 HTML 缺失 | **△ 局部缺失（A-02/A-03/A-04/A-05/A-08）** | 无整功能缺失（29 功能页面映射完整）；缺失均为字段/子项级：F004 弹窗字段（A-01 同级的 P1）、F015 Android 三开关基准缺（A-03）、F020 扫码失败分类不可演示（A-04）、P001 计数行（A-05）、F005 兜底文案偏差（A-08）。 |
| 3 | 平台 HTML 改变产品流程 | **✓ 通过** | diff 验证三端内核字节一致；覆写层行为全部有 10_platform 条目背书：android.js 权限/广播/分享（P002 自 2026-09-05 起不覆写，遵循 V1 明文直连）、desktop.js 扫码主路径+手输兜底与 P006 三栏、wxhost.js devtools 拦截。Web 子集裁剪为 D3 决策明确允许的形态，缺失域按 §7 检查 1 显式「不支持+指引发小程序/App」（W4/W5）。 |
| 4 | 特殊设备 Profile 破坏普通设备流程 | **✓ 基本通过（余 1 缝隙 A-06）** | 2026-09-03 修正①已落实：基准 devCard SHID 卡 = 「配置 Smart HID」primary + 标准「连接」soft 双入口（components.js:96-99，v1.0.1 注记）；Web W2 同口径（web.js:107-108）。普通卡渲染不受 profileMatch 影响。残余缝隙：P007 mock 把「配网会话」放进已连接列表 + 分流依据仅 profileId（A-06）。 |
| 5 | 零本地存储禁止功能 | **✓ 通过** | grep 全原型无 `localStorage/sessionStorage/document.cookie/indexedDB`；无网络 API（fetch/XHR/axios/WebSocket）；仅有的 `http://` 字符串在 web.js:411 浏览器地址栏「不安全上下文」模拟（合法演示）。P003 P-02 会话快照说明行、P002 隐私声明、P009「零后端·零本地持久化」均到位；p002Cleanup 离开清敏感数据 ✓。 |
| 6 | OTA 提前实现 | **✓ 通过** | OTA 仅以「演示流程」存在，且为 PATTERN §11 明确允许（「流程可演示」）。全部入口带 P-03 BLOCKED 预警：v1-new P006 页面 note（p006-gatt.js:54）+ ota-dialog 头部 warn 横幅（app.js:381）；入口仅 OTA 服务设备显示（hasOta 判定，p006-gatt.js:15,42）；Web W3 OTA 弹层同口径（web.js:444）。相位/版本回读/2s 自动关闭与 PAGE_SPEC PAGE006-OTA 一致；无任何「绕过 BLOCKED 可实际升级」的暗示。 |
| 7 | 登录/会员/云端暗示 | **✓ 通过** | grep 全原型（含 low-fi）无 登录/会员/vip/premium/云端/账号/付费/订阅（除 notify 订阅技术用语）字样；PRD §1.3 边界在 P009 品牌卡反向声明（「零后端 · 零本地持久化」）。推广卡为 PRD F028 已定义功能，非商业变现。 |

---

## 2. 问题清单（编号 / 严重度 / 问题 / 文件 / 依据 / 建议）

### P1（开发映射前必须修复）

| 编号 | 严重度 | 问题 | HTML 文件 | 规范依据 | 建议 |
|---|---|---|---|---|---|
| A-01 | **P1** | **`C.empty()` 签名不匹配，全部空态渲染损坏**。组件定义为对象参数解构 `empty({ill,title,desc,act})`（components.js:44），但 22 处调用点全部按位置参数调用（`C.empty('link','当前没有匹配设备',…)`）。运行时复现（node）：P001 首屏默认空态实际输出 `<div class="t">undefined</div>` + 空 label 幽灵按钮 + 插图恒为 box。后果：①空态主文案/说明全部丢失；②P001 未扫描空态的「开始扫描」CTA 按钮丢失（act 被忽略）；③radar/link/doc 三幅插图选择失效（TOKEN §7 空态插图规范作废）；④P010 三列表空态、P003 记录不存在兜底、P006 路由参数无效、P007 双空态同样中招。该 bug 经字节复制传导至 wechat/app/desktop 三实例（各 6-7 处）。**注意：v1-new/README 声称「Playwright 冒烟 26/26 通过」与此矛盾——首屏默认态即损坏，断言不可能见过 undefined 还通过，说明冒烟未覆盖空态文案（QA 盲区）。** | `v1-new/components/components.js:44`；调用点 `v1-new/pages/{p001-scan.js:19-22, p003-hid-detail.js:33, p006-gatt.js:13, p007-connected.js:17-20, p010-versions.js:11,14}`；平台同路径三份拷贝 | COMPONENT.md §B6 empty-state（结构=插图+主文案 --fs-h1+说明+可选 action）；PATTERN §3 六态模拟（空数据态必须可呈现）；TOKEN §7（4 幅插图按语义选用）；Base Prototype 规范 §13 项 5（异常/空流程存在） | 二选一：①调用点改为对象参数（与 web.js 现行用法一致，推荐——web.js:263 已是正确写法）；②组件兼容双签名（`empty(a,b,c,d)` 判类型分派）。修复后按页重跑空态断言（含「开始扫描」CTA 存在性、插图 id、文案非 undefined），并给三平台实例做字节重同步（沿用 v1.0.1 同步流程）。 |
| A-02 | **P1** | **广播数据弹窗（adv-sheet）字段不完整，F004 为 P0 功能**。R04 验收要求弹窗完整展示「设备 ID/名称/RSSI/**Service UUIDs**/原始广播数据/Manufacturer Data/**Service Data**」；COMPONENT C2 要求「AD 结构逐段（长度/类型/HEX mono 块）」。现实现（app.js p001-advdlg:222-234）仅展示：RSSI、profileMatch、整包 advertisement.hex 单块、厂商 ID 四项。缺：Service UUIDs 字段、Service Data 字段、AD 结构逐段拆解、设备 ID 独立行（deviceId 仅出现在无名称设备的标题后缀）。「平台未提供字段如实标注」仅覆盖 advertisement 整体缺失分支，未覆盖单字段缺失分支。 | `v1-new/app.js:222-234`（ACTIONS['p001-advdlg']）+ 三平台拷贝 | PRD §8 R04（F004·P0）；PAGE_SPEC §1 P001 按钮表「（点设备卡本体）」行为；COMPONENT.md §C2 adv-sheet；PATTERN §5「真实结构 MOCK」 | 按 C2 重写弹窗正文：标题下补 kv(设备 ID·mono)/kv(名称)；AD 逐段行（len/type/HEX，从 mock advertisement.hex 解析演示）；Service UUIDs 与 Service Data 独立 kv 行，mock 未提供的字段标注「本轮平台 API 未提供此字段」（与 R04 口径一致）；mock.js 可为 scanDevices 补 serviceUuids/serviceData 演示值。 |

### P2（建议修复或澄清后开发）

| 编号 | 严重度 | 问题 | HTML 文件 | 规范依据 | 建议 |
|---|---|---|---|---|---|
| A-03 | P2 | **P008 Android 三开关在基准原型缺失**。基准 p008 在 `platform==='android'`（场景「Android · 插件就绪」）下仅渲染模式/功率两个静态 picker；「可连接/包含设备名称/添加服务 UUID」三开关与「开关实时参与预算」未实现（F015）。android.js 覆写层已完整补齐（swBlock + bBytes，app 实例可用），但基准原型自身场景库切到 Android 时表单不完整；wechat/desktop 实例（内核字节一致）同样只在 app 实例完整。 | `v1-new/pages/p008-broadcast.js:43-45`（仅两个 picker）；对照 `platform/app/high-fi/android.js:25-32,372-379` | PAGE_SPEC §8 P008 输入表「可连接/包含设备名称/添加服务 UUID 开关 ×3 \| 仅 Android \| 实时影响 payload 构成与预算」；PRD F015 | 将三开关与开关感知预算上移进基准 p008（条件渲染 platform==='android'），android.js 退化为系统权限链；或基准场景按钮旁注明「Android 增强表单见 app 实例」。前者更符合「基准=产品全集」的 Base Prototype 定位。 |
| A-04 | P2 | **P002 扫码失败分类不可演示**。`qrErr` 字段已声明（p002-provision.js:8）但全代码无赋值路径，场景库 7 个场景无一覆盖「扫码取消/权限拒绝/内容非法」；p002-qr 恒成功。六态模拟的「权限态」在 P002 缺位。 | `v1-new/pages/p002-provision.js:8`、`v1-new/app.js:242`（恒成功）、场景库 p002 ×7 无扫码失败 | PAGE_SPEC §2 P002 异常*权限状态*「扫码权限拒绝→分类提示可重扫」；PRD §8 R16「扫非 shid://pair 或缺参内容时给出失败分类提示，可重扫」；PATTERN §3 六态 | 补 2-3 个场景：扫码取消（toast 分类提示·非错误）/ 权限拒绝 / 非 shid://pair 内容（qrErr 分类提示 + 大动作卡可重扫）；演示失败后重扫成功路径。 |
| A-05 | P2 | **P001 扫描工具条缺「N 台设备 · M 台已连接」计数**。PRD 明确工具条含该计数（已连接计数口径 = 通用连接 + SHID 配网会话在线）；现工具条仅状态标签 + 启停按钮，列表标题有 N 台 chip、tabbar 有角标，工具条计数缺。 | `v1-new/pages/p001-scan.js:29-33`（scantool） | PRD §6 PAGE001 展示内容「扫描工具条（状态标签/『N 台设备·M 台已连接』/启停按钮/…）」；PRD 场景 S6 计数口径 | 工具条状态行追加「N 台设备 · M 台已连接」（M 计算复用 app.js:80 tabbar 角标同源逻辑，保持口径单一）。 |
| A-06 | P2 | **P007 将 SHID「配网会话」放进已连接列表，且 profileId 分流存在产品口径缝隙**。①mock.connected 第三台 meta=「已连接 · Smart HID 配网会话」——按 PAGE_SPEC/PRD S6 口径「SHID 配网会话**不进此列表**但计入首页计数」，该演示数据与规范矛盾（若指 P003「高级 BLE 调试」产生的通用 GATT 会话，meta 文案误导）。②p007-open（app.js:312-316）对 profileId==='smart-hid' 一律分流 P003：当用户经 v1.0.1 恢复的 SHID 卡「连接」入口（标准 GATT 链路）建立会话后，在 P007 点卡会被送到 P003 配网快照页而非 P006，且无快照时触发「记录不存在」弹窗——字面符合「按 profileId 分流」，但与「特殊设备是标准设备的扩展」原则存在缝隙。 | `v1-new/mock-data/mock.js:39`、`v1-new/app.js:312-316` | PAGE_SPEC §7 P007「空态两种文案（SHID 配网会话在线→…这里列出**通用调试连接**）」与数据展示规则「SHID 配网会话不进此列表」；PRD 场景 S6；2026-09-03 修正①（PLATFORM_EXTENSION §6 注记） | ①mock 第三台改为通用 GATT 会话 meta（如「已连接 · 高级 BLE 调试」）或删除，另设「配网会话在线」空态场景演示计数口径；②产品侧澄清分流依据：建议按「会话类型」分流（配网会话→P003，GATT 会话→P006）而非仅 profileId，并在 PAGE_SPEC P007 行为表补一句；原型 p007-open 按澄清结果微调。此项涉及规范澄清，开发映射前决策即可，不阻断。 |
| A-07 | P2 | **基准 CSS 存在 Token 表外派生色值**。components.css/pages.css 及页面内联样式使用 #0E9A80（success 深色，×9+）、#C77E14（表内 read 色 ✓）、#7C8DA6、#FF8B94、#FFC37E、#FF6B74、#8FA3C0、#222C42、#1A2233 等未注册值（多为语义深色变体与评审栏控制台灰阶）。README「components.css/pages.css 仅引用 Token」表述与事实不符。平台还原图层四份 CSS 有头注豁免（合规），问题仅在基准三件。 | `v1-new/assets/components.css`、`v1-new/assets/pages.css`、页面 js 内联（如 p002:64 `#0E9A80`、p005:26 `#FF8B94`） | TOKEN.md §9.1「任何界面颜色…只能引用本表 Token；圈外值视为违例」；§1.3 控制台三色仅 ink/ink-line/ink-text | 高频深色变体注册为正式 token（如 `--c-success-deep:#0E9A80`、`--c-danger-strong:#FF8B94`），评审栏灰阶并入 §1.3 控制台色或登记豁免；同步修正 TOKEN.md 与 README 表述。不阻断开发（数值本身稳定），但应在样式迁移（rpx/ThemeData）前完成，避免表外值进入平台实现。 |
| A-08 | P2 | **显示名兜底文案与规范不一致**。规范兜底文案为「未命名 BLE · ID后四位」；devCard 实现为「未命名 BLE 设备」+ 完整 deviceId + （未命名）后缀，未按 ID 后四位截断。 | `v1-new/components/components.js:77,92` | PAGE_SPEC §1 P001 数据展示规则（多级 fallback 末级「未命名 BLE · ID后四位」）；PRD §8 R05；PATTERN §5 | 兜底名改为「未命名 BLE · XXXX」（deviceId 后四位）；（未命名）标注保留与否随兜底名一并统一。mock 两台无名设备可作验收样例。 |
| A-09 | P2 | **P006 服务面板 idle 态误用 loading 语义**。idle 态渲染 op-state loading（spinner 旋转 +「未初始化」），规范 idle = 静态提示卡（无进行中动作）。首屏出现旋转元素误导「正在初始化」。 | `v1-new/pages/p006-gatt.js:19` | COMPONENT.md §C4 service-panel 五态「idle（提示卡）」；PATTERN §2「内联加载」仅用于真实进行中状态 | idle 改用非 spinner 提示卡（op-state 增加 info/neutral 变体或复用 banner-note）；connecting 态保持 spinner 不变。 |
| A-10 | P2 | **P006「固件更新」入口位置与规范偏差**。规范定义在设备面板操作行（与清空日志/导出日志/连接断开同排），实现放在 subnav 右槽。功能等价、触达路径不同；P-03 预警不受影响。 | `v1-new/pages/p006-gatt.js:42`（subnav 右槽） | PRD §6 PAGE006 展示内容「设备面板（…/『固件更新』仅 OTA 设备/清空日志·导出日志·连接↔断开）」；PAGE_SPEC §6 P006 按钮表 | 迁回设备面板操作行（danger ghost sm），subnav 右槽留空或放「全部展开/收起」；或经评审确认接受偏差并在 PAGE_SPEC 备注。开发映射前统一即可。 |

---

## 3. 合规性正面确认（开发可直接依赖的事实）

1. **页面集与路由语义**：9 页齐全、PAGE004 评审栏标灰「已移除」✓；switchTab/navigateTo/redirectTo/栈感知（smartGo）与 PAGE_FLOW 逐条对应；P002→P003 redirectTo、P005 双栈感知导航、onPageShow P003 记录不存在守卫均正确（app.js:49-68）。
2. **零本地存储决策落地**：全链无持久化 API；P003 会话快照页带 P-02 说明；P002 离开清 token/pwd + 双档离开确认（provisioning / configure 脏表单，U-01 扩展）✓。
3. **OTA 受限模式（P-03）**：入口条件（hasOtaService）+ 页面预警 + 弹窗头部 BLOCKED 横幅 + 相位流程（校验→传输→提交→回读→2s 自动关闭）与 PATTERN §11 一致；失败演示（OTA_HASH_MISMATCH）在场景库。
4. **31 字节预算（F016）**：逐项核算（名称 2+len / UUID 2+len/2 / 厂商块 2+2+len）、超限红字、不静默截断、启动拦截（按钮 disabled + 启动二次校验）✓；Android 开关感知预算在 app 实例 ✓。
5. **平台覆写层质量**：wxhost.js（宿主三维 + devtools 拦截 + P008 defaults 包修）、android.js（FINE_LOCATION 链含「二次拒绝=永久拒绝→去设置」、ADVERTISE→CONNECT 逐项；P002 零系统配对不覆写）、desktop.js（OS 三系注册表 + 窗口 chrome 三形态 + 扫码取景器主路径/粘贴手输兜底 + 退出确认含活动会话明示）、web.js（环境门禁 + 域可用性矩阵 + W2 双入口 + 指引出口）——与 10_platform §2/§4 及各平台 PAGE_SPEC/PLATFORM_SPEC 文档逐条对得上，候选增强全部显式拦截不越权。
6. **生态矩阵注入不触碰产品**：三实例 + web 的「生态能力矩阵」卡仅渲染于评审栏/对比卡，冲突项（C1/C3/C2/C5）标「待裁决」且实证行为不翻转，符合 11_ecosystem 入库时的「应用代码零修改」约定。
7. **F028 非微信承接（2026-09-03）**：app/desktop/web 三端推广卡均为「落地页 + 小程序码（静态资源·零后端）」双出口，微信端保持直跳无确认弹窗——与 COMPONENT C11 修订口径一致。
8. **脱敏演示**：`token=***` 出现在日志场景与 P009 页脚 ✓。

## 4. 修复顺序建议

1. **A-01**（组件签名统一 + 三端字节重同步 + 空态断言补齐）——半小时级改动，但影响面最大（22 调用点）。
2. **A-02**（adv-sheet 字段补齐）——P0 功能验收项。
3. **A-06 ②**（P007 分流口径澄清）——需产品决策一句话，随后原型微调。
4. A-03/A-04/A-05/A-08/A-09/A-10——可与 1-3 同批小改；A-07 在样式迁移（rpx/ThemeData 映射）前完成即可。
5. 全部修复后：重跑 Playwright 冒烟并**新增空态断言组**（P001 双空态文案+CTA、P010 三空态、P007 双空态），版本戳递增（基准与四平台壳同步），避免 README「26/26」与实态再次脱节。

---

—— 审计完成。审计人：ZCode（开发前风险审计，只读）。本报告为 06_review 第 8 份审查文件，与既有 7 份（DATA_STORAGE/STATE/PRODUCT/UX/IA/PERMISSION/…）并列，作为进入 08_development 前的最后一道原型门禁。
