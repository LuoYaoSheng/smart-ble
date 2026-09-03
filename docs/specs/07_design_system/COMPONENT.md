# COMPONENT —— 公共组件规格（全平台共享）

> Design System 三件套之二 · 2026-09-02 冻结 v1.0
> 效力：页面禁止重复造相似组件（QA Q3 整改项：devCard 单一来源）。实现参考 [prototype/v1-new/components/components.js](../prototype/v1-new/components/components.js)（`window.C` 注册表）与 [assets/components.css](../prototype/v1-new/assets/components.css)。
> 命名沿用 uni-app 组件粒度，便于直接映射 Vue/UniApp；Flutter 侧对应 Widget 化。

---

## A. 骨架类

### A1. app-navbar（tab 页自绘导航栏）
- 结构：kicker（--fs-micro 品牌蓝）+ 标题行（--fs-title）+ 右侧蓝牙状态（`bt-dot` 圆点 + 状态词 chip）。
- 状态：就绪（success 点+微光）/ 未开启（danger 点）/ 平台不支持（muted 点）。
- 用于：PAGE001 / 007 / 008 / 009。

### A2. subnav（二级页导航栏）
- 结构：返回键（--c-fill 圆角方块 + chevron-left）+ 标题（--fs-h1）+ 右槽（可选副按钮）。
- 标题文案规范：**PAGE006 =「GATT 调试」**（IA_REVIEW IA-01，与 PAGE003「Smart HID 设备详情」区分）。
- 行为：返回键 → navigateBack。

### A3. tab-bar
- 四项：扫描(i-scan)/已连接(i-link)/广播(i-cast)/关于(i-info)；激活 = 品牌蓝 + 图标实底胶囊；角标：已连接数（通用连接+SHID 会话在线，口径见 PRD）。
- 仅 switchTab，无返回。

## B. 通用元件

### B1. btn
- 变体：primary（品牌蓝渐变+阴影）/ danger / ghost（透明+语义色描边）/ soft（--c-fill 底+主文字）/ soft-danger。
- 尺寸：md（高 40，主操作）/ sm（高 32，行内）/ block（width:100%）。
- 状态：disabled（--c-ph 文字 + --c-fill 底，无阴影）；loading（文案前 spinner + 禁用）。

### B2. chip（标签）
- 弱底+深语义前景（--fs-mini）；变体：neutral/primary/success/danger/warning/mono（等宽）。
- 用途：功能编号（F030 风格编号 chip）、设备标签、日志类型、平台标签。

### B3. badge（状态徽章）
- 点+词 或 底色胶囊；用于广播六值徽章（广播中/失败/已停止/已就绪/未就绪/不支持）、配网 token 徽章（必需→已获取）、连接徽章（已连接⇄已断开）。

### B4. kv（键值行）
- `k`（--fs-cap --c-mut，宽固定）+ `v`（--fs-body，可 .mono）；缺失值显示「—」不隐藏行（PAGE003 规则）。

### B5. form-field
- 变体：input（--c-fill 底/聚焦 primary 描边）/ password（右侧眼睛开关）/ select（picker 模拟）/ switch（语义开关，激活=success，禁用=广播中）/ slider（RSSI 阈值）。
- 校验反馈：非法 = 底部黄条（warning），不弹窗。

### B6. empty-state（空态）
- 结构：插图（§7 4 幅）+ 主文案（--fs-h1）+ 说明（--fs-body --c-mut）+ 可选 action（soft 按钮）。
- 双空态规范（PAGE001）：未扫描 / 筛选无匹配 两套文案；PAGE007 两套；PAGE010 三套。

### B7. op-state（内联操作态，加载/结果块）
- 变体：loading（spinner+文案）/ ok / warn / error（+重试按钮）。
- 规则：**无全屏遮罩 loading**（PAGE_SPEC §0.2）；用于服务面板五态、配网连接态、OTA 相位。

### B8. error-banner（错误横幅）
- danger-weak 底 + danger 左条 + 标题（含 error.code，mono）+ 描述 + 重试按钮。用于扫描失败、配网连接失败。

### B9. banner-note（说明条，v1 新增）
- 变体：info（primary-weak）/ warn（warning-weak，可含 icon）。
- 固定用途：**P-02** PAGE003「本次会话快照」说明行；**P-03** OTA 入口受限预警（BLOCKED）；**U-03** 广播页禁用解释（为何平台不支持）；配网隐私声明（常驻表单底部）。

## C. 业务组件

### C1. device-card（设备卡，单一来源）
- 变体：`scan`（头像字母块+名称+RSSI 四格信号条+dBm+mono deviceId+按钮区）/ `conn`（头像 ON 徽标+meta「已连接 · 可进行 GATT 调试」+断开 danger sm）。
- SHID 变体：profileMatch 徽章（STRONG 强匹配 primary / WEAK 弱匹配 warning）+「配置 Smart HID」主按钮。
- 已连接态：连接按钮变「已连接」disabled。
- 信号条：RSSI 四档（≥-60 四格 / ≥-70 三 / ≥-80 二 / 其余一）。

