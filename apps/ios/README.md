# Smart BLE - iOS 原生版本

## 技术栈

- **语言**: Swift 5.x
- **最小版本**: iOS 13.0+
- **BLE API**: CoreBluetooth
- **架构**: MVVM + Combine
- **UI**: SwiftUI
- **包管理**: Swift Package Manager

## 项目结构

```
SmartBLE/
├── Core/                    # BLE 核心（与 macOS 共享）
│   ├── BLE/
│   │   ├── BLEManager.swift        # BLE 管理器
│   │   ├── BLEScanner.swift        # 扫描器
│   │   ├── BLEConnection.swift     # 连接管理
│   │   └── BLEPeripheral.swift     # 外设模式
│   ├── Model/
│   │   ├── BleDevice.swift
│   │   ├── BleService.swift
│   │   └── BleCharacteristic.swift
│   └── Extension/
│       ├── DataExtension.swift
│       └── UUIDExtension.swift
├── UI/                      # SwiftUI UI
│   ├── Views/
│   │   ├── DeviceListView.swift
│   │   ├── DeviceDetailView.swift
│   │   └── BroadcastView.swift
│   ├── Components/
│   │   ├── DeviceCard.swift
│   │   ├── ServiceRow.swift
│   │   └── LogPanel.swift
│   └── ViewModels/
│       └── BLEViewModel.swift
├── Assets.xcassets/
├── Info.plist
└── SmartBLEApp.swift
```

## 权限

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>需要使用蓝牙连接设备</string>
```

## 开发计划

- [ ] 初始化 iOS 项目
- [ ] 实现 BLEManager
- [ ] 实现设备扫描
- [ ] 实现连接/读写
- [ ] 实现 SwiftUI UI
- [ ] 后台模式支持

## 运行

```bash
xcodebuild -scheme SmartBLE
open SmartBLE.xcodeproj
```
