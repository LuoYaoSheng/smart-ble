# 测试入口：Flutter macOS 平台层 — tests/macos/flutter-macos-platform

范围：apps/flutter/macos 平台配置 + flutter_blue_plus/flutter_ble_peripheral 在 macOS 的能力边界。
不覆盖共享产品逻辑（apps/flutter/lib 归 Windows 主线的 tests/ 管）。

## 入口

```bash
scripts/macos/verify-flutter-macos.sh <run-id>
```

## 用例矩阵

| ID | 用例 | 判定 |
|---|---|---|
| FLB-01 | flutter pub get | 成功且共享 lock 漂移不入提交 |
| FLB-02 | dart format check（lib test） | 记录现状（共享层既有漂移，非 Mac 责任） |
| FLB-03 | flutter analyze | 0 issues |
| FLB-04 | flutter test | 全过 |
| FLB-05/06 | build macos release/debug | 产物生成 + SHA256 记录 |
| FLB-07 | flutter run -d macos | FBP 初始化 + PoweredOn |
| FLA-01 | Info.plist 含 NSBluetoothAlwaysUsageDescription | 配置断言 |
| FLA-02 | Debug/Release entitlements 均含 device.bluetooth 且无多余 network（Release） | 配置断言 |
| FLA-03 | 无本机绝对路径 / 未提交 Pods / ephemeral | 配置断言 |
| FLC-01 | 探针 env：isSupported×2 + adapter→on | PASS |
| FLC-02 | 扫描启动 | IS_SCANNING=true |
| FLC-03 | 5 秒自动停止 | 定时窗口后 still_scanning=false |
| FLC-04 | 手动停止 | manual_stop 事件 |
| FLC-05 | 去重 + RSSI 更新 | unique≥1 且 updates>unique |
| FLC-06 | 连接尝试（若操作者提供 --remote-id 夹具） | 夹具相关 |
| FLC-07 | GATT read/write/notify | **无夹具=BLOCKED_FIXTURE**（ESP32 GATT server 可解锁） |
| FLP-01..04 | 广播 isSupported/start/stop/状态流/外部可见性 | 外部可见性 **无观察端=BLOCKED_OBSERVER** |
| FLL-01/02 | 退出清理 / 蓝牙开关、睡眠唤醒 | 后者需用户在场，默认 NOT_RUN |

## 硬件夹具声明

- 必需（PASS 判定）：无——扫描与环境类用例在本机即可真实判定
- 解锁 BLOCKED 项：ESP32（GATT server + Observer）或一台可操作的手机扫描端
- 禁止：以用户正在使用的输入设备（键盘/触控板）作为连接夹具

## 已知平台事实（判定时须知）

1. macOS 同机控制器不回送自身 LE 广播 → 本机 Central 永远看不到本机 Peripheral
2. FBP 1.36.8 启动竞态（PoweredOn 前 startScan 抛异常）→ 探针已守卫
3. flutter_ble_peripheral isAdvertising getter darwin 恒 false → 以状态流为准
