# Flutter Android 真机执行模板（TEST-F-001..014 / E5）

> 状态：模板（Windows Mobile V1 轮新增，对齐 android-run-template.md 的 §7.1 修订口径）
> Owner：Smart BLE QA；最低环境：Windows 主机、Android 真机（adb 在线）、`apps/flutter` 可构建 debug APK（URL+SHA256 成对）
> 夹具规则：只有一块 ESP32 时 Peripheral 与 Observer **分轮烧录**，同一块板不得同时承担两种角色；COM 口实测枚举（禁写死）

## 执行前检查

- [ ] `git rev-parse HEAD` 记录 Commit
- [ ] APK 来源与 SHA256 记录（`flutter build apk --debug` 产物；Release 门禁前 debug 仅限烟测）
- [ ] `flutter devices` 确认真机在线；权限基线：首次安装后未授蓝牙/定位
- [ ] ESP32 夹具当前轮角色上电、串口 115200 可捕获
- [ ] `flutter doctor` 黄牌项（cmdline-tools/license）记录——不阻塞 debug 构建但要入证据

## 用例组（与 U 线同 ID 同预期，见 WINDOWS_MOBILE_V1_TEST_MATRIX）

| 组 | 覆盖 | 关键断言 |
|---|---|---|
| 权限 | TEST-F-001 | 拒绝→S-03 恢复；永久拒绝→系统设置引导；BLUETOOTH_SCAN/CONNECT/ADVERTISE 能力驱动 |
| 导航 | TEST-F-002 | 四 Tab（第二 Tab=「已连接」）；9 页面路由；P004 不可达；无横滑切页 |
| 生命周期 | TEST-F-003 | 后台/不可见后扫描停止、会话保留；恢复回前台 |
| 蓝牙开关 | TEST-F-004 | 关闭→S-04 引导；恢复可用 |
| 扫描 | TEST-F-005 | **5 秒扫描会话**；两轮重置；N/M 双数；显示名 fallback「未命名 BLE · ID后四位」 |
| 连接/发现 | TEST-F-006 | **10 秒超时**；attempt 去重；空服务关闭重试 |
| 断开 | TEST-F-007 | 主动不重连；被动重连 3 次 **1s/3s/5s**；重连期间写队列取消；旧 generation 回调失效 |
| GATT/写队列/日志 | TEST-F-008 | Read 3s；TEXT/HEX；非法 HEX 拦截；同设备串行跨设备并行；深度 16；单写 5s；Notify 三元组隔离；日志脱敏 |
| 双设备 | TEST-F-009 | Session 隔离；断 A 不影响 B；仅一块 ESP32 且无第二外设时标 BLOCKED_FIXTURE/PARTIAL |
| 广播+Observer | TEST-F-010 | BLUETOOTH_ADVERTISE 权限；31/32 预算；离页清理；**Observer 串口 JSON 为正式证据，不以 start() 成功判 PASS** |
| OTA | TEST-F-011 | **OTA = BLOCKED P-03**：第 0 步+10 步可测；不宣称端到端 |
| 关于/版本 | TEST-F-012 | 与 WEB-001/Release Metadata 一致；P010 版本记录；App 平台分享/浏览器行为 |
| 性能/资源 | TEST-F-013 | 扫描内存平稳；无泄漏；无 listener 重复 |
| 安装烟测 | TEST-F-014 | `flutter install`/adb 安装→首屏→扫描 5 分钟内 |

## 架构断言（随 Gate 增补）

- Widget 不直接 import flutter_blue_plus / flutter_ble_peripheral（静态检查）；
- Session Registry 为连接域唯一事实源，Riverpod 仅投影（无双状态源）；
- 无 SharedPreferences/文件/DB 持久化（冷启动为空实测）。

## 证据与清理

- 每组：截图/录屏（`adb exec-out screencap -p`）+ `flutter run`/logcat 片段 + Observer 串口 JSON 存 `verification/windows-mobile-v1/<run-id>/flutter-android/`
- 结束后：断开全部连接、停止广播、卸载或清 App 数据（除非用例要求保留）

## 退出条件

全部用例有 PASS/FAIL/BLOCKED 结论与第一断点；FAIL 进入缺陷分级并回填 CROSS_IMPLEMENTATION_PARITY_MATRIX。
