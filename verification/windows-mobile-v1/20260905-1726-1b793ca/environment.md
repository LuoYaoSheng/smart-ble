# Windows 环境体检（run-id 20260905-1726-1b793ca）

- 日期：2026-09-05 17:26 本地时间
- Git：`refactor/uniapp-v1` @ `1b793ca`（本地 = origin = github，无 diverge）
- 工作区：非 clean——为用户既有脏文件（firmware_build_info.h、.hbuilderx/launch.json、
  apps/flutter/out*.txt、tests/target/** CRLF、electron package-lock、e5 diag 会话、
  l10n CRLF），按「不提交用户脏文件」约定留置，不参与本轮基线与提交。
- 无 `apps/uniapp-next` / `apps/flutter-next`（已确认不存在）。

## 1. 主机与工具链（全部实测输出）

| 项 | 值 |
|---|---|
| OS | Windows 10 专业版 22H2 19045.3803 x64（locale zh-CN） |
| Git | 2.50.1.windows.1 |
| Node / npm | v20.19.3 / 10.8.2 |
| Python | 3.13.2 |
| Java | 24.0.1（Temurin，ESP-IDF/Gradle 用） |
| Flutter | 3.38.3 stable @ D:\dev\flutter（Dart 3.10.1，pub/storage 镜像 flutter-io.cn） |
| Android SDK | 35.0.1 @ C:\Users\11066\AppData\Local\Android\sdk（cmdline-tools 缺失、license unknown——不影响既有真机调试链路） |
| adb | 随 SDK；两台设备均 online |
| PlatformIO | Core 6.1.18 @ C:/Users/11066/.platformio/penv |
| HBuilderX | 5.24.2026081301 @ D:\HBuilderX（仅设备运行/自定义基座/APK 打包用；CLI 编译走 npm 工具链） |
| 微信开发者工具 | 已安装 @ C:\Program Files (x86)\Tencent\微信web开发者工具（cli.bat / wechatidecli.cmd 存在；`WECHAT_DEVTOOLS_CLI` 需在运行时注入 env.js） |
| ESP-IDF | v5.4.0 @ D:\Espressif（IDF_TOOLS_PATH，Smart HID 固件用；本仓 LightBLE 夹具走 PlatformIO） |
| Visual Studio | Community 2022 17.13.1（Windows desktop 可用） |

flutter doctor 结论：仅 Android toolchain 一项警告（cmdline-tools/license，历史已知、不影响
真机 flutter test/run）；其余 √。

## 2. 手机

| 设备 | adb serial | 型号 | Android | 微信 | 角色 |
|---|---|---|---|---|---|
| Samsung SM-G9910 | `R5CR1284Y7H` | o1q（Galaxy S21 国行） | 15 (API 35) | 8.0.77 (3160) | 主测机（U-WX / U-AND / F-AND） |
| HUAWEI TAS-AN00 | `FEC0220629005177` | HWTAS（nova 系列） | 12 (API 31) | 未检出 com.tencent.mm | 第二真机（E14 已用于双机配网验证） |

注意（E13/E14 已固化教训）：三星有自动管控强杀（需 set-standby-bucket active +
doze whitelist）；华为无 screenrecord。

## 3. ESP32 与串口

| 项 | 值 |
|---|---|
| 板卡 | ESP32-S3 DevKit（双 USB：OTG 跑 TinyUSB，另一侧 CH343 UART） |
| 烧录/串口口 | COM12（USB VID:PID=1A86:55D3 CH343；免按键烧录已验证） |
| 当前固件 | Smart HID V1 简化版（E14 末态：已配网 READY、boot_id B-D00422、MQTT 在线） |
| 干扰源 | COM4 = 三星 modem 串口（VID 04E8），勿动 |
| 第二 BLE 外设 | 无（严格双外设 E5 → BLOCKED_FIXTURE） |
| 真实 Smart HID 固件 | 有（E:\project\xf\smart-hid-workspace 源码 + 已验证 build 产物） |
| ControlHub | 有且在运行：PID 26260，0.0.0.0:17890/17891/17892 全 LISTENING；防火墙放行规则 e14-allow-pairing/e14-allow-mqtt 仍 ACTIVE |
| 空口抓包 | e7-broadcast/BleAdvDump.exe 可用 |
| LightBLE 夹具环境 | fixture_peripheral_s3 / fixture_observer_s3（S3 对应；另有 esp32dev 通用版与 shid_sim） |

本轮综合测试的固件分轮计划（任务书 §10）：当前 Smart HID 固件 → 先刷
`fixture_peripheral_s3`（F001–F012）→ 再刷 `fixture_observer_s3`（F014–F017）→
F018–F024 真机 E5 前回刷 Smart HID 固件。Smart HID 的已配网 NVS 状态在回刷后
是否保留取决于是否 erase（分轮烧录不主动 erase NVS）。

## 4. 不记录项（合规声明）

按任务书 §7 禁令：本轮环境文件不含 Wi-Fi 密码、token、私钥、签名密码、微信账号凭据、
Apple/Google 账号。API key 只存在于 smart-hid-workspace/smart-hid-controlhub/data/
（未入库），需要时经本机环境变量注入。
