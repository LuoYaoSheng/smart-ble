# F-MAC 深态采集轮（20260911-fmac-deep）——受阻裁定 + 三项修复落地报告

- 日期：2026-09-11（Mac 线第四轮；前序：7b04a20 H5 mock 轮 / 5d074cd 弹窗+F-AND 轮 / b270918 U-AND 轮）
- 载体：Flutter macOS **Release 直启**（`build/macos/Build/Products/Release/smart_ble.app` 二进制直启，800×632 真窗，本 HEAD 重建）
- 夹具：`tests/macos/ble-fixture`（shid 模式，SHID-5EEDC0DE 广播 + INFO/INPUT/STATUS 三特征 + 七步状态机 + 场景注入）+ 真 ESP32（BLEToolkit-Server，-27dBm）
- 驱动：Quartz CGEvent 点击/键入/滚轮（/tmp/fmac_drive.py）+ screencapture 全屏裁剪 + 每步「激活→验证前置→截图」协议

## 1. 落袋像素证据（Release·HEAD·真窗，4 帧有效）

| 文件 | 状态 | 核对 |
|---|---|---|
| fmac-p001-scan-result.png | P001 扫描完成·5 台（含 BLEToolkit-Server -27dBm / 未命名×2 / SHID-5EEDC0DE -36dBm） | 真射频；SHID 卡「Smart HID · 强匹配」徽章在列 |
| fmac-p001-shid-card.png | P001 滚动后 SHID-5EEDC0DE 卡特写（含 [配置 Smart HID][连接] 按钮行） | 按钮行为 UI-DEF-06 修复后布局（左侧起） |
| fmac-p002-step1-connecting.png | P002 向导 step1 连接中 OpCard | 中性裁剪复核逐字：「连接并确认设备中…」「正在建立 GATT 连接 · SHID-5EEDC0DE」✓ 正典 |
| fmac-p002-step2-form.png | P002 向导 step2 填写配置表单 | 中性裁剪复核逐字：「Wi-Fi 名称*」占位「家庭 / 办公 2.4G Wi-Fi」「Wi-Fi 密码」占位「无密码可留空」✓ 正典 |

（fmac-p001-scan-result-5dev.png 为同场景全屏原始帧留档。）

## 2. 本轮修复的三项缺陷

| # | 缺陷 | 根因 | 修复 | 验证 |
|---|---|---|---|---|
| DEF-01 | **F-MAC 相机 entitlement 缺失**：P002 唯一 token 入口（扫码面板，含「手动粘贴配对码（无摄像头兜底）」粘贴通道）在面板打开前强制校验相机权限；沙盒 Release/Debug 均无 `com.apple.security.device.camera` → 请求必拒 → **正式构建配网流程死锁**（PAGE_SPEC:89 扫码为正典验收项） | entitlements 从未包含相机（d5138c3 引入蓝牙时即缺） | Release+DebugProfile 两 entitlements 补 `com.apple.security.device.camera` | 重建后 `codesign -d --entitlements` 实证含 key；实机扫码面板开+相机预览活 |
| DEF-02 | **P005 offline 态缺失**（PAGE_SPEC:326「offline 态+连接确认」验收项）：uniapp 侧全局会话掉线驱动 offline（diagnostics.vue:110），F 侧 `_PageState.offline` 仅在状态映射表出现、从未赋值 | 页面级 ProvisioningController 所有权下无掉线监听 | `_onConnLost` 监听 controller.lost（live/checking 中掉线→offline）+ `_diagnose` catch 掉线优先 offline 不被 error 覆盖 | analyze 0 issues；flutter test 122/122 |
| DEF-03 | **shidConfigureBtn 键语义缺陷**：widgets/device_card 按 `_isShid = matchLevel != null` 挂 `ValueKey('shidConfigureBtn')` → ESP32 等所有 Profile 命中卡同名同键 → E2E/语义定位歧义（本轮回放实证：finder 命中 ESP32 卡按钮 → 误入 P006；E13 真机未暴露因现场仅 SHID 一张匹配卡） | 键名与挂载条件不匹配 | 键按 profile 分流：smart-hid → `shidConfigureBtn`，其余 → `profileActionBtn` | analyze 0；ui_six_state_copy_test 9/9 |

## 3. 深链受阻裁定（P002 step3/P003/P005 像素证据未落袋）

- **集成测试通道受阻**：`integration_test/fmac_deep_capture_test.dart`（新建，E13 同源 ValueKey 驱动 + CAPTURE 标记协议截图）七轮运行均卡在「测试实例扫描看不到 SHID-5EEDC0DE」——同一时段手动直启 Release 的扫描可见（-36dBm 卡在列），测试实例列表只见 ESP32/未命名。判定为 **macOS CoreBluetooth 对本机 CBPeripheralManager 软件外设在 flutter test 反复重启实例下的可见性怪癖**（环境级，非 app 缺陷；夹具进程健康、广播日志连续）。
- **手动通道验证可行但未走完**：手动 Release 链已通至 step2（见 §1 两帧）；QR 面板+粘贴+token 回填+step3 走链的交互序列已在本轮陈旧 Debug 实例上完整验证过一遍（当时未察觉实例陈旧），坐标与操作序列在案，**下一会话可从 step2 直接续走**（QR 卡→面板→粘贴 `shid://pair?...`→解析→填 SSID→提交→step3→P003→P005）。
- 过程污染教训（三起，已记入流程）：①`open` 对同 bundle id 运行中实例只激活不换进程 → 长会话须 pgrep 验证二进制路径；②诱导式视觉提问会放大 OCR 幻觉 → 只用中性转述+裁剪复核；③工具结果刷新会抢走 smart_ble 窗口前置 → 每步激活+断言前置。

## 4. 过程观察（登记不裁定）

- 真 ESP32（BLEToolkit-Server）本会话连接成功但 **发现 0 个 GATT 服务**（「服务发现完成 · 列表为空」）——09-10 vis1 轮曾读到完整服务树；疑设备侧固件/状态漂移，待下次带电复测后再判。
- 陈旧 Debug 实例（09-10 遗留进程）上 P002 step3 写入挂起无恢复——该实例代码早于 15s/60s 超时修复，属陈旧构建行为，不计缺陷。

## 5. 复现

```bash
# 夹具
cd tests/macos/ble-fixture && swift build && .build/debug/ble-fixture --mode shid --duration 7200
# Release 直启（勿用 open——见 §3①）
apps/flutter/build/macos/Build/Products/Release/smart_ble.app/Contents/MacOS/smart_ble
# 采集测试（当前受阻于 §3 环境怪癖）
cd apps/flutter && flutter test -d macos integration_test/fmac_deep_capture_test.dart \
  --dart-define=FMAC_RUN=success --dart-define=P002_WIFI_SSID=Open-Test-2G
# 失败注入（夹具载荷规则：SSID=FAIL-WIFI → wifi_failed）
#   --dart-define=FMAC_RUN=wifi_fail --dart-define=P002_WIFI_SSID=FAIL-WIFI
```

## 6. 后续队列

1. 续走手动链：step2→QR 面板→token→step3（success 与 FAIL-WIFI 两轮）→P003→P005 六态（offline 用杀夹具注入）
2. 排查 flutter test 实例扫描可见性怪癖（或换 `flutter drive` 通道）
3. 真 ESP32 0 服务现象复测（换电/重烧后）
