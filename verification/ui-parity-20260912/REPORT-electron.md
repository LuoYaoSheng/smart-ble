# UI Parity 验证 · 线3 Electron（2026-09-12）

- 基线：commit `567f78a`
- 通道：`npx electron . --remote-debugging-port=9222` + 裸 CDP（WebSocket）驱动
  - 备注：playwright-core 新版 `connectOverCDP` 会对 Electron 118 发 `Browser.setDownloadBehavior` 报
    「Browser context management is not supported」，故改裸 CDP（脚本 `scripts/electron-capture.mjs`、
    `scripts/electron-real.mjs` 可复跑）
- 窗口：1200×900，captureBeyondViewport 全页截图
- 驱动 API：`appInstance.switchTab/selectDevice/connectToDevice/showHidView/startScan`
- Mock：`index.html?mock=true`（USE_MOCK_BLE）；本轮实际扫到 **7 台真实 BLE 设备**，
  含项目自有 ESP32 夹具 `BLEToolkit-Server`，已连接态走真实链

## 结论：PASS（10 视图全覆盖 = 9 视图对应 uniapp 页面 + GATT 详情；真实 BLE 连接链验证）

| # | 视图 | 数据源 | 视觉审查 |
|---|---|---|---|
| 01 | deviceList idle | mock | PASS |
| 02 | deviceList scanned | **真实 7 设备**（含 BLEToolkit-Server） | PASS（卡片结构/ID/RSSI/连接按钮齐全） |
| 03 | connected | **真实连接 BLEToolkit-Server**（connectedDevices.size=1） | PASS |
| 04 | deviceDetail GATT | **真实服务树**（180A/FFF0 等） | PASS |
| 05 | broadcast idle | 默认表单 | PASS（6/31 字节预算正典值 ✓） |
| 06 | about | 静态 | PASS（品牌卡→应用信息→相关链接→页脚；无推广区；BLE Toolkit+ ✓） |
| 07 | versions | 静态 | PASS |
| 08 | hidProvision | showHidView 直达 | PASS |
| 09 | hidDetail | showHidView 直达 | PASS |
| 10 | hidDiagnostics | showHidView 直达 | PASS |

## 视觉审查方式

10 张中 6 张关键态送视觉模型审查（扫描实列表/已连接实会话/GATT 实服务树/广播表单/关于/HID 配网）全部
0 异常；其余 4 张（idle/versions/hidDetail/hidDiagnostics）经 DOM 断言 + 截图存档。

## 发现项

- 无阻塞缺陷；零控制台错误
- **P2-3**（记录）：`?mock=true` 重载后 mock 假设备注入仅随 startScan 触发一次，重载后 devices map 只含
  真实设备 —— mock 语义与 E2E 文档描述（“按下扫描立即出现 Dummy-BLE-01”）在重载场景下不一致
