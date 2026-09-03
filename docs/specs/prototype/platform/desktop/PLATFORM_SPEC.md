# PLATFORM_SPEC · Desktop（D2 spike 未启动 · 原型先行）

> 平台设计说明之一 · 依据《平台设计说明规范 v1.0》§3 · 2026-09-03
> 三引用：① 基准 = [prototype/v1-new](../../v1-new/) ② 能力/限制 = [10_platform §2.4](../../../10_platform/PLATFORM_EXTENSION.md) ③ 差异设计 = 10_platform §4 Desktop 列。
> 排期口径：**原型齐备 ≠ 开发排期**——D2（Electron vs Tauri + BLE 原生层）spike 仍为进入开发的前置；本实例只表现桌面平台形态，**不预判实现技术**。

## 1. 架构：基准内核 + 平台覆写层

与 App 同构：`high-fi/` 内核字节复制自基准，差异收敛在 `desktop.js`（ACTION 覆写 + renderAll 后处理 DOM 重排）。

## 2. 优势 / 限制（10_platform §2.4）

- **优势**：长时间运行（U1 长时 notify 监听 / 日志采集价值最高）；文件系统（OTA 固件管理、日志落盘导出）；多窗口大屏（多设备并行对比）。
- **限制**：跨平台 BLE 无统一 Web API——需原生层（macOS CoreBluetooth / Windows WinRT / Linux BlueZ）或跨平台库（btleplug 系）；Electron 的 Web Bluetooth 支持不完整，通常走原生集成【待验证：技术选型 spike】；分发 / 签名 / 自动更新成本。
- **BLE 判定**：经原生层，扫描 / GATT / 广播外围均可 △～✅（Linux 广播受 BlueZ / 内核权限影响【待验证】）——四平台中唯一可能全域达标的扩展平台，代价是实现层最厚。

## 2a. 操作系统维度（2026-09-03 用户走查追加 ·「desktop 也需要区分系统吧」）

| 宿主 OS | 原生层 | 窗口 chrome（还原层） | 生态矩阵分级（11_ecosystem） |
|---|---|---|---|
| macOS | CoreBluetooth | 交通灯左上（关闭=退出确认） | 监听 ⚠️ / 发送 ❌【待验证 C2：CoreBluetooth 外围公开存在】/ 多设备 ⚠️ |
| Windows | WinRT | 右侧 ─ ▢ ✕ | 监听 ⚠️ / 发送 ⚠️ / 多设备 ✅ |
| Linux | BlueZ | 仅 ✕（GNOME 形态示意） | 监听 ✅ / 发送 ⚠️（BlueZ/内核权限【待验证】）/ 多设备 ✅ |

原型呈现：`desktop.js` OSES 注册表——P009「操作系统」切换入口（applyOS 联动 MOCK.env + chrome class + 矩阵卡）、P008 徽标 `Desktop · {OS}` 与原生层提示、Linux 广播 BlueZ【待验证】提示（check/start 日志）。D2 spike 未启动，能力细节不预判。

## 3. 差异设计（10_platform §4 Desktop 列 → 覆写点）

| 差异点 | 覆写实现（high-fi/desktop.js） |
|---|---|
| 操作系统维度 | OSES 注册表（mac/win/linux）：P009 切换入口 + applyOS 联动（环境信息 / 窗口 chrome 三形态 / P008 徽标与原生层提示 / 评审栏矩阵卡随动），见 §2a |
| 生态能力矩阵（11_ecosystem） | 评审栏注入矩阵卡（§2a 分级行 + C2 待验证标注），随 OS 切换随动；仅呈现，不改产品逻辑 |
| 扫码（F020） | `p002-qr` 覆写：**摄像头扫码为主**（取景器 sheet + 识别成功自动回填，产品统一口径 2026-09-03）+ **粘贴/手输兜底**（`shid://pair` 正则解析回填，纯前端）；入口文案/图标保持基准 |
| 布局（SOP §12 圈内调整） | P006 DOM 重排为**两栏**：左主区（设备/服务/特征操作）、右日志常驻（`.dcol1`/`.dcol2`，流程与数据模型不变） |
| 分享（F029） | 导出文本（复制；文本文件为候选拦截）；外链→系统浏览器 modal |
| 推广卡（F028 · 2026-09-03） | `p009-promo` 覆写：非微信渠道承接 sheet = 小程序码（示意图形）+ 浏览器打开落地页 + 下载小程序码（演示）——Desktop 无 `navigateToMiniProgram` |
| 日志导出（F011） | 复制为主；「保存为文件（候选）」拦截（文件流未决策） |
| 生命周期 | 常驻运行；窗口关闭→**退出确认**（有活动会话时明示断开后果） |

## 4. 候选增强（未决策 · 默认不做）

日志文件流式导出 / OTA 固件库本地管理 / 多设备并排工作台（多窗口）。做任何一项须先回写 10_platform §4 并补三查。
