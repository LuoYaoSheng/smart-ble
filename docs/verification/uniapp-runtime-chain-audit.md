# UniApp Runtime / Web 链路审计（G2）

> 日期：2026-08-31
> 证据：E0 静态搜索 + E1 单测；E5 UNPROVEN
> 规则：代码存在 ≠ 用户链路可达；无 E5 不得 PASS

配套：`uniapp-esp32-page-operation-matrix.md`、`landing-page-link-and-claim-matrix.md`。

---

## 0. 全局搜查结论

| 问题 | 结论 | 证据 |
|---|---|---|
| Runtime 之外是否仍注册全局 BLE callback | **Central 回调集中在 Runtime** | `apps/uniapp/services/ble-runtime/index.js` `ensureCallbacks()` 注册四类 on*。`pages/**/*.vue` 无 `onBLECharacteristicValueChange` 等 |
| 页面是否绕过 Runtime | **GATT/扫描不绕过** | 页面走 store/composable。例外：微信权限 `wx.getSetting`；Peripheral `createBLEPeripheralServer`；App `LysBlePeripheral` 不经 Central Runtime |
| Notify 是否 device+service+characteristic tuple | **是** | `valueKey(deviceId, serviceId, characteristicId)` |
| 旧 session 事件是否覆盖新 session | **有防护** | registry replacement 退订旧 callback；Runtime `invalidateSession` 后 dead；E1 覆盖 |
| 页面离开是否错误关闭应用级 session | **PAGE-006 不关** | `use-device-session.js` `onUnload` 只摘 UI。PAGE-005 仅 `ownsConnection` 才 disconnect。PAGE-002 dispose 默认可关 HID session |
| Peripheral server/adapter owner 是否唯一 | **微信控制器设计为单一 owner** | `wx-peripheral-mode.js` `ownsAdapter`；E1 覆盖并发 release。App 插件路径待 E5 |

---

## 链路格式说明

每条：用户入口 → 页面函数 → component/composable → store/service → runtime/provisioning → uni/wx/plus → callback → Store/UI → 正常 → 失败 → 清理 → ESP32 → 第一断点 → 证据。

---

## 1. 启动和平台能力

用户打开 App/小程序/H5
→ 各页 `onLoad`/`onShow`
→ PAGE-001 `useBleScan.checkBluetoothState`；PAGE-008 platform detect；PAGE-009 `getDeviceInfo`
→ `uni.getBluetoothAdapterState` / `getSystemSetting` / `typeof uni.openBluetoothAdapter`
→ Store `bleState` on/off/unsupported
→ 正常：导航「蓝牙就绪」
→ 失败：unsupported 文案
→ 清理：无
→ ESP32：N/A
→ 第一断点：H5 无 BLE API（有降级）；Android 权限未在启动时预检
→ 证据：E1 `ble-platform.test.mjs`；E5 UNPROVEN

## 2. 权限

用户点开始扫描
→ `useBleScan.start` → `requestBleScanPermission`
→ 微信：授权蓝牙 + `openAdapter` + `scope.userLocation`；非微信：仅检查 API
→ `wx.showModal` / `openSetting`
→ 正常：`{ok:true}` 继续扫描
→ 失败：`bluetooth_permission_denied` / `location_permission_denied` / `ble_not_supported` / `bluetooth_unavailable`
→ 清理：不开始 discovery
→ ESP32：N/A
→ 第一断点：Android 12+ 权限不在该模块细化；永久拒绝路径依赖系统
→ 证据：E1 `scan-permission.test.mjs`；E5 UNPROVEN

## 3. 扫描 start / stop / timeout / hide / second round

