# pages-probe — smart_ble 页面级 widget 冒烟（macOS spike r2）

## 目的

r1 只验证了「Flutter macOS Runner 能构建/启动 + BLE 插件能力」，未覆盖任何页面。
本探针在不修改共享工程（`apps/flutter/**`）的前提下，以 path 依赖只读引用共享层，
为 5 个产品页面（扫描 / 连接 / 广播 / 关于 / 设备详情）补齐页面级 widget 冒烟。

## 与共享层的隔离

- 探针位于 `verification/macos-extension/20260904-r2/pages-probe/`（允许区域）
- `pubspec.yaml` 以 `path: ../../../../apps/flutter` 引用 `smart_ble` 包，只读
- 探针自身的 `pubspec.lock` / `.dart_tool/` 已 gitignore，不会污染共享锁文件
- 不依赖对共享代码的任何修改；mock 全部在探针测试文件内完成

## Mock 策略（flutter_test VM 无插件注册）

| 依赖 | 手段 |
| --- | --- |
| flutter_blue_plus 1.36.8（联邦架构） | 注入 `FlutterBluePlusPlatform` 假实现（`isSupported=true`、`adapterState=on`）；FBP 平台实例在 VM 中无人注册，恰好可用 FLW-01 覆盖"无 BLE 平台"降级路径 |
| flutter_ble_peripheral 2.1.1 | `MethodChannel('dev.steenbakker.flutter_ble_peripheral/ble_state')` mock（isSupported/isAdvertising/start/stop）+ 同名事件通道返回空流 |
| 扫描数据 | 共享层预留的 `USE_MOCK_BLE` dart-define 开关（`BleManager.startScan` 注入 Dummy-BLE-01） |

## 运行

```bash
cd verification/macos-extension/20260904-r2/pages-probe
flutter pub get
flutter test --dart-define=USE_MOCK_BLE=true --reporter expanded
```

## 用例（FLW-*）

| ID | 页面 | 覆盖点 |
| --- | --- | --- |
| FLW-01 | DeviceListPage | 无 BLE 平台实现的降级态：错误横幅 + 扫描按钮禁用 |
| FLW-02 | DeviceListPage | Mock 扫描全链路：状态指示、按钮态切换、设备卡片、计数徽标、信息对话框、5s 自动停止 |
| FLW-03 | DeviceListPage | 过滤面板展开/收起与控件（信号强度/名称前缀/隐藏无名/重置） |
| FLW-04 | MainScreen | 底部导航四 tab 走查（扫描/连接/广播/关于各自关键内容） |
| FLW-05 | BroadcastPage | UUID 空值/格式校验、合法 UUID 经 mock 通道启动成功 |
| FLW-06 | ConnectedDevicesPage | 无连接设备空态 |
| FLW-07 | AboutPage | 产品定位/核心能力/版本号渲染 |
| FLW-08 | DeviceDetailPage | 未连接设备进入：服务发现降级为空、状态芯片与日志操作渲染 |

局限：连接/读写/通知的正向链路需要真实 GATT 外设（r1 已标 BLOCKED_FIXTURE）；
UI 真机点击走查需要屏幕录制/辅助功能权限（本环境未授予，见 pages-coverage.md）。
