# r3 集成备忘（原型对齐轮 · 2026-09-04）

> 触发：用户走查反馈「要按原型稿开发页面吧，感觉没怎么对齐」。
> r3 将原生 App UI 全量重写为 `docs/specs/prototype/platform/desktop/` 对齐形态（四 Tab + 9 页 + 桌面差异点）。
> 全部改动限定 spike 允许区 `apps/desktop/macos/**` + `scripts/macos/**` + `tests/macos/**` + `verification/**`。

## S8 [共享层] Flutter macOS 的桌面化原型对齐（Mac 侧不可改区）

Flutter 路线结构上已对齐正典（MainScreen 底部四 Tab = P001/P007/P008/P009，二级页路由），
但 Desktop 原型的桌面差异点（P006 两栏重排 / P002 粘贴兜底入口 / P008 平台徽标与原生层提示 /
P009 操作系统维度 / 退出确认）需要 `apps/flutter/lib/**` 页面层改造 —— 属协议禁改区。

**建议（Windows Gate 决策）**：在 Flutter 侧引入平台自适应布局（LayoutBuilder 断点或
`Platform.isMacOS` 分支），按 desktop PAGE_SPEC 差异行逐项落地；设计令牌已有
`apps/flutter/lib/themes/**` 基础，可对照 `prototype/v1-new/assets/tokens.css` 校准色值。
Mac 探针已验证这些桌面形态在 AppKit 下可行（见本目录 pages-coverage.md §2），
不构成技术阻塞，仅排期与归属问题。

**Mac 侧处置**：本轮未触碰 Flutter 共享层；`apps/flutter/macos/**` 运行时壳无需变更。

## S9 [共享层][低优先级] 多设备并行会话（P007 口径）

原生 BLEManager 当前为单连接（connectedDevice 单值），P007 列表最多呈现 1 台。
正典 P007 要求多设备会话管理（F013：批量断开/部分失败汇总）。Flutter 侧 BleManager
同样以单设备连接为主。若 Windows 线决定支持多连接，建议：
- `BLEDevice` 会话注册表（Map<deviceId, session>）替代单值；
- 批量断开用 Promise.allSettled 等价语义（Gather/zip）。
原生探针已在 P007 标注「单连接 · 多设备属共享层能力」，不阻塞任何轮次。

## S10 [备忘] 原型 OS 切换演示装置 vs 实机真实宿主（r3 分歧决策）

原型 P009 的 mac/win/linux 切换是**评审演示装置**（desktop.js applyOS 联动 chrome/徽标/矩阵）。
r3 实现为只读信息 sheet（三系原生层口径），实机固定呈现真实宿主 macOS · CoreBluetooth +
矩阵卡 macOS 行。理由：实机伪造 win/linux 环境属造假（协议红线「没有真实执行的能力必须写
NOT_RUN 或 BLOCKED」的 UI 等价）。若 Windows 线在 Flutter 侧做 OS 维度，建议同样只在
真机呈现真实宿主；三档联动仅保留在 HTML 原型评审装置内。
