# BLE Toolkit+ 基准原型 V1（高保真）

> 按《产品基准原型 Base Prototype 规范 v1.0》产出的**平台无关产品交互基准**，微信小程序形态（375×812 移动基准）。
> 严格遵循冻结输入：[PRD](../../02_product/PRD.md) · [PAGE_SPEC](../../03_flow/PAGE_SPEC.md) · [Design System](../../07_design_system/)（TOKEN/COMPONENT/PATTERN）。
> 已吸收 06_review 全部 B 类（P-02/P-03/U-01/U-03/IA-01）与 HTML QA Q1/Q2/Q3 整改项。
> 验证：Playwright 冒烟 26/26 断言通过 · console 0 error · 视觉复核通过（2026-09-02）。

## 修订记录

- **v1.0.7（2026-09-03 · M-2 整改：F020 扫码失败三分类补齐）**：审计 P1-1（PAGE_CAPABILITY_COVERAGE_AUDIT §7）落地——`p002-qr` 此前恒成功（app.js 直接回填+toast），PAGE_SPEC §2「失败按取消/权限/失败分类提示」在 v1-new 及三壳无触发路径，`qrErr` 为从未赋值的死字段。本轮迁移 v0-old「模拟扫码弹窗四分支」口径：`p002-qr` 调起**模拟扫码面板**（真机为系统扫码界面 uni.scanCode，原型以面板演示四种结果；X/遮罩关闭 = 用户取消，真机退出相机同义）；**扫码状态机 idle → scanning（面板）→ success / error（reason = cancel/permission/invalid）**，成功语义逐字保留（token 生成/hub 回填/toast/badge/标题变重新扫描）。三分类内联展示（p002-provision.js 激活 `qrErr`）：cancel=扫码取消+重新扫码（不算错误·warn）/ permission=权限拒绝+去设置+重新扫码（err）/ invalid=二维码无效+重新扫码（err，文案含 shid://pair 口径）；`p002-repairing` 复位扫码态。desktop.js 覆写层取景器 sheet 同步挂内核三分类按钮（防内核被遮蔽），dtkOk/dtk-parse 补 qrState 一致性。内核（app.js+p002-provision.js）字节重同步三壳（戳 → 三壳 `?v=1.4.6`，本壳 `?v=1.1.7`；web 无 P002 不涉及）。验证：真实点击 Playwright 32/32（成功/取消/X 关闭/权限/无效 + error→success 恢复回路 + 配网流程回归 T5 + 三壳抽查），0 PAGEERROR · console 0 error，复跑稳定；见 06_review/QR_ERROR_STATE_FIX_REPORT.md。
- **v1.0.6（2026-09-03 · M-1 整改：P005 补齐 p005Diagnose 统一诊断入口）**：审计 P0-1（PAGE_CAPABILITY_COVERAGE_AUDIT §7，ReferenceError 运行时错误）落地——`p005-run`（重新检测按钮）两处调用 `p005Diagnose()` 但内核从未定义该函数，点击即抛 PAGEERROR、状态永久停滞「尚未检测/设备未连接」。本轮在 `app.js` 新增 `p005Diagnose(device)` 定义（**唯一新增函数，既有行零改动**）：状态机严格按 STATE_MACHINE §8 / STATE_MODEL #8 既有页面六值 + 行级五值（**不新增状态**）——idle/live 点击 → `checking`（五行 pending→active 逐项推进）→ `live`（五行 ok 结论，明细文案逐字取自场景库「检测完成 · 全正常」，F024 五项不变）；异常分支（`S.shared.diagFail` 预置，注入机制同 `provFailCode`/`otaFailPreset`）→ `error`（检测失败）+ 错误详情 + modal「请让设备进入配网/恢复模式后重试」（PAGE_SPEC P005 错误态口径）。并发安全：`DIAG_RUN` 运行令牌防跨运行 tick 窜扰（error→立即重检路径实测发现旧运行残留 tick 复活窜扰新运行，令牌 + fail 分支终结核运行双修复）；`checking/connecting` 防重入。offline/error 守卫 modal（连接并检测/取消）、connecting 按钮禁用、页面结构/Profile 流程零改动。内核字节重同步三壳（戳 → 三壳 `?v=1.4.5`，本壳 `?v=1.1.6`；web 独立内核无 P005 不涉及）。验证：真实点击 Playwright 36/36（空闲检测 / 离线连接检测 / 异常分支 / 错误恢复回路 / P003·P002 真实进入路径 / P006·P007 回归 / 微信壳抽查），0 PAGEERROR · console 0 error，复跑稳定；见 06_review/P005_DIAGNOSE_FIX_REPORT.md。
- **v1.0.5（2026-09-03 · M-3 整改：P006 连接状态统一读取会话注册表）**：审计 P1-2（PAGE_CAPABILITY_COVERAGE_AUDIT §7）落地——P001/P003/P007 三路径进入 P006 此前各自为政（P001 自动连接、P003/P007 停 idle，自 P007 进入已连接设备却显示「未连接」）。本轮在 `app.js` 新增 `p006Enter()` 统一入口：以 `MOCK.connected`（会话注册表）为唯一事实源，命中=连接复用（立即「已连接」+ready+「连接复用」日志），未命中=走既有 `p006Connect()` 连接流（「连接中」→「已连接」）；显示映射沿用页面既有三元（已连接/连接中/未连接，**不新增状态**）；`p006-disconnect` 同步清理注册表条目（与 p007-disconnect 同语义，杜绝陈旧会话被复用）。三个调用点迁移（p001-connect / p003-gatt / p007-open 非分流支）；Profile 卡分流 P003、redirectTo、导航结构零改动（**不改页面流程**）。内核字节重同步三壳（戳 → 三壳 `?v=1.4.4`，本壳 `?v=1.1.4`→`?v=1.1.5`；web 独立内核 W3 选择器入口不涉及）。验证：三路径 ×（注册表命中复用 / 未命中连接流 / 分流保留 / 断开一致性 / 回归）Playwright 26/26，console 0 error；见 06_review/P006_SESSION_STATE_FIX_REPORT.md。
- **v1.0.4（2026-09-03 · A-01 遗留收尾：empty 组件 act 缺省不再渲染空胶囊）**：`components.js` B6 empty 定义中 act 缺省分支原为 `C.btn({label:'',tone:'soft'})`——一个 36×40 无文案无 data-act 的空胶囊，A-01 报告 §5.1 观察项。本轮改为 `${act?C.btn(…):''}`（act 有值渲染 soft 按钮，缺省不渲染 action UI），与 B6 契约「**可选** action」对齐；组件签名/页面调用/产品逻辑零改动。受影响空态分支：p001 筛选无匹配 / p003 记录不存在 / p006 路由无效 / p010×2（内核 5 分支）+ web 壳 W4/W5（独立 components.js 同款修复）。内核字节重同步三平台壳（wechat/app/desktop 资源戳 → `?v=1.4.3`，本壳 → `?v=1.1.4`）；web 壳 components.js 同修（→ `?v=1.4.1`）。验证：A-01 断言集全量复现通过 + 空胶囊消失新断言（.empty 内 0 按钮）+ CTA 保留断言（p001-A/p007 恰 1 按钮）+ web W3/W5 act 分支，共 62/62，console 0 新错误；见 06_review/EMPTY_COMPONENT_FINAL_FIX_REPORT.md。
- **v1.0.3（2026-09-03 · A-01 整改：C.empty 调用契约统一）**：`components.js` B6 empty 组件定义为对象参数 `empty({ill,title,desc,act})`（act={label,icon,act}），但 6 处页面调用（p001-scan×1 双分支 / p003-hid-detail×1 / p006-gatt×1 / p007-connected×1 双文案 / p010-versions×2）仍用位置参数——解构字符串导致 title 渲染 `undefined`、插图回退 box，全部空态损坏。本轮仅迁移调用点为对象参数（组件 API、产品逻辑、页面流程、CSS 零改动，文案与行为逐字保留），5 个页面文件随后字节重同步三平台壳（wechat/app/desktop 资源戳 → `?v=1.4.2`，本壳 → `?v=1.1.3`）；Web 壳调用本就为对象参数不动。遗留观察项：组件定义在 act 缺省时渲染空 label soft 胶囊（36×40），见 06_review/EMPTY_COMPONENT_FIX_REPORT.md §5（已于 v1.0.4 修复）。
- **v1.0.2（2026-09-03 · A-02 整改：F004 广播弹窗字段补齐）**：`app.js` p001-advdlg 按 PRD R04 / COMPONENT C2 重写——补 设备 ID / 名称 独立行、Service UUIDs、AD 结构逐段（长度/类型/HEX mono）、Service Data 字段；Service UUIDs / Manufacturer Data / Service Data 单字段缺失逐项标注「本轮平台 API 未提供此字段」。`mock.js` advertisement 增 serviceUuids / serviceData / adStructures 示例（字段名对齐 REVERSE §7.1；adStructures 为预置分段展示数据，非运行时解析），hex 重排为 AD 自洽帧（长度字节=段长-1，分段拼接=整包，node 校验通过）。三平台实例内核随后字节重同步（wechat/app/desktop 资源戳 → `?v=1.4.1`，本壳 → `?v=1.1.2`）；Web 实例无此弹窗（D3 子集范围外）不动。
- **v1.0.1（2026-09-03 · 用户平台走查修正）**：`components.js` devCard——特殊设备（Smart HID）是标准设备的扩展，首页卡片在「配置 Smart HID」之外恢复标准「连接」入口（原实现二选一，特殊设备丢失标准 GATT 链路）。标准设备卡渲染不变；三平台实例内核随后字节重同步。同轮：本壳与四平台壳的资源 URL 加 `?v=1.0.1` 版本戳——`python3 -m http.server` 不发缓存头，浏览器会启发式缓存旧内核 JS 导致「改了却看不到」（用户与 Playwright 均命中）；戳版本后正常刷新（Cmd+R）即取新内核。
- **v1.0（2026-09-02）**：初版通过用户走查门禁。

