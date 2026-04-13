# 🚀 Flutter 移动端跨平台实战指南

作为 Smart BLE Toolkit+ 的主力载体，Flutter 以其“一套代码跑通 Android / iOS 流畅原生帧率”的霸气傲视群雄。

如果您正在参与 `apps/flutter/` 目录的二次开发，本手册是您的护航宝典。

## 一、 环境依赖与编译构建
1. **依赖拉取**：在终端进入 `apps/flutter/` 目录，执行 `flutter pub get`。
2. **连接设备**：插入您的安卓或苹果测试机（切记不可使用电脑的网页端模拟器，因为浏览器引擎不含蓝牙底层芯片驱动）。
3. **跑起来**：点击 VS Code 右下角的 Device 选择器，或者直接执行 `flutter run`。

## 二、 [深渊巨坑] 动态权限索取体系
如果您是一个纯前端 / Web 开发转过来的全栈，在开发原生产物时，最大的噩梦莫过于蓝牙的“连环授权”。

在本项目中，我们已经全部做好了防坑填埋（代码位于 `apps/flutter/lib/core/ble/ota_manager.dart` 等入口文件）。您在二开时必须知道其运作机制：

### 对于 Android 12 以上 (API 31+)：
Google 从底层剥离了传统的定位权限，您必须在 `AndroidManifest.xml` 中保留：
- `BLUETOOTH_SCAN`
- `BLUETOOTH_CONNECT`
而且在 Flutter 用户点击“连接”前，务必调用 `permission_handler` 要求用户明确点击授权，否则 `flutter_blue_plus` 直接静默返回 0 个设备！

### 对于 iOS 端：
苹果的要求更加霸道：绝对不允许应用在没有任何文案解释的情况下弹出“应用正在请求使用蓝牙”的白框！
我们已经在 `ios/Runner/Info.plist` 里写好了 `NSBluetoothAlwaysUsageDescription`，如果您要商用上架 AppStore，记得去把提示语改得更加符合您产品的商业包装，否则会被被苹果机器审核秒拒。

## 三、 对抗与修改 SSOT 产物
Flutter 不使用 CSS！所以绝对不要去 `apps/flutter/lib/ui/...` 下面硬编码十六进制颜色！
如果您想对按钮进行 UI 大改造：
1. 请退回到项目最根目录下的 `core/assets-generator/meta/colors.json`。
2. 更改颜色。
3. 运行根部 `generate_assets.py`。
脚本会自动重铸 Flutter 端所需的 `.dart` 类，这才是多端大一统的高手玩法。
