# 页面级测试覆盖（r2）— Smart BLE macOS 平台扩展

- 日期：2026-09-04
- 分支：spike/macos-extension-v1（基线 = r1 推送后的 e8e9772）
- 背景：r1 只验证到平台层（Runner 构建/启动/BLE 权限、双插件 Central/Peripheral 能力），
  未覆盖任何页面。r2 在不修改共享层的前提下补齐两个 App 的页面级覆盖。

## 总览

| 路线 | 手段 | 结果 |
| --- | --- | --- |
| Flutter App（5 页面） | `pages-probe` widget 探针（只读 path 依赖共享层） | FLW-01..08，8/8 PASS |
| 原生 App（3 页面 + 工具栏） | `SmartBLE-mac --smoke-pages` 页面冒烟（真实 action/绑定/委托路径） | UIS-01..07，11/11 PASS |

两条链路均无屏幕捕获/辅助功能权限依赖：Flutter 侧用 widget 测试驱动真实组件树；
原生侧程序化触发真实按钮 action 并从控件状态读回结果。

## Flutter 页面覆盖矩阵（smart_ble，apps/flutter/lib 只读）

| 页面 | 用例 | 覆盖点 | 结果 |
| --- | --- | --- | --- |
| DeviceListPage（扫描） | FLW-01 | 无 BLE 平台实现降级态：`蓝牙不可用` 横幅 + 扫描按钮禁用 + AppBar 渲染 | PASS |
| DeviceListPage | FLW-02 | Mock 扫描全链路（`USE_MOCK_BLE`）：按钮态切换、Dummy-BLE-01 卡片、计数徽标、设备信息对话框、5s 自动停止 | PASS |
| DeviceListPage | FLW-03 | 过滤面板展开/收起、信号强度/名称前缀/隐藏无名/重置控件渲染与输入 | PASS |
| MainScreen（壳） | FLW-04 | 底部导航四 tab 走查：扫描/连接/广播/关于各自关键内容 + 回扫 | PASS |
| BroadcastPage（广播） | FLW-04/05 | 平台卡片（macOS 分支）、UUID 空值/格式校验错误路径、合法 UUID 经 mock 通道启动成功 SnackBar | PASS |
| ConnectedDevicesPage（连接） | FLW-04/06 | 空态（`暂无已连接设备` + 引导文案）、AppBar、tab 内进入 | PASS |
| AboutPage（关于） | FLW-04/07 | 产品定位/核心能力/Version 2.0.0/链接区渲染 | PASS |
| DeviceDetailPage（详情） | FLW-08 | 未连接设备进入：服务发现降级为空、状态芯片、日志区操作（清空/导出）渲染 | PASS |

### Flutter 未覆盖项（诚实边界）

| 项 | 原因 |
| --- | --- |
| 连接成功后的服务树/读写/通知 UI | 需真实 GATT 夹具（同 r1 FLC-07 BLOCKED_FIXTURE） |
| 真机点击/截图走查 | ZCode 无 Screen Recording/AX 权限（BLOCKED_UI_ACCESS） |
| 连接按钮正向流（含 30s 超时） | fake-async 下 35s 锁等待不可行；负向链 r1 已有真机证据（midea 超时） |

## 原生页面覆盖矩阵（SmartBLE-mac）

| 页面/组件 | 步骤 | 覆盖点（全部真实代码路径） | 结果 |
| --- | --- | --- | --- |
| 三页面装配 | UIS-01 | 窗口可见 + FilterPanel/NSTableView/ServicePanel/LogPanel 全部挂载 | PASS |
| 扫描页 | UIS-02 | 真实点击 Start Scan → manager.startScan → isScanning 绑定回按钮/状态标签 | PASS |
| 扫描页 | UIS-03 | 5s 自动停止（与 UniApp 对齐）→ 按钮复位（本轮环境实扫到 4 台设备） | PASS |
| 扫描页+FilterPanel | UIS-04a-d | 面板展开切换；RSSI 预设 -70 → manager 过滤联动；隐藏无名 checkbox → manager 开关；Reset 全还原 | PASS |
| 扫描页↔详情页联动 | UIS-05 | 表格选中第 0 行 → MainWindowController 委托 → manager.connect → `Connecting to …` 日志 + connecting 状态 | PASS |
| 日志页 | UIS-06a | 扫描/连接事件进入 LogPanel，计数标签与 manager.txts 逐条一致（11 entries） | PASS |
| 日志页 | UIS-06b | 真实点击 Clear → logs 清空 → 计数归零 → 面板清空 | PASS |
| 工具栏 | UIS-07 | scanToggle/disconnect/logs 三项齐全 + Logs 动作派发（日志分栏折叠） | PASS |

