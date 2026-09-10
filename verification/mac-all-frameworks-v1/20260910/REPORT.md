# Mac 端全框架验证报告（2026-09-10）

- 范围：Mac 端全部可测框架线——N-MAC（Swift AppKit）/ F-MAC（Flutter）/ Electron / Tauri。
- 口径：规范线（N-MAC、F-MAC）按 `docs/specs/` P001–P010 正典；工具线（Electron、Tauri）按 BLE Toolkit 功能面。
- 计划文档：`docs/plans/2026-09-10-mac-all-frameworks-verify.md`（含功能列表 A1–E）。
- 机器：macOS darwin 25.5.0 arm64；环境设备：ESP32 夹具 SHID-00000001（10:B4:1D:CD:23:8E）、SHID-00000004 在场。

## 1. 结论总表

| 线 | 构建 | 自动化测试 | 启动冒烟 | 真无线电扫描 | 判定 |
|---|---|---|---|---|---|
| N-MAC | swift build ✅ | CoreUnit 80/80 ✅；PageSmoke 17 PASS + 1 SKIP + 1 FAIL（已知，见 §4） | PageSmoke 全程真实 app 驱动 ✅ | UIS-18 真机 n≥2 重连 PASS（Phase 2 在案） | **PASS**（唯一 FAIL 为在册已知项） |
| F-MAC | debug + release 均 ✅；Release/Debug 沙盒 ON + 蓝牙权限声明 ✅（Phase 3 遗留收口） | analyze 0 issues；test **113/113** ✅ | Release app 启动渲染正常 ✅ | 扫描发现 SHID-00000001（-37dBm，**Smart HID 强匹配标签**）+ SHID-00000004 ✅ | **PASS** |
| Electron | build:mac ✅（dmg 90M + zip，ad-hoc） | 无测试套件（工具线现状，如实登记） | 打包 .app 启动、3 tab 渲染 ✅ | 授权后扫描发现 SHID-00000001（-41dBm）+ SHID-00000004 ✅ | **PASS** |
| Tauri | cargo check/build ✅；tauri bundle .app/.dmg ✅；cargo test 0 用例（如实登记） | 同左 | 打包 .app 启动、UI 渲染 ✅ | **修复后**扫描发现 SHID-00000001 + SHID-00000004 ✅ | **PASS（含 1 项本轮修复，见 §3）** |
| Avalonia | — | — | — | — | NOT_RUN（本机无 dotnet；Windows 原型线） |

四线同环境同尺度冒烟全部达成；本轮修复 1 项真实缺陷（Tauri 打包蓝牙声明缺失）。

## 2. 功能列表 × 结果

功能清单全文见计划文档 §A–E。要点：

### 规范线（P001–P010 正典）
- **N-MAC**：A1–A8 全部在案 PASS（证据链 = Phase 2 真无线电 + mac-a2 功能 Gate + 本轮 CoreUnit 80 / PageSmoke 回归 + token 8/8 同步）。E2E 级 BLOCKED 项不变：F008/F009/F010 字节级（待 ESP32 烧录）、F019/F021 配网 E2E（无夹具）、F025 OTA（P-03 BLOCKED + R-1/R-2 已对齐）。
- **F-MAC**：B1 九页齐备（lib/ui/pages 9 文件）；B2 测试 113/113 + analyze 0；B3 Release 构建+沙盒+权限声明齐（本轮实证收口）；B4 真扫描 PASS（含 F018 Profile 识别「Smart HID 强匹配」实机可见）。F008–F010 字节级写/Notify 同 N-MAC 口径留硬件在环。

### 工具线（BLE Toolkit 功能面）
- **Electron**：C1 扫描 ✅（真无线电 2 台）；C4 广播 tab macOS 正确隐藏（noble 限制如实降级）✅；C5 关于页 + Release Metadata 投影 ✅；C2 连接/GATT/写、C3 OTA 对话框 = NOT_RUN（冒烟口径不点连接，避免占用夹具单连接名额；连接链路已由规范线真验）。
- **Tauri**：D1 构建 ✅；D2 扫描 ✅（修复后）；D3 广播 macOS 不支持（README 口径，UI 无广播 tab）✅；D4 启动 ✅。连接/读写同 Electron 口径 NOT_RUN。

## 3. 本轮修复记录

### FIX-1 Tauri 打包缺蓝牙用途声明（真缺陷，已修复+实证）

