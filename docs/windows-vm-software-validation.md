# BLE Toolkit+ · Windows ARM64 虚拟机软件验证

本文记录在用户已有 Parallels Windows 11 ARM64 虚拟机中验证 Windows 客户端的软件流程。当前环境没有提供 USB 蓝牙适配器，不执行蓝牙硬件操作。最终实际结果、构建编号及证据路径由根代理填写；本草稿不填入未汇总的通过数量。

## 验证对象与环境

客户端包括 Avalonia、Qt、Wails、Electron、Tauri 和 Flutter。它们使用同一个 `smart-ble` 工程的源码，应用显示名统一为 **BLE Toolkit+**。仓库名、内部程序集、Cargo target、包标识和可执行文件名可以保留已有技术名称，不用它们推断用户看到的应用名称。

| 信息 | 本轮记录 |
| --- | --- |
| 宿主与虚拟化 | 用户已有的 Parallels 虚拟机 |
| 客体系统与 CPU | Windows 11 ARM64，详细版本由根代理填写 |
| 蓝牙硬件 | 无 USB 蓝牙适配器；硬件验证 `NOT_RUN` |
| 源码提交 / 工作区状态 | 待根代理填写 |
| 每客户端包 SHA256 / PE 架构 | 待根代理填写 |
| 构建工具与运行时版本 | 待根代理填写 |

虚拟机的 ARM64 CPU 本身不能证明应用是 ARM64 原生程序。需要核验应用主 EXE 的 PE Machine；Qt 还需要核验原生 Python、PySide6 / shiboken / WinRT `.pyd` 及随包 DLL。Avalonia 应核验 native apphost，不能把合法的托管 I386 DLL 当作架构失败。NSIS 启动器的 CPU 也不能代替 Tauri 或 Electron 应用主程序的 CPU。

架构检查入口为 [`verify_windows_architecture.py`](../scripts/release/verify_windows_architecture.py)，候选构建与报告入口为 [`build.py`](../scripts/release/build.py)。Qt ARM64 的解释器与扩展检查入口为 [`verify_native_python.py`](../apps/desktop/qt/tools/verify_native_python.py)。

## 本环境可以验证的内容

1. 当前源码能够在原生 ARM64 工具链下构建，并生成完整候选目录或安装包。
2. 应用主程序启动、有可识别的窗口、资源与字体正常加载，没有启动错误对话框。
3. 无适配器状态提示正确，扫描不会误报正在运行；能够重新检测状态。
4. 底栏能通过真实鼠标、键盘或 UIA 操作切页；可访问控件具有实际 Button / Invoke 或对应原生操作能力。
5. 页面布局、滚动、空态、返回、表单验证、关于、版本、日志和退出确认等软件行为。
6. 协议与生命周期单测，包括队列隔离、取消、超时和迟到回执拒绝。模拟传输通过只能记录为协议或软件测试。

底栏四页的导航脚本不覆盖全部九页。设备详情、Smart HID 配网 / 详情 / 诊断、OTA 对话框等需要单独记录可达入口、适用前置条件和实际执行范围。没有连接设备时，正确的禁用态或缺少连接提示可以通过软件验证；不能由此填入对应设备功能的成功结果。

## 无适配器的判断边界

“未检测到蓝牙适配器”“蓝牙关闭”“权限未授予”“适配器不支持 BLE”和“平台不支持”是不同状态。Windows 11 支持接口但没有蓝牙硬件时，不应显示操作系统不支持，也不应创建虚假的扫描、连接或广播成功状态。

无蓝牙适配器时，这些项目保持 `NOT_RUN`：真实空口扫描、连接、GATT 读写 / notify / indicate、多设备硬件隔离、真实掉链恢复、广播空口、Smart HID 配网 READY、OTA 固件传输 / 失败恢复 / 重启版本回读，以及实机功耗和射频。虚拟机软件证据也不替代分发签名、安装升级和商店审核。

## 执行与证据要求

候选来源应能关联到提交、包 SHA256、架构检查和构建报告。运行时使用确定的应用主 EXE，不以安装器、框架库或同名已有进程代替。复用已有 PID 时，要核验该 PID 的实际映像路径与指定 EXE 一致，并保留该进程的用户状态。

[`vm-app-smoke.ps1`](../scripts/windows/vm-app-smoke.ps1) 当前核验 PID 映像路径、预期窗口标题 **BLE Toolkit+**、非空 UIA 子控件和截图前的前台 HWND，并记录 `StartedByHarness`。`WINDOW_LAUNCH_PASS` 只覆盖该启动与窗口采集范围，报告中的 `Navigation` 和 `Hardware` 仍为 `NOT_RUN`。应继续检查可见页面内容；存在子控件不自动证明整页已经正确渲染。截图是屏幕矩形采集，分享前仍须确认无遮挡和敏感内容。

