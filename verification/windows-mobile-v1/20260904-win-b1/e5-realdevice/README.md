# E5 真机轮（2026-09-04，Windows B1 主机）

三端真机联测：PC（微信开发者工具 + 串口监视）× 手机（三星 SM-G9910 / Android 15 / ADB `R5CR1284Y7H`）× 硬件（ESP32-S3 @ COM12，CH343）。

基线 git：`79dbc14`（本轮开始时 HEAD）。所有结论仅基于本目录证据文件。

## 环境

| 项 | 值 |
|---|---|
| 手机 | Samsung SM-G9910（Galaxy S21），Android 15（API 35） |
| ESP32 | COM12，USB VID:PID 1A86:55D3（CH343）；esptool flash_id 实测 **ESP32-S3 rev v0.2，16MB quad flash，40MHz 晶振，MAC 10:b4:1d:cd:23:8c** |
| 微信开发者工具 | `C:/Program Files (x86)/Tencent/微信web开发者工具`，cli islogin=true |
| HBuilderX | 5.24.2026081301（D:/HBuilderX），CLI `launch app-android` 可用 |

## 硬件（fixture_peripheral_s3）

| 项 | 结果 | 证据 |
|---|---|---|
| esptool flash_id 探测（只读） | PASS：确认 S3/16MB | 见上表（命令输出未单独存档，boot ROM 行 `ESP-ROM:esp32s3-20210327` 在串口日志内） |
| 新增 S3 构建环境（不动原 esp32dev 环境） | PASS：peripheral 127s / observer 105s | `e5-observer-s3-build.txt`（tail）、platformio.ini 提交 |
| 烧录 COM12（显式发现端口，未写死） | PASS：583216 B @0x10000，hash verified | 烧录输出未单独存档；串口 boot 日志可证固件身份 |
| 串口启动日志 | PASS：boot JSON（git_sha 79dbc14 / peripheral）、NimBLE 同步、3 服务 12 特征、`{"type":"adv","status":"started"}` | `e5-s3-peripheral-serial.txt`、`e5-s3-hang-repro.txt` |
| 运行期串口事件（connect/disconnect 契约 JSON） | FAIL（DEF-006 连带症状）：启动日志可见，但所有后续监视窗口 0 字节；手机已连接时固件侧 onConnect 事件未到达 PC | `e5-s3-connect-session.txt`（326B）、`e5-s3-connect-session2.txt`（326B）、`e5-s3-hang-repro2.txt`（326B） |
| 断连后恢复广播 | FAIL：2/2 复现「客户端断连后广播消失，扫描 0 设备，仅 esptool 硬复位可恢复」 | 手机截图 `f-and-postmortem-scan.png`（0 台）、`r2-postmortem-scan.png`（0 台） |

已知无害噪声（如实记录）：`esp_core_dump_flash: No core dump partition found`（分区表无 coredump 分区，沿袭原 4MB 布局）；首启 `Preferences nvs_open NOT_FOUND`（ota_server OTA 状态命名空间，首次写入创建）。

## 手机 F-AND（apps/flutter，com.smartble.flutter v2.0.0）

| 项 | 结果 | 证据 |
|---|---|---|
| flutter build apk --debug | PASS（25.4s，SHA256 078e2a36…c70a3） | `f-and-apk-sha256.txt` |
| adb install + pm grant 四项权限 | PASS | — |
| 开启手机蓝牙 | PASS：`svc bluetooth enable` 被拒（status=-1）；改走 REQUEST_ENABLE 系统对话框，uiautomator 定位「允许」按钮(759,2094)点击，`bluetooth_on=1` | `bt-enable-dialog.xml` |
| 首页自动扫描 | PASS：蓝牙开启后 BLEToolkit-Server 出现（RSSI -49） | `f-and-device-scan.png`（BT 关，发现 0）、`f-and-device-scan-bt-on.png`（-49） |
| 点击设备 → 详情页连接 | PASS：「已连接」徽标 + device_info 读取（1.0.0 / peripheral / MAC 与 esptool 一致） | `f-and-device-detail.png`、`r2-connected-check.png` |
| 断连后复扫 | FAIL×2（DEF-006）：0 台设备；复位后恢复（-41） | `f-and-postmortem-scan.png`、`f-and-after-disconnect-rescan.png`（复位后 -41）、`r2-postmortem-scan.png` |
| logcat | PASS（应用进程/渲染证据；无 flutter_blue 错误日志条目入库） | `f-and-logcat.txt` |

