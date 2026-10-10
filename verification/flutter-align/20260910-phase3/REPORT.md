# Phase 3 · Flutter macOS 对齐回归报告

- **日期**: 2026-09-10
- **范围**: `apps/flutter`（Flutter 3.38.5 · macOS 目标）
- **入口问题**: 5e1fbaf 提交注记的「path_provider_foundation 不再注册 macOS，功能影响待第三阶段回归」+ Phase 1 遗留「Flutter Release/沙盒构建」+ 与 Phase 2 原生九项矩阵的对齐判定。
- **探针资产（新增）**: `apps/flutter/integration_test/phase3_probe_test.dart`（PP3-A 路径回归 / PP3-B 真实无线电对齐）。

## 1. 判定总表（对齐 Phase 2 原生九项）

| # | 项 | 判定 | 证据 |
|---|---|---|---|
| 0 | **path_provider_foundation 注销回归（5e1fbaf 问号）** | **PASS · 非回归（上游架构迁移）** | §2；`logs/probe-run5-allpass.log` PP3-A 行 |
| 1 | 扫描/过滤/广播展示（真无线电） | **PASS** | PP3-B 12s 窗 2 台具名（midea@-88 / iphone@-40）；筛选链单测在 69/69 内 |
| 2 | 多设备连接 / 被动断线重连 | **PASS**（单标本）· n≥2 并行 BLOCKED_ENV | run3: midea 断线→**2s 退避→自动重连成功**（dropped=1 reconnected=1）；run5: 拒连窗口两次重试→诚实 SKIP 路径演练 ✓ |
| 3 | 服务特征发现 | **PASS** | run3: **3 服务 × 2 特征 = 6**（ffa0/ff80/ff90）——与原生 Phase 2 同标本同数据 |
| 4 | HEX/UTF-8 读写 Notify | **PARTIAL** | API 全（read/write(withoutResponse)/setNotifyValue + DataConverter 编解码单测过）；**字节级真机验证 BLOCKED_ENV**（midea 六特征全 write/notify 无 read、不可向家电写；P-F1 夹具同机不可见）→ Phase 7 |
| 5 | Peripheral 广播 | **PASS**（本机真实启停） | run5: `startOk=true isAdvertising=true`→停止 `stopped=true` 全环；外部可见性受 P-F1（同机不可见）→ Phase 7 第二观察端 |
| 6 | Smart HID 配网 | **BLOCKED_FIXTURE** | 环境无 9F1D1001 广播（P-F1：Phase 2 夹具备而不用）；协议层单测（framing/controller）在 69/69 内 |
| 7 | OTA | **BLOCKED_FIXTURE** | 环境无 4FAFC201 广播真机；协议实现单测在 69/69 内 |
| 8 | 权限沙盒签名首启（Release） | **PASS（附注记 N-3）** | §3；`snaps/release-firstlaunch.png` + `logs/release-build.log` |
| 9 | 单测 / 页面冒烟 | **PASS** | `flutter test` **69/69**（8s）+ `flutter test -d macos integration_test/phase3_probe_test.dart` **+2 全绿** |

**汇总: PASS 7 · PARTIAL 1 · BLOCKED 2（全部为环境/夹具约束，解锁点统一在 Phase 7）**

## 2. 5e1fbaf 问号的最终判定：非回归，是上游架构迁移

提交注记猜测「path_provider_foundation 被 share_plus/package_info_plus 传递使用」。本轮静态追链 + 运行时实证：

1. **归因修正**：`flutter pub deps` 显示 path_provider 的真实引入方是 **google_fonts 6.3.3**（本工程 pubspec 声明但 **lib/ 零调用**——死依赖）与 **share_plus_platform_interface**（仅 `Share.shareXFiles` 文件分享路径需要；本工程只用 `Share.share` 纯文本，macOS 侧直接喂 `NSSharingServicePicker`，不落盘）。package_info_plus 8.3.1 / share_plus 10.1.4 的原生+Dart 代码 **零 path_provider 引用**。
2. **注销根因**：path_provider_foundation **2.6.0 已不再是 Cocoapods 原生插件**——pubspec 声明 `dartPluginClass: PathProviderFoundation`，实现迁移为 **纯 Dart + FFI（ffi + objective_c 包）直呼 Foundation**。因此 Podfile.lock 无 pod 可装、GeneratedPluginRegistrant.swift 无原生类可注册——这是**上游设计**，与工具链无关。5e1fbaf 新增的 code_assets/hooks/jni 依赖图正是这次迁移的伴生图。
3. **运行时实证**（PP3-A 探针，真实 app + 真实插件注册）：`getTemporaryPath()` 返回真实沙盒容器路径 `~/Library/Containers/com.smartble.flutter/Data/Library/Caches/…`；About 页 `PackageInfo.fromPlatform()` 全链正常（版本 chip `v2.0.0+1` 渲染 ✓）。

