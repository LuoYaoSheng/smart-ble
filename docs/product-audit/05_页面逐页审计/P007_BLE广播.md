# P007 BLE 广播

页面路径：`pages/broadcast/index`；类型：Tab/工具页。复核：2026-08-29。

## A. 页面目的
配置名称/UUID/厂商数据等，让手机或小程序作为 BLE 外设广播。

## B. 信息结构
平台/状态 → 表单字段 → Android 专属项 → 开始/停止/检查支持 → 操作日志。

## C. 合理性
31B 提示有用；Android「系统蓝牙名称」与可编辑输入易矛盾。

## D. 用户操作（操作清单）

| 操作ID | UI入口 | 用户操作 | 触发代码 | 预期 | 实际 | 后续 |
|---|---|---|---|---|---|---|
| O1 | 开始广播 | 启动 | 权限检查 → `startAdvertising` | 广播中+日志 | App：先 `validateAppBroadcastStart` | 本页 |
| O2 | 停止 | 停止 | `stopAdvertising` | 停止+日志 | 失败有 report | 本页 |
| O3 | 检查支持 | 探测插件/能力 | 平台 API | 日志提示 | PASS 逻辑 | 本页 |
| O4 | 改表单字段 | 编辑 | refs + payload analysis | 容量提示 | PASS | 本页 |
| O5 | 清空日志 | | 本地 logger | 清空 | PASS | 本页 |

## E. 跳转
无内部页；可打开系统蓝牙设置。

## F. 状态
未就绪/就绪/广播中；缺统一 button busy；**前置失败已可见**。

## G–I
本地 refs；`ble.connectedDevicesList`（防微信模式冲突）；LysBlePeripheral / wx peripheral。

## J. 关键链路

### O1 App 开始广播（2026-08-29）
```text
UI → checkBluetoothAndPermissions → startAdvertising
→ validateAppBroadcastStart(plugin/name/uuid/payload)
   失败 → reportBroadcastError（日志+toast）← 原静默早退已消除 PASS
→ Android/iOS plugin.startAdvertising(callback)
   code≠0 → reportBroadcastError PASS
→ 成功 advertising=true + 日志
判定：客户端失败反馈 PASS；插件/真机 PARTIAL
第一断点：真机插件参数与权限回调形状未验
假设修复后：仍需拆 useBroadcast；名称策略文案
```

### O1 微信
```text
open peripheral adapter → ensure server → startAdvertising
active_connections / 10001 → modal
判定：PARTIAL 待真机
```

## K–M
默认合法 payload；hide 停播/释放；Android 权限拒绝有错误上报。

## N. 假完成
~~静默早退~~ **已关闭**。

## O–S
无失败码细粒度；无 payload 模板；页面仍过重（P4）。

## T–V
校验已抽 `services/broadcast/validation.js`；日志 UI 未复用 log-panel。

## W
继续抽 `useBroadcast`；澄清 Android 名称策略。

## X
产品 B；UI 82%；可用 75%；链路 80%；异常 70%；复用 70%。
