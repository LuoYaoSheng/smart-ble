# E5 · iPhone 息屏后台 BLE 收发验证（20260910）

## 结论（TL;DR）

**PASS** —— iPhone 息屏（屏幕熄灭 + app 退到非活跃）后，依托 `UIBackgroundModes = [bluetooth-central, bluetooth-peripheral]`：

- **接收 ✓**：设备每 5s 主动推送的 `device_status` notify 与每条写响应 notify 全程持续到达（无 >8s 间隙）
- **下发 ✓**：App 定时器发起的 GATT 写全部 `write_acked`（约每 5s 一次，含回声写）
- **链路 ✓**：Mac 侧"广播缺失游标"全程 LINK_UP——夹具连接态停广播，广播持续缺失 = iPhone 链路持续存活
- **取证通道 ✓**：`devicectl device copy from --domain-type appDataContainer` 可在**锁屏期间**直接拉取 app 沙箱内 `Documents/bg-selftest.log`（无需解锁）

测试口径说明：测试机 `passcodeRequired: false`（未设密码）。"息屏"= 侧键熄屏 + app inactive；对 bluetooth-central 后台执行而言，iOS 判定依据是 app 生命周期而非密码状态，语义与带密码锁屏一致（如实记录，不复核带密码场景）。

## 配置清单（用户问题"还需要配置什么"的直接答案）

| 配置 | 状态 | 说明 |
|---|---|---|
| `UIBackgroundModes: bluetooth-central` | **工程已配**（Info.plist 原有） | 核心项：无它锁屏数秒内 BLE 全挂起 |
| `UIBackgroundModes: bluetooth-peripheral` | 已配（原有） | 广播页（BroadcastView）后台继续广播所需 |
| `NSBluetoothAlwaysUsageDescription` / `NSBluetoothPeripheral` | 已配（原有） | 权限文案 |
| 自动化测试链路 | **本轮新增** | `--ble-bg-selftest` 自测模式（app）+ 链路游标脚本（Mac） |
| CBCentralManager 状态恢复（restore identifier + willRestoreState） | **未配**（遗留增强项） | 当前 app 被系统杀死后不能自动恢复连接；本次测试进程未被杀，未触达。建议后续补 |

## 测试设计

### 难点与对策

1. **锁屏期间手机端无取证通道** → App 侧 `--ble-bg-selftest` 模式把事件流写入 `Documents/bg-selftest.log`；devicectl 经 USB 在锁屏态可直接拉取（已实证）。
2. **夹具单连接约束**（固件 `blePeripheralLoop` 仅在断连瞬间重启广播；连接态停广播 → 第二中心无法加入，双中心路线不可行）→ 改为 App **自发自收**闭环：
   - 下发证据：App 每 10s 定时写 `{"cmd":"led","value":"on/off"}` 到 Control(26A8)，每条等待 `write_acked`
   - 接收证据：设备每 5s 主动推 `device_status` 心跳 notify + 每条写响应 notify 到 StatusNotify(26A9)
   - 自激防护：响应 `command=="led"` 的 notify 不再触发回声写 + 1.2s 节流
3. **链路存活性独立旁证** → Mac 侧游标脚本每 10s 扫描一次：`BLEToolkit-Server` 广播缺失 = 仍有中心连接 = iPhone 链路存活；广播重现 = 链路断（固件断连后 500ms 重启广播）。

### 时间线

| 时刻 | 事件 |
|---|---|
| 13:20:39 | App 启动（`--ble-bg-selftest`），armed → scan_start → fixture_discovered(-67dBm) |
| ~13:20:49 | 连接成功（夹具广播消失，Mac 首轮轮询确认） |
| 13:20:49–13:21:16 | **基线段（亮屏前台）**：自发自收闭环运转 |
| ~13:22:00 | **用户按侧键息屏** |
| 13:22:04–13:25:26 | **息屏段 A**：游标 #1 全程 LINK_UP；13:23:4x 锁屏中段拉取日志成功 |
| 13:25:3x–13:33:4x | **息屏段 B（浸泡）**：游标 #2（8 分钟） |
| 13:32:21 | 终拉日志（浸泡后），证据链闭合 |

## 终局数字（13:20:39 → 13:32:21，其中息屏 ~10.5 分钟）