## PC U-WX（unpackage/dist/build/mp-weixin，appid wxf6c58b1dcac4c82d）

| 项 | 结果 | 证据 |
|---|---|---|
| devtools cli islogin | PASS（true） | 命令输出未单独存档 |
| cli open 导入项目 | PASS_WITH_LIMITATION：CLI stderr 打印 getAppInfo GENERIC_ERROR 栈，但窗口实际打开、模拟器渲染首页（首页/工具/我的 + 发现设备 + 开始扫描） | `u-wx-devtools-simulator.png` |
| cli preview 真机预览二维码 | PASS：预览包 1.0MB（1084132 B），二维码已生成 | `u-wx-preview-qr.png` |
| 手机微信扫码预览 | NOT_RUN（需人工扫码；二维码已就绪） | — |

## 手机 U-AND（HBuilderX CLI 真机运行，标准基座）

| 项 | 结果 | 证据 |
|---|---|---|
| `cli launch app-android --deviceId R5CR1284Y7H` | PASS：基座安装成功→文件同步成功→「应用【uniapp】已启动」→App Launch/Show 生命周期日志（纯 CLI，无 GUI 介入） | `u-and-launch-android.txt` |
| 首页渲染 | PASS：BLE Toolkit+ / 首页·工具·我的 / 开始扫描 | `u-and-phone-running.png` |
| 蓝牙状态行 | FAIL（DEF-007）：恒显「蓝牙已关闭」，实际扫描可用 | `u-and-scan-after-reset.png` |
| 扫描 | PASS：ESP32 复位恢复广播后扫到 BLEToolkit-Server（RSSI -49）；复位前 0 台（与 DEF-006 一致） | `u-and-scan-tap.png`（0 台）、`u-and-scan-after-reset.png`（-49） |

## 缺陷登记（本轮新增/变更）

- **DEF-001 → RESOLVED**：实物 ESP32-S3；新增 `fixture_common_s3` / `fixture_peripheral_s3` / `fixture_observer_s3`（board=esp32-s3-devkitc-1、16MB、去掉 `-mfix-esp32-psram-cache-issue` 与 `BOARD_HAS_PSRAM`），真机烧录+广播验证通过。原 esp32dev 环境未动。契约 `DEVICE_HARDWARE` 仍上报 `esp32-wroom-32`（契约常量，实物差异在此记录）。
- **DEF-006（新，P1）**：S3 外设固件在客户端断连后停止广播，仅硬复位可恢复（2/2 复现）；同时运行期串口事件全静默（启动日志正常）。根因未定位；下一步诊断：加 loop 心跳构建区分「主循环挂死」vs「广播重启失败」，并核对 NimBLE-Arduino 1.4.x 与 arduino-core 版本组合在 S3 上的已知问题。影响：E5 三客户端 Peripheral 轮的重复连接场景。
- **DEF-007（新，P3）**：U-AND 首页蓝牙状态行恒显「蓝牙已关闭」；`use-ble-scan.js` 用 `uni.getSystemSetting().bluetoothEnabled`，App 端该 API 不返回此字段。仅显示层缺陷，扫描/发现不受影响。

## 未执行（NOT_RUN / BLOCKED）

- 微信真机扫码预览（二维码已生成，需人工扫码）。
- fixture_observer_s3 仅编译验证，未烧录运行（单板被 peripheral 占用）。
- U-WX 真机 BLE 流程（模拟器无真实 BLE）；微信开发者工具自动化（DEF-002 仍 OPEN）。
- F-AND 写特征/订阅 notify 交互轮（本轮只做扫描+连接+读）。
- OTA 轮、双外设轮（需第二块板）。

## 安全

无 Wi-Fi 密码/token/证书/签名/账号凭据入档；APK 只存 SHA256；截图仅含测试设备画面。
