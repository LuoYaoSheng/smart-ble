# UniApp × ESP32 页面—操作—运行链路矩阵

> 状态：G2 已填真实入口；无 E5 一律 `UNPROVEN`
> 更新：2026-08-31
> 审计：`uniapp-runtime-chain-audit.md`
> 规则：页面能打开、单元测试通过、模拟器显示设备，都不能自动升级为 E5 PASS。

## 1. 状态定义

- `UNPROVEN`：尚未达到要求证据等级。
- `PASS`：页面、运行链路、设备结果和后续状态全部符合。
- `FAIL`：任一层不符合，必须记录第一断点。
- `BLOCKED`：缺平台、硬件、固件、权限或明确外部依赖。
- `N/A`：平台明确不支持，并已提供正确降级。

## 2. 证据等级

- `E0`：文档、路由、静态配置。
- `E1`：纯逻辑单元测试。
- `E2`：Fake Runtime / 集成测试。
- `E3`：Android、微信、H5 构建。
- `E4`：页面自动化、原型、模拟器。
- `E5`：手机真机 + ESP32 / 观察端。

## 3. 操作矩阵

| ID | Page | 页面区域 | 控件/操作 | 显示/前置条件 | 当前实现入口 | 预期 Runtime 链路 | ESP32 / 观察端行为 | 成功 UI | 失败 UI | 清理要求 | 最低证据 | 当前状态 | 第一断点 / 备注 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OP-001 | PAGE-001 | 扫描控制 | 开始扫描 | 平台支持、未扫描 | `pages/index/index.vue` `toggleScan` → `use-ble-scan.js` `start` → `store.startScan` → `scan-session.start` → `ble-runtime.startDiscovery` | page → composable → store → scan-session → ble-runtime → startDiscovery | Peripheral 持续广播 `ESP32-BLE-Server`（非宏 `BLEToolkit-Server`）与主 UUID | 按钮变停止、列表增量、数量正确 | 权限/蓝牙/平台 modal 或 `scanError` banner | 失败或离页停止 discovery | E5 | UNPROVEN | `filteredCount` 未展示；Android 权限弱于微信 |
| OP-002 | PAGE-001 | 扫描控制 | 手动停止 | 正在扫描 | `toggle` → `store.stopScan('user')` | stop → `stopDiscovery` | ESP32 继续广播 | 按钮恢复开始、有设备则「已完成」 | 停止失败进 scanError | listener/session 不残留 | E5 | UNPROVEN | discovery listener 在 Store 常驻 |
| OP-003 | PAGE-001 | 生命周期 | 超时自动停止 | 默认 5s | `use-ble-scan` `autoStopSeconds=5`；session timer `timeout` | scan timer → stop | 无 | toast 完成+数量，不当失败 | timer 错误可诊断 | timer 清理 | E5 | UNPROVEN | |
| OP-004 | PAGE-001 | 生命周期 | 切 Tab / 页面隐藏 | 正在扫描 | `onHide`/`onUnload` `stop('page_hide/unload')` | onHide → stop | 无 | 返回后不是假扫描中 | 停止失败可见 | discovery 与 timer | E5 | UNPROVEN | |
| OP-005 | PAGE-001 | 设备集合 | 两轮独立扫描 | 第一轮已结束 | `scan-session` 新 id；starting 清空 `scannedDevices` | 新 generation | 两轮均可发现 | 第二轮独立 | 失败不把旧结果当新结果 | generation 清理；active 时 start 会 join | E5 | UNPROVEN | E1 已测独立 sessionId |
| OP-006 | PAGE-001 | 设备卡片 | 查看广播详情 | 设备存在 | `showAdvertisingData` → `advertisement-dialog.vue`；数据来自 `normalizeAdvertisement` | 打开快照，不连接 | 字段与固件一致 | 名称、ID、RSSI、UUID、Manufacturer、原始；未提供/空/值区分 | 复制失败弱 | 关弹窗不影响扫描 | E5 | UNPROVEN | 卡片名未解析 AD 0x08/0x09 |
| OP-007 | PAGE-001 | 设备卡片 | 连接普通设备 | 未连接 | `connectDevice` → `prepareConnect` → `buildGenericDeviceDetailUrl` | 停扫描 → PAGE-006 → `connectDevice` | ESP32 接受连接 | 进入详情连接中 | 连接失败在 PAGE-006 | 扫描停止，session 唯一 | E5 | UNPROVEN | |
| OP-008 | PAGE-001 | 设备卡片 | Profile 专属动作 | `profileId` | `openProfileDevice` → `buildProfileActionUrl`；smart-hid → PAGE-002 | profile navigation | LightBLE `esp32-demo` 或 Smart HID | 连接与 Profile 分按钮 | 弱匹配需 PAGE-002 再确认 | 不建第二扫描器 | E4/E5 | UNPROVEN | Smart HID E5 后置 |
| OP-009 | PAGE-001 | 筛选 | RSSI/名称/隐藏无名 | 有扫描数据 | `filter-panel.vue` + `device-filter.js` | pure filter | 无 | 即时过滤不改源 | 筛选无结果单独空态 | 无 | E2+E5 | UNPROVEN | 工具栏未显示筛选数 |
| OP-010 | PAGE-006 | 连接状态 | 自动/手动连接 | 有 deviceId | `use-device-session.js` `openFromRoute`/`connectDevice` | page → composable → `ble-runtime.connectDevice` | ESP32 建连 | 状态、服务进度可见 | 连接/发现错误区分 | 单设备单 attempt | E5 | UNPROVEN | 复用 registry session |
| OP-011 | PAGE-006 | 服务区 | 服务发现 | 已连接 | Runtime `discoverServices`；UI `service-panel.vue` `resolveServicePanelState` | getServices → getCharacteristics | 主/权限/OTA 服务 | 树完整、属性准确 | empty/error + 手动重试常驻 | discovery 失败关半开连接 | E5 | UNPROVEN | |
| OP-012 | PAGE-006 | Characteristic | Read | 属性允许 Read | `onReadCharacteristic` → `readValue` | runtime read | 固定/动态值 | HEX 与 UTF-8 日志 | 超时/权限/断开 | one-shot listener | E5 | UNPROVEN | |
| OP-013 | PAGE-006 | Characteristic | TEXT Write | Write | `write-dialog` → `encodeWritePayload` → `writeValue` | UTF-8 write | LED/协议 | 成功 toast+日志 | 拒绝/断开/超时 | 弹窗 | E5 | UNPROVEN | 无严格写队列 |
| OP-014 | PAGE-006 | Characteristic | HEX Write | 合法偶数 HEX | 同上 type hex | strict HEX | LED HEX | 成功日志、LED 变化 | 非法 HEX 不调 API | 弹窗 | E5 | UNPROVEN | |
| OP-015 | PAGE-006 | Characteristic | 开启 Notify | Notify/Indicate | `createNotifyToggleController` → `subscribe` tuple | enableNotify + tuple | 周期 Notify | 开关真、日志更新 | 开启失败日志 | device/service/char 隔离 | E5 | UNPROVEN | |
| OP-016 | PAGE-006 | Characteristic | 关闭 Notify | 已订阅 | `setNotifyEnabled(false)` | remote disable + unsubscribe | 停订阅 | 开关关 | 关闭失败可见 | unload dispose | E5 | UNPROVEN | 离页会关 Notify |
| OP-017 | PAGE-006 | 日志 | 清空/导出 | 有或无日志 | `clearLogs` / `shareLogs` → `formatDeviceLogExport`；logger 200/设备 | logger | 无 | 空不假导出 | 剪贴板失败系统 | 容量上限 | E4/E5 | UNPROVEN | |
| OP-018 | PAGE-006 | 连接状态 | 主动断开 | 已连接 | `toggleConnection` `remove:false` | `close` explicit | onDisconnect | 离线、不重连；007 因 isConnected 过滤 | 断开失败日志 | Notify/session | E5 | UNPROVEN | map 可能留离线条目 |
| OP-019 | PAGE-006 | 连接状态 | ESP32 断电 | 已连接 | Runtime connection callback → `retryConnection` ×3 | passive → registry | 断电 | 离线或重连/耗尽 | 不显示在线 | pending 全拒绝 | E5 | UNPROVEN | |
| OP-020 | PAGE-006 | OTA | 选择固件 | `hasOtaService` | `ota-dialog.vue` | file select | 版本/大小可识别 | 文件信息 | 空/非法不开始 | 句柄 | E4/E5 | UNPROVEN | 无服务则无按钮 |
| OP-021 | PAGE-006 | OTA | Start/Ready/Data/Commit | 已批准可恢复设备 | `utils/ota_manager.js` `startOta` | 实际：STATUS notify + DATA chunks；**CHAR_CTRL 未写** | 固件期望 start/ready/commit；客户端未发 | success 后才完成 | timeout 不成功 | Notify/writer | E5 | BLOCKED | CTRL 未接线；需安全固件与恢复；OTA-007 回读 Gap |
| OP-022 | PAGE-007 | 会话列表 | 打开已连接设备 | 真实活动 session | `buildConnectedDeviceOpenUrl` | registry → profile/generic | 连接保持 | 复用连接 | session 失效时 PAGE-006 处理 | 页面只加 UI listener | E5 | UNPROVEN | HID 配网 session 可能不在列表 |
| OP-023 | PAGE-007 | 会话列表 | 单独断开 | 有目标 | `disconnectDeviceFromList`；HID 先 `smartHidService.disconnect` | disconnect target | 目标断开 | 只移除目标 | 失败保留 | 不影响其他 | E5 | UNPROVEN | |
| OP-024 | PAGE-007 | 批量操作 | 全部断开 | 多 session | `disconnectAllDevices` **只** `bleStore.disconnectConnectedDevice` | allSettled | 多设备断开 | 成功清除、失败汇总 | 不误报全成功 | listener 对应清理 | E5 | UNPROVEN | 未调 smartHidService |
| OP-025 | PAGE-007 | 多设备 | 同 UUID Notify 隔离 | 两台设备 | Runtime `valueKey` | tuple route | 两台不同 payload | 各日志正确 | 串线 FAIL | A 断不清 B | E5 | UNPROVEN | 需两台设备 |
| OP-026 | PAGE-008 | 平台能力 | 检查 Peripheral 支持 | 进入/按钮 | `pages/broadcast/index.vue` `checkSupport`；微信 `wx-peripheral-mode`；App `LysBlePeripheral` | capability adapter | Observer 等待 | 支持/不支持/错误明确 | 插件缺失、微信限制 | owner 可释放 | E5 | UNPROVEN | H5 不支持 |
| OP-027 | PAGE-008 | Payload | 修改名称/UUID/厂商 | 未广播或允许编辑 | `analyzeAdvertisingPayload` + 页面字段；Android 名可能系统接管 | shared validator | Observer 解析字节 | 字节预算即时 | 非法 UUID/HEX/超长阻止 | 不静默截断 | E2+E5 | UNPROVEN | 双套字节函数风险 |
| OP-028 | PAGE-008 | 广播 | 开始广播 | payload 合法、无冲突 | App 插件 start；微信 server start；`validateAppBroadcastStart` | mode handoff → create → start | Observer 发现手机 | 实际成功后广播中 | Central 冲突/权限/API | owner 单一 | E5 | UNPROVEN | |
| OP-029 | PAGE-008 | 边界 | 31/32 字节 | 支持平台 | `MAX_LEGACY_ADVERTISING_BYTES=31`；单测 31/32 | validator | Observer 31 可见；32 无新广播 | 31 可开始、32 阻止 | 明确超限 | 32 无 API | E5 | UNPROVEN | E1 已过 |
| OP-030 | PAGE-008 | 广播 | 停止/离页 | 广播中 | `stopAdvertising`；`onHide` App 停；微信 `releaseWxPeripheralMode` | stop → close → release | Observer 不再发现 | 已就绪 | 停止失败可见 | server/adapter | E5 | UNPROVEN | 无第一方 Observer 固件 |
| OP-031 | PAGE-009 | 信息入口 | 官网/仓库/文档/反馈 | 对应入口 | `openWebsite`/`openFeedback`；**无仓库/文档/ESP32 按钮** | platform navigation/copy | 无 | 打开或复制 | 失败弱 | 无 | E4/E5 | UNPROVEN | 缺仓库/文档/ESP32/License |
| OP-032 | PAGE-009 | 分享 | 好友/朋友圈/系统 | 平台支持 | `shareApp` | share hook | 无 | 内容与名称 | 不支持降级复制 | 无 | E5 | UNPROVEN | |
| OP-033 | PAGE-010 | 版本 | 打开版本记录 | 从关于 | `goVersion` → `pages/about/version.vue`；`onShow` 回顶 | route | 无 | 首项应=运行时版本 | 漂移 FAIL | 无 | E4 | UNPROVEN | 静态 v1.0.5 vs package 1.0.0 |
| OP-034 | PAGE-002 | Smart HID | 自动连接与身份确认 | 匹配 Profile | `use-smart-hid-provisioning` `connectDevice` → `smartHidService.connect` | profile → runtime expected service | Smart HID firmware | 连接/身份正确 | 错设备断开 | 半初始化清理 | E5 | UNPROVEN | 通用 BLE Gate 后执行 |
| OP-035 | PAGE-002 | Smart HID | 扫码与 candidate 下发 | Device Info 通过 | QR → `provision-form` → framing → write；`statusWaiters` | QR → form → write | Status Notify | 进度与 Ready | 八类错误唯一恢复 | token/waiter 清理 | E5 | UNPROVEN | 后置 |
| OP-036 | PAGE-003 | Smart HID | 重配/诊断/高级 BLE | 有历史设备 | `hid-navigation.js` / `profile-navigation.js` | route helpers | 重配需固件 | 保持 deviceId | 历史不冒充实时（当前缺文案） | 无敏感 query | E5 | UNPROVEN | 后置 |
| OP-037 | PAGE-004 | Smart HID | 查看/移除历史 | 有本地历史 | `hidStore.removeKnownDevice` | history store | 无设备动作 | 查看正确；移除仅本地 | 确认；存储失败弱 | token/password 不存 | E4 | UNPROVEN | 与 PAGE-001 列表重复 |
| OP-038 | PAGE-005 | Smart HID | 实时诊断 | 可重连设备 | `refresh` → `connect`+`diagnose`；unload owned disconnect | session Info/Status | Smart HID | 五项实时 | 离线/失败/超时 | owned/borrowed 清楚 | E5 | UNPROVEN | 不自动检测 |
| WEB-001 | WEB-001 | 落地页 | 见声明矩阵 | 静态站点 | `docs/index.md` | VitePress | N/A | 可构建 | 声明与产物不符 | 无 | E6 | FAIL/UNPROVEN | 不修改本轮；见 claim matrix |

