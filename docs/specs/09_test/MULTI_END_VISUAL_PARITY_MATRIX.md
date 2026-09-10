# 多端视觉一致性矩阵（MULTI_END_VISUAL_PARITY_MATRIX）

- 创建：2026-09-07 · Multi-end Parity Gate
- 验收对象：U-WX / U-AND / F-AND
- 事实源：[TOKEN.md](../07_design_system/TOKEN.md)（全平台唯一视觉数值来源）+ [COMPONENT.md](../07_design_system/COMPONENT.md) + [PATTERN.md](../07_design_system/PATTERN.md) + `prototype/v1-new/assets/tokens.css` + `prototype/platform/{wechat,app}`
- 判定值：`PASS / FAIL / NOT_AUDITED / ALLOWED_PLATFORM_DIFFERENCE(须引规范来源)`
- 基准视口：393×852 或实际 Android 设备逻辑尺寸；截图输出 `verification/windows-mobile-v1/<run-id>/parity/Pxxx/`
- 必须完全一致的语义：区块顺序/文案/控件数量/主次关系/状态色含义/空态含义/错误恢复动作/底部导航名。
- 允许的平台差异仅限：状态栏高度、安全区、系统字体字形、原生权限弹窗、系统分享面板、系统设置页、渲染亚像素差异。

## 1. 设计 Token 全局映射（三线逐项核对；2026-09-10 UI-CONV 轮回填静态档，N-IOS/N-MAC 列加入）

> 判定口径：`PASS·生成` = 单源生成产物+门禁（U/F: check-token-usage；Apple: `@generated` 生成段 + `--check` 逐字节比对，2026-09-10 晚收编——此前 `PASS·生成` 手写镜像值比对机制已随生成管道退役）；**静态值一致 ≠ 渲染级视觉一致，六态截图仍在 §2/§3 视觉 Gate 范围**。载体明细见 [DESIGN_TOKEN_PLATFORM_MAPPING.md](DESIGN_TOKEN_PLATFORM_MAPPING.md) §2/§3。

