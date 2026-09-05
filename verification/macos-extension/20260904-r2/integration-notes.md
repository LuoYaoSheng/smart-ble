# integration-notes（r2）— 需 Windows 主线处理的共享层事项

延续 r1（20260904-r1/integration-notes.md S1–S4）。r2 页面级补测新增：

## S5 [共享层][缺陷 D16] CommandQueue 在页面 dispose 途中同步回调 setState

**现象**：进入并离开 DeviceDetailPage（设备详情页）时，debug 构建必现断言：

```
'package:flutter/src/widgets/framework.dart': Failed assertion: line 5343 pos 12:
'_lifecycleState != _ElementLifecycle.defunct': is not true.
```

**链路**：
`DeviceDetailPage.dispose`（device_detail_page.dart:370）→ `CommandQueue.clear()`
（command_queue.dart:195）→ `stopLoop()`（command_queue.dart:176 同步调用
`onQueueStateChanged?.call()`）→ 页面回调（device_detail_page.dart:91
`if (mounted) setState(() {})`）——dispose 执行期间 `mounted` 仍为 true（框架在
dispose 之后才将 element 置空），等价于在 unmount 途中 setState。

**影响**：所有平台（非 macOS 特有）每次离开详情页都触发；release 构建虽无断言，
但属未定义行为风险。页面级 widget 测试（任何端）无法直接跑 FLW-08 类用例，
需先压制该断言。

**建议修复（任选其一，Windows 线决断）**：

```dart
// 方案 A：页面侧，dispose 时先摘回调再清队列（最小改动）
@override
void dispose() {
  ...
  _commandQueue?.onQueueStateChanged = null; // 先摘回调
  _commandQueue?.clear();
  ...
}

// 方案 B：CommandQueue 侧增加静默清空（一次性改动，所有调用方受益）
void clear({bool emitChange = true}) {
  _queue.clear();
  stopLoop(emitChange: emitChange);
  _isRunning = false;
  _isPaused = false;
  if (emitChange) onQueueStateChanged?.call();
}
```

**Mac 侧处置**：共享层禁改（协议 §1），探针 FLW-08 对该特定断言定向压制
（匹配栈含 command_queue.dart + device_detail_page.dart 才放行），源码注释已引用 D16。
D16 修复合入后可移除压制。

## S6 [共享层][低优先级备忘] 广播流无回放，晚订阅者拿不到当前状态

`BleManager.stateStream` 等为普通 `StreamController.broadcast()`，无初始值回放：
新订阅者（测试环境、页面热重建）在下一个事件前一直处于 loading。Flutter 侧
`bleStateProvider` 因此在 widget 测试里呈永久加载态（AppBar spinner 无限动画）。
建议后续评估 BehaviorSubject / `newStreamWithInitialValue` 模式（FBP 自身对
adapterState 就是这么做的）。不阻塞任何轮次，仅备忘。

## S7 [共享层][备忘] DeviceDetailPage 把"服务发现返回空"视为已连接

`_checkConnectionAndDiscoverServices` 中 `discoverServices` 对未连接设备抛错时，
BleManager 捕获后返回 `[]`，页面将 `_isConnected = true` 并显示"已连接"芯片
（FLW-08 观察到的实际行为）。语义上"未连接进入详情页"应显示未连接态。
建议 Windows 线在详情页判断连接状态时以 `connectionStateFor(deviceId)` 为准。
不阻塞，低优先级。
