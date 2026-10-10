# 20260918-WIN-ALL：Windows 三框架 × ESP32 真机全面重测

用户指令：重测 Windows 与 ESP32，全面测试，Windows 框架逐个测。本目录为执行证据。

## 测试对象与口径

- 分支 `refactor/uniapp-v1` @ 9c413e6（开测前 `git pull --ff-only` Already up to date）
- 三框架 = Windows 侧全部实际框架：**Electron（E-WIN）· Tauri（T-WIN）· Avalonia（V-WIN）**
  （`apps/desktop/windows`、`apps/desktop/linux` 仅 README 占位，其内容即指向 Avalonia 线；
  Flutter 无 Windows 桌面目标——以上经盘点确认）
- 设备：ESP32-S3 夹具，**真实 Smart HID 固件 v1.2.0**（今日 WIN-007 环境原样保留，未重刷），
  BLE 广播 SHID-00000001，GATT 服务 `9f1d1001-…`（INFO=1002 读+通知 / INPUT=1003 写 / STATUS=1004 读+通知）
- 适配器：Intel Wireless Bluetooth；Node 23.8.0（nvm 前置）/ rustc 1.98.1 MSVC / .NET 8 TFM（SDK 9.0.200）
- **偏差声明**：WIN-006 原文要求烧 `fixture_peripheral_s3` 测试固件；本轮为保护 WIN-007 现场
  改用真实 SHID 固件跑同一链（扫描→连接→发现→读→写→通知→退订→断开→重连→回读）。
  对照判据仍为 F006-F012 语义。串口旁证不可用（CH343/COM12 未接线；S3 原生 USB 为 HID 复合形态，
  无 COM 口枚举）——设备侧证据以 GATT 真实响应帧为准。

## 三框架横向结果

| 环节 | E-WIN (Electron 27/noble) | T-WIN (Tauri 1/btleplug) | V-WIN (Avalonia 11/WinRT) |
|---|---|---|---|
| 构建 | `build:win --dir` exit 0（rcedit 1 次可恢复重试）| `cargo fmt` **FAIL→已修**；check/test/build 全过（Rust 单测 0 个在册）| `dotnet build` exit 0，0 错 6 警 |
| 静态检查 | 19 JS `node --check` 全过；tests/desktop 95/95 | fmt --check 修复后 clean | CS0067 等（见 build log）|
| 启动 | 打包 exe + CDP 9222 ✓ | debug exe + WebView2 CDP 9444 ✓ | **修复前启动即崩**（BoxShadow）；修复后 ✓ |
| 页面/导航 | 3 Tab 可见+广播隐藏（案A）、9 视图齐 | **4 Tab 恒显**（案B）、9 视图齐 | 窗口渲染健全（像素多样性 6688 色）|
| 扫描→SHID | ✓（ADV 服务 UUID + 扫描响应名双包）| ✓（名+服务 UUID）| ✓（名，rssi -43）|
| 连接+发现 | ✓ 1 服务 3 特征 | ✓ 同 | ✓ 同 |
| 读 INFO（身份）| ✓ 完整 JSON | ✓ 同一 JSON | ✓ 同一 JSON |
| 读 STATUS（状态）| ✓ wifi_failed 帧 | ✓ 同 | ✓ 同 |
| 写 TEXT/HEX | ✓ / ✓ | ✓（utf8）/ ✓（hex）| **✗ 全失败**（状态消息为空）|
| 通知订阅/退订 | ✓（含 noble 读结果推送×2）| ✓（流式订阅）| ✓（CCCD 写成功）|
| 用户断开→事件 | ✓ | ✓ | 事件从未触发（CS0067，未接线）|
| 被动断链（设备拆链）| 观察到（~9s/1.4s），事件上抛 | 观察到，事件上抛 | 无法观察（事件缺位）|
| **断开→重连→回读** | ✓ **身份逐字节一致** | **✗ 持续 0x80000013** | **✗ 重连特征发现归零** |
| 退出确认 | ✓ 模态弹出（connected=0）| ✓ WM_CLOSE→模态（真实用户路径）| 未测（无 CDP 通道）|

三框架读到的设备身份帧（同帧）：

```json
{"product":"smart-hid","protocol":"1.0","device_id":"HID-00000001","firmware":"1.2.0","state":"provisioning","provisioned":false}
```

STATUS 帧（同帧）：`{"state":"provisioning","step":"wifi_failed","error":"wifi_failed"}`
——即 WIN-007 遗留 staged 配置重试态，与该轮记录吻合。

## 新发现缺陷（登记，未修）