| Token（TOKEN.md） | 值 | 用途 | U-WX | U-AND | F-AND | N-IOS | N-MAC | 归因 |
|---|---|---|---|---|---|---|---|---|
| `--c-primary` | #1B6DFF | 主按钮/选中/TabBar 激活 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 2026-09-10 UI-CONV：五线值一致（生成/钉子机制见 mapping §2） |
| `--c-primary-deep` | #0E4FC4 | 按压态/渐变深端 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上；U 侧 v0 `--ble-brand-deep #134dbe` 已于 G0 收敛 |
| `--c-primary-weak` | #E8F1FF | 主色浅底 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上 |
| `--c-success` | #17C7A8 | 就绪/ok/广播中 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上 |
| `--c-danger` | #F2555F | 断开/停止/错误 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上 |
| `--c-warning` | #FF9F43 | warn/UUID 黄条 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上 |
| `--c-text` | #18222E | 主文字 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上 |
| `--c-sub` | #42536A | 次文字 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上 |
| `--c-mut` | #60758D | 弱文字 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上 |
| `--c-line` | #E3EAF3 | 强分割/卡片描边 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上 |
| `--c-fill` | #F1F5FB | 次按钮/输入框底 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上；v0 `--ble-bg-bottom #eaf2fb` 2026-09-10 收敛至此 |
| `--c-bg` | #F8FBFF | 页面背景 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成 | 同上 |
| `--c-card` | #FFFFFF | 卡片背景 | PASS·生成 | PASS·生成 | PASS·生成 | PASS（Color.white 直用，非 NativeDS 成员） | PASS·生成（NSColor.white） | 同上 |
| deep/weak 全族（success/warning/danger deep+weak 等 7 值） | TOKEN.md §2 | 深色阶前景/弱底 | PASS·生成 | PASS·生成 | PASS·生成 | 部分未镜像（I1 登记） | PASS·生成 | mapping §2.1/§2.5；F 侧 provisioning 16 深色阶 2026-09-10 收敛 |
| ink 族/日志六色/派生色 | TOKEN_REFERENCE §2 | dock 深色/日志 chip/头像渐变/note 前景 | PASS·生成 | PASS·生成 | PASS·生成 | 不适用/部分 | PASS·生成 | mapping §2.2–§2.4 |
| 字号层级 | TOKEN.md §字号 | 标题/正文/meta/mono | PASS·生成 | PASS·生成 | PASS·生成 | ALLOWED_PLATFORM_DIFF（Dynamic Type） | ALLOWED_PLATFORM_DIFF（系统字体+DS.mono） | mapping §3；iOS ScaledFontTests 锁可读档 |
| 字重 | TOKEN.md §字重 | — | PASS·生成 | PASS·生成 | PASS·生成 | 同上 | 同上 | mapping §3 |
| 圆角 | TOKEN.md §圆角 | 卡片/按钮/输入 | PASS·生成 | PASS·生成 | PASS·生成 | PASS·生成（sm/md/lg） | PASS·生成（sm..xl） | mapping §3 |
| 间距 | TOKEN.md §间距 | — | PASS·生成 | PASS·生成 | PASS·生成 | NOT_AUDITED（未成体系，差距登记） | PASS·生成（sp1–8） | mapping §3 |
| 阴影 | TOKEN.md §阴影 | 卡片投影 | PASS·生成 | PASS·生成 | PASS·生成 | NOT_AUDITED（未成体系） | NOT_AUDITED（未成体系） | mapping §3 差距登记 |
| 按钮高度 | TOKEN.md | 主/次按钮 | PASS | PASS | PASS | PASS（44pt 命中区） | PASS | COMPONENT_CONTRACT 各组件登记；Apple 无障碍 Gate |
| 输入框高度 | TOKEN.md | — | PASS | PASS | PASS | PASS | PASS | 同上 |
| TabBar 高度/图标语义 | TOKEN.md/PATTERN.md | — | PASS | PASS | PASS | N/A | N/A | 2026-09-07 PARITY-ICON：四 Tab 字形统一为正典 scan/link/cast/info（U-WX/U-AND PNG 烤色 / F-AND AppIcon），构建+静态+测试验证；同设备截图待视觉 Gate |
| 图标字形（35 枚 `i-*` sprite） | TOKEN.md §7 | 全部页内图标 | PASS | PASS | PASS | 平台原生 SF Symbol 语义对照（Apple 线独立图标体系） | 同左 | 2026-09-07 PARITY-ICON：三线统一经镜像渲染（[DESIGN_TOKEN_PLATFORM_MAPPING.md](DESIGN_TOKEN_PLATFORM_MAPPING.md) §1）；uniapp 文字标记仅保留正典规定的 ✓/✕/·；Material 图标退役 |
| 空态插图（4 幅 `C.ILL`） | 原型 components.js B6 | P001/P007/P010 等空态 | PASS | PASS | PASS | 文字+图标空态（平台惯例） | 同左 | 2026-09-07 PARITY-ILL：radar/link/doc/box 三线锁定镜像（AppIll），U-WX 方形白底 PNG 与 F-AND Material 顶替字形全部退役 |
| 占位/插画类资产透明底 | TOKEN.md/正典结构 | 全部空态/插画槽位 | PASS | PASS | PASS | N/A | N/A | PARITY-ILL：占位资产 100% 来自正典 SVG 镜像（无背景矩形），`static/placeholders` 8 文件删除、零引用（静态断言锁定） |
| P009 品牌标 | 原型 p009 | 关于页品牌卡 | PASS | PASS | PASS | PASS（品牌渐变=NativeDS primary→primaryDeep，钉子值） | 同左（DS） | PARITY-ILL：品牌标=渐变盒+bt 字形（非位图），other-apps PNG 与 F-AND 紫渐变退役；~~推广缩写块~~随 F028 于 2026-09-10 整链移除（原型+五线+product 配置清除，DATA_SKIP 同步撤销） |
| 分享/启动器位图 | §1.6 管线 | 微信分享/F-AND 启动器 | PASS | PASS | PASS | 图标资产在位（AppIcon.appiconset 全梯队；是否经 §1.6 管线同源未登记） | 图标资产在位（AppIcon.icns；同源未登记） | PARITY-ILL：ChatGPT2API(gpt-image-2) 统一生产（蓝渐变+BT 字形），logo/share/launcher/mipmap/splash 同源派生；UI-G2 §3 启动图接入（U-AND/F-AND）；Apple 线图标来源待登记 |

