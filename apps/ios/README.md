# SmartBLE - macOS/iOS 原生版

使用 SwiftUI + CoreBluetooth 实现的原生 macOS/iOS BLE 调试工具。

## 功能特性

### 扫描功能 (Central 模式)
- ✅ 扫描附近的 BLE 设备
- ✅ 显示设备名称、信号强度、广播数据
- ✅ 连接/断开设备
- ✅ 发现服务和特征值
- ✅ 读取特征值
- ✅ 写入特征值 (HEX/UTF-8)
- ✅ 启用/禁用通知

### 广播功能 (Peripheral 模式)
- ✅ 创建 BLE 广播
- ✅ 设置广播名称和服务 UUID
- ✅ macOS/iOS 完整支持

## 构建和运行

```bash
cd apps/ios
swift run
```

## 项目结构

```
Sources/
├── SmartBLEApp.swift        # App 入口
├── ContentView.swift         # 主视图 (标签页导航)
├── Views/
│   ├── ScanView.swift        # 扫描页面
│   ├── DeviceDetailView.swift # 设备详情页面
│   ├── BroadcastView.swift   # 广播页面
│   └── LogView.swift         # 日志页面
├── Manager/
│   └── BLEManager.swift      # CoreBluetooth 封装
└── Models/
    └── BLEModels.swift       # 数据模型
```
