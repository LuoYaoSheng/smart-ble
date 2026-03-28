# SmartBLE Android

Smart BLE 调试工具的原生 Android 实现。

## 技术栈

- **语言**: Kotlin
- **JDK**: 17 或 21（不要使用 JDK 25）
- **最小 SDK**: 24 (Android 7.0)
- **目标 SDK**: 34 (Android 14)
- **UI 框架**: Jetpack Compose + Material 3
- **架构**: MVVM + ViewModel
- **蓝牙**: Android BluetoothLeScanner API
- **异步处理**: Kotlin Coroutines + Flow

## 项目结构

```
app/src/main/java/com/smartble/
├── core/                      # 核心业务逻辑
│   ├── ble/                  # BLE 管理
│   │   └── BleManager.kt     # BLE 核心管理器
│   └── model/                # 数据模型
│       ├── BleDevice.kt      # 设备模型
│       └── BleService.kt     # 服务和特征值模型
├── ui/                       # UI 层
│   ├── MainActivity.kt       # 主 Activity
│   ├── screen/               # 页面
│   │   ├── DeviceListScreen.kt
│   │   └── DeviceDetailScreen.kt
│   ├── viewmodel/            # ViewModel
│   │   ├── DeviceListViewModel.kt
│   │   └── DeviceDetailViewModel.kt
│   └── theme/                # 主题
│       ├── Color.kt
│       ├── Theme.kt
│       └── Type.kt
└── utils/                    # 工具类
```

## 构建和运行

### 使用 Android Studio

1. 用 Android Studio 打开 `apps/android` 目录
2. 确认 Gradle JDK 使用 Android Studio 自带 JBR 17/21，或本机 JDK 17/21
2. 等待 Gradle 同步完成
3. 连接 Android 设备或启动模拟器
4. 点击 Run 按钮

### 使用命令行

```bash
cd apps/android

# 如本机默认 Java 版本过高，可显式使用 Android Studio 自带 JBR
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# 构建 Debug APK
./gradlew assembleDebug

# 安装到设备
./gradlew installDebug

# 运行测试
./gradlew test
```

> 说明：当前工程已验证可在 Android Studio 自带的 JDK 21 下成功执行 `assembleDebug`。若使用 JDK 25，Gradle/Kotlin DSL 初始化阶段会失败。

## 功能特性

- [x] 蓝牙设备扫描
- [x] 设备连接/断开
- [x] 异常断开自动重连（最多 3 次）
- [x] 服务发现
- [x] 特征值读取
- [x] 特征值写入
- [x] 通知订阅
- [x] 操作日志
- [x] Material 3 设计

## 权限说明

应用需要以下权限：

- `BLUETOOTH_SCAN` (Android 12+) - 扫描蓝牙设备
- `BLUETOOTH_CONNECT` (Android 12+) - 连接蓝牙设备
- `ACCESS_FINE_LOCATION` - 获取位置（BLE 扫描需要）

## 开发说明

### BLE 核心类

**BleManager** 是 BLE 操作的核心类，提供：

- `startScan()` - 开始扫描
- `stopScan()` - 停止扫描
- `connect(deviceId)` - 连接设备
- `disconnect()` - 断开连接
- `discoverServices()` - 发现服务
- `readCharacteristic()` - 读取特征值
- `writeCharacteristic()` - 写入特征值
- `setNotification()` - 设置通知

### 数据流

```
BleManager (Kotlin Flow)
    ↓
ViewModel (StateFlow)
    ↓
Compose UI (collectAsState)
```

## License

MIT License
