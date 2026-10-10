# E7: Windows 监听安卓 BLE 广播（Broadcast 模式端到端）

日期：2026-09-04 14:10–14:17（Windows 10 19045 x64 / Intel Wireless Bluetooth × Samsung SM-G9910）

## 结论
- **F-AND 广播 → Windows 监听：PASS**（开/关全周期）
- **U-AND 广播 → Windows 监听：FAIL（DEF-009 扩展：广播亦静默失效）**

## 工具
`BleAdvDump.cs/.exe`（csc + WinRT，无第三方依赖）：Active 扫描，按 MAC 聚合输出
LocalName / ServiceUuids / ManufacturerData(hex) / Connectable / RSSI 区间 / 帧数 / 首末时间。
（PowerShell 脚本块收不到 WinRT 事件，见 e6-windows；.exe 为构建产物不入库，源码可复现）

## F-AND（com.smartble.flutter）广播轮
手机系统蓝牙名称 `耀生 的 S21`（经典 MAC C4:18:E9:E5:91:F6；LE 侧地址不同，按名称匹配）。

| 步骤 | 结果 | 证据 |
|---|---|---|
| 基线扫描（未广播）15s | 167 事件/11 地址，无手机广播；ESP32 行 `mfr=00E0:4C69676874424C45`（"LightBLE"）可作标定 | `bcast-baseline.txt` |
| 手机点「开始广播」 | UI →「正在广播」 | `ui-bcast-on.xml` |
| Windows 扫描 20s | **`4237044C3D48 n=4 rssi=-58/-59 name=[耀生 的 S21] conn=1 uuids=0000fff0`** —— 名称=系统蓝牙名、服务UUID=FFF0、可连接、强度正常，基线中不存在 | `bcast-live.txt` |
| 手机点「停止广播」 | UI →「未广播」 | `ui-bcast-off.xml` |
| Windows 复扫 20s | 371 事件/9 地址，**手机地址与名称均消失** | `bcast-stopped.txt` |

## U-AND（com.smartble）广播轮
| 步骤 | 结果 | 证据 |
|---|---|---|
| 广播 Tab + 点状态卡 | UI →「正在广播」 | `u-bcast-tab.png` / `u-bcast-on.png` |
| Windows 扫描 20s | 259 事件/9 地址，**无手机广播**（新增地址均为微软信标/Apple 设备，无名称无 FFF0） | `u-bcast-live.txt` + 地址差集 |
| off→on 再切换 + logcat | **零 BLE 广播 API 调用**（无 BluetoothLeAdvertiser/GATT 活动行，仅 SurfaceFlinger 渲染） | 本 README 记录（logcat 摘录） |

判定：与 U-AND 连接失效（DEF-009）同型——UI 状态机正常切换但底层从未调用系统 BLE 能力。**DEF-009 范围扩展为：U-AND App 端 BLE 连接与广播双双静默失效**。

## 环境噪声记录（如实）
扫描中稳定出现的第三方：ESP32（BLEToolkit-Server）、微软信标簇（mfr 0006）、Apple Continuity（mfr 004C）、FDA 服务设备（uuid fdaa）、Nordic UART 设备（6e400001, name=873）等；均与手机广播可区分。
