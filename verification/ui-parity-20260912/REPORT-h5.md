# UI Parity 验证 · 线1 uni-app H5（2026-09-12）

- 基线：commit `567f78a`（含 F028 原型补漏）
- 通道：`npm run dev:h5`（vite 5.2.8, :5173）+ Playwright 驱动 `window.__MOCK__` 桥
- 视口：390×844，fullPage 截图
- 产物：`h5/` 下 40 张 PNG（9 页面 × 全预设态）

## 结论：PASS（9/9 页面，40/40 态捕获，抽样 8 深度态视觉审查 0 异常）

| 页面 | 态数 | 结果 |
|---|---|---|
| p001 扫描 index | 7（idle/scanning/complete/failed/ble-off/unsupported/filter-empty） | PASS |
| p002 HID 配网 add | 9（connect×3/configure×2/status×4） | PASS |
| p003 HID 详情 detail | 2（ready/missing） | PASS |
| p005 SHID 诊断 diagnostics | 6（idle/connected/checking/live/offline/error） | PASS |
| p006 GATT 调试 device/detail | 5（idle/connecting/ready/empty/error） | PASS |
| p007 已连接 connected | 4（empty/empty-provision/single/multi） | PASS |
| p008 广播 broadcast | 5（idle/advertising/stopped/failed/unsupported） | PASS |
| 关于 about | 1 静态 | PASS（无推广区/萌喵圈/宝宝点滴残留；BLE Toolkit+ 在位） |
| 版本 version | 1 静态 | PASS（暂无正式发布版本） |

## 视觉审查样本（联览图因全页截图压缩产生假警报，已弃用；单张送审 8 张全过）

p001-complete / p002-configure / p002-status-error / p003-ready / p005-live / p006-ready / p007-multi / p008-advertising / p008-unsupported

## 发现项（非阻塞）

1. **P2-1** Vue warn：prop `code` 期望 String 收到 Number `10006`（广播失败态，p008-failed 触发路径）
2. **P2-2** Vue warn：prop `deviceId` 收到 undefined ×3（p006 导航/恢复连接时序，页面最终渲染正常）
3. favicon.ico 404（dev server 无 favicon，无害）

## 方法备注

- mock 桥三重门（H5 条件编译 + ?mock=1 + 显式 import）工作正常；`seed/switchTab/go` 全链可用
- p006 ready/empty 需先种后进页（onLoad 复用分支）；idle/connecting/error 先挂载再种 —— 两种时序都验证可行
- 控制台仅 2 条预期内错误日志（mock 种入的 controlhub_unreachable / diagnostic_read_failed 故障态）
