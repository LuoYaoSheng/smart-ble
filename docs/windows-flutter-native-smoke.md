# Windows 无适配器软件冒烟

此测试运行真正的 Windows Flutter engine、应用 `main()`、WinRT 中央/外围插件和页面。它不 mock channel、不覆盖 provider、不使用 `USE_MOCK_BLE`，也不依赖系统 UIA。

测试源在 `tests/windows/flutter_no_adapter_smoke_test.dart`，复制到 QA 工程的 `integration_test/windows_no_adapter_smoke_test.dart` 后运行。测试源与 QA SDK 依赖放在生产 Flutter 工程之外。

前提：Windows QA 虚拟机没有传入 Bluetooth 适配器。关闭其他应用实例，使用包含当前 vendor、lib、Windows runner 和测试文件的隔离 QA 工程副本。生产工程和原有 SDK 不修改。

仅在 **QA 副本** 的 `pubspec.yaml` 现有 `dev_dependencies` 下加入（已有则保留，勿重复）：

```yaml
dev_dependencies:
  integration_test:
    sdk: flutter
```

在 QA 工程目录执行，例如使用专用官方 ARM64 SDK：

```powershell
$flutterQa = 'C:\Users\luoyaosheng\AppData\Local\SmartBLEQA\flutter-native-arm64\bin\flutter.bat'
& $flutterQa pub get
& $flutterQa test integration_test/windows_no_adapter_smoke_test.dart -d windows --reporter expanded
```

`flutter test` 会编译并运行带测试入口的真实原生应用。日志打印实际 engine ABI、原生支持结果/页面检查进度；以整个命令退出 0 和 `SOFTWARE_SMOKE=PASS` 为通过依据，不以旧截图或单行日志替代失败的测试结果。

覆盖无适配器初始化终态、两个扫描入口的禁用及回调门禁、两次原生重试、四个 Tab、无连接空态、有效负载下的广播禁用与支持重试、返回扫描页。等待以原生 Future 和实际页面状态为准，超时失败，不跳过。

这份证据只证明 Windows 软件路径。它不证明 release UIA 树、屏幕阅读器操作、无线广播、扫描空口、GATT、真实连接或其他 CPU 架构；日志明确记录 UIA 和蓝牙硬件 `NOT_RUN`。保留 SDK/源提交、实际 ABI、完整命令日志和退出码，另行记录系统 UIA 和硬件门禁。
