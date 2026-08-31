# PAGE-007 已连接

> 路径：`pages/connected/index`
> 文件：`apps/uniapp/pages/connected/index.vue`
> 审核日期：2026-08-31
> 证据：E0/E1；E5 UNPROVEN

## A. 用户任务与界面存在必要性

用户任务：只管理**真实活动 session**，打开详情时复用连接，单独或全部断开。

必要性：**保留为独立 Tab**。扫描列表不能承担多设备会话管理。

## B. 进入、参数、出口

| 方向 | 事实 |
|---|---|
| 进入 | Tab「已连接」 |
| 参数 | 无 |
| 出口 | 打开 → PAGE-003（smart-hid）或 PAGE-006；空态「去扫描」→ PAGE-001 |
| 返回 | Tab |

## C. 当前真实内容

1. custom navbar「已连接设备」。
2. 多于 1 台时摘要「N 台设备保持连接」+「全部断开」。
3. 列表或空态。空态：若 `hidStore.sessionOnline` 仍提示「Smart HID 配网连接进行中，这里列出通用调试连接。」
4. `device-card` `isConnectionTab`：徽章「连接稳定」、meta 按 profile、按钮「断开」；点卡片打开。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 |
|---|---|
| 仅 Store `connectedDevicesList`（isConnected） | 保留口径 |
| 空态去扫描 | 保留 |
| 「连接稳定」 | **删除/替换** 为「当前已连接」（契约明确禁止无健康指标时用稳定） |
| HID 配网 session 不出现在列表 | 修改：计数在扫描页计入 HID，本页却可能空，造成分裂 |
| 全部断开 | 保留；需确认是否覆盖 HID service session |
| stale session | registry 被动断开会 `updateDeviceConnectionStatus(false)` 从而过滤掉；`remove:true` 才删 map |

## E. 操作表

| 操作 ID | 控件 | 显示 | 禁用 | 行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-022 | 打开卡片 | 有 session | 无 | `buildConnectedDeviceOpenUrl` | 复用连接进详情 | 失效时 PAGE-006 会重连或报错 | PAGE-003/006 | 只加 UI listener |
| OP-023 | 单独断开 | 每卡 | 无 | HID 且 smartHidService.connected 则先 `smartHidService.disconnect`；再 `disconnectConnectedDevice({remove:true})` | toast 已断开 | toast 失败，行保留 | 本页 | 不影响其他 |
| OP-024 | 全部断开 | >1 台 | 无设备 return | `Promise.allSettled` 只调 `bleStore.disconnectConnectedDevice`，**不**走 smartHidService | 全成功 toast | modal 列出失败 | 本页 | 部分失败不谎报 |
| OP-025 | 同 UUID Notify 隔离 | 两设备 | 需两设备 | 在 PAGE-006 验证 | 各日志正确 | 串线 FAIL | 详情 | A 断不清 B |
| OP-EMPTY | 去扫描 | 空列表 | 无 | switchTab | 扫描 | N/A | PAGE-001 | 无 |

## F. 状态表

| 状态 | 适用 |
|---|---|
| idle | 有列表 |
| loading | 断开中无全局 loading |
| empty | 空态 |
| success | 断开 toast |
| error | 单台 toast / 批量 modal |
| disconnected | 列表项消失 |
| reconnecting | N/A 本页 |
| permission / unsupported / timeout / cancelled | N/A / 批量无取消 |

## G. 字段来源

Pinia `connectedDevicesMap` 中 `isConnected==true`。name/profileId 来自 bind。非扫描广播。

## H. 运行链路

打开：路由助手按 profile。断开：Runtime `closeDevice` + registry remove。批量：settled + `summarizeDisconnectAllResults`。

代码缺口：`disconnectAllDevices` **不**对 smart-hid 调 `smartHidService.disconnect`，与单台断开不一致。

## I. 依赖

两台 BLE 设备做 OP-025。LightBLE + 第二板或手机外设。

## J. 第一断点

- P1：「连接稳定」文案。
- P1：全部断开与 HID service 不一致。
- P2：HID 配网中本页为空，扫描页却显示已连接≥1。

## K. 验收

- E1：`connected-session-registry.test.mjs`、`connected-disconnect` 相关单测。
- E4：空态去扫描（page-flow）。
- E5：复用连接、单断、全断部分失败、双机 Notify 隔离。

## L. 产品结论

**NEEDS_CHANGE**

保留独立 Tab。改文案、统一批量断开、明确 HID session 是否出现在本列表。

## M. 需要用户决定的问题

1. Smart HID 配网中的 BLE 连接要不要出现在「已连接」列表？
2. 断开后离线设备是否立即从本页消失（当前 remove:true 是）？