### 原生未覆盖项

| 项 | 原因 |
| --- | --- |
| WriteDialog sheet 交互 | 需要 sheet 弹出与输入上下文，留待 UI 权限放开后走真机点击 |
| 服务树/特征读写 UI | BLOCKED_FIXTURE（同 r1 NVC-04） |
| UIS-05 环境依赖 | 需周围有可发现 BLE 设备（本轮 4 台；无设备时输出 SKIP 而非 FAIL） |

## r2 修复与发现

### D16 [共享层][待 Windows 线处理] CommandQueue 在 dispose 途中同步回调 setState

- 复现：任何进入又离开 DeviceDetailPage 的路径（widget 测试必现 defunct 断言）
- 链路：`DeviceDetailPage.dispose` → `CommandQueue.clear()` → `stopLoop()` →
  同步调用 `onQueueStateChanged` → 页面回调 `if (mounted) setState(...)` →
  此刻 `mounted` 仍为 true（框架在 dispose 之后才置空 element）→ unmount 途中
  `markNeedsBuild` → `_lifecycleState != defunct` 断言失败
- 影响：debug 构建下每次离开详情页都会触发断言；release 构建下为未定义行为风险
- 证据：logs/pages-flutter-fail-d16.txt（FLW-08 栈：command_queue.dart:176 ← device_detail_page.dart:91/370）
- 处置：共享层禁改（协议 §1）。探针 FLW-08 定向压制并注释引用；
  建议修复 diff 见 integration-notes.md S5，等 Windows Gate

### D17 [原生][已修复] 三页面 BLE 绑定从未建立

- 现象：首轮页面冒烟 UIS-02/04b/04c/06a FAIL —— 扫描按钮点击无效、过滤器 no-op、
  日志页永远 0 entries（logs/pages-native-smoke-first.txt）
- 根因：`MainWindowController.setupBLE` 只对三个页面控制器赋 `bleManager` 属性，
  但 `$discoveredDevices/$isScanning/$logs` 等订阅全部在 `setBLEManager(_:)` 方法内，
  从未被调用 —— 属性赋值不触发任何绑定
- 修复（本轮，apps/desktop/macos/** 允许区域内）：
  setupBLE 改为调用 `scanViewController/detailViewController/logViewController.setBLEManager(manager)`
- 复验：logs/pages-native-smoke-final.txt —— 11/11 PASS，扫描实扫 4 台、
  过滤联动、选择→connecting、日志 11 条同步、Clear 归零

### 环境适配记录（非缺陷，探针侧解决）

| 现象 | 处置 |
| --- | --- |
| FBP 1.36.8 `_Mutex`+广播流初始化链在 flutter_test fake-async 时钟下永久挂起（真实时钟正常，logs/fbp-fakeasync-proof.txt） | FLW-02/04 用 `tester.runAsync` 真实时钟预热单例；页面内 initialize() 因单例已初始化立即返回 |
| 共享层广播流无回放 → `bleStateProvider` 在 VM 永久 loading（AppBar 无限 spinner） | 不用 pumpAndSettle（必然超时），全部定长 pump；不做状态指示器断言（另见 integration-notes S6 备忘） |
| `ElevatedButton.icon` 运行时类型为私有子类 | `byWidgetPredicate((w) => w is ElevatedButton)` 祖先查找 |
| 默认 800x600 画布触发页面空态 Column 溢出 45px | `setSurfaceSize(1280x800)`（macOS 桌面尺寸） |
| 探针包无 `assets/brand/*` 且 `AssetManifest.bin` 走 StandardMessageCodec | 按路径 mock `flutter/assets`：PNG=1x1 占位、清单=空对象 |

## 复现命令

```bash
# Flutter 页面探针（8 用例）
cd verification/macos-extension/20260904-r2/pages-probe
flutter pub get && flutter test --dart-define=USE_MOCK_BLE=true

# 原生页面冒烟（11 步，退出码 0 = 全过）
cd apps/desktop/macos/SmartBLE-mac && swift build
./.build/debug/SmartBLE-mac --smoke-pages

# 一键入口（含上述步骤）
scripts/macos/verify-flutter-macos.sh 20260904-r2   # step 3
scripts/macos/verify-native-macos.sh 20260904-r2    # step 4
```