## 运行

```bash
cd docs/specs/prototype/v1-new
python3 -m http.server 8941
# 浏览器打开 http://127.0.0.1:8941/index.html
```

左栏评审桌面：页面直达（PAGE001–010，PAGE004 标记已移除）· 当前页场景库（幂等）· 页面栈实况（uni 路由语义）。右栏手机即产品。

## 页面设计覆盖检查表（Base Prototype 规范 §13 八项）

| # | 验收项 | 覆盖 | 证据 |
|---|---|---|---|
| 1 | 所有 PRD 功能存在 | ✅ 29/29（F001–F030 去 F023） | 各页 `feats` 映射（见下表）；Playwright 实测核心链路 |
| 2 | 所有页面存在 | ✅ 9/9（PAGE004 已移除，评审面板标灰） | 逐页 jump 断言 |
| 3 | 所有流程可走通 | ✅ S1–S6 | S1 扫描→连接→读取/写入/监听；S2 三阶段→READY→redirectTo；S3 断线→诊断五项；S4 广播预算→启动；S5 OTA 相位（含 BLOCKED 预警）；S6 批量断开（含失败清单） |
| 4 | 所有核心状态存在 | ✅ 六态 × 关键页 | 场景库 47 个：P001×6 / P002×7 / P003×3 / P005×5 / P006×8 / P007×5 / P008×10 / P009×2 / P010×1（2026-09-03 微信直跳修正 +1） |
| 5 | 异常流程存在 | ✅ 4 类 | 蓝牙链路（断线重连/队列 abort）/ 权限（蓝牙未开/扫码/广播权限）/ 数据（记录不存在/服务空/字段缺失 —）/ 用户取消（离开确认/取消等待/扫码取消） |
| 6 | 数据模型明确 | ✅ 真实结构 | mock.js：RSSI 大写 · advertisement{state,present,byteLength,length,hex} · profileMatch{level,profileId} · 真实 GATT UUID（1800/180F/4FAFC201/FFE0）——QA Q2 对齐 |
| 7 | 页面入口完整 | ✅ | PAGE_FLOW 全跳转实测（含 redirectTo/栈感知） |
| 8 | 功能编号映射完整 | ✅ | 每页注册 `feats:[F0xx…]`，见下表 |

