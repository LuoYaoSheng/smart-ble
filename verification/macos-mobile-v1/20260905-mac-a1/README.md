# macOS 合并与三端验证记录（2026-09-05）

## 基线

- `smart-ble`：Windows `cda1931` 快进后，将 `spike/macos-extension-v1` 合入 `refactor/uniapp-v1`；统一分支合并提交 `55ec20f` 已推 Gitee/GitHub。
- `Smart-HID-Workspace`：macOS 已快进到 `80a5e58`。
- 设备：macOS 26.5.2；iPhone 11 Pro（iOS 26.5.2，paired/available）；Mi 4c（Android 7.0/API 24，ADB device）。

## 已通过

| 层 | 结果 | 证据摘要 |
|---|---|---|
| Flutter | PASS | `flutter analyze` 0 issue；`flutter test` 59/59；macOS release app 构建成功（47.8 MB） |
| uni-app | PASS | 28 个 unit 文件 + 11 道静态门；新增旧加密固件 fail-fast：仅 1 次写并立即取消 waiter |
| 原生 macOS | PASS | Swift build；CoreUnit 62/62；UISmoke 17/17；真实扫描 8 台 BLE，连接 iPhone 外设并发现 5 个服务 |
| Android HTML 原型 | PASS | 真实浏览器走 P002 连接→填写→下发状态；平台层显示 V1 零配对，未出现 PIN/系统配对层，console 0 error |
| Smart HID 固件 | PASS | ESP-IDF v5.4.4 干净/增量构建通过；app bin `0x10b4d0`，分区余 30%；host 36/36 |
| Smart HID 模拟夹具 | PASS | PlatformIO `fixture_shid_sim_s3` 构建通过；INPUT 改普通 WRITE、无 SMP 配置 |
| iPhone 原生包 | PASS_WITH_LIMITATION | Xcode 真机 arm64 构建、通配开发签名、安装均成功；启动被物理锁屏拒绝 |
| Android Flutter 包 | PASS_WITH_LIMITATION | debug APK 构建成功；MIUI 两次以 `INSTALL_FAILED_USER_RESTRICTED` 拒绝 USB 安装 |

## 真机未完成与客观阻塞

1. iPhone：需物理解锁并保持亮屏后重试 launch；包已安装。
2. Mi 4c：需在设备端允许 USB 安装/确认安装弹窗；不能绕过设备安全策略。
3. ESP32-S3：当前仅 `/dev/cu.Bluetooth-Incoming-Port` 与 `/dev/cu.debug-console`，没有下载串口。需按住 BOOT 点 RST，或接 UART/CH343 后烧录已构建的 V1 固件。
4. 完整 READY 配网还需要测试 Wi-Fi 凭据；凭据只经环境变量/App 内存传递，不写入仓库、日志或证据。

## 平台对齐新发现

原生 SwiftUI iOS 与 Kotlin Compose Android 目前只有扫描/GATT/已连接/广播/关于主线，缺 P002/P003/P005/P010；不能把“能编译/能安装”误写成 Smart HID 配网功能完成。全平台覆盖表已补到 `docs/specs/09_test/CROSS_IMPLEMENTATION_PARITY_MATRIX.md`。
