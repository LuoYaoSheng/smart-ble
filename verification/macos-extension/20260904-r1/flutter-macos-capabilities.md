# Flutter macOS BLE 能力测试 — run 20260904-r1

测试对象分两层：
1. **产品 App**（apps/flutter，flutter run 日志 `/tmp/flutter_run_macos.log`）
2. **插件探针**（`verification/macos-extension/20260904-r1/probe/`，flutter_blue_plus **1.36.8** +
   flutter_ble_peripheral **2.1.1**，与产品 pubspec.lock 解析版本一致；日志 `/tmp/flprobe_*.log`）

UI 驱动路径说明：本机无屏幕录制/AX 授权，无法程序化点击产品 UI，产品 App 的能力以
启动日志 + 插件探针（同一插件栈、同版本）实测为准。

## 7.1 Environment

| 项 | 证据 | 状态 |
|---|---|---|
| 蓝牙可用 | 产品 App 与探针均 `CBManagerStatePoweredOn`；探针 `FBP_IS_SUPPORTED=true`、`PERIPHERAL_IS_SUPPORTED=true`；adapter unknown→on | **PASS** |
| 蓝牙关闭 | 未执行：关闭系统蓝牙会中断用户正在使用的 Magic Keyboard/Trackpad（活跃输入设备） | **NOT_RUN**（需用户在场配合） |
| 权限未授权/拒绝 | 无法在本机复现（com.smartble.flutter 已授权且 TCC 无 CLI 复位授权途径；`tccutil reset` 需用户授权窗口交互） | **NOT_RUN** |
| 权限已授权 | 直接 PoweredOn，无 unauthorized 中间态（产品 App + 探针 4 次进程启动一致） | **PASS** |
| App 重开后权限行为 | 探针多次冷启动均直接 on，无重复弹窗 | **PASS** |

## 7.2 Central（真实外设在场：iPhone + 3×midea + 无名设备）

| 项 | 证据 | 状态 |
|---|---|---|
| 开始扫描 | `IS_SCANNING=true`；原生侧 `startScan` 方法调用日志 | **PASS** |
| 5 秒自动停止 | scan5 模式：scan 起 t=811.388 → `IS_SCANNING=false` t=816.393（精确 5.0s） | **PASS** |
| 手动停止 | scan 模式 `EVENT=manual_stop` 后停止 | **PASS** |
| 设备去重 | 12s 扫描 unique_devices=6 | **PASS** |
| RSSI 更新 | total_updates=87（同设备多次更新，rssi -45~-95） | **PASS** |
| 连接 | midea 直连尝试：10s 超时（设备拒绝未配对连接）→ 超时/异常路径正确 | **PASS_WITH_LIMITATION**（连接尝试与错误处理实测；成功连接无夹具） |
| 服务发现/特征发现/Read/Write/Notify | 无可安全连接夹具（键鼠禁止触碰、midea 拒连、同机广播不可见） | **BLOCKED_FIXTURE** |
| 断开连接 | 无连接可断（见上）；代码路径存在 | NOT_RUN |
| 退出后监听清理 | 每次探针进程独立运行，多次启停无泄漏迹象；SIGTERM 干净退出 | **PASS_WITH_LIMITATION** |

## 7.3 Peripheral（flutter_ble_peripheral 2.1.1）

| 项 | 证据 | 状态 |
|---|---|---|
| isSupported | `PERIPHERAL_IS_SUPPORTED=true` | **PASS** |
| startAdvertising | `PERIPHERAL_STATE=idle→advertising`（状态流确认广播真实启动） | **PASS**（API 层） |
| advertising state | `onPeripheralStateChanged` 流完整上报 idle/advertising/idle | **PASS** |
| stopAdvertising | `PERIPHERAL_STATE=idle`，`stop()` 返回 | **PASS** |
| 退出后停止 | 进程退出（15s 定时 stop 后 exit 0），无残留广播日志 | **PASS**（API 层） |
| localName / service UUID | start 参数含二者；**外部确认不可得**（见下） | PASS_WITH_LIMITATION |
| App Sandbox 下广播 | Debug（Sandbox+bluetooth entitlement）下成功 | **PASS**（API 层） |
| **外部可见性（E5）** | 交叉实验：Flutter 广播(advertising 态)+原生无过滤扫描 12s→7 台设备、`expected_uuid_seen=false`；过滤扫描 15s 亦未发现。**macOS 控制器不回送自身广播**，iPhone/ESP32 观察端不可操作 | **BLOCKED_OBSERVER**（API 层 PASS_WITH_LIMITATION） |

## 7.4 生命周期

| 项 | 证据 | 状态 |
|---|---|---|
| 窗口关闭 | 无 AX 授权，未驱动；应用有标准 closable 窗口 | NOT_RUN |
| App 退出（SIGTERM） | 进程干净退出、无挂起无崩溃日志 | **PASS** |
| 切后台/睡眠唤醒/蓝牙开关 | 会影响用户活跃输入设备或需用户在场 | **NOT_RUN**（需用户配合） |
| 扫描/广播中退出 | 探针各模式均在定时窗口内正常结束；强制中断未做破坏性测试 | PASS_WITH_LIMITATION |
| Listener 重复注册 | 探针每次运行单次订阅；产品 App 冷启动 isSupported→getAdapterState 顺序正常，`isSupported` 触发 FBP darwin 侧 duplicate response 报错（见 defects D2） | PASS_WITH_LIMITATION |

## 结论

- Central 侧：扫描全链（启动/5s 自动停/手动停/去重/RSSI）**真实 PASS**；GATT 四操作无安全夹具，BLOCKED_FIXTURE。
- Peripheral 侧：API 层全链 PASS（含 Sandbox）；外部可见性 BLOCKED_OBSERVER —— 这是 macOS 平台的
  **结构性约束**（本机控制器不回送自身广播），跨栈一致（原生侧同样被过滤）。
