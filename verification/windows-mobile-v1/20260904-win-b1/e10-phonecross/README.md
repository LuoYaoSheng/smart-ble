# E10: 双手机广播↔扫描交叉矩阵（核心功能）

日期：2026-09-04 15:30–16:10（Windows 10 19045 / 三星 SM-G9910 Android 15 = A 机 / 小米 24117RK2CC = B 机）

测试对象：一台手机开 BLE 广播（App「广播」页，系统蓝牙名 + 服务 UUID 0000FFF0），
另一台手机用 App 扫描发现该广播。第三方锚点：Windows BleAdvDump（e7 工具）验证广播是否真实在空中。

本测试前 F-AND（com.smartble.flutter，debug APK）已通过 `adb install -r -g` 新装到 B 机，
并补授 `BLUETOOTH_ADVERTISE`（`-g` 未覆盖该权限，`pm grant` 后 granted=true）。

## 矩阵结论

| # | 广播端 | 扫描端 | 发现 | 停播衰减 | 判定 |
|---|---|---|---|---|---|
| T1 | A: F-AND | B: F-AND | 列表现「耀生 的 S21 / 63:1A:B7:9D:FD:3E / -64dBm」（9→10 台） | 停播后复扫回落 9 台，空中 0 帧 | **PASS** |
| T2 | B: F-AND | A: F-AND | 列表现「1483143285的REDMI K80 / 5D:94:2A:25:53:D7 / -54dBm」 | **停播失效（DEF-014）**：UI 已停、原生 onAdvertisingSetStopped，广播仍持续 ≥5 分钟 | 发现链 **PASS** / 停止链 **FAIL** |
| T3 | B: U-AND | A: F-AND | 列表（滚动）现「1483143285的REDMI K80 / 75:B0:55:B8:98:5B / -54dBm」，地址与锚点一致 | —（停止链归 DEF-014 母题） | **PASS** |
| T4 | A: F-AND | B: U-AND | 列表（滚动）现「耀生 的 S21 / 50:1D:0A:8A:6C:7F / -56dBm」，地址与锚点一致 | A 停播即空中消失（Windows 10s 0 帧） | **PASS** |

全部 4 组「手机广播→另一手机扫描」发现链均通。所有命中均满足三重证据：
广播端 UI 在广播 + Windows 锚点（同名/FFF0/conn=1 在空中）+ 扫描端列表卡片且地址与锚点一致。

## T1 证据链（A F-AND 广播 → B F-AND 扫描）
- B 基线扫描（A 未广播）：9 台无「耀生」 `b-scan-baseline.xml`（注：首次多轮「0 台」为连续点击触发系统扫描节流 + 首击丢失假象，fresh 复跑恢复 9 台）
- A「开始广播」→ UI「正在广播」 `a-adv-on.xml/.png`
- Windows 锚点：`43FBECFBCCE7 n=4 name=[耀生 的 S21] conn=1 uuids=0000fff0`（后轮换为 631A）
- B 真实扫描（FBP 日志夹逼 `startScan 15:46:24.224 → stopScan 15:46:29.249`，`b-fbp-bracket.txt`）
  → 列表 10 台含「耀生 的 S21 / 63:1A:B7:9D:FD:3E / -64dBm」 `b-scan-live4.xml/.png`
- A「停止广播」→ B 重启复扫 9 台无耀生 `b-scan-after-stop.xml`；Windows 10s 0 帧

## T2 证据链（B F-AND 广播 → A F-AND 扫描）
- B「开始广播」→ UI「正在广播」 `b-adv-on.xml/.png`；原生 `onAdvertisingSetStarted status=0`（logcat）
- Windows 锚点：`4EFD58769AE4/5C10426BE03E name=[1483143285的REDMI K80] conn=1 uuids=0000fff0`（小米 RPA 轮换快，1 分钟内 3 地址）
- A 真实扫描（清空 logcat 后 `startScan 15:53:43.134 → stopScan 15:53:48.190`）
  → 「1483143285的REDMI K80 / 5D:94:2A:25:53:D7 / -54dBm」 `a-scan-live.xml/.png`
- 停播：B UI→「未广播」`b-adv-off.xml`，原生 `stopAdvertisingSet → onAdvertisingSetStopped`（15:55:20，logcat 摘录在本 README 下节）
  但 Windows 于 ~15:58、~16:00 两次锚点仍各收 14/12 帧（同名同 FFF0，地址持续轮换 4EFD→4DE4）；
  `am force-stop com.smartble.flutter` 无效（杀进程后仍在发且地址继续轮换）；
  最终 `svc bluetooth disable/enable` 后才消失（0 帧）。→ **DEF-014**

