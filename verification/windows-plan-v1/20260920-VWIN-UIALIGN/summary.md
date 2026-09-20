# 20260920-VWIN-UIALIGN — V-WIN 正典 UI 对齐全量重写（用户指令「UI要对齐」）

## 结论

**PASS**：V-WIN（Avalonia）UI 层按正典设计系统全量重写并对齐 E-WIN/T-WIN——
TabBar 四枚导航 + P001/P007/P008/P009/P010/P006/P002 七视图 + 写入弹窗 +
退出确认双模态全部落地；真机全页面走查 **81/81 全绿**（13 节 × 真实点击 +
正典色彩探针），门禁 build 0 错 / 单测 **55/55**（19 存活 + 36 新增正典锚点）。

- Commit：见 git log（本轮提交 `feat(win): VWIN-UIALIGN …`）
- Host：Windows 10 22H2 · .NET SDK 9.0.200（net8.0-windows10.0.19041.0）
- 真机：ESP32-S3 真实 Smart HID 固件 v1.2.0（SHID-00000001，WIN-007 环境原样保留，
  全程无 INPUT 写、无重刷、无 NVS 触碰）
- Evidence：`avalonia/vwin-align-walk/`（walk-green.log 81/81 + 16 截图 +
  diag-broadcast.txt 预算真值 dump）、`gates/`（build/test 日志）

## 对齐内容（正典源：docs/specs/prototype/platform/desktop/high-fi v1.4.7，经 E-WIN 双层 CSS 镜像）

| 层 | 落地 |
|---|---|
| 设计 tokens | 全套正典色/字号/字重/间距/圆角/阴影入 AppStyles.axaml 资源（#1B6DFF 主系、#17C7A8 成功系、Ink 深色控制台、日志六色 dock/cardv 双套） |
| 应用壳 | 底部 TabBar 四枚（扫描/已连接/广播/关于，正典 A3 恒显形态 + 已连接角标）；pagehost 单页渲染（弃 Carousel） |
| P001 扫描 | navbar（kicker/标题/bt-chip 五态）、scantool 状态词（待开始扫描/扫描中·5s 会话/扫描完成·发现 N 台）、C3 筛选面板（4 预设 + -100..-40 step5 滑杆 + 前缀 + 隐藏无名开关 + 重置）、C1 设备卡（ava/信号四柱/SHID 匹配 chip/双入口按钮）、双空态文案 |
| P007 已连接 | SESSIONS navbar + 汇总卡（多台才显）+ conn 卡（在线角标/可调试词/断开）+ 空态去扫描 |
| P008 广播 | 四字段表单 + bytebar（31B 预算**真值计算**，与 app.js calcAdvertiseBytes 同口径）+ 四行明细 + 超限拦截词 + 未就绪徽章 + cardv 日志；**发射=明确降级**（BluetoothLEAdvertisementPublisher 未移植） |
| P009 关于 | 身份卡/应用信息 kv/功能 chips/F027 平台状态行/F029 菜单四行/foot；版本元数据**纯投影**（ReleaseMetadata.cs 读管线产物，开发树直读电子壳 + Assets 镜像兜底） |
| P010 版本记录 | 当前版本/当前限制/发布历史/预览记录四卡 + 复制版本信息 |
| P006 GATT 调试 | subnav + devhead（st 点/三态词/连接-断开）+ C4 服务树（折叠/read-write-notify chips/读取-写入-监听按钮自翻转）+ 桌面双栏右置 Ink 深色日志（六色 chip + 清空/导出） |
| P002 配网 | 三步 stepper + 设备卡 + **阶段一真实 GATT**（连接 + INFO 读 → 身份摘要 HID-00000001 · fw 1.2.0）+ 阶段二表单/密码遮蔽/QR bigact；**下发=明确降级**（vwin_camera_unsupported / vwin_provisioning_not_ported 两横幅，正典允许「或明确降级」） |
| C9 写弹窗 | HEX/UTF-8 + 单次/批量/循环三模式（循环=次数×间隔，关闭即停）+ 非法 HEX 拒绝 |
| 退出确认 | WM_CLOSE 拦截 → 模态（会话计数/常驻文案）→ 退出/继续使用（10_platform §4） |
| 文案词表 | N3 五态词（蓝牙就绪/蓝牙未开启/平台不支持/初始化中…）、服务名注册表对齐 E-WIN BleUtils（中文 + 8 位前缀匹配 + 未知服务/未知特征值） |

