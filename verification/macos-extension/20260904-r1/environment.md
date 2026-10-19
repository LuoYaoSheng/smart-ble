# 环境体检 — run 20260904-r1（2026-09-04）

## 主机

| 项 | 值 |
|---|---|
| Mac 型号 | Mac mini (Mac16,10) |
| 芯片 | Apple M4（Apple Silicon, arm64） |
| 内存 | 32 GB |
| macOS | 26.5.2 (Build 25F84) |
| Darwin 内核 | xnu-12377.121.10~1/RELEASE_ARM64_T8132 |

## 工具链

| 项 | 值 |
|---|---|
| Xcode | 26.1.1 (17B100) |
| Swift | 6.2.1 (swiftlang-6.2.1.4.8), target arm64-apple-macosx26.0 |
| Flutter | 3.38.5 stable（gitee 镜像 remote），Framework f6ff1529fd |
| Dart | 3.10.4 (stable) |
| CocoaPods | 1.16.2 |
| Android SDK | 36.1.0（licenses 已接受） |
| Java | OpenJDK 21.0.8 (Android Studio JBR) |

`flutter doctor -v`：Android toolchain ✓、Xcode ✓、Chrome ✓；
两项警告：Flutter 上游为 gitee 镜像（FLUTTER_GIT_URL 未设置，不影响构建）、
maven.google.com 网络探测超时（不影响 macOS 构建）。

## 可用设备

- macOS (desktop) • darwin-arm64 ✓（本 spike 主目标）
- iphone (wireless) • iOS 26.5.2 —— 已配对但**不可程序化操作**，仅作为环境中的真实 LE 广播源
- Chrome (web) ✓（与 BLE 无关）

## 蓝牙环境

- 蓝牙控制器：BCM_4388C2，State: **On**，支持 LE/GATT
- 已连接经典设备：Magic Keyboard with Numeric Keypad、Magic Trackpad 2（**活跃输入设备，禁止作为测试夹具连接**）
- 环境中实测可见的 LE 广播：iPhone（RSSI -42~-47）、3 台 midea 设备（RSSI -83~-95）、若干无名设备
- 蓝牙权限：`com.smartble.flutter`（产品 App）与 CLI 启动的 CoreBluetooth 进程均直接进入
  `CBManagerStatePoweredOn`，无 unauthorized 状态、无阻塞弹窗（本机此前已授权）

## 夹具可用性

| 夹具 | 状态 |
|---|---|
| BLE 外设（可安全连接+GATT 读写） | **无** —— 唯一可连 BLE 设备为用户正在使用的键鼠，禁止触碰；midea 设备拒绝未配对连接（实测直连超时） |
| ESP32 | **无**（USB 无串口设备） |
| 第二 BLE 扫描端（手机/他机） | **不可操作**（iPhone 已配对但无法程序化驱动） |
| 同机跨进程互扫 | **被平台过滤**（macOS 控制器不回送自身广播，本轮两次对照实验证实） |

## Git 基线

- 仓库：smart-ble（github: LuoYaoSheng/smart-ble, origin: gitee lys-smart-ble）
- worktree：`/Users/luoyaosheng/Desktop/project/Open/smart-ble-macos`
- 分支：`spike/macos-extension-v1`（已推送 github，跟踪 github/spike/macos-extension-v1）
- base commit：`dbb38a8c2404b37cce4602db1f42b44eedae7e8d`（= github/refactor/uniapp-v1）
- 起点 `git status -sb` clean；`git diff --check` 无空白错误
- 主仓库工作区未被本任务修改

## 不记录的内容

证书私钥、Apple 账号、Wi-Fi 密码、token —— 均未采集。