> 数值逐项以 TOKEN.md 当前版本为准；本表摘录核心项，回填时如正典有增补按正典补行。实现侧 Token 映射表见 `DESIGN_TOKEN_PLATFORM_MAPPING.md`（§1 图标 2026-09-07、§2/§3 色彩与尺寸 2026-09-10 已交付）。**2026-09-10 UI-CONV：LEGACY_DRIFT 登记清零**（v0 漂移值全量收敛正典，机制保留——再出圈外值即 FAIL）。

## 2. 逐页视觉项（每页正常/空/加载/错误/权限/关键弹窗六态截图后回填）

> 2026-09-10 UI-CONV 注记：**结构/组件/文案/图标位对齐已由 UI-G2（2026-09-09 全页面轮）完成**（导航 AppNavbar/AppSubnav 9 页、正典组件接管、构建+测试门禁，见 [UI_G2_FULLPAGE_ALIGNMENT.md](../06_review/UI_G2_FULLPAGE_ALIGNMENT.md) §1）；本表判定值仍以**六态截图证据**为准——静态对齐不折算为 VISUAL_PASS。

| 页面 | 视觉要点（PAGE_SPEC/原型） | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| P001 | 自绘导航+工具条+设备卡信号条四格+两种空态文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | 结构/文案四维对齐已完成（2026-09-07 P001 轮 + UI-G1 11 项判定 9 PASS：U-AND/F-AND 真机逐字+像素证据、U-WX code-verified；E1–E3 偏差登记于 UI_G1 §2）；2026-09-10 烟测默认态截图三线+Apple 落袋（§3 smoke-uwx/fand/nios，U-WX automator/U-AND 仍缺）；同日 vis1 可达态首轮：空态A 四线（含 N-IOS 平台不支持 chip+禁用钮、F-AND 蓝牙不可用 chip 真实态）、筛选展开 U-WX/N-IOS/N-MAC（四预设+滑杆+名称前缀+隐藏无名+重置全项）、Error B8 横幅 F-AND（bluetooth_unavailable+重试，E2 形态模拟器复现）、**N-MAC 真实射频三态：扫描中（danger 停止钮）/扫描完成 7 台设备卡/SHID-00000001（10:B4:1D:CD:23:8E，-37dBm）强匹配徽章——全 Gate 首份真实设备列表证据**（§3 vis1-*）；权限弹窗仍待（U-AND/F-AND 真机已证，N-MAC/U-WX 无强制弹窗环境）；**同日 vis1 F-MAC（Flutter macOS Release 真窗口）：空态A/筛选展开（含「收起筛选」toggle 证）/扫描中（「扫描中 · 5s 会话」+danger 停止钮）/扫描完成（真实射频发现 2 台：SHID-00000001 强匹配徽章+SHID-00000004）——F 线 Mac 真实射频首证，文案逐字对齐原型基准（§3 vis1-fmac）** |
| P002 | 三步骤条+表单+扫码大动作卡+四行进度+错误横幅 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppSubnav/离开确认）；2026-09-10 UI-CONV：stepper 当前步纯色化/进度行/错误块 token 收敛（正典 C6/B8/prow）；vis1 可达态：U-WX 默认表单直达截图（§3 vis1-uwx p002-default）；F-AND/N-IOS 需设备入口（模拟器/模拟器无 BLE，待硬件态）；**vis1 F-MAC 真设备入口直达：SHID-00000001 卡「配置」→ 步骤 1/3，表单逐字命中（设备名称=真名 SHID-00000001/配对码「6 位数字，扫码或手动输入」/确认配对码/扫码卡「摄像头扫码填入配对码」+粘贴兜底说明）（§3 vis1-fmac）** |
| P003 | 身份卡/最近配置卡/操作区主次按钮 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppBadge/AppChip/AppListRow/AppButton×3+info 说明条） |
| P005 | 状态行+五行图标语义（ok=check/warn=warn/fail=x SVG + active/pending `·`）+错误码块 mono | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | 图标字形已三线统一（2026-09-07 PARITY-ICON）；UI-G2 AppStatusIcon 五态行+正典词表；整页六态截图仍待视觉 Gate |
| P006 | 设备面板+服务树折叠+日志六色 chip+写/OTA 弹窗 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（ServicePanel 五态+LogPanel dock 接管旧件）；**2026-09-10 vis1 F-MAC 对照（真实 ESP32 服务树 4 服务/7 特征）发现 P-03 预警条 F 线全缺（N-MAC 页面+弹窗双实现，F 线两处皆无）——同日修复：页面 body B9 warn 说明条（原型 p006 逐字）+ OTA 弹窗头部预警（PATTERN §75 逐字，N-MAC 同款），token 用 cWarningDeep（原型 CSS #8A5410 系局部值未入 TOKEN.md，跨线裁决随 N-MAC）；修复后复采逐字命中（§3 vis1-fmac）** |
| P007 | 汇总卡/ON 头标/空态两文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（DeviceCard conn 变体+AppEmpty+sumcard）；2026-09-10 烟测默认态（已连接空态+占位设备卡）三线+Apple 同构截图落袋（§3）；vis1 N-MAC 设备页空态（「当前没有已连接设备/先在扫描页完成设备连接/去扫描」）落袋（§3 vis1-nmac）；**vis1 F-MAC 空态同三行逐字一致+汇总卡在位（§3 vis1-fmac）** |
| P008 | 徽章六值+N/31 字节提示+超限红字+日志面板 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppNavbar PERIPHERAL+AppBadge 三态+LogPanel card）；2026-09-10 UUID 黄条深字收敛 --c-warning-deep；烟测默认态（未开启+日志空卡）三线+Apple 截图落袋（§3）；**vis1 N-MAC 广播中真实态：徽章「广播中」+6/31 字节+adv_start/广播已开启 日志行（真实 CoreBluetooth 外设、唯一可达线；采后即停恢复射频）（§3 vis1-nmac）**；**vis1 F-MAC 未开启+广播中真实态（flutter_ble_peripheral 真实启停：本地名 BLE Toolkit+/Service UUID 大写/0/31 字节 → 徽章「广播中」+8/31 字节+「停止广播」，采后即停恢复射频）——F 线 Mac 真实外设态（§3 vis1-fmac）** |
| P009 | 品牌卡+信息卡+菜单 4 项+页脚（推广卡 2026-09-10 随 F028 移除） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppNavbar ABOUT+版本 chip+品牌渐变挂 token）；烟测默认态三线+Apple 截图落袋（§3）；推广区移除后 P009 截图已三线重采（§3 重采行）；**2026-09-10 vis1 F-MAC 对照发现品牌副标题缺渠道段（实拍「v1.0.5+101 · 零后端 · 零本地持久化」vs 正典三段式「v… · preview · …」）——同日修复补渠道段，复采逐字命中「v1.0.5+101 · preview · 零后端 · 零本地持久化」（§3 vis1-fmac；品牌名/菜单/页脚其余对齐）** |
| P010 | 版本卡+限制卡+历史/预览卡+页脚声明 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppSubnav+AppEmpty doc×2）；vis1 可达态：**四线**默认态截图（N-IOS simctl / U-WX automator reLaunch / F-AND 宿主窗口 / N-MAC AX 通道），四卡结构+版本 1.0.5（构建 101）+渠道 preview+tag 逐字一致（§3 vis1-*）；**vis1 F-MAC 第五线同值一致（版本卡 1.0.5/build 101/preview）（§3 vis1-fmac）** |
| 全局 | TabBar 4 项文案/图标语义/激活色；错误横幅样式；toast 规范 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | TabBar 图标层 PASS（§1）；页面级横幅/toast 六态截图待视觉 Gate |

