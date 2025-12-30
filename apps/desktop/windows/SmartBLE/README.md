# Smart BLE - Windows 原生版本

## 技术栈

- **框架**: .NET 8
- **UI**: Avalonia UI 11.x
- **语言**: C# 12
- **BLE API**: Windows Bluetooth LE API (Windows.Devices.Bluetooth)
- **架构**: MVVM + ReactiveUI
- **支持平台**: Windows 10 1809+ (64-bit)

## 项目结构

```
SmartBLE.sln
├── SmartBLE/                # 主应用程序
│   ├── Core/
│   │   ├── BLE/
│   │   │   ├── BLEManager.cs
│   │   │   ├── BLEScanner.cs
│   │   │   └── BLEConnection.cs
│   │   ├── Model/
│   │   │   ├── BleDevice.cs
│   │   │   └── BleCharacteristic.cs
│   │   └── Utils/
│   │       ├── DataConverter.cs
│   │       └── UUIDHelper.cs
│   ├── UI/
│   │   ├── Views/
│   │   │   ├── MainWindow.axaml
│   │   │   ├── ScanView.axaml
│   │   │   └── DeviceDetailView.axaml
│   │   ├── ViewModels/
│   │   │   └── MainViewModel.cs
│   │   └── Controls/
│   │       ├── DeviceCard.axaml
│   │       └── LogPanel.axaml
│   ├── Assets/
│   ├── App.axaml
│   └── App.axaml.cs
└── SmartBLE.Core/           # .NET 类库（可复用）
```

## 依赖包

```xml
<PackageReference Include="Avalonia" Version="11.x" />
<PackageReference Include="Avalonia.Desktop" Version="11.x" />
<PackageReference Include="Avalonia.ReactiveUI" Version="11.x" />
<PackageReference Include="WindowsBluetooth" Version="1.x" />
```

## 开发计划

- [ ] 初始化 Avalonia 项目
- [ ] 实现 BLE 管理器
- [ ] 实现设备扫描
- [ ] 实现连接/读写
- [ ] 实现 Avalonia UI
- [ ] 样式和主题

## 运行

```bash
dotnet build
dotnet run --project SmartBLE
```

## 打包

```bash
dotnet publish -c Release -r win-x64 --self-contained
```