**结论：GeneratedPluginRegistrant 删行 = 插件换轨 Dart 注册的必然结果，功能零回归。5e1fbaf 的担心可以销案。**

## 3. Release / 沙盒 / 签名 / 首启（Phase 1 遗留项）

| 检查 | 结果 |
|---|---|
| `flutter build macos --release` | **PASS** · 50.0MB（仅 Phase 1 已知的两条 Metal toolchain ld 警告，无害） |
| 沙盒 | **ON**（`com.apple.security.app-sandbox=true`）+ `device.bluetooth=true` —— 优于原生 adhoc 线（Phase 2 实测 sandbox=OFF） |
| 签名 | adhoc（Identifier=com.smartble.flutter，TeamIdentifier=not set） |
| Gatekeeper | `spctl --assess` rejected（adhoc 预期，同原生线）；无 quarantine xattr，本机 `open` 直启正常 |
| 首启 | 窗口/四 Tab/P001 空态渲染正常，无崩溃无权限弹窗（蓝牙权限先前 debug 运行已授予） |
| **N-3 注记** | Release 产物带 `get-task-allow=true`：`CODE_SIGN_INJECT_BASE_ENTITLEMENTS=YES`（Xcode 默认）对无团队 adhoc 构建注入开发签名豁免。真签名（Developer ID / notarization）属 Phase 4 签名工作，届时自然消除；不影响功能与沙盒判定 |

## 4. 与原生线（Phase 2）的对齐观察

- **同标本同数据**：midea 服务发现 3×2 特征与原生完全一致（ffa0/ff80/ff90），两侧 CoreBluetooth→上层映射互证。
- **重连退避常数分歧（记录，非缺陷）**：Flutter `2s/4s/6s`（线性）vs 原生 `1s/3s/5s`；两侧同为 ×3 次上限、耗尽移除。若要完全对齐可后续统一，属产品口径决策。
- **广播插件差异**：flutter_ble_peripheral 2.1.1 macOS 为纯广播（无 GATT Server 服务挂载——原生侧 TODO 注释确认）；原生线 CBPeripheralManager 可挂自定义服务。Smart HID/OTA 夹具对端在 Flutter 端只能做广播可见性验证，连接语义仍需原生或真固件。
- **`isAdvertising` 异步语义**：读的是 `didAdvertise` 回调后的状态机，`start()` 返回 ≠ 已在播——探针轮询 8s 内翻转即判 PASS（两次实测 ~0.4s 翻转）。
- **midea 环境波动**：五轮探针中 11:31 连接成功、11:34/11:37/11:40 拒连（25s 超时×2）、与原生 Phase 2「时好时坏」观察一致；探针的两次重试+诚实降级路径已按设计演练。

## 5. 复现命令

```bash
cd apps/flutter
flutter test                                                     # 单测 69/69
flutter test -d macos integration_test/phase3_probe_test.dart    # PP3-A/B 探针（真实无线电）
flutter build macos --release                                    # Release 构建
codesign -d --entitlements :- build/macos/Build/Products/Release/smart_ble.app
```

## 6. 本阶段新资产

- `apps/flutter/integration_test/phase3_probe_test.dart` —— PP3-A 路径回归 + PP3-B 无线电对齐探针（可重复跑，含环境降级路径）
- `verification/flutter-align/20260910-phase3/` —— 本目录（REPORT.md + logs×4 + snaps×1）

## 7. 遗留移交

| 项 | 去向 |
|---|---|
| R-1 OTA start target 契约差异 / R-2 failed 帧漏检 | 沿 Phase 2 登记，等用户决策（改 App 还是改固件） |
| Flutter 广播外部可见性 / GATT 字节级读写 / n≥2 并行 | Phase 7（第二观察端 / ESP32 真固件） |
| Release get-task-allow + Developer ID/notarization | Phase 4（签名工作统做） |
| google_fonts 死依赖 | 可选清理项（删 pubspec 依赖可再瘦身依赖图；非本阶段强制） |