## 3. 截图登记（每次视觉 Gate 回填）

| 日期 | Run-ID | 页面 | reference.png | u-wx.png | u-and.png | f-and.png | n-ios.png | n-mac.png | comparison.md |
|---|---|---|---|---|---|---|---|---|---|
| 2026-09-09 | UI-G1-P001（非正式 Gate：P001 判定轮证据） | P001 八态 | proto-01..08（8 张） | **缺**（开发者工具登录受限，code-verified） | uand-01..09（E5 真机 9 张） | fand-01..09（E5 真机+像素校验 9 张） | —（Apple 线当时不在判定域） | — | [UI_G1_P001_FINAL.md](../06_review/UI_G1_P001_FINAL.md) §1 判定矩阵 + §3 截图索引 |
| 2026-09-10 | 20260910-ui-conv/parity/smoke-uwx | P001/P007/P008/P009 默认态（烟测） | — | uwx-p001-default / uwx-p007-connected-empty / uwx-p008-broadcast / uwx-p009-about（4 张，automator） | —（HBuilderX 打包域未装，仍缺） | — | — | — | [MULTI_END_PARITY_AUDIT.md](../06_review/MULTI_END_PARITY_AUDIT.md) §14.6 |
| 2026-09-10 | 20260910-ui-conv/parity/smoke-fand | P001/P007/P008/P009 默认态（烟测） | — | — | — | fand-p001-default / fand-p007-connected-empty / fand-p008-broadcast / fand-p009-about（4 张，宿主窗口截屏） | — | — | 同上 |
| 2026-09-10 | 20260910-ui-conv/parity/smoke-nios | P001/P007/P008/P009 默认态（烟测） | — | — | — | — | nios-p001-default / nios-p007-connected-empty / nios-p008-broadcast / nios-p009-about（4 张，iPhone 17 Pro Max 模拟器 simctl） | — | 同上 |
| 2026-09-10 | smoke-{uwx,fand,nios} P009 **重采**（F028 推广区移除后） | P009 移除后默认态 | — | uwx-p009-about.png（覆盖，重建包 automator） | — | fand-p009-about.png（覆盖，重建 APK 宿主截屏） | nios-p009-about.png（覆盖，移除后构建） | — | 三线均验证：品牌卡直接衔接应用信息卡，推广区零残留；门禁全绿（审计 §15） |
| 2026-09-10 | 20260910-ui-conv/parity/vis1-uwx | P001 空态A+筛选展开 · P010 · P002 默认态 | — | uwx-p001-empty-a / uwx-p001-filter（setData 直驱）/ uwx-p010-default（reLaunch）/ uwx-p002-default（reLaunch） | — | — | — | — | 可达态首轮·U-WX：automator（采集脚本 vis1-uwx-capture.cjs 同目录归档）；扫描态不可元素级驱动（scan-summary 自定义组件 automator 穿透失败·探针证实 page 树仅 5 view；CGEvent 点到下拉刷新已弃）——留待六态全量 |
| 2026-09-10 | 20260910-ui-conv/parity/vis1-nios | P001 空态A（含平台不支持 chip+禁用钮）+筛选展开 · P010 默认态 | — | — | — | — | nios-p001-empty-a（simctl+平台不支持真实态）/ nios-p001-filter（CGEvent 像素定位筛选链接）/ nios-p010-default | — | 可达态首轮·N-IOS：iPhone 17 Pro Max 模拟器；不支持平台点扫描无 modal 反馈（chip 即正典反馈形态）；10001 modal 态模拟器不可达 |
| 2026-09-10 | 20260910-ui-conv/parity/vis1-fand | P001 空态A（蓝牙不可用 chip）+Error B8 横幅 · P010 默认态 | — | — | — | fand-p001-empty-a / fand-p001-scan-error（bluetooth_unavailable+重试，E2 横幅形态模拟器复现）/ fand-p010-default | — | — | 可达态首轮·F-AND：Pixel_API35 模拟器（宿主窗口截屏+adb input tap）；筛选展开态本轮未采（Flutter semantics off→uiautomator 无节点，坐标定位未果；FilterPanel 四档行有 widget_test 断言，两线截图佐证）；P002 需设备对象不可达 |
| 2026-09-10 | 20260910-ui-conv/parity/vis1-nmac | P001 空态A+筛选+扫描中+扫描结果（真实射频 7 台含 SHID-00000001 强匹配）+P007 空态+P008 未开启/广播中（真实外设）+P009+P010 | — | — | — | — | — | nmac-p001-empty-a / nmac-p001-filter / nmac-p001-scanning / nmac-p001-scan-result / nmac-p007-devices / nmac-p008-broadcast / nmac-p008-advertising / nmac-p009-about / nmac-p010-versions（9 张） | 可达态首轮·N-MAC（Mac 真实蓝牙射频——唯一可达扫描/广播真实态的线）：AX 通道（System Events click，CGEvent 会话中段失效后定案）；双实例窗口叠放事故见审计 §17.4（遗留 flow-preview 实例同位窗口致早期误采，全部重采自唯一确认实例）；每张经视觉模型目检（URL 名实相符） |
| 2026-09-10 | 20260910-ui-conv/parity/vis1-fmac | P001 空态A+筛选+扫描中+扫描结果（真实射频 2 台含 SHID-00000001 强匹配）+P002 步骤1（真设备入口）+P006 真实服务树+P-03 预警条（修复后）+OTA 弹窗预警（修复后）+P007 空态+P008 未开启/广播中（真实启停）+P009（副标题修复后）+P010 | fmac-proto-*（10 张：p001 四态/p002/p006/p007/p008/p009/p010，Playwright 驱动 platform/app/high-fi 同态 375×780 手机区） | — | — | **F-MAC（Flutter macOS 线）：fmac-p001-empty-a / fmac-p001-filter / fmac-p001-scanning / fmac-p001-scan-result / fmac-p002-step1 / fmac-p006-gatt / fmac-p006-ota-dialog / fmac-p007-devices / fmac-p008-off / fmac-p008-advertising / fmac-p009-about / fmac-p010-versions（12 张；p006/p009 为修复后复采）** | — | — | 可达态首轮·F-MAC（Flutter macOS Release 真窗口 800×600：screencapture 全屏+sips 裁剪+NSRunningApplication 强制置前+CGEvent 点击，flutter semantics off 无 AX；P002/P006 经真实 ESP32 连接链，采后断开释放夹具）；对照基准=同目录 fmac-proto-*；**对照发现并修复 2 项 F 线级漂移：P009 品牌副标题缺渠道段、P006 P-03 OTA 预警条页面+弹窗双缺（N-MAC 先例双实现）**；修复后 flutter analyze 0 issues / test 113/113 / release 重建复采逐字命中 |
| — | **视觉 Gate 六态全量（六态×9 页×三端+Apple）** | — | — | — | — | — | — | — | vis1 可达态首轮已落袋（上行 10 张：空态A×3/筛选×2/Error 横幅×1/P010×3/P002×1）；剩余待：扫描中/设备列表/权限弹窗/连接态页（P003/P005/P006）需 BLE 夹具或真机、U-AND 需 HBuilderX 打包域、U-WX 扫描态需元素级驱动方案（或 devtools 真机预览） |
