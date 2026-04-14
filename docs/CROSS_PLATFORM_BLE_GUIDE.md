# SmartBLE 跨平台架构与自动维护机制指南

SmartBLE 项目涵盖了从端部设备到桌面端的全面蓝牙通讯链。本文档聚焦于不同操作系统上的蓝牙栈封装差异及高可用重连机制的设计。

## 多端底层架构对照表

为实现"一套逻辑代码跨 7 端"的目标，项目针对各平台进行了底层蓝牙库选型抽象：

| 平台层 | 所选底层蓝牙能力提供方 | 外设/广播支持度 | 连接稳定性监控 |
|---|---|---|---|
| **Android** | `RxAndroidBle` / 原生核心层 | 🟢 完美支持 (BLE 5.0) | 🟢 自定义隐式断开监听回调 |
| **iOS / macOS** | `CoreBluetooth`框架 | 🟢 原生支持（但 SwiftUI/Tauri 包装层存在局限，建议走原生调用） | 🟢 统一委托机制 `didDisconnectPeripheral` |
| **Flutter** | `flutter_blue_plus` | 🟡 借助附加插件可模拟广播 | 🟢 EventStream 广播通道 |
| **UniApp** | 微信/基础库 `wx.createBLEConnection` | ❌ 不支持外设广播模式 | 🟢 借助 `onBLEConnectionStateChange` |
| **Tauri (桌面)** | `btleplug` (Rust) | ❌ 仅部分 Linux BlueZ 兼容 | 🟢 Tokio Background Thread 事件桥接 |
| **Electron** | `@abandonware/noble` (Node) | 🟡 依赖 `bleno` 支持 | 🟢 EventEmitter `.on('disconnect')` |


## 核心特性：多端统一的三次指数退避回连 (Exponential Backoff Auto-Reconnect)

在物联网实战中，信号阻断（如关门、人走过屏蔽信号）很常见。所有平台均实施了工业标准的 `3次指数重试机制`：

### 实现模型
1. **重试时间间隔**：依次为 `2000ms`, `4000ms`, `6000ms`（防止并发竞争网卡资源）。
2. **人工断开免疫体系**：在应用层维护一个 `userDisconnectedSet` 数据结构。凡是用户主动点击"断开连接"触发的动作，ID 将记录进入黑名单。当底层库抛出 `disconnect` 事件时，需第一时间核对其是否处于主动断开集合内；如果命中则终止重连流程，清空集合记录；如果未命中代表发生**非预期异常断线**，立即驱动 `Retry State Machine`。

### 平台应用差异
- **单线程模型 (UniApp/Electron/Flutter)**：利用 `setTimeout` / `Future.delayed` 进行递归回调尝试。
- **多线程模型 (Tauri/Android/iOS)**：
  - **Tauri**：在 Rust 侧单独开启一个 `tokio::spawn` 的无休眠后台事件监听队列，当接收到 `CentralEvent::DeviceDisconnected` 时向前端发送前端事件桥来触发重试操作，确保主 UI 不会因此进入阻塞 (Block) 状态。
  - **iOS/Android**：通过后台 `Background Tasks` 确保无论应用处于前台还是进入锁屏挂起状态，都能唤醒应用执行重连。

## Notify 实现架构

### 多平台特征值监听实现与踩坑 (Notify / Indicate)

不同的操作系统与库对蓝牙事件流的抽象大相径庭，这曾是导致跨端状态不同步的最大元凶。目前的架构终于将它们强行拉平，请切至您的专属阵营：

::: code-group

```rust [🦀 Tauri (Rust btleplug)]
// btleplug 0.11 正确的通知流使用方式
peripheral.subscribe(&char).await?;
let mut notif_stream = peripheral.notifications().await?;

tokio::spawn(async move {
    use futures::stream::StreamExt;
    use btleplug::api::ValueNotification;

    // 不断捕获流，只有硬件真实 Push 才会触发
    while let Some(ValueNotification { uuid, value }) = notif_stream.next().await {
        if uuid.to_string() == char_uuid_filter {
            window.emit("notification-received", payload);
        }
    }
});
```

```dart [🐦 Flutter (flutter_blue_plus)]
// 启用 Notify
await characteristic.setNotifyValue(true);

// 监听独立特征值的 Broadcast Stream
final subscription = characteristic.onValueReceived.listen((value) {
    // value 即是 List<int>
    ref.read(bleDataProvider.notifier).state = value;
});

// 核心要点：应用挂起时注意 cancel 释放
ref.onDispose(() => subscription.cancel());
```

```kotlin [🤖 Android (原生 Kotlin)]
// 基于原生 Android BluetoothGatt 的硬核姿势
val descriptor = characteristic.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"))
descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
gatt.writeDescriptor(descriptor)

gatt.setCharacteristicNotification(characteristic, true)

// 随后在此处的 Callback 拦截
override fun onCharacteristicChanged(gatt: BluetoothGatt, char: BluetoothGattCharacteristic) {
    val payload = char.value
    // 发送到主线程处理
}
```

```javascript [🌐 Electron (Node Noble)]
// 监听原生硬件触发的事件监听器
characteristic.on('data', (data, isNotification) => {
    if (isNotification) {
         // data 为 NodeJS Buffer
         const payload = Array.from(data);
         mainWindow.webContents.send('notification-received', payload);
    }
});
```

:::

## Electron 跨平台修复记录

| 问题 | 旧实现 | 修复后 |
|---|---|---|
| 调试日志路径 | `/tmp/electron-main-debug.log` (Linux 专用) | `app.getPath('logs')` 跨平台路径 |
| `disconnect` 时序 | 调用 `disconnect()` 前已从 Map 删除 peripheral，回调中 `peripheral.id` 可能已释放 | 先保存 `peripheralId` 本地变量，Map 删除移到回调内 |

## 未来规整计划 (Ongoing Plan)

虽然已完成绝大多数跨端复用统一，未来的贡献者还可朝如下方向收敛：
1. **自动化打桩测试 (Automated Dummy Mocking)**：解耦蓝牙依赖，将蓝牙层改写为支持虚拟 Mock 的 `Interface`，便于在 CI (GitHub Actions) 中自动回归测试广播与重连流程。
2. **底层协议解析的 WASM 化**：目前特征值的编解码存在各平台用原生语言二次实现的问题，后续拟用 Rust 打包出 `.wasm`，让所有前端（包含 Tauri，UniApp 等）共用一套解析产物。
3. **Tauri Notify 验证**：在搭载 btleplug 的设备上验证 `CentralEvent::ValueNotification` 事件字段的实际结构（各平台实现可能存在差异），确认特征值 UUID 是否能从事件直接读取（目前前端侧配合过滤）。
