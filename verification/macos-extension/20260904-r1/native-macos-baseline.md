# 原生 AppKit/CoreBluetooth 基线 — run 20260904-r1

对象：`apps/desktop/macos/SmartBLE-mac`（SPM 可执行，macOS 13+，无第三方依赖，AppKit + CoreBluetooth）
原生探针：`tests/macos/native-probe/`（本轮新增，纯 CoreBluetooth，结构化日志 `[PROBE]`）

## 修复前第一断点

`swift build` **开箱失败**（19+ 错误）：
1. `Package.swift` 显式 `sources` 列表遗漏 `Sources/UI/Components/**`（LogPanel/DeviceCard/FilterPanel/ServicePanel/WriteDialog 未编译，但 UI 层引用它们）→ `cannot find type 'LogPanel' ...` 等
2. `ScanViewController.swift:338` 调用 `connect(to:)`，实际签名 `connect(device:)`
3. `ScanViewController.swift:52` `NSImage(systemSymbolName:)` 返回可选未解包
4. Swift 6.2 编译器下 @MainActor 类的三个 delegate 一致性需 `@preconcurrency`
5. `@main` 默认引导在 SPM 无 bundle 可执行下 **从未进入 applicationDidFinishLaunching**
   （无窗口、无日志、进程空转）——隐性致命缺陷

## 本轮修复（全部限定 apps/desktop/macos/**，属"无法编译/权限/资源释放/平台层"允许类）

| 文件 | 修复 |
|---|---|
| `Package.swift` | 移除显式 sources 列表，编译整个 Sources 树 |
| `Sources/UI/ScanViewController.swift` | `connect(to:)`→`connect(device:)`；NSImage 可选解包回退 `NSImage()` |
| `Sources/Core/BLEManager.swift` | 三个 delegate 扩展加 `@preconcurrency` |
| `Sources/main.swift` | 显式 `static func main()` 引导：setbuf 无缓冲 + 强持有 delegate + `setActivationPolicy(.regular)` |

修复后 `swift build`：**Build complete (0 errors)**；前台运行 8 秒日志：

```
[APP] static main entered
[APP] applicationDidFinishLaunching
[BLE] Bluetooth is powered on
[BLE] Peripheral is powered on
```

Central 与 Peripheral 管理器均 PoweredOn（权限已授权）。
`swift test`：该包无测试目标（NOT_RUN）。`swift package resolve`：无依赖（立即完成）。

## Info.plist 审计

- `NSBluetoothAlwaysUsageDescription` ✓、`NSBluetoothPeripheralUsageDescription` ✓
- `CFBundleIdentifier=com.smartble.desktop`（本地默认值）
- 注：SPM CLI 直接运行时 TCC 归因于父进程链；本机环境下无弹窗直接授权

## 实现限制登记（现状，非本轮扩建范围）

- **仅单连接**：单个 `connectedPeripheral`，无多设备并发连接
- **无 Session Registry**：连接状态以零散 @Published 维护
- **无自动重连**：`reconnect` 0 处
- **无写队列**：write 直发，无事务/排队/失败重试
- **无 Profile 层 / Smart HID / 31B 广播预算管理**
- **日志未脱敏**：`log()` 直接输出消息（设备名/MAC 无过滤）
- **英文硬编码 UI**：`NSButton(title: "Start Scan")` 等 7+ 处，无本地化
- **平台 API 与 UI 强耦合**：BLEManager 内嵌 @Published 状态直接驱动三个 ViewController
- 页面结构为早期原型（Scan/Detail/Log 三栏），与现行 9 页面规格不一致

## 原生探针实测（tests/macos/native-probe，本轮新增）

| 模式 | 结果 | 关键数据 |
|---|---|---|
| env | PASS | CENTRAL_STATE=5, PERIPHERAL_STATE=5（PoweredOn×2） |
| scan 12s | PASS | 5 台真实设备（iphone -46 / midea×3 / 无名），23 次更新，去重正确 |
| advertise 22s | API PASS | service_added + advertising_started；GATT server 含 read/write/notify 三特征 |
| connect（过滤） | 预期 FAIL | 同机广告不可见（控制器回送过滤），错误路径正确（exit 1 + reason） |
| 对照组（广播中无过滤扫 12s） | 确证 | 5 台外设可见、本机广播不可见 → 过滤行为坐实 |

退出清理：所有探针进程定时结束 exit 0；SIGTERM 干净退出。