1. **T-WIN-DEF-001（P1，重连死句柄）**：用户侧 disconnect→connect 后，btleplug 返回缓存的
   Peripheral，其内部 GATT Characteristic 句柄来自已关闭会话；此后 read 持续失败
   `HRESULT 0x80000013「该对象已关闭」`，重试/重新 discover 均不自愈（readA/B/C 三连败，
   `reconnect-retry-characterization.json`）。`discover_services` 秒回缓存（1 服务）证明
   btleplug WinRT 后端服务缓存一次性填充。历史 W3 轮 20/20 通过是因为被动断链走
   适配器缓存重建路径；用户主动断开→重连路径此前未覆盖。同场景 E-WIN PASS（noble 直连）。
2. **V-WIN-DEF-001（P1，写路径失败）**：对真实 SHID 固件 INPUT 特征（write/带响应）写
   TEXT 与 HEX 均失败，WinRT 返回状态为空串；noble/btleplug 对同一特征写成功。
   根因待诊断（怀疑与 WRITE_ENC/会话保护或 DataWriter 用法相关）。WIN-005 收口前必须解决。
3. **V-WIN-DEF-002（P2，重连特征归零）**：重连后 `GetCharacteristicsAsync` 返回 0 特征
   （首连 3 特征），回读「特征值未找到」。疑 ConnectAsync 固定 1s 等待与 GATT 会话就绪竞态。
4. **V-WIN-DEF-003（P2，被动断链检测缺位）**：`BleService.DeviceDisconnected` 事件从未
   raise（编译警告 CS0067），断线感知未接线。
5. **T-WIN-契约观察**：write format 词汇两壳不一致（E-WIN `text|hex` / T-WIN `utf8|hex`），
   各自 UI↔后端自洽，但跨壳自动化与镜像断言需感知此差异。
6. **固件行为观察**：非法/残缺 candidate 写入后固件静默丢弃，不回 `invalid_payload` STATUS
   帧（正典 PROVISIONING_V1 §6 有该错误码）；`{"v":1}` 合法 JSON 缺字段同样无响应。
   桌面三框架一致复现，属固件侧行为，非框架缺陷。

## 修复落地（本轮代码变更）

- `apps/desktop/tauri/src-tauri/src/lib.rs`：`cargo fmt` 全量格式化（116+/69-，零语义变更），
  fmt --check 由 FAIL 转 clean。
- `apps/desktop/avalonia/SmartBLE.Desktop/MainWindow.axaml:351`：BoxShadow 逗号→空格分隔，
  修复 V-WIN 启动即崩（修复前栈见 `avalonia/prefix-crash.log`）。

## 环境观察

- `npm ci` 的 electron postinstall 在本机网络下挂死 >15min（卡 SHASUMS 校验网络请求）；
  以本地缓存 zip 手动解压 `dist/` + `path.txt` 接管完成安装。electron-builder rcedit
  首次执行遇文件锁失败，内置重试自愈。
- ESP32-S3 现走原生 USB（VID 303A PID 4001，HID 键鼠复合，无 COM 口）；CH343（原 COM12）
  未接线。COM4 为三星手机诊断串口，勿认错主。

## 各框架证据文件

- `electron/`：build-dir.log、ui-probe.json、ble-chain.json（F1-F15 全步）、status-probe.json
  （STATUS 读 + invalid 帧刺激）、exit-confirm.json、renderer-console.log、3 截图；
  主进程日志另见 `%APPDATA%/smart-ble-desktop/logs/electron-main-debug.log`
- `tauri/`：cargo-gates.log、ui-probe.json、ble-chain.json（T1-T16）、reconnect-identity.json、
  reconnect-retry-characterization.json、exit-confirm.json（WM_CLOSE 路径 + Rust stderr）、2 截图
- `avalonia/`：dotnet-build.log、prefix-crash.log、ble-harness.log（V1-V16）、01-ui-smoke.png

## 结论

- **E-WIN：PASS_WITH_OBS**（构建+静态+真机全链+退出确认全过；obs=rcedit 重试/npm 挂死/通知无服务端推送刺激）
- **T-WIN：PASS_WITH_OBS**（门禁修复后全过+真机链 T1-T16+退出确认；缺陷 T-WIN-DEF-001 已登记未修）
- **V-WIN：FAILED→修复后 BUILD/RUN PASS_WITH_OBS**（启动崩溃已修；写路径与重连两 P1 缺陷在册，归 WIN-005 续作）
- ESP32 设备侧：三框架一致读到真实身份/状态帧，固件 v1.2.0 广播与 GATT 契约正常
