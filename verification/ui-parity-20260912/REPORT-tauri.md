# UI Parity 验证 · 线4 Tauri 渲染层（2026-09-12）

- 基线：commit `567f78a`
- 通道：静态前端 `apps/desktop/tauri/src/`（devPath=../src，纯静态无 vite）经
  `python3 -m http.server 8933` + Playwright（1200×900，WebKit 系渲染近似壳内 WKWebView）
- 产物：`tauri/` 下 10 张 PNG（10 视图，与 Electron 同构）

## 结论：PASS（10 视图全覆盖）

| # | 视图 | 驱动 | 结果 |
|---|---|---|---|
| 01 | deviceList idle | 静态 | PASS |
| 02 | deviceList scanned | 直种 state.devices ×2 + renderDeviceList | PASS（2 卡同构） |
| 03 | connected multi | connectedDevices.add ×2 + renderConnectedDevicesPanel | PASS（badge=2；**多设备汇总卡正典行为 ✓**：两台起显示汇总+全部断开） |
| 04 | deviceDetail | selectDevice | PASS（服务未发现空态处理得当） |
| 05 | broadcast idle | 静态 | PASS |
| 06 | about | 静态 | PASS（无推广区；BLE Toolkit+ ✓；品牌卡→应用信息→相关链接→页脚） |
| 07 | versions | switchTab | PASS |
| 08-10 | HID 三视图 | showHidView 直达 | PASS |

## 边界与口径

- **P2-4（记录）**：浏览器裸跑时 `startScan` 因缺 `__TAURI__` 先抛错，`toggleScan` 的 mock 注入块在
  `await startScan()` 之后被跳过 —— mock 注入在纯浏览器场景不可达（E2E 文档所述「浏览器手调
  ?mock=true」路径实际失效），需在 Tauri 壳内或 catch 注入错后才能生效。本轮以直种 state 等价覆盖。
- 未覆盖：Tauri 壳内 WKWebView 实况（macOS 无 CDP 通道）；Rust 侧 BLE 真链归硬件轮。
  渲染层与 Electron 前端同构（同名视图/组件/样式），浏览器渲染层验证可作为 UI parity 依据。

## 视觉审查

4 张关键态（02/03/04/06）送视觉模型审查全部 0 异常。