### DEF-014 原生停止证据（logcat，B 机）
```
15:55:20.530 BtGatt.AdvertiseManager: stopAdvertisingSet() BinderProxy@e3bf75c
15:55:20.542 BtGatt.AdvertiseManager: findAdvertiser2() - advertiserId 3
15:55:20.565 FlutterBlePeripheral: onAdvertisingSetStopped() status: ...
15:55:20.568 bluetooth_core::gatt::server::isolation_manager: removing server ...
（此后无任何 onAdvertisingSetStarted，但空中仍每秒 1 帧同名广播 ≥5 分钟）
```

## T3 证据链（B U-AND 广播 → A F-AND 扫描）——小米侧 U-AND 广播首测
- U-AND 打开即显示残留「正在广播」假状态（BT 重启后 UI 状态未同步，空中 0 帧）——U-AND 状态机与底层脱节的又一表现，与 DEF-009 同族
- 干净周期：点停（重试 2 次生效）→「未广播」 `u-after-stop-click2.xml` → 点开「正在广播」 `u-adv-on.xml/.png`
- **原生调用成功（与三星 DEF-009 的零调用相反）**：
```
16:01:47.231 BluetoothLeAdvertiser: Total bytes: size:29 / TxPower == ADVERTISE_TX_POWER_HIGH
16:01:47.242 BtGatt.AdvertiseManager: startAdvertisingSet() - reg_id=-6
16:01:47.254 BtGatt.AdvertiseManager: onAdvertisingSetStarted() - regId=-6, advertiserId=2, status=0
```
- Windows 锚点：`75B055B8985B n=12 name=[1483143285的REDMI K80] conn=1 uuids=0000fff0`
- A 真实扫描（`startScan 16:02:41.444 → stopScan 16:02:46.461`）发现 13 台，滚动后命中
  「1483143285的REDMI K80 / 75:B0:55:B8:98:5B / -54dBm」 `a-u-scroll1.xml`
- **DEF-009 定性更新：U-AND 广播静默失效为设备相关（三星必现、小米正常），非 U-AND 代码必现缺陷**

## T4 证据链（A F-AND 广播 → B U-AND 扫描）
- A「开始广播」→ `a-t4-adv-on.xml/.png`；Windows 锚点 `501D0A8A6C7F n=4 name=[耀生 的 S21] conn=1`
- B U-AND 扫描页基线 9 台（无耀生，`u-after-back.xml`）→ 点「开始扫描」（1 次生效）→ 11 台
  → 滚动命中「耀生 的 S21 / 50:1D:0A:8A:6C:7F / -56dBm」 `u-t4-scroll1.xml` / `u-scan-live2.png`
- A 停播 → Windows 10s 0 帧（`a-t4-adv-off.xml` UI 未广播）

## 过程中发现的新缺陷
- **DEF-013（P1，F-AND 全平台）**：`BleManager.startScan()` 的 `_isScanning` 守卫只在手动 stopScan/异常路径复位；
  FBP 5 秒超时自动停止后无人复位 → **应用首次扫描超时后，后续所有扫描静默空转**（UI 按钮照常翻转），
  仅重启应用或在 5 秒窗口内手动点停可恢复。本测试期间所有 B 机扫描均需重启应用绕过。
  源码：`apps/flutter/lib/core/ble/ble_manager.dart:218` 守卫、`:220` 置位、`:253` 手动复位（无 FBP isScanning 监听）。
  证据：`b-scan-live*.xml` 多轮字节级相同（RSSI 均不变）；FBP 日志无 startScan；重启后立即恢复。
- **DEF-014（P2，小米设备相关）**：F-AND 停止广播后广播仍在空中持续（详见 T2）。三星同版本停播即生效。

## 附带观察（如实记录）
- A 机 F-AND 曾在无任何 startScan 日志的情况下列表自行出现 9 台（含 REDMI 卡片）；随后清空 logcat 的受控扫描复现成功，
  机制未定位（疑与 FBP 流重放/页面重建有关），不影响 T2 判定（判定仅采用受控扫描证据）。
- 小米输入首击丢失率高（扫描按钮/Tab 均有 ~50% 概率 ACTION_UP 后不生效），所有受控步骤均用「点击→dump 校验→重试」循环。
- 小米 `-g` 安装不授予 BLUETOOTH_ADVERTISE，需显式 pm grant。
- 小米 RPA 地址轮换远快于三星（~30s 级 vs 小时级）；跨锚点比对以名称+FFF0+conn 特征为主、地址为辅。
