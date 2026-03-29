# Smart BLE - Flutter 版本

## 技术栈

- **框架**: Flutter 3.x
- **语言**: Dart 3.x
- **BLE 库**: flutter_blue_plus + flutter_ble_peripheral
- **状态管理**: Riverpod
- **支持平台**: Android、iOS、Windows、macOS、Linux

## 项目结构

```
lib/
├── core/
│   ├── ble/
│   │   ├── ble_manager.dart
│   │   └── ble_peripheral_manager.dart
│   └── models/
│       ├── ble_device.dart
│       ├── ble_scan_result.dart
│       └── ble_service.dart
├── ui/
│   ├── pages/
│   │   ├── device_list_page.dart
│   │   ├── device_detail_page.dart
│   │   └── broadcast_page.dart
│   └── widgets/
│       ├── device_card.dart
│       ├── filter_panel.dart
│       ├── service_tile.dart
│       └── log_panel.dart
├── themes/
└── main.dart
```

## 当前状态

- [x] BLE 设备扫描与过滤
- [x] 设备连接、服务发现、特征值读写
- [x] 通知订阅
- [x] BLE 广播页
- [x] 关于页外链跳转
- [x] `flutter analyze` 与 `flutter test` 基础校验通过

## 开发与验证

```bash
flutter pub get
flutter analyze
flutter test

flutter run -d macos    # macOS
flutter run -d windows  # Windows
flutter run -d android  # Android
flutter run -d ios      # iOS
```
