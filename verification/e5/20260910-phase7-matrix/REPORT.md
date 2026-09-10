# Phase 7 硬件在环首轮（Peripheral 轮）— 2026-09-10

执行环境：macOS 25.5.0（arm64）· SmartBLE-mac @ `1a2ac8e`（refactor/uniapp-v1）· 本机 BLE BCM 控制器
设备清单（用户 12:15 接入）：

| 设备 | 型号/标识 | 通道 | 状态 |
|---|---|---|---|
| ESP32-S3 | QFN56 rev v0.2 · 16MB · MAC `10:b4:1d:cd:3f:d4` | `/dev/cu.usbmodem11301`（原生 USB-OTG，USB 设备名 "ESP32_S3"） | 烧录 fixture_peripheral_s3 v1.0.0 成功；BLE 正常；App 串口走 UART0 故本口静默 |
| Android | Xiaomi Mi-4c（libra）· Android 7.0（SDK 24） | adb `11604004` | F-AND Release APK 安装成功（71.2MB） |
| iPhone | iPhone 11 Pro · iOS 26.5.2 | devicectl | 沿用 phase-4 安装的 com.smartble.ios |
| macOS | Mac mini · 本机中心/观察端 | — | probe + SmartBLE-mac 主线 |

## 结论总表

| # | 项目 | 判定 | 证据 |
|---|---|---|---|
| 1 | 夹具烧录 + 广播契约 | **PASS** | `pio run -e fixture_peripheral_s3 -t upload` SUCCESS（11.2s）；扫描发现 `BLEToolkit-Server` -25dBm ~3.6 条/s，广播服务 UUID `4FAFC201-…-914B` 与契约一致（probe-scan-r1.txt） |
| 2 | 服务/特征发现（SVC-01/02/03 全量） | **PASS** | probe OTA 模式发现 3 服务 12 特征，UUID/属性与 ble-fixture-target.json 全对齐（probe-ota-realchain.txt OTA_CHAR 行） |
| 3 | 字节级写（LED FF00–FF03） | **PASS（4/4）** | probe `--write-hex` 逐条下发 2 字节，设备回执 `{"command":"FF0x","led_state":…,"blink_pattern":0..3}` 经 Notify 到达 + write acked（probe-led-FF0*.txt） |
| 4 | 真读（midea 无 read 特征的旧阻塞解除） | **PASS** | Control 读回 `{"firmware_version":"1.0.0","hardware":"esp32-wroom-32","fixture_role":"peripheral",…}` system_info JSON |
| 5 | Notify 订阅 + 周期推送 + 断链 | **PASS** | 订阅问候 + write_response + ~3s 周期 device_status（含 led/uptime）+ 主动断链收到 connection/disconnected JSON |
| 6 | macOS app 九项回归 + **UIS-18 n≥2 转正** | **PASS（18 PASS/1 FAIL/1 SKIP）** | app-smoke-r1.txt：UIS-18 `connected=["BLEToolkit-Server","midea"] n=2` 真双连 + 退避重连成功（旧 BLOCKED_ENV 解除）；UIS-01..17 全 PASS |
| 7 | OTA 十步正典·真包 | **BLOCKED（DEV-014 固件缺陷，修复已就绪待烧）** | probe-ota-realchain.txt：预检 6 项全过（hardware/size/sha 匹配）→ `op=start` 后 ~800ms 链路监督超时，设备复位（uptime 71s→归零实证）；2048B 小包复现（probe-ota-2k-phases.txt）→ **与包大小无关** |
| 8 | OTA 客户端侧（app） | **FAIL（客户端协议缺口，R-1/R-2 域）** | app 发 start 后 READY_TIMEOUT：probe 用正典协议（target=lightble-peripheral + 先订 STATUS）可推进到 Update.begin，固件参数校验本身通过 → 缺口在 app 侧 target 字段口径/订阅时序 |
| 9 | Android F-AND：扫描→连接→服务发现 | **PASS** | android-f02（扫描 5s 发现 5 台，BLEToolkit-Server 首行 -xx dBm）→ android-f03（已连接 + 3 服务 914B/C/D） |
| 10 | Android F-AND：广播外部可见 | **PASS（Mac 观察端口径）** | Android 广播中（android-f05）→ Mac probe 扫描见 `小米手机` / `FFF0` / -62dBm / 2.5 条/s（probe-see-android-adv.txt）；ESP32-observer JSON 证据仍 BLOCKED（分轮烧录未发生，见移交） |
| 11 | 多中心并行（≥2 中心连同一外设） | **PARTIAL/BLOCKED** | Mac 侧全链 PASS（probe-multi-central-mac.txt）；Android 因扫描器被污染（见 F-AND 缺陷）无法做第二中心 |
| 12 | R2 SHID 轮 / R3 Observer 轮 | **BLOCKED_FLASH** | esptool 对运行中 App 无法同步（App 不泵 USB-JTAG RX，4.9/4.12 两版皆然）；需一次物理动作进下载模式 |

## DEV-014（本轮最重要发现）：GATT 回调内 flash 操作使设备复位

