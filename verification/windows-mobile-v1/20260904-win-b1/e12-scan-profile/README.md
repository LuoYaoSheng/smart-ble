# E12 · P001 扫描列表 Profile 识别卡片对齐 + DEF-013 修复 真机验证

日期：2026-09-05 · 分支：refactor/uniapp-v1 · 机型：Samsung SM-G9910（扫描端，Android）/ 小米 24117RK2CC（备用广播源尝试，后弃用）/ ESP32-S3（Smart HID 模拟广播源，COM13 原生 USB-JTAG）

## 本轮改动（用户反馈：扫描列表缺特殊设备识别卡片）

1. **`apps/flutter/lib/core/ble/profile_registry.dart`（新增）**：Dart 侧 Provisioning Profile 匹配投影，口径对齐 `core/ble-core/provisioning/profile-contract.js`——STRONG（广播 Service UUID 命中）优先 WEAK（名称前缀）；Smart HID 档案 UUID/前缀取自 `core/protocols/hid-provisioning-protocol.ts` 正典镜像（`9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04` / `SHID-`）。
2. **`device_card.dart` 重建**：对齐原型 C1 devCard（scan 变体）——44px 首字母头像（Smart HID 命中青绿系 `.ava.shid`）、名称行内匹配 chip（强匹配 primary / 疑似弱匹配 warning）、未命名回退「未命名 BLE 设备 / deviceId（未命名）」、四格信号条（q4 全绿 / q3 前三绿 / q2 前二黄 / q1 首格红）+ dBm、动作行双按钮（命中档案显示「配置 Smart HID」主按钮 + 连接降级 soft；标准设备仅主色连接）。
3. **`advertisement_sheet.dart`（新增，F004/R04 口径）**：点卡片本体弹出广播数据——设备 ID/名称/RSSI/profileMatch kv + Service UUIDs + AD 结构逐段（Android 无原始帧字节，按平台解析字段重建分段，逐段标注）+ 厂商 ID + Service Data，缺失字段逐项「本轮平台 API 未提供此字段」；「复制数据」真实写剪贴板。
4. **`device_list_page.dart`**：扫描状态行（扫描中 · 5s 会话 / 扫描完成 · 发现 N 台 / 待开始扫描）；空态文案对齐原型（还没有扫描结果 / 当前没有匹配设备）；「配置 Smart HID」如实弹「配网流程在 Flutter 线尚未开放」说明（不伪造能力，P002 为下一 Gate）。
5. **DEF-013 修复（`ble_manager.dart`）**：订阅 `FlutterBluePlus.isScanning` 作为 `_isScanning` 唯一事实源（FBP 5s 超时自动停止时复位），页面同步改听 `isScanningStream`（删除原 5s Timer hack）。修复前：超时自动停止后本地标志滞留 true，后续 startScan 静默空转，需重启应用。
6. **`ble_scan_result.dart` 模型扩展**：advName / manufacturerId / serviceData / txPowerLevel / connectable（供 F004 弹窗与匹配用）。

单元测试：`test/core/ble/profile_registry_test.dart` 7 例（STRONG/大小写/GAP 名 WEAK/advName WEAK/无关 null/STRONG 优先/非本档案 UUID 不误命中）；`flutter analyze` 0 问题；`flutter test` 18/18。

## 空口刺激源（模拟 Smart HID 设备）

小米手机 UI 盲填广播页多次被 IME/前后台切换打断（back 键退出应用、键盘占屏吞滑动手势），弃用；改用 **ESP32-S3 专用测试硬件**：

