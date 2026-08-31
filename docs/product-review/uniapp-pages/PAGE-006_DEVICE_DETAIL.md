# PAGE-006 通用设备详情

> 路径：`pages/device/detail`
> 文件：`apps/uniapp/pages/device/detail.vue` + `composables/use-device-session.js`
> 审核日期：2026-08-31
> 证据：E0/E1；E5 UNPROVEN

## A. 用户任务与界面存在必要性

用户任务：对任意 BLE 设备维持**应用级 session**，展示身份与连接状态，发现服务树，执行 Read / TEXT Write / HEX Write / Notify，查看隔离日志，并在设备声明 OTA 服务时进入升级。

必要性：**保留**。这是通用 GATT 主工具页，Smart HID 高级调试也复用本页。

## B. 进入、参数、出口

| 方向 | 事实 |
|---|---|
| 进入 | PAGE-001「连接」；PAGE-007 打开通用设备；PAGE-003「高级 BLE」 |
| 参数 | 紧凑 `deviceId/name/rssi/profileId` + 进程内 stash（`device-route-context.js`，MAX_STASH 30） |
| 出口 | 返回来源；Tab 仍可达 PAGE-007 |
| 返回 | `onUnload` **不 close session**，只摘 UI/Notify 控制器 |
| 深链 | 冷启动只有基础身份；完整广播不在 URL |

缺 deviceId：modal「无法打开设备」后返回。

## C. 当前真实内容（从上到下）

1. 设备名、连接状态点、设备 ID。
2. 有 OTA service 时右上「固件更新」。
3. 行：清空日志、导出日志、连接设备/断开连接（初始化/连接中显示「连接中…」且 disabled）。
4. `service-panel`：idle/connecting/empty/error/ready；Read/Write/Notify；失败常驻「手动重试」。
5. `log-panel`。
6. `write-dialog`：文本/HEX。
7. `ota-dialog`。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 |
|---|---|
| 身份+连接状态首屏 | 保留 |
| 服务树与属性 | 保留 |
| Read / TEXT / HEX / Notify | 保留 |
| 日志清空/导出 | 保留；空导出有 toast「暂无日志」 |
| 返回保留 session | 保留 |
| OTA 入口 | **产品待决**：无安全恢复设备时应降级隐藏或标实验 |
| 日志脱敏 | 通用 GATT 不自动剥 Wi-Fi 密码；HID 不应把密码写入本页日志 |
| 「连接中」与服务 loading | 已有 connecting/empty/error |

## E. 操作表

| 操作 ID | 控件 | 显示 | 禁用 | 行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-010 | 连接/断开 | 始终 | initializing/connecting | 断：`disconnectConnectedDevice({remove:false})`；连：`connectDevice` 或复用 registry | 状态点+服务树 | lastConnectError + 面板 error | 本页 | 主动断开标记不重连 |
| OP-011 | 服务发现 | 随连接 | 同上 | connect 内 `getServices/getCharacteristics` | 树 | empty 或 error+重试 | 本页 | 失败 close 半开连接（Runtime） |
| OP-012 | Read | 属性允许 | 无 session return | `readValue` 3s 超时 | 日志 HEX+UTF-8 | 日志错误 | 本页 | one-shot listener |
| OP-013 | TEXT Write | Write 属性 | isSending | encode UTF-8 → `writeValue` | toast 写入成功+日志 | 日志错误 | 关弹窗 | 弹窗状态 |
| OP-014 | HEX Write | 同 | 非法 HEX 在 encode 抛错 | 严格偶数 HEX | 同 | 不调用 API（encode 失败） | 本页 | 弹窗 |
| OP-015/016 | Notify 开关 | Notify/Indicate | pending 忽略连点 | tuple subscribe/disable | 日志开关成功；char.notifying | 日志失败 | 本页 | unload dispose disable |
| OP-017 | 清空/导出 | 始终 | 导出空日志 toast | clear / clipboard | 明确 | 剪贴板失败依赖系统 | 本页 | 容量 logger 200/设备 500 全局 |
| OP-018 | 主动断开 | 已连接 | 连接中 | 见 OP-010 | 离线且不自动重连 | 断开失败日志 | PAGE-007 应同步 | Notify/session 按 store |
| OP-019 | 被动断开 | 已连接 | N/A | Runtime callback → 有限 3 次重连 | 重连成功或耗尽 | 耗尽需手动重试 | 本页 | pending 拒绝 |
| OP-020 | 选固件 | hasOtaService | 无服务则无按钮 | ota-dialog 选文件 | 文件信息 | 空/非法不开始 | 弹窗 | 句柄 |
| OP-021 | OTA 传输 | 弹窗 | 协议/设备 | start/ready/data/commit | 需设备 success | 超时不成功 | 本页 | Notify/writer |

## F. 状态表

`resolveServicePanelState`：idle / connecting / ready / empty / error。另：reconnecting 通过日志与重试计数；autoRetryExhausted 并入 error。timeout 在 Read/OTA。cancelled：写弹窗取消。permission/unsupported：适配器失败进入 error。

## G. 字段来源

| 字段 | 来源 |
|---|---|
| 身份 | 路由 + stash + Store |
| 连接 | Runtime session + Store isConnected |
| 服务/属性 | GATT discovery |
| Read/Notify 值 | GATT Read / Notify |
| 日志 | `core/ble-core/utils/logger.ts` 按 deviceId |
| OTA | 文件 + OTA Notify JSON |

## H. 运行链路

`onLoad` `openFromRoute` → 有活 session 则 bind 不重连；否则 `openAdapter` + `connectDevice`。GATT 经 Runtime。`onUnload`：pageActive=false，取消 logger 订阅与重连 timer，**session 留在 registry**。

Notify：页面 `createNotifyToggleController`，离开页 disable。因此返回 PAGE-006 后 Notify 默认关，需再开。这是产品需确认点：应用级 session 在，订阅不在。

## I. 依赖

LightBLE Peripheral：主服务、权限服务、Notify、可选 OTA。OTA E5 需可恢复固件。微信文件选择 Adapted。

## J. 第一断点

- P0：GATT E5 未做。
- P1：OTA 无回滚方案仍暴露入口。
- P1：离页关闭 Notify 可能让用户以为「连接还在所以监听还在」。
- P2：日志导出未做敏感扫描。

## K. 验收

- E1：`ble-runtime.test.mjs`、`device-session-operations.test.mjs`、`ota-manager.test.mjs`、`logger.test.mjs`。
- E5：连接、空服务、Read、TEXT/HEX、Notify 开关、断电、主动断开、日志、OTA（若首版保留）。

## L. 产品结论

**NEEDS_CHANGE**（OTA 策略、Notify 离页语义、OTA 按钮降级文案）。

结构保留，不 MERGE。

## M. 需要用户决定的问题

1. 首版是否保留 OTA UI？无安全设备时隐藏还是标 BLOCKED？
2. 离开详情是否保持 Notify？
3. 主动断开是否从 PAGE-007 移除会话（当前 `remove:false`，状态变离线但仍可能留在 map）？
