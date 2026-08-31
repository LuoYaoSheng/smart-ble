# PAGE-005 Smart HID 诊断

> 路径：`pages/hid/diagnostics`
> 文件：`apps/uniapp/pages/hid/diagnostics.vue`
> 审核日期：2026-08-31
> 证据：E0/E1；E5 后置

## A. 用户任务与界面存在必要性

用户任务：对已有身份的 Smart HID **重连并读取实时** BLE / Wi-Fi / ControlHub / 控制连接 / Ready，并根据错误码恢复。

必要性：**保留**。PAGE-003 是历史，不能冒充这五项实时状态。PAGE-002 是下发向导，不是只读诊断。

## B. 进入、参数、出口

| 方向 | 事实 |
|---|---|
| 进入 | PAGE-003「运行诊断」；PAGE-002 恢复动作 diagnostics |
| 参数 | `deviceId` |
| 出口 | 返回详情（栈中则 back）；重新配网（确认后 PAGE-002 或 back 到 add） |
| 返回 | 见上 |
| 深链 | 仅 deviceId |

`onLoad` 清 diagnostic/error。若已有同 deviceId 的 HID session 则标 connected，**不自动 diagnose**。

`onUnload`：仅当本页 `ownsConnection` 才 `smartHidService.disconnect()`。借用已有 session 不关。

## C. 当前真实内容

1. 「当前状态」：尚未检测 / 已连接可检测 / 正在读取 / 实时完成 / 未连接 / 检测失败。
2. 五行：BLE、Wi-Fi、ControlHub、控制连接、设备 Ready 状态。
3. 按钮：重新检测（connecting 时「连接中…」disabled）；显示/隐藏错误码；返回设备详情；重新配网。
4. 高级区：code + message。

## D. 保留 / 修改 / 删除 / 缺失

| 区块 | 判断 |
|---|---|
| 五项固定诊断 | 保留 |
| owned vs borrowed session | 保留，符合契约 |
| 进页不自动跑 | 修改或确认：用户可能以为已在检测 |
| READY 关广播警告 | 重配有；检测连接失败有 modal |
| 时间戳「数据于何时读取」 | 缺失 |

## E. 操作表

| 操作 ID | 控件 | 显示 | 禁用 | 行为 | 成功 | 失败 | 跳转 | 清理 |
|---|---|---|---|---|---|---|---|---|
| OP-038 | 重新检测 | 始终 | connecting | 无连接则 modal 确认 connect+diagnose；有连接则 diagnose | live + 五行 | toast/modal | 本页 | 失败写 lastError |
| OP-ADV | 错误码开关 | 始终 | 无 | 切换 showAdvanced | 显示 lastError | 无错误则区空 | 本页 | 无 |
| OP-BACK | 返回详情 | 始终 | 无 deviceId return | 栈感知 | PAGE-003 | 无 | PAGE-003 | 见 unload |
| OP-REPROV | 重新配网 | 始终 | 无 | READY 警告确认 | PAGE-002 | 取消 | PAGE-002 | 无 |

## F. 状态表

| 状态 | 适用 | 映射 |
|---|---|---|
| idle | 是 | 尚未检测 |
| loading | 是 | checking / connecting |
| empty | 部分 | 五行 pending |
| success | 是 | live |
| error | 是 | error + lastError |
| permission denied | 连接阶段 | 走 BLE 错误 |
| unsupported | N/A（页可开） | |
| disconnected | 是 | offline + 确认连接 |
| reconnecting | 是 | connecting |
| timeout | 是 | diagnose catch |
| cancelled | 是 | 连接确认取消 |

## G. 字段来源

| 项 | 来源 |
|---|---|
| 五行 | `smartHidService.diagnose()` ← Device Info/Status GATT/Notify |
| lastError | hidStore |
| 是否已连接 | `smartHidService.getSessionState()` |

不含密码/token。

## H. 运行链路

`refresh` → 必要时 `connect(deviceId)`（ownsConnection=true）→ `diagnose()` → store.setDiagnostic。卸载时 owned session close。

## I. 依赖

Smart HID 固件处于可连接（配网/恢复）模式。LightBLE 灯控夹具 **不能** 完成本页。

## J. 第一断点

- P0：E5 后置。
- P1：不自动检测导致「空诊断被当成设备全正常」。pending 与 ok 需足够强。
- P2：无读取时间。

## K. 验收

- E1：workflow/profile 单测。
- E5：五项实时、离线/失败/超时、owned 离页断开、borrowed 不关。

## L. 产品结论

**NEEDS_CHANGE**（补「尚未检测≠正常」；建议进入后明确 CTA 或自动检测一次）。

**不 MERGE。**

## M. 需要用户决定的问题

1. 进入页面是否自动开始检测？
2. 诊断成功后是否保持 BLE 连接以便立刻重配？