## 4. 页面内容审核状态

| Page | 产品目的 | 首屏内容 | 操作完整 | 状态完整 | 跳转正确 | 数据来源明确 | ESP32 对应明确 | 结论 |
|---|---|---|---|---|---|---|---|---|
| PAGE-001 | 扫描主入口 | NEEDS_CHANGE | 链路在 | 权限/筛选数缺口 | 连接/Profile 分离 | 显示名 Gap | Peripheral | NEEDS_CHANGE |
| PAGE-002 | 三阶段配网 | 结构合理 | 链路在 | 八类 E1 | 出口清 | token 内存 | Smart HID 后置 | NEEDS_CHANGE |
| PAGE-003 | 历史快照 | 缺历史声明 | 三动作在 | 无实时 | 带 deviceId | 本地历史 | 间接 | NEEDS_CHANGE |
| PAGE-004 | 历史管理 | 说明充分 | 开/移除/扫描 | 存储失败弱 | 合理 | 本地 | 无直接依赖 | NEEDS_CHANGE |
| PAGE-005 | 实时诊断 | 不自动跑 | 检测/重配 | 五项有 | 栈感知 | Info/Status | Smart HID 后置 | NEEDS_CHANGE |
| PAGE-006 | GATT 工具 | 身份可见 | GATT+OTA | 面板五态 | 返回保 session | GATT+logger | Peripheral fixture | NEEDS_CHANGE |
| PAGE-007 | 活动会话 | 「连接稳定」错 | 全断缺口 | 空态有 | profile 路由 | Store | 两设备 | NEEDS_CHANGE |
| PAGE-008 | 手机广播 | 平台标签 | 起停在 | H5 不支持 | Tab | 本地 payload | Observer BLOCKED | NEEDS_CHANGE |
| PAGE-009 | 产品信息 | 推广压主 | 缺仓库/ESP32 | 平台过宽 | 外链 | 静态配置 | 无 | NEEDS_CHANGE |
| PAGE-010 | 版本史 | 静态首项 | 无交互 | N/A | 从关于 | 硬编码 | 无 | NEEDS_CHANGE |

## 5. 每轮 FAIL 记录模板

```text
Operation ID:
Page ID:
Platform:
App commit:
Firmware commit / SHA:
Phone / OS:
Precondition:
Steps:
Expected page result:
Expected ESP32 result:
Actual page result:
Actual ESP32 / observer result:
First breakpoint:
App log:
Serial log:
Screenshot/video:
Fix commit:
Regression result:
```