### 页面 ↔ 功能 ↔ 状态映射

| 页面 | 功能（feats） | 六态入口（场景库） |
|---|---|---|
| P001 扫描 | F001 F002 F003 F004 F005 | 就绪 / 扫描中(页内) / 失败横幅 / 双空态 / 蓝牙未开·平台不支持 |
| P002 配网 | F018 F019 F020 F021 F022 | 三阶段 / 连接失败 / 表单断线 / READY / 三错误码恢复 |
| P003 详情 | F018 F021 | 快照 / 记录不存在 / 字段缺失 |
| P005 诊断 | F024 | pending×5 / 全 ok / Wi-Fi 异常 / offline / 连接失败 |
| P006 调试 | F006–F012 F025 | idle / ready / error / 服务空 / 断线重连 / 脱敏日志 / OTA 两预设 |
| P007 已连接 | F006 F013 | 3 台 / 1 台 / 双空态 / 批量失败 |
| P008 广播 | F014 F015 F016 | 微信/Android/Web 平台 × 就绪/冲突/未开/权限/广播中/超限/失败 |
| P009 关于 | F026 F027 F028 F029 | 版本回退 |
| P010 版本 | F027 | 三列表空态 |

## 本轮吸收的整改项（对照 06_review / QA 报告）

| 项 | 落地 |
|---|---|
| P-02 PAGE003 会话说明 | 详情页 info 说明条「本次配网会话的内存快照…」 |
| P-03 OTA 受限预警 | P006 服务树 ready 时 warn 说明条 + OTA 弹窗头部 BLOCKED 预警 |
| U-01 离开确认扩展 | 配网中 **或** configure 脏表单（SSID/Hub/token 任一非空）返回均弹确认；离开清空敏感数据 |
| U-03 广播禁用解释 | Web 场景 warn 说明条「浏览器未提供外围模式 API…」 |
| IA-01 P006 标题 | 「GATT 调试」（原「设备详情」歧义消除） |
| Q1 场景幂等 | scenReset：apply 前复位页面态 + 相关 MOCK（连接数/广播态/徽章） |
| Q2 字段对齐 | RSSI / advertisement 嵌套 / profileMatch，广播弹窗按真实结构展示 |
| Q3 组件收敛 | devCard / logPanel 全局唯一定义（components.js），无页面级重复实现 |

