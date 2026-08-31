# PAGE-004 Smart HID 历史

> 路径：`pages/hid/history`
> 文件：`apps/uniapp/pages/hid/history.vue`
> 审核日期：2026-08-31
> 证据：E0；本地历史无 ESP32 依赖

## A. 用户任务与界面存在必要性

用户任务：管理本机保存的非敏感 Smart HID 配置历史：浏览、进入详情、移除记录。

必要性：**保留独立页**。PAGE-001 的嵌入列表不能替代完整管理（空态去扫描、日期、Wi-Fi/Hub 标签、说明 READY 后关广播）。若用户决定扫描页去掉列表，本页更必要。

## B. 进入、参数、出口

| 方向 | 事实 |
|---|---|
| 进入 | PAGE-001「全部历史」；无 Tab |
| 参数 | 无 |
| 出口 | 点行 → PAGE-003；空态「去扫描」→ PAGE-001 |
| 返回 | navigateBack |
| 深链 | 无 |

## C. 当前真实内容

1. 空态：插图、标题「还没有配置过的设备」、说明配网后会记录、「去扫描」。
2. 有数据：标题「已配置设备」+ 明确「本地历史记录，非实时在线状态。READY 设备已关闭蓝牙广播…」+ 台数芯片。
3. 卡片：HID 标记、名称、ID、Wi-Fi/Hub/日期标签、「移除」。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 |
|---|---|
| 空态去扫描 | 保留 |
| 历史非在线说明 | 保留（比 PAGE-003 更好） |
| 移除确认 | 保留 |
| 与 PAGE-001 双列表 | 修改信息架构：扫描页应降权 |
| 排序/搜索 | 缺失，非 Must |
| 「历史记录」每卡徽章 | 列表级 caption 已覆盖，可加强 |

## E. 操作表

| 操作 ID | 控件 | 显示 | 禁用 | 行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-037-OPEN | 卡片 | 有记录 | 无 | PAGE-003?deviceId= | 详情 | 无 | PAGE-003 | 无 |
| OP-037-REMOVE | 移除 | 有记录 | 无 | 确认后 `removeKnownDevice` | 行消失 | 存储失败无 UI | 留本页 | 仅本地，不影响设备 |
| OP-037-SCAN | 去扫描 | 空态 | 无 | switchTab 扫描 | 扫描 | N/A | PAGE-001 | 无 |

## F. 状态表

| 状态 | 适用 |
|---|---|
| idle | 有列表 |
| loading | N/A（同步读 storage） |
| empty | 空态 |
| success | 移除成功即列表更新 |
| error | 存储失败几乎静默 |
| permission / unsupported / disconnected / reconnecting / timeout | N/A |
| cancelled | 确认框取消 |

## G. 字段来源

`hidStore.knownDevices` ← `smart_ble.smart_hid.known_devices.v1`。字段经 `normalizeKnownDevices`：**不含 token、Wi-Fi 密码**。`configuredAt` 本地时间戳。

## H. 运行链路

无 BLE。点击只路由。移除写回 storage。

## I. 依赖

无 ESP32。无网络。

## J. 第一断点

- P2：移除失败无 toast。
- P2：与 PAGE-001 双入口可能让用户以为历史设备在线可扫到。

## K. 验收

- E4：空态、有数据、移除确认取消/确认、不出现密码。
- E5：N/A（除非验证 READY 设备确实不在扫描列表——那是 PAGE-001 E5）。

## L. 产品结论

**NEEDS_CHANGE**（主要是与扫描页重复入口，本页内容本身接近契约）。

倾向：**保留本页为历史 SSOT**，扫描页只留入口。

不 REMOVE，不与 PAGE-003 MERGE。

## M. 需要用户决定的问题

1. 扫描页历史区：删除 / 只显示最近 1 台 / 保持现状？
2. 历史 TTL（代码 `KNOWN_DEVICE_TTL_MS` 90 天）是否要在 UI 说明？
