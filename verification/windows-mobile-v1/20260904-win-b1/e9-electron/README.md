# E9: 自研 Windows 客户端（Electron, @abandonware/noble）真机测试

日期：2026-09-04 14:42–15:12（Windows 10 19045 / Intel Wireless Bluetooth / ESP32-S3 @COM12）
本机无 Rust 工具链，Tauri 端（btleplug）本轮未测；Electron 端为当前可运行的自研 Windows 客户端。

## 结论
- **noble 后端完整 GATT 轮：PASS**（无头直驱应用同款依赖，串口双向对账）
- **Electron 应用本体：启动+扫描+连接 PASS；连接后特征发现陷入死循环 → DEF-012（P1），UI 挂死**

## 1) 无头后端轮（noble-probe.js / noble-gatt.js，与 app 同版本依赖）
| 步骤 | 结果 | 输出 |
|---|---|---|
| 模块加载/状态 | PASS：state unknown→poweredOn，scanStart | noble-probe-out.txt |
| 扫描发现 | PASS：`10:b4:1d:cd:23:8d` rssi -39（首包名 "BL"=广播包短名；扫描响应含全名 "BLEToolkit-Server"，主进程两种都收到——见 debug log，非缺陷） | noble-probe-out.txt |
| 连接 | PASS：发现后 **233ms** 完成连接 | noble-gatt-out.txt |
| 服务/特征发现 | PASS：5 服务 15 特征（1800/1801/4FAFC201×3） | 同上 |
| 读 2A00 | PASS：`BLEToolkit-Server`（hex 424c4554…） | 同上 + 串口 |
| 写 26b1 | PASS：`noble-gatt-write` 16 字节；固件串口 `setValue length=16 data=6e6f626c652d…` 逐字节一致 | 同上 + 串口 |
| 订阅 26c2 | PASS：固件 `subscribe event; attr_handle=42, subscribed: true` | 串口 |
| 断开 | PASS | 同上 |

## 2) 应用本体（electron . --remote-debugging-port=9222，CDP 驱动其真实 UI）
| 步骤 | 结果 |
|---|---|
| 启动/主进程初始化 | PASS：窗口创建、`ble:init`→noble 加载→poweredOn→状态推送渲染进程（debug log 前 40 行） |
| UI 扫描 | PASS：点"开始扫描"→发现 7 台；device-card 组件 shadow DOM 渲染完整（首卡 BLEToolkit-Server；注意 innerText 看不到 shadow DOM，初判"不渲染"是探针方法错误） |
| UI 连接 | PASS：点卡片"→"按钮→固件串口全事件链 connected ts=13063804→service_ready→notify enabled；详情页渲染（设备名称/OTA 升级/断开连接） |
| 连接后 | **FAIL：DEF-012** |

## DEF-012：连接后特征发现无限错误重试循环（P1）
- 主进程日志 53.7MB（约 20 分钟内）：`Characteristic discovery error for service 1800 : {}` ×135,184、`Service 1800 already has 2 characteristics` ×140,131
- `ble:servicesDiscovered` 每 ~2ms 向渲染进程重发一次，所有服务 `characteristics:[]` 恒空
- 后果：主进程忙循环→CDP 求值超时→UI 挂死（需 taskkill）
- 对照：同版本 noble 依赖无头直驱 `discoverAllServicesAndCharacteristics` 一次成功 → 缺陷在应用主进程的发现编排/重试逻辑（main/index.js ~509 行附近"检查服务是否已有特征值"分支），非 noble/Windows 后端问题
- 证据：electron-main-debug-excerpt.txt（含计数与代表性片段；完整 53MB/94MB 日志仅记录大小，不入库）、electron-main-debug-tail.txt

## 复现
```
cd apps/desktop/electron && npm install && npx electron .
# 连接 BLEToolkit-Server → 观察 UI 挂死与日志爆炸
# 对照（后端正常）：node ../../verification/.../e9-electron/noble-gatt.js
```
