# 与 Windows 主线的集成说明 — run 20260904-r1

## 本轮 Mac 侧零共享文件修改声明

`apps/flutter/lib/**`、`apps/flutter/pubspec.{yaml,lock}`、`apps/uniapp/**`、`core/**`、
`docs/specs/**`、`hardware/**`、`README.md`、`.github/workflows/**` —— **一行未改**。
pub get 产生的 lock/registrant 漂移已 `git restore`，未随提交带出。

## 共享层修改请求（Windows 主线处理，Mac 不直接改）

### S1. dart format 既有漂移（低优先级）

- 文件：`apps/flutter/lib/ui/widgets/service_tile.dart`、`write_dialog.dart`、
  `test/ble_models_test.dart`、`test/core/utils/data_converter_test.dart` 等 20 个文件
- 现象：`dart format --set-exit-if-changed lib test` exit 1
- 原因：共享层历史提交未过 formatter（与 Mac 无关，基线即如此）
- 最小建议：Windows 主线跑一次 `dart format lib test` 单独提交
- 是否阻塞 Mac：否
- 是否影响 Flutter Android：否（纯格式）
- 建议处理 Gate：任意整理性 Gate

### S2. flutter_blue_plus 1.36.8 startScan 启动竞态（中优先级，D1 关联）

- 文件：`apps/flutter/lib/core/.../ble_manager.dart`（或等价初始化处；Mac 侧只读确认）
- 现象：CBCentralManager 未到 PoweredOn 时调用 `startScan` 抛
  `PlatformException(startScan, bluetooth must be turned on. (CBManagerStateUnknown))`
  （实测复现：启动后 ~10ms 调 scan 即中招，~13ms 后即 PoweredOn）
- 原因：FBP darwin 实现不排队等待适配器就绪
- 最小建议：共享 BleManager 在 startScan 前统一走
  `await FlutterBluePlus.adapterState.where((s)=>s==on).first` 守卫（探针同款，已验证有效）
- 是否阻塞 Mac：否（Mac 侧探针已自守卫）
- 是否影响 Flutter Android：低（Android 路径不同），但守卫无害且跨平台统一
- 建议处理 Gate：共享 Flutter 产品层下一批提交

### S3. pubspec.lock 漂移（提示，非请求）

- 现象：Mac 端 `flutter pub get` 使 107 依赖重解析（+251/-171），并连带
  GeneratedPluginRegistrant 移除 `path_provider_foundation`
- 原因：lock 与最新可解析集自然漂移（pub 语义），非 Mac 引入的需求变化
- 建议：Windows 主线在某次 `flutter pub upgrade/lock 刷新` Gate 统一决定是否收紧；
  Mac 侧每次构建后还原 lock，不提交
- 是否阻塞 Mac：否

### S4. FBP darwin `isSupported` duplicate response 报错（低优先级，D2 关联）

- 文件：`flutter_blue_plus_darwin 0.0.2`（插件侧，非本仓代码）
- 现象：每次冷启动 `isSupported` 方法调用后 stderr 报
  `Error: Message responses can be sent only once. Ignoring duplicate response on channel 'flutter_blue_plus/methods'.`
- 影响：无功能影响（响应仍送达），日志噪音
- 建议：升级 FBP 版本时顺带观察是否修复；共享层无需改代码
- 是否阻塞 Mac：否

## 可安全 cherry-pick 的纯平台提交（见 git 汇总）

1. `test(macos): ...` —— 证据 + 探针 + 脚本（零产品代码）
2. `fix(macos): ...` —— apps/desktop/macos 修复（零共享文件）
3. 本轮**无** apps/flutter/macos 配置修复提交（配置审计全绿，无需改动）

## 需要等待的 Windows Gate

- 若主线后续改 `apps/flutter/lib/**` 的 BLE 初始化：S2 守卫随该批落地
- 若主线刷新 pubspec.lock：Mac 分支 rebase 后重跑
  `flutter analyze && flutter test && flutter build macos`（脚本已备：scripts/macos/verify-flutter-macos.sh）

## D2 决策所需而本轮缺失的证据（需用户提供夹具）

- 第二 BLE 扫描端（手机装 nRF Connect / LightBlue，或 ESP32 Observer）→ 解锁广播外部可见性（E5 口径）
- 可安全连接的 GATT 夹具（ESP32 GATT server 最佳）→ 解锁 connect/discover/read/write/notify 正向链