**现象**：OTA `op=start`（正典参数）后 ~800ms CBError 6（链路监督超时），设备复位（uptime 归零实证），2048B 与 567KB 均复现。
**根因**：`Update.begin()` 的同步 flash 擦除（含 cache 挂起窗口）在 NimBLE 回调上下文执行，BLE 主机/中断饿死 → panic/看门狗复位。纯 RAM 路径（LED/JSON）同上下文完全正常，二分定位干净。
**修复（已写好、已编译通过、待烧）**：`ota_server.{h,cpp}` 全部 flash 操作（begin 擦除 / DATA 分片写 / commit 的 Update.end / abort）出队到 `loop()` 上下文执行；回调只做 RAM 校验与排队；DATA 走 32KB RAM 暂存环（BLE 到包速率 ≪ flash 写入速率，环非瓶颈）；ready/success 通知从 loop 发出。ready 延迟 ≈ 擦除时长（~6s），在客户端 30s 超时内。
**连带**：OTA 崩溃污染后夹具出现间歇性挂死两轮（12:44–12:54 失联后自恢复，uptime=783 实证）——修复烧入后建议 `erase_flash` 干净重刷。

## 其他发现

1. **F-AND 扫描器污染（Android 7/MIUI）**：进入广播页（advertiser 初始化）后，后续扫描返回 0 台（连 midea/电视等环境设备都无）——force-stop 重启 App 不恢复。首次安装后扫描正常（发现 5 台）。候选修复：广播页退出时彻底释放 advertiser；或提示用户关开蓝牙。已按实记录，未在本轮修。
2. **固件 hardware 字段**：S3 固件 system_info 报 `esp32-wroom-32`（fixture_config 写死）——OTA manifest 的 hardware 匹配以设备自报为准（本轮 manifest 即按此匹配通过）；字段名与实板不符记为文档级问题。
3. **串口证据链（CDC 缺失）**：peripheral 环境未开 `ARDUINO_USB_CDC_ON_BOOT`，本板经原生 OTG 口接线 → App 串口走 UART0 不可见。新增 `fixture_peripheral_s3_cdc` 环境（USB_MODE=1 硬件 CDC，v1.0.1-cdc）——烧入后串口 JSON 证据与 esptool 常驻可达一并解锁。
4. **UIS-19 SKIP**：peripheral 固件不广播 9F1D1001，按设计跳过（SHID 轮待改刷）。
5. Android 7 定位权限：运行时弹窗 ×2 + 需开系统定位服务（`location_mode=3`），pm grant 首次未生效（manifest 运行时申请路径），已全程如实记录于 snaps。

## 移交（用户一次性动作解锁全部）

> **按住 ESP32 板上 BOOT 再按一下 RST（进下载模式）**（或把 USB 线改插板上的 UART/CH343 口）
> 之后我即可：烧入修复版 CDC 固件（erase_flash 干净重刷）→ OTA 真包十步正典（UIS-18-OTA 转正）→ 串口 JSON 证据流 → R2 SHID 轮（UIS-19 转正）→ R3 Observer 轮（手机广播的 ESP32 正式证据）→ 多中心并行补全。

其余移交：R-1/R-2（app OTA 客户端 target/订阅时序 vs 固件正典口径）已有真机证据支撑决策；27+ 本次提交未推送（等放行）。

## 证据清单

- `logs/probe-scan-r1.txt` — 夹具发现 + 环境设备基线
- `logs/probe-led-FF00..FF03.txt`（×4）— 字节级写/回执/周期通知/断链
- `logs/app-smoke-r1.txt` — macOS app 19 用例（UIS-18 n=2 转正 / UIS-18-OTA 客户端 FAIL / UIS-19 SKIP）
- `logs/probe-ota-realchain.txt` — 真包 OTA：预检全过 → start 崩溃（DEV-014 原始证据，3 服务 12 特征发现亦在此）
- `logs/probe-ota-2k-phases.txt` — 2048B 复现（大小无关性）
- `logs/probe-see-android-adv.txt` — Android 广播被 Mac 观察到（FFF0/小米手机）
- `logs/probe-multi-central-mac.txt` — 挂死自恢复后的 Mac 全链复验（FF01 PASS, uptime=783）
- `snaps/android-f01..f05*.png` — F-AND 安装/权限/扫描/连接/广播全程截图

## 复现命令

```bash
cd hardware/esp32/LightBLE && ~/.platformio/penv/bin/pio run -e fixture_peripheral_s3 -t upload   # 烧录
cd tests/macos/native-probe && ./.build/debug/native-probe --mode scan --duration 12               # 扫描
./.build/debug/native-probe --mode connect --uuid 4FAFC201-1FB5-459E-8FCC-C5C9C331914B --write-hex FF01
./.build/debug/native-probe --mode ota --uuid 4FAFC201-…-914B --ota-file <bin> --ota-manifest <json>
cd apps/desktop/macos/SmartBLE-mac && ./.build/debug/SmartBLE-mac --smoke-pages
```
