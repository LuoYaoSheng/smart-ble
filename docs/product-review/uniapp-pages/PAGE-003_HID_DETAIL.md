# PAGE-003 Smart HID 详情

> 路径：`pages/hid/detail`
> 文件：`apps/uniapp/pages/hid/detail.vue`
> 审核日期：2026-08-31
> 证据：E0；E5 后置

## A. 用户任务与界面存在必要性

用户任务：查看某台 Smart HID 的**非敏感历史快照**，并选择重新配置、实时诊断或高级 BLE。

必要性：**保留**。与 PAGE-002（向导）、PAGE-004（列表）、PAGE-005（实时五项）职责不同。契约要求标明「历史，不代表在线」。

## B. 进入、参数、出口

| 方向 | 事实 |
|---|---|
| 进入 | PAGE-001 历史「查看」；PAGE-004 点卡片；PAGE-002 成功「查看设备」；PAGE-005「返回设备详情」 |
| 参数 | `deviceId`（encodeURIComponent） |
| 出口 | 重新配置 → PAGE-002；诊断 → PAGE-005；高级 BLE → PAGE-006 |
| 返回 | navigateBack 到来源 |
| 深链 | 仅 deviceId；无密码/token |

无记录：modal「设备记录不存在」后 `navigateBack`。

## C. 当前真实内容（从上到下）

1. 标题：`device.name` 或「Smart HID 设备」。
2. 芯片：`device.protocol` 或「协议未记录」（**看起来像实时能力徽章，实际是历史字段**）。
3. Device ID、固件版本。
4. 最近配置：Wi-Fi、ControlHub。
5. 按钮：重新配置；运行诊断；高级 BLE 调试。

**没有**「历史记录 / 不代表当前在线」文案。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 |
|---|---|
| 身份 + 上次配置 | 保留 |
| 三条后续动作 | 保留，均应携带同一 deviceId |
| 协议芯片 | 修改：避免被读成在线状态 |
| 历史声明 | **缺失，必须补** |
| 在线/离线指示 | 当前没有；不应假装有心跳 |

## E. 操作表

| 操作 ID | 控件 | 显示 | 禁用 | 行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-036-RECONFIG | 重新配置 | 有 device | 无 device 则 return | setCurrentDevice + PAGE-002 | 向导 | 无 | PAGE-002 | 无敏感 query |
| OP-036-DIAG | 运行诊断 | 有 device | 无 | PAGE-005 | 诊断页 | 无 | PAGE-005 | 无 |
| OP-036-GATT | 高级 BLE | 有 device | 无 | `buildGenericDeviceDetailUrl` | PAGE-006 | 无 | PAGE-006 | 可能新建/复用 GATT session |
| N/A | 刷新实时 | 无此按钮 | — | — | — | — | — | — |

## F. 状态表

| 状态 | 适用 |
|---|---|
| idle | 展示快照 |
| loading | N/A（不拉实时） |
| empty | 记录不存在 → modal + 返回 |
| success | N/A |
| error | 仅缺记录 |
| permission denied | N/A |
| unsupported | N/A |
| disconnected | **应视为默认**（历史页）；当前未明示 |
| reconnecting / timeout / cancelled | N/A |

## G. 字段来源

全部来自 `hidStore.currentDevice` 或 `knownDevices` 本地历史：name、deviceId、protocol、firmware、lastWifi、lastHub。非 GATT Read、非 Notify。

## H. 运行链路

无 BLE。`onLoad` 解码 deviceId → find store。动作只改 store 当前设备并路由。

## I. 依赖

本地历史。重配/诊断才需要 Smart HID 固件在配网模式。高级 BLE 走 LightBLE 或该设备 GATT，可能对已 READY、已关广播的设备失败——页面未警告。

## J. 第一断点

- P1：历史被读成在线。
- P2：高级 BLE 对已配网设备可能连不上，缺文案。

## K. 验收

- E4：打开有/无记录；三条跳转带同一 deviceId。
- E5：后置到重配/诊断；本页本身无实时 BLE Must。

## L. 产品结论

**NEEDS_CHANGE**（补历史声明；弱化协议芯片；高级 BLE 增加「可能需要设备在可发现状态」）。

**不 MERGE 进 PAGE-004。** 详情与列表分离合理。

## M. 需要用户决定的问题

1. 协议/固件缺失时显示「未记录」是否足够，还是隐藏行？
2. 高级 BLE 是否应对 Smart HID 默认隐藏，只留配网/诊断？
