# 20260921-XDEV-BROADCAST — Windows×Android 跨端广播联调

用户指令（2026-09-21）：「如果调试不够，不是还有安卓机子，可以一起联调。比如 Windows 的广播，可以用安卓版本来查看和交互。」

## 背景：六壳广播盘点（本轮起点）

| 壳 | 广播实现（盘点结论） |
|---|---|
| E-WIN Electron | **拒绝式降级**：`process.platform !== 'linux'` 直接报「not supported」（index.js:286） |
| T-WIN Tauri | **拒绝式降级**：三平台全拒（lib.rs:1052-1083） |
| G-WIN Wails | **拒绝式降级**：无条件返回错误文案（app.go:714-717） |
| Q-WIN PySide6 | 降级（bleak 无 publisher API） |
| V-WIN Avalonia | 表单/预算 UI 齐全，发射桩报「移植待排期」→ **本轮实装** |
| F-WIN Flutter | **插件自带 Windows 后端**（flutter_ble_peripheral 2.0.1 platforms 含 windows/CApi），但 `BlePeripheralManager.isSupported` 门控 `Android||iOS||macOS`（ble_peripheral_manager.dart:37）→ Windows 降级，升级项=翻门控+验证 |

本轮以 **V-WIN 直呼 WinRT `BluetoothLEAdvertisementPublisher`** 做参考实现（csproj 已有 net8.0-windows10.0.19041.0 投影），安卓版 A-AND（Kotlin/Compose，华为 TAS-AN00 / Mate 30 5G，Android 12）做空口观察者。

## 环境不变量

