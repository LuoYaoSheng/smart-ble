# SmartBLE iOS

Smart BLE 调试工具的原生 iOS 实现。

## 技术栈

- **语言**: Swift 5.x
- **最小版本**: iOS 15.0+
- **UI 框架**: SwiftUI
- **架构**: MVVM + Combine
- **蓝牙**: CoreBluetooth

## 项目结构

```
SmartBLE/
├── Core/                      # 核心业务逻辑
│   └── BLE/
│       └── BleManager.swift   # BLE 核心管理器
├── Models/                    # 数据模型
│   └── BleModels.swift        # 设备、服务、特征值模型
├── Views/                     # SwiftUI 视图
│   ├── DeviceList/            # 设备列表
│   │   └── DeviceListView.swift
│   └── DeviceDetail/          # 设备详情
│       └── DeviceDetailView.swift
├── ViewModels/                # ViewModel
│   ├── DeviceListViewModel.swift
│   └── DeviceDetailViewModel.swift
├── Resources/                 # 资源文件
├── Info.plist                 # 配置文件
└── SmartBLEApp.swift          # 应用入口
```

## 构建和运行

### 使用 Xcode

1. 在 Xcode 中打开 `apps/ios/SmartBLE/SmartBLEApp.swift`（创建 Xcode 项目）
2. 或使用 Swift Package Manager:
3. 选择目标设备或模拟器
4. 点击 Run 按钮

### 命令行

```bash
cd apps/ios/SmartBLE
swift build
swift run
```

## 功能特性

- [x] 蓝牙设备扫描
- [x] 设备连接/断开
- [x] 服务发现
- [x] 特征值读取
- [x] 特征值写入
- [x] 通知订阅
- [x] 操作日志
- [x] SwiftUI 现代化设计

## 权限说明

应用需要以下权限（在 Info.plist 中配置）：

- `NSBluetoothAlwaysUsageDescription` - 蓝牙权限说明
- `NSBluetoothPeripheralUsageDescription` - 蓝牙外设权限说明（iOS 12 及以下）

## 开发说明

### BLE 核心类

**BleManager** 是 BLE 操作的核心类，提供：

- `startScan()` - 开始扫描
- `stopScan()` - 停止扫描
- `connect(deviceId:)` - 连接设备
- `disconnect()` - 断开连接
- `discoverServices()` - 发现服务
- `readCharacteristic()` - 读取特征值
- `writeCharacteristic()` - 写入特征值
- `setNotification()` - 设置通知

### 数据流

```
CoreBluetooth
    ↓
BleManager (Combine Publisher)
    ↓
ViewModel (@Published)
    ↓
SwiftUI View
```

### 创建 Xcode 项目

由于当前项目使用纯 Swift 文件，你可以通过以下方式创建 Xcode 项目：

1. 打开 Xcode
2. Create New Project -> iOS App
3. 产品名称设为 `SmartBLE`
4. 选择 SwiftUI Interface
5. 将 `SmartBLE/` 目录下的文件复制到项目中

## License

MIT License
