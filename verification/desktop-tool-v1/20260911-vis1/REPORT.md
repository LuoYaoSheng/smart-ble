# D2 准备轮 · 工具线（Electron/Tauri）× desktop 原型 首次视觉对照 — 报告

- 日期：2026-09-11（用户「继续」放行后的 D2 准备轮；**不替用户做 Electron/Tauri 二选一**）
- 分支：refactor/uniapp-v1（HEAD ce22ee6）
- 对照正典：`docs/specs/prototype/platform/desktop/high-fi/`（dwin 740×600 演示窗口 = 基准内核 + desktop.js 平台覆写层）
- 采集通道纪律：本轮期间用户正在使用本机（Chrome 前台）——**全程零窗口置前、零合成点击**；原型经 Playwright 驱动，工具线经 `?mock=true` 静态渲染（app.js:8/35 原生支持的 Playwright mock polyfill），1200×800 视口与其真实窗口一致。

## 1. 证据清单（25 张）

| 组 | 文件 | 说明 |
|---|---|---|
| 原型基准 `proto/` | proto-d-p001-default / empty-a / scanning / scan-result | P001 四态（含 5s 会话计时器态） |
| | proto-d-p002-default | 配网向导 |
| | proto-d-p006-gatt | GATT 三栏重排（desktop.js SOP §12）+ P-03 预警条 |
| | proto-d-p008-broadcast | 徽章+0/31 字节预算 |
| | proto-d-p009-about / p009-os-sheet | 关于页 + 操作系统切换面板 |
| | proto-d-p010-versions | 版本记录 |
| | proto-d-os-win / os-linux | 标题栏三 OS 形态（win/linux） |
| | proto-d-quit-confirm | 退出确认弹层（10_platform §4） |
| Electron `electron/` | ele-scan-default / scan-result / connected / broadcast / about / device-detail | 6 视图静态渲染 |
| Tauri `tauri/` | tau-scan-default / scan-result / connected / broadcast / about / device-detail | 同 6 视图（renderer 同血缘，仅壳文案/IPC 分叉——index.html 仅 4 处文案差异，app.js IPC 层分叉 2094 diff 行） |

## 2. 总判定

**工具线与 desktop 原型的差距是结构级（renderer 重建级），非局部漂移。** 两壳共享同一旧血脉 IA；对齐正典意味着 renderer 需要套用「基准内核 + desktop.js 覆写」或移植其全部桌面模式——这正是 D2 spike 要度量的核心工作量。

## 3. 差距清单（G1–G10）

| # | 维度 | 正典（desktop 原型） | 工具线现状（Electron/Tauri 同） | 级别 |
|---|---|---|---|---|
| G1 | 页面清单 | 9 页 P001–P010（无 P004） | 5 视图；**P002 配网 / P003 SHID 详情 / P005 诊断 / P010 版本全缺** | 结构级 |
| G2 | 窗口形态 | dwin 740×600 + 三 OS 标题栏（mac 交通灯/win ─▢✕/linux ✕） | 1200×800 系统默认 chrome，无 OS 形态区分 | 结构级 |
| G3 | 生命周期 | 关窗 → 退出确认弹层（§4 常驻） | 无退出确认 | 特性缺失 |
| G4 | P006 布局 | **三栏**（服务树/特征操作/日志）+ OTA 端到端 BLOCKED 预警条（逐字，B9 warn） | 两栏纵排（服务+日志）；OTA 按钮无预警、无 P-03 条（视觉证实 ele-device-detail） | 结构级 |
| G5 | P008 形态 | 徽章六值 + 0/31 字节预算 + 超限红字 + 日志面板，中文字段名 | 英文标签表单（Service UUID/Manufacturer ID…）、**无字节预算**、广播 Tab 默认隐藏（视觉证实 ele-broadcast） | 结构级 |
| G6 | P009 形态 | 品牌卡（版本·渠道·隐私三段）+ OS 切换器 + 生态能力矩阵 + 版本记录入口 | v2.0.0 + Framework 芯片卡，无 OS 切换/矩阵/P010 入口 | 结构级 |
| G7 | 图标体系 | i-* SVG sprite 35 枚（24×24 stroke1.8） | emoji（📡🔗📢ℹ️🔍） | 资产级 |
| G8 | 版本口径 | 1.0.5-preview 家族（build 101） | v2.0.0（两壳各自） | 元数据 |
| G9 | 空态文案 | 「还没有扫描结果 / 点上方按钮开始扫描附近 BLE 设备」 | 「暂无设备 / 点击上方按钮开始扫描」 | 文案 |
| G10 | 设计 token | tokens.css 全局（与 app 线同源） | `app_theme.css` 自动生成 SSOT——**token 管道已覆盖**（部分对齐已有） | 部分对齐 |

**已对齐项**（既往轮次落袋）：标题「BLE Toolkit+」（15916fd 两壳 12 处）；app_theme.css 生成管道；`?mock=true` Playwright 通道（本轮正是用它完成无扰采集）。

## 4. P001 对照明细（唯一部分可比页）

- 共有：扫描主按钮（「开始扫描」逐字同）/ 已连接 Tab 角标 / 蓝牙状态 chip（「蓝牙就绪」同文案）/ 设备卡含名称+ID+RSSI 四格信号+连接按钮（视觉证实）。
- 漂移：Tab 名（扫描设备/创建广播 vs 扫描/广播）；空态文案（G9）；顶部自绘 header vs 正典窗口标题栏+页内品牌状态条；emoji vs SVG（G7）。

## 5. D2 决策输入（不预判）

- 对齐成本 = renderer 重建 × 2 壳（工作量随胜者数量翻倍）；BLE 原生层差异（Electron noble/层 vs Tauri btleplug）不在本轮视觉范围，待 D2 spike 实测（含 C2 广播发送冲突项回写）。
- 建议顺序：用户定 D2 胜者 → 胜者壳先行套基准内核 → 输者按教学对照线保留或退役。

## 6. 铁律与事故记录

- 用户用机期间桌面 GUI 通道停用；此前一次 Electron 窗口截图误采到用户桌面内容（微信窗口入镜），该文件**已删除**，本地无副本；其一次 CDN 上传无法撤回（签名链接短期有效），已在会话汇报中向用户披露。