| 指标 | 值 | 判定 |
|---|---|---|
| `device_status` 心跳接收（每 5s） | **139 条** | 接收 ✓ |
| 写响应 notify 接收 | 71+139 条响应流 | 接收 ✓ |
| `write_acked`（下发确认） | **211 条** | 下发 ✓ |
| `write_failed` | **0** | 零失败 |
| `timer_write`（定时器存活） | **71 条** | app 未被挂起 |
| `disconnected` | **0** | 链路从未断 |
| 接收节奏 >8s 间隙 | **0 处** | 无任何挂起窗口 |
| 游标 LINK_UP / 总采样 | **66 / 66**（#1: 21/21，#2: 45/45） | 链路持续存活 |

## 证据

| 文件 | 内容 |
|---|---|
| `logs/app-bg-selftest-baseline.txt` | 基线段完整事件流（亮屏前台） |
| `logs/app-bg-selftest-locked-mid.txt` | 息屏中段拉取（含 armed 起全量） |
| `logs/app-bg-selftest-final.txt` | 终拉（浸泡后） |
| `logs/fixture-link-cursor.txt` | 息屏段 A 游标 |
| `logs/fixture-link-cursor-soak.txt` | 息屏段 B（浸泡）游标 |
| `logs/probe-echo-baseline.txt` | （失败存档）双中心 echo 触发首次尝试——因夹具单连接约束超时，转方案 |

## 过程发现（非缺陷即资产）

1. **夹具单连接约束**：连接态停广播、仅断连瞬间重启（`ble_peripheral.cpp` loop）。若未来要多中心并发测试（如 UIS-18 双客户端口径），需固件改为连接态持续可连接广播（onConnect 里 `NimBLEDevice::startAdvertising()`）+ `deviceConnected` 改计数制。**注：本约束不影响 iPhone 侧结论。**
2. **杀不死的现象**：devicectl `--kill` 后出现两个 SmartBLE 实例被拉起（usage assertion）；全杀后夹具广播立即恢复——反证 iPhone 链路占用（同时排除夹具猝死误判）。
3. **设备心跳**：固件每 5s 向 StatusNotify 订阅者推 `device_status`（含 uptime）——意外成为最好的"接收"独立证据源。
4. devicectl 锁屏拉文件成功 → 文件保护等级未阻碍（未设密码设备）；带密码设备的 Complete 保护文件锁屏期可能拉不到，届时用 `.completeUntilFirstUserAuthentication` 或退化为解锁后拉取。

## 复现

```bash
# 1. 部署并带参启动（iPhone 经 USB 配对）
xcodebuild -project apps/ios/SmartBLE.xcodeproj -scheme SmartBLEiOS \
  -destination 'platform=iOS,id=<UDID>' build
xcrun devicectl device install app --device <COREDEVICE-ID> <DerivedData>/…/SmartBLE.app
xcrun devicectl device process launch --device <COREDEVICE-ID> com.smartble.ios --ble-bg-selftest

# 2. Mac 侧链路游标（广播缺失 = iPhone 链路存活）
while true; do
  tests/macos/native-probe/.build/debug/native-probe --mode scan --duration 4 2>/dev/null \
    | grep -q BLEToolkit && echo "$(date +%T) LINK_DOWN" || echo "$(date +%T) LINK_UP"
  sleep 6
done

# 3. 锁屏期间拉取手机端日志
xcrun devicectl device copy from --device <COREDEVICE-ID> \
  --domain-type appDataContainer --domain-identifier com.smartble.ios \
  --source Documents/bg-selftest.log --destination /tmp/bg.log
```

## 改动清单

- `apps/ios/Sources/Manager/BackgroundSelfTest.swift`（新增）：自测常量/负载/自激防护/文件日志
- `apps/ios/Sources/Manager/BLEManager.swift`：BGT 钩子（自动扫描→连接→订阅→回声→10s 保活写→文件日志→断链重连接管）
- `apps/ios/SmartBLE.xcodeproj/project.pbxproj`：注册新文件
- `tests/macos/native-probe/Sources/main.swift`：`--mode echo-trigger` + `--device-uuid` 直连（本轮因夹具单连接未走通，工具保留）
