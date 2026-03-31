# Smart BLE - Flutter 版本

Flutter 版本是 `smart-ble` 产品家族中的跨平台移动主线之一。

它既是面向用户的正式跨平台移动入口，也是教学内容里非常重要的一条实现路线，因为它最适合展示“统一体验的 BLE App 应该怎么做”。

---

## 在产品家族中的角色

- 面向 Android / iOS / macOS 的跨平台实现
- 对照 uni-app、原生 Android、原生 iOS 的核心参照线
- 适合教学、演示和后续稳定迭代

如果你想：

- **直接用一个跨平台移动版**：优先看这个版本
- **学习 Flutter BLE 实战**：这个版本是主要学习入口之一
- **对比多实现策略**：把它和 uni-app / 原生移动一起看

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

---

## 适合谁

- 想快速得到统一 Android / iOS 体验的人
- 想学习 Flutter BLE 开发的人
- 想把 BLE 工具产品化为跨平台移动 App 的开发者

---

## 教学关联

这个版本适合和这些内容一起阅读：

- 仓库根 README：理解产品家族结构
- `docs/01-functional-specs.md`：理解功能边界
- `docs/wechat-articles/README.md`：查看公众号系列规划
- `docs/05-platform-differences.md`：理解与其他实现的差异

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
