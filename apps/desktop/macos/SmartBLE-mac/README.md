# Smart BLE - macOS 原生版本

## 技术栈

- **语言**: Swift 5.x
- **最小版本**: macOS 10.15+
- **BLE API**: CoreBluetooth
- **架构**: MVVM + Combine
- **UI**: SwiftUI (macOS)
- **包管理**: Swift Package Manager

## 项目结构

```
SmartBLE-mac/
├── SmartBLE/
│   ├── Core/                # BLE 核心（与 iOS 共享）
│   ├── UI/                  # macOS 专用 UI
│   │   ├── Views/
│   │   │   ├── MainView.swift
│   │   │   ├── ScanView.swift
│   │   │   └── DeviceDetailView.swift
│   │   ├── ViewModels/
│   │   │   └── BLEViewModel.swift
│   │   └── Components/
│   │       ├── DeviceRow.swift
│   │       └── LogPanel.swift
│   ├── Assets.xcassets/
│   ├── Info.plist
│   └── SmartBLEApp.swift
└── Package.swift
```

## 与 iOS 的差异

1. **UI 差异**: macOS 使用 NSTableView、NSList 等
2. **窗口管理**: macOS 需要处理多窗口
3. **权限**: macOS 需要蓝牙权限

## 开发计划

- [ ] 初始化 macOS 项目
- [ ] 复用 iOS BLE 核心代码
- [ ] 实现 macOS SwiftUI UI
- [ ] 窗口管理
- [ ] 菜单栏集成

## 运行

```bash
xcodebuild -scheme SmartBLE-mac
open SmartBLE-mac.xcodeproj
```