[`vm-navigate-smoke.ps1`](../scripts/windows/vm-navigate-smoke.ps1) 当前核验目标 PID / EXE / 标题，检查四个底栏按钮可见、可用且提供 Invoke，再等待不在屏幕外的页面锚点。任一页失败时保存 `navigation.json` 并以退出码 1 结束；四项均为 `PAGE_ANCHOR_VERIFIED` 才输出 `NAVIGATION_PASS`。根代理仍应逐项核对结果及锚点是否属于当前页面，不能把四页通过扩展为全部九页或业务功能通过。

每次运行应使用独立证据目录，保留日志、JSON、截图和失败信息。输入只用明确的测试数据。UIA 对密码控件名称的脱敏不保证截图、普通文本或其他日志已经脱敏，保存或分享前应检查实际内容。

这些脚本会恢复窗口、改变焦点和导航状态。新启动的 PID 应记录为本轮所有；清理时只处理本轮启动且身份核验一致的 PID。用户已有进程不应因同名而被关闭，新进程启动失败后也不能任由后续清理按全局名称操作。

## 最终结果登记

下表由根代理根据最终当前源码的实际运行结果填写，不由候选构建成功、控件数量或单测通过数量自动升级状态。

| 客户端 | 包 / 主 EXE 架构证据 | 启动与可见页面 | 鼠标 / 键盘 / UIA 导航 | 无适配器行为 | 最终证据路径 |
| --- | --- | --- | --- | --- | --- |
| Avalonia | ARM64 主程序；自包含 .NET 8 | PASS；106 项 VM 测试（SDK/runtime 10 roll-forward） | UIA 四页 PASS | 无适配器、禁扫描、可重试 PASS | `.tmp/verification/windows-vm/evidence/avalonia-current/` |
| Qt | ARM64 主程序、Python/Qt/WinRT 原生模块 | PASS；55 项回归、资源与窗口正常 | UIA 四页 PASS；真实 Button/Invoke | 无适配器、禁扫描/广播、可重试 PASS | `.tmp/verification/windows-vm/evidence/qt-final/` |
| Wails | ARM64 原生程序 | PASS；2 项新增 Windows 后端测试 | UIA 四页 PASS | 无适配器、禁扫描 PASS | `.tmp/verification/windows-vm/evidence/wails-current-settled/` |
| Electron | ARM64 主程序与实际所选 WinRT 绑定 | PASS；实际 Electron 中加载 WinRT；共享 190 项回归 | UIA 四页 PASS | 无适配器、禁扫描 PASS | `.tmp/verification/windows-vm/evidence/electron-final/` |
| Tauri | ARM64 程序、NSIS 安装器 | 最终包启动/NSIS 安装 PASS；Windows 9 项 Rust 回归 | 最终包 UIA 四页 PASS | 最终包明确无适配器，禁扫描/广播 PASS | `.tmp/verification/windows-vm/evidence/tauri-validated/` |
| Flutter | ARM64 主程序/插件；Flutter 3.47.7 / Dart 3.13.5 | release 启动 PASS；156 项回归 | 真原生引擎四页集成测试 PASS；系统 UIA 未暴露子控件 | 两扫描入口禁用、广播禁用、两次原生重试 PASS | `.tmp/verification/windows-vm/evidence/flutter-native-smoke-final.log` |

状态区分 `PASS`、`FAILED`、`NOT_RUN` 和带原因的 `BLOCKED`。仅在对应项目有当前源码的实际证据时填写 `PASS`。最终摘要要明确区分原生构建、虚拟机软件运行、蓝牙硬件、安装升级和正式分发五类结果。

Flutter 集成测试源与 QA 运行说明见 [原生引擎软件冒烟](windows-flutter-native-smoke.md)。测试直接调用真实应用与原生插件，没有 mock channel。它证明引擎内页面/手势与原生初始化软件路径；Windows 系统 UIA、屏幕阅读器及真实鼠标/键盘仍分别记录，不由引擎内测试推断通过。

Electron 包包含第三方依赖的多架构 prebuild 与 UAC 安装辅助程序，架构检查针对实际主程序和运行时选中的绑定；不能将未被使用的其他 CPU 文件误记为实际运行模块。实际加载是在该包的 Electron 进程中进行。

所有本轮新进程来自 `SmartBLEQA` 隔离目录；旧测试实例按已知 PID 与映像路径限定清理。未停止用户的其他应用或修改原有 Flutter SDK。

本轮最终软件源码提交 `0926e99` 的 [全平台候选构建](https://github.com/LuoYaoSheng/smart-ble/actions/runs/38041746455) 24/24 与 [基础 CI](https://github.com/LuoYaoSheng/smart-ble/actions/runs/38041746475) 8/8 全部通过。之后的报告整理不改变应用源码。报告：`release/windows-vm-software-verification.json`。