用户 toggle
→ `start`/`stop`/`onHide`
→ `store.startScan` → `createScanSessionController`
→ `openAdapter`（指数重试 3）→ `stopDiscovery` 兜底 → `startBluetoothDevicesDiscovery({allowDuplicatesKey:true})`
→ `onBluetoothDeviceFound` → buffer 1s → merge
→ 正常：scanning→timeout toast；stop 回 idle
→ 失败：`scanError` + modal
→ 清理：timer；starting 清空列表；**discovery listener Store 常驻**
→ ESP32 Peripheral 广播
→ 第一断点：active 时二次 start join 同一 session（E1 有）；hide 后立刻 start 的竞态 E5 未知
→ 证据：E1 `scan-session.test.mjs` `device-collection.test.mjs`

## 4. 广播数据归一化、详情、复制

用户点卡片
→ `showAdvertisingData` → `advertisement-dialog`
→ Store 已在 merge 时 `normalizeAdvertisement`
→ 无额外 API
→ 正常：未提供/空/HEX 区分
→ 失败：复制系统失败弱反馈
→ 清理：关弹窗清空 selected
→ ESP32：UUID/厂商字节应对上固件
→ 第一断点：显示名不解析 AD 0x08/0x09（DISC-004 Gap）
→ 证据：E1 `advertisement.test.mjs`

## 5. 连接和服务发现

用户连接
→ `prepareConnect` 停扫 → PAGE-006 `openFromRoute` → `connectBleDevice`
→ Runtime `createBLEConnection` → `getBLEDeviceServices` / `getBLEDeviceCharacteristics`
→ 失败则 `closeBLEConnection` 半开连接
→ `bindConnectedSession`
→ 正常：服务树 ready
→ 失败：empty/error + 有限重连
→ 清理：attempt map 在 finally 删除
→ ESP32 接受连接、返回三组服务
→ 第一断点：微信服务发现延迟依赖 expectedService 重试（HID 有，通用默认 1 次）
→ 证据：E1 `ble-runtime.test.mjs`

## 6. Read

用户点 Read
→ `onReadCharacteristic` → `readValue(session,s,c,3000)`
→ `readBLECharacteristicValue` + 一次性 value listener
→ 日志 HEX+UTF-8
→ 失败：超时去掉 listener；断开 reject
→ ESP32 固定/动态值
→ 第一断点：无 Read 属性时 UI 是否隐藏依赖 service-panel 属性位 E5
→ 证据：E1 runtime read tests

## 7. TEXT Write

用户写弹窗选文本
→ `encodeWritePayload('text')` UTF-8 → `writeBLECharacteristicValue`
→ toast + 日志
→ 失败：日志；设备拒绝
→ ESP32 LED 文本命令
→ 第一断点：无写入队列；高频连点可能并发（GATT-006 Partial）
→ 证据：E1 `device-session-operations.test.mjs`

## 8. HEX Write

同 7，`encodeWritePayload('hex')` 严格偶数；非法不调 API。
ESP32 `FF 00` 等。E5 需 LED 客观变化。

## 9. Notify enable / value / disable

用户开关
→ `createNotifyToggleController.toggle`
→ `notifyBLECharacteristicValueChange` + `subscribe` tuple
→ value callback → 页面日志
→ disable 远程+本地
→ unload `dispose` disable
→ ESP32 周期 Notify
→ 第一断点：离页关闭订阅但 session 仍在；多页同特征未测
→ 证据：E1 runtime notify + operations serialize

## 10. 主动断开

PAGE-006 断开：`isUserDisconnected=true` → `disconnectConnectedDevice({remove:false})` → `session.close` → `closeBLEConnection`。不自动重连。
PAGE-007 单断：`remove:true` 删 map。
→ ESP32 onDisconnect 串口
→ 第一断点：remove false 时已连接 Tab 过滤 isConnected，项应消失但仍占 map
→ 证据：E1 runtime active disconnect

## 11. 被动断开和有限重连

`onBLEConnectionStateChange` connected=false 且非本地 close 窗口
→ `invalidateSession` → registry onDisconnect → PAGE-006 `retryConnection` 最多 3 次，间隔 2s/4s/6s
→ 耗尽 `autoRetryExhausted`
→ ESP32 断电
→ 第一断点：HID 页与通用页重连策略不同
→ 证据：E1；E5 UNPROVEN