### C2. adv-sheet（广播数据底部抽屉）
- 标题「广播数据 · {name}」；AD 结构逐段（长度/类型/HEX mono 块）；平台未提供字段标注「本轮平台 API 未提供此字段」；长度 0 标注「字段存在但长度为 0」；底部「复制数据」soft +「关闭」。

### C3. filter-panel（筛选面板）
- 展开/收起（文字链切换）；RSSI 预设 ×4 chip + 滑杆；名称前缀输入；隐藏无名开关；重置过滤 soft sm。实时生效无确认键。

### C4. service-panel（GATT 服务树）
- 五态：idle（提示卡）/ connecting（op-state）/ ready（服务折叠列表）/ empty（专用文案）/ error（op-state+重试）。
- 服务头：SIG 标准中文名或「服务 N」+ UUID mono chip + 折叠 chevron；特征行：名称 + 属性 chips（read/write/notify）+ 动作键（读取 soft sm / 写入 soft sm / 监听⇄停止 ghost sm）。
- 顶部「全部展开/全部收起」文字链。

### C5. log-panel（日志面板）
- 变体：`dock`（PAGE006 底部，深色 --c-ink）/ `card`（PAGE008 卡片白底）。
- 行：时间（mono --fs-mini）+ 类型 chip（六色 §1.4）+ 消息（.mono 数据段）；空态「暂无日志」；工具行：清空（ghost sm）/ 导出（soft sm）。
- 脱敏：敏感值显示 `token=***`（F026）。

### C6. provision-stepper（三步骤条）
- 连接设备 → 填写配置 → 下发状态；当前步 primary 实心圆，完成 success 对勾，未达 muted。

### C7. provision-progress（四行进度）
- 固定四项：Wi-Fi / ControlHub / MQTT 控制链路 / USB Ready；行四态 pending(空心)/active(旋转或高亮)/done(success 对勾)/fail(danger 叉)/warn。

### C8. diag-row（诊断行）
- 五项专用：图标（✓/!/…/·/✗）+ 状态词（正常/异常/检测中/待检测/失败）+ 可展开 detail；行五态与 provision-progress 同语义但独立样式（左侧图标列）。

### C9. write-dialog（写入弹窗）
- 目标特征摘要（mono）；TEXT/HEX 单选 chip；textarea；确认 primary / 取消 ghost。校验：空→toast「请输入数据」；HEX 非法（`01 ZZ`）→toast 拦截。

### C10. ota-dialog（固件升级弹窗）
- 头部 **P-03 warn 预警条**（端到端 BLOCKED 说明）；相位文案（确认设备/校验 sha256/传输中 N%/提交/回读）；进度条（primary）；取消（发 abort）/关闭；成功 2s 自动关闭；失败显示错误码（如 OTA_HASH_MISMATCH，mono）。

### C11. promo-card（推广卡）
- 关于页「更多小程序」：图标块+名称+说明+「前往」soft sm；微信端**点击直接发起 navigateToMiniProgram（无确认弹窗）**，无 appId→toast、失败→modal 重试（2026-09-03 对齐实证 openApp；失败分支=基准场景按钮）。
- 非微信渠道（APP/Desktop/Web，2026-09-03）：tap → 推广详情 sheet = 小程序码（示意图形）+ 主操作「打开落地页」（APP 系统浏览器 / Web 新标签 / Desktop 浏览器）+ 次操作保存/下载（演示）；承接规则=无微信直跳能力，落地页+二维码双出口。

### C12. summary-card（汇总卡）
- PAGE007 >1 台时：总数 + 主操作（全部断开 danger）。

## D. 全局层

### D1. toast
- 顶部下滑胶囊：success（带对勾图标）/ none（纯文字）；2s 自动消失。对应 uni.showToast。

### D2. modal
- 居中卡：标题（--fs-h2）+ 内容（--fs-body）+ 按钮组（confirmText primary / cancelText ghost；hideCancel 单按钮）+ 遮罩点击不关闭（uni 行为）。对应 uni.showModal。

### D3. sheet（底部抽屉）
- 圆角顶 + 抓手条 + 内容滚动区；遮罩点击关闭；用于 adv-sheet 等数据展示型弹层（区别于确认型 modal）。

---

## 页面 ↔ 组件授权表（禁止圈外拼装）

| 页面 | 授权组件 |
|---|---|
| P001 | app-navbar, btn, chip, device-card(scan), filter-panel, empty-state, error-banner, adv-sheet, toast/modal |
| P002 | subnav, provision-stepper, provision-progress, form-field, op-state, error-banner, banner-note, btn, badge |
| P003 | subnav, kv, chip, btn, banner-note, modal |
| P005 | subnav, diag-row, op-state, btn, modal |
| P006 | subnav, btn, chip, service-panel, log-panel(dock), write-dialog, ota-dialog, banner-note |
| P007 | app-navbar, device-card(conn), summary-card, empty-state, btn, modal |
| P008 | app-navbar, form-field, badge, chip, banner-note, log-panel(card), modal, btn |
| P009 | app-navbar, btn, chip, promo-card, kv, modal/toast |
| P010 | subnav, kv, chip, btn, empty-state |