## 组件列表（全部来自 07_design_system/COMPONENT.md）

骨架：app-navbar · subnav · tab-bar（角标=通用连接+配网在线）
通用：btn(5 变体×2 尺寸) · chip(6 色) · badge · kv · form-field(input/password/select/switch/slider) · empty-state(4 插图) · op-state · error-banner · banner-note(info/warn)
业务：device-card(scan/conn/SHID) · adv-sheet · filter-panel · service-panel(五态) · log-panel(dock/card 六色) · provision-stepper · provision-progress · diag-row · write-dialog · ota-dialog · promo-card · summary-card
全局层：toast · modal（对应 uni.showToast/showModal，遮罩不可点关） · sheet

## 资源清单（全自包含，零外部依赖）

- `assets/tokens.css` —— CSS 变量（Design Token 唯一实现，交付物②）
- `assets/components.css` / `assets/pages.css` —— 组件与布局样式（仅引用 Token）
- `index.html` 内联 SVG sprite —— 30 枚 24×24 线性图标（stroke 1.8/currentColor）+ 4 幅空态插图（components.js ILL）
- `mock-data/mock.js` —— 真实结构模拟数据（GATT UUID 与 REVERSE_ANALYSIS §8 硬件契约一致）
- 无字体/图标/图片外链；无 favicon 依赖（QA O2 同源处理）

## 开发注意事项（映射 React / Vue / Flutter / UniApp）

1. **架构对应**：`S`（单一状态源）→ Store（Pinia/Redux/Riverpod）；`renderAll` 纯视图函数 → 声明式渲染；`ACTIONS` 唯一变更入口 → actions/methods；事件委托 data-act → 绑定事件。无双向绑定黑盒：输入走 `data-in` 受控桥。
2. **路由语义**：switchTab / navigateTo / redirectTo / 栈感知（getCurrentPages）已按 uni-app 语义模拟，Web 用 router、Flutter 用 Navigator 1:1 映射（P002→P003 必须 replace 语义）。
3. **样式迁移**：颜色/字号/间距/圆角只取 tokens.css 变量；小程序 rpx = px×2；Flutter 用 `AppTokens` 常量类直读 hex。
4. **弹层映射**：modal/toast 对应 uni.showModal/showToast（遮罩不可关闭、toast 不阻断）；sheet 用 bottom sheet 组件实现。
5. **动画边界**：仅 opacity/transform 过渡 + 唯一 spinner 旋转（800ms linear）——全部平台原生可实现，无路径/滤镜特效。
6. **必须保留的交互规则**：无全屏遮罩 loading；双空态文案；错误码→恢复按钮文案映射（mock.js provErrors 8 码）；31B 超限不静默截断；日志脱敏 `token=***`；离开确认两档（配网中/脏表单）。
7. **禁止**：页面内重复实现 devCard/logPanel（统一走组件）；圈外色值；新增商业功能（登录/会员/云同步等 PRD 边界外项）。

## 文件结构

```
v1-new/
├── index.html          # 壳：评审桌面 + 手机 + SVG sprite + 脚本装载
├── README.md           # 本文件
├── assets/             # tokens.css / components.css / pages.css
├── mock-data/mock.js   # 真实结构模拟数据
├── components/components.js  # 组件注册表 window.C
├── pages/p001…p010     # 9 页模块（渲染函数 + 受控输入表）
└── app.js              # S / 路由 / ACTIONS / 全局层 / 幂等场景库
```
