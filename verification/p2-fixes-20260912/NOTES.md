# P2 收尾轮 — 2026-09-12

用户「继续」授权：处理 UI Parity 轮 SUMMARY.md 遗留的 P2-1~P2-4，全部修复并实机验证。

## 修复明细与验证

| 项 | 根因 | 修复 | 验证 |
|---|---|---|---|
| P2-1 code prop 警告 | 两个生产者传 Number：①store/ble.js:198 直接透传 uni errCode（10006）；②mock 桥 p001 failed 种子种 `code: 10006`（报告轮的实际触发器）。error-banner 的 code prop 契约是 String（ERROR_CODE.md） | 两处均归一 String() | **dev 模式实机**：种 p001 failed → 码片「10006」正常渲染，控制台零警告（旧警告 "Expected String, got Number" 消失）。注意：build:h5 生产构建剥掉 Vue 警告，验证必须在 dev:h5 下做 |
| P2-2 deviceId undefined ×3 | ota-dialog 在 deviceInfo.deviceId 未就位的导航时序即挂载 | `<ota-dialog v-if="deviceInfo.deviceId">` 门控 | **dev 模式实机**：种 p006 ready + go 详情页 → deviceId 正确渲染（D8:A6:…），控制台零警告 |
| P2-3 Electron mock 重载语义 | 注入块跟在 `await startScan()` 后——重载后主进程扫描仍在途时 startScan 抛错 → 注入被跳过，违背 E2E 文档「按下扫描必现 Dummy」 | 注入移入 try/finally，startScan 失败也保证注入 | 结构修复 + node --check（注入块代码逐字未动仅移位）；live 重放需 Electron GUI 通道未跑 |
| P2-4 Tauri 纯浏览器 mock 不可达 | 真实机制（比报告更早一层）：`setupEventListeners()` 在 `__TAURI__` 判空之后——裸浏览器 init 提前 return，**toggleScan 根本没绑定**，注入块天然不可达 | 对齐 Electron 模式：`?mock=true` 且无 __TAURI__ 时 polyfill `invoke/listen`（`{success:true}` 桩），事件绑定照常走 | **实机全链**：8741 静态服务 + ?mock=true → 芯片「蓝牙就绪」→ 点扫描 → Dummy-BLE-01/02 注现 +「扫描完成·发现 2 台」+ 5s 自动停 |

## 连带发现并修复：Tauri 空态残留 bug

P2-4 实机验证时暴露：`renderDeviceList` 空态分支整块替换 innerHTML 后 return；有结果分支只做卡片增删、**从不清残留 `.empty` 节点** → 首个设备出现时空态与设备卡同屏（真机扫描同样会踩，非 mock 特有）。修复：非空路径先 `querySelector('.empty')?.remove()`。复验通过（快照中空态文案消失）。Electron 同构函数是整列表重建（`innerHTML=''`），无此问题。

## 方法备注

- Vue prop 警告只在 dev 模式存在；生产构建验证「无警告」是假绿。
- 同文档 hash 跳转不触发新加载——`?mock=1` 丢在 hash 之外的 URL 变更后桥不重装，需强制新文档加载。
- uniapp H5 构建产物在 unpackage/dist/build/h5（run-uni.mjs 设 UNI_OUTPUT_DIR）。