- `fixture_config.h` 临时改 `DEVICE_NAME "SHID-3FA1C2E9"` + `SERVICE_UUID "9f1d1001-…"`（带 TEMP-E12-VERIFY 标记），`pio run -e fixture_peripheral_s3 -t upload --upload-port COM13`（端口为本次实际枚举发现的 ESP32-S3 原生 USB-JTAG：VID 303A:1001；COM12/CH343 已消失）。
- ~~串口证据 `esp32-serial-boot.txt`：NimBLE createService … + Advertising start~~
  **勘误（2026-09-05，E13 期间复核）**：该文件实际只含 platformio monitor 横幅
  （326B，无任何固件日志行）——当时 monitor 只截到启动横幅，"看到 NimBLE/广播日志"
  的表述超出文件内容，不成立。服务 UUID 与设备名的真实证据以**空口锚点**
  `esp32-shid-stimulus-anchor.txt`（下行）为准；E12 判定不受影响。
- 空口锚点（Windows BleAdvDump，`esp32-shid-stimulus-anchor.txt`）：
  `10B41DCD238D n=36 rssi=-35/-39 name=[SHID-3FA1C2E9] conn=1 uuids=9f1d1001 mfr=00E0:4C69676874424C45`
- **验证后还原**：固件还原正典并重烧（git diff 干净），空口复测 `esp32-canon-restore-anchor.txt`：`name=[BLEToolkit-Server] uuids=4fafc201`。

## Samsung 端判定（像素 oracle + logcat；该机 Flutter 语义树冻结，uiautomator 不可用）

| # | 项目 | 判定 | 证据 |
|---|------|------|------|
| 1 | SHID 强匹配卡片渲染 | **PASS** | `sm-scan1.png`：y788-803 青绿头像带（x108-222，`.ava.shid` 色 #D9F6F0/#E2F8F4）+ 匹配 chip 背景 #E8F1FF（x630-954）同现；chip 内蓝色文字 33px（x600-960, y808-832）；名称行深色文本 y805；卡片边框 y738-1142；动作行蓝渐变「配置 Smart HID」+ soft「连接」双按钮 y1000-1048 |
| 2 | 标准设备卡（无档案）不误标 | **PASS** | `sm-scan1.png`：下一张卡（border y1182 起）头像区蓝系 126px、teal 0px；chip 背景色 0px |
| 3 | F004 广播数据弹窗 | **PASS** | `sm-sheet.png`：弹窗结构化内容 8 组 #F1F5FB hex 块（Service UUIDs + AD 分段：0x07 UUID 列表 18B / 0xFF 厂商数据 / 0x09 名称）；「复制数据」蓝钮 y2212-2228 |
| 4 | 复制按钮真实可用 | **PASS** | `sm-copied.png`：点击后 SnackBar 深色带 y1932-1948（「已复制」） |
| 5 | 「配置 Smart HID」入口 | **PASS** | `sm-config-sheet.png`：标题行 y1728 + 正文 y1836-2094 + 蓝色「知道了」y2188（如实说明 Flutter 线未开放配网，指路 uni-app 线） |
| 6 | **DEF-013 连续扫描** | **PASS** | `sm-fbp-logcat.txt`：同一进程（PID 22180）3 组完整 startScan→(5s)→stopScan 链：08:20:48 / 08:24:00 / 08:24:19，应用未重启；修复前第 2 次起静默空转 |
| 7 | 扫描 3 次后卡片仍稳定 | **PASS** | `sm-scan3.png`：teal 头像 + chip 仍在（y790-799） |

## 小米端恢复记录

- 蓝牙名曾临时改「SHID K80」用于最初的广播源方案；验证后经设置 UI 逐字恢复为 **`1483143285的REDMI K80`**（拼音候选录入「的」），`dumpsys bluetooth_manager`：`name: 1483143285的REDMI K80` ✓。
- 本应用在小米上已 force-stop；期间 Boss直聘 曾自行回前台（back 键退出我方应用所致，非用户操作干扰）。

## 结论

- P001 扫描卡片（特殊设备识别 + 标准卡 + F004 广播数据）真机全链 **PASS**。
- DEF-013（二次扫描静默失效）**修复验证 PASS**，缺陷登记可关闭。
- P002 配网流程在 Flutter 线仍未开放（卡片「配置」入口如实说明）——下一 Gate 候选。
