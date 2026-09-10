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
| P001 | 自绘导航+工具条+设备卡信号条四格+两种空态文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | 结构/文案四维对齐已完成（2026-09-07 P001 轮 + UI-G1 11 项判定 9 PASS：U-AND/F-AND 真机逐字+像素证据、U-WX code-verified；E1–E3 偏差登记于 UI_G1 §2）；2026-09-10 烟测默认态截图三线+Apple 落袋（§3 smoke-uwx/fand/nios，U-WX automator/U-AND 仍缺）；六态截图待视觉 Gate |
| P002 | 三步骤条+表单+扫码大动作卡+四行进度+错误横幅 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppSubnav/离开确认）；2026-09-10 UI-CONV：stepper 当前步纯色化/进度行/错误块 token 收敛（正典 C6/B8/prow） |
| P003 | 身份卡/最近配置卡/操作区主次按钮 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppBadge/AppChip/AppListRow/AppButton×3+info 说明条） |
| P005 | 状态行+五行图标语义（ok=check/warn=warn/fail=x SVG + active/pending `·`）+错误码块 mono | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | 图标字形已三线统一（2026-09-07 PARITY-ICON）；UI-G2 AppStatusIcon 五态行+正典词表；整页六态截图仍待视觉 Gate |
| P006 | 设备面板+服务树折叠+日志六色 chip+写/OTA 弹窗 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（ServicePanel 五态+LogPanel dock 接管旧件） |
| P007 | 汇总卡/ON 头标/空态两文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（DeviceCard conn 变体+AppEmpty+sumcard）；2026-09-10 烟测默认态（已连接空态+占位设备卡）三线+Apple 同构截图落袋（§3） |
| P008 | 徽章六值+N/31 字节提示+超限红字+日志面板 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppNavbar PERIPHERAL+AppBadge 三态+LogPanel card）；2026-09-10 UUID 黄条深字收敛 --c-warning-deep；烟测默认态（未开启+日志空卡）三线+Apple 截图落袋（§3） |
| P009 | 品牌卡+信息卡+菜单 4 项+页脚（推广卡 2026-09-10 随 F028 移除） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppNavbar ABOUT+版本 chip+品牌渐变挂 token）；烟测默认态三线+Apple 截图落袋（§3）；推广区移除后 P009 截图已三线重采（§3 重采行） |
| P010 | 版本卡+限制卡+历史/预览卡+页脚声明 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | UI-G2 结构对齐（AppSubnav+AppEmpty doc×2） |
| 全局 | TabBar 4 项文案/图标语义/激活色；错误横幅样式；toast 规范 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | TabBar 图标层 PASS（§1）；页面级横幅/toast 六态截图待视觉 Gate |

## 3. 截图登记（每次视觉 Gate 回填）

| 日期 | Run-ID | 页面 | reference.png | u-wx.png | u-and.png | f-and.png | n-ios.png | comparison.md |
|---|---|---|---|---|---|---|---|---|
| 2026-09-09 | UI-G1-P001（非正式 Gate：P001 判定轮证据） | P001 八态 | proto-01..08（8 张） | **缺**（开发者工具登录受限，code-verified） | uand-01..09（E5 真机 9 张） | fand-01..09（E5 真机+像素校验 9 张） | —（Apple 线当时不在判定域） | [UI_G1_P001_FINAL.md](../06_review/UI_G1_P001_FINAL.md) §1 判定矩阵 + §3 截图索引 |
| 2026-09-10 | 20260910-ui-conv/parity/smoke-uwx | P001/P007/P008/P009 默认态（烟测） | — | uwx-p001-default / uwx-p007-connected-empty / uwx-p008-broadcast / uwx-p009-about（4 张，automator） | —（HBuilderX 打包域未装，仍缺） | — | — | [MULTI_END_PARITY_AUDIT.md](../06_review/MULTI_END_PARITY_AUDIT.md) §14.6 |
| 2026-09-10 | 20260910-ui-conv/parity/smoke-fand | P001/P007/P008/P009 默认态（烟测） | — | — | — | fand-p001-default / fand-p007-connected-empty / fand-p008-broadcast / fand-p009-about（4 张，宿主窗口截屏） | — | 同上 |
| 2026-09-10 | 20260910-ui-conv/parity/smoke-nios | P001/P007/P008/P009 默认态（烟测） | — | — | — | — | nios-p001-default / nios-p007-connected-empty / nios-p008-broadcast / nios-p009-about（4 张，iPhone 17 Pro Max 模拟器 simctl） | 同上 |
| 2026-09-10 | smoke-{uwx,fand,nios} P009 **重采**（F028 推广区移除后） | P009 移除后默认态 | — | uwx-p009-about.png（覆盖，重建包 automator） | — | fand-p009-about.png（覆盖，重建 APK 宿主截屏） | nios-p009-about.png（覆盖，移除后构建） | 三线均验证：品牌卡直接衔接应用信息卡，推广区零残留；门禁全绿（审计 §15） |
| — | **视觉 Gate 六态全量（六态×9 页×三端+Apple）** | — | — | — | — | — | — | 烟测默认态已破零（上行 12 张）；全量六态仍待：U-WX 登录已恢复（automator 通道可用）、U-AND HBuilderX 打包域仍未装、F-AND 模拟器 guest 侧 screencap 故障（宿主窗口截屏绕过已验证，见审计 §14.6）、iPhone 真机程序化截图无工具链（devictl 无 screenshot 子命令，已装包+拉起烟测代替） |