## 本轮抓出并修复的产品缺陷（V-WIN-DEF-007~010）

- **V-WIN-DEF-007（P1）**：mask 样式带 `ZIndex=90` 而弹窗 Border 默认 0——遮罩反盖
  弹窗吞掉全部点击（模态可见但按钮死）。走查 S13 实证后移除 ZIndex（层叠回归子序）。
- **V-WIN-DEF-008（P1）**：SHID 匹配卡「连接」按钮被 `IsVisible=!IsShid` 错误隐藏
  （正典 C1 双入口 = 配置 primary + 连接 soft 并存）。修正为禁用态语义。
- **V-WIN-DEF-009（P1）**：每帧广播都 `ApplyFilters` 全量重建列表——真机扫描更新
  风暴可致 UI 线程/UIA 对等层死锁（run7 app Responding=False 实证）。对齐 E-WIN
  口径：新设备才重排，已存在设备仅卡片内 INPC。
- **V-WIN-DEF-010（P2）**：断开会话连带导航回扫描页——E-WIN 口径为停留当前页
  （P007 列表刷空态 / P006 devhead 翻未连接）。拆分断开与返回导航。
- 另修：SHID 档案匹配常量未归一化（大写带杠 UUID 永不命中强匹配，单测红证）。

## 走查实证（81 断言 · 13 节 · FlaUI 真实点击）

S1 首屏四 Tab+五态+双空态+色彩探针 → S2 真机扫描（SHID 强/弱匹配 chip）→
S3 筛选面板全交互 → S4 连接进 P006（3 服务/6 特征/右栏深色探针）→ S5 读 Device Info
（值回填 JSON + 六色日志）→ S6 写弹窗（非法 HEX 拒绝/取消关闭）→ S7 监听自翻转 →
S8 已连接页（角标/断开空态）→ S9 P002（真实 GATT + 身份摘要 + 双降级横幅 + 表单门禁）→
S10 广播（预算 21→24 联动 + 超限词 + 降级日志）→ S11 关于全投影 → S12 版本四卡 →
S13 退出确认（拦截/驻留/确认退出全链）。

色彩探针（正典 token 落地证据，DPI-aware 直采）：
主按钮 `1053CC`（正落 #1B6DFF→#0E4FC4 渐变线上）· TabBar `FFFFFF` ·
bytebar `#101521` Ink · 右栏日志 `#101521` · 窗口底 `#F8FBFF`。

## 驱动工程注记（%TEMP%\winall\vwin-align，可复用）

- Avalonia 复合内容按钮 UIA 名为 `Avalonia.Controls.StackPanel`——本轮给全部
  复合按钮补 `AutomationProperties.Name`（无障碍正道，也是自动化前置）。
- 驱动进程须 `SetProcessDPIAware()`，否则 CopyFromScreen 被 DPI 虚拟化与 UIA 物理
  像素错位（三色彩探针系统性假阴性的根因）。
- 输入注入走 UIA ValuePattern 直写（Avalonia TextBox 实现写路径，绑定即时传播）；
  键盘兜底 SendKeys ^a+text。
- 后台任务控制台会瞬时覆盖点击落点：每次 Click/Shot/取色前 `SetForegroundWindow`。
- 已知硬事：跨 12 轮真机连测后设备侧偶发不重广播（S2/S9 需重扫重试）。

## 未覆盖（如实登记）

- P002 下发、P003/P005 页：需配网协议客户端（JS 实现）移植 + ControlHub + 配对码，
  归 WIN-007（BLOCKED）与后续窗口；本轮以正典结构 + 明确降级横幅收口。
- 广播发射、摄像头扫码：同上明确降级（页面/预算/入口齐备）。
- N4（广播 Tab 可见性 E/T 终裁）仍待用户裁决；V-WIN 取正典 A3 恒显形态，
  E/T 两壳代码本轮未动。