## 12. 跨 Tab session

PAGE-006 unload 保留 registry；PAGE-007 再打开 `buildConnectedDeviceOpenUrl` → 同 deviceId `connectDevice` 复用 existing session。
→ 第一断点：Notify 已 dispose，复用连接后需重开监听
→ 证据：E1 reuse session；E5 UNPROVEN

## 13. 多设备

`state.sessions` Map per deviceId；Notify key 含 deviceId。
E1 明确「断 A 留 B」。E5 需两台硬件。
第一断点：微信连接数上限。

## 14. Peripheral support / create / start / stop / close

PAGE-008 检查/开始（页面内联；`useBroadcastSession.js` **无引用**）
→ App 插件；微信 adapter owner + server
→ 活动连接保护
→ hide：App 停广播；微信 release mode
→ ESP32 Observer **不存在** → 观察依赖外部 App
→ 第一断点：插件缺失应 Unsupported 而非无响应（代码有校验，E5 未知）
→ 证据：E1 wx-peripheral；E5 BLOCKED Observer

## 15. OTA file / ready / data / commit / success / reboot

OTA 按钮仅 `hasOtaService`
→ `ota-dialog.vue` 选文件 → `OtaManager.startOta`
→ `setMtu(247)`（失败继续）→ 订阅 `CHAR_STATUS` → 只向 `CHAR_DATA` 分包 `writeNoResponse`（180B / 20ms）
→ **不写入 `CHAR_CTRL`**：无 start / ready 握手 / commit / abort / reboot 控制写
→ 等 STATUS JSON `status==="success"`；无 success 则超时失败，不把写完当成功
→ 重启回读版本：功能目录 OTA-007 Gap
→ ESP32 固件 OTA 服务含 Control 状态机，与 UniApp 客户端不对齐
→ 第一断点：P1 无安全设备；协议 ts 无 OTA UUID；CTRL 未接线，固件若要求 start 则 E5 必 FAIL
→ 证据：E1 ota-manager；E5 BLOCKED

## 16. Smart HID matcher / Device Info / QR / candidate / status waiter

扫描 `matchScannedDevices`
→ PAGE-002 `smartHidService.connect` → expected service → Read Info → 身份
→ QR `parsePairingQrPayload`
→ framing write candidate
→ `createSmartHidStatusWaiters`
→ 八类错误 `smartHidRecoveryAction`
→ ESP32 LightBLE **不能**替代 Smart HID 固件
→ 第一断点：E5 后置；错设备断开依赖 Info 校验
→ 证据：E1 profile/workflow/form/provisioning

## 17. Smart HID history / diagnostics

历史：storage 非敏感。诊断：connect+diagnose；owned unload disconnect。
→ 第一断点：PAGE-003 不标历史；诊断不自动跑
→ 证据：E1 known-devices 排除密码；E5 后置

## 18. 关于页外链、复制、分享、小程序跳转

`openExternal` / `uni.share` / `navigateToMiniProgram`
→ 无 BLE
→ 第一断点：失败反馈不统一；推广 appId 写死
→ 证据：E0；E5 UNPROVEN

---

## Web 链路（WEB-001）

编辑 `docs/index.md` → VitePress build → Pages。CTA 到契约、MASTER、GitHub latest。无版本 API。无二维码服务。本轮 build PASS。声明审计见落地页矩阵。

---

## 证据等级总表

| 链路 | 最高已达 | 正式能力所需 |
|---|---|---|
| 1-2 启动权限 | E1 | E5 |
| 3-9 扫描 GATT Notify | E1 | E5 |
| 10-13 会话多设备 | E1 | E5 |
| 14 广播 | E1 | E5 + Observer |
| 15 OTA | E1 | E5 + 恢复策略 |
| 16-17 HID | E1 | E5 后置 |
| 18 关于 | E0 | E4/E5 |
| WEB | E3 build | E6 公开入口 |
