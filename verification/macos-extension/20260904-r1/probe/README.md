# smart_ble_macos_probe

一次性 Flutter macOS 探针，用于 Smart BLE macOS 平台扩展 spike（run 20260904-r1）。
它以产品 App 在 spike 基线（dbb38a8）解析出的完全相同版本
（flutter_blue_plus 1.36.8 / flutter_ble_peripheral 2.1.1）驱动两个 BLE 插件，
以无 UI、纯结构化日志的方式提供 Desktop D2 技术证据。

**不是产品，不属于共享 Flutter 产品层**；仅在 `verification/macos-extension/**` 允许区域内存在。

## 运行

```bash
flutter pub get
flutter build macos --debug
BIN=build/macos/Build/Products/Debug/smart_ble_macos_probe.app/Contents/MacOS/smart_ble_macos_probe

$BIN --mode env          # 适配器/权限/插件支持
$BIN --mode scan5        # 5 秒自动停止
$BIN --mode scan --duration 12        # 手动停止 + 去重/RSSI 汇总
$BIN --mode advertise --duration 15 --name SmartBLE-Flutter
$BIN --mode connect --uuid <service-uuid>             # 服务过滤连接（全链 GATT）
$BIN --mode connect --remote-id <peripheral-uuid>     # 直连只读探测（连接/发现/读/断开）
```

所有输出行为 `[FLPROBE] key=value ...`；退出码 0=PASS、1=FAIL。

## 已知平台事实（本轮实测）

- macOS 同机控制器不回送自身 LE 广播：本机 Central（任何栈）看不到本机 Peripheral 的广播。
- flutter_blue_plus 1.36.8 在 CBCentralManager 到达 PoweredOn 前调用 startScan 会抛
  PlatformException；探针已内置适配器就绪守卫。
- flutter_ble_peripheral 2.1.1 的 `isAdvertising` getter 在 darwin 恒为 false；
  广播状态以 `onPeripheralStateChanged` 流为准。
