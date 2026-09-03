# Smart BLE 平台功能差异矩阵 v1.0

版本：v1.0

## 1. 文档目标

本文定义 Smart BLE 在不同技术栈和操作系统下的 BLE 能力差异。

目标：

-   统一不同语言实现标准
-   明确平台限制
-   指导 uni-app / Flutter / Native / Desktop 开发
-   支撑测试验收

------------------------------------------------------------------------

# 2. 平台分类

  平台编号      实现
  ------------- ----------------------------
  UNI-WX-IOS    uni-app 微信小程序 iOS
  UNI-WX-AND    uni-app 微信小程序 Android
  UNI-APP-IOS   uni-app App iOS
  UNI-APP-AND   uni-app App Android
  FLUTTER-IOS   Flutter iOS
  FLUTTER-AND   Flutter Android
  NATIVE-IOS    Swift
  NATIVE-AND    Kotlin
  HARMONY       HarmonyOS
  WIN           Windows
  MAC           macOS
  LINUX         Linux

------------------------------------------------------------------------

# 3. 能力等级

  标识   说明
  ------ --------------------
  ✅     完整支持
  ⚠️     有限支持，需要适配
  🔧     需要插件或原生能力
  ❌     不支持
  🧪     实验能力

------------------------------------------------------------------------

# 4. 基础BLE能力矩阵

## BLE-001 蓝牙状态检测

  平台             支持
  ---------------- ------
  微信小程序       ✅
  uni-app App      ✅
  Flutter          ✅
  Native iOS       ✅
  Native Android   ✅
  HarmonyOS        ⚠️
  Windows          ✅
  macOS            ✅
  Linux            ✅

------------------------------------------------------------------------

## BLE-002 设备扫描

  平台             支持
  ---------------- ------
  微信小程序       ✅
  uni-app App      ✅
  Flutter          ✅
  Native iOS       ✅
  Native Android   ✅
  HarmonyOS        ⚠️
  Windows          ✅
  macOS            ✅
  Linux            ✅

限制：

-   iOS 无法获取真实 MAC 地址
-   Android 需要蓝牙扫描权限
-   Linux 依赖 BlueZ

------------------------------------------------------------------------

## BLE-003 设备连接

  平台             支持
  ---------------- ------
  微信小程序       ✅
  uni-app App      ✅
  Flutter          ✅
  Native iOS       ✅
  Native Android   ✅
  HarmonyOS        ⚠️
  Windows          ✅
  macOS            ✅
  Linux            ✅

------------------------------------------------------------------------

# 5. GATT能力

  能力                     移动端   桌面端
  ------------------------ -------- --------
  Service发现              ✅       ✅
  Characteristic发现       ✅       ✅
  Read                     ✅       ✅
  Write                    ✅       ✅
  Write Without Response   ⚠️       ✅
  Notify                   ✅       ✅
  Indicate                 ✅       ✅

------------------------------------------------------------------------

# 6. 广播能力

## BLE-007 广播监听

  平台              能力
  ----------------- ------
  微信小程序        ⚠️
  iOS App           ⚠️
  Android App       ✅
  Flutter iOS       ⚠️
  Flutter Android   ✅
  Windows           ⚠️
  macOS             ⚠️
  Linux             ✅

说明：

iOS 对原始广播数据访问有限。

------------------------------------------------------------------------

## BLE-008 广播发送

  平台         能力
  ------------ ------
  微信小程序   ❌
  iOS          ❌
  Android      ✅
  Windows      ⚠️
  macOS        ❌
  Linux        ⚠️

------------------------------------------------------------------------

# 7. 后台能力

## 长连接

  平台          支持
  ------------- ------
  微信小程序    ❌
  iOS App       ⚠️
  Android App   ✅
  Windows       ✅
  macOS         ✅
  Linux         ✅

------------------------------------------------------------------------

## 自动重连

  平台      支持
  --------- ------
  iOS       ✅
  Android   ✅
  Desktop   ✅
  微信      ⚠️

------------------------------------------------------------------------

# 8. OTA能力

  平台              支持
  ----------------- ------
  微信小程序        ⚠️
  uni-app App       ⚠️
  Flutter iOS       ✅
  Flutter Android   ✅
  Native iOS        ✅
  Native Android    ✅
  HarmonyOS         ⚠️
  Windows           ✅
  macOS             ✅
  Linux             ✅

------------------------------------------------------------------------

# 9. 多设备连接

  平台         能力
  ------------ ------
  微信小程序   ❌
  iOS          ⚠️
  Android      ✅
  Windows      ✅
  macOS        ⚠️
  Linux        ✅

------------------------------------------------------------------------

# 10. 平台定位建议

## 微信小程序

适合：

-   扫描
-   连接
-   简单控制
-   配置

不建议：

-   长连接
-   OTA
-   实时监控

## Flutter

适合：

-   正式移动端应用
-   设备控制
-   数据展示
-   OTA

## Native

适合：

-   SDK
-   高性能场景
-   深度BLE能力

## Desktop

适合：

-   工程调试
-   OTA
-   协议分析
-   生产测试

------------------------------------------------------------------------

# 11. 功能优先级

## P0 全平台基础

-   蓝牙检测
-   扫描
-   连接
-   Service发现
-   Read
-   Write
-   Notify
-   日志

## P1 推荐

-   广播解析
-   Profile
-   协议模板
-   数据导出

## P2 增强

-   OTA
-   广播发送
-   多设备
-   外设模拟

------------------------------------------------------------------------

# 12. 后续文档

下一阶段：

《Smart BLE API统一接口规范 v1.0》

用于定义：

-   uni-app API
-   Flutter API
-   Native SDK接口
-   Desktop SDK接口
