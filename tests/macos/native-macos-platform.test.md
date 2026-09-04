# 测试入口：原生 AppKit/CoreBluetooth 平台层 — tests/macos/native-macos-platform

范围：apps/desktop/macos/SmartBLE-mac 构建/运行 + CoreBluetooth 能力边界（native-probe 驱动）。

## 入口

```bash
scripts/macos/verify-native-macos.sh <run-id>
```

## 用例矩阵

| ID | 用例 | 判定 |
|---|---|---|
| NVB-01 | swift build | 0 error（历史开箱失败已在 spike 修复，见 defects D5-D9） |
| NVB-02 | App 冒烟 8s | `[BLE] Bluetooth is powered on` + `Peripheral is powered on` |
| NVB-03 | swift test | 包内无测试目标，NOT_RUN |
| NVA-01 | Info.plist 双蓝牙 usage 键 | 配置断言 |
| NVC-01 | probe env | CENTRAL_STATE=5 + PERIPHERAL_STATE=5 |
| NVC-02 | probe scan 12s | unique≥1 且 updates>unique（真实设备） |
| NVC-03 | probe advertise（GATT server 三特征） | service_added + advertising_started（API 层） |
| NVC-04 | probe connect（GATT 客户端全链） | **无夹具=BLOCKED_FIXTURE**；同机广告不可见（P1） |
| NVC-05 | 广播外部可见性 | **无第二观察端=BLOCKED_OBSERVER** |
| NVL-01 | 退出清理（terminate 钩子 disconnect/stopScan） | 源码断言 + SIGTERM 干净退出 |

## 硬件夹具声明

同 flutter-macos-platform：扫描类真实可判；GATT/外部可见性需 ESP32 或可操作手机端；
禁止触碰用户活跃输入设备。

## 已知平台事实

同 flutter 侧 P1（同机广播回送过滤）——两条路线共用同一 CoreBluetooth 底座，边界一致。

## 页面级冒烟用例（r2 新增，UIS-*）

入口：`scripts/macos/verify-native-macos.sh` step 4（`SmartBLE-mac --smoke-pages`）。
不依赖屏幕权限：程序化触发真实 action/委托，从控件状态读回判定。

| ID | 步骤 | 判定 |
| --- | --- | --- |
| UIS-01 | 三页装配 | 窗口可见且 FilterPanel/NSTableView/ServicePanel/LogPanel 均挂载 |
| UIS-02 | 真实点击 Start Scan | 按钮变 Stop Scan、状态 Scanning...、manager.isScanning=true |
| UIS-03 | 5s 自动停止 | 按钮复位 Start Scan、状态 Ready |
| UIS-04a | 过滤面板切换 | filterPanel.isHidden == false |
| UIS-04b | RSSI 预设 -70 | manager.filterRSSI == -70 |
| UIS-04c | 隐藏无名 checkbox | manager.hideNoNameDevices == true |
| UIS-04d | Reset | 过滤器全部还原 |
| UIS-05 | 表格选中第 0 行 | 日志出现 `Connecting to` 且状态进入 connecting（环境无设备时 SKIP） |
| UIS-06a | 日志页绑定 | 计数标签与 manager.logs 条数一致且 LogPanel 有内容 |
| UIS-06b | 真实点击 Clear | logs 空、标签 0 entries、面板清空 |
| UIS-07 | 工具栏 | 三项标识齐全且 logs 动作可派发 |

WriteDialog sheet 交互留待 UI 权限放开；服务树/特征读写同 NVC-04 BLOCKED_FIXTURE。
