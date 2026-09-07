# 多端视觉一致性矩阵（MULTI_END_VISUAL_PARITY_MATRIX）

- 创建：2026-09-07 · Multi-end Parity Gate
- 验收对象：U-WX / U-AND / F-AND
- 事实源：[TOKEN.md](../07_design_system/TOKEN.md)（全平台唯一视觉数值来源）+ [COMPONENT.md](../07_design_system/COMPONENT.md) + [PATTERN.md](../07_design_system/PATTERN.md) + `prototype/v1-new/assets/tokens.css` + `prototype/platform/{wechat,app}`
- 判定值：`PASS / FAIL / NOT_AUDITED / ALLOWED_PLATFORM_DIFFERENCE(须引规范来源)`
- 基准视口：393×852 或实际 Android 设备逻辑尺寸；截图输出 `verification/windows-mobile-v1/<run-id>/parity/Pxxx/`
- 必须完全一致的语义：区块顺序/文案/控件数量/主次关系/状态色含义/空态含义/错误恢复动作/底部导航名。
- 允许的平台差异仅限：状态栏高度、安全区、系统字体字形、原生权限弹窗、系统分享面板、系统设置页、渲染亚像素差异。

## 1. 设计 Token 全局映射（三线逐项核对）

| Token（TOKEN.md） | 值 | 用途 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|---|
| `--c-primary` | #1B6DFF | 主按钮/选中/TabBar 激活 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-primary-deep` | #0E4FC4 | 按压态/渐变深端 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-primary-weak` | #E8F1FF | 主色浅底 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-success` | #17C7A8 | 就绪/ok/广播中 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-danger` | #F2555F | 断开/停止/错误 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-warning` | #FF9F43 | warn/UUID 黄条 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-text` | #18222E | 主文字 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-sub` | #42536A | 次文字 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-mut` | #60758D | 弱文字 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-line` | #E3EAF3 | 强分割/卡片描边 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-fill` | #F1F5FB | 次按钮/输入框底 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-bg` | #F8FBFF | 页面背景 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| `--c-card` | #FFFFFF | 卡片背景 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 字号层级 | TOKEN.md §字号 | 标题/正文/meta/mono | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 字重 | TOKEN.md §字重 | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 圆角 | TOKEN.md §圆角 | 卡片/按钮/输入 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 间距 | TOKEN.md §间距 | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 阴影 | TOKEN.md §阴影 | 卡片投影 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 按钮高度 | TOKEN.md | 主/次按钮 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 输入框高度 | TOKEN.md | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| TabBar 高度/图标语义 | TOKEN.md/PATTERN.md | — | PASS | PASS | PASS | 2026-09-07 PARITY-ICON：四 Tab 字形统一为正典 scan/link/cast/info（U-WX/U-AND PNG 烤色 / F-AND AppIcon），构建+静态+测试验证；同设备截图待视觉 Gate |
| 图标字形（35 枚 `i-*` sprite） | TOKEN.md §7 | 全部页内图标 | PASS | PASS | PASS | 2026-09-07 PARITY-ICON：三线统一经镜像渲染（[DESIGN_TOKEN_PLATFORM_MAPPING.md](DESIGN_TOKEN_PLATFORM_MAPPING.md) §1）；uniapp 文字标记仅保留正典规定的 ✓/✕/·；Material 图标退役 |
| 空态插图（4 幅 `C.ILL`） | 原型 components.js B6 | P001/P007/P010 等空态 | PASS | PASS | PASS | 2026-09-07 PARITY-ILL：radar/link/doc/box 三线锁定镜像（AppIll），U-WX 方形白底 PNG 与 F-AND Material 顶替字形全部退役 |
| 占位/插画类资产透明底 | TOKEN.md/正典结构 | 全部空态/插画槽位 | PASS | PASS | PASS | PARITY-ILL：占位资产 100% 来自正典 SVG 镜像（无背景矩形），`static/placeholders` 8 文件删除、零引用（静态断言锁定） |
| P009 品牌标/推广缩写块 | 原型 p009 | 关于页品牌卡/更多小程序 | PASS | PASS | PASS | PARITY-ILL：品牌标=渐变盒+bt 字形（非位图），推广位=文字缩写块（abbr/bg/color 数据驱动），other-apps PNG 与 F-AND 紫渐变退役 |
| 分享/启动器位图 | §1.6 管线 | 微信分享/F-AND 启动器 | PASS | PASS | PASS | PARITY-ILL：ChatGPT2API(gpt-image-2) 统一生产（蓝渐变+BT 字形），logo/share/launcher/mipmap/splash 同源派生 |

> 数值逐项以 TOKEN.md 当前版本为准；本表摘录核心项，回填时如正典有增补按正典补行。实现侧 Token 映射表见 `DESIGN_TOKEN_PLATFORM_MAPPING.md`（图标节 2026-09-07 已交付，其余随视觉 Gate）。

## 2. 逐页视觉项（每页正常/空/加载/错误/权限/关键弹窗六态截图后回填）

| 页面 | 视觉要点（PAGE_SPEC/原型） | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| P001 | 自绘导航+工具条+设备卡信号条四格+两种空态文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | 结构/文案四维对齐已完成（2026-09-07 P001 轮，审计 §13，14 项实现漂移全修）：U-WX 静态正典锁 4/4+build 绿；F-AND analyze 0+test 69/69；U-AND 同源待 HBuilderX 真机；六态截图待视觉 Gate |
| P002 | 三步骤条+表单+扫码大动作卡+四行进度+错误横幅 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P003 | 身份卡/最近配置卡/操作区主次按钮 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P005 | 状态行+五行图标语义（ok=check/warn=warn/fail=x SVG + active/pending `·`）+错误码块 mono | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | 图标字形已三线统一（2026-09-07 PARITY-ICON，原表「✓/!/…/·」系旧实现口径已修正）；整页六态截图仍待视觉 Gate |
| P006 | 设备面板+服务树折叠+日志六色 chip+写/OTA 弹窗 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P007 | 汇总卡/ON 头标/空态两文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P008 | 徽章六值+N/31 字节提示+超限红字+日志面板 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P009 | 品牌卡+推广卡+信息卡+菜单 4 项+页脚 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P010 | 版本卡+限制卡+历史/预览卡+页脚声明 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 全局 | TabBar 4 项文案/图标语义/激活色；错误横幅样式；toast 规范 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## 3. 截图登记（每次视觉 Gate 回填）

| 日期 | Run-ID | 页面 | reference.png | u-wx.png | u-and.png | f-and.png | comparison.md |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |
