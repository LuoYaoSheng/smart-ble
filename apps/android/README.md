# Smart BLE - Android 原生版本

## 技术栈

- **语言**: Kotlin
- **最小 SDK**: 21 (Android 5.0)
- **目标 SDK**: 34 (Android 14)
- **BLE API**: BluetoothLeScanner (Android 5.0+)
- **架构**: MVVM + Repository Pattern
- **异步处理**: Kotlin Coroutines + Flow
- **依赖注入**: Hilt (可选)

## 项目结构

```
java/com/smartble/
├── core/                    # BLE 核心
│   ├── ble/                 # BLE 实现
│   │   ├── BleAdapter.kt    # BLE 适配器
│   │   ├── BleScanner.kt    # 扫描器
│   │   ├── BleConnection.kt # 连接管理
│   │   └── BleGattCallback.kt
│   ├── model/               # 数据模型
│   │   ├── BleDevice.kt
│   │   ├── BleService.kt
│   │   └── BleCharacteristic.kt
│   └── utils/               # 工具类
│       ├── DataConverter.kt
│       └── UUIDHelper.kt
├── ui/                      # UI 层
│   ├── activities/          # Activity
│   │   ├── MainActivity.kt
│   │   ├── ScanActivity.kt
│   │   └── DeviceDetailActivity.kt
│   ├── fragments/           # Fragment
│   │   ├── DeviceListFragment.kt
│   │   └── LogFragment.kt
│   ├── adapters/            # RecyclerView 适配器
│   │   └── DeviceAdapter.kt
│   └── viewmodel/           # ViewModel
│       └── MainViewModel.kt
└── SmartBLEApp.kt
```

## 权限

```xml
<!-- Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Android 11 及以下 -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
```

## 开发计划

- [ ] 初始化 Android 项目
- [ ] 实现 BLE 扫描
- [ ] 实现 BLE 连接
- [ ] 实现服务/特征值读写
- [ ] 实现 UI 界面
- [ ] 权限处理

## 运行

```bash
./gradlew assembleDebug
./gradlew installDebug
```
