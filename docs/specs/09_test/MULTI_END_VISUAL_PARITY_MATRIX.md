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
| TabBar 高度/图标语义 | TOKEN.md/PATTERN.md | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

> 数值逐项以 TOKEN.md 当前版本为准；本表摘录核心项，回填时如正典有增补按正典补行。实现侧 Token 映射表另建 `DESIGN_TOKEN_PLATFORM_MAPPING.md`（PARITY 视觉 Gate 交付）。

## 2. 逐页视觉项（每页正常/空/加载/错误/权限/关键弹窗六态截图后回填）

| 页面 | 视觉要点（PAGE_SPEC/原型） | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| P001 | 自绘导航+工具条+设备卡信号条四格+两种空态文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P002 | 三步骤条+表单+扫码大动作卡+四行进度+错误横幅 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P003 | 身份卡/最近配置卡/操作区主次按钮 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| P005 | 状态行+五行图标语义（✓/!/…/·）+错误码块 mono | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
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
