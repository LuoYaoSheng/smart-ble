# E6: Windows 主机 BLE Peripheral 完整轮

日期：2026-09-04（Windows 10 19045 x64，Intel Wireless Bluetooth 适配器）

## 结论
**PASS（扫描/连接/服务发现/读×2/写 全部真实通过，串口双向对账）**

## 环境
- 适配器：英特尔(R) 无线 Bluetooth(R) + Microsoft 蓝牙 LE 枚举器（Get-PnpDevice 状态 OK）
- bthserv：Running
- 工具链：csc.exe (.NET 4.8 参考程序集 + WinMetadata winmd) 编译的 WinRT 原生测试器（无第三方依赖）

## 工具与方法
- `BleScan.cs/.exe`：BluetoothLEAdvertisementWatcher（Active 模式）扫描器
- `BleConnect.cs/.exe`：BluetoothLEDevice.FromBluetoothAddressAsync → GetGattServicesAsync → GetCharacteristicsAsync → ReadValueAsync/WriteValueAsync（IAsyncOperation 用 Completed 事件阻塞等待）
- 已知限制：PowerShell 5.1 脚本块内 WinRT 事件不触发（STA/MTA 均为 0 事件，见 win-scan1.txt / win-scan2-sta.txt），故用 C# 二进制

## 真实执行记录
1. **扫描**（win-scan3-cs.txt）：20 秒 225 广播事件、7 台设备，**BLEToolkit-Server（10B41DCD238D）rssi=-38** —— 与手机侧发现同 MAC 同名
2. **连接+服务发现+读+写**（win-gatt-session.txt）：
   - 连接成功，设备名 BLEToolkit-Server
   - 5 个服务：1800（2A00/2A01）、1801（2A05）、4FAFC201-…914b（2 特征）、4FAFC201-…914c（7 特征）、4FAFC201-…914d（3 特征），共 15 特征值及属性
   - READ 2A00 → `42-4C-45-54-6F-6F-6C-6B-69-74-2D-53-65-72-76-65-72` = "BLEToolkit-Server"
   - READ 2A01 → `00-00`
   - WRITE beb5483e-…-26b1 → **Success**（payload=win-gatt-write）
   - Dispose 前连接状态 Connected

## 固件侧串口对账（e5-realdevice/def006/diag1-full-session.ts 行 3765-3793）
- `conn connected ts=9520453`（Windows 连接到达固件）
- `disc service_ready ts=9520473`
- `beb5483e-…-26b1 Write event` + `setValue: length=14, data=77696e2d676174742d7772697465`（= "win-gatt-write" 的 HEX，逐字节一致）
- `disconnected ts=9529417 → adv started ts=9529932`（**515ms 恢复广播**）

## 与 DEF-006 的关系
Windows 断开（Dispose）后固件 515ms 恢复广播，与 F-AND 两次断开（510ms/514ms）一致——三个客户端三种断开路径均即时恢复广播，固件侧无缺陷（DEF-006 判定维持：手机栈环境问题）。

## 复现
```
csc /out:BleScan.exe <winmd+facade refs> BleScan.cs && BleScan.exe 20
csc /out:BleConnect.exe <同上 refs> BleConnect.cs && BleConnect.exe 10B41DCD238D
```
