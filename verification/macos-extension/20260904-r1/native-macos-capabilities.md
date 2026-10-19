# 原生 macOS 能力测试 — run 20260904-r1

两层证据：
1. **SmartBLE-mac App**（修复后运行日志 `/tmp/native_fg2.log`）
2. **native-probe**（`tests/macos/native-probe/`，日志 `/tmp/probe_*.log`）

## Environment

| 项 | 证据 | 状态 |
|---|---|---|
| 蓝牙可用 | App：`[BLE] Bluetooth is powered on`；探针：CENTRAL_STATE=5 | **PASS** |
| 蓝牙关闭/权限拒绝 | 同 Flutter 侧理由，不切换系统蓝牙 | **NOT_RUN** |
| 权限已授权 | Central+Peripheral 均 PoweredOn | **PASS** |

## Central

| 项 | 证据 | 状态 |
|---|---|---|
| 扫描启动 | `EVENT=scan_start`（App 侧 startScan UI 路径存在，探针实测 API） | **PASS** |
| 5 秒自动停止 | App 的 BLEManager 有 autoStopTimer（对齐 UniApp 5 秒规格）；探针按需控制时长 | **PASS_WITH_LIMITATION**（App UI 路径未点击，代码+探针 API 已证） |
| 筛选 | BLEManager filteredScanResults（RSSI/前缀/隐藏无名）逻辑在源码中完整；探针 withServices 过滤实测 | **PASS_WITH_LIMITATION** |
| 设备去重 / RSSI | 探针 12s：unique=5、updates=23 | **PASS** |
| 连接 / 服务发现 / Read / Write / Notify / 断开 | 探针 connect 模式全链实现并实测——目标发现即执行 connect→discover→read→notify×2→write→disconnect；**同机广告不可见导致目标不可发现**，midea 拒未配对连接 → 正向链 BLOCKED | **BLOCKED_FIXTURE**（代码链完整 + 负面路径实测 exit 1） |

## Peripheral（探针 GATT server 模式）

| 项 | 证据 | 状态 |
|---|---|---|
| GATT 服务添加 | `EVENT=service_added`（read/write/notify 三特征） | **PASS**（API 层） |
| startAdvertising / 状态 / stopAdvertising | `advertising_started` / 订阅-通知回调链实现 / 定时 stop | **PASS**（API 层） |
| 外部可见性 | 同 Flutter 侧结论：**BLOCKED_OBSERVER**（同机不可见 + 无第二观察端） | **BLOCKED_OBSERVER** |

## 生命周期

| 项 | 证据 | 状态 |
|---|---|---|
| App 退出清理 | `applicationShouldTerminate` 调 disconnect()+stopScan()（源码）；SIGTERM 干净退出 | **PASS_WITH_LIMITATION** |
| 广播/扫描中退出 | 探针各模式 exit 0；中断路径未破坏性测试 | PASS_WITH_LIMITATION |
| 睡眠唤醒/蓝牙开关 | 同前，不干扰用户输入设备 | **NOT_RUN** |

## 结论

原生 CoreBluetooth 在本机的可用边界与 Flutter 插件层**完全一致**：
扫描真实可用，广播 API 层可用但本机不可自证可见性，GATT 正向链受夹具限制。
SmartBLE-mac App 经本轮修复后可编译可运行，但为早期原型（单连接、无重连、无队列、英文硬编码）。
