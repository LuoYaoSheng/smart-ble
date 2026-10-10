# Windows Mobile V1 — 环境体检报告（Phase B 首轮）

- Run ID: `20260904-win-b1`
- 日期: 2026-09-04
- Git: `dbb38a8c2404b37cce4602db1f42b44eedae7e8d`（分支 `refactor/uniapp-v1`，与 github/origin 双远程一致）
- 主机: Windows 10 专业版 22H2（10.0.19045）x64，i7-13700H（14C/20T）
- 任务书: 《Smart BLE Mobile V1 全面改版、跨实现对齐与 Windows 真机/ESP32 测试总任务》§3.2

## 自动探测结果

| 工具 | 版本/状态 | 路径 |
|---|---|---|
| Git | 2.50.1.windows.1 | — |
| Node | v20.19.3 | — |
| npm | 10.8.2 | — |
| Python | 3.13.2 | — |
| Java | 24.0.1 (2026-04-15) | — |
| adb | 1.0.41 | PATH |
| Flutter | 3.38.3 stable（Dart 3.10.1，DevTools 2.51.1） | `D:\dev\flutter` |
| PlatformIO Core | 6.1.18 | `C:\Users\11066\.platformio\penv\Scripts\pio.exe`（不在 Git Bash PATH） |
| HBuilderX | 5.24.2026081301（版本取自 ReleaseNote.md；CLI 需先 `cli open` 启动 IDE） | `D:\HBuilderX\cli.exe` |
| 微信开发者工具 CLI | 存在（`cli.bat -v` 返回命令列表；版本待 IDE 内确认） | `C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat` |

## Flutter Doctor

- `flutter doctor -v`：1 个黄牌类目 —— Android toolchain（SDK 35.0.1）：
  - `cmdline-tools component is missing`
  - `Android license status unknown`（未执行 `flutter doctor --android-licenses`）
- 其余（Flutter/Windows/Chrome/VS2022/网络资源）全部正常。debug APK 构建是否受阻以实际构建为准。

## 设备

| 设备 | 状态 | 说明 |
|---|---|---|
| Android 真机：三星 SM-G9910（Galaxy S21 国行），序列号 `R5CR1284Y7H` | 在线（adb `device`） | Android 15（API 35），android-arm64；同时占用 COM4（ADB 复合口） |
| ESP32：CH343 USB 串口 | 在线 | `COM12`，USB VID:PID=1A86:55D3（WCH CH343），SER=5B15084803 |
| 其他桌面设备 | windows / chrome / edge | 仅记录，非本轮目标 |

注意：COM4 是手机的 ADB 复合串口，不是独立 BLE 外设；ESP32 当前只发现一块（COM12）。

## Flutter 平台目录事实（§4.3 判定）

| 目录 | 存在 | 判定 |
|---|---|---|
| `apps/flutter/android` | 是 | 本轮完整开发与测试目标（F-AND） |
| `apps/flutter/macos` | 是 | 源码存在，Windows 无法构建 → `BLOCKED_HOST` |
| `apps/flutter/windows` | 否 | `NOT_CONFIGURED`（不自动 `flutter create`） |
| `apps/flutter/ios` | 否 | `NOT_CONFIGURED` + `BLOCKED_HOST` |
| `apps/flutter/linux`、`web` | 否 | `NOT_CONFIGURED` |

## local.properties（§4.2）

`git ls-files apps/flutter/android/local.properties` 为空 → **未被 Git 跟踪**；`apps/flutter/android/.gitignore` 已含 `/local.properties`。本机该文件内容已是 Windows 路径（`sdk.dir=C:\Users\11066\AppData\Local\Android\sdk`、`flutter.sdk=D:\dev\flutter`），无需仓库侧改动。

## 分支选择（§2.6）

远程不存在 `refactor/mobile-v1`，存在 `refactor/uniapp-v1` → 按规则 2 沿用 `refactor/uniapp-v1`（该分支同时承载 Flutter Android 实现线），不新建、不改写。

## 待人工补录项（§3.2 人工清单）

以下条目无法自动探测或需要用户确认，状态为 PENDING_MANUAL：

- 微信版本（手机端）与微信基础库版本
- ESP32 精确型号（模组丝印/开发板名；CH343 仅是串口芯片）
- 是否只有一块 ESP32（当前串口仅见一块）
- 是否有第二个可连接 BLE 外设（多设备 E5 需要）
- 是否有真实 Smart HID 固件与 ControlHub（没有则 Smart HID E5 全线 BLOCKED_HARDWARE）
- 微信开发者工具精确版本号与安全域/服务端口开关状态
- 手机微信是否已登录开发者/体验权限

## 安全声明

本报告不含 Wi-Fi 密码、token、证书、签名、账号凭据。