- **现象**：打包 .app 启动正常、UI 显示「蓝牙已开启」，但扫描 0 设备；同环境 Electron 授权后可发现 2 台。
- **根因**：tauri.conf.json 未注入 `NSBluetoothAlwaysUsageDescription`，生成的 bundle Info.plist 无任何蓝牙声明 → macOS TCC **不弹权限窗、静默拒绝** → btleplug/CoreBluetooth unauthorized → 永远 0 设备。（Electron 线 electron-builder 产物带声明，首次运行正常弹窗。）
- **修复**：新增 `apps/desktop/tauri/src-tauri/Info.plist`（Tauri v1 模板机制，构建时并入 bundle）声明 `NSBluetoothAlwaysUsageDescription` + `NSBluetoothPeripheralUsageDescription`，其余键保持与生成物一致。`tauri build` 重建后 plutil 确认两键在产物中。
- **验证**：重打包后首启即弹蓝牙权限窗 → 授权 → 扫描发现 SHID-00000001（-41dBm）+ SHID-00000004，与 Electron 同结果。证据 `smoke/tauri-02-scan-result.png`（修复前 0 台）→ `smoke/tauri-03-scan-result-fixed.png`（修复后 2 台）。
- **防复发**：`apps/desktop/tauri/README.md` Permissions 节补打包声明说明。

## 4. 已知项与如实登记（不视为本轮 FAIL）

| 项 | 口径 |
|---|---|
| UIS-18-OTA FAIL | 对**未烧录 DEV-014 修复**的真实 ESP32 跑 OTA 失败（ready=true phase=failed）——矩阵在册已知项，等 Phase 7 用户烧录后转正；本轮 PageSmoke 复现值与登记口径一致，非新回归 |
| Avalonia | 本机无 dotnet，Windows 原型线 → Mac 端 NOT_RUN |
| Electron notarization | 未配置（需 Apple 开发者账号交互），ad-hoc 签名口径不变 |
| Electron/Tauri 连接/GATT 写/OTA | 冒烟未执行（NOT_RUN）：避免占用 ESP32 单连接名额 + 破坏性写操作；连接语义已由 N-MAC Phase 2 真无线电实证 |
| Electron 窗口标题「Smart BLE」 | 工具线前端历史命名，与产品名「BLE Toolkit+」不一致——登记为工具线已知差异，不越权改设计（规范线文案以 specs 为准） |
| Tauri cargo test 0 用例 | 工具线无 Rust 单测，如实登记 |

## 5. 复跑命令

```bash
# N-MAC
cd apps/desktop/macos/SmartBLE-mac && swift build && .build/debug/SmartBLE-mac --unit-core && .build/debug/SmartBLE-mac --smoke-pages
npm run check:apple-tokens   # 仓库根
# F-MAC
cd apps/flutter && flutter analyze && flutter test && flutter build macos --release
# Tauri
cd apps/desktop/tauri && tauri build   # 产物 Info.plist 须含 NSBluetoothAlwaysUsageDescription
# Electron
cd apps/desktop/electron && npm run build:mac
```

## 6. 工具链事故记录（复用价值）

1. **CUA 截屏通道会话中段失效**（"Grant Screen Recording to ZCode Computer Use.app"）——与 §17.4 CGEvent 失效同族。定案通道：`screencapture -x` 全屏（不走 CUA）+ `sips --cropOffset` 裁窗。
2. **`screencapture -R<region>` 返回冻结旧帧**：同一区域三次截屏字节级一致而画面实际已变（与 2026-09-10 UI-CONV 轮 screencap 异常同族）。区域截屏不可信，一律全屏+裁剪。
3. **osascript `click at` 不命中目标**：返回 "window 登录 of loginwindow"，点击未生效（两次实证）。有效通道 = python3 + Quartz CGEventPost 合成点击（Terminal 具辅助操作权限）。
4. **Electron/Tauri/Flutter 三线窗口对 System Events AX 均不可见/残缺**（Electron 需 accessibilitySupportEnabled；Tauri/tao 窗口 AX 属性空；Flutter semantics off）——桌面 GUI 自动化只能走「全屏截图 + 视觉定位 + CGEvent 点击」。
5. **CDN 去重别名 URL**：截图上传后返回内容相同文件的旧 URL，核验时必须比对返回 URL 文件名与请求一致（本轮再次命中一次）。
6. Electron 打包 app 蓝牙 TCC 弹窗对 AX 不可见（非 sheet、非独立进程按钮）——用全屏截图视觉定位 + CGEvent 坐标点击授权。

## 7. 证据索引

`smoke/` 下 9 张：
- electron-01-launch.png（首启+权限弹窗）→ 02-perm-granted（授权后）→ 03-scanning（扫描中·停止扫描按钮+2 台）→ 04-scan-result（SHID-00000001/-41dBm + SHID-00000004）→ 05-about（关于页+Release Metadata）
- tauri-02-scan-result.png（修复前：0 台）→ 03-scan-result-fixed.png（修复后：2 台）
- fmac-01-launch.png（Release 首屏）→ 02-scan-result.png（SHID-00000001 -37dBm Smart HID 强匹配 + SHID-00000004）
- N-MAC 本轮证据 = CoreUnit/PageSmoke stdout（/tmp 日志已判读；在案历史证据见 verification/apple-native-v1/ 与 macos-mainline-v1/）
