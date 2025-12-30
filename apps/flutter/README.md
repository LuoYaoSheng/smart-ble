# Smart BLE - Flutter 版本

## 技术栈

- **框架**: Flutter 3.x
- **语言**: Dart 3.x
- **BLE 库**: flutter_blue_plus
- **状态管理**: Riverpod
- **支持平台**: Android、iOS、Windows、macOS、Linux

## 项目结构

```
lib/
├── core/                    # BLE 核心
│   ├── ble_adapter.dart     # BLE 适配器
│   ├── ble_manager.dart     # BLE 管理器
│   └── models.dart          # 数据模型
├── ui/
│   ├── pages/               # 页面
│   │   ├── device_list_page.dart
│   │   ├── device_detail_page.dart
│   │   └── broadcast_page.dart
│   └── widgets/             # 组件
│       ├── device_card.dart
│       ├── service_tile.dart
│       └── log_panel.dart
├── themes/                  # 主题配置
└── main.dart
```

## 开发计划

- [ ] 初始化 Flutter 项目
- [ ] 配置 flutter_blue_plus
- [ ] 实现 BLE 适配器
- [ ] 实现设备扫描页
- [ ] 实现设备详情页
- [ ] 实现广播页
- [ ] 桌面端适配

## 运行

```bash
flutter pub get
flutter run -d macos    # macOS
flutter run -d windows  # Windows
flutter run -d android  # Android
flutter run -d ios      # iOS
```