- ESP32-S3 SHID-00000001（10:B4:1D:CD:23:8E，fw 1.2.0）常在广播，全程未触碰（未连接/未写 INPUT/未刷机/未动 NVS）
- Windows 蓝牙适配器（PAN 口 MAC 44:38:E8:B7:8F:5D；LE 发射实际用**随机地址** 2D:65:90:55:F7:0C，与 PAN MAC 无关）
- 华为 TAS-AN00 = F013 同一台（FEC0220629005177）；本次实测其 dump 文本 bounds 为真实几何（F013 的 [0,0] 坑未复发，但 xpos 仍 [0,0]）
- A-AND 重建装机（com.smartble.android）+5 权限预授（SCAN/CONNECT/ADVERTISE/FINE_LOCATION），并在 `onScanResult` 加了 logcat 旁证行（MAC/name/rssi/**adv 原始字节 hex**）——本轮测试基建，绕 EMUI uiautomator 变体

## 平台事实（adv-probe 二分实证，win-adv-payload-probe.txt）

WinRT `BluetoothLEAdvertisementPublisher` 在**桌面（非打包）进程**：

1. **LocalName 进不了空口**（Start() 抛 ArgumentException）
2. **ServiceUuids 进不了空口**（同上）
3. **仅厂商数据块（0xFF）可发**，且空负载被拒（COMException「发布者只能从非空负载启动」）
4. 无线电支持发射（mfgOnly → Started）
5. **无 Microsoft CID 劫持**：手机侧收到 `06 ff 0100 424c45` = CID 0x0001 + "BLE" 原样出街（邻机 Windows Swift Pair 均为 0x0006 包装，对照鲜明）
6. 枚举投影成员名与文档不同：`Created/Waiting/Started/Stopping/Stopped/Aborted`（无 StoppedBySystem 等）

## 断言清单（全真机）

| # | 断言 | 证据 |
|---|---|---|
| A0 | A-AND 扫描管线基线（SHID -33dBm 在场，5s 起停正常） | hw-01-scan-baseline.log/.png |
| A1 | V-WIN 广播启动（publisher Started，徽章「广播中」，含防崩与平台限制日志） | 01-vwin-bc-started.png |
| A2 | **Phase A 查见**：V-WIN 广播被安卓版空口收到——`2D:65:90:55:F7:0C rssi=-41 adv=06ff0100424c45`，5s 窗 31 包 | hw-02-phaseA-scan.log + hw-02-phaseA-hit.txt + hw-02-phaseA-scanlist.png |
| A3 | mfg 保真：CID 0001 + "BLE"(424c45) 原样（无劫持/无截断） | 同上 hit 行 |
| B1 | 华为 A-AND 广播（FFF0/0001/BLE，connectable，系统名 Mate 30 5G） | hw-05-advertising.png/.xml、hw-09-advertising-live.png/.xml |
| B2 | **Phase B 查见**：V-WIN 扫描出现「Mate 30 5G」卡片（-44dBm）——VWIN-DEF-011 修复后 | vwin-scan-final.txt + 01-scanlist-mate30.png |
| B3 | A/B 在场实验：广播 ON 两轮恒见 6746A5BBDA58(-50)；真停播后消失（发现 8 台无该 MAC） | vwin-scan-adv-on.txt / vwin-scan-adv-off.txt |
| B4 | 裸 adv 解码：`45D420A8CE92 svc:FFF0 mfg:0x0001=424C45 name:Mate 30 5G`（RPA 已从 6746…轮转，F013 轮转坑复现） | win-adv-payload-probe.txt watch 段 |
| L1 | 切出广播页自动停播（回广播页日志见「广播已停止」） | 01-vwin-bc-auto-stopped.png |
| L2 | 广播中退出确认：busy 文案「广播发射中，确认退出将停止广播」→ 退出后进程干净退出 | 01-exit-busy-broadcast.png |
| U1 | V-WIN 单测 55/55（改动后回归） | 走查记录（CI 本地） |

## 缺陷

- **VWIN-DEF-011（P2，本轮修）**：`BleDeviceViewModel.Update` 无条件 `Name = device.Name`——ADV_IND（无名）与 SCAN_RSP（带名）交替到达，ADV 帧把名字冲回空 → 华为卡片恒「未命名」。修复=只在非空时覆盖（noble 合并口径）。修复前卡片未命名、修复后 Mate 30 5G，双态证据俱在。

## OBS（登记不修）

1. Windows 桌面发射名/UUID 不进空口（平台限制，见上）→ 正典 P005 的 name/uuid 字段在 Windows 空口上天然缺省；V-WIN 以平台限制日志显式告知。**这会输入 N4 裁决**（广播 Tab 显隐两案的论据变化），裁决仍归用户。
2. 华为 RPA 轮转：同一物理设备地址会换（6746A5BBDA58 → 45D420A8CE92，~15min 量级）——Windows 侧同一设备会以新 MAC 出现（与 F013 WIN-UAND-001 同源）。
3. V-WIN 退出拆卸 >6s（quit 轮询窗口外才退，非缺陷，驱动侧下次放宽轮询）。

## 坑位账（驱动/取证）

1. **驱动控制台输出是 GBK**：重定向文件 grep 中文模式假阴性（ugrep 判二进制）——`iconv -f GBK -t UTF-8` 再 grep；ASCII 模式也别信，先转。
2. FlaUI 鼠标点击被 z-order 吞（SetForegroundWindow 竞争）：**改 `AsButton().Invoke()` 编程式点击**后稳定。
3. 广播页日志在隐藏视图里 → 切页后 waittext 找「广播已停止」必假阴性；回广播页再断言。
4. 华为广播页按钮会**纵移 ~90px**（badge/日志行变化）：每次点击前重新 dump bounds，别复用坐标（本轮一次点空）。
5. adb 带设备侧 `/sdcard` 路径要 `export MSYS_NO_PATHCONV=1`；pull 本地目标用 `E:/...` 形式。
6. `adb pull` 不能写 MSYS 风格本地路径（`/e/...` 报 cannot create）。
7. V-WIN publisher 异常若不捕获会**带崩整个 app**（事件日志 .NET Runtime 栈为证）——Start() 必须 try/catch（已修入参考实现）。

## 驱动与工程位置（TEMP，不入库）

- `%TEMP%\winall\vwin-xdev\`：V-WIN 子命令驱动（launch/tab/click/fill/edits/state/waittext/snap/quit，pid 附着，Invoke 点击）
- `%TEMP%\winall\adv-probe\`：WinRT publisher 负载二分 + 空口 watch 探针
- 手机侧：adb shell input tap + uiautomator dump + logcat -s BleManager
